import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireRole("veterinarian", "farm_aide");
  if ("response" in auth) return auth.response;
  const result = await db.query(
    "SELECT treatment_type, name FROM treatment_products WHERE active = TRUE ORDER BY treatment_type, name",
  );
  return NextResponse.json(result.rows);
}