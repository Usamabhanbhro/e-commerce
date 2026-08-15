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

A staging-like PostgreSQL rehearsal requires `DATABASE_URL`, `JWT_SECRET`, `PAYMENT_WEBHOOK_SECRET`, `FRONTEND_ORIGIN`, and the required `S3_*` settings for production-like API startup. Apply the tracked PostgreSQL migration, seed the catalog, and run the integrity verifier:

```sh
APP_ENV=staging pnpm db:migrate
APP_ENV=staging pnpm db:seed
APP_ENV=staging pnpm db:verify
```

The seed is deterministic on an empty target and writes **36 catalog products and 8 collections** while retaining the existing visible storefront catalog and collection presentation. Seeding is atomic; reruns preserve operational stock by default, while `SEED_RESET_INVENTORY=true` explicitly resets seed-owned stock. The PostgreSQL pool and client are explicitly closed in `finally` blocks so the command exits cleanly.

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
[4]: ../drizzle/schema.ts "PostgreSQL schema"
[5]: ../tests/e2e/release.spec.ts "Browser regression suite"


## Historical pre-migration candidate evidence — 15 August 2026

This evidence belongs to the **reconstructed** release candidate built from the current `Usamabhanbhro/e-commerce` baseline. It is not evidence from the lost prior worktree.

| Gate | Result | Evidence |
| --- | --- | --- |
| Frozen install | Passed | `pnpm install --frozen-lockfile` completed with pnpm 10.34.5; workspace override configuration matched the lockfile. |
| Static and package gates | Passed | `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm build:pages`; 23/23 unit tests passed. |
| Release hygiene | Passed | `pnpm scan:release` scanned 129 files; `git diff --check` passed. The scanner checks secrets, legacy-brand markers, and local runtime endpoints while allowing documented examples and build-tool defaults. |
| Dependency audit | Passed at configured thresholds | `pnpm audit:prod` reported two moderate advisories and exited successfully at the high-severity threshold; `pnpm audit:critical` reported no critical advisories and exited successfully. |
| Database migration and seed | Historical baseline | Fresh pre-migration schema applied 10 legacy migrations; seed produced 36 products and 8 collections before the PostgreSQL conversion. This row is retained as provenance, not as current PostgreSQL acceptance evidence. |
| Durable commerce integrity | Passed | Failed payment restored reserved stock exactly once (`20 -> 19 -> 20`); repeated payment idempotency returned the original failed attempt; duplicate webhook event was ignored; successful webhook committed without a second stock decrement. Final probe counts were 2 orders, 2 payment attempts, and 2 webhook events. |
| Concurrent inventory | Passed | 25 concurrent one-unit reservation attempts against stock 20 produced 20 successes, 5 rejected attempts, and final stock 0; no negative inventory or oversell occurred. The database was reset and reseeded after this probe. |
| Live staging-like probes | Passed | `/health` and `/ready` returned 200; security headers and request ID were present; untrusted CORS was denied; approved CORS was echoed exactly; unauthenticated account access returned 401; invalid webhook HMAC returned 401; unknown API and storage traversal returned 404; HTML product navigation returned 200. |
| Browser regression | Passed | 46/46 functional Playwright tests passed against the rebuilt production artifact using system Chromium. |
| Visual regression | Passed | 12/12 reconstructed visual tests passed against the same staging-like server. These are new baselines, not recovered prior-session snapshots. |

The historical candidate remained **CLIENT DEMO READY**, not production-ready. The current PostgreSQL candidate remains subject to the same boundary: live commerce is blocked until official payment, OAuth, managed PostgreSQL and backup/restore, S3 storage, DNS/TLS, WAF/edge, distributed rate limiting, monitoring, alerting, and production admin identity are provisioned and evidenced. `PAYMENT_MODE=mock` was used only for deterministic rehearsal.

## GitHub Pages verification

The Pages deployment is produced by `.github/workflows/deploy-pages.yml` from `main`. It runs the existing `pnpm build:pages` command, passes the project base path from `actions/configure-pages`, creates a deployment-only `404.html` fallback, uploads `dist/public`, and deploys through the `github-pages` environment. Generated artifacts are not committed.

The verified site is [https://usamabhanbhro.github.io/e-commerce/](https://usamabhanbhro.github.io/e-commerce/). The root document loads, generated assets use `/e-commerce/assets/` paths, and direct navigation to `/e-commerce/shop` returns the application shell through the Pages fallback so the client-side router can resolve the route. The Pages bundle was audited for localhost API URLs, database credentials, JWT/payment/webhook/OAuth secrets, and development configuration; no forbidden production values were found.

## Portfolio screenshot policy

Documentation screenshots must be captured from the actual deployed Pages application or the current production-like local candidate. They must not be mockups, generated artwork, or altered images that imply unsupported functionality. Screenshots belong under `docs/assets/`, should be compressed to a GitHub-friendly size, and should show only public demonstration data. Do not capture real credentials or personal information.

## Complete gate list

The intended complete gate sequence is:

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

A gate may only be described as passed when it has been executed against the current repository state. If a local E2E invocation requires an explicitly documented staging-like server or browser executable, record both the initial environment failure and the successful rerun rather than silently omitting the failure.

## Final screenshot inspection

The committed screenshot gallery is sourced from the corrected live Pages deployment. Visual inspection confirmed that `docs/assets/homepage.png` shows the editorial storefront hero, featured edits, product imagery, journal content, collection links, and footer; `docs/assets/catalog.png` shows the `Shop all` page with eight demo products and the shared storefront shell. The product-detail, checkout, and mobile captures were taken from the same corrected deployment at desktop or 390px responsive viewports. These images are portfolio evidence of the public demo surface, not production-commerce evidence.

## Merchant CMS validation

The current CMS implementation adds a protected `/admin` route and guarded `/api/admin/*` surface. The deterministic browser run used `NODE_ENV=development`, valid test secrets, the built client, and system Chromium at `http://127.0.0.1:4177`; it passed **60/60 Playwright tests**, including the authenticated demo-owner merchant workspace regression, all storefront route checks, security probes, and 12 visual baselines. The focused unit suite now passes **26/26 tests**, including explicit owner/admin/staff RBAC decisions.

The CMS type-check, production build, Pages build, release scan, and whitespace validation passed on the current worktree. The configured dependency audits also exited successfully at their thresholds but reported the repository’s existing advisories: `pnpm audit:prod` reports two moderate advisories and `pnpm audit:critical` reports one low and three moderate advisories with no critical advisory. This remains a documented dependency-maintenance item rather than a release-blocking critical vulnerability.

The admin screenshot and browser evidence must remain local or server-backed rehearsal evidence. GitHub Pages continues to host the public storefront only; it cannot authenticate or persist merchant mutations without the separate Express/database deployment described in `docs/admin-architecture.md`.

The release classification remains **CLIENT DEMO READY**. The CMS is not represented as a production admin system until OAuth/session provisioning, database operations, encrypted backups, object storage, monitoring, distributed rate limiting, and production admin identity are independently provisioned and verified.

---

## Staging-readiness validation evidence — 15 August 2026

The final staging-preparation changes were validated from the current worktree with the repository’s required static gates:

| Gate | Result | Evidence |
| --- | --- | --- |
| Unit tests | Passed | `pnpm test`; 28/28 tests passed across commerce, admin RBAC/media validation, and payment contracts. |
| Type-check | Passed | `pnpm check`; TypeScript completed without diagnostics. |
| Production build | Passed | `pnpm build`; Vite client and bundled Express server completed successfully. |
| GitHub Pages build | Passed | `pnpm build:pages`; the static `/e-commerce/` artifact completed successfully. |
| Release scan | Passed | `pnpm scan:release`; 151 files scanned with no secret-like, legacy-brand, or disallowed local-runtime findings. The scanner explicitly allows the local-only `docker-compose.staging.yml` rehearsal topology. |
| Container validation | CI-configured; not locally executable | `.github/workflows/staging-validate.yml` runs `docker build` on GitHub-hosted runners. The current sandbox has no Docker/Podman runtime, so no local image build is claimed. |
| Remote staging deployment | Not performed | No hosting provider, database, S3-compatible bucket, OAuth client, or staging secrets are connected. The repository is staging-prepared, not remotely provisioned or deployed. |

The staging changes preserve the existing Drizzle, Express, and authentication architecture while making PostgreSQL the sole authoritative relational database. They add tracked PostgreSQL migrations, atomic seeding, database integrity/concurrency verification, cross-origin API-base wiring, exact-origin CORS configuration, server-only S3-compatible storage with presigned image uploads, fail-closed database/storage readiness, development/test-only demo login, a reproducible local PostgreSQL/MinIO rehearsal topology, a production container definition, and CI validation. Remote smoke tests, real staging OAuth, storage upload/retrieval against a provisioned bucket, and end-to-end CMS persistence remain manual follow-up steps after dedicated infrastructure is supplied.

### Hosted verification after push

The final pushed commit is `3b31139c85dcca7e6f0f7b66f4eabe82b77e00b7`. All three workflows for that commit completed successfully: [CI quality run 31862962161](https://github.com/Usamabhanbhro/e-commerce/actions/runs/31862962161), [GitHub Pages deployment 31862962151](https://github.com/Usamabhanbhro/e-commerce/actions/runs/31862962151), and [staging image validation 31862962132](https://github.com/Usamabhanbhro/e-commerce/actions/runs/31862962132). The staging workflow’s hosted Docker build passed after the image was corrected to include `pnpm-workspace.yaml` and `patches/`; the CI staging startup probe passed after receiving synthetic non-production S3 settings and a 32-character JWT fixture. The final worktree was clean, and the deployed storefront root at [usamabhanbhro.github.io/e-commerce](https://usamabhanbhro.github.io/e-commerce/) loaded successfully.


## PostgreSQL migration acceptance evidence — 15 August 2026

The current database-dialect migration was exercised against a fresh local PostgreSQL 16 instance using the tracked migration history and the deterministic seed. The application now uses PostgreSQL as its sole authoritative relational database; no MariaDB/MySQL runtime adapter or fallback is used.

| Gate | Result | Evidence |
| --- | --- | --- |
| PostgreSQL migration from zero | Passed | Applied the complete `drizzle/migrations/` history to a fresh database with `pnpm db:migrate`. |
| PostgreSQL seed | Passed | `pnpm db:seed` completed atomically with 36 database rows and 8 collections; the eight canonical storefront products remain active and synthetic verifier rows are archived. |
| PostgreSQL integration verifier | Passed | `pnpm db:verify` confirmed all required tables, JSONB payloads, rollback behavior, seven unique integrity indexes, and one-winner concurrent stock reservation semantics. |
| Migration idempotency | Passed | Re-running the tracked migration runner against the already migrated database completed without changes or errors. |
| Seed rerun policy | Passed | A modified operational stock value survived a default seed rerun; `SEED_RESET_INVENTORY=true` remains the explicit reset path. |
| Constraint enforcement | Passed | A direct negative-inventory update was rejected by the PostgreSQL check constraint. |
| Type-check after final fixes | Passed | `pnpm check` completed without diagnostics. |
| Browser and CMS regression | Passed | `pnpm test:e2e` passed 60/60 tests against the built production artifact and local PostgreSQL, including authenticated merchant CMS routes, catalog API, CORS, webhook, storage traversal, and authorization checks. |
| Visual regression | Passed | The 12 affected/current visual baselines were regenerated sequentially only after confirming the storefront structure remained aligned and the previous mismatch came from server-backed catalog content; the complete 60-test browser run then passed. |
| Release scan | Passed | `pnpm scan:release` passed; the only remaining MySQL strings are intentional documentation/history or Drizzle optional-peer metadata, not runtime code, Docker, CI, or staging configuration. |

The sandbox PostgreSQL rehearsal is not a production deployment. A real migration still requires an operator-approved source backup, a source-to-target extraction/transform/load run, parent-first relationship validation, row-count reconciliation, sequence repair, and rollback rehearsal. No legacy source database or production dataset was connected to this task, so no source-to-target migration count is claimed.

The repository remains **staging-prepared rather than remotely provisioned**. No managed PostgreSQL endpoint, staging credentials, OAuth client, S3-compatible bucket, DNS/TLS edge, monitoring stack, or backup service was connected. Hosted CI can validate the container and static build, but remote API/database/storage smoke tests require dedicated staging infrastructure and secrets.


## Final hosted PostgreSQL verification — 15 August 2026

The PostgreSQL migration commit `8349a3b` passed hosted CI’s PostgreSQL migration/integrity checks but initially exposed a container-only reproducibility issue: the Dockerfile did not copy the repository `.npmrc`, so frozen pnpm installs defaulted to `autoInstallPeers=true` while the lockfile records `false`. The targeted fix in commit `c6021f9` copies `.npmrc` into both build and runtime dependency stages; no dependency or application behavior was weakened.

| Hosted gate | Result | Evidence |
| --- | --- | --- |
| CI quality workflow | Passed | [Run 31864792095](https://github.com/Usamabhanbhro/e-commerce/actions/runs/31864792095) completed successfully for `c6021f9`. |
| PostgreSQL staging/integrity workflow | Passed | [Run 31864792100](https://github.com/Usamabhanbhro/e-commerce/actions/runs/31864792100) passed type-check, unit tests, PostgreSQL migration/seed/verifier, build, release scan, and hosted Docker image build. |
| GitHub Pages deployment | Passed | [Run 31864792078](https://github.com/Usamabhanbhro/e-commerce/actions/runs/31864792078) completed successfully. |
| Public storefront | Passed | [https://usamabhanbhro.github.io/e-commerce/](https://usamabhanbhro.github.io/e-commerce/) loaded after the final deployment and rendered the expected demo storefront. |

The only hosted failure was the first container build for `8349a3b`; it was diagnosed from the runner logs and corrected immediately in `c6021f9`. The repository is now PostgreSQL-only in runtime, Docker, CI, and staging configuration. Intentional historical references remain only in migration-boundary documentation and package-manager optional-peer metadata.
