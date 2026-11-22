import pg from "pg";

const { Client } = pg;
const marker = "Historical reproduction seed v1";
const cutoff = "2026-05-26";
const confirmationOffsetDays = 60;
const checkupOffsetDays = 150;
const calvingDates = ["2026-04-18", "2026-04-27", "2026-05-06", "2026-05-17", "2026-05-26"];
const outcomeSets = [
  [{ outcome: "live", sex: "female", status: "sold", weight: 31, vigor: "vigorous" }],
  [{ outcome: "stillborn", sex: "male", weight: 35, vigor: "critical" }],
  [{ outcome: "neonatal_death", sex: "female", status: "deceased", weight: 29, vigor: "weak" }],
  [
    { outcome: "live", sex: "male", status: "sold", weight: 27, vigor: "normal" },
    { outcome: "live", sex: "female", status: "transferred_out", weight: 26, vigor: "normal" },
  ],
  [
    { outcome: "live", sex: "male", status: "transferred_out", weight: 28, vigor: "normal" },
    { outcome: "stillborn", sex: "female", weight: 25, vigor: "critical" },
  ],
];
const cycleTexts = (kind) => calvingDates.map((_, index) => `${marker} · cycle ${index + 1} ${kind}`);
const calfNotes = outcomeSets.flatMap((set, cycleIndex) => set
  .filter(({ outcome }) => outcome !== "stillborn")
  .map((_, birthIndex) => `${marker} · cycle ${cycleIndex + 1} calf ${birthIndex + 1}`));

if (process.argv.slice(2).length !== 1 || process.argv[2] !== "--confirm=seed-historical-reproduction") {
  throw new Error("Refusing to seed. Pass exactly --confirm=seed-historical-reproduction");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const isoDate = (date) => date.toISOString().slice(0, 10);
const addDays = (date, days) => isoDate(new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86_400_000));
const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [marker]);

  // Remove only the graph rooted in rows carrying this exact seed marker.
  const oldCalves = await client.query("SELECT id FROM livestock WHERE notes = ANY($1::text[])", [calfNotes]);
  const oldEvents = await client.query("SELECT id FROM calving_events WHERE notes = ANY($1::text[])", [cycleTexts("closed historical delivery")]);
  const oldBreeding = await client.query("SELECT id FROM breeding_records WHERE details = ANY($1::text[])", [[...cycleTexts("service"), ...cycleTexts("pregnancy confirmed"), ...cycleTexts("terminal calving")]]);
  const oldServices = await client.query("SELECT id FROM breeding_records WHERE event_type = 'natural_service' AND details = ANY($1::text[])", [cycleTexts("service")]);
  const oldCalfIds = oldCalves.rows.map(({ id }) => id);
  const oldEventIds = oldEvents.rows.map(({ id }) => id);
  const oldBreedingIds = oldBreeding.rows.map(({ id }) => id);
  const oldServiceIds = oldServices.rows.map(({ id }) => id);

  if (oldCalfIds.length) {
    const foreignPlans = await client.query("SELECT count(*)::int count FROM calf_care_plans WHERE livestock_id = ANY($1::bigint[])", [oldCalfIds]);
    if (foreignPlans.rows[0].count) throw new Error("Refusing replacement: marker-owned calves have non-seed calf care plans");
    await client.query("DELETE FROM weight_records WHERE livestock_id = ANY($1::bigint[]) AND notes = $2", [oldCalfIds, `${marker} · birth weight`]);
  }
  if (oldEventIds.length) await client.query("DELETE FROM calving_outcomes WHERE calving_event_id = ANY($1::bigint[])", [oldEventIds]);
  if (oldEventIds.length) await client.query("DELETE FROM calving_events WHERE id = ANY($1::bigint[])", [oldEventIds]);
  if (oldServiceIds.length) await client.query("DELETE FROM pregnancy_checkups WHERE service_id = ANY($1::bigint[]) AND findings = ANY($2::text[])", [oldServiceIds, cycleTexts("historical checkup; pregnancy progressing normally")]);
  if (oldBreedingIds.length) {
    await client.query("DELETE FROM breeding_records WHERE id = ANY($1::bigint[]) AND event_type <> 'natural_service'", [oldBreedingIds]);
    await client.query("DELETE FROM breeding_records WHERE id = ANY($1::bigint[])", [oldBreedingIds]);
  }
  if (oldCalfIds.length) await client.query("DELETE FROM livestock WHERE id = ANY($1::bigint[]) AND notes = ANY($2::text[])", [oldCalfIds, calfNotes]);

  const parents = await client.query(`
    WITH dams AS (
      SELECT id, tag_number, breed, current_weight_kg,
             row_number() OVER (ORDER BY (status = 'active' AND archived_at IS NULL) DESC, archived_at NULLS FIRST, id) rn
      FROM livestock
      WHERE sex = 'female' AND birth_date <= DATE '2024-01-01' AND (notes IS NULL OR notes <> ALL($1::text[]))
    ), sires AS (
      SELECT id, tag_number, breed,
             row_number() OVER (ORDER BY (status = 'active' AND archived_at IS NULL) DESC, archived_at NULLS FIRST, id) rn
      FROM livestock
      WHERE sex = 'male' AND birth_date <= DATE '2024-01-01' AND (notes IS NULL OR notes <> ALL($1::text[]))
    )
    SELECT d.id dam_id, d.tag_number dam_tag, d.breed dam_breed, d.current_weight_kg dam_weight,
           s.id sire_id, s.tag_number sire_tag, s.breed sire_breed
    FROM dams d JOIN sires s USING (rn) WHERE d.rn <= 5 ORDER BY d.rn`, [calfNotes]);
  if (parents.rows.length !== 5) throw new Error("Five distinct adult dams and five distinct adult sires are required");
  if (new Set(parents.rows.map((row) => String(row.dam_id))).size !== 5 || new Set(parents.rows.map((row) => String(row.sire_id))).size !== 5) {
    throw new Error("Parent selection was not distinct");
  }

  const actorResult = await client.query("SELECT id, display_name FROM users WHERE role = 'admin' AND active = TRUE ORDER BY id LIMIT 1");
  const actor = actorResult.rows[0] ?? { id: null, display_name: "Historical seed" };
  const occupiedTags = new Set((await client.query("SELECT tag_number FROM livestock WHERE tag_number LIKE '2026-9%' ORDER BY tag_number")).rows.map((row) => row.tag_number));
  const tags = [];
  for (let number = 90001; tags.length < 5; number += 1) {
    const tag = `2026-${number}`;
    if (!occupiedTags.has(tag)) tags.push(tag);
  }

  let calfIndex = 0;
  for (const [cycleIndex, parent] of parents.rows.entries()) {
    const calvingDate = calvingDates[cycleIndex];
    const serviceDate = addDays(calvingDate, -283);
    const confirmationDate = addDays(serviceDate, confirmationOffsetDays);
    const checkupDate = addDays(serviceDate, checkupOffsetDays);
    const twins = outcomeSets[cycleIndex].length === 2;
    const difficulty = cycleIndex === 4 ? "minor_assistance" : "unassisted";
    const service = await client.query(`INSERT INTO breeding_records
      (livestock_id,event_type,event_date,sire_id,pregnancy_status,expected_calving_date,details,performed_by,created_by_user_id)
      VALUES ($1,'natural_service',$2,$3,'pending',$4,$5,$6,$7) RETURNING id`,
      [parent.dam_id, serviceDate, parent.sire_id, calvingDate, `${marker} · cycle ${cycleIndex + 1} service`, actor.display_name, actor.id]);
    const serviceId = service.rows[0].id;
    const confirmation = await client.query(`INSERT INTO breeding_records
      (livestock_id,event_type,event_date,sire_id,pregnancy_status,expected_calving_date,details,performed_by,created_by_user_id,source_service_id)
      VALUES ($1,'pregnancy_confirmed',$2,$3,'pregnant',$4,$5,$6,$7,$8) RETURNING id`,
      [parent.dam_id, confirmationDate, parent.sire_id, calvingDate, `${marker} · cycle ${cycleIndex + 1} pregnancy confirmed`, actor.display_name, actor.id, serviceId]);
    await client.query(`INSERT INTO pregnancy_checkups
      (livestock_id,service_id,checkup_date,gestation_month,health_status,body_condition_score,weight_kg,veterinarian,findings,next_checkup_date,created_by_user_id)
      VALUES ($1,$2,$3,5,'good',3.5,$4,$5,$6,NULL,$7)`,
      [parent.dam_id, serviceId, checkupDate, parent.dam_weight, actor.display_name, `${marker} · cycle ${cycleIndex + 1} historical checkup; pregnancy progressing normally`, actor.id]);
    const calving = await client.query(`INSERT INTO breeding_records
      (livestock_id,event_type,event_date,sire_id,pregnancy_status,expected_calving_date,details,performed_by,created_by_user_id,source_service_id)
      VALUES ($1,'calving',$2,$3,'delivered',$2,$4,$5,$6,$7) RETURNING id`,
      [parent.dam_id, calvingDate, parent.sire_id, `${marker} · cycle ${cycleIndex + 1} terminal calving`, actor.display_name, actor.id, serviceId]);
    const event = await client.query(`INSERT INTO calving_events
      (dam_id,pregnancy_confirmation_id,service_id,breeding_record_id,birth_date,performed_by,calving_difficulty,twins,notes,created_by_user_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [parent.dam_id, confirmation.rows[0].id, serviceId, calving.rows[0].id, calvingDate, actor.display_name, difficulty, twins, `${marker} · cycle ${cycleIndex + 1} closed historical delivery`, actor.id]);

    for (const [birthIndex, outcome] of outcomeSets[cycleIndex].entries()) {
      let calfId = null;
      let calfName = null;
      if (outcome.outcome !== "stillborn") {
        calfName = `Historical Calf ${cycleIndex + 1}-${birthIndex + 1}`;
        const breed = parent.dam_breed === parent.sire_breed ? parent.dam_breed : `${parent.dam_breed} × ${parent.sire_breed}`.slice(0, 100);
        const deathDate = outcome.outcome === "neonatal_death" ? addDays(calvingDate, 3) : null;
        const deathReason = outcome.outcome === "neonatal_death" ? `${marker} · neonatal complications` : null;
        const calf = await client.query(`INSERT INTO livestock
          (tag_number,name,sex,breed,birth_date,birth_weight_kg,current_weight_kg,status,acquisition_date,acquisition_type,quarantine_status,notes,purchased,has_calved,sire_id,dam_id,birth_type,calf_vigor,calving_difficulty,health_status,death_date,death_reason)
          VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$5,'born_on_farm','not_required',$8,FALSE,FALSE,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
          [tags[calfIndex++], calfName, outcome.sex, breed, calvingDate, outcome.weight, outcome.status, `${marker} · cycle ${cycleIndex + 1} calf ${birthIndex + 1}`, parent.sire_id, parent.dam_id, twins ? "twin" : "single", outcome.vigor, difficulty, outcome.outcome === "neonatal_death" ? "poor" : "good", deathDate, deathReason]);
        calfId = calf.rows[0].id;
        await client.query(`INSERT INTO weight_records
          (livestock_id,measured_at,weight_kg,notes,recorded_by,created_by_user_id)
          VALUES ($1,$2,$3,$4,$5,$6)`, [calfId, calvingDate, outcome.weight, `${marker} · birth weight`, actor.display_name, actor.id]);
      }
      await client.query(`INSERT INTO calving_outcomes
        (calving_event_id,birth_order,outcome,livestock_id,name,sex,birth_weight_kg,calf_vigor,notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [event.rows[0].id, birthIndex + 1, outcome.outcome, calfId, calfName, outcome.sex, outcome.weight, outcome.vigor, `${marker} · cycle ${cycleIndex + 1} outcome ${birthIndex + 1}`]);
    }
  }

  const counts = await client.query(`SELECT
    (SELECT count(*)::int FROM breeding_records WHERE event_type='natural_service' AND details = ANY($1::text[])) services,
    (SELECT count(*)::int FROM breeding_records WHERE event_type='pregnancy_confirmed' AND details = ANY($2::text[])) confirmations,
    (SELECT count(*)::int FROM pregnancy_checkups WHERE findings = ANY($3::text[])) checkups,
    (SELECT count(*)::int FROM breeding_records WHERE event_type='calving' AND details = ANY($4::text[])) calvings,
    (SELECT count(*)::int FROM calving_events WHERE notes = ANY($5::text[])) events,
    (SELECT count(*)::int FROM calving_outcomes o JOIN calving_events e ON e.id=o.calving_event_id WHERE e.notes = ANY($5::text[])) outcomes,
    (SELECT count(*)::int FROM livestock WHERE notes = ANY($6::text[])) calves,
    (SELECT count(*)::int FROM weight_records w JOIN livestock l ON l.id=w.livestock_id WHERE l.notes = ANY($6::text[]) AND w.notes=$7) weights`,
    [cycleTexts("service"), cycleTexts("pregnancy confirmed"), cycleTexts("historical checkup; pregnancy progressing normally"), cycleTexts("terminal calving"), cycleTexts("closed historical delivery"), calfNotes, `${marker} · birth weight`]);
  const expected = { services: 5, confirmations: 5, checkups: 5, calvings: 5, events: 5, outcomes: 7, calves: 5, weights: 5 };
  for (const [name, count] of Object.entries(expected)) if (counts.rows[0][name] !== count) throw new Error(`${name}: expected ${count}, got ${counts.rows[0][name]}`);

  const validation = await client.query(`SELECT
    (SELECT count(*)::int FROM breeding_records s WHERE s.event_type='natural_service' AND s.details = ANY($1::text[])
      AND NOT EXISTS (SELECT 1 FROM breeding_records c WHERE c.source_service_id=s.id AND c.event_type='calving' AND c.pregnancy_status='delivered' AND c.details = ANY($2::text[]))) unresolved,
    (SELECT count(*)::int FROM livestock WHERE notes = ANY($3::text[]) AND status='active') active_calves,
    (SELECT count(*)::int FROM calf_care_plans p JOIN livestock l ON l.id=p.livestock_id WHERE l.notes = ANY($3::text[]) AND p.status='pending') pending_plans,
    (SELECT count(DISTINCT livestock_id)::int FROM breeding_records WHERE event_type='natural_service' AND details = ANY($1::text[])) dams,
    (SELECT count(DISTINCT sire_id)::int FROM breeding_records WHERE event_type='natural_service' AND details = ANY($1::text[])) sires,
    (SELECT count(*)::int FROM (
      SELECT event_date d FROM breeding_records WHERE details = ANY($4::text[]) UNION ALL
      SELECT checkup_date FROM pregnancy_checkups WHERE findings = ANY($5::text[]) UNION ALL
      SELECT next_checkup_date FROM pregnancy_checkups WHERE findings = ANY($5::text[]) UNION ALL
      SELECT birth_date FROM calving_events WHERE notes = ANY($6::text[]) UNION ALL
      SELECT birth_date FROM livestock WHERE notes = ANY($3::text[]) UNION ALL
      SELECT death_date FROM livestock WHERE notes = ANY($3::text[]) UNION ALL
      SELECT measured_at FROM weight_records w JOIN livestock l ON l.id=w.livestock_id WHERE l.notes = ANY($3::text[]) AND w.notes=$7
    ) dates WHERE d > $8::date) future_dates,
    (SELECT count(*)::int FROM livestock WHERE notes = ANY($3::text[]) AND status NOT IN ('sold','transferred_out','deceased')) bad_status,
    (SELECT count(*)::int FROM livestock WHERE notes = ANY($3::text[]) AND (sire_id IS NULL OR dam_id IS NULL OR acquisition_type<>'born_on_farm' OR quarantine_status<>'not_required')) bad_calf_links,
    (SELECT count(*)::int FROM breeding_records s JOIN breeding_records p ON p.source_service_id=s.id AND p.event_type='pregnancy_confirmed'
      JOIN pregnancy_checkups pc ON pc.service_id=s.id JOIN breeding_records c ON c.source_service_id=s.id AND c.event_type='calving'
      JOIN calving_events e ON e.service_id=s.id AND e.pregnancy_confirmation_id=p.id AND e.breeding_record_id=c.id
      WHERE s.details = ANY($1::text[]) AND s.event_date + 283 = e.birth_date AND p.event_date >= s.event_date + 45
        AND pc.checkup_date < e.birth_date AND (pc.next_checkup_date IS NULL OR pc.next_checkup_date <= $8::date)) coherent_cycles`,
    [cycleTexts("service"), cycleTexts("terminal calving"), calfNotes, [...cycleTexts("service"), ...cycleTexts("pregnancy confirmed"), ...cycleTexts("terminal calving")], cycleTexts("historical checkup; pregnancy progressing normally"), cycleTexts("closed historical delivery"), `${marker} · birth weight`, cutoff]);
  const v = validation.rows[0];
  if (v.unresolved || v.active_calves || v.pending_plans || v.dams !== 5 || v.sires !== 5 || v.future_dates || v.bad_status || v.bad_calf_links || v.coherent_cycles !== 5) {
    throw new Error(`Validation failed: ${JSON.stringify(v)}`);
  }

  const summary = await client.query(`SELECT outcome, sex, count(*)::int count
    FROM calving_outcomes WHERE notes LIKE $1 GROUP BY outcome, sex ORDER BY outcome, sex`, [`${marker}%`]);
  await client.query("COMMIT");
  console.log(`Seeded ${marker}: ${Object.entries(counts.rows[0]).map(([key, value]) => `${key}=${value}`).join(", ")}`);
  console.log(`Outcomes: ${summary.rows.map((row) => `${row.outcome}/${row.sex}=${row.count}`).join(", ")}`);
  console.log(`Parents: dams=${v.dams}, sires=${v.sires}; active calves=${v.active_calves}; pending plans=${v.pending_plans}; unresolved services=${v.unresolved}`);
} catch (error) {
  try { await client.query("ROLLBACK"); } catch {}
  throw error;
} finally {
  await client.end();
}
