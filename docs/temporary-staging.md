# Temporary zero-cost GitHub Actions staging

This repository now includes a manual workflow named **Temporary staging** at `.github/workflows/temporary-staging.yml`. It runs the existing Node.js 22 + Express application on an Ubuntu GitHub Actions runner, uses the existing PostgreSQL service-container pattern, exposes the local API through a credential-free Cloudflare Quick Tunnel, and optionally publishes a temporary GitHub Pages build that points at the generated tunnel URL.

This is **temporary staging only**. It is not production infrastructure, does not require a custom domain, and the public `trycloudflare.com` URL disappears when the workflow job or tunnel stops. The workflow is manual-only and therefore does not consume runner time until explicitly started.

## How to start it

Open the repository’s **Actions → Temporary staging → Run workflow** screen. Choose a keep-alive period from 5 to 120 minutes. Enable `deploy_pages` only when a temporary Pages build should be published against the current tunnel URL. The default is 30 minutes with Pages deployment disabled.

The workflow cancels a previous run in the same concurrency group, starts the API and tunnel, prints the temporary URL in the job log and step summary, reports API/tunnel status once per minute, and cleans up the API and tunnel processes when the job ends or is cancelled.

## Exact GitHub repository secrets

The workflow validates these names before starting the API. Secret values must be entered through the repository or environment secrets UI; they must never be committed or printed.

| Secret                   | Required | Purpose                                                                                 |
| ------------------------ | -------- | --------------------------------------------------------------------------------------- |
| `JWT_SECRET`             | Yes      | Production-like cookie-session signing; must be at least 32 characters.                 |
| `PAYMENT_WEBHOOK_SECRET` | Yes      | Production-like webhook HMAC verification; must be at least 32 characters.              |
| `OAUTH_SERVER_URL`       | No       | Intentionally deferred; no provider-specific OAuth integration is configured.           |
| `OAUTH_CLIENT_ID`        | No       | Intentionally deferred; do not add provider credentials in this phase.                  |
| `OAUTH_CLIENT_SECRET`    | No       | Intentionally deferred; do not add provider credentials in this phase.                  |
| `OWNER_OPEN_ID`          | No       | Intentionally deferred until a real OAuth/OIDC provider is implemented.                 |
| `S3_ENDPOINT`            | Yes      | Cloudflare R2 S3-compatible endpoint.                                                   |
| `S3_REGION`              | Yes      | R2 S3-compatible region value.                                                          |
| `S3_BUCKET`              | Yes      | Dedicated staging R2 bucket name.                                                       |
| `S3_ACCESS_KEY_ID`       | Yes      | R2 staging access key.                                                                  |
| `S3_SECRET_ACCESS_KEY`   | Yes      | R2 staging secret key.                                                                  |
| `S3_FORCE_PATH_STYLE`    | Yes      | Existing storage adapter setting; use the value required by the configured R2 endpoint. |

`DATABASE_URL` is not a repository secret in this workflow. The workflow uses the repository’s supported GitHub Actions PostgreSQL service container with the existing convention `postgresql://staging_ci:staging_ci@127.0.0.1:5432/staging_ci`. This database is ephemeral and exists only for the job. No external database is claimed or reused.

## Validation sequence

The workflow uses the repository’s existing commands and implementation. It installs locked dependencies, runs `pnpm check`, `pnpm lint`, and `pnpm test`, runs `pnpm db:migrate`, `pnpm db:seed`, and `pnpm db:verify`, then runs `pnpm build`.

Before starting the API, it uses the existing S3-compatible storage adapter with the configured Cloudflare R2 secrets to upload and retrieve two isolated probe objects under `merchant/`, one product-named and one banner-named. It verifies the signed upload, object existence, retrieved bytes, content type, and cleanup. This validates the R2 media path without bypassing the authenticated admin route.

It starts the real production command `pnpm start` with `APP_ENV=staging` and `NODE_ENV=production`. The workflow verifies local `/health`, starts the real Cloudflare Quick Tunnel, verifies public `/health` and `/ready`, checks that the configured GitHub Pages origin is accepted by CORS while a different origin receives `403`, and checks the configured security headers including HSTS. It also confirms that unauthenticated admin access remains `401`.

If `deploy_pages` is enabled, the workflow runs the existing `pnpm build:pages` mechanism with the generated tunnel URL in `VITE_API_BASE_URL`, creates the SPA fallback, and deploys the artifact using the existing GitHub Pages deployment mechanism. The temporary URL is not committed into repository configuration.

## Stop conditions

The workflow fails before API startup if any required session, webhook, or R2 secret is missing or if either required production-like secret is shorter than 32 characters. OAuth variables are deliberately not required. The workflow does not fabricate PostgreSQL, OAuth, R2, payment, or tunnel credentials. It does not replace PostgreSQL, Drizzle, Express, React, the existing JWT/session implementation, or the existing storage abstraction.

OAuth-related code remains unchanged, but no provider-specific authorization flow is claimed. The existing `/api/admin/*` routes still require a valid session and role; without OAuth, admin login and authenticated CMS mutations remain blocked. The workflow verifies this protection rather than introducing a demo login or bypass.

The workflow is classified as **STAGING PARTIALLY PROVISIONED** until a real run has completed with authorized R2 and session/webhook secrets. A successful no-OAuth run may be classified **TEMPORARY API/R2 STAGING OPERATIONAL**, but it must never be used to claim OAuth functionality or production readiness. OAuth/OIDC implementation and a stable staging hostname are deferred to the next phase.
