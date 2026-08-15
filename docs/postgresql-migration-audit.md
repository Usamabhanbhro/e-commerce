# PostgreSQL Migration Audit

## Scope and baseline

This audit captures the repository state before changing the relational database dialect. The application currently uses React/Vite, Express, Node.js, Drizzle ORM, and a MariaDB/MySQL driver. The custom Merchant CMS, commerce service, authentication, RBAC, S3-compatible media adapter, GitHub Pages frontend, Docker image, CI workflows, and automated tests are already present. The current staging topology is local-only and uses MariaDB plus MinIO; no remote staging database is provisioned.

The migration target is PostgreSQL as the **sole authoritative relational database**. The existing application behavior must remain intact, and the migration must not introduce a second production database layer or leave MySQL/MariaDB runtime compatibility behind.

## Current persistence inventory

| Area | Current implementation | Migration impact |
| --- | --- | --- |
| Drizzle schema | `drizzle/schema.ts` imports `drizzle-orm/mysql-core` and defines 15 tables with `mysqlTable`, `datetime`, `int`, `json`, `serial`, `varchar`, `boolean`, and unique indexes. | Convert to `drizzle-orm/pg-core`; preserve logical table/column names and exact-money integer fields; decide carefully whether JSON fields remain `jsonb`, and add only justified constraints/indexes. |
| Database client | `server/db.ts` uses `mysql2/promise`, `drizzle-orm/mysql2`, a MySQL pool, and `SELECT 1` through a MySQL connection. | Replace with `pg` and `drizzle-orm/node-postgres` or the supported PostgreSQL Drizzle driver. Keep environment-only `DATABASE_URL`, pool lifecycle, and readiness behavior. |
| Drizzle config | `drizzle.config.ts` uses `dialect: "mysql"` and a MySQL fallback URL. | Change to `dialect: "postgresql"`; remove the MySQL fallback and require a PostgreSQL URL through environment configuration. |
| Migration runner | `scripts/migrate.ts` uses `mysql2` and hard-coded MySQL DDL: `AUTO_INCREMENT`, `DATETIME`, `JSON`, `ENGINE=InnoDB`, MySQL indexes, and `ON UPDATE CURRENT_TIMESTAMP`. The release table uses `?` placeholders and MySQL DDL. | Replace with a PostgreSQL migration history that is reproducible from source control. Do not silently rewrite historical MySQL migrations; create a documented PostgreSQL baseline or new migration directory. |
| Seed | `scripts/seed.ts` uses `mysql2`, JSON stringification, `?` placeholders, and `ON DUPLICATE KEY UPDATE ... VALUES(...)`. | Use PostgreSQL parameterization and `ON CONFLICT DO UPDATE`; pass structured JSON values through Drizzle/pg. Preserve deterministic catalog contents and counts. |
| Commerce transactions | `server/commerce.ts` uses Drizzle transactions and conditional stock updates, then reads MySQL result metadata via `affectedRows` and `insertId`. Payment idempotency is backed by a unique key; webhook replay is backed by a unique event ID. | Preserve atomic transactions and conditional stock decrement. Adapt result handling to PostgreSQL command tags/returned rows or `returning()`. Add real PostgreSQL integration tests for concurrent reservations and replay/idempotency. |
| Admin CMS | `server/admin.ts` uses Drizzle CRUD, conditional inventory updates, raw role filtering, and MySQL result metadata (`affectedRows`/insert IDs). | Replace affected-row/insert-ID assumptions while keeping all routes, RBAC checks, audit behavior, and response contracts unchanged. |
| Schema relationships | Current schema defines no explicit Drizzle foreign keys or cascades in the inspected file; migration SQL has indexes but no relational foreign-key declarations. | Preserve behavior while evaluating justified PostgreSQL foreign keys/checks. Any added constraint must be compatible with deterministic seed and existing application flows. |
| Dates and updates | Timestamps use MySQL `datetime` and `$onUpdateFn(() => new Date())`; custom migration SQL uses `ON UPDATE CURRENT_TIMESTAMP`. | Use PostgreSQL timestamp/timestamp-with-time-zone semantics deliberately. Preserve API date serialization and ensure updates continue to advance timestamps. |
| Money | Prices, order totals, payment amounts, and inventory quantities are integer PKR fields. | Keep exact integer PKR representation; no floating-point conversion. |
| JSON/text | Catalog and address/payment/audit payloads use MySQL `json`; text-like fields use bounded `varchar`. | Use PostgreSQL `jsonb` where query/storage semantics benefit, or `json` where preserving shape is simpler. Keep API types and serialized values stable. |
| Runtime fallback | `getDb()` returns `null` when `DATABASE_URL` is absent, and several services fall back to in-memory demo state. | PostgreSQL must be authoritative in staging/production. Preserve development/test demo behavior only if explicitly scoped; staging/production must fail closed instead of silently using memory. |
| Docker | `docker-compose.staging.yml` provisions MariaDB 11 and MinIO. The application Dockerfile is database-agnostic but installs the app. | Replace MariaDB with PostgreSQL, update health checks, volumes, env names, and startup ordering. Keep S3-compatible MinIO. |
| CI | Existing CI injects a MySQL URL into the production-like startup probe; staging validation builds the app/container but does not start a database service or run migrations/seeds. | Add PostgreSQL service/container, migration and seed checks, and ensure no CI job silently uses MariaDB/MySQL. |
| Tests | Unit tests cover state and validation behavior; existing browser tests do not exercise real database persistence. | Add reproducible PostgreSQL integration coverage without replacing real DB behavior with mocks. Keep existing browser/visual suites. |
| Environment | `.env.example` currently documents a MySQL `DATABASE_URL`; server validation only requires the variable, not its dialect. | Document PostgreSQL connection format and reject/avoid obsolete MySQL runtime assumptions. Never expose it through `VITE_*`. |

## MySQL-specific constructs found

The audited runtime and configuration references include `mysql2`, `drizzle-orm/mysql-core`, `drizzle-orm/mysql2`, `mysqlTable`, `datetime`, `int`, `json`, MySQL `AUTO_INCREMENT`, `ENGINE=InnoDB`, `INDEX`/`UNIQUE KEY` DDL, `ON UPDATE CURRENT_TIMESTAMP`, `?` placeholders, `ON DUPLICATE KEY UPDATE`, `VALUES(...)`, `affectedRows`, `insertId`, `mysql://` URLs, MariaDB service configuration, and `MARIADB_*` variables. These must be removed from runtime/build/test configuration unless a remaining reference is explicitly historical documentation of the migration boundary.

## Integrity invariants to preserve

Inventory reservation is performed inside a Drizzle transaction using a conditional update requiring active products and sufficient stock. The intended invariant is that concurrent reservations never drive stock below zero. Payment idempotency relies on the unique `paymentAttempts.idempotencyKey`; duplicate processing returns the existing attempt. Webhook replay protection relies on the unique `paymentWebhookEvents.eventId`; duplicate events are reported as duplicates. Payment success commits reserved inventory, while failed/cancelled payment releases it, with state-machine checks preventing invalid backward payment transitions. Order creation must insert order and line items atomically after all stock decrements succeed.

The current unit tests do not prove these invariants against a real database. PostgreSQL integration tests are therefore required before claiming the migration is complete.

## Migration boundary

The safest implementation is a clean PostgreSQL baseline generated from the converted Drizzle schema, with a documented migration marker that distinguishes it from the historical MySQL setup. Existing production data is not present in this session, so no production export/import can be performed or invented. A deterministic data migration utility should be provided for operators who have an existing MariaDB dataset, with per-entity row counts and relationship checks before and after import.

## Audit conclusion

The migration is feasible without redesigning the application. The highest-risk work is not the schema type conversion itself; it is replacing MySQL connection/result handling in `server/db.ts`, `server/commerce.ts`, `server/admin.ts`, and seed/migration scripts while proving PostgreSQL transaction, uniqueness, and concurrency semantics. Docker, CI, environment documentation, and staging readiness must all move together so PostgreSQL is the only configured relational backend.
