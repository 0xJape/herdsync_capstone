import pg from "pg";

if (!process.argv.includes("--confirm-seed=five-healthy-dams")) throw new Error("Seed refused. Pass --confirm-seed=five-healthy-dams.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
const today = new Date();
const date = (yearsAgo, monthsAgo = 0) => {
  const value = new Date(today);
  value.setUTCFullYear(value.getUTCFullYear() - yearsAgo);
  value.setUTCMonth(value.getUTCMonth() - monthsAgo);
  return value.toISOString().slice(0, 10);
};
const cattle = [
  ["Mayumi", "Brahman", "2019-03-18", 34, 486, "Silver gray coat, dark points, black muzzle", "Calm mature dam with sound feet and udder"],
  ["Luningning", "Brahman", "2020-07-06", 32, 472, "Light gray coat, charcoal neck, dark tail switch", "Proven dam with normal reproductive history"],
  ["Marikit", "Brahman", "2018-11-24", 35, 505, "Gray coat with dark shoulders and black muzzle", "Experienced dam with strong maternal behavior"],
  ["Hiraya", "Crossbreed", "2021-02-12", 31, 451, "Red coat, white forehead blaze, white underline", "Young healthy dam with balanced conformation"],
  ["Amihan", "Crossbreed", "2020-10-30", 33, 468, "Brindle coat, white face, dark muzzle", "Healthy dam retained for the breeding herd"],
];

await client.connect();
try {
  await client.query("BEGIN");
  const actor = (await client.query("SELECT id FROM users WHERE active ORDER BY id LIMIT 1")).rows[0]?.id ?? null;
  for (const [name, breed, birthDate, birthWeight, weight, markings, notes] of cattle) {
    const result = await client.query(`INSERT INTO livestock
      (name, sex, breed, birth_date, birth_weight_kg, current_weight_kg, color_markings, status, acquisition_type, acquisition_date, quarantine_status, purchased, has_calved, birth_type, calf_vigor, calving_difficulty, management_decision, vaccination_treatment_history, body_condition_score, health_status, physical_assessment_notes, notes)
      VALUES ($1,'female',$2,$3,$4,$5,$6,'active','born_on_farm',$3,'not_required',FALSE,TRUE,'single','vigorous','unassisted','Retain as healthy breeding dam',$7,4,'excellent',$8,$9) RETURNING id`,
      [name, breed, birthDate, birthWeight, weight, markings, `Core vaccinations current; routine deworming completed; no adverse treatment history.`, `Normal temperature, respiration, appetite, gait, eyes, coat, udder, feet, and mucous membranes. Excellent body condition; ${notes}.`, notes]);
    const id = result.rows[0].id;
    await client.query("INSERT INTO weight_records (livestock_id, measured_at, weight_kg, notes, recorded_by, created_by_user_id) VALUES ($1,$2,$3,$4,$5,$6)", [id, date(0, 1), weight - 12, "Routine calibrated-scale measurement; stable adult dam weight", "HerdSync veterinary team", actor]);
    await client.query("INSERT INTO weight_records (livestock_id, measured_at, weight_kg, notes, recorded_by, created_by_user_id) VALUES ($1,CURRENT_DATE,$2,$3,$4,$5)", [id, weight, "Routine calibrated-scale measurement; excellent maintenance", "HerdSync veterinary team", actor]);
    await client.query("INSERT INTO body_condition_records (livestock_id, measured_at, score, notes, recorded_by, created_by_user_id) VALUES ($1,$2,4,$3,$4,$5)", [id, date(0, 1), "Hands-on assessment: excellent condition with adequate cover and no excessive fat", "HerdSync veterinary team", actor]);
    await client.query("INSERT INTO body_condition_records (livestock_id, measured_at, score, notes, recorded_by, created_by_user_id) VALUES ($1,CURRENT_DATE,4,$2,$3,$4)", [id, "Hands-on assessment: excellent condition; suitable for breeding and lactation", "HerdSync veterinary team", actor]);
    await client.query(`INSERT INTO health_records (livestock_id, record_type, record_date, diagnosis, details, treatment, next_due_date, veterinarian, status, created_by_user_id)
      VALUES ($1,'checkup',CURRENT_DATE,'Clinically healthy',$2,'Preventive herd health examination',CURRENT_DATE + INTERVAL '6 months','HerdSync veterinary team','resolved',$3)`, [id, `Complete physical examination for ${name}: normal vital signs, sound locomotion, clear eyes, healthy coat, normal appetite, clean udder, and no signs of disease.`, actor]);
  }
  const check = await client.query("SELECT COUNT(*)::int AS total FROM livestock WHERE acquisition_type='born_on_farm' AND sex='female' AND health_status='excellent' AND body_condition_score=4 AND status='active'");
  if (check.rows[0].total !== 5) throw new Error(`Verification failed: ${check.rows[0].total} healthy dams found`);
  await client.query("COMMIT");
  console.log("Created 5 healthy, excellent-condition, born-on-farm dams with complete records.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
