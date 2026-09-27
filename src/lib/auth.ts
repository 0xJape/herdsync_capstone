import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "herdsync_session";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;

export type Role = "admin" | "veterinarian" | "farm_aide" | "faculty";
export type SessionUser = { id: string; email: string; display_name: string; role: Role };

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, encoded] = stored.split(":");
  if (algorithm !== "scrypt" || !salt || !encoded || !/^[0-9a-f]{128}$/i.test(encoded)) return false;
  const expected = Buffer.from(encoded, "hex");
  const actual = await scrypt(password, salt, expected.length) as Buffer;
  return timingSafeEqual(actual, expected);
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_SECONDS * 1000);
  await db.query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [hashSessionToken(token), userId, expires]);
  return { token, expires };
}

export async function setSessionCookie(token: string, expires: Date) {
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires, maxAge: SESSION_SECONDS });
}

export async function clearSessionCookie() {
  (await cookies()).set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: new Date(0), maxAge: 0 });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await db.query<SessionUser>(`SELECT u.id, u.email, u.display_name, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.active`, [hashSessionToken(token)]);
  return result.rows[0] ?? null;
}

export async function requireApiUser() {
  const user = await getSessionUser();
  return user ? { user } : { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
}

export async function requireAdmin() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth;
  return auth.user.role === "admin"
    ? auth
    : { response: NextResponse.json({ error: "Administrator access required" }, { status: 403 }) };
}

export async function deleteCurrentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await db.query("DELETE FROM sessions WHERE token_hash = $1", [hashSessionToken(token)]);
  await clearSessionCookie();
}

export async function requireRole(...roles: Role[]) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth;
  return roles.includes(auth.user.role)
    ? auth
    : { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}