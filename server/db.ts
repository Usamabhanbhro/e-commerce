import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../drizzle/schema";

let pool: Pool | null = null;
let db: NodePgDatabase<typeof schema> | null = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DB_POOL_SIZE ?? 10),
      keepAlive: true,
    });
  }
  return pool;
}

export async function getDb() {
  const activePool = getPool();
  if (!activePool) return null;
  if (!db) db = drizzle(activePool, { schema });
  return db;
}

export async function pingDatabase(): Promise<boolean> {
  const activePool = getPool();
  if (!activePool) return false;
  const connection = await activePool.connect();
  try {
    await connection.query("SELECT 1");
    return true;
  } finally {
    connection.release();
  }
}

export async function closeDatabase() {
  if (pool) await pool.end();
  pool = null;
  db = null;
}
