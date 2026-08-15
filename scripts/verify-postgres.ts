import "dotenv/config";
import { Pool } from "pg";

const requiredTables = [
  "users",
  "catalog_collections",
  "catalog_products",
  "orders",
  "order_items",
  "payment_attempts",
  "payment_webhook_events",
  "saved_cart_lines",
  "wishlist_items",
  "customer_addresses",
  "admin_categories",
  "admin_promotions",
  "admin_banners",
  "inventory_adjustments",
  "admin_audit_events",
];

async function verify() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for PostgreSQL verification.");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  const connection = await pool.connect();
  try {
    const version = await connection.query<{ server_version: string }>("SELECT current_setting('server_version') AS server_version");
    const existing = await connection.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [requiredTables],
    );
    const existingNames = new Set(existing.rows.map((row) => row.table_name));
    const missing = requiredTables.filter((table) => !existingNames.has(table));
    if (missing.length) throw new Error(`Missing PostgreSQL tables: ${missing.join(", ")}`);

    const products = await connection.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM "catalog_products"');
    const collections = await connection.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM "catalog_collections"');
    if (Number(products.rows[0]?.count ?? 0) < 36) throw new Error("PostgreSQL catalog seed is incomplete: expected at least 36 products.");
    if (Number(collections.rows[0]?.count ?? 0) < 8) throw new Error("PostgreSQL catalog seed is incomplete: expected at least 8 collections.");

    const payload = await connection.query<{ payload: unknown }>('SELECT "payload" FROM "catalog_products" ORDER BY "productKey" LIMIT 1');
    if (!payload.rows[0] || typeof payload.rows[0].payload !== "object") throw new Error("Catalog JSONB payload was not returned as an object.");

    const product = await connection.query<{ productKey: string; stock: number }>('SELECT "productKey", "stock" FROM "catalog_products" ORDER BY "productKey" LIMIT 1');
    if (!product.rows[0]) throw new Error("No catalog product available for transaction verification.");
    const productKey = product.rows[0].productKey;
    const originalStock = product.rows[0].stock;
    await connection.query("BEGIN");
    await connection.query('UPDATE "catalog_products" SET "stock" = "stock" + 1 WHERE "productKey" = $1', [productKey]);
    await connection.query("ROLLBACK");
    const afterRollback = await connection.query<{ stock: number }>('SELECT "stock" FROM "catalog_products" WHERE "productKey" = $1', [productKey]);
    if (afterRollback.rows[0]?.stock !== originalStock) throw new Error("PostgreSQL transaction rollback did not restore stock.");

    const verifyTable = `"_pg_verify_stock_${process.pid}"`;
    await connection.query(`DROP TABLE IF EXISTS ${verifyTable}`);
    await connection.query(`CREATE TABLE ${verifyTable} ("id" integer PRIMARY KEY, "stock" integer NOT NULL)`);
    await connection.query(`INSERT INTO ${verifyTable} ("id", "stock") VALUES (1, 1)`);
    const contenderA = await pool.connect();
    const contenderB = await pool.connect();
    try {
      const reserve = async (client: typeof contenderA) => {
        await client.query("BEGIN");
        try {
          const result = await client.query(`UPDATE ${verifyTable} SET "stock" = "stock" - 1 WHERE "id" = 1 AND "stock" >= 1 RETURNING "stock"`);
          await client.query("COMMIT");
          return result.rowCount ?? 0;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      };
      const results = await Promise.all([reserve(contenderA), reserve(contenderB)]);
      if (results.reduce((sum, value) => sum + value, 0) !== 1) throw new Error(`Concurrent reservation check expected one winner, got ${results.join(",")}.`);
      const finalStock = await connection.query<{ stock: number }>(`SELECT "stock" FROM ${verifyTable} WHERE "id" = 1`);
      if (finalStock.rows[0]?.stock !== 0) throw new Error("Concurrent reservation check produced an invalid final stock value.");
    } finally {
      contenderA.release();
      contenderB.release();
      await connection.query(`DROP TABLE IF EXISTS ${verifyTable}`);
    }

    const uniqueIndexes = await connection.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = ANY($1::text[])`,
      [["users_openId_unique", "catalog_products_slug_unique", "orders_orderNumber_unique", "payment_attempts_idempotency_unique", "payment_webhook_events_event_unique", "saved_cart_line_unique", "wishlist_item_unique"]],
    );
    if (uniqueIndexes.rowCount !== 7) throw new Error(`Expected seven integrity indexes, found ${uniqueIndexes.rowCount ?? 0}.`);

    console.log(JSON.stringify({ dialect: "postgresql", serverVersion: version.rows[0]?.server_version, tables: requiredTables.length, products: Number(products.rows[0]?.count ?? 0), collections: Number(collections.rows[0]?.count ?? 0), transactionRollback: true, concurrentReservation: true, integrityIndexes: uniqueIndexes.rowCount }));
  } finally {
    connection.release();
    await pool.end();
  }
}

if (process.env.VITEST !== "true") verify().catch((error) => { console.error(error); process.exit(1); });
