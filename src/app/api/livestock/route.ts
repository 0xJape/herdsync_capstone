import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { cattleCategory, livestockFields, normalizeLivestock, validateLivestock, withCategory } from "@/lib/livestock";

export async function GET(request: NextRequest) {
  const auth = await requireRole("veterinarian", "farm_aide", "faculty"); if ("response" in auth) return auth.response;
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const result = await db.query(`SELECT * FROM livestock WHERE archived_at IS NULL AND ($1 = '' OR tag_number ILIKE '%' || $1 || '%' OR COALESCE(name, '') ILIKE '%' || $1 || '%' OR breed ILIKE '%' || $1 || '%') ORDER BY created_at DESC`, [search]);
  return NextResponse.json(result.rows.map(withCategory));
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("veterinarian", "farm_aide"); if ("response" in auth) return auth.response;
  const raw = await request.json() as Record<string, unknown>;
  const body = normalizeLivestock(raw);
  body.status = "active";
  body.acquisition_type ??= body.purchased === true ? "purchased" : "born_on_farm";
  const error = validateLivestock(body);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const pregnant = raw.currently_pregnant === true;
  if (pregnant && body.sex !== "female") return NextResponse.json({ error: "Only female cattle can be registered as pregnant" }, { status: 400 });
  if (pregnant && cattleCategory(body.sex, body.birth_date) === "Calf") return NextResponse.json({ error: "A calf cannot be registered as pregnant" }, { status: 400 });
  const mode = raw.pregnancy_date_mode;
  if (pregnant && !["service_date", "estimated_months"].includes(String(mode))) return NextResponse.json({ error: "Choose known service date or estimated months pregnant" }, { status: 400 });
  const today = new Date().toISOString().slice(0, 10);
  let serviceDate: string | null = null;
  if (pregnant && mode === "service_date") {
    serviceDate = typeof raw.pregnancy_service_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.pregnancy_service_date) && !Number.isNaN(Date.parse(`${raw.pregnancy_service_date}T00:00:00Z`)) ? raw.pregnancy_service_date : null;
    if (!serviceDate) return NextResponse.json({ error: "Valid service date is required" }, { status: 400 });
    if (serviceDate > today) return NextResponse.json({ error: "Service date cannot be in the future" }, { status: 400 });
  }
  if (pregnant && mode === "estimated_months") {
    const months = Number(raw.pregnancy_months);
    if (!Number.isInteger(months) || months < 1 || months > 9) return NextResponse.json({ error: "Estimated months pregnant must be from 1 to 9" }, { status: 400 });
    const estimated = new Date(`${today}T00:00:00Z`); estimated.setUTCMonth(estimated.getUTCMonth() - months); serviceDate = estimated.toISOString().slice(0, 10);
  }
  const sireId = !pregnant || raw.pregnancy_sire_id == null || raw.pregnancy_sire_id === "" ? null : Number(raw.pregnancy_sire_id);
  if (sireId !== null && (!Number.isSafeInteger(sireId) || sireId < 1)) return NextResponse.json({ error: "Invalid sire" }, { status: 400 });
  const values = livestockFields.map((field) => body[field] ?? null);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    if (sireId !== null) { const sire = await client.query("SELECT id FROM livestock WHERE id = $1 AND sex = 'male' AND status = 'active' AND archived_at IS NULL", [sireId]); if (!sire.rowCount) { await client.query("ROLLBACK"); return NextResponse.json({ error: "Active sire not found" }, { status: 400 }); } }
    const result = await client.query(`INSERT INTO livestock (${livestockFields.join(",")}) VALUES (${livestockFields.map((_, index) => `$${index + 1}`).join(",")}) RETURNING *`, values);
    const animal = result.rows[0];
    await client.query("INSERT INTO weight_records (livestock_id, measured_at, weight_kg, notes, recorded_by, created_by_user_id) VALUES ($1,$2,$3,'Initial registration',$4,$5)", [animal.id, today, animal.current_weight_kg, auth.user.display_name, auth.user.id]);
    if (animal.body_condition_score != null) await client.query("INSERT INTO body_condition_records (livestock_id, measured_at, score, notes, recorded_by, created_by_user_id) VALUES ($1,$2,$3,'Initial registration',$4,$5)", [animal.id, today, animal.body_condition_score, auth.user.display_name, auth.user.id]);
    if (pregnant && serviceDate) {
      const expected = new Date(`${serviceDate}T00:00:00Z`); expected.setUTCDate(expected.getUTCDate() + 283); const expectedCalvingDate = expected.toISOString().slice(0, 10);
      const service = await client.query("INSERT INTO breeding_records (livestock_id,event_type,event_date,sire_id,pregnancy_status,expected_calving_date,details,created_by_user_id) VALUES ($1,'natural_service',$2,$3,'pending',$4,$5,$6) RETURNING id", [animal.id, serviceDate, sireId, expectedCalvingDate, mode === "estimated_months" ? "Service date estimated at cattle registration" : "Service recorded at cattle registration", auth.user.id]);
      await client.query("INSERT INTO breeding_records (livestock_id,event_type,event_date,sire_id,pregnancy_status,expected_calving_date,details,performed_by,created_by_user_id,source_service_id) VALUES ($1,'pregnancy_confirmed',$2,$3,'pregnant',$4,$5,$6,$7,$8)", [animal.id, today, sireId, expectedCalvingDate, "Pregnancy reported at cattle registration", auth.user.display_name, auth.user.id, service.rows[0].id]);
    }
    await client.query("INSERT INTO activity_logs (user_id,action,entity_type,entity_id,title,detail) VALUES ($1,'create','livestock',$2,$3,$4)", [auth.user.id, animal.id, `Registered ${animal.tag_number}`, `${animal.breed} cattle record added`]);
    await client.query("COMMIT");
    return NextResponse.json(withCategory(animal), { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "Tag number already exists" }, { status: 409 });
    throw error;
  } finally { client.release(); }
}
