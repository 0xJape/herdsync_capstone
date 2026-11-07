import { requireRole } from "@/lib/auth";
import { breedingEligibility, dateString, gestationStage } from "@/lib/breeding-rules";
import { db } from "@/lib/db";
import { withCategory } from "@/lib/livestock";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE = 7;
const listNames = ["pregnancies", "pregnancyChecks", "care", "calvingHistory", "records", "heatPredictions"] as const;
type ListName = (typeof listNames)[number];

const listSql: Record<ListName, { rows: string; count: string }> = {
  pregnancies: {
    rows: `WITH latest_record AS (
        SELECT DISTINCT ON (b.livestock_id) b.id, b.livestock_id, b.pregnancy_status
        FROM breeding_records b WHERE b.archived_at IS NULL
        ORDER BY b.livestock_id, b.event_date DESC, b.id DESC
      ), latest_service AS (
        SELECT DISTINCT ON (b.livestock_id) b.livestock_id, b.sire_id, b.event_date conception_date, b.expected_calving_date
        FROM breeding_records b
        WHERE b.archived_at IS NULL AND b.event_type IN ('natural_service', 'artificial_insemination')
        ORDER BY b.livestock_id, b.event_date DESC, b.id DESC
      )
      SELECT l.id livestock_id, r.id pregnancy_id, l.tag_number, l.name, l.breed, s.sire_id, sire.tag_number sire_tag_number,
        s.conception_date, s.conception_date + 90 confirmation_due_date,
        COALESCE(s.expected_calving_date, s.conception_date + 283) expected_calving_date,
        GREATEST(0, CURRENT_DATE - s.conception_date)::int days_pregnant
      FROM livestock l JOIN latest_record r ON r.livestock_id = l.id JOIN latest_service s ON s.livestock_id = l.id
      LEFT JOIN livestock sire ON sire.id = s.sire_id
      WHERE l.archived_at IS NULL AND l.status = 'active' AND l.sex = 'female' AND r.pregnancy_status = 'pregnant'
        AND ($1 = '' OR l.tag_number ILIKE '%' || $1 || '%' OR COALESCE(l.name, '') ILIKE '%' || $1 || '%')
      ORDER BY s.conception_date DESC, l.id DESC LIMIT $2 OFFSET $3`,
    count: `WITH latest_record AS (
        SELECT DISTINCT ON (b.livestock_id) b.id, b.livestock_id, b.pregnancy_status
        FROM breeding_records b WHERE b.archived_at IS NULL ORDER BY b.livestock_id, b.event_date DESC, b.id DESC
      ), latest_service AS (
        SELECT DISTINCT ON (b.livestock_id) b.livestock_id
        FROM breeding_records b WHERE b.archived_at IS NULL AND b.event_type IN ('natural_service', 'artificial_insemination')
        ORDER BY b.livestock_id, b.event_date DESC, b.id DESC
      )
      SELECT COUNT(*)::int total FROM livestock l JOIN latest_record r ON r.livestock_id = l.id JOIN latest_service s ON s.livestock_id = l.id
      WHERE l.archived_at IS NULL AND l.status = 'active' AND l.sex = 'female' AND r.pregnancy_status = 'pregnant'
        AND ($1 = '' OR l.tag_number ILIKE '%' || $1 || '%' OR COALESCE(l.name, '') ILIKE '%' || $1 || '%')`,
  },
  pregnancyChecks: {
    rows: `SELECT b.livestock_id, l.tag_number, l.name, b.event_date breeding_date,
        b.event_date + 45 check_date, COALESCE(b.expected_calving_date, b.event_date + 283) expected_calving_date,
        b.id source_event_id, outcome.event_type result,
        CASE WHEN outcome.event_type IS NOT NULL THEN 'completed'
          WHEN b.event_date + 45 > CURRENT_DATE THEN 'not_yet_available'
          WHEN b.event_date + 45 < CURRENT_DATE THEN 'overdue'
          ELSE 'due' END check_status
      FROM breeding_records b JOIN livestock l ON l.id = b.livestock_id
      LEFT JOIN LATERAL (
        SELECT o.event_type FROM breeding_records o
        WHERE o.archived_at IS NULL AND o.livestock_id = b.livestock_id
          AND o.event_type IN ('pregnancy_confirmed', 'pregnancy_negative', 'pregnancy_loss')
          AND (o.event_date, o.id) > (b.event_date, b.id)
          AND NOT EXISTS (SELECT 1 FROM breeding_records next_service
            WHERE next_service.archived_at IS NULL AND next_service.livestock_id = b.livestock_id
              AND next_service.event_type IN ('natural_service', 'artificial_insemination')
              AND (next_service.event_date, next_service.id) > (b.event_date, b.id)
              AND (next_service.event_date, next_service.id) < (o.event_date, o.id))
        ORDER BY o.event_date, o.id LIMIT 1
      ) outcome ON TRUE
      WHERE b.archived_at IS NULL AND l.archived_at IS NULL
        AND $1::text IS NOT NULL
        AND b.event_type IN ('natural_service', 'artificial_insemination')
        AND ($1 = '' OR l.tag_number ILIKE '%' || $1 || '%' OR COALESCE(l.name, '') ILIKE '%' || $1 || '%')
      ORDER BY b.event_date DESC, b.id DESC LIMIT $2 OFFSET $3`,
    count: `SELECT COUNT(*)::int total FROM breeding_records b JOIN livestock l ON l.id = b.livestock_id
      WHERE b.archived_at IS NULL AND l.archived_at IS NULL
        AND $1::text IS NOT NULL
        AND b.event_type IN ('natural_service', 'artificial_insemination')
        AND ($1 = '' OR l.tag_number ILIKE '%' || $1 || '%' OR COALESCE(l.name, '') ILIKE '%' || $1 || '%')`,
  },
  care: {
    rows: `SELECT c.*, l.tag_number FROM calf_care_plans c JOIN livestock l ON l.id = c.livestock_id
      WHERE c.status = 'pending' AND l.archived_at IS NULL AND $1::text IS NOT NULL ORDER BY c.due_date LIMIT $2 OFFSET $3`,
    count: `SELECT COUNT(*)::int total FROM calf_care_plans c JOIN livestock l ON l.id = c.livestock_id WHERE c.status = 'pending' AND l.archived_at IS NULL AND $1::text IS NOT NULL`,
  },
  calvingHistory: {
    rows: `SELECT e.id, e.pregnancy_confirmation_id pregnancy_id, e.birth_date, e.calving_difficulty, e.twins, e.notes, d.id dam_id, d.tag_number dam_tag,
      COUNT(o.id)::int calf_count, STRING_AGG(COALESCE(o.name, o.outcome), ', ' ORDER BY o.birth_order) calves
      FROM calving_events e JOIN livestock d ON d.id = e.dam_id LEFT JOIN calving_outcomes o ON o.calving_event_id = e.id
      WHERE d.archived_at IS NULL AND ($1 = '' OR d.tag_number ILIKE '%' || $1 || '%')
      GROUP BY e.id, d.id ORDER BY e.birth_date DESC, e.id DESC LIMIT $2 OFFSET $3`,
    count: `SELECT COUNT(*)::int total FROM calving_events e JOIN livestock d ON d.id = e.dam_id
      WHERE d.archived_at IS NULL AND ($1 = '' OR d.tag_number ILIKE '%' || $1 || '%')`,
  },
  records: {
    rows: `WITH services AS (
        SELECT b.*, COUNT(*) OVER (PARTITION BY b.livestock_id ORDER BY b.event_date, b.id)::int cycle_number
        FROM breeding_records b WHERE b.archived_at IS NULL AND b.event_type IN ('natural_service', 'artificial_insemination')
      ), records AS (
        SELECT b.*, l.tag_number, l.name livestock_name,
          CASE WHEN b.sire_id IS NOT NULL THEN s.tag_number
            ELSE COALESCE(NULLIF((regexp_match(b.details, 'Semen sire code: ([^;\n]+)', 'i'))[1], 'Not recorded'), NULLIF((regexp_match(b.details, 'Semen sire name: ([^;\n]+)', 'i'))[1], 'Not recorded'), 'Unknown') END sire_tag_number,
          CASE WHEN b.sire_id IS NOT NULL THEN 'Registered'
            WHEN NULLIF((regexp_match(b.details, 'Semen sire code: ([^;\n]+)', 'i'))[1], 'Not recorded') IS NOT NULL OR NULLIF((regexp_match(b.details, 'Semen sire name: ([^;\n]+)', 'i'))[1], 'Not recorded') IS NOT NULL THEN 'External / Not Registered'
            ELSE 'Unknown' END sire_name,
          b.event_date + 45 pregnancy_check_due_date,
          CASE WHEN EXISTS (SELECT 1 FROM breeding_records o WHERE o.archived_at IS NULL AND o.livestock_id = b.livestock_id
            AND o.event_type IN ('pregnancy_confirmed', 'pregnancy_negative', 'pregnancy_loss') AND (o.event_date, o.id) > (b.event_date, b.id)
            AND NOT EXISTS (SELECT 1 FROM services n WHERE n.livestock_id = b.livestock_id AND (n.event_date, n.id) > (b.event_date, b.id) AND (n.event_date, n.id) < (o.event_date, o.id))) THEN 'resolved'
            WHEN b.event_date + 45 <= CURRENT_DATE THEN 'due' ELSE 'pending' END workflow_status
        FROM services b JOIN livestock l ON l.id = b.livestock_id LEFT JOIN livestock s ON s.id = b.sire_id
        WHERE l.archived_at IS NULL
      ) SELECT * FROM records WHERE ($1 = '' OR tag_number ILIKE '%' || $1 || '%' OR COALESCE(livestock_name, '') ILIKE '%' || $1 || '%' OR COALESCE(sire_tag_number, '') ILIKE '%' || $1 || '%' OR COALESCE(sire_name, '') ILIKE '%' || $1 || '%')
        AND ($4 = 'all' OR event_type = $4) AND ($5 = 'all' OR workflow_status = $5)
      ORDER BY CASE WHEN $6 = 'oldest' THEN event_date END ASC, CASE WHEN $6 = 'dam' THEN tag_number END ASC,
        CASE WHEN $6 = 'sire' THEN sire_tag_number END ASC,
        CASE WHEN $6 = 'check' THEN pregnancy_check_due_date END ASC, event_date DESC, id DESC LIMIT $2 OFFSET $3`,
    count: `WITH services AS (
        SELECT b.* FROM breeding_records b WHERE b.archived_at IS NULL AND b.event_type IN ('natural_service', 'artificial_insemination')
      ), records AS (
        SELECT b.*, l.tag_number, l.name livestock_name, s.tag_number sire_tag_number, s.name sire_name,
          CASE WHEN EXISTS (SELECT 1 FROM breeding_records o WHERE o.archived_at IS NULL AND o.livestock_id = b.livestock_id
            AND o.event_type IN ('pregnancy_confirmed', 'pregnancy_negative', 'pregnancy_loss') AND (o.event_date, o.id) > (b.event_date, b.id)
            AND NOT EXISTS (SELECT 1 FROM services n WHERE n.livestock_id = b.livestock_id AND (n.event_date, n.id) > (b.event_date, b.id) AND (n.event_date, n.id) < (o.event_date, o.id))) THEN 'resolved'
            WHEN b.event_date + 45 <= CURRENT_DATE THEN 'due' ELSE 'pending' END workflow_status
        FROM services b JOIN livestock l ON l.id = b.livestock_id LEFT JOIN livestock s ON s.id = b.sire_id WHERE l.archived_at IS NULL
      ) SELECT COUNT(*)::int total FROM records WHERE ($1 = '' OR tag_number ILIKE '%' || $1 || '%' OR COALESCE(livestock_name, '') ILIKE '%' || $1 || '%' OR COALESCE(sire_tag_number, '') ILIKE '%' || $1 || '%' OR COALESCE(sire_name, '') ILIKE '%' || $1 || '%')
        AND ($2 = 'all' OR event_type = $2) AND ($3 = 'all' OR workflow_status = $3)`,
  },
  heatPredictions: {
    rows: `SELECT b.livestock_id, l.tag_number, b.event_date + 21 expected_date, b.id source_event_id
      FROM breeding_records b JOIN livestock l ON l.id = b.livestock_id
      WHERE b.archived_at IS NULL AND l.archived_at IS NULL AND $1::text IS NOT NULL AND b.event_type = 'heat_observed' AND b.event_date + 21 >= CURRENT_DATE
        AND NOT EXISTS (SELECT 1 FROM breeding_records later WHERE later.archived_at IS NULL AND later.livestock_id = b.livestock_id
          AND (later.event_date, later.id) > (b.event_date, b.id)
          AND later.event_type IN ('heat_watch_removed', 'natural_service', 'artificial_insemination', 'pregnancy_confirmed'))
      ORDER BY expected_date, b.id DESC LIMIT $2 OFFSET $3`,
    count: `SELECT COUNT(*)::int total FROM breeding_records b JOIN livestock l ON l.id = b.livestock_id
      WHERE b.archived_at IS NULL AND l.archived_at IS NULL AND $1::text IS NOT NULL AND b.event_type = 'heat_observed' AND b.event_date + 21 >= CURRENT_DATE
        AND NOT EXISTS (SELECT 1 FROM breeding_records later WHERE later.archived_at IS NULL AND later.livestock_id = b.livestock_id
          AND (later.event_date, later.id) > (b.event_date, b.id)
          AND later.event_type IN ('heat_watch_removed', 'natural_service', 'artificial_insemination', 'pregnancy_confirmed'))`,
  },
};

export async function GET(request: NextRequest) {
  const auth = await requireRole("veterinarian", "farm_aide"); if ("response" in auth) return auth.response;
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const requestedList = request.nextUrl.searchParams.get("list") ?? "pregnancies";
  if (!listNames.includes(requestedList as ListName)) return NextResponse.json({ error: "Unknown breeding list" }, { status: 400 });
  const list = requestedList as ListName;
  const page = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
  const includeMeta = request.nextUrl.searchParams.get("meta") !== "0";
  const method = ["natural_service", "artificial_insemination"].includes(request.nextUrl.searchParams.get("method") ?? "") ? request.nextUrl.searchParams.get("method")! : "all";
  const status = ["pending", "due", "resolved"].includes(request.nextUrl.searchParams.get("status") ?? "") ? request.nextUrl.searchParams.get("status")! : "all";
  const sort = ["oldest", "dam", "sire", "check"].includes(request.nextUrl.searchParams.get("sort") ?? "") ? request.nextUrl.searchParams.get("sort")! : "newest";
  const offset = (page - 1) * PAGE_SIZE;
  const today = new Date().toISOString().slice(0, 10);
  const sql = listSql[list];

  const [animals, listRows, listCount, summaryResult, heatReadyResult, cycleCountResult, sirePerformanceResult] = await Promise.all([
    includeMeta ? db.query(`SELECT l.*,
        (SELECT COUNT(*)::int FROM health_records h WHERE h.livestock_id = l.id AND h.archived_at IS NULL AND h.status = 'open') AS open_health_cases,
        latest.record_type AS latest_health_type, latest.record_date AS latest_health_date,
        latest.diagnosis AS latest_health_diagnosis, latest.status AS latest_health_record_status,
        latest.follow_up_date AS latest_health_follow_up
      FROM livestock l
      LEFT JOIN LATERAL (SELECT h.record_type, h.record_date, h.diagnosis, h.status, h.follow_up_date FROM health_records h WHERE h.livestock_id = l.id AND h.archived_at IS NULL ORDER BY h.record_date DESC, h.id DESC LIMIT 1) latest ON TRUE
      WHERE l.archived_at IS NULL AND l.status = 'active' AND ($1 = '' OR l.tag_number ILIKE '%' || $1 || '%' OR COALESCE(l.name, '') ILIKE '%' || $1 || '%')
      ORDER BY l.sex, l.birth_date`, [search]) : Promise.resolve({ rows: [] }),
    db.query(sql.rows, list === "records" ? [search, PAGE_SIZE, offset, method, status, sort] : [search, PAGE_SIZE, offset]),
    db.query(sql.count, list === "records" ? [search, method, status] : [search]),
    includeMeta ? db.query(`WITH latest_record AS (
        SELECT DISTINCT ON (livestock_id) livestock_id, pregnancy_status FROM breeding_records
        WHERE archived_at IS NULL ORDER BY livestock_id, event_date DESC, id DESC
      ), latest_service AS (
        SELECT DISTINCT ON (livestock_id) livestock_id, event_date FROM breeding_records
        WHERE archived_at IS NULL AND event_type IN ('natural_service', 'artificial_insemination')
        ORDER BY livestock_id, event_date DESC, id DESC
      ), pregnancies AS (
        SELECT s.event_date FROM livestock l JOIN latest_record r ON r.livestock_id = l.id JOIN latest_service s ON s.livestock_id = l.id
        WHERE l.archived_at IS NULL AND l.status = 'active' AND l.sex = 'female' AND r.pregnancy_status = 'pregnant'
          AND ($1 = '' OR l.tag_number ILIKE '%' || $1 || '%' OR COALESCE(l.name, '') ILIKE '%' || $1 || '%')
      ), checks AS (
        SELECT b.event_date + 45 due_date FROM breeding_records b JOIN livestock l ON l.id = b.livestock_id
        WHERE b.archived_at IS NULL AND l.archived_at IS NULL AND b.event_type IN ('natural_service', 'artificial_insemination') AND b.pregnancy_status = 'pending'
          AND NOT EXISTS (SELECT 1 FROM breeding_records o WHERE o.archived_at IS NULL AND o.livestock_id = b.livestock_id
            AND o.event_type IN ('pregnancy_confirmed', 'pregnancy_negative', 'pregnancy_loss') AND (o.event_date, o.id) > (b.event_date, b.id)
            AND NOT EXISTS (SELECT 1 FROM breeding_records n WHERE n.archived_at IS NULL AND n.livestock_id = b.livestock_id
              AND n.event_type IN ('natural_service', 'artificial_insemination') AND (n.event_date, n.id) > (b.event_date, b.id) AND (n.event_date, n.id) < (o.event_date, o.id)))
      ) SELECT (SELECT COUNT(*)::int FROM pregnancies) pregnancies,
        (SELECT COUNT(*)::int FROM checks WHERE due_date <= CURRENT_DATE) checks_due,
        (SELECT COUNT(*)::int FROM pregnancies WHERE CURRENT_DATE - event_date >= 269) near_calving,
        (SELECT COUNT(*)::int FROM calf_care_plans c JOIN livestock l ON l.id = c.livestock_id WHERE c.status = 'pending' AND l.archived_at IS NULL AND c.due_date <= CURRENT_DATE) care_due`, [search]) : Promise.resolve({ rows: [] }),
      includeMeta ? db.query(`SELECT livestock_id FROM (SELECT DISTINCT ON (b.livestock_id) b.livestock_id, b.event_type
      FROM breeding_records b WHERE b.archived_at IS NULL AND b.event_type IN ('heat_observed', 'heat_watch_removed', 'natural_service', 'artificial_insemination', 'pregnancy_confirmed')
      ORDER BY b.livestock_id, b.event_date DESC, b.id DESC) latest WHERE event_type = 'heat_observed'`) : Promise.resolve({ rows: [] }),
    includeMeta ? db.query(`SELECT livestock_id, COUNT(*)::int count FROM breeding_records
      WHERE archived_at IS NULL AND event_type IN ('natural_service', 'artificial_insemination') GROUP BY livestock_id`) : Promise.resolve({ rows: [] }),
    includeMeta ? db.query(`WITH services AS (
        SELECT b.id, b.livestock_id, b.sire_id, b.event_date,
          LEAD(b.event_date) OVER (PARTITION BY b.livestock_id ORDER BY b.event_date, b.id) next_date
        FROM breeding_records b WHERE b.archived_at IS NULL AND b.event_type IN ('natural_service', 'artificial_insemination')
      ), outcomes AS (
        SELECT s.id, outcome.event_type FROM services s LEFT JOIN LATERAL (
          SELECT b.event_type FROM breeding_records b WHERE b.archived_at IS NULL AND b.livestock_id = s.livestock_id
            AND b.event_date >= s.event_date AND (s.next_date IS NULL OR b.event_date < s.next_date)
            AND b.event_type IN ('pregnancy_confirmed', 'pregnancy_negative', 'pregnancy_loss')
          ORDER BY b.event_date, b.id LIMIT 1) outcome ON TRUE
      ), stats AS (
        SELECT s.sire_id, COUNT(*)::int services, COUNT(o.event_type)::int resolved,
          COUNT(*) FILTER (WHERE o.event_type = 'pregnancy_confirmed')::int confirmed
        FROM services s LEFT JOIN outcomes o ON o.id = s.id WHERE s.sire_id IS NOT NULL GROUP BY s.sire_id
      ) SELECT sire.id "sireId", COALESCE(stats.services, 0)::int services, COALESCE(stats.resolved, 0)::int resolved,
        COALESCE(stats.confirmed, 0)::int confirmed,
        CASE WHEN stats.resolved > 0 THEN ROUND(stats.confirmed::numeric / stats.resolved * 100)::int END "successRate",
        (SELECT COUNT(*)::int FROM livestock dam WHERE dam.archived_at IS NULL AND dam.status = 'active' AND dam.sex = 'female'
          AND (sire.id IN (dam.sire_id, dam.dam_id) OR dam.id IN (sire.sire_id, sire.dam_id)
            OR (dam.sire_id IS NOT NULL AND dam.sire_id IN (sire.sire_id, sire.dam_id))
            OR (dam.dam_id IS NOT NULL AND dam.dam_id IN (sire.sire_id, sire.dam_id)))) conflicts
      FROM livestock sire LEFT JOIN stats ON stats.sire_id = sire.id
      WHERE sire.archived_at IS NULL AND sire.status = 'active' AND sire.sex = 'male'
      ORDER BY "successRate" DESC NULLS LAST, services DESC`) : Promise.resolve({ rows: [] }),
  ]);

  const cattle = animals.rows.map((animal) => ({ ...withCategory(animal), eligibility: breedingEligibility(dateString(animal.birth_date), today, animal.health_status, animal.body_condition_score == null ? null : Number(animal.body_condition_score)) }));
  const rows = listRows.rows.map((row) => {
    if (list === "care") return { ...row, due_date: row.due_date ? dateString(row.due_date) : null };
    if (list === "pregnancyChecks") return { ...row, breeding_date: dateString(row.breeding_date), check_date: dateString(row.check_date), expected_calving_date: dateString(row.expected_calving_date) };
    if (list !== "pregnancies") return row;
    const daysPregnant = Number(row.days_pregnant);
    return { ...row, conception_date: dateString(row.conception_date), confirmation_due_date: dateString(row.confirmation_due_date), expected_calving_date: dateString(row.expected_calving_date), days_pregnant: daysPregnant, ...gestationStage(daysPregnant) };
  });
  const total = Number(listCount.rows[0].total);
  const summaryRow = summaryResult.rows[0] ?? { pregnancies: 0, checks_due: 0, near_calving: 0, care_due: 0 };
  const cycleCounts = Object.fromEntries(cycleCountResult.rows.map((row) => [row.livestock_id, Number(row.count)]));
  return NextResponse.json({
    cattle, list, rows, pagination: { page, total, hasNext: offset + PAGE_SIZE < total },
    summary: { pregnancies: Number(summaryRow.pregnancies), checksDue: Number(summaryRow.checks_due), nearCalving: Number(summaryRow.near_calving), careDue: Number(summaryRow.care_due) },
    form: { heatReadyIds: heatReadyResult.rows.map((row) => row.livestock_id), cycleCounts, sirePerformance: sirePerformanceResult.rows },
  }, { headers: { "Cache-Control": "no-store" } });
}
