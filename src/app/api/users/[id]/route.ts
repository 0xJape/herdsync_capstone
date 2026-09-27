import { NextRequest, NextResponse } from "next/server";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  const body = await request.json() as Record<string, unknown>;
  const role = body.role === undefined ? undefined : String(body.role);
  const active = body.active === undefined ? undefined : body.active;
  const password = body.password === undefined ? undefined : String(body.password);
  if (role !== undefined && !['admin','veterinarian','farm_aide','faculty'].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  if (active !== undefined && typeof active !== "boolean") return NextResponse.json({ error: "Invalid account status" }, { status: 400 });
  if (password !== undefined && password.length < 10) return NextResponse.json({ error: "Password must be at least 10 characters" }, { status: 400 });
  if (String(id) === auth.user.id && (active === false || (role !== undefined && role !== "admin"))) return NextResponse.json({ error: "You cannot remove your own administrator access" }, { status: 409 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query("SELECT display_name, role, active FROM users WHERE id = $1 FOR UPDATE", [id]);
    if (!current.rowCount) { await client.query("ROLLBACK"); return NextResponse.json({ error: "User not found" }, { status: 404 }); }
    if ((active === false || (role !== undefined && role !== "admin")) && current.rows[0].role === "admin" && current.rows[0].active) { const admins = await client.query("SELECT COUNT(*)::int count FROM users WHERE role = 'admin' AND active"); if (admins.rows[0].count <= 1) { await client.query("ROLLBACK"); return NextResponse.json({ error: "At least one active administrator is required" }, { status: 409 }); } }
    const fields: string[] = [], values: unknown[] = [];
    if (role !== undefined) { values.push(role); fields.push(`role = $${values.length}`); }
    if (active !== undefined) { values.push(active); fields.push(`active = $${values.length}`); }
    if (password !== undefined) { values.push(await hashPassword(password)); fields.push(`password_hash = $${values.length}`); }
    if (!fields.length) { await client.query("ROLLBACK"); return NextResponse.json({ error: "No changes supplied" }, { status: 400 }); }
    values.push(id); await client.query(`UPDATE users SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${values.length}`, values);
    if (active === false || password !== undefined) await client.query("DELETE FROM sessions WHERE user_id = $1", [id]);
    await client.query("INSERT INTO activity_logs (user_id, action, entity_type, entity_id, title, detail) VALUES ($1,'update','user',$2,$3,$4)", [auth.user.id, id, `Updated ${current.rows[0].display_name}`, password !== undefined ? "Password reset; active sessions ended" : active !== undefined ? `Account ${active ? "activated" : "deactivated"}` : `Role changed to ${role}`]);
    await client.query("COMMIT"); return NextResponse.json({ ok: true });
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
