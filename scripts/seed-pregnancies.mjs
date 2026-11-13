import pg from "pg";

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const marker = "Demo pregnancy seed";
const stages = [62, 142, 225];

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

  const dueMarker = "Demo due-today pregnancy";
  const dueExisting = await pool.query("SELECT COUNT(*)::int count FROM breeding_records WHERE details LIKE $1 AND archived_at IS NULL", [`${dueMarker}%`]);
  if (!dueExisting.rows[0].count) {
    const dams = await pool.query(`SELECT id FROM livestock WHERE sex='female' AND status='active' AND archived_at IS NULL ORDER BY id LIMIT 3`);
    const sire = await pool.query("SELECT id FROM livestock WHERE sex='male' AND status='active' AND archived_at IS NULL ORDER BY id LIMIT 1");
    if (dams.rows.length === 3 && sire.rows[0]) for (const dam of dams.rows) {
      const serviceDate = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
      const service = await pool.query("INSERT INTO breeding_records (livestock_id,event_type,event_date,sire_id,pregnancy_status,expected_calving_date,details,performed_by) VALUES ($1,'natural_service',$2,$3,'pending',$2,$4,'Demo farm aide') RETURNING id", [dam.id, serviceDate, sire.rows[0].id, `${dueMarker} · service`]);
    }
    console.log("Added three due-today demo pregnancies.");
  }

  const upcomingMarker = "Demo upcoming pregnancy check";
  const upcomingExisting = await pool.query("SELECT COUNT(*)::int count FROM breeding_records WHERE details LIKE $1 AND archived_at IS NULL", [`${upcomingMarker}%`]);
  if (!upcomingExisting.rows[0].count) {
    const dams = await pool.query(`SELECT id FROM livestock WHERE sex='female' AND status='active' AND archived_at IS NULL ORDER BY id OFFSET 3 LIMIT 3`);
    const sire = await pool.query("SELECT id FROM livestock WHERE sex='male' AND status='active' AND archived_at IS NULL ORDER BY id LIMIT 1");
    if (dams.rows.length === 3 && sire.rows[0]) for (const [index, dam] of dams.rows.entries()) {
      const serviceDate = new Date(Date.now() - (20 + index * 10) * 86400000).toISOString().slice(0, 10);
      const expectedCalving = new Date(Date.parse(`${serviceDate}T00:00:00Z`) + 283 * 86400000).toISOString().slice(0, 10);
      await pool.query("INSERT INTO breeding_records (livestock_id,event_type,event_date,sire_id,pregnancy_status,expected_calving_date,details,performed_by) VALUES ($1,'natural_service',$2,$3,'pending',$4,$5,'Demo farm aide')", [dam.id, serviceDate, sire.rows[0].id, expectedCalving, `${upcomingMarker} · service`]);
    }
    console.log("Added three upcoming demo pregnancies.");
  }

  const historyMarker = "Demo calving history";
  const historyExisting = await pool.query("SELECT COUNT(*)::int count FROM calving_events WHERE notes LIKE $1", [`${historyMarker}%`]);
  if (!historyExisting.rows[0].count) {
    const histories = await pool.query(`SELECT DISTINCT ON (confirmation.livestock_id)
      confirmation.id confirmation_id, confirmation.livestock_id dam_id, service.id service_id, service.sire_id, dam.breed
      FROM breeding_records confirmation
      JOIN livestock dam ON dam.id=confirmation.livestock_id
      JOIN LATERAL (SELECT id,sire_id FROM breeding_records WHERE livestock_id=confirmation.livestock_id AND event_type IN ('natural_service','artificial_insemination') AND event_date<=confirmation.event_date AND archived_at IS NULL ORDER BY event_date DESC,id DESC LIMIT 1) service ON TRUE
      WHERE confirmation.event_type='pregnancy_confirmed' AND confirmation.archived_at IS NULL
        AND confirmation.details LIKE $1 AND NOT EXISTS (SELECT 1 FROM calving_events e WHERE e.pregnancy_confirmation_id=confirmation.id)
      ORDER BY confirmation.livestock_id,confirmation.event_date DESC LIMIT 2`, [`${marker}%`]);
    for (const [index, item] of histories.rows.entries()) {
      const birthDate = new Date(Date.now() - (60 + index * 45) * 86400000).toISOString().slice(0, 10);
      const breeding = await pool.query("INSERT INTO breeding_records (livestock_id,event_type,event_date,sire_id,pregnancy_status,details,performed_by,source_service_id) VALUES ($1,'calving',$2,$3,'delivered',$4,'Demo farm aide',$5) RETURNING id", [item.dam_id, birthDate, item.sire_id, `${historyMarker} · healthy single calf`, item.service_id]);
      const event = await pool.query("INSERT INTO calving_events (dam_id,pregnancy_confirmation_id,service_id,breeding_record_id,birth_date,performed_by,calving_difficulty,twins,notes) VALUES ($1,$2,$3,$4,$5,'Demo farm aide','unassisted',FALSE,$6) RETURNING id", [item.dam_id, item.confirmation_id, item.service_id, breeding.rows[0].id, birthDate, `${historyMarker} · routine delivery`]);
      const calf = await pool.query("INSERT INTO livestock (name,sex,breed,birth_date,birth_weight_kg,current_weight_kg,status,purchased,has_calved,sire_id,dam_id,birth_type,calf_vigor,calving_difficulty,health_status) VALUES ($1,$2,$3,$4,$5,$5,'active',FALSE,FALSE,$6,$7,'single','vigorous','unassisted','good') RETURNING id", [`Demo Calf ${index + 1}`, index ? "female" : "male", item.breed, birthDate, 34 + index, item.sire_id, item.dam_id]);
      await pool.query("INSERT INTO calving_outcomes (calving_event_id,birth_order,outcome,livestock_id,name,sex,birth_weight_kg,calf_vigor,notes) VALUES ($1,1,'live',$2,$3,$4,$5,'vigorous','Healthy demo calf')", [event.rows[0].id, calf.rows[0].id, `Demo Calf ${index + 1}`, index ? "female" : "male", 34 + index]);
      await pool.query("UPDATE breeding_records SET pregnancy_status='delivered' WHERE id=$1", [item.confirmation_id]);
      await pool.query("UPDATE livestock SET has_calved=TRUE WHERE id=$1", [item.dam_id]);
    }
    console.log(`Added ${histories.rows.length} demo calving history records.`);
  }
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
