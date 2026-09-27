import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(`WITH ranked AS (SELECT id, row_number() OVER (ORDER BY id) n FROM livestock WHERE archived_at IS NULL)
    UPDATE livestock l SET created_at = make_date(2026, (4 + ((ranked.n - 1) % 6))::int, (5 + ((ranked.n - 1) % 20))::int), updated_at = NOW()
    FROM ranked WHERE l.id = ranked.id`);
  await pool.query(`INSERT INTO activity_logs (action, entity_type, title, detail, created_at)
    SELECT 'seed', 'system', 'Monthly farm activity · ' || m, 'Routine cattle management activity', make_date(2026, (3 + m)::int, 12)
    FROM generate_series(1, 6) m
    WHERE NOT EXISTS (SELECT 1 FROM activity_logs WHERE title = 'Monthly farm activity · ' || m)`);
  console.log("Populated dashboard chart history without changing cattle count.");
} finally { await pool.end(); }
