import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { addDays, breedingDefaults, breedingEligibility, breedingEventTypes, dateOnly, dateString } from "@/lib/breeding-rules";

type Context = { params: Promise<{ id: string }> };
const validDate = (value: unknown, required = false) => (!required && (value == null || value === "")) || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));
const validText = (value: unknown, max: number, required = false) => typeof value === "string" && (!required || !!value.trim()) && value.length <= max;
const getId = async ({ params }: Context) => { const id = Number((await params).id); return Number.isSafeInteger(id) && id > 0 ? id : null; };

export async function GET(_request: NextRequest, context: Context) {
  const auth = await requireRole("veterinarian", "farm_aide", "faculty"); if ("response" in auth) return auth.response;
  const id = await getId(context); if (!id) return NextResponse.json({ error: "Invalid livestock ID" }, { status: 400 });
  const result = await db.query("SELECT b.*, s.tag_number sire_tag_number, u.display_name added_by FROM breeding_records b LEFT JOIN livestock s ON s.id = b.sire_id LEFT JOIN users u ON u.id = b.created_by_user_id WHERE b.livestock_id = $1 AND b.archived_at IS NULL ORDER BY b.event_date DESC, b.id DESC", [id]);
  return NextResponse.json(result.rows);
}

export async function POST(request: NextRequest, context: Context) {
  const auth = await requireRole("veterinarian", "farm_aide"); if ("response" in auth) return auth.response;
  const id = await getId(context); if (!id) return NextResponse.json({ error: "Invalid livestock ID" }, { status: 400 });
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!validText(body.event_type, 100, true)) return NextResponse.json({ error: "Event type is required and must be at most 100 characters" }, { status: 400 });
  if (!validDate(body.event_date, true) || !validDate(body.expected_calving_date)) return NextResponse.json({ error: "Invalid event or expected calving date" }, { status: 400 });
  const eventType = String(body.event_type).trim(), eventDate = dateOnly(body.event_date);
  if (!breedingEventTypes.has(eventType) || eventType === "calving") return NextResponse.json({ error: "Invalid breeding event" }, { status: 400 });
  if (eventType === "heat_watch_removed" && !["not_in_heat", "pregnant", "entered_by_mistake"].includes(String(body.details))) return NextResponse.json({ error: "Valid heat-watch removal reason is required" }, { status: 400 });
  if (["pregnancy_confirmed", "pregnancy_negative"].includes(eventType) && (!validText(body.details, 10000, true) || !validText(body.performed_by, 150, true))) return NextResponse.json({ error: "Pregnancy check notes and confirmed by are required" }, { status: 400 });
  if (!eventDate || eventDate > new Date().toISOString().slice(0, 10)) return NextResponse.json({ error: "Breeding event cannot be in the future" }, { status: 400 });
  if (body.expected_calving_date && String(body.expected_calving_date) <= eventDate) return NextResponse.json({ error: "Expected calving must be after the event date" }, { status: 400 });
  for (const [field, max] of [["pregnancy_status", 50], ["details", 10000], ["performed_by", 150]] as const) if (body[field] != null && !validText(body[field], max)) return NextResponse.json({ error: `${field} is too long` }, { status: 400 });
  const sireId = body.sire_id == null || body.sire_id === "" ? null : Number(body.sire_id);
  if (sireId !== null && (!Number.isSafeInteger(sireId) || sireId < 1)) return NextResponse.json({ error: "Invalid sire" }, { status: 400 });
  const sourceServiceId = body.source_service_id == null || body.source_service_id === "" ? null : Number(body.source_service_id);
  if (sourceServiceId !== null && (!Number.isSafeInteger(sourceServiceId) || sourceServiceId < 1)) return NextResponse.json({ error: "Invalid breeding service" }, { status: 400 });
  const animal = await db.query("SELECT tag_number, sex, birth_date, health_status, body_condition_score FROM livestock WHERE id = $1 AND status = 'active' AND archived_at IS NULL", [id]);
  if (!animal.rows[0]) return NextResponse.json({ error: "Livestock not found" }, { status: 404 });
  if (animal.rows[0].sex !== "female") return NextResponse.json({ error: "This event requires female cattle" }, { status: 409 });
  if (["natural_service", "artificial_insemination"].includes(eventType)) { const eligibility = breedingEligibility(dateString(animal.rows[0].birth_date), eventDate, animal.rows[0].health_status, animal.rows[0].body_condition_score == null ? null : Number(animal.rows[0].body_condition_score)); if (!eligibility.eligible) return NextResponse.json({ error: `Dam is not breeding-ready: ${eligibility.reasons.join(", ")}` }, { status: 409 }); const latestCycleEvent = await db.query("SELECT event_type FROM breeding_records WHERE livestock_id = $1 AND event_type IN ('heat_observed','natural_service','artificial_insemination') AND archived_at IS NULL ORDER BY event_date DESC, id DESC LIMIT 1", [id]); if (latestCycleEvent.rows[0]?.event_type !== "heat_observed") return NextResponse.json({ error: "Record heat observation before selecting this dam for breeding" }, { status: 409 }); }
  if (sireId === id) return NextResponse.json({ error: "Animal cannot be its own sire" }, { status: 409 });
  if (sireId !== null) { const sire = await db.query("SELECT birth_date, health_status, body_condition_score FROM livestock WHERE id = $1 AND sex = 'male' AND status = 'active' AND archived_at IS NULL", [sireId]); if (!sire.rowCount) return NextResponse.json({ error: "Sire not found" }, { status: 404 }); const eligibility = breedingEligibility(dateString(sire.rows[0].birth_date), eventDate, sire.rows[0].health_status, sire.rows[0].body_condition_score == null ? null : Number(sire.rows[0].body_condition_score)); if (!eligibility.eligible) return NextResponse.json({ error: `Sire is not breeding-ready: ${eligibility.reasons.join(", ")}` }, { status: 409 }); }
  if (eventType === "natural_service" && sireId === null) return NextResponse.json({ error: "Sire is required for natural service" }, { status: 400 });
  let outcomeService: { event_date: string | Date; expected_calving_date: string | Date | null } | undefined;
  if (["pregnancy_confirmed", "pregnancy_negative"].includes(eventType)) { const service = sourceServiceId === null ? await db.query("SELECT event_date,expected_calving_date FROM breeding_records WHERE livestock_id = $1 AND event_type IN ('natural_service','artificial_insemination') AND archived_at IS NULL ORDER BY event_date DESC, id DESC LIMIT 1", [id]) : await db.query("SELECT event_date,expected_calving_date FROM breeding_records WHERE id = $1 AND livestock_id = $2 AND event_type IN ('natural_service','artificial_insemination') AND archived_at IS NULL", [sourceServiceId, id]); outcomeService = service.rows[0]; if (!outcomeService) return NextResponse.json({ error: "Breeding service not found" }, { status: 404 }); if (eventDate < addDays(dateString(outcomeService.event_date), 45)) return NextResponse.json({ error: `Pregnancy outcome cannot be recorded before ${addDays(dateString(outcomeService.event_date), 45)} (day 45)` }, { status: 409 }); }
  const defaults = breedingDefaults(eventType, eventDate);
  const pregnancyStatus = body.pregnancy_status || defaults.pregnancyStatus;
  let expectedCalvingDate = body.expected_calving_date || defaults.expectedCalvingDate;
  if (eventType === "pregnancy_confirmed" && !expectedCalvingDate) {
    expectedCalvingDate = outcomeService?.expected_calving_date || null;
  }
  const result = await db.query("INSERT INTO breeding_records (livestock_id, event_type, event_date, sire_id, pregnancy_status, expected_calving_date, details, performed_by, created_by_user_id, source_service_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *", [id, eventType, eventDate, sireId, pregnancyStatus, expectedCalvingDate, body.details || null, body.performed_by || null, auth.user.id, sourceServiceId]);
  await logActivity(auth.user.id, "create", "breeding", result.rows[0].id, `${result.rows[0].event_type} · ${animal.rows[0].tag_number}`, "Breeding record added");
  return NextResponse.json(result.rows[0], { status: 201 });
}