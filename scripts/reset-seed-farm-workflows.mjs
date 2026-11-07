import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const day = (offset) => `CURRENT_DATE - INTERVAL '${offset} days'`;

try {
  await pool.query("BEGIN");
  await pool.query("DELETE FROM pregnancy_checkups");
  await pool.query("DELETE FROM calving_outcomes");
  await pool.query("DELETE FROM calving_events");
  await pool.query("DELETE FROM breeding_records");

  const animals = await pool.query(`SELECT id, tag_number, sex, breed FROM livestock
    WHERE status = 'active' AND archived_at IS NULL
      AND ((sex = 'female' AND birth_date <= CURRENT_DATE - INTERVAL '18 months') OR sex = 'male')
    ORDER BY sex, id`);
  const dams = animals.rows.filter((animal) => animal.sex === "female");
  const sires = animals.rows.filter((animal) => animal.sex === "male");
  if (dams.length < 6 || sires.length < 2) throw new Error("Expected six farm dams and two farm sires were not found");

  for (const [index, dam] of dams.entries()) {
    const sire = sires[index % sires.length];
    const checkDueToday = index < 3;
    const calvingDueToday = index >= 3 && index < 6;
    const serviceOffset = checkDueToday ? 45 : 283;
    const serviceDate = day(serviceOffset);
    const expectedCalving = calvingDueToday ? "CURRENT_DATE" : `(${serviceDate} + INTERVAL '283 days')::date`;
    await pool.query(`INSERT INTO breeding_records (livestock_id,event_type,event_date,sire_id,pregnancy_status,expected_calving_date,details,performed_by)
      VALUES ($1,'heat_observed',(${serviceDate} - INTERVAL '1 day')::date,$2,NULL,NULL,$3,'Farm aide')`, [dam.id, sire.id, `Farm workflow · heat observed · ${dam.tag_number}`]);
    const service = await pool.query(`INSERT INTO breeding_records (livestock_id,event_type,event_date,sire_id,pregnancy_status,expected_calving_date,details,performed_by)
      VALUES ($1,'natural_service',${serviceDate},$2,'pending',${expectedCalving},$3,'Farm aide') RETURNING id`, [dam.id, sire.id, `Farm workflow · ${dam.tag_number} served by ${sire.tag_number}`]);
    if (calvingDueToday) await pool.query(`INSERT INTO breeding_records (livestock_id,event_type,event_date,sire_id,pregnancy_status,expected_calving_date,source_service_id,details,performed_by)
      VALUES ($1,'pregnancy_confirmed',(${serviceDate} + INTERVAL '45 days')::date,$2,'pregnant',CURRENT_DATE,$3,$4,'Farm veterinarian')`, [dam.id, sire.id, service.rows[0].id, `Farm workflow · confirmed pregnancy · ${dam.tag_number}`]);
  }

  const historyDam = dams[3];
  const historySire = sires[0];
  const oldService = await pool.query(`INSERT INTO breeding_records (livestock_id,event_type,event_date,sire_id,pregnancy_status,details,performed_by)
    VALUES ($1,'natural_service',CURRENT_DATE - INTERVAL '360 days',$2,'delivered','Farm workflow · historical service','Farm aide') RETURNING id`, [historyDam.id, historySire.id]);
  const confirmation = await pool.query(`INSERT INTO breeding_records (livestock_id,event_type,event_date,sire_id,pregnancy_status,source_service_id,details,performed_by)
    VALUES ($1,'pregnancy_confirmed',CURRENT_DATE - INTERVAL '315 days',$2,'pregnant',$3,'Farm workflow · historical confirmation','Farm veterinarian') RETURNING id`, [historyDam.id, historySire.id, oldService.rows[0].id]);
  const calving = await pool.query(`INSERT INTO breeding_records (livestock_id,event_type,event_date,sire_id,pregnancy_status,source_service_id,details,performed_by)
    VALUES ($1,'calving',CURRENT_DATE - INTERVAL '77 days',$2,'delivered',$3,'Farm workflow · historical calving','Farm aide') RETURNING id`, [historyDam.id, historySire.id, oldService.rows[0].id]);
  const event = await pool.query(`INSERT INTO calving_events (dam_id,pregnancy_confirmation_id,service_id,breeding_record_id,birth_date,performed_by,calving_difficulty,twins,notes)
    VALUES ($1,$2,$3,$4,CURRENT_DATE - INTERVAL '77 days','Farm aide','unassisted',FALSE,'Farm workflow · healthy calf') RETURNING id`, [historyDam.id, confirmation.rows[0].id, oldService.rows[0].id, calving.rows[0].id]);
  await pool.query(`INSERT INTO livestock (name,sex,breed,birth_date,birth_weight_kg,current_weight_kg,status,purchased,has_calved,sire_id,dam_id,birth_type,calf_vigor,calving_difficulty,health_status)
    VALUES ('MSU Farm Calf 001','female',$1,CURRENT_DATE - INTERVAL '77 days',36,95,'active',FALSE,FALSE,$2,$3,'single','vigorous','unassisted','good')`, [historyDam.breed, historySire.id, historyDam.id]);
  await pool.query("UPDATE livestock SET has_calved = TRUE WHERE id = $1", [historyDam.id]);
  await pool.query("COMMIT");
  console.log("Reset breeding and pregnancy workflows. Created 3 checks due today, 3 pregnancies calving today, and 1 calving history record using farm cattle.");
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
