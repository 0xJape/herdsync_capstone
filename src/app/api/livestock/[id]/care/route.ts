import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const auth = await requireRole("veterinarian", "farm_aide", "faculty");
  if ("response" in auth) return auth.response;
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Invalid livestock ID" }, { status: 400 });
  const result = await db.query(
    "SELECT id, care_type, due_date, notes FROM calf_care_plans WHERE livestock_id = $1 AND status = 'pending' ORDER BY due_date, id",
    [id],
  );
  return NextResponse.json(result.rows);
}
