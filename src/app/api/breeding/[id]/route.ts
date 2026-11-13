import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { addDays, dateString } from "@/lib/breeding-rules";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const auth = await requireRole("veterinarian", "farm_aide", "faculty");
  if ("response" in auth) return auth.response;

  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Invalid breeding record ID" }, { status: 400 });

  const result = await db.query(`SELECT b.*, l.tag_number, l.name livestock_name, l.breed dam_breed,
      s.tag_number sire_tag_number, s.name sire_name, s.breed sire_breed, u.display_name added_by
    FROM breeding_records b
    JOIN livestock l ON l.id = b.livestock_id
    LEFT JOIN livestock s ON s.id = b.sire_id
    LEFT JOIN users u ON u.id = b.created_by_user_id
    WHERE b.id = $1 AND b.archived_at IS NULL AND l.archived_at IS NULL`, [id]);
  const record = result.rows[0];
  if (!record) return NextResponse.json({ error: "Breeding record not found" }, { status: 404 });

  const related = await db.query(`SELECT id, event_type, event_date, pregnancy_status, source_service_id, details, performed_by
    FROM breeding_records WHERE livestock_id = $1 AND archived_at IS NULL
    ORDER BY event_date DESC, id DESC`, [record.livestock_id]);
  const serviceDate = dateString(record.event_date);
  return NextResponse.json({
    record: { ...record, pregnancy_check_due_date: addDays(serviceDate, 45) },
    related: related.rows,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request, { params }: Context) {
  const auth = await requireRole("veterinarian", "farm_aide");
  if ("response" in auth) return auth.response;

  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Invalid breeding record ID" }, { status: 400 });
  const body = await request.json() as Record<string, unknown>;
  const eventDate = typeof body.event_date === "string" ? body.event_date : "";
  const performedBy = typeof body.performed_by === "string" ? body.performed_by.trim() : "";
  const details = typeof body.details === "string" ? body.details.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || eventDate > new Date().toISOString().slice(0, 10)) return NextResponse.json({ error: "Valid breeding date is required" }, { status: 400 });
  if (performedBy.length > 150 || details.length > 10000) return NextResponse.json({ error: "Handler or notes exceed allowed length" }, { status: 400 });

  const result = await db.query(`UPDATE breeding_records SET event_date = $1, performed_by = $2, details = $3, updated_at = NOW()
    WHERE id = $4 AND archived_at IS NULL AND event_type IN ('natural_service', 'artificial_insemination') RETURNING id`, [eventDate, performedBy || null, details || null, id]);
  if (!result.rows[0]) return NextResponse.json({ error: "Breeding record not found" }, { status: 404 });
  await logActivity(auth.user.id, "update", "breeding", id, `Updated breeding session ${id}`, "Breeding date, handler, or notes changed");
  return NextResponse.json({ id });
}
