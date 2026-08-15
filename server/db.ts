import mysql from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema";

let pool: mysql.Pool | null = null;
let db: MySql2Database<typeof schema> | null = null;

export async function getDb() {
  if (!process.env.DATABASE_URL) return null;
  if (!db) {
    pool = mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: Number(process.env.DB_POOL_SIZE ?? 10), enableKeepAlive: true, waitForConnections: true });
    db = drizzle(pool, { schema, mode: "default" });
  }
  return db;
}

export async function pingDatabase(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try { await connection.query("SELECT 1"); return true; } finally { await connection.end(); }
}

export async function closeDatabase() {
  if (pool) await pool.end();
  pool = null;
  db = null;
}
