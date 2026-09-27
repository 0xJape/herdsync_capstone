import { NextResponse } from "next/server";
import { deleteCurrentSession } from "@/lib/auth";

export async function POST() {
  try {
    await deleteCurrentSession();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Logout failed", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}