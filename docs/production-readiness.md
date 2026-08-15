# Production readiness

> **Classification: CLIENT DEMO READY.**

This release candidate is a **reconstructed implementation created after loss of the previously validated worktree**. It is intentionally a new candidate built on the existing `Usamabhanbhro/e-commerce` baseline; it is not a recovered copy and must not be described as the same previously validated commit.

## Reconstruction summary

The approved storefront was preserved, including its catalog presentation, imagery, typography, routes, responsive layout, checkout surface, mock payment UI, and visual identity. The reconstructed production layer adds fail-closed staging/production configuration, environment-aware JWT cookies, OAuth error sanitization, request IDs, security headers, CORS allowlisting, request limits, scoped rate limiting, storage-key validation, health/readiness endpoints, sanitized errors, Express 5-compatible SPA fallback, and clean shutdown.

The durable commerce layer adds canonical server-side pricing, atomic inventory reservation, idempotency keys, order/payment transition guards, exact-once inventory release and commit behavior, payment-provider boundaries for mock/sandbox/production modes, HMAC webhook verification, webhook replay protection, amount and order validation, and MySQL/MariaDB migrations for catalog, users, orders, inventory, payments, idempotency, carts, wishlists, and webhook events. No real payment-provider API or credentials have been invented.

The test and operations layer adds 23 unit tests, 46 functional/security browser tests, 12 reconstructed visual baselines, CI quality gates, a production-like startup probe, secret/legacy-brand/local-runtime scanning, database migration and seed scripts, and this documentation set.

## Validation status

| Area | Status | Evidence |
| --- | --- | --- |
| Frozen dependency install | Passed | `pnpm install --frozen-lockfile` |
| TypeScript and lint | Passed | `pnpm check`, `pnpm lint` |
| Unit tests | Passed | 23/23 tests |
| Production build | Passed | `pnpm build` |
| Pages build | Passed | `pnpm build:pages` |
| Release scan | Passed | `pnpm scan:release` |
| Production dependency gate | Passed at high-severity threshold | `pnpm audit:prod`; two moderate advisories remain |
| Critical dependency gate | Passed | `pnpm audit:critical`; no critical advisories remain |
| Browser regression | Passed | 46/46 tests against the rebuilt staging-like server |
| Visual regression | Passed | 12/12 new reconstructed snapshots |
| Real database rehearsal | Passed | MariaDB migrations, 36 products, 8 collections, and commerce integrity probe |
| Live runtime probes | Passed | health, readiness, headers, CORS, authorization, webhook rejection, catalog, SPA fallback |

## Known differences from the lost candidate

The previous candidate’s commit, browser artifacts, and visual baselines were permanently lost. This implementation was rebuilt from the existing GitHub baseline and the verified requirements. Its 12 visual snapshots are new reconstructed baselines. The reconstructed baseline has 23 unit tests and a 46-test browser suite; prior-session evidence must not be treated as evidence for this candidate. Exact dependency versions, generated asset hashes, database identifiers, and commit history therefore differ.

The local browser gate used the available system Chromium with video capture disabled by default because the sandbox did not contain the Playwright-managed browser and ffmpeg bundles. CI retains managed Chromium installation and can opt into failure video capture with `PLAYWRIGHT_VIDEO=on` if the runner provides the required bundle.

## External blockers before live commerce

Live commerce is **not operational** until the following external requirements are configured and verified: OAuth provider credentials and redirect registration; an official payment adapter and provider credentials/documentation; a managed production MySQL-compatible database; encrypted scheduled backups and a verified restore; S3-compatible storage credentials and policy; production `OWNER_OPEN_ID`; production DNS; TLS certificates; WAF/edge protection; distributed rate limiting; and centralized monitoring and alerting.

`PAYMENT_MODE=mock` is suitable only for deterministic demo and rehearsal flows. `PAYMENT_MODE=sandbox` remains deterministic and carries sandbox metadata. `PAYMENT_MODE=production` fails closed unless the approved official adapter is configured. No production payment claim is made by this candidate.

## References

[1]: ../docs/qa.md "QA and deployment rehearsal runbook"
[2]: ../server/env.ts "Environment validation"
[3]: ../server/security.ts "Runtime security helpers"
[4]: ../server/commerce.ts "Durable commerce service"
[5]: ../server/paymentProviders.ts "Provider-independent payment boundary"
[6]: ../server/index.ts "Express production-like bootstrap"
[7]: ../tests/e2e/release.spec.ts "46-test browser suite"
[8]: ../tests/e2e/visual.spec.ts "Reconstructed visual suite"
