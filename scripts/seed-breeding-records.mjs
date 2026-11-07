import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const marker = "Demo breeding workspace";

try {
  await pool.query("BEGIN");
  const animals = await pool.query(`SELECT id, tag_number, sex FROM livestock
    WHERE status = 'active' AND archived_at IS NULL
      AND ((sex = 'female' AND birth_date <= CURRENT_DATE - INTERVAL '18 months') OR sex = 'male')
    ORDER BY sex, id`);
  const dams = animals.rows.filter(({ sex }) => sex === "female").slice(0, 5);
  const sires = animals.rows.filter(({ sex }) => sex === "male").slice(0, 2);
  if (dams.length < 3 || !sires.length) throw new Error("Three adult active females and one active sire are required");

  const samples = [
    { days: 12, method: "natural_service", outcome: null },
    { days: 38, method: "artificial_insemination", outcome: null },
    { days: 58, method: "natural_service", outcome: null },
    { days: 96, method: "natural_service", outcome: "pregnancy_confirmed" },
    { days: 74, method: "artificial_insemination", outcome: "pregnancy_negative" },
  ];

  let added = 0;
  for (const [index, sample] of samples.slice(0, dams.length).entries()) {
    const dam = dams[index];
    const sire = sample.method === "natural_service" ? sires[index % sires.length] : null;
    const serviceDate = new Date(Date.now() - sample.days * 86_400_000).toISOString().slice(0, 10);
    const heatDate = new Date(Date.parse(`${serviceDate}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
    const exists = await pool.query("SELECT 1 FROM breeding_records WHERE livestock_id = $1 AND details LIKE $2 AND archived_at IS NULL", [dam.id, `${marker}%`]);
    if (exists.rowCount) continue;

    await pool.query("INSERT INTO breeding_records (livestock_id,event_type,event_date,details,performed_by) VALUES ($1,'heat_observed',$2,$3,'Demo farm aide')", [dam.id, heatDate, `${marker} · heat observed`]);
    const service = await pool.query(`INSERT INTO breeding_records
      (livestock_id,event_type,event_date,sire_id,pregnancy_status,details,performed_by)
      VALUES ($1,$2,$3,$4,'pending',$5,'Demo farm aide') RETURNING id`,
      [dam.id, sample.method, serviceDate, sire?.id ?? null, `${marker} · ${sample.method === "natural_service" ? `sire ${sire.tag_number}` : "AI sire HS-AI-204"}`]);
    if (sample.outcome) {
      const outcomeDate = new Date(Date.parse(`${serviceDate}T00:00:00Z`) + 50 * 86_400_000).toISOString().slice(0, 10);
      await pool.query(`INSERT INTO breeding_records
        (livestock_id,event_type,event_date,sire_id,pregnancy_status,source_service_id,details,performed_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'Dr. Demo Veterinarian')`,
        [dam.id, sample.outcome, outcomeDate, sire?.id ?? null, sample.outcome === "pregnancy_confirmed" ? "pregnant" : "not_pregnant", service.rows[0].id, `${marker} · outcome`]);
    }
    added++;
  }
  await pool.query("COMMIT");
  console.log(`Breeding samples ready (${added} added, ${samples.length - added} already present or unavailable).`);
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
