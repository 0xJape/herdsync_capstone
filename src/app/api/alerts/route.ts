import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

const schedule = `
  SELECT h.id, h.livestock_id, h.record_type, h.follow_up_date due_date, 'follow_up' alert_type, 'Clinical follow-up' title
  FROM health_records h WHERE h.archived_at IS NULL AND h.status = 'open' AND h.follow_up_date IS NOT NULL
  UNION ALL
  SELECT h.id, h.livestock_id, h.record_type, h.next_due_date, 'next_due', CASE h.record_type WHEN 'vitamins' THEN 'Vitamin care due' WHEN 'vaccination' THEN 'Vaccination due' ELSE 'Deworming due' END
  FROM health_records h WHERE h.archived_at IS NULL AND h.record_type IN ('vaccination','vitamins','dewormer') AND h.next_due_date IS NOT NULL
  UNION ALL
  SELECT h.id, h.livestock_id, h.record_type, h.withdrawal_end_date, 'withdrawal_end', 'Withdrawal ends'
  FROM health_records h WHERE h.archived_at IS NULL AND h.withdrawal_end_date >= CURRENT_DATE`;

export async function GET() {
  const auth = await requireRole("veterinarian", "farm_aide");
  if ("response" in auth) return auth.response;
  const result = await db.query(`WITH schedule AS (${schedule})
    SELECT s.id AS "healthRecordId", s.livestock_id AS "livestockId", l.tag_number AS "tagNumber",
      s.record_type AS "recordType", s.alert_type AS "alertType", s.title, s.due_date::text AS "dueDate",
      CASE WHEN s.due_date < CURRENT_DATE THEN 'overdue' WHEN s.due_date = CURRENT_DATE THEN 'today'
        WHEN s.due_date <= CURRENT_DATE + 7 THEN 'upcoming' ELSE 'later' END status,
      a.acknowledged_at AS "acknowledgedAt"
    FROM schedule s JOIN livestock l ON l.id = s.livestock_id
    LEFT JOIN alert_acknowledgements a ON a.user_id = $1 AND a.health_record_id = s.id AND a.alert_type = s.alert_type
    WHERE l.archived_at IS NULL ORDER BY s.due_date, s.id DESC`, [auth.user.id]);
  return NextResponse.json(result.rows, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("veterinarian", "farm_aide");
  if ("response" in auth) return auth.response;
  const body = await request.json() as Record<string, unknown>;
  const healthRecordId = Number(body.healthRecordId);
  const alertType = String(body.alertType ?? "");
  if (!Number.isSafeInteger(healthRecordId) || healthRecordId < 1 || !/^[a-z_]{3,40}$/.test(alertType)) return NextResponse.json({ error: "Invalid alert" }, { status: 400 });
  const exists = await db.query("SELECT id FROM health_records WHERE id = $1 AND archived_at IS NULL", [healthRecordId]);
  if (!exists.rowCount) return NextResponse.json({ error: "Alert source not found" }, { status: 404 });
  await db.query(`INSERT INTO alert_acknowledgements (user_id, health_record_id, alert_type) VALUES ($1,$2,$3)
    ON CONFLICT (user_id, health_record_id, alert_type) DO UPDATE SET acknowledged_at = NOW()`, [auth.user.id, healthRecordId, alertType]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole("veterinarian", "farm_aide");
  if ("response" in auth) return auth.response;
  const healthRecordId = Number(request.nextUrl.searchParams.get("healthRecordId"));
  const alertType = request.nextUrl.searchParams.get("alertType") ?? "";
  if (!Number.isSafeInteger(healthRecordId) || healthRecordId < 1 || !/^[a-z_]{3,40}$/.test(alertType)) return NextResponse.json({ error: "Invalid alert" }, { status: 400 });
  await db.query("DELETE FROM alert_acknowledgements WHERE user_id = $1 AND health_record_id = $2 AND alert_type = $3", [auth.user.id, healthRecordId, alertType]);
  return NextResponse.json({ ok: true });
}
