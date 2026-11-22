import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const result = await client.query(`UPDATE health_records
    SET status = 'resolved', follow_up_date = NULL, updated_at = NOW()
    WHERE archived_at IS NULL AND status = 'open'
      AND follow_up_date IS NULL AND next_due_date IS NULL
      AND withdrawal_end_date IS NULL
    RETURNING id`);
  console.log(`Resolved ${result.rowCount} unscheduled health records.`);
} finally {
  await client.end();
}
