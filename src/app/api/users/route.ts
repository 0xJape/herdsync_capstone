import { NextRequest, NextResponse } from "next/server";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const result = await db.query(`SELECT u.id, u.email, u.display_name AS "displayName", u.role, u.active, u.created_at AS "createdAt",
    MAX(s.created_at) AS "lastLogin" FROM users u LEFT JOIN sessions s ON s.user_id = u.id GROUP BY u.id ORDER BY u.active DESC, u.display_name`);
  return NextResponse.json(result.rows, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const body = await request.json() as Record<string, unknown>;
  const displayName = String(body.displayName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = String(body.role ?? "farm_aide");
  const password = String(body.password ?? "");
  if (displayName.length < 2 || displayName.length > 100) return NextResponse.json({ error: "Name must be 2–100 characters" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  if (!['admin','veterinarian','farm_aide','faculty'].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  if (password.length < 10) return NextResponse.json({ error: "Temporary password must be at least 10 characters" }, { status: 400 });
  const client = await db.connect();
  try { await client.query("BEGIN"); const result = await client.query(`INSERT INTO users (email, display_name, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id`, [email, displayName, await hashPassword(password), role]); await client.query("INSERT INTO activity_logs (user_id, action, entity_type, entity_id, title, detail) VALUES ($1,'create','user',$2,$3,$4)", [auth.user.id, result.rows[0].id, `Created ${displayName}`, `${role} account created`]); await client.query("COMMIT"); return NextResponse.json({ ok: true }, { status: 201 }); }
  catch (error: unknown) { await client.query("ROLLBACK"); if (typeof error === "object" && error && "code" in error && error.code === "23505") return NextResponse.json({ error: "Email is already in use" }, { status: 409 }); throw error; }
  finally { client.release(); }
}
