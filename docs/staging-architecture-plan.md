# Dedicated Staging Architecture Audit

## Audit status

This document records a **read-only architecture audit** before staging changes. Its MariaDB/MySQL persistence findings are historical and are superseded by the completed PostgreSQL migration documented in [`postgresql-migration-audit.md`](postgresql-migration-audit.md), [`postgresql-migration-plan.md`](postgresql-migration-plan.md), and [`postgresql-data-migration.md`](postgresql-data-migration.md). The existing Express, Drizzle, JWT-cookie session, GitHub Pages, and explicit demo/rehearsal boundaries remain the foundation.

## Current architecture findings

| Audit item | Repository evidence | Staging implication |
| --- | --- | --- |
| Express entrypoint | `server/index.ts` exports `app` and starts `startServer()` on `PORT` | Deploy the existing bundled `dist/index.js` as a persistent Node.js HTTP service |
| Admin routes | `server/admin.ts` registers `/api/admin/demo-login`, `/api/admin/bootstrap`, products, categories, inventory, promotions, banners, orders, customers, staff, audit, and settings routes | Keep these routes server-owned; expose them only through the staging API origin |
| Authentication/session | `server/auth.ts` signs an `ub_session` JWT in an HTTP-only cookie; staging uses `sameSite=none` and `secure=true` | The staging API needs HTTPS and a real `JWT_SECRET`; the browser must send credentials cross-origin |
| RBAC | `server/admin.ts` resolves `owner`, `admin`, and `staff` server-side and applies `rolePermissions` through `guard()` | Never rely on browser navigation visibility for authorization; verify each role with API requests |
| Database | `server/db.ts` uses `pg` and Drizzle’s node-postgres adapter; `DATABASE_URL` creates the connection pool | A dedicated staging PostgreSQL URL is required; no production URL may be reused |
| Migrations | `scripts/migrate.ts` uses Drizzle’s PostgreSQL migrator against tracked `drizzle/migrations` artifacts | Run the PostgreSQL migration history from zero, then the deterministic seed and `db:verify` checks |
| PostgreSQL | `.env.example` and scripts require a `postgresql://...` `DATABASE_URL`; seed and verification require the same target | Provision a reachable PostgreSQL staging database and run migrations, safe seed, and integrity verification before API startup |
| Storage abstraction | `server/index.ts` exposes only a validated `/storage/*` lookup boundary; `vite.config.ts` contains a development-only Manus storage proxy | A real staging object-storage adapter is not currently wired into the Express API; upload/retrieval cannot be claimed complete without implementing or connecting the existing provider abstraction |
| Media upload | Admin product forms accept image URLs; no server-side multipart upload route exists in `server/index.ts` or `server/admin.ts` | Treat media upload as a staging blocker. Do not add credentials to the browser or pretend URL entry is object-storage upload |
| CORS | `server/security.ts` reads `ALLOWED_ORIGINS` or `FRONTEND_ORIGIN`, echoes only an allowlisted origin, enables credentials, and rejects disallowed `OPTIONS` | Set the exact Pages origin, never `*`; verify allowed/disallowed origins and preflight responses |
| Environment variables | `.env.example` defines `APP_ENV`, `PORT`, `DATABASE_URL`, JWT/webhook secrets, payment policy, frontend origin, OAuth placeholders, owner identity, and proxy setting | Use a dedicated staging secret set. `VITE_*` remains browser-public and must contain no server secret |
| Health/readiness | `/health` reports environment summary; `/ready` pings `DATABASE_URL` and returns 503 for missing/unreachable staging/production DB | Use `/health` for process monitoring and `/ready` for traffic admission; current staging readiness correctly fails without a database |
| Deployment configuration | `.github/workflows/deploy-pages.yml` deploys only `dist/public`; `.github/workflows/ci.yml` probes local startup but does not provision a remote service | GitHub Pages remains the frontend only. A separate persistent HTTPS Node host is required for the API |
| GitHub Pages origin | `https://usamabhanbhro.github.io/e-commerce/` | Set staging API CORS to this exact origin and configure the frontend API base to the separate HTTPS staging API URL |
| API URL configuration | `client/src/lib/commerce.tsx` and `client/src/pages/Admin.tsx` use relative `/api/*` URLs | Cross-origin staging requires one public, browser-safe API base variable such as `VITE_API_BASE_URL`, with no credentials embedded; the current relative-only behavior is a staging connection blocker |
| Payments | `.env.example` defaults to `PAYMENT_MODE=mock` and `PAYMENT_PROVIDER_ADAPTER=demo`; production mode requires the official adapter | Staging must remain mock or provider sandbox with dedicated non-production credentials. Never use production payment keys or real financial data |
| Demo authentication | `/api/admin/demo-login` is disabled only when `APP_ENV=production`; it is available in staging under the current code | This must be hardened before staging if staging is intended to exercise real OAuth/session behavior. Demo login must remain a local development/rehearsal-only path, not a staging identity mechanism |
| Tests | `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:pages`, `pnpm test:e2e`, `pnpm test:visual`, release scan, and audit scripts are present | Add staging smoke checks for readiness, CORS, cookie sessions, role boundaries, database writes, and storage once provider credentials exist |
| Hardcoded localhost | Localhost/127.0.0.1 values appear in templates, CI rehearsal commands, `drizzle.config.ts` fallback, and docs; the client has no hardcoded absolute API URL | Local defaults are acceptable for development but must not be used as staging runtime configuration. Review built Pages assets after introducing an API base variable |
| Staging blockers | No connected persistent API host, managed staging database, object-storage credentials, OAuth credentials, or remote secret provider is present in the repository/session | Prepare deployable configuration and exact secret contracts; do not claim remote deployment or persistence until manually provisioned and verified |

## Smallest practical staging topology

```text
GitHub Pages frontend
  https://usamabhanbhro.github.io/e-commerce/
              |
              | HTTPS, credentials: include, explicit CORS origin
              v
Dedicated staging Express API
  Node.js persistent service, APP_ENV=staging
              |
              +--> Dedicated staging PostgreSQL
              |      migrations + safe demo seed + integrity verification
              |
              +--> Dedicated staging object storage
                     non-production bucket/prefix, private credentials
```

The API service must be reachable over HTTPS, support long-lived HTTP requests, expose environment secrets through the provider’s secret manager, connect outbound to the staging database, and preserve the existing Express startup contract. The frontend build must receive only a public `VITE_API_BASE_URL` pointing at the staging API; all JWT, database, OAuth, webhook, payment, storage, and owner identity values remain server-only.

## Required sequencing

The staging implementation now fails closed in `APP_ENV=staging`, uses a public API-base seam for cross-origin calls, connects the storage abstraction to an S3-compatible bucket contract, and provides PostgreSQL migrations, seed, and integrity verification. The remaining sequence is provider-side provisioning of the API host, PostgreSQL database, object storage, OAuth/session credentials, and safe demo seed, followed by role/session/CORS/storage smoke tests against those real staging services.

## Explicit non-claims

No remote staging API, staging PostgreSQL database, object-storage bucket, OAuth tenant, payment sandbox, or deployment provider is currently connected or verified by this audit. Therefore this repository is **staging-prepared only**, not staging-deployed. The existing GitHub Pages site remains a public static demo and must not be described as an operational merchant backend.
