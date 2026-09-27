import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { livestockFields, normalizeLivestock, validateLivestock, withCategory } from "@/lib/livestock";

const allowed = ["tag_number", ...livestockFields] as const;
type Context = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Context) {
  const auth = await requireRole("veterinarian", "farm_aide", "faculty"); if ("response" in auth) return auth.response;
  const { id } = await params;
  const result = await db.query("SELECT * FROM livestock WHERE id = $1 AND archived_at IS NULL", [id]);
  if (!result.rows[0]) return NextResponse.json({ error: "Livestock not found" }, { status: 404 });
  const relatives = await db.query("SELECT id, tag_number, name, sex, breed, birth_date, status FROM livestock WHERE archived_at IS NULL AND (id = $1 OR id = $2 OR sire_id = $3 OR dam_id = $3) ORDER BY birth_date", [result.rows[0].sire_id, result.rows[0].dam_id, id]);
  const animal = withCategory(result.rows[0]);
  return NextResponse.json({ ...animal, pedigree: { sire: relatives.rows.find((item) => item.id === result.rows[0].sire_id) ?? null, dam: relatives.rows.find((item) => item.id === result.rows[0].dam_id) ?? null, offspring: relatives.rows.filter((item) => item.id !== result.rows[0].sire_id && item.id !== result.rows[0].dam_id) } });
}

export async function PUT(request: NextRequest, { params }: Context) {
  const auth = await requireRole("veterinarian", "farm_aide"); if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = normalizeLivestock(await request.json() as Record<string, unknown>);
  const entries = allowed.filter((field) => field in body).map((field) => [field, body[field]] as const);
  if (!entries.length) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  const existing = await db.query("SELECT * FROM livestock WHERE id = $1 AND archived_at IS NULL", [id]);
  if (!existing.rows[0]) return NextResponse.json({ error: "Livestock not found" }, { status: 404 });
  const merged = { ...existing.rows[0], ...body };
  const error = validateLivestock(merged);
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (body.status && ["sold", "culled", "transferred"].includes(String(body.status))) {
    const restriction = await db.query("SELECT medication_name, withdrawal_end_date::text FROM health_records WHERE livestock_id = $1 AND archived_at IS NULL AND withdrawal_end_date >= CURRENT_DATE ORDER BY withdrawal_end_date DESC LIMIT 1", [id]);
    if (restriction.rows[0]) return NextResponse.json({ error: `${restriction.rows[0].medication_name || "Treatment"} restricts this action through ${restriction.rows[0].withdrawal_end_date}` }, { status: 409 });
  }
  try {
    const result = await db.query(`UPDATE livestock SET ${entries.map(([field], index) => `${field} = $${index + 1}`).join(", ")}, updated_at = NOW() WHERE id = $${entries.length + 1} AND archived_at IS NULL RETURNING *`, [...entries.map(([, value]) => value), id]);
    if (result.rows[0]) await logActivity(auth.user.id, "update", "livestock", result.rows[0].id, `Updated ${result.rows[0].tag_number}`, `${entries.length} field${entries.length === 1 ? "" : "s"} changed`);
    return result.rows[0] ? NextResponse.json(withCategory(result.rows[0])) : NextResponse.json({ error: "Livestock not found" }, { status: 404 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "Tag number already exists" }, { status: 409 });
    throw error;
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const auth = await requireRole("veterinarian", "farm_aide"); if ("response" in auth) return auth.response;
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Archive reason is required" }, { status: 400 }); }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason || reason.length > 1000) return NextResponse.json({ error: "Archive reason is required and must be at most 1000 characters" }, { status: 400 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const animal = await client.query("SELECT id, tag_number FROM livestock WHERE id = $1 AND archived_at IS NULL FOR UPDATE", [id]);
    if (!animal.rows[0]) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Livestock not found" }, { status: 404 }); }
    const restriction = await client.query("SELECT medication_name, withdrawal_end_date::text FROM health_records WHERE livestock_id = $1 AND archived_at IS NULL AND withdrawal_end_date >= CURRENT_DATE ORDER BY withdrawal_end_date DESC LIMIT 1", [id]);
    if (restriction.rows[0]) { await client.query("ROLLBACK"); return NextResponse.json({ error: `${restriction.rows[0].medication_name || "Treatment"} prevents archival through ${restriction.rows[0].withdrawal_end_date}` }, { status: 409 }); }
    await client.query("UPDATE livestock SET archived_at = NOW(), archive_reason = $1, archived_by_user_id = $2, updated_at = NOW() WHERE id = $3", [reason, auth.user.id, id]);
    await client.query("INSERT INTO activity_logs (user_id, action, entity_type, entity_id, title, detail) VALUES ($1, 'archive', 'livestock', $2, $3, $4)", [auth.user.id, animal.rows[0].id, `Archived ${animal.rows[0].tag_number}`, reason]);
    await client.query("COMMIT");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
