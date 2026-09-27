import assert from "node:assert/strict";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows: [result] } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE h.status = 'resolved' AND h.follow_up_date IS NOT NULL)::int AS resolved_with_follow_up,
      COUNT(*) FILTER (WHERE h.status = 'open' AND h.record_type IN ('illness', 'injury', 'treatment', 'antibiotics', 'anti_inflammatory') AND l.health_status IN ('excellent', 'good'))::int AS open_clinical_marked_healthy,
      COUNT(*) FILTER (WHERE h.source_health_record_id IS NOT NULL AND source.id IS NULL)::int AS broken_source_links,
      COUNT(*) FILTER (WHERE l.archived_at IS NOT NULL AND h.withdrawal_end_date >= l.archived_at::date)::int AS archived_during_withdrawal
    FROM health_records h
    JOIN livestock l ON l.id = h.livestock_id
    LEFT JOIN health_records source ON source.id = h.source_health_record_id
    WHERE h.archived_at IS NULL
  `);
  assert.equal(result.resolved_with_follow_up, 0, "Resolved records must not retain clinical follow-ups");
  assert.equal(result.open_clinical_marked_healthy, 0, "Open clinical records must affect current cattle health");
  assert.equal(result.broken_source_links, 0, "Health source links must resolve to existing records");
  assert.equal(result.archived_during_withdrawal, 0, "Cattle must not be archived during an active withdrawal");
  console.log("Connected health invariants pass.");
} finally {
  await client.end();
}
