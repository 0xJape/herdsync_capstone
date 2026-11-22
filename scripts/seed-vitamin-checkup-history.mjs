import pg from "pg";

if (!process.argv.includes("--confirm=replace-health-history")) throw new Error("Health history replacement refused. Pass --confirm=replace-health-history.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
const date = (offset) => { const value = new Date(); value.setDate(value.getDate() + offset); return value.toISOString().slice(0, 10); };

await client.connect();
try {
  await client.query("BEGIN");
  const cattle = await client.query("SELECT id, tag_number, name FROM livestock WHERE status = 'active' AND archived_at IS NULL ORDER BY id");
  if (!cattle.rowCount) throw new Error("No active cattle found");
  const actor = await client.query("SELECT id FROM users WHERE role = 'admin' AND active ORDER BY id LIMIT 1");
  const actorId = actor.rows[0]?.id ?? null;

  await client.query("DELETE FROM alert_acknowledgements");
  await client.query("DELETE FROM health_records");

  for (let index = 0; index < cattle.rows.length; index++) {
    const animal = cattle.rows[index];
    const vitaminDate = date(-(35 + (index * 7) % 120));
    const checkupDate = date(-(12 + (index * 11) % 145));
    const nextDueDate = index < 10 ? date(5 + index * 3) : null;
    const followUpDate = index < 5 ? date(2 + index * 2) : null;

    await client.query(`INSERT INTO health_records
      (livestock_id,record_type,record_date,diagnosis,details,treatment,medication_name,dose,administration_route,treatment_start_date,treatment_end_date,withdrawal_end_date,next_due_date,veterinarian,follow_up_date,status,created_by_user_id,created_at,updated_at)
      VALUES ($1,'vitamins',$2,'Preventive nutritional support; normal appetite and body condition','Routine vitamin supplementation','Vitamin supplementation completed','Vitamin A, D & E','5 mL','intramuscular',$2,$2,NULL,$3,'Dr. Maria Santos',NULL,'resolved',$4,$2::date + TIME '09:00',$2::date + TIME '09:00')`,
    [animal.id, vitaminDate, nextDueDate, actorId]);

    await client.query(`INSERT INTO health_records
      (livestock_id,record_type,record_date,diagnosis,details,treatment,medication_name,dose,administration_route,treatment_start_date,treatment_end_date,withdrawal_end_date,next_due_date,veterinarian,follow_up_date,status,created_by_user_id,created_at,updated_at)
      VALUES ($1,'checkup',$2,$3,$4,$5,NULL,NULL,NULL,$2,$2,NULL,NULL,'Dr. Maria Santos',$6,$7,$8,$2::date + TIME '10:00',$2::date + TIME '10:00')`,
    [
      animal.id,
      checkupDate,
      followUpDate ? "Mild appetite or body-condition change; otherwise stable" : "Clinically healthy; normal vital signs, appetite, rumen activity, gait, eyes, coat, and respiration",
      followUpDate ? "Routine examination found a minor change requiring observation" : "Complete routine physical examination",
      followUpDate ? "Monitor appetite, hydration, and body condition until review" : "No treatment required",
      followUpDate,
      followUpDate ? "open" : "resolved",
      actorId,
    ]);
  }

  const verification = await client.query(`SELECT COUNT(*)::int total,
    COUNT(DISTINCT livestock_id)::int cattle,
    COUNT(*) FILTER (WHERE record_type = 'vitamins')::int vitamins,
    COUNT(*) FILTER (WHERE record_type = 'checkup')::int checkups,
    COUNT(*) FILTER (WHERE next_due_date > CURRENT_DATE)::int upcoming,
    COUNT(*) FILTER (WHERE status = 'open')::int active,
    COUNT(*) FILTER (WHERE status = 'resolved' AND (follow_up_date > CURRENT_DATE OR next_due_date > CURRENT_DATE))::int scheduled,
    COUNT(*) FILTER (WHERE (status = 'open' AND follow_up_date < CURRENT_DATE) OR next_due_date < CURRENT_DATE)::int overdue
    FROM health_records WHERE archived_at IS NULL`);
  const counts = verification.rows[0];
  const expectedUpcoming = Math.min(10, cattle.rowCount);
  const expectedActive = Math.min(5, cattle.rowCount);
  if (counts.total !== cattle.rowCount * 2 || counts.cattle !== cattle.rowCount || counts.vitamins !== cattle.rowCount || counts.checkups !== cattle.rowCount || counts.upcoming !== expectedUpcoming || counts.active !== expectedActive || counts.scheduled !== expectedUpcoming || counts.overdue !== 0) throw new Error(`Health seed verification failed: ${JSON.stringify(counts)}`);

  await client.query("COMMIT");
  console.log(`Seeded ${counts.total} records: ${counts.active} active, ${counts.scheduled} follow-up scheduled, ${counts.total - counts.active - counts.scheduled} completed, and no overdue records.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
