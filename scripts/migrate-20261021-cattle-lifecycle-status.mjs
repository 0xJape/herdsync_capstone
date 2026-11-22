import { readFile } from "node:fs/promises";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
try {
  await client.query(await readFile(new URL("../database/migrations/20261021_cattle_lifecycle_status.sql", import.meta.url), "utf8"));
  console.log("Cattle lifecycle status migration applied.");
} finally {
  await client.end();
}
