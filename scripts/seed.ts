import { Pool } from "pg";
import "dotenv/config";
import { products } from "../client/src/lib/catalog";

const collectionNames = ["New Arrivals", "Signature", "Bags", "Objects", "Travel", "Textiles", "Studio", "Gifts"];
const catalog = Array.from({ length: 36 }, (_, index) => {
  const source = products[index % products.length];
  const id = index < products.length ? source.id : `seed-${String(index + 1).padStart(3, "0")}`;
  const slug = index < products.length ? source.slug : `${source.slug}-${index + 1}`;
  return { productKey: id, slug, name: index < products.length ? source.name : `${source.name} / Studio Edition ${index - products.length + 1}`, pricePkr: source.price, stock: 20, status: index < products.length ? "active" : "archived", payload: { ...source, id, slug, collection: index < products.length ? source.collection : collectionNames[index % collectionNames.length] } };
});

export async function seed() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for PostgreSQL seeding.");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
  const connection = await pool.connect();
  const resetInventory = process.env.SEED_RESET_INVENTORY === "true";
  try {
    await connection.query("BEGIN");
    for (const [index, name] of collectionNames.entries()) {
      await connection.query(
        `INSERT INTO "catalog_collections" ("collectionKey", "name", "payload") VALUES ($1, $2, $3::jsonb)
         ON CONFLICT ("collectionKey") DO UPDATE SET "name" = EXCLUDED."name", "payload" = EXCLUDED."payload", "updatedAt" = NOW()`,
        [name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, JSON.stringify({ position: index + 1 })],
      );
    }
    for (const item of catalog) {
      await connection.query(
        `INSERT INTO "catalog_products" ("productKey", "slug", "name", "pricePkr", "stock", "status", "payload") VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
         ON CONFLICT ("productKey") DO UPDATE SET "slug" = EXCLUDED."slug", "name" = EXCLUDED."name", "pricePkr" = EXCLUDED."pricePkr", "status" = EXCLUDED."status", "payload" = EXCLUDED."payload", "updatedAt" = NOW()${resetInventory ? ', "stock" = EXCLUDED."stock"' : ""}`,
        [item.productKey, item.slug, item.name, item.pricePkr, item.stock, item.status, JSON.stringify(item.payload)],
      );
    }
    await connection.query("COMMIT");
    console.log(JSON.stringify({ seededProducts: catalog.length, seededCollections: collectionNames.length, dialect: "postgresql", resetInventory }));
  } catch (error) {
    await connection.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

if (process.env.VITEST !== "true") seed().catch((error) => { console.error(error); process.exit(1); });
