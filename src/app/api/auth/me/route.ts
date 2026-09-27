import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    return user ? NextResponse.json(user) : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } catch (error) {
    console.error("Session lookup failed", error);
    return NextResponse.json({ error: "Session lookup failed" }, { status: 500 });
  }
}