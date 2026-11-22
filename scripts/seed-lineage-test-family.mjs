import pg from "pg";

if (!process.argv.includes("--confirm=seed-lineage-test-family")) throw new Error("Seed refused. Pass --confirm=seed-lineage-test-family.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
try {
  await client.query("BEGIN");

  const upsert = async (tag, name, sex, birthDate, weight, hasCalved) => (await client.query(`
    INSERT INTO livestock (tag_number,name,sex,breed,birth_date,birth_weight_kg,current_weight_kg,color_markings,status,acquisition_type,acquisition_date,quarantine_status,purchased,has_calved,birth_type,calf_vigor,calving_difficulty,management_decision,vaccination_treatment_history,body_condition_score,health_status,physical_assessment_notes,notes)
    VALUES ($1,$2,$3,'Brahman',$4,32,$5,'Lineage test family','active','born_on_farm',$4,'not_required',FALSE,$6,'single','vigorous','unassisted','Retain for lineage testing','Vaccinations current; deworming current',3,'excellent','Healthy, sound gait, clear eyes','Sample family for breeding lineage prevention test')
    ON CONFLICT (tag_number) DO UPDATE SET name=EXCLUDED.name,sex=EXCLUDED.sex,birth_date=EXCLUDED.birth_date,current_weight_kg=EXCLUDED.current_weight_kg,status='active',archived_at=NULL,quarantine_status='not_required',has_calved=EXCLUDED.has_calved,body_condition_score=3,health_status='excellent',notes=EXCLUDED.notes
    RETURNING id,tag_number,name
  `, [tag, name, sex, birthDate, weight, hasCalved])).rows[0];

  const father = await upsert("2026-9001", "Lineage Test Father", "male", "2019-02-10", 650, false);
  const mother = await upsert("2026-9002", "Lineage Test Mother", "female", "2019-05-14", 480, true);
  const daughter = await upsert("2026-9003", "Lineage Test Daughter", "female", "2022-04-18", 455, false);

  await client.query("UPDATE livestock SET sire_id=NULL,dam_id=NULL,updated_at=NOW() WHERE id IN ($1,$2)", [father.id, mother.id]);
  await client.query("UPDATE livestock SET sire_id=$1,dam_id=$2,updated_at=NOW() WHERE id=$3", [father.id, mother.id, daughter.id]);
  await client.query("DELETE FROM breeding_records WHERE livestock_id=$1", [daughter.id]);
  await client.query("INSERT INTO breeding_records (livestock_id,event_type,event_date,details,performed_by) VALUES ($1,'heat_observed',CURRENT_DATE,'Lineage prevention test heat','Seed script')", [daughter.id]);

  const check = (await client.query(`SELECT child.tag_number child_tag, sire.tag_number sire_tag, dam.tag_number dam_tag
    FROM livestock child JOIN livestock sire ON sire.id=child.sire_id JOIN livestock dam ON dam.id=child.dam_id
    WHERE child.id=$1`, [daughter.id])).rows[0];
  if (check?.child_tag !== daughter.tag_number || check?.sire_tag !== father.tag_number || check?.dam_tag !== mother.tag_number) throw new Error("Lineage seed verification failed");

  await client.query("COMMIT");
  console.log(`Seeded lineage test family: daughter ${daughter.tag_number}, father ${father.tag_number}, mother ${mother.tag_number}. Select daughter as dam, then inspect father in sire list.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
