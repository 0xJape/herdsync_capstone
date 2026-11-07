import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const marker = "Demo eligible dam";

try {
  await pool.query("BEGIN");
  const dams = [
    ["2026-041", "Daisy", "Holstein", 3],
    ["2026-042", "Mabel", "Jersey", 3],
  ];

  for (const [tag, name, breed, score] of dams) {
    const existing = await pool.query("SELECT id FROM livestock WHERE tag_number = $1", [tag]);
    let id = existing.rows[0]?.id;
    if (!id) {
      const result = await pool.query(`INSERT INTO livestock
        (tag_number, name, sex, breed, birth_date, current_weight_kg, status, acquisition_type,
         acquisition_date, health_status, body_condition_score, physical_assessment_notes, notes)
        VALUES ($1, $2, 'female', $3, CURRENT_DATE - INTERVAL '3 years', 520, 'active', 'born_on_farm',
         CURRENT_DATE - INTERVAL '3 years', 'good', $4, $5, $5) RETURNING id`,
        [tag, name, breed, score, `${marker} · active heat demo`]);
      id = result.rows[0].id;
    } else {
      await pool.query(`UPDATE livestock SET sex = 'female', status = 'active', health_status = 'good',
        body_condition_score = $2, updated_at = NOW() WHERE id = $1`, [id, score]);
    }

    await pool.query(`INSERT INTO breeding_records (livestock_id, event_type, event_date, details, performed_by)
      SELECT $1, 'heat_observed', CURRENT_DATE, $2, 'Demo farm aide'
      WHERE NOT EXISTS (SELECT 1 FROM breeding_records WHERE livestock_id = $1 AND event_type = 'heat_observed'
        AND event_date = CURRENT_DATE AND archived_at IS NULL)`, [id, `${marker} · active heat observed`]);
  }
  await pool.query("COMMIT");
  console.log("Eligible demo dams ready: 2026-041 Daisy, 2026-042 Mabel.");
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
