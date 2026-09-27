import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const result = await pool.query(`
    UPDATE livestock
    SET
      body_condition_score = CASE
        WHEN tag_number IN ('MSU-C-003', 'MSU-C-006', 'MSU-B-002') THEN 4
        ELSE 3
      END,
      health_status = CASE
        WHEN tag_number = 'MSU-H-004' THEN 'fair'
        WHEN tag_number IN ('MSU-C-001', 'MSU-C-003', 'MSU-B-001') THEN 'excellent'
        ELSE 'good'
      END,
      updated_at = NOW()
    WHERE archived_at IS NULL
      AND tag_number ~ '^MSU-(B|YB|C|H)-[0-9]{3}$'
    RETURNING tag_number, sex, health_status, body_condition_score
  `);
  console.table(result.rows);
  console.log(`Updated ${result.rowCount} demo cattle profiles.`);
} finally {
  await pool.end();
}
