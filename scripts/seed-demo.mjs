import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const herd = [
  ["MSU-B-001", "Bantay", "male", "Brahman", "Bull"], ["MSU-B-002", "Kidlat", "male", "Brahman", "Bull"], ["MSU-YB-001", "Atlas", "male", "Simmental", "Yearling bull"],
  ["MSU-C-001", "Amihan", "female", "Brahman", "Cow"], ["MSU-C-002", "Dalisay", "female", "Brahman", "Cow"], ["MSU-C-003", "Hiraya", "female", "Holstein", "Cow"], ["MSU-C-004", "Luntian", "female", "Brahman", "Cow"], ["MSU-C-005", "Maya", "female", "Simmental", "Cow"], ["MSU-C-006", "Narra", "female", "Brahman", "Cow"], ["MSU-C-007", "Sinta", "female", "Holstein", "Cow"], ["MSU-C-008", "Tala", "female", "Brahman", "Cow"], ["MSU-C-009", "Ulila", "female", "Simmental", "Cow"], ["MSU-C-010", "Yumi", "female", "Brahman", "Cow"], ["MSU-C-011", "Zena", "female", "Holstein", "Cow"],
  ["MSU-H-001", "Bituin", "female", "Brahman", "Heifer"], ["MSU-H-002", "Cora", "female", "Simmental", "Heifer"], ["MSU-H-003", "Diwa", "female", "Brahman", "Heifer"], ["MSU-H-004", "Eden", "female", "Holstein", "Heifer"], ["MSU-H-005", "Fiona", "female", "Brahman", "Heifer"], ["MSU-H-006", "Ganda", "female", "Simmental", "Heifer"], ["MSU-H-007", "Hana", "female", "Brahman", "Heifer"], ["MSU-H-008", "Isla", "female", "Holstein", "Heifer"],
  ["MSU-K-001", "Jasmin", "female", "Brahman", "Calf"], ["MSU-K-002", "Kiko", "male", "Brahman", "Calf"], ["MSU-K-003", "Luna", "female", "Simmental", "Calf"],
];

try {
  await pool.query("BEGIN");
  const existing = await pool.query("SELECT COUNT(*)::int AS count FROM livestock WHERE archived_at IS NULL");
  if (existing.rows[0].count !== 0) throw new Error(`Refusing to seed: ${existing.rows[0].count} active cattle already exist`);

  for (const [index, [tag, name, sex, breed, category]] of herd.entries()) {
    const createdAt = new Date(Date.UTC(2026, 3 + (index % 6), 5 + index)).toISOString();
    await pool.query("INSERT INTO livestock (tag_number, name, sex, breed, birth_date, current_weight_kg, acquisition_date, created_at, updated_at, notes) VALUES ($1, $2, $3, $4, CURRENT_DATE - ($5 || ' days')::interval, $6, CURRENT_DATE - interval '2 years', $7, $7, $8)", [tag, name, sex, breed, category === "Calf" ? 220 : category === "Heifer" ? 700 : category === "Yearling bull" ? 500 : 1300, category === "Calf" ? 120 : category === "Heifer" || category === "Yearling bull" ? 280 : 430, createdAt, `Demo record · ${category}`]);
  }

  const cattle = await pool.query("SELECT id, tag_number FROM livestock ORDER BY id");
  const byTag = Object.fromEntries(cattle.rows.map((row) => [row.tag_number, row.id]));
  const health = [
    ["MSU-C-001", "Vaccination", "Routine vaccination completed", "Annual preventive vaccination", "2026-09-08", "2026-10-08", "resolved"],
    ["MSU-C-003", "Health assessment", "Good condition", "Routine monthly assessment", "2026-09-06", null, "resolved"],
    ["MSU-C-006", "Deworming", "Follow-up due", "Deworming treatment recorded", "2026-09-04", "2026-09-12", "open"],
    ["MSU-H-004", "Health assessment", "Attention Needed", "Monitor appetite and activity", "2026-09-05", "2026-09-10", "open"],
    ["MSU-K-002", "Vaccination", "Calf vaccination", "Initial calf preventive care", "2026-09-07", "2026-10-07", "open"],
  ];
  for (const [tag, type, diagnosis, details, date, followUp, status] of health) {
    await pool.query("INSERT INTO health_records (livestock_id, record_type, record_date, diagnosis, details, veterinarian, follow_up_date, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $3, $3)", [byTag[tag], type, date, diagnosis, details, "Dr. Maria Santos", followUp, status]);
  }
  for (let month = 0; month < 6; month++) {
    await pool.query("INSERT INTO activity_logs (action, entity_type, title, detail, created_at) VALUES ('seed', 'system', $1, $2, make_date(2026, $3, 12))", [`Monthly farm activity · ${month + 1}`, "Routine cattle management activity", 4 + month]);
  }
  await pool.query("INSERT INTO activity_logs (action, entity_type, title, detail) VALUES ('seed', 'system', 'Demo herd loaded', '25 sample cattle records, five health records, and dashboard activity created')");
  await pool.query("COMMIT");
  console.log("Seeded 25 cattle and sample health/activity data.");
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
