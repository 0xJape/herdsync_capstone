import { readFile } from "node:fs/promises";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query("BEGIN");
  await client.query(await readFile(new URL("../database/migrations/20261114_veterinary_quarantine_clearance.sql", import.meta.url), "utf8"));
  await client.query("COMMIT");

  const { rows } = await client.query(`SELECT pg_get_constraintdef(oid) AS definition
    FROM pg_constraint WHERE conname = 'livestock_quarantine_status_check'`);
  console.log(rows[0]?.definition ?? "Constraint not found");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
