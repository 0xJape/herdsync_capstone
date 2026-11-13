import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const pregnantDays = [30, 60, 90, 110, 140, 175, 200, 225, 250, 275];

try {
  await pool.query("BEGIN");
  await pool.query("DELETE FROM pregnancy_checkups");
  await pool.query("DELETE FROM calving_outcomes");
  await pool.query("DELETE FROM calving_events");
  await pool.query("DELETE FROM breeding_records");

  const sire = await pool.query(`SELECT id, tag_number FROM livestock
    WHERE sex = 'male' AND status = 'active' AND archived_at IS NULL ORDER BY id LIMIT 1`);
  if (!sire.rows[0]) throw new Error("One active sire is required");

  async function upsertFemale(tag, name, breed, score) {
    const result = await pool.query(`INSERT INTO livestock
      (tag_number,name,sex,breed,birth_date,current_weight_kg,status,acquisition_type,acquisition_date,health_status,body_condition_score,physical_assessment_notes,notes)
      VALUES ($1,$2,'female',$3,CURRENT_DATE - INTERVAL '3 years',520,'active','born_on_farm',CURRENT_DATE - INTERVAL '3 years','good',$4,'Reproduction test cattle','Reproduction test cattle')
      ON CONFLICT (tag_number) DO UPDATE SET name=EXCLUDED.name,sex='female',breed=EXCLUDED.breed,birth_date=EXCLUDED.birth_date,
        current_weight_kg=EXCLUDED.current_weight_kg,status='active',archived_at=NULL,health_status='good',body_condition_score=EXCLUDED.body_condition_score,
        physical_assessment_notes=EXCLUDED.physical_assessment_notes,notes=EXCLUDED.notes,updated_at=NOW()
      RETURNING id`, [tag, name, breed, score]);
    return result.rows[0].id;
  }

  const breeds = ["Holstein", "Jersey", "Angus", "Hereford", "Simmental", "Brown Swiss", "Charolais", "Limousin", "Brahman", "Shorthorn"];
  for (let index = 0; index < 10; index++) {
    const number = String(index + 1).padStart(2, "0");
    const id = await upsertFemale(`2026-${8001 + index}`, `Eligible ${number}`, breeds[index], 3 + index % 2);
    await pool.query(`INSERT INTO breeding_records (livestock_id,event_type,event_date,details,performed_by)
      VALUES ($1,'heat_observed',CURRENT_DATE,$2,'Test farm aide')`, [id, `Reproduction test seed · eligible dam ${number}`]);
  }

  for (let index = 0; index < 10; index++) {
    const number = String(index + 1).padStart(2, "0");
    const id = await upsertFemale(`2026-${9001 + index}`, `Pregnant ${number}`, breeds[index], 3 + index % 2);
    const days = pregnantDays[index];
    const confirmationOffset = Math.min(45, days - 1);
    const service = await pool.query(`INSERT INTO breeding_records
      (livestock_id,event_type,event_date,sire_id,pregnancy_status,expected_calving_date,details,performed_by)
      VALUES ($1,'natural_service',CURRENT_DATE - $2::int,$3,'pending',CURRENT_DATE - $2::int + 283,$4,'Test farm aide') RETURNING id`,
      [id, days, sire.rows[0].id, `Reproduction test seed · service · day ${days}`]);
    await pool.query(`INSERT INTO breeding_records
      (livestock_id,event_type,event_date,sire_id,pregnancy_status,expected_calving_date,source_service_id,details,performed_by)
      VALUES ($1,'pregnancy_confirmed',CURRENT_DATE - $2::int + $3::int,$4,'pregnant',CURRENT_DATE - $2::int + 283,$5,$6,'Test veterinarian')`,
      [id, days, confirmationOffset, sire.rows[0].id, service.rows[0].id, `Reproduction test seed · confirmed · day ${days}`]);
    const confirmationDaysAgo = days - confirmationOffset;
    const checkupDaysAgo = [confirmationDaysAgo];
    for (let value = confirmationDaysAgo - 30; value > 0; value -= 30) checkupDaysAgo.push(value);
    if (!checkupDaysAgo.includes(0)) checkupDaysAgo.push(0);
    for (const daysAgo of checkupDaysAgo) {
      const gestationDays = days - daysAgo;
      await pool.query(`INSERT INTO pregnancy_checkups
        (livestock_id,service_id,checkup_date,gestation_month,health_status,body_condition_score,weight_kg,veterinarian,findings,next_checkup_date)
        VALUES ($1,$2,CURRENT_DATE - $3::int,LEAST(10,GREATEST(1,CEIL($4::numeric / 30)::int)),'good',$5,520,'Test veterinarian','Routine pregnancy check completed; dam and pregnancy progressing normally.',CURRENT_DATE - $3::int + 30)`,
        [id, service.rows[0].id, daysAgo, gestationDays, 3 + index % 2]);
    }
  }

  const verification = await pool.query(`WITH active AS (
      SELECT confirmation.livestock_id, service.event_date conception_date,
        CASE WHEN service.expected_calving_date > service.event_date THEN service.expected_calving_date ELSE service.event_date + 283 END expected_calving_date
      FROM breeding_records confirmation
      JOIN breeding_records service ON service.id = confirmation.source_service_id
      WHERE confirmation.event_type='pregnancy_confirmed' AND confirmation.pregnancy_status='pregnant' AND confirmation.archived_at IS NULL
    ), checkups AS (
      SELECT COUNT(DISTINCT service_id)::int completed_count FROM pregnancy_checkups
    ) SELECT COUNT(*)::int pregnant_count,
      COUNT(*) FILTER (WHERE expected_calving_date = conception_date + 283)::int valid_due_dates,
      MIN(CURRENT_DATE - conception_date)::int min_days,
      MAX(CURRENT_DATE - conception_date)::int max_days,
      checkups.completed_count FROM active CROSS JOIN checkups GROUP BY checkups.completed_count`);
  if (verification.rows[0].pregnant_count !== 10 || verification.rows[0].valid_due_dates !== 10 || verification.rows[0].completed_count !== 10) throw new Error(`Seed verification failed: ${JSON.stringify(verification.rows[0])}`);

  await pool.query("COMMIT");
  console.log(`Reset reproduction workflow. Seeded 10 eligible females and 10 linked pregnancies (days ${pregnantDays.join(", ")}) using sire ${sire.rows[0].tag_number}.`);
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
