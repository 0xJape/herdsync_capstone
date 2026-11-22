import pg from "pg";

if (!process.argv.includes("--confirm=resolve-overdue-health")) throw new Error("Health update refused. Pass --confirm=resolve-overdue-health.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  const resolved = await client.query(`UPDATE health_records
    SET status = 'resolved', follow_up_date = NULL, updated_at = NOW()
    WHERE archived_at IS NULL
      AND (status = 'open' OR follow_up_date < CURRENT_DATE)
    RETURNING id`);
  const cleared = await client.query(`UPDATE health_records
    SET next_due_date = NULL, updated_at = NOW()
    WHERE archived_at IS NULL AND next_due_date < CURRENT_DATE
    RETURNING id`);
  const remaining = await client.query(`SELECT COUNT(*)::int count FROM health_records
    WHERE archived_at IS NULL
      AND (status = 'open' OR follow_up_date < CURRENT_DATE OR next_due_date < CURRENT_DATE)`);
  if (remaining.rows[0].count !== 0) throw new Error(`Overdue health records remain: ${remaining.rows[0].count}`);
  await client.query("COMMIT");
  console.log(`Resolved ${resolved.rowCount} open/overdue records and cleared ${cleared.rowCount} stale next-due dates. No overdue health records remain.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
