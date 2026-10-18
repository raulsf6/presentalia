import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

/**
 * Server-only Drizzle connection. Connects as the database owner, so every
 * user-facing read and write must be authorized in server code before it uses
 * this connection. Never import it into a client component.
 *
 * Lazy on purpose: Next builds import route modules before env vars are
 * guaranteed, and no query runs at import time.
 */
declare global {
  var __presentaliaDb: NodePgDatabase<typeof schema> | undefined;
}

function createDb(): NodePgDatabase<typeof schema> {
  if (!process.env.POSTGRES_URL) {
    throw new Error(
      "POSTGRES_URL is not set. Use the Supabase pooler connection string (see .env.example).",
    );
  }
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    max: 10,
  });
  return drizzle(pool, { schema });
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!globalThis.__presentaliaDb) {
    globalThis.__presentaliaDb = createDb();
  }
  return globalThis.__presentaliaDb;
}

export type Db = NodePgDatabase<typeof schema>;
export type DbTx = Parameters<
  Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]
>[0];
export { schema };
