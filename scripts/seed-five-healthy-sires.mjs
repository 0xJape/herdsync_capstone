import pg from "pg";

if (!process.argv.includes("--confirm-seed=five-healthy-sires")) throw new Error("Seed refused. Pass --confirm-seed=five-healthy-sires.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
const sires = [
  ["Makiling", "Brahman", "2018-05-14", 36, 702, "Silver gray coat, dark muzzle and shoulders", "Proven herd sire with calm handling temperament"],
  ["Taal", "Brahman", "2019-09-22", 35, 668, "Light gray coat with charcoal neck", "Strong frame and current breeding soundness assessment"],
  ["Apo", "Crossbreed", "2020-01-17", 34, 635, "Red coat with white underline", "Healthy young sire with balanced conformation"],
  ["Banahaw", "Brahman", "2017-12-03", 37, 724, "Gray coat, black muzzle, dark tail switch", "Mature sire with sound feet and normal libido"],
  ["Kanlaon", "Crossbreed", "2021-04-29", 32, 558, "Brindle coat with white forehead blaze", "Developing sire with excellent condition and normal testicular development"],
];

await client.connect();
try {
  await client.query("BEGIN");
  const actor = (await client.query("SELECT id FROM users WHERE active ORDER BY id LIMIT 1")).rows[0]?.id ?? null;
  for (const [name, breed, birthDate, birthWeight, weight, markings, notes] of sires) {
    const result = await client.query(`INSERT INTO livestock
      (name, sex, breed, birth_date, birth_weight_kg, current_weight_kg, color_markings, status, acquisition_type, acquisition_date, quarantine_status, purchased, has_calved, birth_type, calf_vigor, calving_difficulty, management_decision, vaccination_treatment_history, body_condition_score, health_status, physical_assessment_notes, notes)
      VALUES ($1,'male',$2,$3,$4,$5,$6,'active','born_on_farm',$3,'not_required',FALSE,FALSE,'single','vigorous','unassisted','Retain as eligible breeding sire',$7,4,'excellent',$8,$9) RETURNING id`,
      [name, breed, birthDate, birthWeight, weight, markings, "Core vaccinations current; routine deworming completed; no adverse treatment history.", `Complete physical examination for ${name}: normal vital signs, sound gait, clear eyes, healthy coat, normal appetite, scrotal development, and no signs of disease. Excellent body condition; ${notes}.`, notes]);
    const id = result.rows[0].id;
    await client.query("INSERT INTO weight_records (livestock_id, measured_at, weight_kg, notes, recorded_by, created_by_user_id) VALUES ($1,CURRENT_DATE - INTERVAL '1 month',$2,$3,$4,$5)", [id, weight - 15, "Routine calibrated-scale measurement; steady sire maintenance", "HerdSync veterinary team", actor]);
    await client.query("INSERT INTO weight_records (livestock_id, measured_at, weight_kg, notes, recorded_by, created_by_user_id) VALUES ($1,CURRENT_DATE,$2,$3,$4,$5)", [id, weight, "Routine calibrated-scale measurement; excellent maintenance", "HerdSync veterinary team", actor]);
    await client.query("INSERT INTO body_condition_records (livestock_id, measured_at, score, notes, recorded_by, created_by_user_id) VALUES ($1,CURRENT_DATE - INTERVAL '1 month',4,$2,$3,$4)", [id, "Hands-on assessment: excellent condition with adequate cover and strong muscling", "HerdSync veterinary team", actor]);
    await client.query("INSERT INTO body_condition_records (livestock_id, measured_at, score, notes, recorded_by, created_by_user_id) VALUES ($1,CURRENT_DATE,4,$2,$3,$4)", [id, "Hands-on assessment: excellent condition; suitable for breeding service", "HerdSync veterinary team", actor]);
    await client.query(`INSERT INTO health_records (livestock_id, record_type, record_date, diagnosis, details, treatment, next_due_date, veterinarian, status, created_by_user_id)
      VALUES ($1,'checkup',CURRENT_DATE,'Clinically healthy',$2,'Preventive herd health and breeding soundness examination',CURRENT_DATE + INTERVAL '6 months','HerdSync veterinary team','resolved',$3)`, [id, `Complete physical and breeding soundness examination for ${name}: normal vital signs, sound locomotion, clear eyes, healthy coat, normal appetite, and normal reproductive development. Eligible for breeding.`, actor]);
  }
  const check = await client.query("SELECT COUNT(*)::int AS total FROM livestock WHERE acquisition_type='born_on_farm' AND sex='male' AND health_status='excellent' AND body_condition_score=4 AND status='active'");
  if (check.rows[0].total !== 5) throw new Error(`Verification failed: ${check.rows[0].total} healthy sires found`);
  await client.query("COMMIT");
  console.log("Created 5 healthy, excellent-condition, born-on-farm breeding sires with complete records.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
