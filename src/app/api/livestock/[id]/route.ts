import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { livestockFields, normalizeLivestock, validateLivestock, withCategory } from "@/lib/livestock";
import { releaseExpiredQuarantines } from "@/lib/quarantine";

const allowed = ["tag_number", ...livestockFields.filter((field) => field !== "quarantine_status")] as const;
type Context = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Context) {
  const auth = await requireRole("veterinarian", "farm_aide", "faculty"); if ("response" in auth) return auth.response;
  const { id } = await params;
  await releaseExpiredQuarantines(id);
  const result = await db.query("SELECT * FROM livestock WHERE id = $1", [id]);
  if (!result.rows[0]) return NextResponse.json({ error: "Livestock not found" }, { status: 404 });
  const relatives = await db.query("SELECT id, tag_number, name, sex, breed, birth_date, status, sire_id, dam_id FROM livestock WHERE archived_at IS NULL AND (id = $1 OR id = $2 OR sire_id = $3 OR dam_id = $3 OR id IN (SELECT sire_id FROM livestock WHERE id IN ($1, $2) UNION SELECT dam_id FROM livestock WHERE id IN ($1, $2))) ORDER BY birth_date", [result.rows[0].sire_id, result.rows[0].dam_id, id]);
  const animal = withCategory({ ...result.rows[0], status: result.rows[0].archived_at ? "archived" : result.rows[0].status });
  const sameId = (left: unknown, right: unknown) => left != null && right != null && String(left) === String(right);
  const relative = (relativeId: unknown) => relatives.rows.find((item) => sameId(item.id, relativeId)) ?? null;
  const parent = (relativeId: unknown) => { const item = relative(relativeId); return item ? { ...item, sire: relative(item.sire_id), dam: relative(item.dam_id) } : null; };
  return NextResponse.json({ ...animal, pedigree: { sire: parent(result.rows[0].sire_id), dam: parent(result.rows[0].dam_id), offspring: relatives.rows.filter((item) => sameId(item.sire_id, id) || sameId(item.dam_id, id)) } });
}

export async function PUT(request: NextRequest, { params }: Context) {
  const auth = await requireRole("veterinarian", "farm_aide"); if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = normalizeLivestock(await request.json() as Record<string, unknown>);
  const entries = allowed.filter((field) => field in body).map((field) => [field, body[field]] as const);
  if (!entries.length) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  const existing = await db.query("SELECT * FROM livestock WHERE id = $1 AND archived_at IS NULL", [id]);
  if (!existing.rows[0]) return NextResponse.json({ error: "Livestock not found" }, { status: 404 });
  if (!["active", "culled"].includes(existing.rows[0].status) && entries.some(([field]) => field !== "photo_urls")) return NextResponse.json({ error: "This cattle profile is view-only" }, { status: 409 });
  const merged = { ...existing.rows[0], ...body };
  const photoOnly = entries.every(([field]) => field === "photo_urls");
  const error = photoOnly
    ? (!Array.isArray(body.photo_urls) || body.photo_urls.length > 3 || body.photo_urls.some((url) => typeof url !== "string" || !url.startsWith("/uploads/cattle/")) ? "Up to 3 valid cattle photos are allowed" : null)
    : validateLivestock(merged);
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (body.status && ["sold", "culled", "transferred_out"].includes(String(body.status))) {
    const restriction = await db.query("SELECT medication_name, withdrawal_end_date::text FROM health_records WHERE livestock_id = $1 AND archived_at IS NULL AND withdrawal_end_date >= CURRENT_DATE ORDER BY withdrawal_end_date DESC LIMIT 1", [id]);
    if (restriction.rows[0]) return NextResponse.json({ error: `${restriction.rows[0].medication_name || "Treatment"} restricts this action through ${restriction.rows[0].withdrawal_end_date}` }, { status: 409 });
  }
  try {
    const values = entries.map(([field, value]) => field === "photo_urls" ? JSON.stringify(value) : value);
    const result = await db.query(`UPDATE livestock SET ${entries.map(([field], index) => `${field} = $${index + 1}`).join(", ")}, updated_at = NOW() WHERE id = $${entries.length + 1} AND archived_at IS NULL RETURNING *`, [...values, id]);
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
  const action = typeof body.action === "string" ? body.action : "archive";
  if (!(["sold", "deceased", "culled", "transferred_out", "archive"] as string[]).includes(action)) return NextResponse.json({ error: "Invalid record outcome" }, { status: 400 });
  if (!reason || reason.length > 1000) return NextResponse.json({ error: "Reason is required and must be at most 1000 characters" }, { status: 400 });
  const eventDate = typeof body.date === "string" ? body.date : "";
  if (action !== "archive" && (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || eventDate > new Date().toISOString().slice(0, 10))) return NextResponse.json({ error: "Valid lifecycle date is required" }, { status: 400 });
  const buyer = typeof body.buyer === "string" ? body.buyer.trim() : "";
  const price = Number(body.price);
  if (action === "sold" && (!buyer || buyer.length > 150 || !Number.isFinite(price) || price <= 0)) return NextResponse.json({ error: "Buyer and valid sale price are required" }, { status: 400 });
  const deathPhotoUrls = Array.isArray(body.photo_urls) ? body.photo_urls.filter((url): url is string => typeof url === "string") : [];
  if (action === "deceased" && (deathPhotoUrls.length > 3 || deathPhotoUrls.some((url) => !/^\/uploads\/(?:cattle|breeding|livestock)\/[a-f0-9-]+\.(?:jpg|png|webp)$/.test(url)))) return NextResponse.json({ error: "Death photos must contain at most 3 valid uploaded images" }, { status: 400 });
  const lifecycleReason = action === "sold" ? `Sale date: ${eventDate}; Buyer: ${buyer}; Sale price: ₱${price.toFixed(2)}; Reason: ${reason}` : action === "archive" ? reason : `Date: ${eventDate}; Reason: ${reason}`;
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const animal = await client.query("SELECT id, tag_number FROM livestock WHERE id = $1 AND archived_at IS NULL FOR UPDATE", [id]);
    if (!animal.rows[0]) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Livestock not found" }, { status: 404 }); }
    if (["sold", "culled", "transferred_out"].includes(action)) {
      const restriction = await client.query("SELECT medication_name, withdrawal_end_date::text FROM health_records WHERE livestock_id = $1 AND archived_at IS NULL AND withdrawal_end_date >= CURRENT_DATE ORDER BY withdrawal_end_date DESC LIMIT 1", [id]);
      if (restriction.rows[0]) { await client.query("ROLLBACK"); return NextResponse.json({ error: `${restriction.rows[0].medication_name || "Treatment"} prevents this lifecycle action through ${restriction.rows[0].withdrawal_end_date}` }, { status: 409 }); }
    }
    if (action === "archive") await client.query("UPDATE livestock SET archived_at = NOW(), archive_reason = $1, archived_by_user_id = $2, updated_at = NOW() WHERE id = $3", [lifecycleReason, auth.user.id, id]);
    else if (action === "deceased") await client.query("UPDATE livestock SET status = $1, archive_reason = $2, death_date = $3, death_reason = $4, death_photo_urls = $5::jsonb, archived_by_user_id = $6, updated_at = NOW() WHERE id = $7", [action, lifecycleReason, eventDate, reason, JSON.stringify(deathPhotoUrls), auth.user.id, id]);
    else await client.query("UPDATE livestock SET status = $1, archive_reason = $2, archived_by_user_id = $3, updated_at = NOW() WHERE id = $4", [action, lifecycleReason, auth.user.id, id]);
    await client.query("INSERT INTO activity_logs (user_id, action, entity_type, entity_id, title, detail) VALUES ($1, $2, 'livestock', $3, $4, $5)", [auth.user.id, action === "archive" ? "archive" : "update", animal.rows[0].id, action === "archive" ? `Archived ${animal.rows[0].tag_number}` : `Marked ${animal.rows[0].tag_number} ${action}`, lifecycleReason]);
    await client.query("COMMIT");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
