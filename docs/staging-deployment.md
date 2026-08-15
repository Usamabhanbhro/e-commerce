# Dedicated staging deployment

## Current state

The repository is **staging-prepared but not externally deployed**. No staging-capable hosting, database, or object-storage connector is configured in the current session, so this document does not claim that a remote environment exists or that a staging URL is live.

The intended topology is:

```text
GitHub Pages frontend
        |
        | HTTPS + credentialed CORS
        v
Dedicated Express API container
        |
        +--> Dedicated staging PostgreSQL database
        |
        +--> Dedicated S3-compatible object storage
```

The public GitHub Pages site remains a static storefront/demo shell. The authenticated merchant studio becomes operational only when `VITE_API_BASE_URL` points to the separately deployed API and that API has a staging database, object storage, OAuth configuration, and dedicated secrets.

## Deployment configuration included in the repository

| File | Purpose |
| --- | --- |
| `Dockerfile` | Multi-stage Node 22 image that installs production dependencies and runs the existing Express build. |
| `docker-compose.staging.yml` | Local-only rehearsal topology with isolated PostgreSQL and MinIO volumes. It is not a production deployment. |
| `.env.example` | Complete placeholder contract for API, database, OAuth, payment mode, CORS, and object storage. |
| `server/storage.ts` | Server-only S3-compatible adapter with presigned uploads, retrieval, bucket readiness, and image validation. |
| `client/src/lib/api.ts` | Browser-safe API base resolver for cross-origin staging without embedding secrets. |

## Required staging secrets and configuration

Create a dedicated secret group for staging. Do not reuse production values.

| Variable | Required value or rule |
| --- | --- |
| `APP_ENV` | `staging` |
| `NODE_ENV` | `production` |
| `PORT` | Provider-assigned port, normally `3000` inside the container. |
| `DATABASE_URL` | Dedicated PostgreSQL URL; never a production database. |
| `JWT_SECRET` | At least 32 random characters, unique to staging. |
| `PAYMENT_WEBHOOK_SECRET` | At least 32 random characters, unique to staging. |
| `PAYMENT_MODE` | `mock` or `sandbox`; never production credentials. |
| `PAYMENT_PROVIDER_ADAPTER` | `demo` or the approved sandbox adapter. |
| `FRONTEND_ORIGIN` | Exact GitHub Pages origin, for example `https://usamabhanbhro.github.io`. |
| `ALLOWED_ORIGINS` | Exact comma-separated allowed origins, including the GitHub Pages origin and any approved staging preview origin. Never `*` with credentials. |
| `ALLOW_DEMO_LOGIN` | Omit or set `false`. The demo-owner route is development/test-only. |
| `OAUTH_SERVER_URL` | Approved staging OAuth provider URL. |
| `OAUTH_CLIENT_ID` | Staging OAuth client identifier. |
| `OAUTH_CLIENT_SECRET` | Server-only staging OAuth secret. |
| `OWNER_OPEN_ID` | Staging owner identity mapping, if the provider requires it. |
| `S3_ENDPOINT` | Dedicated S3-compatible endpoint. |
| `S3_REGION` | Provider region, usually `us-east-1` for MinIO-compatible services. |
| `S3_BUCKET` | Dedicated staging bucket, for example `usamabhanbhro-staging`. |
| `S3_ACCESS_KEY_ID` | Server-only staging object-storage key. |
| `S3_SECRET_ACCESS_KEY` | Server-only staging object-storage secret. |
| `S3_FORCE_PATH_STYLE` | `true` for MinIO and many local S3-compatible services; provider-specific for hosted storage. |

The browser build may receive only public, non-secret values such as `VITE_API_BASE_URL`, `VITE_OAUTH_PORTAL_URL`, and `VITE_APP_ID`. Never place database, JWT, OAuth client-secret, payment, or object-storage credentials in a `VITE_*` variable.

## Manual provisioning sequence

1. Create a new service or container from the repository’s `Dockerfile` using Node 22. Configure HTTPS at the hosting provider or reverse proxy, set the staging secret group, and expose the container’s port `3000`.
2. Create a dedicated PostgreSQL database and user. Restrict network access to the API service, store the connection URL as `DATABASE_URL`, run the checked-in PostgreSQL migrations, and do not copy production data.
3. Create a dedicated private object-storage bucket and credentials. Configure CORS for the API’s server-side signed URL flow and the GitHub Pages origin only. Keep public object URLs disabled unless the provider’s policy requires them; the application retrieves through the server boundary.
4. Configure a staging OAuth application with a callback of `<STAGING_API_ORIGIN>/api/oauth/callback`. Do not reuse a production OAuth client or secret.
5. Set `APP_ENV=staging`, `NODE_ENV=production`, `PAYMENT_MODE=mock` or sandbox, and keep `ALLOW_DEMO_LOGIN` unset/false. The server will fail startup if required persistence or storage configuration is missing.
6. Run migrations from the deployed image or a controlled release job with the same `DATABASE_URL`:

   ```bash
   pnpm db:migrate
   pnpm db:seed
   pnpm db:verify
   ```

   Seed only the safe demo catalog and non-sensitive test identities. Never import real customers, payment methods, or production order history.

7. Build the Pages frontend with the API origin injected at build time:

   ```bash
   VITE_API_BASE_URL=https://staging-api.example.com pnpm build:pages
   ```

   Publish the resulting static artifact through the existing Pages workflow. The browser will use the configured API base for catalog hydration, admin requests, OAuth redirect construction, and credentialed sessions.

## Local PostgreSQL rehearsal

The checked-in compose file provides isolated PostgreSQL and MinIO services for local rehearsal. From the repository root:

```bash
docker compose -f docker-compose.staging.yml up -d
DATABASE_URL=postgresql://staging_app:replace-with-local-staging-db-password@127.0.0.1:5433/usamabhanbhro_staging pnpm db:migrate
DATABASE_URL=postgresql://staging_app:replace-with-local-staging-db-password@127.0.0.1:5433/usamabhanbhro_staging pnpm db:seed
DATABASE_URL=postgresql://staging_app:replace-with-local-staging-db-password@127.0.0.1:5433/usamabhanbhro_staging pnpm db:verify
docker compose -f docker-compose.staging.yml down
```

The sandbox used for this implementation did not provide a Docker/Podman runtime, so the compose boot and container execution remain provider/runner-verifiable gates. The hosted staging validation workflow builds the image and exercises PostgreSQL migrations, seeding, and integrity checks on every relevant push.

## Readiness and API checks

The API exposes:

- `GET /health`: process health, environment summary, and non-secret storage configuration summary.
- `GET /ready`: database and object-storage reachability. In staging or production it returns `503` unless both persistence and storage are available.
- `GET /api/catalog`: server-owned storefront snapshot.
- `POST /api/admin/media/presign`: owner/admin-authorized presigned image upload request.
- `GET /storage/<merchant-key>`: server-mediated object retrieval with storage-key validation.

After provisioning, verify from an allowed origin:

```bash
curl -i https://staging-api.example.com/health
curl -i https://staging-api.example.com/ready
curl -i -H 'Origin: https://usamabhanbhro.github.io' -X OPTIONS \
  -H 'Access-Control-Request-Method: GET' \
  https://staging-api.example.com/api/catalog
curl -i -H 'Origin: https://not-allowed.example' -X OPTIONS \
  -H 'Access-Control-Request-Method: GET' \
  https://staging-api.example.com/api/catalog
curl -i https://staging-api.example.com/api/admin/bootstrap
```

Expected behavior is `200`/`204` with a reflected exact origin for the allowed preflight, `403` for the disallowed preflight, and `401` for the unauthenticated admin bootstrap request. No wildcard credentialed CORS header should be present.

## Authentication and session verification

The existing session system remains the source of truth. The OAuth callback must be completed by the selected provider before the following checks can pass:

1. Sign in through the staging OAuth client.
2. Confirm `GET /api/auth/me` returns the authenticated user and that the session cookie persists across a reload.
3. Confirm `GET /api/admin/bootstrap` succeeds for an `owner`, `admin`, and `staff` identity according to the documented RBAC matrix.
4. Confirm an unauthenticated request returns `401` and a disallowed role receives `403` for protected admin sections.
5. Sign out through `POST /api/auth/logout`, reload, and confirm the session is cleared.
6. Expire or revoke the staging session and confirm subsequent admin requests fail closed.

The local demo-owner route is intentionally unavailable when `APP_ENV=staging` or `APP_ENV=production`.

## Storage verification

The storage adapter accepts only image content types under the `merchant/` namespace, rejects unsafe keys, and rejects files over 10 MB. After provisioning, test:

1. Request a presigned URL with a valid `merchant/home/hero.webp` key and upload the bytes directly to the returned URL.
2. Retrieve the object through `GET /storage/merchant/home/hero.webp` and verify its content type and bytes.
3. Confirm a request for `../secrets.txt`, a non-image MIME type, or an oversized declaration returns a validation error.
4. Confirm a missing object returns a non-success response without exposing provider internals.

## What remains manual

The repository now contains the deployment image, local rehearsal topology, PostgreSQL migration history, environment contract, API-base wiring, fail-closed readiness checks, S3-compatible storage adapter, and documentation. **Remote hosting, staging PostgreSQL, staging object storage, and staging OAuth still require provider-side provisioning because no connected deployment provider or staging credentials are available in this session.**
