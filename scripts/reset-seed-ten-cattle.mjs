import pg from "pg";

if (!process.argv.includes("--confirm-reset=all-cattle-data")) throw new Error("Destructive reset refused. Pass --confirm-reset=all-cattle-data.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
const cattle = [
  ["Agila", "male", "Brahman", "2021-02-14", 38, 735, "Silver gray with dark shoulders", "purchased", "Mindanao Brahman Genetics", "+63 917 210 1101", "Davao City", 142000, 5, "Proven sire; calm temperament and strong feet."],
  ["Bagwis", "male", "Angus", "2022-05-03", 35, 682, "Solid black", "purchased", "Bukidnon Angus Farm", "+63 918 320 2202", "Malaybalay City", 135000, 4, "High-growth sire with current breeding soundness exam."],
  ["Kidlat", "male", "Crossbreed", "2023-01-22", 34, 598, "Red with white blaze", "born_on_farm", null, null, null, null, 4, "Home-raised sire selected for growth and docility."],
  ["Lakan", "male", "Brahman", "2020-09-18", 39, 758, "Light gray with charcoal neck", "transferred_in", null, "+63 919 430 3303", "State Breeding Center, Laguna", null, 5, "Senior sire with balanced frame and proven fertility."],
  ["Makisig", "male", "Holstein", "2022-11-07", 37, 704, "Black and white", "donated", "University Dairy Program", "+63 920 540 4404", "Los Baños, Laguna", null, 4, "Dairy-line sire with sound legs and gentle handling behavior."],
  ["Amihan", "female", "Brahman", "2020-03-11", 32, 486, "Gray with black muzzle", "born_on_farm", null, null, null, null, 4, "Mature dam; three uncomplicated calvings."],
  ["Hiraya", "female", "Angus", "2021-07-26", 31, 512, "Solid black with forehead star", "purchased", "Northern Luzon Cattle Co-op", "+63 921 650 5505", "Nueva Ecija", 89000, 4, "Productive dam with strong maternal behavior."],
  ["Ligaya", "female", "Crossbreed", "2022-02-09", 30, 468, "Red with white face", "born_on_farm", null, null, null, null, 4, "Second-calving dam with consistent body condition."],
  ["Mayumi", "female", "Holstein", "2021-12-17", 33, 536, "Black and white", "transferred_in", null, "+63 922 760 6606", "Provincial Dairy Unit, Batangas", null, 3, "Dairy dam monitored for nutrition and hoof condition."],
  ["Tala", "female", "Brahman", "2023-04-05", 29, 421, "Light silver gray", "donated", "Regional Livestock Office", "+63 923 870 7707", "General Santos City", null, 4, "Young dam with one healthy calf and normal reproductive exam."],
];

await client.connect();
try {
  await client.query("BEGIN");
  await client.query("SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE");
  for (const table of ["alert_acknowledgements", "calf_care_plans", "pregnancy_checkups", "calving_outcomes", "calving_events", "health_records", "weight_records", "body_condition_records", "breeding_records", "activity_logs", "livestock"]) await client.query(`DELETE FROM ${table}`);

  for (const [name, sex, breed, birthDate, birthWeight, weight, markings, acquisition, source, contact, address, price, bcs, notes] of cattle) {
    const external = acquisition !== "born_on_farm";
    await client.query(`INSERT INTO livestock
      (name, sex, breed, birth_date, birth_weight_kg, current_weight_kg, color_markings, status, acquisition_type, acquisition_date, quarantine_status, purchased, has_calved, seller, seller_contact, seller_address, previous_farm, purchase_price, birth_type, calf_vigor, calving_difficulty, management_decision, vaccination_treatment_history, body_condition_score, health_status, physical_assessment_notes, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'single','vigorous','unassisted',$18,$19,$20,'excellent',$21,$22)`,
    [name, sex, breed, birthDate, birthWeight, weight, markings, acquisition, external ? "2026-10-15" : birthDate, external ? "active" : "not_required", acquisition === "purchased", sex === "female", source, contact, address, acquisition === "transferred_in" ? address : null, price, sex === "male" ? "Retain as herd sire" : "Retain as breeding dam", `Vaccinations current; dewormed 2026-09-20; individual record verified for ${name}.`, bcs, `Normal vital signs, sound gait, clear eyes, healthy coat; BCS ${bcs}/6.`, notes]);
  }

  const result = await client.query("SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE sex='male')::int sires, COUNT(*) FILTER (WHERE sex='female')::int dams FROM livestock");
  const { total, sires, dams } = result.rows[0];
  if (total !== 10 || sires !== 5 || dams !== 5) throw new Error(`Seed assertion failed: total=${total}, sires=${sires}, dams=${dams}`);
  await client.query("COMMIT");
  console.log("Reset complete: 5 sires and 5 dams created with distinct profiles.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
