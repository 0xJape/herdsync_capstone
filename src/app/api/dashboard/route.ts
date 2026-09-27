import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireRole("veterinarian", "farm_aide", "faculty");
  if ("response" in auth) return auth.response;
  const searchParams = new URL(request.url).searchParams;
  const rangeValue = Number(searchParams.get("range") ?? 7);
  const range = rangeValue === 3 || rangeValue === 30 ? rangeValue : 7;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = 7;
  const careSchedule = `
    SELECT h.id, h.livestock_id, h.record_type, h.follow_up_date AS due_date, 'Follow-up' AS title
    FROM health_records h WHERE h.archived_at IS NULL AND h.status = 'open' AND h.follow_up_date IS NOT NULL
    UNION ALL
    SELECT h.id, h.livestock_id, h.record_type, h.next_due_date, 'Next due'
    FROM health_records h WHERE h.archived_at IS NULL AND h.record_type IN ('vaccination', 'vitamins', 'dewormer') AND h.next_due_date IS NOT NULL
    UNION ALL
    SELECT h.id, h.livestock_id, h.record_type, h.next_due_date - 7, 'Vitamin reminder'
    FROM health_records h WHERE h.archived_at IS NULL AND h.record_type = 'vitamins' AND h.next_due_date IS NOT NULL
    UNION ALL
    SELECT h.id, h.livestock_id, h.record_type, h.next_due_date - 14, 'Deworming reminder'
    FROM health_records h WHERE h.archived_at IS NULL AND h.record_type = 'dewormer' AND h.next_due_date IS NOT NULL
    UNION ALL
    SELECT h.id, h.livestock_id, h.record_type, h.withdrawal_end_date, 'Withdrawal ends'
    FROM health_records h WHERE h.archived_at IS NULL AND h.withdrawal_end_date IS NOT NULL
    UNION ALL
    SELECT b.id, b.livestock_id, 'pregnancy_check', b.event_date + 45, 'Pregnancy check'
    FROM breeding_records b WHERE b.archived_at IS NULL AND b.event_type IN ('natural_service', 'artificial_insemination') AND COALESCE(b.pregnancy_status, 'pending') = 'pending'
      AND NOT EXISTS (SELECT 1 FROM breeding_records outcome WHERE outcome.livestock_id = b.livestock_id AND outcome.archived_at IS NULL AND outcome.event_date >= b.event_date AND outcome.event_type IN ('pregnancy_confirmed', 'pregnancy_negative', 'pregnancy_loss'))
    UNION ALL
    SELECT confirmation.id, confirmation.livestock_id, 'expected_calving', COALESCE(service.expected_calving_date, service.event_date + 283), 'Expected calving'
    FROM breeding_records confirmation
    JOIN LATERAL (SELECT id,event_date,expected_calving_date FROM breeding_records WHERE livestock_id=confirmation.livestock_id AND event_type IN ('natural_service','artificial_insemination') AND event_date<=confirmation.event_date AND archived_at IS NULL ORDER BY event_date DESC,id DESC LIMIT 1) service ON TRUE
    WHERE confirmation.archived_at IS NULL AND confirmation.event_type = 'pregnancy_confirmed' AND confirmation.pregnancy_status = 'pregnant'
      AND NOT EXISTS (SELECT 1 FROM breeding_records terminal WHERE terminal.livestock_id=confirmation.livestock_id AND terminal.archived_at IS NULL AND terminal.event_type IN ('pregnancy_loss','pregnancy_negative','calving') AND (terminal.event_date>confirmation.event_date OR terminal.event_date=confirmation.event_date AND terminal.id>confirmation.id))
    UNION ALL
    SELECT confirmation.id, confirmation.livestock_id, 'pregnancy_checkup', COALESCE(checkup.next_checkup_date, service.event_date), 'Pregnancy checkup'
    FROM breeding_records confirmation
    JOIN LATERAL (SELECT id,event_date FROM breeding_records WHERE livestock_id=confirmation.livestock_id AND event_type IN ('natural_service','artificial_insemination') AND event_date<=confirmation.event_date AND archived_at IS NULL ORDER BY event_date DESC,id DESC LIMIT 1) service ON TRUE
    LEFT JOIN LATERAL (SELECT next_checkup_date FROM pregnancy_checkups WHERE livestock_id=confirmation.livestock_id AND service_id=service.id ORDER BY checkup_date DESC,id DESC LIMIT 1) checkup ON TRUE
    WHERE confirmation.archived_at IS NULL AND confirmation.event_type = 'pregnancy_confirmed' AND confirmation.pregnancy_status = 'pregnant'
      AND NOT EXISTS (SELECT 1 FROM breeding_records terminal WHERE terminal.livestock_id=confirmation.livestock_id AND terminal.archived_at IS NULL AND terminal.event_type IN ('pregnancy_loss','pregnancy_negative','calving') AND (terminal.event_date>confirmation.event_date OR terminal.event_date=confirmation.event_date AND terminal.id>confirmation.id))
    UNION ALL
    SELECT b.id, b.livestock_id, 'heat_cycle', b.event_date + 21, 'Expected heat cycle'
    FROM breeding_records b WHERE b.archived_at IS NULL AND b.event_type = 'heat_observed' AND b.event_date + 21 >= CURRENT_DATE
      AND NOT EXISTS (SELECT 1 FROM breeding_records later WHERE later.livestock_id=b.livestock_id AND later.archived_at IS NULL AND (later.event_date>b.event_date OR later.event_date=b.event_date AND later.id>b.id) AND later.event_type IN ('heat_observed','natural_service','artificial_insemination','pregnancy_confirmed'))
    UNION ALL
    SELECT c.id, c.livestock_id, 'calf_care', c.due_date, INITCAP(REPLACE(c.care_type, '_', ' '))
    FROM calf_care_plans c WHERE c.status = 'pending'`;
  const alertColumns = `SELECT s.title, s.livestock_id AS "livestockId", l.tag_number AS "tagNumber", s.due_date::text AS "dueDate", COALESCE(ABS(s.due_date - CURRENT_DATE), 0)::int AS "dayCount", CASE WHEN s.due_date IS NULL THEN 'unscheduled' WHEN s.due_date < CURRENT_DATE THEN 'critical' WHEN s.due_date = CURRENT_DATE THEN 'today' WHEN s.due_date <= CURRENT_DATE + 3 THEN 'high' ELSE 'warning' END level, CASE WHEN s.record_type IN ('pregnancy_check','pregnancy_checkup') THEN 'Breeding' WHEN s.record_type = 'expected_calving' THEN 'Calving' WHEN s.record_type = 'heat_cycle' THEN 'Heat cycle' WHEN s.record_type = 'calf_care' THEN 'Calf care' WHEN s.title = 'Withdrawal ends' THEN 'Treatment' WHEN s.record_type = 'vaccination' OR s.record_type = 'vitamins' THEN 'Preventive care' WHEN s.record_type = 'dewormer' THEN 'Parasite control' ELSE 'Health check' END category, CASE WHEN s.due_date IS NULL THEN 'Schedule needed' WHEN s.due_date < CURRENT_DATE THEN 'Overdue by ' || (CURRENT_DATE - s.due_date) || CASE WHEN CURRENT_DATE - s.due_date = 1 THEN ' day' ELSE ' days' END WHEN s.due_date = CURRENT_DATE THEN 'Due today' ELSE 'Due in ' || (s.due_date - CURRENT_DATE) || CASE WHEN s.due_date - CURRENT_DATE = 1 THEN ' day' ELSE ' days' END END timing FROM care_schedule s JOIN livestock l ON l.id = s.livestock_id`;
  const attentionWhere = `WHERE s.due_date IS NULL OR s.due_date < CURRENT_DATE OR s.due_date <= CURRENT_DATE + $1::int`;
  const getAttention = async () => {
    const [items, total] = await Promise.all([
      db.query(`WITH care_schedule AS (${careSchedule}) ${alertColumns} ${attentionWhere} ORDER BY s.due_date ASC NULLS FIRST, s.id DESC LIMIT $2 OFFSET $3`, [range, pageSize, (page - 1) * pageSize]),
      db.query(`WITH care_schedule AS (${careSchedule}) SELECT COUNT(*)::int total FROM care_schedule s ${attentionWhere}`, [range]),
    ]);
    const count = total.rows[0].total as number;
    return { items: items.rows, total: count, page, pageSize, hasNext: page * pageSize < count };
  };
  if (searchParams.get("mode") === "attention") return NextResponse.json({ attention: await getAttention() });

    const [counts, composition, population, alerts, recent, attention] = await Promise.all([
      db.query(`WITH care_schedule AS (${careSchedule}) SELECT (SELECT COUNT(*)::int FROM livestock WHERE status = 'active' AND archived_at IS NULL) active, (SELECT COUNT(*)::int FROM health_records WHERE status = 'open' AND record_type IN ('illness', 'injury', 'treatment', 'antibiotics', 'anti_inflammatory') AND archived_at IS NULL) attention, (SELECT COUNT(*)::int FROM care_schedule WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7) due, (SELECT COUNT(*)::int FROM care_schedule WHERE due_date < CURRENT_DATE) critical, (SELECT COUNT(*)::int FROM care_schedule WHERE due_date = CURRENT_DATE) due_today, (SELECT COUNT(*)::int FROM care_schedule WHERE due_date > CURRENT_DATE AND due_date <= CURRENT_DATE + 7) upcoming, 0::int unscheduled`),
      db.query(`SELECT CASE WHEN notes ILIKE '%yearling bull%' THEN 'Yearling bull' WHEN notes ILIKE '%heifer%' THEN 'Heifer' WHEN notes ILIKE '%calf%' THEN 'Calf' WHEN notes ILIKE '%bull%' THEN 'Bull' WHEN notes ILIKE '%cow%' THEN 'Cow' ELSE 'Other' END label, COUNT(*)::int value FROM livestock WHERE status = 'active' AND archived_at IS NULL GROUP BY 1 ORDER BY CASE CASE WHEN notes ILIKE '%yearling bull%' THEN 'Yearling bull' WHEN notes ILIKE '%heifer%' THEN 'Heifer' WHEN notes ILIKE '%calf%' THEN 'Calf' WHEN notes ILIKE '%bull%' THEN 'Bull' WHEN notes ILIKE '%cow%' THEN 'Cow' ELSE 'Other' END WHEN 'Bull' THEN 1 WHEN 'Yearling bull' THEN 2 WHEN 'Cow' THEN 3 WHEN 'Heifer' THEN 4 WHEN 'Calf' THEN 5 ELSE 6 END`),
    db.query(`SELECT to_char(month_start, 'Mon') AS "month", COUNT(l.id)::int value FROM generate_series(date_trunc('month', NOW()) - interval '5 months', date_trunc('month', NOW()), interval '1 month') AS months(month_start) LEFT JOIN livestock l ON l.created_at < month_start + interval '1 month' AND l.archived_at IS NULL GROUP BY month_start ORDER BY month_start`),
      db.query(`WITH care_schedule AS (${careSchedule}) ${alertColumns} WHERE s.due_date <= CURRENT_DATE + 90 ORDER BY s.due_date, s.id DESC`),
      db.query(`SELECT title, detail FROM (SELECT 'Registered ' || tag_number title, breed || ' cattle record added' detail, created_at FROM livestock WHERE archived_at IS NULL UNION ALL SELECT record_type || ' · ' || l.tag_number, COALESCE(h.diagnosis, 'Health record added'), h.created_at FROM health_records h JOIN livestock l ON l.id = h.livestock_id WHERE h.archived_at IS NULL) events ORDER BY created_at DESC LIMIT 5`),
      getAttention(),
  ]);
    const count = counts.rows[0];
  return NextResponse.json({
      updatedAt: new Date().toISOString(),
      operations: { overdue: count.critical, dueToday: count.due_today, upcoming: count.upcoming, unscheduled: count.unscheduled },
      stats: [{ label: "Live cattle", value: count.active, detail: `${count.active} on hand · inventory report`, kind: "cattle", trendPercent: -14, trendDirection: "down" }, { label: "Active clinical cases", value: count.attention, detail: "Unresolved clinical records", kind: "health", trendPercent: 0, trendDirection: "flat" }, { label: "Due this week", value: count.due, detail: "Scheduled care", kind: "due", trendPercent: 0, trendDirection: "flat" }, { label: "Critical alerts", value: count.critical, detail: "Overdue care", kind: "alerts", trendPercent: 0, trendDirection: "flat" }],
      composition: composition.rows,
    population: population.rows,
      alerts: alerts.rows,
      attention,
      recent: recent.rows,
  });
}
