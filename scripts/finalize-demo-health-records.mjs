import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  const result = await client.query(`UPDATE health_records
    SET status = 'resolved', follow_up_date = NULL, next_due_date = NULL, veterinarian = 'Jalel Prince', updated_at = NOW()
    WHERE archived_at IS NULL
      AND record_type = 'checkup'
    RETURNING id`);
  await client.query(`UPDATE health_records
    SET veterinarian = 'Jalel Prince', updated_at = NOW()
    WHERE archived_at IS NULL AND veterinarian = 'HerdSync veterinary team'`);
  await client.query("COMMIT");
  console.log(`Finalized ${result.rowCount} checkup records as completed and set administrator to Jalel Prince.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
