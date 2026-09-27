import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { livestockFields, normalizeLivestock, validateLivestock, withCategory } from "@/lib/livestock";

export async function GET(request: NextRequest) {
  const auth = await requireRole("veterinarian", "farm_aide", "faculty"); if ("response" in auth) return auth.response;
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const result = await db.query(`SELECT * FROM livestock WHERE archived_at IS NULL AND ($1 = '' OR tag_number ILIKE '%' || $1 || '%' OR COALESCE(name, '') ILIKE '%' || $1 || '%' OR breed ILIKE '%' || $1 || '%') ORDER BY created_at DESC`, [search]);
  return NextResponse.json(result.rows.map(withCategory));
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("veterinarian", "farm_aide"); if ("response" in auth) return auth.response;
  const body = normalizeLivestock(await request.json() as Record<string, unknown>);
  body.status ??= "active";
  const error = validateLivestock(body);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const values = livestockFields.map((field) => body[field] ?? null);
  try {
    const result = await db.query(`INSERT INTO livestock (${livestockFields.join(",")}) VALUES (${livestockFields.map((_, index) => `$${index + 1}`).join(",")}) RETURNING *`, values);
    const animal = result.rows[0];
    await logActivity(auth.user.id, "create", "livestock", animal.id, `Registered ${animal.tag_number}`, `${animal.breed} cattle record added`);
    return NextResponse.json(withCategory(animal), { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "Tag number already exists" }, { status: 409 });
    throw error;
  }
}
