import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { withCategory } from "@/lib/livestock";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const monthKey = (value: Date | string) => new Date(value).toISOString().slice(0, 7);
const monthLabel = (key: string) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
const displayLabel = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export async function GET(request: NextRequest) {
  const auth = await requireRole("veterinarian", "faculty");
  if ("response" in auth) return auth.response;

  const params = request.nextUrl.searchParams;
  const now = new Date();
  const fallbackFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)).toISOString().slice(0, 10);
  const from = params.get("from") ?? fallbackFrom;
  const to = params.get("to") ?? now.toISOString().slice(0, 10);
  const breed = params.get("breed")?.trim() ?? "";
  const sex = params.get("sex") ?? "";
  const category = params.get("category") ?? "";
  if (!datePattern.test(from) || !datePattern.test(to) || from > to) return NextResponse.json({ error: "Valid analytics dates are required" }, { status: 400 });
  if (sex && !["male", "female"].includes(sex)) return NextResponse.json({ error: "Invalid sex filter" }, { status: 400 });

  const [livestockResult, breedingResult, healthResult, calvingResult] = await Promise.all([
    db.query("SELECT id,sex,breed,birth_date,has_calved,status,acquisition_type,created_at,archived_at,current_weight_kg FROM livestock WHERE archived_at IS NULL ORDER BY created_at"),
    db.query("SELECT id,livestock_id,event_type,event_date,source_service_id FROM breeding_records WHERE archived_at IS NULL AND event_date BETWEEN $1 AND $2 ORDER BY event_date,id", [from, to]),
    db.query("SELECT id,livestock_id,record_type,record_date,status,follow_up_date FROM health_records WHERE archived_at IS NULL AND record_date BETWEEN $1 AND $2 ORDER BY record_date,id", [from, to]),
    db.query("SELECT id,dam_id,birth_date FROM calving_events WHERE birth_date BETWEEN $1 AND $2 ORDER BY birth_date,id", [from, to]),
  ]);

  const allAnimals = livestockResult.rows.map(withCategory);
  const filteredAnimals = allAnimals.filter((animal) => (!breed || animal.breed === breed) && (!sex || animal.sex === sex) && (!category || animal.category === category));
  const ids = new Set(filteredAnimals.map((animal) => Number(animal.id)));
  const live = filteredAnimals.filter((animal) => animal.status === "active");
  const breeding = breedingResult.rows.filter((row) => ids.has(Number(row.livestock_id)));
  const health = healthResult.rows.filter((row) => ids.has(Number(row.livestock_id)));
  const calvings = calvingResult.rows.filter((row) => ids.has(Number(row.dam_id)));

  const startMonth = new Date(`${from}T00:00:00Z`);
  startMonth.setUTCDate(1);
  const endMonth = new Date(`${to}T00:00:00Z`);
  endMonth.setUTCDate(1);
  const monthKeys: string[] = [];
  for (const cursor = new Date(startMonth); cursor <= endMonth; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) monthKeys.push(monthKey(cursor));
  const herdMovement = monthKeys.map((month) => {
    const end = new Date(`${month}-01T00:00:00Z`); end.setUTCMonth(end.getUTCMonth() + 1);
    const registrations = filteredAnimals.filter((animal) => monthKey(animal.created_at) === month).length;
    const births = filteredAnimals.filter((animal) => animal.acquisition_type === "born_on_farm" && monthKey(animal.created_at) === month).length;
    const closing = filteredAnimals.filter((animal) => new Date(animal.created_at) < end && animal.status === "active").length;
    return { month: monthLabel(month), closing, registrations, births };
  });

  const heat = breeding.filter((row) => row.event_type === "heat_observed").length;
  const services = breeding.filter((row) => ["natural_service", "artificial_insemination"].includes(row.event_type));
  const confirmed = breeding.filter((row) => row.event_type === "pregnancy_confirmed").length;
  const negative = breeding.filter((row) => row.event_type === "pregnancy_negative").length;
  const losses = breeding.filter((row) => row.event_type === "pregnancy_loss").length;
  const pending = Math.max(0, services.length - confirmed - negative - losses);
  const pregnancyOutcomes = monthKeys.map((month) => ({
    month: monthLabel(month),
    confirmed: breeding.filter((row) => monthKey(row.event_date) === month && row.event_type === "pregnancy_confirmed").length,
    negative: breeding.filter((row) => monthKey(row.event_date) === month && row.event_type === "pregnancy_negative").length,
    losses: breeding.filter((row) => monthKey(row.event_date) === month && row.event_type === "pregnancy_loss").length,
  }));
  const healthMonthly = monthKeys.map((month) => ({
    month: monthLabel(month),
    open: health.filter((row) => monthKey(row.record_date) === month && row.status === "open").length,
    resolved: health.filter((row) => monthKey(row.record_date) === month && row.status === "resolved").length,
  }));
  const healthTypes = [...new Set(health.map((row) => String(row.record_type)))].map((recordType) => ({ label: displayLabel(recordType), value: health.filter((row) => row.record_type === recordType).length })).sort((a, b) => b.value - a.value).slice(0, 7);
  const composition = ["Cow", "Heifer", "Calf", "Bull", "Yearling bull"].map((label) => ({ label, value: live.filter((animal) => animal.category === label).length })).filter((item) => item.value);
  const breeds = [...new Set(allAnimals.map((animal) => String(animal.breed)))].sort();
  const activeCases = health.filter((row) => row.status === "open").length;
  const overdue = health.filter((row) => row.status === "open" && row.follow_up_date && String(row.follow_up_date).slice(0, 10) < to).length;
  const completedOutcomes = confirmed + negative + losses;

  return NextResponse.json({
    generatedAt: new Date().toISOString(), from, to, filters: { breeds },
    kpis: { liveHerd: live.length, breedingSuccess: completedOutcomes ? confirmed / completedOutcomes * 100 : 0, pregnancyRate: services.length ? confirmed / services.length * 100 : 0, calvingRate: confirmed ? calvings.length / confirmed * 100 : 0, activeHealthCases: activeCases, mortalityRate: filteredAnimals.length ? filteredAnimals.filter((animal) => animal.status === "deceased").length / filteredAnimals.length * 100 : 0 },
    herdMovement, composition,
    reproductionFunnel: [{ label: "Heat observed", value: heat }, { label: "Service recorded", value: services.length }, { label: "Confirmed", value: confirmed }, { label: "Calving", value: calvings.length }],
    pregnancyOutcomes, healthTypes, healthMonthly,
    insights: [
      { level: overdue ? "alert" : "positive", title: overdue ? `${overdue} overdue health follow-up${overdue === 1 ? "" : "s"}` : "Health follow-ups are current", detail: overdue ? "Review unresolved records whose follow-up date has passed." : "No overdue follow-up was found in this period.", href: "/health" },
      { level: pending ? "warning" : "positive", title: `${pending} breeding outcome${pending === 1 ? "" : "s"} pending`, detail: "Services without a confirmed, negative, or loss outcome.", href: "/reproduction?tab=breeding" },
      { level: "neutral", title: `${calvings.length} calving${calvings.length === 1 ? "" : "s"} recorded`, detail: `Across ${monthKeys.length} selected month${monthKeys.length === 1 ? "" : "s"}.`, href: "/reproduction?tab=calving" },
    ],
  }, { headers: { "Cache-Control": "no-store" } });
}
