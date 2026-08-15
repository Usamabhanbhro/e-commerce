import "dotenv/config";
import path from "node:path";
import { migrate as migratePostgres } from "drizzle-orm/node-postgres/migrator";
import { closeDatabase, getDb } from "../server/db";

export async function migrate() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for PostgreSQL migrations.");
  const db = await getDb();
  if (!db) throw new Error("PostgreSQL database configuration is unavailable.");
  try {
    await migratePostgres(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle/migrations") });
    console.log(JSON.stringify({ migrated: true, dialect: "postgresql" }));
  } finally {
    await closeDatabase();
  }
}

if (process.env.VITEST !== "true") migrate().catch((error) => { console.error(error); process.exit(1); });
