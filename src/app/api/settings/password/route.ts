import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hashPassword, hashSessionToken, requireApiUser, SESSION_COOKIE, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(request: NextRequest) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const body = await request.json() as Record<string, unknown>;
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  if (newPassword.length < 10) return NextResponse.json({ error: "New password must be at least 10 characters." }, { status: 400 });
  if (currentPassword === newPassword) return NextResponse.json({ error: "New password must differ from current password." }, { status: 400 });
  const result = await db.query("SELECT password_hash FROM users WHERE id = $1 AND active", [auth.user.id]);
  if (!result.rows[0] || !await verifyPassword(currentPassword, result.rows[0].password_hash)) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [await hashPassword(newPassword), auth.user.id]);
    await client.query("DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2", [auth.user.id, token ? hashSessionToken(token) : ""]);
    await client.query("INSERT INTO activity_logs (user_id, action, entity_type, entity_id, title, detail) VALUES ($1,'update','user',$1,'Changed password','Other active sessions ended')", [auth.user.id]);
    await client.query("COMMIT");
    return NextResponse.json({ ok: true });
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}