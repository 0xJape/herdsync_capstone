import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

type Context = { params: Promise<{ id: string }> };
const validDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const validText = (value: unknown, max: number) => value == null || (typeof value === "string" && value.length <= max);
const getId = async ({ params }: Context) => { const id = Number((await params).id); return Number.isSafeInteger(id) && id > 0 ? id : null; };

export async function GET(_request: NextRequest, context: Context) {
  const auth = await requireRole("veterinarian", "farm_aide", "faculty"); if ("response" in auth) return auth.response;
  const id = await getId(context); if (!id) return NextResponse.json({ error: "Invalid livestock ID" }, { status: 400 });
  const result = await db.query("SELECT w.*, u.display_name added_by FROM weight_records w LEFT JOIN users u ON u.id = w.created_by_user_id WHERE w.livestock_id = $1 AND w.archived_at IS NULL ORDER BY w.measured_at DESC, w.id DESC", [id]);
  return NextResponse.json(result.rows);
}

export async function POST(request: NextRequest, context: Context) {
  const auth = await requireRole("veterinarian", "farm_aide"); if ("response" in auth) return auth.response;
  const id = await getId(context); if (!id) return NextResponse.json({ error: "Invalid livestock ID" }, { status: 400 });
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const weight = Number(body.weight_kg);
  if (!validDate(body.measured_at)) return NextResponse.json({ error: "Valid measurement date is required" }, { status: 400 });
  if (!Number.isFinite(weight) || weight <= 0) return NextResponse.json({ error: "Weight must be greater than 0 kg" }, { status: 400 });
  if (!validText(body.notes, 10000) || !validText(body.recorded_by, 150)) return NextResponse.json({ error: "Text field is too long" }, { status: 400 });
  const animal = await db.query("SELECT tag_number FROM livestock WHERE id = $1 AND archived_at IS NULL", [id]);
  if (!animal.rows[0]) return NextResponse.json({ error: "Livestock not found" }, { status: 404 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query("INSERT INTO weight_records (livestock_id, measured_at, weight_kg, notes, recorded_by, created_by_user_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *", [id, body.measured_at, weight, body.notes || null, body.recorded_by || null, auth.user.id]);
    await client.query("UPDATE livestock SET current_weight_kg = $1, updated_at = NOW() WHERE id = $2", [weight, id]);
    await client.query("COMMIT");
    await logActivity(auth.user.id, "create", "weight", result.rows[0].id, `Weight  -  ${animal.rows[0].tag_number}`, `${weight} kg recorded`);
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}