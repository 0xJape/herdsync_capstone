import pg from "pg";

if (!process.argv.includes("--confirm=seed-father-daughter-sibling")) throw new Error("Seed refused. Pass --confirm=seed-father-daughter-sibling.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("BEGIN");
  const father = (await client.query("SELECT id FROM livestock WHERE tag_number='2026-9101' AND sex='male' AND status='active' AND archived_at IS NULL")).rows[0];
  if (!father) throw new Error("Father cattle 2026-9101 not found. Run seed-father-daughter-cattle first.");

  const sibling = (await client.query(`
    INSERT INTO livestock
      (tag_number,name,sex,breed,birth_date,birth_weight_kg,current_weight_kg,color_markings,status,
       acquisition_type,acquisition_date,quarantine_status,purchased,has_calved,birth_type,calf_vigor,
       calving_difficulty,management_decision,vaccination_treatment_history,body_condition_score,
       health_status,physical_assessment_notes,notes,sire_id,dam_id)
    VALUES ('2026-9103','Father - Daughter Sibling','female','Brahman','2022-06-22',32,448,
      'Father-daughter sibling demo','active','born_on_farm','2022-06-22','not_required',FALSE,FALSE,
      'single','vigorous','unassisted','Lineage restriction demo','Vaccinations current; deworming current',
      4,'excellent','Healthy, sound gait, clear eyes',
      'Sibling of Father - Daughter Daughter; eligible demo cattle; heat recorded; no service record',$1,NULL)
    ON CONFLICT (tag_number) DO UPDATE SET
      name=EXCLUDED.name, sex=EXCLUDED.sex, birth_date=EXCLUDED.birth_date,
      current_weight_kg=EXCLUDED.current_weight_kg, status='active', archived_at=NULL,
      quarantine_status='not_required', body_condition_score=4, health_status='excellent',
      notes=EXCLUDED.notes, sire_id=EXCLUDED.sire_id, dam_id=NULL
    RETURNING id,tag_number,name
  `, [father.id])).rows[0];

  await client.query("DELETE FROM breeding_records WHERE livestock_id=$1 AND event_type='heat_observed'", [sibling.id]);
  await client.query("INSERT INTO breeding_records (livestock_id,event_type,event_date,details,performed_by) VALUES ($1,'heat_observed',CURRENT_DATE,'Eligible sibling lineage demo heat','Seed script')", [sibling.id]);
  await client.query("COMMIT");
  console.log(`Seeded eligible sibling: ${sibling.tag_number} ${sibling.name}; shares sire 2026-9101; heat recorded for eligibility.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
