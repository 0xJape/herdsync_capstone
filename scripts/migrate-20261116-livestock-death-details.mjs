import { readFile } from "node:fs/promises";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(await readFile(new URL("../database/migrations/20261116_add_livestock_death_details.sql", import.meta.url), "utf8"));
  const { rows } = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'livestock' AND column_name IN ('death_date', 'death_reason', 'death_photo_urls') ORDER BY column_name`);
  console.log(rows.map(({ column_name }) => column_name));
} finally {
  await client.end();
}
