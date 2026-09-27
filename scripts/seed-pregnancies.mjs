import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const marker = "Demo pregnancy seed";
const stages = [62, 142, 225, 274];

try {
  await pool.query("BEGIN");
  const existing = await pool.query("SELECT COUNT(*)::int count FROM breeding_records WHERE details LIKE $1 AND archived_at IS NULL", [`${marker}%`]);
  if (existing.rows[0].count) {
    await pool.query("ROLLBACK");
    console.log(`Pregnancy samples already exist (${existing.rows[0].count} records).`);
  } else {
    const females = await pool.query(`SELECT id, tag_number FROM livestock
      WHERE sex = 'female' AND status = 'active' AND archived_at IS NULL AND birth_date <= CURRENT_DATE - INTERVAL '18 months'
      ORDER BY id LIMIT $1`, [stages.length]);
    const sire = await pool.query("SELECT id, tag_number FROM livestock WHERE sex = 'male' AND status = 'active' AND archived_at IS NULL ORDER BY id LIMIT 1");
    if (females.rows.length < stages.length || !sire.rows[0]) throw new Error("Four adult active females and one active sire are required");

    for (const [index, dam] of females.rows.entries()) {
      const daysPregnant = stages[index];
      const serviceDate = new Date(Date.now() - daysPregnant * 86_400_000).toISOString().slice(0, 10);
      const heatDate = new Date(Date.parse(`${serviceDate}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
      const expectedCalving = new Date(Date.parse(`${serviceDate}T00:00:00Z`) + 283 * 86_400_000).toISOString().slice(0, 10);
      await pool.query("INSERT INTO breeding_records (livestock_id,event_type,event_date,details,performed_by) VALUES ($1,'heat_observed',$2,$3,'Demo farm aide')", [dam.id, heatDate, `${marker} · heat observed`]);
      await pool.query("INSERT INTO breeding_records (livestock_id,event_type,event_date,sire_id,pregnancy_status,expected_calving_date,details,performed_by) VALUES ($1,'natural_service',$2,$3,'pending',$4,$5,'Demo farm aide')", [dam.id, serviceDate, sire.rows[0].id, expectedCalving, `${marker} · natural service`]);
      const confirmationDate = new Date(Date.parse(`${serviceDate}T00:00:00Z`) + 45 * 86_400_000).toISOString().slice(0, 10);
      await pool.query("INSERT INTO breeding_records (livestock_id,event_type,event_date,sire_id,pregnancy_status,expected_calving_date,details,performed_by) VALUES ($1,'pregnancy_confirmed',$2,$3,'pregnant',$4,$5,'Dr. Demo Veterinarian')", [dam.id, confirmationDate, sire.rows[0].id, expectedCalving, `${marker} · confirmed pregnant`]);
    }
    await pool.query("COMMIT");
    console.log(`Seeded ${stages.length} confirmed pregnancies using sire ${sire.rows[0].tag_number}.`);
  }

  const services = await pool.query(`SELECT DISTINCT ON (livestock_id) id, livestock_id, event_date
    FROM breeding_records
    WHERE event_type = 'natural_service' AND details = $1 AND archived_at IS NULL
    ORDER BY livestock_id, event_date DESC, id DESC`, [`${marker} · natural service`]);
  let checkupCount = 0;
  for (const [index, service] of services.rows.entries()) {
    const serviceDate = service.event_date instanceof Date ? service.event_date.toISOString().slice(0, 10) : String(service.event_date).slice(0, 10);
    const elapsed = Math.floor((Date.now() - Date.parse(`${serviceDate}T00:00:00Z`)) / 86_400_000);
    for (let day = 45; day <= elapsed; day += 30) {
      const checkupDate = new Date(Date.parse(`${serviceDate}T00:00:00Z`) + day * 86_400_000).toISOString().slice(0, 10);
      const nextDate = new Date(Date.parse(`${checkupDate}T00:00:00Z`) + 30 * 86_400_000).toISOString().slice(0, 10);
      const month = Math.min(10, Math.ceil(day / 30));
      const bcs = Math.max(2.8, 3.6 - month * 0.05).toFixed(1);
      const weight = 430 + index * 24 + month * 3;
      const result = await pool.query(`INSERT INTO pregnancy_checkups
        (livestock_id,service_id,checkup_date,gestation_month,health_status,body_condition_score,weight_kg,veterinarian,findings,next_checkup_date)
        VALUES ($1,$2,$3,$4,'good',$5,$6,'Dr. Demo Veterinarian',$7,$8)
        ON CONFLICT (service_id,checkup_date) DO NOTHING`, [service.livestock_id, service.id, checkupDate, month, bcs, weight, `Routine month ${month} checkup. Pregnancy progressing normally; appetite and movement normal.`, nextDate]);
      checkupCount += result.rowCount;
    }
  }
  console.log(`Pregnancy checkups ready (${checkupCount} added).`);
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
