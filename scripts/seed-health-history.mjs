import pg from "pg";

if (!process.argv.includes("--confirm=replace-health-history")) throw new Error("Health history replacement refused. Pass --confirm=replace-health-history.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
const date = (daysAgo) => { const value = new Date(); value.setDate(value.getDate() - daysAgo); return value.toISOString().slice(0, 10); };
const future = (daysAhead) => date(-daysAhead);
const templates = [
  { type: "checkup", diagnosis: "Clinically healthy; normal temperature, appetite, rumen activity, respiration, hydration, gait, eyes, and coat", details: "Complete routine physical examination", treatment: "Preventive herd health examination", medication: null, dose: null, route: null, duration: 0, withdrawal: 0, due: null },
  { type: "vaccination", diagnosis: "Preventive immunization; afebrile before administration with no immediate adverse reaction", details: "Routine herd immunization", treatment: "FMD vaccination according to product label", medication: "FMD vaccine", dose: "2 mL", route: "intramuscular", duration: 0, withdrawal: 0, due: 90 },
  { type: "dewormer", diagnosis: "Routine gastrointestinal and external parasite control following body-condition and manure review", details: "Scheduled parasite control", treatment: "Weight-based anthelmintic administration", medication: "Ivermectin", dose: "1 mL per 50 kg body weight", route: "subcutaneous", duration: 0, withdrawal: 35, due: 120 },
  { type: "vitamins", diagnosis: "Preventive nutritional support; appetite and body condition remained normal", details: "Scheduled nutritional support", treatment: "Fat-soluble vitamin supplementation", medication: "Vitamin A, D & E", dose: "5 mL", route: "intramuscular", duration: 0, withdrawal: 0, due: 120 },
  { type: "antibiotics", diagnosis: "Localized superficial skin infection; mild swelling without fever or systemic signs", details: "Skin cleaned; response monitored", treatment: "Short-course antimicrobial treatment completed", medication: "Oxytetracycline", dose: "10 mg/kg body weight", route: "intramuscular", duration: 3, withdrawal: 28, due: null },
  { type: "anti_inflammatory", diagnosis: "Mild soft-tissue inflammation accompanying resolved superficial skin infection", details: "Pain and swelling management", treatment: "Anti-inflammatory treatment completed", medication: "Meloxicam", dose: "0.5 mg/kg body weight", route: "subcutaneous", duration: 2, withdrawal: 15, due: null },
  { type: "checkup", diagnosis: "Recovered; skin lesion healed, swelling resolved, normal temperature and appetite", details: "Post-treatment veterinary recheck", treatment: "No further treatment required", medication: null, dose: null, route: null, duration: 0, withdrawal: 0, due: null },
];

await client.connect();
try {
  await client.query("BEGIN");
  const cattle = await client.query("SELECT id, name, sex, current_weight_kg FROM livestock WHERE status = 'active' AND archived_at IS NULL ORDER BY id LIMIT 10");
  if (!cattle.rowCount) throw new Error("No active cattle found");
  const actor = await client.query("SELECT id FROM users WHERE role = 'admin' AND active ORDER BY id LIMIT 1");
  const actorId = actor.rows[0]?.id ?? null;
  await client.query("DELETE FROM alert_acknowledgements");
  await client.query("DELETE FROM health_records");

  for (let animalIndex = 0; animalIndex < cattle.rows.length; animalIndex++) {
    const animal = cattle.rows[animalIndex];
    for (let recordIndex = 0; recordIndex < templates.length; recordIndex++) {
      const item = templates[recordIndex];
      const daysAgo = 45 + ((animalIndex * 37 + recordIndex * 29) % 138);
      const recordDate = date(daysAgo);
      const nextDueDate = item.due ? future(3 + ((animalIndex * 5 + recordIndex * 3) % 25)) : null;
      const treatmentEndDate = date(daysAgo - item.duration);
      const withdrawalEndDate = item.withdrawal ? date(daysAgo - item.duration - item.withdrawal) : null;
      await client.query(`INSERT INTO health_records
        (livestock_id,record_type,record_date,diagnosis,details,treatment,medication_name,dose,administration_route,treatment_start_date,treatment_end_date,withdrawal_end_date,next_due_date,veterinarian,follow_up_date,status,created_by_user_id,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$3,$10,$11,$12,'Dr. Maria Santos',NULL,'resolved',$13,$3::date + TIME '09:00',$10::date + TIME '09:00')`,
      [animal.id, item.type, recordDate, item.diagnosis, item.details, item.treatment, item.medication, item.dose, item.route, treatmentEndDate, withdrawalEndDate, nextDueDate, actorId]);
    }
  }

  const verification = await client.query(`SELECT COUNT(*)::int total,
    COUNT(DISTINCT livestock_id)::int cattle,
    COUNT(*) FILTER (WHERE status = 'open' OR follow_up_date < CURRENT_DATE OR next_due_date < CURRENT_DATE OR withdrawal_end_date >= CURRENT_DATE)::int overdue_or_active
    FROM health_records WHERE archived_at IS NULL`);
  const counts = verification.rows[0];
  if (counts.total !== cattle.rowCount * templates.length || counts.cattle !== cattle.rowCount || counts.overdue_or_active !== 0) throw new Error(`Health seed verification failed: ${JSON.stringify(counts)}`);
  await client.query("COMMIT");
  console.log(`Health history seeded: ${counts.total} resolved records across ${counts.cattle} cattle; no overdue or active records.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
