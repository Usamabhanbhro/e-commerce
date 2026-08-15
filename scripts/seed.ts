import mysql from "mysql2/promise";
import "dotenv/config";
import { products } from "../client/src/lib/catalog";

const collectionNames = ["New Arrivals", "Signature", "Bags", "Objects", "Travel", "Textiles", "Studio", "Gifts"];
const catalog = Array.from({ length: 36 }, (_, index) => {
  const source = products[index % products.length];
  const id = index < products.length ? source.id : `seed-${String(index + 1).padStart(3, "0")}`;
  const slug = index < products.length ? source.slug : `${source.slug}-${index + 1}`;
  return { productKey: id, slug, name: index < products.length ? source.name : `${source.name} / Studio Edition ${index - products.length + 1}`, pricePkr: source.price, stock: 20, status: "active", payload: { ...source, id, slug, collection: collectionNames[index % collectionNames.length] } };
});

export async function seed() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for seeding.");
  const pool = mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 4 });
  try {
    for (const [index, name] of collectionNames.entries()) {
      await pool.query(`INSERT INTO catalog_collections (collectionKey, name, payload) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), payload=VALUES(payload)`, [name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, JSON.stringify({ position: index + 1 })]);
    }
    for (const item of catalog) {
      await pool.query(`INSERT INTO catalog_products (productKey, slug, name, pricePkr, stock, status, payload) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE slug=VALUES(slug), name=VALUES(name), pricePkr=VALUES(pricePkr), status=VALUES(status), payload=VALUES(payload)`, [item.productKey, item.slug, item.name, item.pricePkr, item.stock, item.status, JSON.stringify(item.payload)]);
    }
    console.log(JSON.stringify({ seededProducts: catalog.length, seededCollections: collectionNames.length }));
  } finally { await pool.end(); }
}

if (process.env.VITEST !== "true") seed().catch((error) => { console.error(error); process.exit(1); });
