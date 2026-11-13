import pg from "pg";

if (!process.argv.includes("--confirm-reset=all-livestock")) throw new Error("Destructive reset refused. Re-run with --confirm-reset=all-livestock.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
const cattle = [
  ...["Makiling", "Taal", "Apo", "Banahaw", "Mayon"].map((name, index) => ({ name, sex: "male", breed: index < 3 ? "Brahman" : "Angus", age: 1460 + index * 120, birthWeight: 34 + index, weight: 650 + index * 15, color: ["Silver gray with dark muzzle", "Light gray with charcoal neck", "Red with white underline", "Black with white forehead star", "Dark red with black points"][index] })),
  ...["Mayumi", "Hiraya", "Amihan", "Tala", "Ligaya"].map((name, index) => ({ name, sex: "female", breed: index < 3 ? "Brahman" : "Angus", age: 1280 + index * 110, birthWeight: 30 + index, weight: 470 + index * 10, color: ["Light gray with dark points", "Red with white face", "Silver gray", "Black with white underline", "Dark red with white socks"][index] })),
  { name: "Dalisay", sex: "female", breed: "Brahman", age: 2190, birthWeight: 31, weight: 485, color: "Gray with dark muzzle", status: "deceased", notes: "Historical profile retained after natural death." },
  { name: "Lakas", sex: "male", breed: "Angus", age: 1825, birthWeight: 36, weight: 690, color: "Solid black", status: "deceased", notes: "Historical profile retained after fatal illness." },
  { name: "Mutya", sex: "female", breed: "Brahman", age: 1640, birthWeight: 32, weight: 478, color: "Light gray with white forehead star", status: "sold", notes: "Sold to another breeding farm; profile retained for traceability." },
];

await client.connect();
try {
  await client.query("BEGIN");
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

  for (const animal of cattle) {
    await client.query(`INSERT INTO livestock
      (name,sex,breed,birth_date,birth_weight_kg,current_weight_kg,color_markings,status,acquisition_type,acquisition_date,health_status,body_condition_score,physical_assessment_notes,notes,purchased,has_calved,birth_type,calf_vigor,calving_difficulty,weaning_date,management_decision,vaccination_treatment_history)
      VALUES ($1,$2,$3,CURRENT_DATE - $4::int,$5,$6,$7,$12,'born_on_farm',CURRENT_DATE - $4::int,'good',3,$8,$9,FALSE,FALSE,'single','vigorous','unassisted',CURRENT_DATE - $4::int + 205,$10,$11)`,
    [animal.name, animal.sex, animal.breed, animal.age, animal.birthWeight, animal.weight, animal.color,
      "Normal temperature, appetite, gait, coat, eyes, feet, and reproductive soundness; no lesions or lameness observed.",
      animal.notes ?? "Foundation breeding stock maintained under routine farm management.",
      animal.sex === "male" ? "Retain as active herd sire" : "Retain as replacement breeding dam",
      "Core clostridial vaccination current; routine deworming completed; no adverse treatment reactions recorded.", animal.status ?? "active"]);
  }

  const result = await client.query(`SELECT COUNT(*)::int total,
    COUNT(*) FILTER (WHERE sex='male')::int sires,
    COUNT(*) FILTER (WHERE sex='female')::int dams,
    (SELECT COUNT(*)::int FROM breeding_records) breeding_records
    FROM livestock`);
  const counts = result.rows[0];
  if (counts.total !== 13 || counts.sires !== 6 || counts.dams !== 7 || counts.breeding_records !== 0) throw new Error(`Reset verification failed: ${JSON.stringify(counts)}`);

  await client.query("COMMIT");
  console.log(`Clean reset committed: ${counts.sires} sires, ${counts.dams} dams, ${counts.breeding_records} breeding records.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
