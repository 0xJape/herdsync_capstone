import fs from "node:fs";
import pg from "pg";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const connectionString = process.env.DATABASE_URL ?? env.match(/^DATABASE_URL=(.*)$/m)?.[1].trim().replace(/^['"]|['"]$/g, "");
if (!connectionString) throw new Error("DATABASE_URL is missing");
const pool = new pg.Pool({ connectionString });
try {
  await pool.query("ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE SET NULL");
  await pool.query("CREATE INDEX IF NOT EXISTS activity_logs_user_id_idx ON activity_logs(user_id)");
  console.log("Audit schema ready");
} finally {
  await pool.end();
}
