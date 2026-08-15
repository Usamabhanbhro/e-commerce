# Production-readiness matrix

## Classification

> **CLIENT DEMO READY**

This reconstructed release candidate is suitable for client demonstration and portfolio review. It is not a production commerce system. The matrix below distinguishes repository evidence from external infrastructure that has not been provisioned.

## Status matrix

| Requirement | Status | Evidence or remaining requirement |
| --- | --- | --- |
| Automated unit tests | **PASS** | 23/23 unit tests passed on the current candidate |
| TypeScript checks and lint | **PASS** | `pnpm check` and `pnpm lint` passed |
| Browser tests | **PASS** | 46/46 functional Playwright tests passed against the rebuilt production artifact |
| Visual tests | **PASS** | 12/12 tests passed against a reconstructed baseline set; these are not historical snapshots |
| Database rehearsal | **PASS** | Idempotent migrations and deterministic seed passed; 36 products and 8 collections were seeded |
| Durable commerce invariants | **PASS** | Inventory reservation, failed-payment release, payment idempotency, webhook replay handling, and concurrent reservation rehearsal passed |
| Runtime and security probes | **PASS** | Health/readiness, headers, CORS, authorization, OAuth error handling, webhook rejection, storage validation, and unknown API probes passed |
| GitHub Pages deployment | **PASS** | GitHub Actions build and deploy jobs completed successfully for the `/e-commerce/` project site |
| Release scan and dependency thresholds | **PASS** | Release scan passed; production and critical dependency audits passed at configured thresholds |
| OAuth production credentials and redirect URIs | **BLOCKED** | Register the real OAuth application, configure redirect URIs, and store client secrets server-side |
| Official production payment adapter | **BLOCKED** | Integrate and independently verify an official provider adapter and credentials |
| Managed production PostgreSQL | **BLOCKED** | Provision managed PostgreSQL infrastructure, access policy, migrations, and operational ownership |
| Encrypted scheduled backups | **BLOCKED** | Configure encrypted automated backups with retention and access controls |
| Verified restoration | **BLOCKED** | Execute and record a restoration rehearsal from an encrypted backup |
| S3-compatible storage | **BLOCKED** | Provision object storage, bucket policy, lifecycle, and private access configuration |
| Production `OWNER_OPEN_ID` | **BLOCKED** | Provision and verify the real administrative identity in the production environment |
| DNS | **BLOCKED** | Configure a selected domain and verify DNS ownership and routing |
| TLS | **BLOCKED** | Verify certificate issuance and HTTPS enforcement for the selected production domain |
| WAF/edge protection | **BLOCKED** | Provision and tune the production edge security layer |
| Distributed rate limiting | **BLOCKED** | Replace single-runtime assumptions with shared production rate-limit state |
| Centralized monitoring | **BLOCKED** | Configure application, infrastructure, and payment observability |
| Alerting | **BLOCKED** | Configure actionable alerts, ownership, escalation, and incident evidence |
| GitHub Pages backend hosting | **NOT APPLICABLE** | GitHub Pages is intentionally frontend/static hosting; the API requires separate infrastructure |
| Live customer commerce | **NOT APPLICABLE** | The current release is a demo and does not claim operational customers, fulfillment, or live payment capture |

## Reconstruction and evidence policy

This evidence belongs to the current reconstructed candidate built from the `Usamabhanbhro/e-commerce` baseline after the previous worktree was lost. It is not evidence from the lost prior worktree. The 12 visual snapshots are new reconstructed baselines and must not be described as recovered historical snapshots.

The approved storefront was preserved while the reconstructed production layer added fail-closed environment validation, environment-aware JWT cookies, OAuth error sanitization, request IDs, security headers, CORS allowlisting, request limits, scoped rate limiting, storage-key validation, health/readiness endpoints, sanitized errors, Express 5-compatible SPA fallback, and clean shutdown.

The durable commerce layer adds canonical server-side pricing, atomic inventory reservation, idempotency keys, order/payment transition guards, exact-once inventory release and commit behavior, payment-provider boundaries for mock/sandbox/production modes, HMAC webhook verification, webhook replay protection, amount and order validation, and PostgreSQL migrations for catalog, users, orders, inventory, payments, idempotency, carts, wishlists, and webhook events.

## Demo boundary

The public Pages checkout is a demonstration surface. Its payment selectors and outcomes are mock or sandbox boundaries and do not process real card, wallet, or bank credentials. No fake customers, transactions, payment settlements, or production operational evidence are included in this repository.

`PAYMENT_MODE=mock` is suitable only for deterministic demo and rehearsal flows. `PAYMENT_MODE=sandbox` remains deterministic and carries sandbox metadata. `PAYMENT_MODE=production` fails closed unless the approved official adapter is configured.

## Promotion criteria

The classification may change only after the blocked requirements are provisioned and independently verified. A documentation update alone is not sufficient. The promotion record should include environment configuration, deployment identifiers, payment-provider verification, database and backup/restore evidence, security controls, monitoring and alerting evidence, and a fresh run of the repository’s complete validation gates.

## References

[1]: ../docs/qa.md "QA and deployment rehearsal runbook"
[2]: ../server/env.ts "Environment validation"
[3]: ../server/security.ts "Runtime security helpers"
[4]: ../server/commerce.ts "Durable commerce service"
[5]: ../server/paymentProviders.ts "Provider-independent payment boundary"
[6]: ../server/index.ts "Express production-like bootstrap"
[7]: ../tests/e2e/release.spec.ts "46-test browser suite"
[8]: ../tests/e2e/visual.spec.ts "Reconstructed visual suite"
