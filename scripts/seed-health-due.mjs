import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const cattle = await pool.query("SELECT id, tag_number FROM livestock WHERE archived_at IS NULL ORDER BY id LIMIT 3");
  if (cattle.rowCount < 3) throw new Error("At least three active cattle are required");

  const samples = [
    [cattle.rows[0], "checkup", "Priority schedule demo", null, null, null, 1, null],
    [cattle.rows[1], "dewormer", "Deworming due demo", "Ivermectin", "1 mL/50 kg", "subcutaneous", 4, null],
    [cattle.rows[2], "antibiotics", "Medicine restriction demo", "Oxytetracycline", "10 mg/kg", "intramuscular", 2, 21],
  ];

  await pool.query("BEGIN");
  for (const [animal, type, diagnosis, medicine, dose, route, dueDays, withdrawalDays] of samples) {
    await pool.query(
      `INSERT INTO health_records (
        livestock_id, record_type, record_date, diagnosis, details, treatment,
        medication_name, dose, administration_route, treatment_start_date,
        treatment_end_date, withdrawal_end_date, next_due_date, veterinarian,
        follow_up_date, status
      )
      SELECT $1, $2::text, CURRENT_DATE - 1, $3, 'Sample data for Health priority schedule and medicine restrictions.',
        CASE WHEN $2::text = 'antibiotics' THEN 'Complete prescribed antimicrobial course.' ELSE NULL END,
        $4::text, $5::text, $6::text, CASE WHEN $4::text IS NULL THEN NULL ELSE CURRENT_DATE - 1 END,
        CASE WHEN $4::text IS NULL THEN NULL ELSE CURRENT_DATE + $7::int END,
        CASE WHEN $8::int IS NULL THEN NULL ELSE CURRENT_DATE + $8::int END,
        CURRENT_DATE + $7::int, 'Dr. Maria Santos', CURRENT_DATE + $7::int, 'open'
      WHERE NOT EXISTS (
        SELECT 1 FROM health_records
        WHERE livestock_id = $1 AND diagnosis = $3 AND archived_at IS NULL
      )`,
      [animal.id, type, diagnosis, medicine, dose, route, dueDays, withdrawalDays],
    );
  }
  await pool.query("COMMIT");
  console.log(`Seeded Health due samples for ${samples.map(([animal]) => animal.tag_number).join(", ")}.`);
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
