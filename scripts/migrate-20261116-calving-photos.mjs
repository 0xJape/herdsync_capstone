import { readFile } from "node:fs/promises";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query(await readFile(new URL("../database/migrations/20261116_add_calving_photos.sql", import.meta.url), "utf8"));
  const { rows } = await client.query(`SELECT data_type, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'calving_events' AND column_name = 'photo_urls'`);
  console.log(rows[0] ?? "Column not found");
} finally {
  await client.end();
}
