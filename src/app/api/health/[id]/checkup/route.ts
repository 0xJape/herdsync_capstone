import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { addDays } from "@/lib/health-rules";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Context) {
  const auth = await requireRole("veterinarian", "farm_aide");
  if ("response" in auth) return auth.response;
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Invalid health record" }, { status: 400 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const outcome = body.outcome;
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const nextDate = typeof body.next_date === "string" ? body.next_date : "";
  if (outcome !== "monitoring" && outcome !== "recovered") return NextResponse.json({ error: "Invalid checkup outcome" }, { status: 400 });
  if (!notes || notes.length > 10000) return NextResponse.json({ error: "Checkup notes are required and must be at most 10000 characters" }, { status: 400 });
  const requiredNextDate = addDays(new Date().toISOString().slice(0, 10), 3);
  if (outcome === "monitoring" && nextDate !== requiredNextDate) return NextResponse.json({ error: `Next checkup must be ${requiredNextDate}` }, { status: 400 });

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const source = await client.query("SELECT h.*, l.tag_number FROM health_records h JOIN livestock l ON l.id = h.livestock_id WHERE h.id = $1 AND h.archived_at IS NULL FOR UPDATE", [id]);
    if (!source.rows[0]) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Health record not found" }, { status: 404 }); }
    const record = source.rows[0];
    if (record.status !== "open" || !["illness", "injury", "treatment", "antibiotics", "anti_inflammatory"].includes(record.record_type)) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Only active clinical records can receive checkups" }, { status: 409 });
    }
    const checkup = await client.query(
      "INSERT INTO health_records (livestock_id, record_type, record_date, diagnosis, details, treatment, follow_up_date, status, created_by_user_id, source_health_record_id) VALUES ($1, 'checkup', CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [record.livestock_id, outcome === "recovered" ? "Recovered" : "Still under monitoring", notes, `Follow-up for ${record.medication_name || record.treatment || record.record_type}`, outcome === "monitoring" ? nextDate : null, outcome === "recovered" ? "resolved" : "open", auth.user.id, record.id],
    );
    await client.query("UPDATE health_records SET status = $1, follow_up_date = $2, updated_at = NOW() WHERE id = $3", [outcome === "recovered" ? "resolved" : "open", outcome === "monitoring" ? nextDate : null, id]);
    if (outcome === "recovered") {
      await client.query("UPDATE livestock SET health_status = 'good', updated_at = NOW() WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM health_records WHERE livestock_id = $1 AND id <> $2 AND archived_at IS NULL AND status = 'open' AND record_type IN ('illness', 'injury', 'treatment', 'antibiotics', 'anti_inflammatory'))", [record.livestock_id, id]);
    } else {
      await client.query("UPDATE livestock SET health_status = 'fair', updated_at = NOW() WHERE id = $1", [record.livestock_id]);
    }
    await client.query("INSERT INTO activity_logs (user_id, action, entity_type, entity_id, title, detail) VALUES ($1, 'create', 'health', $2, $3, $4)", [auth.user.id, checkup.rows[0].id, `checkup · ${record.tag_number}`, outcome === "recovered" ? "Recovery checkup recorded" : `Monitoring checkup recorded; next checkup ${nextDate}`]);
    await client.query("COMMIT");
    return NextResponse.json(checkup.rows[0], { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}