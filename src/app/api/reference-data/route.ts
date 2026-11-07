import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";

const kinds = { breed: "cattle_breeds", medicine: "treatment_products" } as const;

export async function GET() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const [breeds, medicines] = await Promise.all([
    db.query("SELECT id, name, active FROM cattle_breeds ORDER BY active DESC, name"),
    db.query("SELECT id, treatment_type, name, active FROM treatment_products ORDER BY active DESC, treatment_type, name"),
  ]);
  return NextResponse.json({ breeds: breeds.rows, medicines: medicines.rows, canManage: auth.user.role === "veterinarian" });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  if (auth.user.role !== "veterinarian") return NextResponse.json({ error: "Veterinarian access required" }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const kind = String(body.kind ?? "") as keyof typeof kinds;
  const name = String(body.name ?? "").trim();
  const treatmentType = String(body.treatmentType ?? "").trim();
  if (!(kind in kinds) || !name || name.length > 200) return NextResponse.json({ error: "Valid type and name required" }, { status: 400 });
  if (kind === "medicine" && (!treatmentType || treatmentType.length > 100)) return NextResponse.json({ error: "Treatment type required" }, { status: 400 });
  try {
    const result = kind === "breed"
      ? await db.query("INSERT INTO cattle_breeds (name, created_by_user_id) VALUES ($1,$2) RETURNING id, name, active", [name, auth.user.id])
      : await db.query("INSERT INTO treatment_products (treatment_type, name) VALUES ($1,$2) RETURNING id, treatment_type, name, active", [treatmentType, name]);
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: `${kind === "breed" ? "Breed" : "Medicine"} already exists` }, { status: 409 });
    throw error;
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  if (auth.user.role !== "veterinarian") return NextResponse.json({ error: "Veterinarian access required" }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const kind = String(body.kind ?? "") as keyof typeof kinds;
  const id = Number(body.id);
  if (!(kind in kinds) || !Number.isInteger(id) || id < 1 || typeof body.active !== "boolean") return NextResponse.json({ error: "Valid reference and status required" }, { status: 400 });
  const result = await db.query(`UPDATE ${kinds[kind]} SET active = $1 WHERE id = $2 RETURNING id`, [body.active, id]);
  if (!result.rowCount) return NextResponse.json({ error: "Reference not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}