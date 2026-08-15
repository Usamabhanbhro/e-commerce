# Environment and security boundaries

## Principle

The repository has two configuration planes:

1. **Browser-safe configuration**, which may be embedded into Vite-generated assets because it is intentionally public.
2. **Server-only configuration**, which must remain in the runtime environment of the Express/API service and must never be placed in the GitHub Pages bundle.

Any variable prefixed with `VITE_` is eligible for browser exposure. Treat it as public even when it is convenient to use the same `.env` file during local development.

## Configuration matrix

| Variable | Browser-safe? | Development | Staging-like / production-like server | Pages build |
| --- | --- | --- | --- | --- |
| `VITE_PAGES_BASE_PATH` | Yes; public path only | Usually unset | Usually unset | Set from GitHub Pages configuration |
| `VITE_OAUTH_PORTAL_URL` | Yes, if the public portal URL is intended | Optional | Public portal URL | Optional; do not add client secrets |
| `VITE_APP_ID` | Yes, if it is a public application identifier | Optional | Public application identifier | Optional |
| `PORT` | No browser use | Local server port | Runtime listener port | Not used by static Pages artifact |
| `DATABASE_URL` | **Never** | Local MariaDB/MySQL URL | Managed database URL | **Never** |
| `JWT_SECRET` | **Never** | Local-only random value | Managed secret, at least 32 characters | **Never** |
| `PAYMENT_WEBHOOK_SECRET` | **Never** | Local-only random value | Managed secret, at least 32 characters | **Never** |
| `PAYMENT_MODE` | No; server policy | `mock` | `sandbox` or production policy | Not used |
| `PAYMENT_PROVIDER_ADAPTER` | No; server policy | `demo` | Official adapter only for production | Not used |
| `FRONTEND_ORIGIN` | No; server allowlist input | Local origin | Deployed frontend origin | Not used by static host |
| `ALLOWED_ORIGINS` | No; server allowlist input | Local origin | Explicit approved origins | Not used by static host |
| `OAUTH_SERVER_URL` | **Never expose client secret alongside it** | Optional | Provider URL | Not used by static host |
| `OAUTH_CLIENT_ID` | Server configuration; expose only if the provider flow explicitly requires it | Optional | Registered client ID | Not required for Pages |
| `OAUTH_CLIENT_SECRET` | **Never** | Local secret if needed | Managed secret | **Never** |
| `OWNER_OPEN_ID` | **Never** | Local test/admin identity | Provisioned production admin identity | **Never** |
| `TRUST_PROXY` | No; server topology setting | `false` | Explicitly set for the actual proxy topology | Not used |

The checked-in [`.env.example`](../.env.example) is a template only. It contains placeholders and must not be copied into a public deployment with real credentials.

## Frontend-only development

For the public storefront showcase, install dependencies and start Vite:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The frontend can run without a database because the public catalog and showcase commerce state are local. Use only safe public variables in the browser environment. Do not add database URLs, JWT secrets, payment secrets, webhook secrets, OAuth client secrets, or administrative identity values to a `VITE_*` variable.

## Staging-like server rehearsal

A staging-like backend rehearsal requires a reachable MySQL/MariaDB database and random non-production secrets. The minimum documented configuration is:

```bash
APP_ENV=staging
DATABASE_URL=mysql://user:password@127.0.0.1:3306/usamabhanbhro
JWT_SECRET=<at-least-32-random-characters>
PAYMENT_WEBHOOK_SECRET=<at-least-32-random-characters>
PAYMENT_MODE=mock
PAYMENT_PROVIDER_ADAPTER=demo
FRONTEND_ORIGIN=http://127.0.0.1:4177
ALLOWED_ORIGINS=http://127.0.0.1:4177
```

Apply the idempotent schema migrations and deterministic seed only against the intended rehearsal database:

```bash
pnpm db:migrate
pnpm db:seed
```

The rehearsal is designed to exercise health/readiness, CORS, authorization, security headers, webhook signature rejection, inventory reservation, payment idempotency, and duplicate-event behavior. It must not use real payment credentials or real customer data.

## Production-like requirements

Production-like startup must fail closed when required secrets or settings are missing. Before a production claim can be made, the deployment must provide managed secret storage, a managed MySQL/MariaDB service, an official payment adapter, registered OAuth credentials, an administrative `OWNER_OPEN_ID`, S3-compatible storage, TLS, DNS, edge controls, distributed rate limiting, monitoring, alerting, and encrypted backup/restore evidence.

The production payment mode must not be enabled with the demo adapter. Mock and sandbox outcomes are deterministic rehearsal behavior and must be labeled as such.

## GitHub Pages safety

The Pages workflow builds only the static frontend. It passes a public base path into Vite and does not inject server credentials. The following values must never appear in the Pages build environment or generated `dist/public` files:

- Database connection strings or database passwords.
- JWT signing secrets.
- Payment provider credentials or private keys.
- Webhook signing secrets.
- OAuth client secrets.
- Production administrator identity values.

Run `pnpm scan:release` after changes to configuration, documentation, or build behavior. Review the generated artifact rather than assuming that a value is safe because it was present in a local `.env` file.

## Secret-handling checklist

Before committing, confirm:

- `.env` and local secret files are ignored and absent from the staged file list.
- Only placeholders appear in `.env.example`.
- No server-only value is referenced by a `VITE_*` variable.
- Pages assets contain no local API URL, database credential, JWT secret, payment secret, webhook secret, or OAuth secret.
- Release and dependency scans have been run against the current repository state.
- Real customer, payment, and operational data has not been added to the repository.

The project remains **CLIENT DEMO READY** until these production prerequisites are independently provisioned and verified.
