import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { administeredCareTypes, applyHealthProtocol, healthRecordTypes, validateHealthDates } from "@/lib/health-rules";

type Context = { params: Promise<{ id: string }> };
const allowed = ["livestock_id", "record_type", "record_date", "diagnosis", "details", "treatment", "medication_name", "dose", "administration_route", "treatment_start_date", "treatment_end_date", "withdrawal_end_date", "next_due_date", "veterinarian", "follow_up_date", "status"] as const;
const statuses = new Set(["open", "resolved"]);
const getId = async ({ params }: Context) => { const id = Number((await params).id); return Number.isSafeInteger(id) && id > 0 ? id : null; };

export async function GET(_request: NextRequest, context: Context) {
  const auth = await requireRole("veterinarian", "farm_aide", "faculty"); if ("response" in auth) return auth.response;
  const id = await getId(context);
  if (!id) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  const result = await db.query("SELECT h.*, l.tag_number, l.name livestock_name FROM health_records h JOIN livestock l ON l.id = h.livestock_id WHERE h.id = $1 AND h.archived_at IS NULL", [id]);
  return result.rows[0] ? NextResponse.json(result.rows[0]) : NextResponse.json({ error: "Health record not found" }, { status: 404 });
}

export async function PUT(request: NextRequest, context: Context) {
  const auth = await requireRole("veterinarian", "farm_aide"); if ("response" in auth) return auth.response;
  const id = await getId(context);
  if (!id) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (body.status !== undefined && !statuses.has(String(body.status))) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  if (body.record_type !== undefined && (typeof body.record_type !== "string" || !body.record_type.trim() || body.record_type.length > 100)) return NextResponse.json({ error: "Invalid record type" }, { status: 400 });
  for (const field of ["record_date", "follow_up_date", "treatment_start_date", "treatment_end_date", "withdrawal_end_date", "next_due_date"] as const) if (body[field] !== undefined && body[field] !== "" && (typeof body[field] !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body[field]))) return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
  for (const [field, max] of [["veterinarian", 150], ["diagnosis", 5000], ["details", 10000], ["treatment", 5000], ["medication_name", 200], ["dose", 100], ["administration_route", 100]] as const) if (body[field] !== undefined && (typeof body[field] !== "string" || body[field].length > max)) return NextResponse.json({ error: `${field} is too long` }, { status: 400 });
  const current = await db.query("SELECT * FROM health_records WHERE id = $1 AND archived_at IS NULL", [id]);
  if (!current.rows[0]) return NextResponse.json({ error: "Health record not found" }, { status: 404 });
  const merged = { ...current.rows[0], ...body };
  const recordType = String(merged.record_type).trim();
  if (!healthRecordTypes.has(recordType)) return NextResponse.json({ error: "Invalid record type" }, { status: 400 });
  if (current.rows[0].status === "open" && body.status === "resolved" && ["illness", "injury", "treatment", "antibiotics", "anti_inflammatory"].includes(current.rows[0].record_type)) return NextResponse.json({ error: "Complete a clinical checkup to resolve this record" }, { status: 409 });
  const recordDate = String(merged.record_date).slice(0, 10);
  body = applyHealthProtocol(recordType, recordDate, body);
  const dates = { ...current.rows[0], ...body };
  if (administeredCareTypes.has(recordType) && (!dates.medication_name || !dates.dose || !dates.administration_route || !dates.veterinarian)) return NextResponse.json({ error: "Product, dose, route, and administrator are required for administered care" }, { status: 400 });
  const dateError = validateHealthDates({ recordDate: String(dates.record_date).slice(0, 10), nextDueDate: dates.next_due_date && String(dates.next_due_date).slice(0, 10), followUpDate: dates.follow_up_date && String(dates.follow_up_date).slice(0, 10), treatmentEndDate: dates.treatment_end_date && String(dates.treatment_end_date).slice(0, 10), withdrawalEndDate: dates.withdrawal_end_date && String(dates.withdrawal_end_date).slice(0, 10) });
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });
  if (body.livestock_id !== undefined) {
    const livestockId = Number(body.livestock_id);
    if (!Number.isSafeInteger(livestockId) || livestockId < 1) return NextResponse.json({ error: "Invalid livestock" }, { status: 400 });
    const animal = await db.query("SELECT 1 FROM livestock WHERE id = $1 AND archived_at IS NULL", [livestockId]);
    if (!animal.rowCount) return NextResponse.json({ error: "Livestock not found" }, { status: 404 });
    body.livestock_id = livestockId;
  }
  const fields = allowed.filter((field) => body[field] !== undefined);
  if (!fields.length) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  const values = fields.map((field) => body[field] === "" ? null : body[field]);
  const assignments = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`UPDATE health_records SET ${assignments}, updated_at = NOW() WHERE id = $${values.length + 1} AND archived_at IS NULL RETURNING *`, [...values, id]);
    if (!result.rows[0]) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Health record not found" }, { status: 404 }); }
    const affectedLivestock = [...new Set([current.rows[0].livestock_id, result.rows[0].livestock_id])];
    await client.query(`UPDATE livestock l SET health_status = CASE WHEN EXISTS (SELECT 1 FROM health_records h WHERE h.livestock_id = l.id AND h.archived_at IS NULL AND h.status = 'open' AND h.record_type IN ('illness', 'injury', 'treatment', 'antibiotics', 'anti_inflammatory')) THEN 'fair' WHEN l.health_status = 'fair' THEN 'good' ELSE l.health_status END, updated_at = NOW() WHERE l.id = ANY($1::bigint[])`, [affectedLivestock]);
    const tag = await client.query("SELECT tag_number FROM livestock WHERE id = $1", [result.rows[0].livestock_id]);
    await client.query("INSERT INTO activity_logs (user_id, action, entity_type, entity_id, title, detail) VALUES ($1, 'update', 'health', $2, $3, $4)", [auth.user.id, result.rows[0].id, `${result.rows[0].record_type}  -  ${tag.rows[0].tag_number}`, `${fields.length} field${fields.length === 1 ? "" : "s"} changed`]);
    await client.query("COMMIT");
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function DELETE(_request: NextRequest, context: Context) {
  const auth = await requireRole("veterinarian", "farm_aide"); if ("response" in auth) return auth.response;
  const id = await getId(context);
  if (!id) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query("UPDATE health_records SET archived_at = NOW(), updated_at = NOW() WHERE id = $1 AND archived_at IS NULL RETURNING id, livestock_id, record_type", [id]);
    if (!result.rows[0]) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Health record not found" }, { status: 404 }); }
    await client.query(`UPDATE livestock l SET health_status = CASE WHEN EXISTS (SELECT 1 FROM health_records h WHERE h.livestock_id = l.id AND h.archived_at IS NULL AND h.status = 'open' AND h.record_type IN ('illness', 'injury', 'treatment', 'antibiotics', 'anti_inflammatory')) THEN 'fair' WHEN l.health_status = 'fair' THEN 'good' ELSE l.health_status END, updated_at = NOW() WHERE l.id = $1`, [result.rows[0].livestock_id]);
    const tag = await client.query("SELECT tag_number FROM livestock WHERE id = $1", [result.rows[0].livestock_id]);
    await client.query("INSERT INTO activity_logs (user_id, action, entity_type, entity_id, title, detail) VALUES ($1, 'archive', 'health', $2, $3, 'Health record archived')", [auth.user.id, result.rows[0].id, `${result.rows[0].record_type}  -  ${tag.rows[0].tag_number}`]);
    await client.query("COMMIT");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
