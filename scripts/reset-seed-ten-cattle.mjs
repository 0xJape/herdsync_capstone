import pg from "pg";

if (!process.argv.includes("--confirm-reset=all-cattle-data")) throw new Error("Destructive reset refused. Pass --confirm-reset=all-cattle-data.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
const names = ["Agila", "Bagwis", "Kidlat", "Lakan", "Makisig", "Amihan", "Hiraya", "Ligaya", "Mayumi", "Tala", "Bituin", "Dalisay", "Luntian", "Marikit", "Siklab", "Habagat", "Kislap", "Mutya", "Salinlahi", "Yakap"];
const breeds = ["Brahman", "Angus", "Crossbreed", "Holstein"];
const markings = ["Silver gray with dark shoulders", "Solid black", "Red with white blaze", "Black and white", "Light gray with charcoal neck"];
const cattle = names.map((name, index) => {
  const male = index < 10;
  const year = 2019 + (index % 5);
  const month = String((index * 3) % 12 + 1).padStart(2, "0");
  const day = String((index * 7) % 25 + 1).padStart(2, "0");
  const acquisition = ["born_on_farm", "purchased", "donated", "transferred_in"][index % 4];
  return [name, male ? "male" : "female", breeds[index % breeds.length], `${year}-${month}-${day}`, 30 + index, male ? 610 + index * 13 : 430 + index * 9, markings[index % markings.length], acquisition, acquisition === "born_on_farm" ? null : "Regional Livestock Office", acquisition === "born_on_farm" ? null : `+63 917 210 ${1000 + index}`, acquisition === "born_on_farm" ? null : "Laguna", acquisition === "purchased" ? 90000 + index * 5000 : null, 3 + index % 2, `${male ? "Breeding sire" : "Breeding dam"}; sound gait, clear eyes, healthy coat; eligible for breeding.`];
});

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
  if (total !== 20 || sires !== 10 || dams !== 10) throw new Error(`Seed assertion failed: total=${total}, sires=${sires}, dams=${dams}`);
  await client.query("COMMIT");
  console.log("Reset complete: 10 eligible sires and 10 eligible dams created with distinct profiles.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
