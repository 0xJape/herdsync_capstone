import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const marker = "Demo pregnancy check due";

try {
  await pool.query("BEGIN");
  const animals = await pool.query(`SELECT id, tag_number, sex FROM livestock
    WHERE status = 'active' AND archived_at IS NULL
      AND ((sex = 'female' AND birth_date <= CURRENT_DATE - INTERVAL '18 months') OR sex = 'male')
    ORDER BY sex, id`);
  const dams = animals.rows.filter(({ sex }) => sex === "female").slice(0, 5);
  const sires = animals.rows.filter(({ sex }) => sex === "male").slice(0, 2);
  if (dams.length < 5 || !sires.length) throw new Error("Five adult active females and one active sire are required");

  let added = 0;
  for (const [index, dam] of dams.entries()) {
    const method = index % 2 === 0 ? "natural_service" : "artificial_insemination";
    const sire = method === "natural_service" ? sires[index % sires.length] : null;
    const serviceDate = new Date(Date.now() - 45 * 86_400_000).toISOString().slice(0, 10);
    const heatDate = new Date(Date.parse(`${serviceDate}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
    const exists = await pool.query("SELECT 1 FROM breeding_records WHERE livestock_id = $1 AND details LIKE $2 AND archived_at IS NULL", [dam.id, `${marker}%`]);
    if (exists.rowCount) continue;

    await pool.query("INSERT INTO breeding_records (livestock_id,event_type,event_date,details,performed_by) VALUES ($1,'heat_observed',$2,$3,'Demo farm aide')", [dam.id, heatDate, `${marker} · heat observed`]);
    await pool.query(`INSERT INTO breeding_records
      (livestock_id,event_type,event_date,sire_id,pregnancy_status,details,performed_by)
      VALUES ($1,$2,$3,$4,'pending',$5,'Demo farm aide')`,
      [dam.id, method, serviceDate, sire?.id ?? null, `${marker} · ${method === "natural_service" ? `sire ${sire.tag_number}` : "AI sire HS-AI-204"}`]);
    added++;
  }
  await pool.query("COMMIT");
  console.log(`Five due pregnancy-check samples ready (${added} added, ${5 - added} already present).`);
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
