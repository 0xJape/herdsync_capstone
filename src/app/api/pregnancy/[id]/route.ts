import { requireRole } from "@/lib/auth";
import { dateString, daysBetween, gestationStage } from "@/lib/breeding-rules";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };
const validDate = (value: unknown, required = false) => (!required && (value == null || value === "")) || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));
const text = (value: unknown, max: number, required = false) => typeof value === "string" && (!required || !!value.trim()) && value.length <= max;
const addMonth = (value: string) => { const date = new Date(`${value}T00:00:00Z`), day = date.getUTCDate(); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + 1); const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate(); date.setUTCDate(Math.min(day, lastDay)); return date.toISOString().slice(0, 10); };

async function activePregnancy(id: number, byLivestock = false) {
  const result = await db.query(`SELECT dam.id livestock_id, dam.tag_number, dam.name, dam.breed, dam.birth_date, dam.health_status, dam.body_condition_score, dam.current_weight_kg,
      confirmation.id confirmation_id, service.id service_id, service.event_date conception_date,
      CASE WHEN service.expected_calving_date > service.event_date THEN service.expected_calving_date ELSE service.event_date + 283 END expected_calving_date,
      sire.id sire_id, sire.tag_number sire_tag_number, sire.name sire_name, sire.breed sire_breed
    FROM livestock dam
    JOIN LATERAL (SELECT * FROM breeding_records confirmation WHERE confirmation.livestock_id = dam.id AND confirmation.event_type = 'pregnancy_confirmed' AND confirmation.pregnancy_status = 'pregnant' AND confirmation.archived_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM breeding_records terminal WHERE terminal.livestock_id = dam.id AND terminal.archived_at IS NULL AND terminal.event_type IN ('pregnancy_loss','pregnancy_negative','calving') AND (terminal.event_date > confirmation.event_date OR terminal.event_date = confirmation.event_date AND terminal.id > confirmation.id))
      ORDER BY confirmation.event_date DESC,confirmation.id DESC LIMIT 1) confirmation ON TRUE
    JOIN LATERAL (SELECT * FROM breeding_records service WHERE service.livestock_id = dam.id AND service.event_type IN ('natural_service','artificial_insemination') AND service.archived_at IS NULL
      AND (service.id = confirmation.source_service_id OR confirmation.source_service_id IS NULL AND (service.event_date < confirmation.event_date OR service.event_date = confirmation.event_date AND service.id < confirmation.id))
      ORDER BY (service.id = confirmation.source_service_id) DESC, service.event_date DESC, service.id DESC LIMIT 1) service ON TRUE
    LEFT JOIN livestock sire ON sire.id = service.sire_id
    WHERE ${byLivestock ? "dam.id" : "confirmation.id"} = $1 AND dam.archived_at IS NULL`, [id]);
  return result.rows[0];
}

async function completedCalving(id: number) {
  const result = await db.query(`SELECT event.*, dam.tag_number, dam.name, dam.breed, dam.birth_date dam_birth_date, dam.health_status, dam.body_condition_score, dam.current_weight_kg,
      service.event_date conception_date,
      CASE WHEN service.expected_calving_date > service.event_date THEN service.expected_calving_date ELSE service.event_date + 283 END expected_calving_date,
      sire.id sire_id, sire.tag_number sire_tag_number, sire.name sire_name, sire.breed sire_breed,
      COALESCE(json_agg(json_build_object('id', outcome.id, 'birth_order', outcome.birth_order, 'outcome', outcome.outcome, 'livestock_id', outcome.livestock_id, 'tag_number', calf.tag_number, 'name', outcome.name, 'sex', outcome.sex, 'birth_weight_kg', outcome.birth_weight_kg, 'calf_vigor', outcome.calf_vigor, 'notes', outcome.notes) ORDER BY outcome.birth_order) FILTER (WHERE outcome.id IS NOT NULL), '[]') outcomes
    FROM calving_events event
    JOIN livestock dam ON dam.id = event.dam_id
    JOIN breeding_records service ON service.id = event.service_id
    LEFT JOIN livestock sire ON sire.id = service.sire_id
    LEFT JOIN calving_outcomes outcome ON outcome.calving_event_id = event.id
    LEFT JOIN livestock calf ON calf.id = outcome.livestock_id
    WHERE event.pregnancy_confirmation_id = $1
    GROUP BY event.id, dam.id, service.id, sire.id
    ORDER BY event.birth_date DESC, event.id DESC LIMIT 1`, [id]);
  return result.rows[0];
}

async function calvingHistory(livestockId: number) {
  const result = await db.query(`SELECT e.id, e.pregnancy_confirmation_id pregnancy_id, e.birth_date, e.calving_difficulty, e.twins, e.notes,
      COUNT(o.id)::int calf_count, STRING_AGG(COALESCE(calf.tag_number, o.name, o.outcome), ', ' ORDER BY o.birth_order) calves
    FROM calving_events e
    LEFT JOIN calving_outcomes o ON o.calving_event_id = e.id
    LEFT JOIN livestock calf ON calf.id = o.livestock_id
    WHERE e.dam_id = $1
    GROUP BY e.id
    ORDER BY e.birth_date DESC, e.id DESC`, [livestockId]);
  return result.rows;
}

export async function GET(request: NextRequest, { params }: Context) {
  const auth = await requireRole("veterinarian", "farm_aide", "faculty"); if ("response" in auth) return auth.response;
  const id = Number((await params).id); if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Invalid livestock ID" }, { status: 400 });
  const byLivestock = request.nextUrl.searchParams.get("livestock") === "1";
  const pregnancy = await activePregnancy(id, byLivestock);
  if (!pregnancy) {
    if (byLivestock) {
      const records = await db.query(`SELECT record.id,record.event_type,record.event_date,record.pregnancy_status,record.details,record.performed_by,
          service.event_date service_date, service.expected_calving_date, sire.tag_number sire_tag_number, sire.name sire_name,
          calving.birth_date calving_date
        FROM breeding_records record
        LEFT JOIN breeding_records service ON service.id = record.source_service_id
        LEFT JOIN livestock sire ON sire.id = service.sire_id
        LEFT JOIN calving_events calving ON calving.pregnancy_confirmation_id = record.id
        WHERE record.livestock_id = $1 AND record.archived_at IS NULL
        ORDER BY record.event_date DESC,record.id DESC`, [id]);
      const history = await calvingHistory(id);
      return NextResponse.json({ pregnancy: null, checkups: [], records: records.rows, completed_calving: history[0] ? { birth_date: history[0].birth_date, pregnancy_confirmation_id: history[0].pregnancy_id } : undefined, calving_history: history }, { headers: { "Cache-Control": "no-store" } });
    }
    const calving = await completedCalving(id);
    if (!calving) return NextResponse.json({ pregnancy: null, checkups: [], records: [], calving_history: [] }, { headers: { "Cache-Control": "no-store" } });
    const [checkups, records] = await Promise.all([
      db.query("SELECT * FROM pregnancy_checkups WHERE livestock_id = $1 AND service_id = $2 ORDER BY checkup_date DESC, id DESC", [calving.dam_id, calving.service_id]),
      db.query("SELECT id,event_type,event_date,pregnancy_status,details,performed_by FROM breeding_records WHERE livestock_id = $1 AND archived_at IS NULL ORDER BY event_date DESC,id DESC", [calving.dam_id]),
    ]);
    const conception = dateString(calving.conception_date), birthDate = dateString(calving.birth_date), daysPregnant = Math.max(0, daysBetween(conception, birthDate));
        return NextResponse.json({ pregnancy: { livestock_id: calving.dam_id, confirmation_id: calving.pregnancy_confirmation_id, service_id: calving.service_id, tag_number: calving.tag_number, name: calving.name, breed: calving.breed, birth_date: calving.dam_birth_date, health_status: calving.health_status, body_condition_score: calving.body_condition_score, current_weight_kg: calving.current_weight_kg, sire_id: calving.sire_id, sire_tag_number: calving.sire_tag_number, sire_name: calving.sire_name, sire_breed: calving.sire_breed, conception_date: conception, expected_calving_date: dateString(calving.expected_calving_date), days_pregnant: daysPregnant, next_checkup_date: null, checkup_due: false, checkup_overdue: false, key: "completed", label: "Calving completed", guidance: "Pregnancy closed by recorded calving." }, checkups: checkups.rows, records: records.rows, completed_calving: { ...calving, birth_date: birthDate }, calving_history: await calvingHistory(calving.dam_id) }, { headers: { "Cache-Control": "no-store" } });
  }
  const [checkups, records] = await Promise.all([
    db.query("SELECT * FROM pregnancy_checkups WHERE livestock_id = $1 AND service_id = $2 ORDER BY checkup_date DESC, id DESC", [pregnancy.livestock_id, pregnancy.service_id]),
    db.query("SELECT id,event_type,event_date,pregnancy_status,details,performed_by FROM breeding_records WHERE livestock_id = $1 AND archived_at IS NULL ORDER BY event_date DESC,id DESC", [pregnancy.livestock_id]),
  ]);
  const today = new Date().toISOString().slice(0, 10), conception = dateString(pregnancy.conception_date), daysPregnant = Math.max(0, daysBetween(conception, today));
  const nextCheckupDate = checkups.rows[0]?.next_checkup_date ? dateString(checkups.rows[0].next_checkup_date) : conception;
  return NextResponse.json({ pregnancy: { ...pregnancy, conception_date: conception, expected_calving_date: dateString(pregnancy.expected_calving_date), days_pregnant: daysPregnant, next_checkup_date: nextCheckupDate, checkup_due: today >= nextCheckupDate, checkup_overdue: today > nextCheckupDate, ...gestationStage(daysPregnant) }, checkups: checkups.rows, records: records.rows, calving_history: await calvingHistory(pregnancy.livestock_id) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest, { params }: Context) {
  const auth = await requireRole("veterinarian", "farm_aide"); if ("response" in auth) return auth.response;
  const id = Number((await params).id); if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Invalid livestock ID" }, { status: 400 });
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const month = Number(body.gestation_month), bcs = Number(body.body_condition_score), weight = Number(body.weight_kg), status = String(body.health_status);
  if (!validDate(body.checkup_date, true)) return NextResponse.json({ error: "Valid checkup date is required" }, { status: 400 });
  if (!Number.isSafeInteger(month) || month < 1 || month > 10 || !Number.isFinite(bcs) || bcs < 1 || bcs > 5 || !Number.isFinite(weight) || weight <= 0) return NextResponse.json({ error: "Month, BCS, and positive weight are required" }, { status: 400 });
  if (!["excellent", "good", "fair", "poor"].includes(status) || !text(body.veterinarian, 150, true) || !text(body.findings, 10000, true)) return NextResponse.json({ error: "Status, veterinarian, and findings are required" }, { status: 400 });
  const today = new Date().toISOString().slice(0, 10);
  if (String(body.checkup_date) !== today) return NextResponse.json({ error: "Monthly checkups can only be logged on the actual logging date" }, { status: 409 });
  const pregnancy = await activePregnancy(id); if (!pregnancy) return NextResponse.json({ error: "No active confirmed pregnancy found" }, { status: 409 });
  const conception = dateString(pregnancy.conception_date); if (String(body.checkup_date) < conception) return NextResponse.json({ error: "Checkup cannot precede breeding" }, { status: 409 });
  const client = await db.connect();
  try {
    await client.query("BEGIN"); await client.query("SELECT pg_advisory_xact_lock($1)", [id]);
    const previous = await client.query("SELECT next_checkup_date FROM pregnancy_checkups WHERE livestock_id=$1 AND service_id=$2 ORDER BY checkup_date DESC,id DESC LIMIT 1", [pregnancy.livestock_id, pregnancy.service_id]);
    const dueDate = previous.rows[0]?.next_checkup_date ? dateString(previous.rows[0].next_checkup_date) : conception;
    if (today < dueDate) { await client.query("ROLLBACK"); return NextResponse.json({ error: `Next monthly checkup can be logged on ${dueDate}` }, { status: 409 }); }
    const nextCheckupDate = addMonth(today);
    const result = await client.query(`INSERT INTO pregnancy_checkups (livestock_id,service_id,checkup_date,gestation_month,health_status,body_condition_score,weight_kg,veterinarian,findings,next_checkup_date,created_by_user_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [pregnancy.livestock_id, pregnancy.service_id, body.checkup_date, month, status, bcs, weight, String(body.veterinarian).trim(), String(body.findings).trim(), nextCheckupDate, auth.user.id]);
    await client.query("UPDATE livestock SET health_status=$1,body_condition_score=$2,current_weight_kg=$3,updated_at=NOW() WHERE id=$4", [status, Math.round(bcs), weight, pregnancy.livestock_id]);
    await client.query("INSERT INTO weight_records (livestock_id,measured_at,weight_kg,notes,recorded_by,created_by_user_id) VALUES ($1,$2,$3,'Pregnancy checkup weight',$4,$5)", [pregnancy.livestock_id, body.checkup_date, weight, String(body.veterinarian).trim(), auth.user.id]);
    await client.query("INSERT INTO activity_logs (user_id,action,entity_type,entity_id,title,detail) VALUES ($1,'create','pregnancy_checkup',$2,$3,$4)", [auth.user.id, result.rows[0].id, `Pregnancy checkup  -  ${pregnancy.tag_number}`, `Month ${month}; BCS ${bcs}; ${weight} kg`]);
    await client.query("COMMIT"); return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) { await client.query("ROLLBACK"); if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "Checkup already exists for this date" }, { status: 409 }); throw error; } finally { client.release(); }
}
