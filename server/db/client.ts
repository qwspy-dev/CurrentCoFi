import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

let database: NeonHttpDatabase<typeof schema> | undefined;

export function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  if (!database) database = drizzle(neon(connectionString), { schema });
  return database;
}

export async function pingDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return { configured: false, reachable: false };
  const sql = neon(connectionString);
  const startedAt = Date.now();
  await sql`select 1 as healthy`;
  return { configured: true, reachable: true, latencyMs: Date.now() - startedAt };
}
