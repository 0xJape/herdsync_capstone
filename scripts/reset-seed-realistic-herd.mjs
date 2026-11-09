import pg from "pg";

const { Client } = pg;
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

if (!args.has("--confirm-reset=all-herd-operational-data")) {
  throw new Error("Whole-herd destructive reset refused. Re-run with --confirm-reset=all-herd-operational-data (optionally --dry-run).");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const client = new Client({ connectionString: process.env.DATABASE_URL });
const today = new Date();
const date = (daysAgo) => {
  const value = new Date(today);
  value.setUTCDate(value.getUTCDate() - daysAgo);
  return value.toISOString().slice(0, 10);
};
const forbidden = /demo|sample|test|seed|placeholder|fake|example/i;
const forbiddenFields = (row) => Object.values(row).filter((value) => typeof value === "string" && forbidden.test(value));

const herd = [
  { key: "bull1", name: "Makiling", sex: "male", breed: "Brahman", age: 1825, weight: 710, birthWeight: 36, bcs: 4, color: "Silver gray coat, dark muzzle and shoulders", acquisition: "purchased", seller: "Southern Valley Cattle Cooperative", price: 128000, notes: "Proven herd sire with calm handling temperament" },
  { key: "bull2", name: "Taal", sex: "male", breed: "Brahman", age: 1460, weight: 665, birthWeight: 35, bcs: 4, color: "Light gray coat with charcoal neck", acquisition: "purchased", seller: "Davao Genetic Stock Farm", price: 119000, notes: "Breeding soundness evaluation current" },
  { key: "bull3", name: "Apo", sex: "male", breed: "Crossbreed", age: 470, weight: 348, birthWeight: 34, bcs: 4, color: "Red coat with white underline", acquisition: "born_on_farm", notes: "Yearling bull retained for growth and soundness evaluation", sire: "bull1", dam: "cow1" },
  ...Array.from({ length: 10 }, (_, i) => ({ key: `cow${i + 1}`, name: ["Mayumi","Luningning","Marikit","Hiraya","Amihan","Tala","Ligaya","Dalisay","Mutya","Sinag"][i], sex: "female", breed: i < 6 ? "Brahman" : "Crossbreed", age: 1280 + i * 95, weight: 438 + i * 7, birthWeight: 31 + (i % 4), bcs: 3 + (i % 2), color: ["Gray with dark points","Red with white face","Light gray with black muzzle","Brindle with white underline"][i % 4], acquisition: i === 8 ? "purchased" : "born_on_farm", seller: i === 8 ? "Sarangani Cattle Growers Association" : null, price: i === 8 ? 73500 : null, notes: "Mature breeding cow; feet, udder, eyes, and dentition sound", hasCalved: true })),
  ...Array.from({ length: 7 }, (_, i) => ({ key: `heifer${i + 1}`, name: ["Bituin","Sampaguita","Habagat","Lakambini","Diwata","Liwayway","Ulan"][i], sex: "female", breed: i < 4 ? "Brahman" : "Crossbreed", age: 570 + i * 38, weight: 292 + i * 9, birthWeight: 30 + (i % 4), bcs: 4, color: ["Silver gray","Red with white socks","Gray with white forehead star"][i % 3], acquisition: "born_on_farm", notes: "Replacement heifer with normal growth and sound reproductive tract", sire: i < 4 ? "bull1" : "bull2", dam: `cow${(i % 7) + 1}` })),
  ...Array.from({ length: 5 }, (_, i) => ({ key: `calf${i + 1}`, name: ["Kidlat","Mithi","Lakas","Giliw","Siklab"][i], sex: i % 2 ? "female" : "male", breed: i < 3 ? "Brahman" : "Crossbreed", age: 42 + i * 29, weight: 71 + i * 18, birthWeight: 30 + i, bcs: 4, color: ["Red with white blaze","Light gray","Brindle with white tail switch"][i % 3], acquisition: "born_on_farm", notes: "Bright, alert calf with normal gait and age-appropriate growth", sire: i < 3 ? "bull1" : "bull2", dam: `cow${i + 1}` }))
];

if (herd.length !== 25 || herd.some((animal) => forbiddenFields(animal).length)) {
  throw new Error("Static herd definition failed count or prohibited-word validation");
}

const insertLivestock = `INSERT INTO livestock
  (name,sex,breed,birth_date,birth_weight_kg,current_weight_kg,color_markings,status,acquisition_date,acquisition_type,notes,purchased,has_calved,seller,seller_contact,seller_address,previous_farm,purchase_price,birth_type,calf_vigor,calving_difficulty,weaning_date,management_decision,vaccination_treatment_history,body_condition_score,health_status,physical_assessment_notes)
  VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,'excellent',$25) RETURNING id,tag_number`;

await client.connect();
try {
  await client.query("BEGIN");
  await client.query("SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE");

  const actorResult = await client.query("SELECT id, display_name, role FROM users WHERE active ORDER BY CASE role WHEN 'veterinarian' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, id LIMIT 1");
  const actor = actorResult.rows[0] ?? { id: null, role: null };
  const recorder = "Dr. Maria Santos";

  await client.query("DELETE FROM alert_acknowledgements");
  await client.query("DELETE FROM calf_care_plans");
  await client.query("DELETE FROM pregnancy_checkups");
  await client.query("DELETE FROM calving_outcomes");
  await client.query("DELETE FROM calving_events");
  await client.query("DELETE FROM health_records");
  await client.query("DELETE FROM weight_records");
  await client.query("DELETE FROM body_condition_records");
  await client.query("DELETE FROM breeding_records");
  await client.query("DELETE FROM activity_logs");
  await client.query("DELETE FROM livestock");

  const ids = new Map();
  for (const animal of herd) {
    const purchased = animal.acquisition === "purchased";
    const born = animal.acquisition === "born_on_farm";
    const result = await client.query(insertLivestock, [
      animal.name, animal.sex, animal.breed, date(animal.age), animal.birthWeight, animal.weight, animal.color,
      born ? date(animal.age) : date(Math.max(120, animal.age - 180)), animal.acquisition, animal.notes, purchased,
      animal.hasCalved ?? false, animal.seller ?? null, purchased ? "+63 917 555 0142" : null,
      purchased ? "SOCCSKSARGEN, Philippines" : null, purchased ? animal.seller : null, animal.price ?? null,
      "single", "vigorous", "unassisted", animal.age > 240 ? date(animal.age - 205) : null,
      animal.sex === "male" && animal.age > 730 ? "Retain as active herd sire" : animal.age < 500 ? "Continue growth monitoring" : "Retain in breeding herd",
      `Core clostridial vaccination current; deworming completed ${date(75)}; no adverse treatment reactions`, animal.bcs,
      "Normal temperature, respiration, appetite, gait, coat, eyes, and mucous membranes; no lesions or lameness"
    ]);
    ids.set(animal.key, result.rows[0]);
  }

  for (const animal of herd.filter((item) => item.sire || item.dam)) {
    await client.query("UPDATE livestock SET sire_id=$1, dam_id=$2 WHERE id=$3", [animal.sire ? ids.get(animal.sire).id : null, animal.dam ? ids.get(animal.dam).id : null, ids.get(animal.key).id]);
  }

  for (const animal of herd) {
    const id = ids.get(animal.key).id;
    const history = animal.age < 240
      ? [[Math.min(animal.age, 35), Math.max(animal.birthWeight + 16, animal.weight - 34)], [7, Math.max(animal.birthWeight + 25, animal.weight - 8)], [0, animal.weight]]
      : [[180, Math.round(animal.weight * 0.88)], [90, Math.round(animal.weight * 0.94)], [0, animal.weight]];
    for (const [daysAgo, weight] of history) {
      await client.query("INSERT INTO weight_records (livestock_id,measured_at,weight_kg,notes,recorded_by,created_by_user_id) VALUES ($1,$2,$3,$4,$5,$6)", [id, date(daysAgo), weight, "Routine calibrated-scale measurement; steady growth or maintenance trend", recorder, actor.id]);
    }
    for (const [daysAgo, score] of [[180, Math.max(3, animal.bcs - 1)], [60, animal.bcs], [0, animal.bcs]]) {
      await client.query("INSERT INTO body_condition_records (livestock_id,measured_at,score,notes,recorded_by,created_by_user_id) VALUES ($1,$2,$3,$4,$5,$6)", [id, date(Math.min(daysAgo, Math.max(0, animal.age - 1))), score, "Hands-on body condition assessment; nutrition appropriate for class", recorder, actor.id]);
    }
    const checkupAgo = Math.min(30, Math.max(1, animal.age - 1));
    const vaccinationAgo = Math.min(120, Math.max(1, animal.age - 2));
    await client.query(`INSERT INTO health_records (livestock_id,record_type,record_date,diagnosis,details,treatment,medication_name,dose,administration_route,treatment_start_date,treatment_end_date,withdrawal_end_date,next_due_date,veterinarian,status,created_by_user_id)
      VALUES ($1,'checkup',$2,'Clinically healthy','Full physical examination found normal vital signs, sound gait, clear eyes, healthy coat, and normal appetite','Preventive herd health examination',NULL,NULL,NULL,$2,$2,NULL,$3,$4,'resolved',$5)`, [id, date(checkupAgo), date(checkupAgo - 150), recorder, actor.id]);
    await client.query(`INSERT INTO health_records (livestock_id,record_type,record_date,diagnosis,details,treatment,medication_name,dose,administration_route,treatment_start_date,treatment_end_date,withdrawal_end_date,next_due_date,veterinarian,status,created_by_user_id)
      VALUES ($1,'vaccination',$2,'Preventive immunization','Routine clostridial vaccination; animal healthy before administration','Vaccination per manufacturer label','Clostridial vaccine','2 mL','subcutaneous',$2,$2,NULL,$3,$4,'resolved',$5)`, [id, date(vaccinationAgo), date(vaccinationAgo - 365), recorder, actor.id]);
  }

  const serviceIds = new Map();
  const breedingPlans = [
    { cow: "cow1", sire: "bull1", method: "natural_service", ago: herd.find((a) => a.key === "calf1").age + 283, outcome: "calved", calf: "calf1" },
    { cow: "cow2", sire: "bull1", method: "artificial_insemination", ago: herd.find((a) => a.key === "calf2").age + 283, outcome: "calved", calf: "calf2" },
    { cow: "cow3", sire: "bull1", method: "natural_service", ago: herd.find((a) => a.key === "calf3").age + 283, outcome: "calved", calf: "calf3" },
    { cow: "cow4", sire: "bull2", method: "artificial_insemination", ago: herd.find((a) => a.key === "calf4").age + 283, outcome: "calved", calf: "calf4" },
    { cow: "cow5", sire: "bull2", method: "natural_service", ago: herd.find((a) => a.key === "calf5").age + 283, outcome: "calved", calf: "calf5" },
    { cow: "cow6", sire: "bull1", method: "natural_service", ago: 225, outcome: "pregnant" },
    { cow: "cow7", sire: "bull2", method: "artificial_insemination", ago: 155, outcome: "pregnant" },
    { cow: "cow8", sire: "bull1", method: "natural_service", ago: 82, outcome: "pregnant" },
    { cow: "cow9", sire: "bull2", method: "artificial_insemination", ago: 48, outcome: "pending" }
  ];

  for (const plan of breedingPlans) {
    const cowId = ids.get(plan.cow).id;
    const sireId = ids.get(plan.sire).id;
    await client.query("INSERT INTO breeding_records (livestock_id,event_type,event_date,sire_id,details,performed_by,created_by_user_id) VALUES ($1,'heat_observed',$2,$3,$4,$5,$6)", [cowId, date(plan.ago + 1), sireId, "Standing heat observed with clear mucus and normal activity", recorder, actor.id]);
    const service = await client.query("INSERT INTO breeding_records (livestock_id,event_type,event_date,sire_id,pregnancy_status,expected_calving_date,details,performed_by,created_by_user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id", [cowId, plan.method, date(plan.ago), sireId, plan.outcome === "pending" ? "pending" : plan.outcome === "calved" ? "delivered" : "pregnant", date(plan.ago - 283), plan.method === "natural_service" ? "Observed controlled pasture service" : "Timed insemination using recorded sire genetics", recorder, actor.id]);
    serviceIds.set(plan.cow, service.rows[0].id);

    if (plan.outcome !== "pending") {
      const confirmation = await client.query("INSERT INTO breeding_records (livestock_id,event_type,event_date,sire_id,pregnancy_status,expected_calving_date,source_service_id,details,performed_by,created_by_user_id) VALUES ($1,'pregnancy_confirmed',$2,$3,'pregnant',$4,$5,$6,$7,$8) RETURNING id", [cowId, date(plan.ago - 46), sireId, date(plan.ago - 283), service.rows[0].id, "Pregnancy confirmed by reproductive examination", recorder, actor.id]);
      if (plan.outcome === "pregnant") {
        const months = Math.max(2, Math.floor(plan.ago / 30));
        for (let month = 2; month <= months; month += 2) {
          const checkAgo = plan.ago - month * 30;
          if (checkAgo < 0) continue;
          await client.query("INSERT INTO pregnancy_checkups (livestock_id,service_id,checkup_date,gestation_month,health_status,body_condition_score,weight_kg,veterinarian,findings,next_checkup_date,created_by_user_id) VALUES ($1,$2,$3,$4,'excellent',$5,$6,$7,$8,$9,$10)", [cowId, service.rows[0].id, date(checkAgo), month, 4.0, herd.find((a) => a.key === plan.cow).weight, recorder, "Pregnancy progressing normally; fetal development and dam condition appropriate", date(checkAgo - 30), actor.id]);
        }
      } else {
        const calf = herd.find((item) => item.key === plan.calf);
        const calvingRecord = await client.query("INSERT INTO breeding_records (livestock_id,event_type,event_date,sire_id,pregnancy_status,source_service_id,details,performed_by,created_by_user_id) VALUES ($1,'calving',$2,$3,'delivered',$4,$5,$6,$7) RETURNING id", [cowId, date(calf.age), sireId, service.rows[0].id, "Live single calf delivered at term; dam and calf healthy", recorder, actor.id]);
        const event = await client.query("INSERT INTO calving_events (dam_id,pregnancy_confirmation_id,service_id,breeding_record_id,birth_date,performed_by,calving_difficulty,twins,notes,created_by_user_id) VALUES ($1,$2,$3,$4,$5,$6,'unassisted',FALSE,$7,$8) RETURNING id", [cowId, confirmation.rows[0].id, service.rows[0].id, calvingRecord.rows[0].id, date(calf.age), recorder, "Normal presentation; calf stood and nursed promptly", actor.id]);
        await client.query("INSERT INTO calving_outcomes (calving_event_id,birth_order,outcome,livestock_id,name,sex,birth_weight_kg,calf_vigor,notes) VALUES ($1,1,'live',$2,$3,$4,$5,'vigorous',$6)", [event.rows[0].id, ids.get(plan.calf).id, calf.name, calf.sex, calf.birthWeight, "Normal neonatal assessment and maternal bonding"]);
      }
    }
  }

  for (let i = 1; i <= 5; i += 1) {
    const calf = herd.find((item) => item.key === `calf${i}`);
    await client.query("INSERT INTO calf_care_plans (livestock_id,care_type,due_date,status,notes,created_by_user_id,completed_at) VALUES ($1,'monthly_growth_check',$2,$3,$4,$5,$6)", [ids.get(`calf${i}`).id, date(calf.age - 30), calf.age > 30 ? "completed" : "pending", "Monthly weight, body condition, navel, gait, and nursing review", actor.id, calf.age > 30 ? new Date().toISOString() : null]);
    await client.query("INSERT INTO calf_care_plans (livestock_id,care_type,due_date,status,notes,created_by_user_id) VALUES ($1,'weaning_assessment',$2,'pending',$3,$4)", [ids.get(`calf${i}`).id, date(calf.age - 205), "Assess weight, forage intake, health, and dam separation readiness", actor.id]);
  }

  await client.query("INSERT INTO activity_logs (user_id,action,entity_type,title,detail,created_at) VALUES ($1,'created','livestock',$2,$3,NOW() - INTERVAL '2 days'),($1,'recorded','health_record',$4,$5,NOW() - INTERVAL '1 day'),($1,'recorded','breeding_record',$6,$7,NOW())", [actor.id, "Herd roster established", "Twenty-five active cattle reviewed and recorded", "Preventive health review completed", "Current herd examinations and immunization histories recorded", "Breeding calendar reviewed", "Services, pregnancies, checkups, and calving histories reconciled"]);

  const assertions = await client.query(`SELECT
    (SELECT COUNT(*) FROM livestock WHERE status='active' AND archived_at IS NULL)::int AS total,
    (SELECT COUNT(*) FROM livestock WHERE sex='male' AND birth_date <= CURRENT_DATE-INTERVAL '24 months')::int AS mature_bulls,
    (SELECT COUNT(*) FROM livestock WHERE sex='male' AND birth_date <= CURRENT_DATE-INTERVAL '12 months' AND birth_date > CURRENT_DATE-INTERVAL '24 months')::int AS young_bulls,
    (SELECT COUNT(*) FROM livestock WHERE sex='female' AND has_calved)::int AS cows,
    (SELECT COUNT(*) FROM livestock WHERE sex='female' AND NOT has_calved AND birth_date <= CURRENT_DATE-INTERVAL '12 months')::int AS heifers,
    (SELECT COUNT(*) FROM livestock WHERE birth_date > CURRENT_DATE-INTERVAL '12 months')::int AS calves,
    (SELECT COUNT(*) FROM livestock l WHERE (SELECT COUNT(*) FROM weight_records w WHERE w.livestock_id=l.id) < 2)::int AS missing_weights,
    (SELECT COUNT(*) FROM livestock l WHERE (SELECT COUNT(*) FROM body_condition_records b WHERE b.livestock_id=l.id) < 2)::int AS missing_bcs,
    (SELECT COUNT(*) FROM livestock WHERE health_status <> 'excellent' OR physical_assessment_notes IS NULL OR vaccination_treatment_history IS NULL)::int AS incomplete_health,
    (SELECT COUNT(*) FROM calving_outcomes WHERE outcome='live' AND livestock_id IS NOT NULL)::int AS live_births`);
  const a = assertions.rows[0];
  const expected = { total: 25, mature_bulls: 2, young_bulls: 1, cows: 10, heifers: 7, calves: 5, missing_weights: 0, missing_bcs: 0, incomplete_health: 0, live_births: 5 };
  for (const [key, value] of Object.entries(expected)) if (a[key] !== value) throw new Error(`Assertion failed: ${key} expected ${value}, received ${a[key]}`);

  const prohibited = await client.query(`SELECT COUNT(*)::int AS count FROM (
    SELECT row_to_json(l)::text value FROM livestock l UNION ALL SELECT row_to_json(h)::text FROM health_records h
    UNION ALL SELECT row_to_json(b)::text FROM breeding_records b UNION ALL SELECT row_to_json(c)::text FROM calf_care_plans c
    UNION ALL SELECT row_to_json(a)::text FROM activity_logs a WHERE a.entity_type IN ('livestock','health_record','breeding_record')
  ) inserted WHERE value ~* '(demo|sample|test|seed|placeholder|fake|example)'`);
  if (prohibited.rows[0].count !== 0) throw new Error(`Assertion failed: ${prohibited.rows[0].count} inserted rows contain prohibited words`);

  if (dryRun) {
    await client.query("ROLLBACK");
    console.log("Dry run passed all assertions; transaction rolled back. No data retained.");
  } else {
    await client.query("COMMIT");
    console.log("Realistic herd reset committed: 25 active cattle with linked operational history.");
  }
} catch (error) {
  try { await client.query("ROLLBACK"); } catch { /* connection may already be closed */ }
  throw error;
} finally {
  await client.end();
}
