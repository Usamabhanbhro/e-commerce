# Release checklist

> **Release classification: CLIENT DEMO READY.**

This release candidate is a **reconstructed implementation created after loss of the previously validated worktree**. It is a new release candidate built on the current `Usamabhanbhro/e-commerce` baseline, not a recovered copy of the previous candidate.

## Before staging

- [ ] Confirm the approved storefront remains unchanged in its visual and route surface.
- [ ] Confirm the intended `APP_ENV`, `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `PAYMENT_WEBHOOK_SECRET`, `FRONTEND_ORIGIN`, and `ALLOWED_ORIGINS` values are supplied through the deployment secret manager.
- [ ] Confirm production does not use mock or sandbox payment mode.
- [ ] Confirm `PAYMENT_MODE=production` has an approved official adapter and documented provider credentials; otherwise keep the environment non-live.
- [ ] Confirm OAuth credentials, redirect URIs, and `OWNER_OPEN_ID` are configured.
- [ ] Confirm managed database, S3-compatible storage, DNS, TLS, WAF/edge protection, distributed rate limiting, monitoring, alerting, and encrypted backup services are provisioned.

## Automated gates

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm lint
pnpm test
pnpm build
pnpm build:pages
pnpm scan:release
pnpm audit:prod
pnpm audit:critical
pnpm test:e2e
pnpm test:visual

git diff --check
```

The reconstructed candidate currently passes 23/23 unit tests, 46/46 browser tests, and 12/12 reconstructed visual tests. The production audit gate passes at the configured high-severity threshold; remaining non-runtime moderate advisories are documented by `pnpm audit`. No critical advisories remain.

## Database rehearsal

- [ ] Run `pnpm db:migrate` against a fresh disposable MariaDB/MySQL-compatible database.
- [ ] Run `pnpm db:seed` and verify 36 products and 8 collections.
- [ ] Verify order, payment, inventory, idempotency, and webhook tables.
- [ ] Verify failed and cancelled payment callbacks release reserved inventory exactly once.
- [ ] Verify successful payment commits inventory exactly once.
- [ ] Verify repeated idempotency keys and webhook event IDs do not duplicate state changes.
- [ ] Verify concurrent reservations cannot produce negative inventory.
- [ ] Execute and record a backup plus restore rehearsal before enabling live commerce.

## Runtime probes

- [ ] Start the production artifact with `NODE_ENV=production` and staging-like configuration.
- [ ] Verify `/health` returns 200 with security headers and a request ID.
- [ ] Verify `/ready` returns 200 only when the database probe succeeds.
- [ ] Verify an untrusted origin receives no CORS allow header.
- [ ] Verify an approved origin receives the exact allowlisted origin.
- [ ] Verify protected routes deny unauthenticated requests.
- [ ] Verify invalid webhook HMAC signatures return 401.
- [ ] Verify malformed storage keys and unknown API routes do not receive the SPA document.
- [ ] Verify SIGTERM closes the HTTP server and database pool cleanly.

## Git release procedure

- [ ] Configure `git config user.name "Usamabhanbhro"`.
- [ ] Configure `git config user.email "mubhanbhro@gmail.com"`.
- [ ] Run the final secret, legacy-brand, and local-development configuration scans.
- [ ] Review `git status` and the complete staged diff.
- [ ] Create the release commit with subject: `Release candidate: reconstructed production-hardened Usamabhanbhro e-commerce`.
- [ ] Verify the commit author is `Usamabhanbhro <mubhanbhro@gmail.com>`.
- [ ] Create tag `v1.0.0-rc.1` and verify it points to the new commit.
- [ ] Push normally without force-push or history rewriting.

## Go-live decision

Do not classify this candidate as production-ready or claim that live commerce is operational until every external blocker is configured and evidenced. Until then, the only permitted classification is **CLIENT DEMO READY**.
