import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { administeredCareTypes, applyHealthProtocol, healthRecordTypes, validateHealthDates } from "@/lib/health-rules";

const statuses = new Set(["open", "resolved"]);
const text = (value: unknown, max: number, required = false) => typeof value === "string" && (!required || value.trim()) && value.length <= max;
const date = (value: unknown, required = false) => (!required && (value === "" || value == null)) || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value));
const structuredText = [["medication_name", 200], ["dose", 100], ["administration_route", 100]] as const;
const structuredDates = ["treatment_start_date", "treatment_end_date", "withdrawal_end_date", "next_due_date"] as const;

export async function GET(request: NextRequest) {
  const auth = await requireRole("veterinarian", "farm_aide", "faculty"); if ("response" in auth) return auth.response;
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const livestockId = request.nextUrl.searchParams.get("livestock_id");
  const [result, pregnancies] = await Promise.all([
    db.query(`SELECT h.*, l.tag_number, l.name livestock_name, u.display_name added_by FROM health_records h JOIN livestock l ON l.id = h.livestock_id LEFT JOIN users u ON u.id = h.created_by_user_id WHERE ($1 = '' OR l.tag_number ILIKE '%' || $1 || '%' OR COALESCE(l.name, '') ILIKE '%' || $1 || '%' OR h.record_type ILIKE '%' || $1 || '%' OR COALESCE(h.diagnosis, '') ILIKE '%' || $1 || '%') AND ($2::bigint IS NULL OR h.livestock_id = $2) ORDER BY h.archived_at NULLS FIRST, h.record_date DESC, h.id DESC`, [search, livestockId || null]),
    db.query(`SELECT confirmation.id, confirmation.livestock_id, l.tag_number, l.name livestock_name,
        COALESCE(checkup.next_checkup_date, service.event_date) next_checkup_date,
        COALESCE(service.expected_calving_date, service.event_date + 283) expected_calving_date
      FROM breeding_records confirmation
      JOIN livestock l ON l.id = confirmation.livestock_id AND l.archived_at IS NULL
      JOIN LATERAL (SELECT id,event_date,expected_calving_date FROM breeding_records WHERE livestock_id=confirmation.livestock_id AND event_type IN ('natural_service','artificial_insemination') AND event_date<=confirmation.event_date AND archived_at IS NULL ORDER BY event_date DESC,id DESC LIMIT 1) service ON TRUE
      LEFT JOIN LATERAL (SELECT next_checkup_date FROM pregnancy_checkups WHERE livestock_id=confirmation.livestock_id AND service_id=service.id ORDER BY checkup_date DESC,id DESC LIMIT 1) checkup ON TRUE
      WHERE confirmation.event_type='pregnancy_confirmed' AND confirmation.pregnancy_status='pregnant' AND confirmation.archived_at IS NULL
        AND ($1 = '' OR l.tag_number ILIKE '%' || $1 || '%' OR COALESCE(l.name, '') ILIKE '%' || $1 || '%')
        AND ($2::bigint IS NULL OR confirmation.livestock_id = $2)
        AND NOT EXISTS (SELECT 1 FROM breeding_records terminal WHERE terminal.livestock_id=confirmation.livestock_id AND terminal.archived_at IS NULL AND terminal.event_type IN ('pregnancy_loss','pregnancy_negative','calving') AND (terminal.event_date>confirmation.event_date OR terminal.event_date=confirmation.event_date AND terminal.id>confirmation.id))`, [search, livestockId || null]),
  ]);
  return NextResponse.json({ records: result.rows, pregnancies: pregnancies.rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("veterinarian", "farm_aide"); if ("response" in auth) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const livestockIds = Array.isArray(body.livestock_ids) ? [...new Set(body.livestock_ids.map(Number))] : [Number(body.livestock_id)];
  if (!livestockIds.length || livestockIds.some((id) => !Number.isSafeInteger(id) || id < 1)) return NextResponse.json({ error: "Valid livestock is required" }, { status: 400 });
  const batchDoses = body.batch_doses && typeof body.batch_doses === "object" && !Array.isArray(body.batch_doses) ? body.batch_doses as Record<string, unknown> : null;
  const batchRoutes = body.batch_routes && typeof body.batch_routes === "object" && !Array.isArray(body.batch_routes) ? body.batch_routes as Record<string, unknown> : null;
  if (livestockIds.length > 1 && (!batchDoses || livestockIds.some((id) => !text(batchDoses[String(id)], 100, true)))) return NextResponse.json({ error: "A valid dose is required for every selected animal" }, { status: 400 });
  if (livestockIds.length > 1 && (!batchRoutes || livestockIds.some((id) => !text(batchRoutes[String(id)], 100, true)))) return NextResponse.json({ error: "A route of administration is required for every selected animal" }, { status: 400 });
  if (!text(body.record_type, 100, true)) return NextResponse.json({ error: "Record type is required and must be at most 100 characters" }, { status: 400 });
  if (!date(body.record_date, true) || !date(body.follow_up_date)) return NextResponse.json({ error: "Valid record and follow-up dates are required" }, { status: 400 });
  if (structuredDates.some((field) => !date(body[field]))) return NextResponse.json({ error: "Invalid treatment date" }, { status: 400 });
  if (!statuses.has(String(body.status))) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  for (const [field, max] of [["veterinarian", 150], ["diagnosis", 5000], ["details", 10000], ["treatment", 5000]] as const) if (!text(body[field] ?? "", max)) return NextResponse.json({ error: `${field} is too long` }, { status: 400 });
  for (const [field, max] of structuredText) if (!text(body[field] ?? "", max)) return NextResponse.json({ error: `${field} is too long` }, { status: 400 });
  const recordType = String(body.record_type).trim();
  if (!healthRecordTypes.has(recordType)) return NextResponse.json({ error: "Invalid record type" }, { status: 400 });
  const reviewedFromId = Number(body.reviewed_from_id);
  if (["antibiotics", "anti_inflammatory"].includes(recordType)) {
    const active = await db.query("SELECT id FROM health_records WHERE livestock_id = ANY($1::bigint[]) AND record_type = $2 AND status = 'open' AND archived_at IS NULL ORDER BY id DESC LIMIT 1", [livestockIds, recordType]);
    if (active.rows[0]) {
      if (!Number.isSafeInteger(reviewedFromId) || reviewedFromId !== Number(active.rows[0].id)) return NextResponse.json({ error: "Record a monitoring checkup before re-administering this treatment" }, { status: 409 });
      const review = await db.query("SELECT 1 FROM health_records WHERE source_health_record_id = $1 AND record_type = 'checkup' AND diagnosis = 'Still under monitoring' AND archived_at IS NULL", [reviewedFromId]);
      if (!review.rowCount) return NextResponse.json({ error: "A monitoring checkup is required before re-administration" }, { status: 409 });
    }
  }
  body = applyHealthProtocol(recordType, String(body.record_date), body);
  if (administeredCareTypes.has(recordType) && (!text(body.medication_name, 200, true) || (!batchDoses && !text(body.dose, 100, true)) || (!batchRoutes && !text(body.administration_route, 100, true)) || !text(body.veterinarian, 150, true))) return NextResponse.json({ error: "Product, dose, route, and administrator are required for administered care" }, { status: 400 });
  const dateError = validateHealthDates({ recordDate: String(body.record_date), nextDueDate: body.next_due_date as string, followUpDate: body.follow_up_date as string, treatmentEndDate: body.treatment_end_date as string, withdrawalEndDate: body.withdrawal_end_date as string });
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });
  const animals = await db.query("SELECT id, tag_number, status FROM livestock WHERE id = ANY($1::bigint[]) AND archived_at IS NULL", [livestockIds]);
  if (animals.rowCount !== livestockIds.length) return NextResponse.json({ error: "One or more livestock were not found" }, { status: 404 });
  if (animals.rows.some((animal) => animal.status !== "active")) return NextResponse.json({ error: "Inactive cattle cannot receive new health records" }, { status: 409 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    if (administeredCareTypes.has(recordType)) {
      await client.query(
        "INSERT INTO treatment_products (treatment_type, name) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [recordType, String(body.medication_name).trim()],
      );
    }
    const records = [];
    for (const livestockId of livestockIds) {
      const dose = batchDoses ? String(batchDoses[String(livestockId)]).trim() : body.dose;
      const administrationRoute = batchRoutes ? String(batchRoutes[String(livestockId)]).trim() : body.administration_route;
      await client.query("SELECT pg_advisory_xact_lock($1)", [livestockId]);
      const duplicate = await client.query(
        `SELECT id FROM health_records
         WHERE livestock_id = $1 AND record_type = $2 AND record_date = $3
           AND COALESCE(medication_name, '') = $4 AND COALESCE(dose, '') = $5
           AND COALESCE(administration_route, '') = $6 AND COALESCE(veterinarian, '') = $7
           AND archived_at IS NULL AND created_at >= NOW() - INTERVAL '30 seconds'
         LIMIT 1`,
        [livestockId, recordType, body.record_date, body.medication_name || "", dose || "", administrationRoute || "", body.veterinarian || ""],
      );
      if (duplicate.rowCount) throw new Error(`DUPLICATE_HEALTH_RECORD:${duplicate.rows[0].id}`);
      const values = [livestockId, String(body.record_type).trim(), body.record_date, body.diagnosis || null, body.details || null, body.treatment || null, body.medication_name || null, dose || null, administrationRoute || null, body.treatment_start_date || null, body.treatment_end_date || null, body.withdrawal_end_date || null, body.next_due_date || null, body.veterinarian || null, body.follow_up_date || null, body.status, auth.user.id, Number.isSafeInteger(reviewedFromId) ? reviewedFromId : null];
      const result = await client.query("INSERT INTO health_records (livestock_id, record_type, record_date, diagnosis, details, treatment, medication_name, dose, administration_route, treatment_start_date, treatment_end_date, withdrawal_end_date, next_due_date, veterinarian, follow_up_date, status, created_by_user_id, source_health_record_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *", values);
      records.push(result.rows[0]);
      if (["illness", "injury", "treatment", "antibiotics", "anti_inflammatory"].includes(recordType) && body.status === "open") {
        await client.query("UPDATE livestock SET health_status = 'fair', updated_at = NOW() WHERE id = $1", [livestockId]);
      }
      const tag = animals.rows.find((animal) => Number(animal.id) === Number(livestockId))?.tag_number;
      await client.query("INSERT INTO activity_logs (user_id, action, entity_type, entity_id, title, detail) VALUES ($1, 'create', 'health', $2, $3, $4)", [auth.user.id, result.rows[0].id, `${recordType}  -  ${tag}`, livestockIds.length > 1 ? "Batch health treatment added" : "Health record added"]);
    }
    await client.query("COMMIT");
    return NextResponse.json(livestockIds.length > 1 ? records : records[0], { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error && error.message.startsWith("DUPLICATE_HEALTH_RECORD:")) return NextResponse.json({ error: "This health record was already saved. Refresh before trying again." }, { status: 409 });
    throw error;
  } finally { client.release(); }
}
