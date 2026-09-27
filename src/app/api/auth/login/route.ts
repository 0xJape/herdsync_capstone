import { NextRequest, NextResponse } from "next/server";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";

const INVALID_PASSWORD_HASH = "scrypt:00000000000000000000000000000000:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    if (email.length > 254 || password.length > 1024) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    const result = await db.query("SELECT id, password_hash, role FROM users WHERE email = $1 AND active", [email]);
    const user = result.rows[0];
    const passwordValid = await verifyPassword(password, user?.password_hash ?? INVALID_PASSWORD_HASH);
    if (!user || !passwordValid) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expires);
    return NextResponse.json({ ok: true, role: user.role });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    console.error("Login failed", error);
    return NextResponse.json({ error: "Sign in failed" }, { status: 500 });
  }
}