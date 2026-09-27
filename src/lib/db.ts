import { Pool, types } from "pg";

types.setTypeParser(1082, (value) => value);

const globalForDb = globalThis as unknown as { herdSyncPool?: Pool };

export const db = globalForDb.herdSyncPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
});

if (process.env.NODE_ENV !== "production") globalForDb.herdSyncPool = db;
