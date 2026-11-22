import pg from "pg";

if (!process.argv.includes("--confirm=seed-father-daughter-cattle")) throw new Error("Seed refused. Pass --confirm=seed-father-daughter-cattle.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  const upsert = async (tag, name, sex, birthDate, weight) => (await client.query(`
    INSERT INTO livestock
      (tag_number,name,sex,breed,birth_date,birth_weight_kg,current_weight_kg,color_markings,status,
       acquisition_type,acquisition_date,quarantine_status,purchased,has_calved,birth_type,calf_vigor,
       calving_difficulty,management_decision,vaccination_treatment_history,body_condition_score,
       health_status,physical_assessment_notes,notes)
    VALUES ($1,$2,$3,'Brahman',$4,32,$5,'Father-daughter lineage demo','active','born_on_farm',$4,
      'not_required',FALSE,FALSE,'single','vigorous','unassisted','Lineage restriction demo',
      'Vaccinations current; deworming current',4,'excellent','Healthy, sound gait, clear eyes',
      'Father-daughter cattle sample; no breeding records')
    ON CONFLICT (tag_number) DO UPDATE SET
      name=EXCLUDED.name, sex=EXCLUDED.sex, birth_date=EXCLUDED.birth_date,
      current_weight_kg=EXCLUDED.current_weight_kg, status='active', archived_at=NULL,
      quarantine_status='not_required', body_condition_score=4, health_status='excellent',
      notes=EXCLUDED.notes
    RETURNING id,tag_number,name
  `, [tag, name, sex, birthDate, weight])).rows[0];

  const father = await upsert("2026-9101", "Father - Daughter Father", "male", "2019-02-10", 650);
  const daughter = await upsert("2026-9102", "Father - Daughter Daughter", "female", "2022-04-18", 455);

  await client.query("UPDATE livestock SET sire_id=NULL,dam_id=NULL,updated_at=NOW() WHERE id=$1", [father.id]);
  await client.query("UPDATE livestock SET sire_id=$1,dam_id=NULL,updated_at=NOW() WHERE id=$2", [father.id, daughter.id]);
  await client.query("DELETE FROM breeding_records WHERE livestock_id IN ($1,$2)", [father.id, daughter.id]);

  const check = (await client.query(`SELECT child.tag_number child_tag, sire.tag_number sire_tag
    FROM livestock child JOIN livestock sire ON sire.id=child.sire_id WHERE child.id=$1`, [daughter.id])).rows[0];
  if (check?.child_tag !== daughter.tag_number || check?.sire_tag !== father.tag_number) throw new Error("Father-daughter cattle verification failed");

  await client.query("COMMIT");
  console.log(`Seeded cattle only: ${father.tag_number} ${father.name}; ${daughter.tag_number} ${daughter.name}. No breeding records created.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
