# PostgreSQL Migration Plan

## Objective

Make PostgreSQL the only authoritative relational database for the application while preserving the existing API contracts, storefront behavior, Merchant CMS, authentication, RBAC, commerce state machines, storage adapter, Pages artifact, Docker runtime, and CI gates.

This is a dialect migration rather than an application rewrite. The logical domain model and public response shapes remain unchanged unless a compatibility issue is proven by tests.

## Decisions

| Decision | Choice | Reason |
| --- | --- | --- |
| PostgreSQL driver | `pg` with Drizzle’s `node-postgres` adapter | Keeps the existing Drizzle architecture and pool lifecycle while replacing the MySQL driver. |
| Connection source | `DATABASE_URL` only | Avoids hardcoded host, credentials, or database names; the same contract works locally, in CI, Docker, and staging. |
| Schema dialect | `drizzle-orm/pg-core` and `pgTable` | Makes PostgreSQL the source-of-truth schema and lets Drizzle generate reproducible PostgreSQL SQL. |
| Primary keys | PostgreSQL `serial`/identity-compatible integer keys where the current API expects numeric IDs | Preserves current ID shapes and avoids an unrelated UUID migration. |
| Money | Integer PKR fields | Preserves exact money semantics and avoids floating point. |
| JSON payloads | PostgreSQL `jsonb` for catalog, address, payment, webhook, and audit payloads | Preserves structured values while enabling PostgreSQL-native storage and future indexed queries. No frontend contract changes. |
| Dates | PostgreSQL timestamp columns with application-managed update timestamps | Avoids MySQL `ON UPDATE` behavior and makes update semantics explicit in code. |
| Uniqueness | Preserve current unique keys for user open IDs, slugs, order numbers, idempotency keys, webhook event IDs, cart lines, and wishlist lines | These constraints are part of the application’s integrity guarantees. |
| Foreign keys | Add only safe, justified references after checking existing data shape; do not invent cascade behavior that changes current semantics | The current schema has logical relationships but does not declare all FKs. Integrity improvements must not silently delete or reject existing records. |
| Migration history | New PostgreSQL baseline/migration directory generated from the converted schema, with the previous MySQL custom runner removed from runtime | Prevents ambiguous mixed-dialect history and makes a fresh PostgreSQL database reproducible. The baseline is documented as a dialect boundary. |
| Seed behavior | Deterministic PostgreSQL `ON CONFLICT DO UPDATE` upserts | Preserves repeatable demo/staging seed output without MySQL syntax. |
| Development fallback | In-memory demo state may remain only for explicitly non-production development/test flows, if existing tests require it | PostgreSQL remains authoritative in staging/production; no production fallback to memory is permitted. |
| Data migration | Provide a deterministic MariaDB-to-PostgreSQL export/import utility and verification report format, but do not fabricate production data | No production database is connected in this session. Operators can run the tool against their own source and target environments. |
| Local rehearsal | Replace MariaDB service with PostgreSQL and retain MinIO | Matches the target staging topology without connecting production resources. |
| CI | Add PostgreSQL service, migration, seed, integration, build, and security checks; remove MySQL URL injection | Prevents CI from silently validating the wrong dialect. |

## Implementation order

1. Convert the Drizzle schema and Drizzle Kit configuration.
2. Add PostgreSQL dependencies and replace the database pool/ping implementation.
3. Replace the custom MySQL migration runner with generated PostgreSQL migration artifacts and a safe migration command.
4. Rewrite seed upserts with PostgreSQL conflict handling.
5. Adapt commerce and admin result handling to PostgreSQL `returning()`/row-count semantics while preserving atomic transactions.
6. Add PostgreSQL integration tests for inventory reservation, payment failure release, idempotency, webhook replay, order transitions, and successful payment atomicity.
7. Add a deterministic data migration utility with entity row-count and relationship verification.
8. Replace Docker Compose database service, env examples, CI services, and staging documentation.
9. Run static checks, unit/integration tests, browser/visual tests, release scan, and PostgreSQL-backed migration/seed rehearsal.
10. Search the repository for obsolete MySQL/MariaDB runtime references and document any remaining historical references.

## Compatibility checklist

The migration is complete only when the following remain true:

- Existing routes and response shapes remain stable.
- The Admin CMS preserves OWNER/ADMIN/STAFF permissions and audit events.
- Stock never becomes negative under concurrent reservations.
- Failed/cancelled payments release inventory once.
- Repeated idempotency keys return the existing payment attempt.
- Replayed webhook event IDs do not duplicate state transitions.
- Invalid backward order/payment transitions remain rejected.
- Storage records and S3-compatible media behavior remain unchanged.
- GitHub Pages continues to build and deploy as a static frontend.
- Docker starts the API against PostgreSQL and MinIO with health checks.
- CI runs migrations and tests against PostgreSQL, never MariaDB/MySQL.
- No credentials are committed or exposed through `VITE_*` variables.

## Data migration boundary

No source MariaDB instance or production dataset is connected. Therefore this session can implement and test the import mechanism, but cannot report source-to-target row counts for real data. The import procedure must require explicit source and target connection strings, operate in a transaction where practical, preserve primary keys and timestamps, load parent tables before children, and emit counts for users, collections, products, orders, order items, payment attempts, webhook events, carts, wishlists, addresses, categories, promotions, banners, inventory adjustments, and audit events. It must fail on duplicate keys or relationship mismatches rather than silently dropping records.

## Exit criteria

The PostgreSQL migration will be considered implementation-complete when the repository’s source, generated migrations, local Docker topology, CI, documentation, and tests all point to PostgreSQL; hosted CI passes the build and database-backed validation gates; and the remaining limitation is only manual provisioning of an isolated external staging provider and credentials.
