import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";

const defaults = { farm_name: "MSU-GenSan Animal Science Farm", farm_timezone: "Asia/Manila", report_page_size: "25" };

export async function GET() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const [settings, preferences] = await Promise.all([
    auth.user.role === "veterinarian" ? db.query("SELECT key, value, updated_at AS \"updatedAt\" FROM system_settings WHERE key = ANY($1)", [Object.keys(defaults)]) : Promise.resolve({ rows: [] }),
    db.query("SELECT notify_health_alerts, notify_activity_digest FROM users WHERE id = $1", [auth.user.id]),
  ]);
  return NextResponse.json({ ...defaults, ...Object.fromEntries(settings.rows.map((row) => [row.key, row.value])), updatedAt: settings.rows.reduce((latest, row) => row.updatedAt > latest ? row.updatedAt : latest, null), canManageSystem: auth.user.role === "veterinarian", email: auth.user.email, displayName: auth.user.display_name, notify_health_alerts: preferences.rows[0]?.notify_health_alerts ?? true, notify_activity_digest: preferences.rows[0]?.notify_activity_digest ?? true }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const body = await request.json() as Record<string, unknown>;
  const notifyHealth = body.notify_health_alerts === true;
  const notifyDigest = body.notify_activity_digest === true;
  if (auth.user.role !== "veterinarian") {
    await db.query("UPDATE users SET notify_health_alerts = $1, notify_activity_digest = $2, updated_at = NOW() WHERE id = $3", [notifyHealth, notifyDigest, auth.user.id]);
    return NextResponse.json({ ok: true });
  }
  const timezone = String(body.farm_timezone ?? "");
  const pageSize = String(body.report_page_size ?? "");
  if (!['Asia/Manila','UTC'].includes(timezone)) return NextResponse.json({ error: "Unsupported timezone" }, { status: 400 });
  if (!['10','25','50','100'].includes(pageSize)) return NextResponse.json({ error: "Invalid report page size" }, { status: 400 });
  const client = await db.connect();
  try { await client.query("BEGIN"); for (const [key, value] of Object.entries({ farm_timezone: timezone, report_page_size: pageSize })) await client.query(`INSERT INTO system_settings (key,value,updated_by_user_id,updated_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by_user_id = EXCLUDED.updated_by_user_id, updated_at = NOW()`, [key, value, auth.user.id]); await client.query("UPDATE users SET notify_health_alerts = $1, notify_activity_digest = $2, updated_at = NOW() WHERE id = $3", [notifyHealth, notifyDigest, auth.user.id]); await client.query("INSERT INTO activity_logs (user_id, action, entity_type, title, detail) VALUES ($1,'update','settings','Updated system settings',$2)", [auth.user.id, `${timezone}  -  ${pageSize} rows`]); await client.query("COMMIT"); return NextResponse.json({ ok: true }); } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
