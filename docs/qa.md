# QA and deployment rehearsal

This document records the release-candidate checks for the Usamabhanbhro showcase. **This release candidate is a reconstructed implementation created after loss of the previously validated worktree.** It is not a recovered copy and must be evaluated as a new candidate. The storefront’s approved editorial surface is preserved; the work in this release adds server boundaries, operational checks, and tests around the existing interface.

## Local gates

Run the following commands from a clean checkout. The install must use the committed lockfile and must not rely on a developer’s global packages.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm lint
pnpm test
pnpm build
pnpm build:pages
pnpm audit:prod
pnpm audit:critical
pnpm scan:release
pnpm test:e2e
pnpm test:visual
```

The unit suite covers the existing payment connector contract and the reconstructed durable commerce invariants. The browser suite contains **46 tests** covering all primary storefront routes, responsive overflow checks, content rendering, health/readiness, catalog API output, authorization denial, OAuth error handling, CORS, webhook signature rejection, storage-key validation, and unknown API handling.

## Payment modes

`PAYMENT_MODE=mock` is deterministic and does not contact a payment network. `PAYMENT_MODE=sandbox` retains deterministic outcomes while recording sandbox metadata. `PAYMENT_MODE=production` fails closed unless `PAYMENT_PROVIDER_ADAPTER=official` is configured. No card, wallet, or bank credentials are accepted by the showcase UI.

## Database rehearsal

A staging-like rehearsal requires `DATABASE_URL`, `JWT_SECRET`, `PAYMENT_WEBHOOK_SECRET`, and `FRONTEND_ORIGIN`. Apply the idempotent schema migration and seed the catalog:

```sh
APP_ENV=staging pnpm db:migrate
APP_ENV=staging pnpm db:seed
```

The seed is deterministic and writes **36 catalog products and 8 collections** while retaining the existing visible storefront catalog and collection presentation. The seed pool is explicitly closed in a `finally` block so the command exits cleanly.

The database schema reserves inventory with an atomic `stock >= quantity` update inside the order transaction. Payment attempts have a unique idempotency key, webhook events have a unique event ID, and payment callbacks use monotonic status transitions. Successful payment commits reserved inventory; failed or cancelled payment releases it exactly once.

## Runtime probes

The staging-like server exposes `/health` for liveness and `/ready` for database readiness. It returns request IDs and security headers, uses an explicit CORS allowlist, scopes rate limits to API/auth/storage paths, sanitizes production errors, rejects untrusted webhook signatures, and serves the SPA through an Express 5 pathless fallback.

The minimum probe set is:

```sh
curl -i http://127.0.0.1:4177/health
curl -i http://127.0.0.1:4177/ready
curl -i -H 'Origin: https://untrusted.invalid' http://127.0.0.1:4177/health
curl -i http://127.0.0.1:4177/api/account
curl -i -X POST -H 'Content-Type: application/json' -H 'x-webhook-signature: 0000000000000000000000000000000000000000000000000000000000000000' -d '{"eventId":"invalid","status":"successful"}' http://127.0.0.1:4177/api/webhooks/payment
```

## Visual policy

Visual checks must run against the production build with a stable viewport, disabled transitions where appropriate, and the same font-loading conditions used to approve the baseline. Because the previous visual-baseline directory was lost with the prior worktree, `tests/e2e/visual.spec.ts-snapshots/` contains a **new reconstructed baseline set** generated from this candidate; it is not evidence recovered from the prior release. Snapshots are reviewed as design artifacts. A snapshot update is permitted only when the approved storefront intentionally changes; it is not a substitute for fixing a layout regression.

## Release hygiene

Never commit `.env`, provider credentials, database dumps, browser traces, or generated report archives. Before release, run `git diff --check`, scan tracked content for private keys and legacy brand names, review the staged file list, and confirm the release tag points to the intended commit.

## References

[1]: ../package.json "Project scripts and dependencies"
[2]: ../server/index.ts "Production-like Express bootstrap"
[3]: ../server/commerce.ts "Durable commerce and payment service"
[4]: ../drizzle/schema.ts "MySQL/MariaDB schema"
[5]: ../tests/e2e/release.spec.ts "Browser regression suite"


## Final reconstructed-candidate evidence — 15 August 2026

This evidence belongs to the **reconstructed** release candidate built from the current `Usamabhanbhro/e-commerce` baseline. It is not evidence from the lost prior worktree.

| Gate | Result | Evidence |
| --- | --- | --- |
| Frozen install | Passed | `pnpm install --frozen-lockfile` completed with pnpm 10.34.5; workspace override configuration matched the lockfile. |
| Static and package gates | Passed | `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm build:pages`; 23/23 unit tests passed. |
| Release hygiene | Passed | `pnpm scan:release` scanned 129 files; `git diff --check` passed. The scanner checks secrets, legacy-brand markers, and local runtime endpoints while allowing documented examples and build-tool defaults. |
| Dependency audit | Passed at configured thresholds | `pnpm audit:prod` reported two moderate advisories and exited successfully at the high-severity threshold; `pnpm audit:critical` reported no critical advisories and exited successfully. |
| Database migration and seed | Passed | Fresh MariaDB schema applied 10 idempotent release migrations; seed produced 36 products and 8 collections. |
| Durable commerce integrity | Passed | Failed payment restored reserved stock exactly once (`20 -> 19 -> 20`); repeated payment idempotency returned the original failed attempt; duplicate webhook event was ignored; successful webhook committed without a second stock decrement. Final probe counts were 2 orders, 2 payment attempts, and 2 webhook events. |
| Concurrent inventory | Passed | 25 concurrent one-unit reservation attempts against stock 20 produced 20 successes, 5 rejected attempts, and final stock 0; no negative inventory or oversell occurred. The database was reset and reseeded after this probe. |
| Live staging-like probes | Passed | `/health` and `/ready` returned 200; security headers and request ID were present; untrusted CORS was denied; approved CORS was echoed exactly; unauthenticated account access returned 401; invalid webhook HMAC returned 401; unknown API and storage traversal returned 404; HTML product navigation returned 200. |
| Browser regression | Passed | 46/46 functional Playwright tests passed against the rebuilt production artifact using system Chromium. |
| Visual regression | Passed | 12/12 reconstructed visual tests passed against the same staging-like server. These are new baselines, not recovered prior-session snapshots. |

The candidate remains **CLIENT DEMO READY**, not production-ready. Live commerce remains blocked until official payment, OAuth, managed database and backup/restore, S3 storage, DNS/TLS, WAF/edge, distributed rate limiting, monitoring, alerting, and production admin identity are provisioned and evidenced. `PAYMENT_MODE=mock` was used only for deterministic rehearsal.
