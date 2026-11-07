import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };
const getId = async ({ params }: Context) => { const id = Number((await params).id); return Number.isSafeInteger(id) && id > 0 ? id : null; };
const validDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && value <= new Date().toISOString().slice(0, 10);

export async function GET(_request: NextRequest, context: Context) {
  const auth = await requireRole("veterinarian", "farm_aide", "faculty"); if ("response" in auth) return auth.response;
  const id = await getId(context); if (!id) return NextResponse.json({ error: "Invalid livestock ID" }, { status: 400 });
  const result = await db.query("SELECT b.*, u.display_name added_by FROM body_condition_records b LEFT JOIN users u ON u.id = b.created_by_user_id WHERE b.livestock_id = $1 ORDER BY b.measured_at DESC, b.id DESC", [id]);
  return NextResponse.json(result.rows);
}

export async function POST(request: NextRequest, context: Context) {
  const auth = await requireRole("veterinarian", "farm_aide"); if ("response" in auth) return auth.response;
  const id = await getId(context); if (!id) return NextResponse.json({ error: "Invalid livestock ID" }, { status: 400 });
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const score = Number(body.score);
  if (!validDate(body.measured_at)) return NextResponse.json({ error: "Valid non-future measurement date is required" }, { status: 400 });
  if (!Number.isInteger(score) || score < 1 || score > 6) return NextResponse.json({ error: "BCS must be a whole number from 1 to 6" }, { status: 400 });
  if (typeof body.notes === "string" && body.notes.length > 10000 || typeof body.recorded_by === "string" && body.recorded_by.length > 150) return NextResponse.json({ error: "Text field is too long" }, { status: 400 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const animal = await client.query("SELECT tag_number FROM livestock WHERE id = $1 AND archived_at IS NULL FOR UPDATE", [id]);
    if (!animal.rows[0]) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Livestock not found" }, { status: 404 }); }
    const result = await client.query("INSERT INTO body_condition_records (livestock_id, measured_at, score, notes, recorded_by, created_by_user_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *", [id, body.measured_at, score, body.notes || null, body.recorded_by || null, auth.user.id]);
    await client.query("UPDATE livestock SET body_condition_score = $1, updated_at = NOW() WHERE id = $2", [score, id]);
    await client.query("COMMIT");
    await logActivity(auth.user.id, "create", "livestock", id, `BCS  -  ${animal.rows[0].tag_number}`, `Score ${score}/6 recorded`);
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}