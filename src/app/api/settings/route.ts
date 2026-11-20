import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { db } from "@/lib/db";

const defaultLogo = "/letterHeader_logo/MSUGensan_logo.png";
const defaults = { farm_name: "MSU-GenSan Animal Science Farm", farm_timezone: "Asia/Manila", report_page_size: "25", report_left_logo: defaultLogo, report_right_logo: defaultLogo, report_prepared_by: "Dr Alexis Miole", report_noted_by: "FRYAN ALLEN S. SUBONG", report_noted_title: "Chairman, Animal Science/Agri Extension. Dept", report_certified_by: "DONNA RIA JOSUE-CANACAN, PhD.", report_certified_title: "Dean, College of Agriculture" };

export async function GET() {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const visibleKeys = auth.user.role === "veterinarian" ? Object.keys(defaults) : ["report_left_logo", "report_right_logo"];
  const [settings, preferences] = await Promise.all([
    db.query("SELECT key, value, updated_at AS \"updatedAt\" FROM system_settings WHERE key = ANY($1)", [visibleKeys]),
    db.query("SELECT notify_health_alerts, notify_activity_digest, profile_image_url FROM users WHERE id = $1", [auth.user.id]),
  ]);
  return NextResponse.json({ ...defaults, ...Object.fromEntries(settings.rows.map((row) => [row.key, row.value])), updatedAt: settings.rows.reduce((latest, row) => row.updatedAt > latest ? row.updatedAt : latest, null), canManageSystem: auth.user.role === "veterinarian", canManageReports: auth.user.role === "veterinarian" || auth.user.role === "faculty", email: auth.user.email, displayName: auth.user.display_name, profileImageUrl: preferences.rows[0]?.profile_image_url ?? null, notify_health_alerts: preferences.rows[0]?.notify_health_alerts ?? true, notify_activity_digest: preferences.rows[0]?.notify_activity_digest ?? true }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  const auth = await requireApiUser();
  if ("response" in auth) return auth.response;
  const body = await request.json() as Record<string, unknown>;
  const notifyHealth = body.notify_health_alerts === true;
  const notifyDigest = body.notify_activity_digest === true;
  if (auth.user.role !== "veterinarian" && auth.user.role !== "faculty") {
    await db.query("UPDATE users SET notify_health_alerts = $1, notify_activity_digest = $2, updated_at = NOW() WHERE id = $3", [notifyHealth, notifyDigest, auth.user.id]);
    return NextResponse.json({ ok: true });
  }
  const timezone = String(body.farm_timezone ?? "");
  const pageSize = String(body.report_page_size ?? "");
  if (auth.user.role !== "faculty" && !['Asia/Manila','UTC'].includes(timezone)) return NextResponse.json({ error: "Unsupported timezone" }, { status: 400 });
  if (auth.user.role !== "faculty" && !['10','25','50','100'].includes(pageSize)) return NextResponse.json({ error: "Invalid report page size" }, { status: 400 });
  const reportFields = { report_prepared_by: body.report_prepared_by, report_noted_by: body.report_noted_by, report_noted_title: body.report_noted_title, report_certified_by: body.report_certified_by, report_certified_title: body.report_certified_title };
  if (Object.values(reportFields).some((value) => typeof value !== "string" || value.trim().length > 120)) return NextResponse.json({ error: "Report signature fields must be text up to 120 characters." }, { status: 400 });
  const client = await db.connect();
  try { await client.query("BEGIN"); const fields = auth.user.role === "faculty" ? reportFields : { farm_timezone: timezone, report_page_size: pageSize, ...reportFields }; for (const [key, value] of Object.entries(fields)) await client.query(`INSERT INTO system_settings (key,value,updated_by_user_id,updated_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by_user_id = EXCLUDED.updated_by_user_id, updated_at = NOW()`, [key, value, auth.user.id]); await client.query("UPDATE users SET notify_health_alerts = $1, notify_activity_digest = $2, updated_at = NOW() WHERE id = $3", [notifyHealth, notifyDigest, auth.user.id]); await client.query("INSERT INTO activity_logs (user_id, action, entity_type, title, detail) VALUES ($1,'update','settings','Updated report details',$2)", [auth.user.id, "Report signatures updated"]); await client.query("COMMIT"); return NextResponse.json({ ok: true }); } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
