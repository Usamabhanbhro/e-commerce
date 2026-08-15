# PostgreSQL data migration procedure

## Scope and boundary

The application now uses PostgreSQL as its sole authoritative relational database. No MariaDB/MySQL source database or production dataset is connected to this session, so this repository does not claim a source-to-target row-count result and does not invent one. The procedure below is the controlled path for an operator who has an existing legacy dataset and an approved maintenance window.

The application runtime contains no MariaDB/MySQL driver or fallback. Legacy extraction is an operator-side migration activity and must not be introduced into the deployed API image.

## Migration invariants

The migration must preserve logical primary keys, product keys and slugs, user identities, order numbers, monetary integers, timestamps normalized to UTC, JSON payloads, order-item relationships, payment idempotency keys, webhook event IDs, inventory quantities, promotion/banner records, and audit records. Monetary values remain integer PKR amounts; no floating-point conversion is permitted.

Load parent entities before children and run the destination migrations before importing rows:

| Order | Entity | Relationship reason |
| --- | --- | --- |
| 1 | `users` | Parent for orders, carts, wishlists, and addresses |
| 2 | `catalog_collections` | Independent catalog metadata |
| 3 | `catalog_products` | Parent for order items, carts, wishlists, and inventory adjustments |
| 4 | `admin_categories` | Independent CMS taxonomy |
| 5 | `admin_promotions` and `admin_banners` | Independent CMS merchandising data |
| 6 | `orders` | Parent for order items and payment attempts |
| 7 | `order_items` | References orders and catalog products |
| 8 | `payment_attempts` and `payment_webhook_events` | Preserve idempotency and replay keys |
| 9 | `saved_cart_lines`, `wishlist_items`, and `customer_addresses` | User-owned child records |
| 10 | `inventory_adjustments` and `admin_audit_events` | Operational history and audit trail |

## Controlled export/import sequence

1. Freeze writes to the source application, take an immutable source backup, record the source schema version, and capture a pre-migration count report for every entity in the table above. Retain the source backup until post-cutover verification is complete.
2. Provision an isolated PostgreSQL database and run `pnpm db:migrate` from the exact release commit. Never import into a production database during rehearsal.
3. Export source rows to a controlled CSV or JSONL staging artifact using the source operator’s approved database tooling. The artifact must use explicit column lists, preserve primary keys, encode JSON as valid JSON, convert booleans explicitly, and normalize timestamps to UTC. Do not use `SELECT *` or locale-dependent date/number formatting.
4. Validate the artifact before loading: reject duplicate primary keys, duplicate unique keys, nulls in required fields, malformed JSON, negative stock, negative monetary values, non-positive quantities, missing parent references, and unexpected enum-like status values.
5. Load each entity in the parent-first order above inside a destination transaction where practical. Use explicit column lists and `COPY`/parameterized inserts; never concatenate source values into SQL. Stop on the first constraint or relationship error rather than silently skipping rows.
6. Repair PostgreSQL sequences after importing explicit serial IDs. For each serial table, set its sequence to the greater of the current maximum ID and its existing sequence value, with an empty-table guard. This prevents the next application insert from colliding with migrated IDs.
7. Run the post-import report below and compare it with the immutable pre-migration report. Counts must match exactly for migrated entities, and every relationship query must return zero orphan rows.
8. Run `pnpm db:verify` against the imported PostgreSQL database. Exercise a read-only CMS smoke test, inventory reservation, failed-payment release, payment idempotency, webhook replay, and audit logging before reopening writes.

## Count and relationship report

Capture the source and destination counts using the same release-defined entity mapping. The operator should retain a report in the form:

| Entity | Source rows | PostgreSQL rows | Difference | Result |
| --- | ---: | ---: | ---: | --- |
| Users |  |  |  |  |
| Collections |  |  |  |  |
| Products |  |  |  |  |
| Categories |  |  |  |  |
| Promotions |  |  |  |  |
| Banners |  |  |  |  |
| Orders |  |  |  |  |
| Order items |  |  |  |  |
| Payment attempts |  |  |  |  |
| Webhook events |  |  |  |  |
| Saved cart lines |  |  |  |  |
| Wishlist items |  |  |  |  |
| Customer addresses |  |  |  |  |
| Inventory adjustments |  |  |  |  |
| Audit events |  |  |  |  |

The following destination checks must return zero rows before cutover:

```sql
SELECT oi."orderId", oi."productKey"
FROM "order_items" oi
LEFT JOIN "orders" o ON o."id" = oi."orderId"
LEFT JOIN "catalog_products" p ON p."productKey" = oi."productKey"
WHERE o."id" IS NULL OR p."productKey" IS NULL;

SELECT pa."orderId"
FROM "payment_attempts" pa
LEFT JOIN "orders" o ON o."id" = pa."orderId"
WHERE o."id" IS NULL;

SELECT sc."userId", sc."productKey"
FROM "saved_cart_lines" sc
LEFT JOIN "users" u ON u."id" = sc."userId"
LEFT JOIN "catalog_products" p ON p."productKey" = sc."productKey"
WHERE u."id" IS NULL OR p."productKey" IS NULL;

SELECT wi."userId", wi."productKey"
FROM "wishlist_items" wi
LEFT JOIN "users" u ON u."id" = wi."userId"
LEFT JOIN "catalog_products" p ON p."productKey" = wi."productKey"
WHERE u."id" IS NULL OR p."productKey" IS NULL;

SELECT ca."userId"
FROM "customer_addresses" ca
LEFT JOIN "users" u ON u."id" = ca."userId"
WHERE u."id" IS NULL;

SELECT ia."productKey"
FROM "inventory_adjustments" ia
LEFT JOIN "catalog_products" p ON p."productKey" = ia."productKey"
WHERE p."productKey" IS NULL;
```

## Sequence repair template

Run the following pattern for each serial table after explicit-ID import, adjusting the sequence name to the PostgreSQL-generated name in the target schema:

```sql
SELECT setval(
  pg_get_serial_sequence('public.orders', 'id'),
  GREATEST(COALESCE((SELECT MAX(id) FROM public.orders), 1), 1),
  COALESCE((SELECT MAX(id) FROM public.orders), 0) > 0
);
```

## Rollback and cutover

Do not delete the source database as part of migration. If counts, relationships, or behavioral checks fail, keep writes frozen, discard the incomplete target transaction/database, correct the transform, and repeat from the immutable source backup. After successful verification, switch the API `DATABASE_URL` to PostgreSQL, run the readiness check, monitor errors and constraint violations, and retain a documented rollback window to the source system. The deployed application itself must never contain a hidden MariaDB/MySQL fallback.
