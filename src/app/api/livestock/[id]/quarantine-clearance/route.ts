import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Context) {
  const auth = await requireRole("veterinarian");
  if ("response" in auth) return auth.response;
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Invalid livestock" }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const outcome = body.outcome;
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const nextDate = typeof body.next_date === "string" ? body.next_date : "";
  const today = new Date().toISOString().slice(0, 10);
  if (!['cleared', 'extended', 'treatment'].includes(String(outcome))) return NextResponse.json({ error: "Invalid review decision" }, { status: 400 });
  if (!notes || notes.length > 10000) return NextResponse.json({ error: "Clinical observations are required and must be at most 10000 characters" }, { status: 400 });
  if (outcome !== "cleared" && (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate) || nextDate <= today)) return NextResponse.json({ error: "Choose a future review date" }, { status: 400 });

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const livestock = await client.query("SELECT id, tag_number, quarantine_status FROM livestock WHERE id = $1 AND archived_at IS NULL FOR UPDATE", [id]);
    if (!livestock.rows[0]) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Livestock not found" }, { status: 404 }); }
    if (livestock.rows[0].quarantine_status !== "pending_clearance") { await client.query("ROLLBACK"); return NextResponse.json({ error: "Livestock is not awaiting veterinary clearance" }, { status: 409 }); }

    const source = await client.query("SELECT id FROM health_records WHERE livestock_id = $1 AND record_type = 'quarantine_clearance' AND status = 'open' AND archived_at IS NULL ORDER BY id DESC LIMIT 1 FOR UPDATE", [id]);
    const decision = outcome === "cleared" ? "Cleared for herd admission" : outcome === "extended" ? "Quarantine extended" : "Treatment required before admission";
    const review = await client.query(
      "INSERT INTO health_records (livestock_id, record_type, record_date, diagnosis, details, treatment, veterinarian, follow_up_date, status, created_by_user_id, source_health_record_id) VALUES ($1, 'quarantine_review', CURRENT_DATE, $2, $3, $4, $5, $6, 'resolved', $7, $8) RETURNING id",
      [id, decision, notes, decision, auth.user.display_name, outcome === "cleared" ? null : nextDate, auth.user.id, source.rows[0]?.id ?? null],
    );
    if (source.rows[0]) await client.query("UPDATE health_records SET status = 'resolved', follow_up_date = NULL, updated_at = NOW() WHERE id = $1", [source.rows[0].id]);
    if (outcome === "cleared") {
      await client.query("UPDATE livestock SET quarantine_status = 'released', updated_at = NOW() WHERE id = $1", [id]);
    } else {
      await client.query("INSERT INTO health_records (livestock_id, record_type, record_date, diagnosis, details, follow_up_date, status, created_by_user_id, source_health_record_id) VALUES ($1, 'quarantine_clearance', CURRENT_DATE, 'Admission veterinary review', $2, $3, 'open', $4, $5)", [id, decision, nextDate, auth.user.id, review.rows[0].id]);
    }
    await client.query("INSERT INTO activity_logs (user_id, action, entity_type, entity_id, title, detail) VALUES ($1, 'create', 'health', $2, $3, $4)", [auth.user.id, review.rows[0].id, `admission review - ${livestock.rows[0].tag_number}`, decision]);
    await client.query("COMMIT");
    return NextResponse.json({ outcome, next_date: outcome === "cleared" ? null : nextDate }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
