import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const action = request.nextUrl.searchParams.get("action") ?? "all";
  const entity = request.nextUrl.searchParams.get("entity") ?? "all";
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
  if (!['all','create','update','archive'].includes(action) || !['all','livestock','health','weight','breeding','user','settings'].includes(entity)) return NextResponse.json({ error: "Invalid filter" }, { status: 400 });
  const values: unknown[] = [];
  const where: string[] = [];
  if (query) { values.push(`%${query}%`); where.push(`(a.title ILIKE $${values.length} OR a.detail ILIKE $${values.length} OR u.display_name ILIKE $${values.length})`); }
  if (action !== "all") { values.push(action); where.push(`a.action = $${values.length}`); }
  if (entity !== "all") { values.push(entity); where.push(`a.entity_type = $${values.length}`); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  values.push(20, (page - 1) * 20);
  const [result, summary] = await Promise.all([db.query(`SELECT a.id, a.action, a.entity_type AS "entityType", a.entity_id AS "entityId", a.title,
      COALESCE(a.detail, '—') detail, COALESCE(u.display_name, 'System') actor,
      COALESCE(u.email, 'System generated') AS "actorEmail", a.created_at AS "createdAt",
      COUNT(*) OVER()::int total
    FROM activity_logs a LEFT JOIN users u ON u.id = a.user_id
    ${clause} ORDER BY a.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values), db.query(`SELECT
      (SELECT COUNT(*)::int FROM activity_logs WHERE created_at >= CURRENT_DATE) AS "todayChanges",
      (SELECT COUNT(*)::int FROM activity_logs WHERE created_at >= CURRENT_DATE - 6) AS "weekChanges",
      (SELECT COUNT(*)::int FROM users WHERE active) AS "activeUsers",
      (SELECT COUNT(DISTINCT user_id)::int FROM sessions WHERE expires_at > NOW()) AS "signedInUsers"`)]);
  return NextResponse.json({ items: result.rows, total: result.rows[0]?.total ?? 0, page, pageSize: 20, summary: summary.rows[0] }, { headers: { "Cache-Control": "no-store" } });
}
