import pg from "pg";

if (!process.argv.includes("--confirm-clear=livestock")) throw new Error("Destructive reset refused. Pass --confirm-clear=livestock.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
const tables = [
  "alert_acknowledgements",
  "calf_care_plans",
  "pregnancy_checkups",
  "calving_outcomes",
  "calving_events",
  "health_records",
  "weight_records",
  "body_condition_records",
  "breeding_records",
  "activity_logs",
  "livestock",
];

await client.connect();
try {
  await client.query("BEGIN");
  for (const table of tables) await client.query(`DELETE FROM ${table}`);
  const result = await client.query("SELECT COUNT(*)::int AS total FROM livestock");
  if (result.rows[0].total !== 0) throw new Error(`Clear verification failed: ${result.rows[0].total} livestock records remain`);
  await client.query("COMMIT");
  console.log("Livestock demo data cleared.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}