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

/**
 * Requests libpq semantics for `sslmode=require` in the connection string.
 * pg-connection-string currently treats `require` (and `prefer` and
 * `verify-ca`) as aliases for `verify-full`, which fails against the Supabase
 * pooler's certificate chain with SELF_SIGNED_CERT_IN_CHAIN. With this flag,
 * `require` means encrypted-but-unverified again, matching the behavior
 * Supabase's connection strings assume. Revisit with `sslmode=verify-full`
 * plus Supabase's root certificate when stricter verification is wanted.
 */
export function withLibpqSslCompat(url: string): string {
  if (/[?&]uselibpqcompat=/.test(url)) {
    return url;
  }
  return `${url}${url.includes("?") ? "&" : "?"}uselibpqcompat=true`;
}

function createDb(): NodePgDatabase<typeof schema> {
  if (!process.env.POSTGRES_URL) {
    throw new Error(
      "POSTGRES_URL is not set. Use the Supabase pooler connection string (see .env.example).",
    );
  }
  const pool = new Pool({
    connectionString: withLibpqSslCompat(process.env.POSTGRES_URL),
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
