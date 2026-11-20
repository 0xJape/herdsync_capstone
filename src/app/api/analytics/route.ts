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

  const [livestockResult, breedingResult, healthResult, calvingResult, reproductionStatusResult] = await Promise.all([
    db.query("SELECT id,sex,breed,birth_date,has_calved,status,acquisition_type,acquisition_date,created_at,archived_at,current_weight_kg FROM livestock ORDER BY created_at"),
    db.query(`SELECT b.id,b.livestock_id,b.event_type,b.event_date,b.source_service_id,b.expected_calving_date
      FROM breeding_records b
      LEFT JOIN breeding_records service ON service.id = b.source_service_id
      WHERE b.archived_at IS NULL AND (b.event_date BETWEEN $1 AND $2 OR service.event_date BETWEEN $1 AND $2)
      ORDER BY b.event_date,b.id`, [from, to]),
    db.query("SELECT id,livestock_id,record_type,record_date,status,follow_up_date FROM health_records WHERE archived_at IS NULL AND record_date BETWEEN $1 AND $2 ORDER BY record_date,id", [from, to]),
    db.query(`SELECT c.id,c.dam_id,c.birth_date,c.service_id,o.outcome,
        (service.event_date BETWEEN $1 AND $2) AS service_in_period,
        (c.birth_date BETWEEN $1 AND $2) AS birth_in_period
      FROM calving_events c LEFT JOIN calving_outcomes o ON o.calving_event_id = c.id
      JOIN breeding_records service ON service.id = c.service_id
      WHERE service.event_date BETWEEN $1 AND $2 OR c.birth_date BETWEEN $1 AND $2
      ORDER BY c.birth_date,c.id,o.birth_order`, [from, to]),
    db.query(`SELECT confirmation.livestock_id,confirmation.event_type,service.event_date conception_date
      FROM breeding_records confirmation
      LEFT JOIN breeding_records service ON service.id = confirmation.source_service_id
      WHERE confirmation.archived_at IS NULL AND confirmation.event_type IN ('pregnancy_confirmed','pregnancy_loss')
        AND (confirmation.event_type = 'pregnancy_loss' OR NOT EXISTS (
          SELECT 1 FROM calving_events c WHERE c.pregnancy_confirmation_id = confirmation.id
        )) AND (confirmation.event_type = 'pregnancy_loss' OR NOT EXISTS (
          SELECT 1 FROM breeding_records loss WHERE loss.archived_at IS NULL AND loss.event_type = 'pregnancy_loss'
            AND loss.source_service_id = confirmation.source_service_id
        ))`),
  ]);

  const allRecords = livestockResult.rows.map(withCategory);
  const filteredRecords = allRecords.filter((animal) => (!breed || animal.breed === breed) && (!sex || animal.sex === sex) && (!category || animal.category === category));
  const allAnimals = allRecords.filter((animal) => !animal.archived_at);
  const filteredAnimals = filteredRecords.filter((animal) => !animal.archived_at);
  const ids = new Set(filteredAnimals.map((animal) => Number(animal.id)));
  const live = filteredAnimals.filter((animal) => animal.status === "active");
  const breeding = breedingResult.rows.filter((row) => ids.has(Number(row.livestock_id)));
  const health = healthResult.rows.filter((row) => ids.has(Number(row.livestock_id)));
  const calvings = calvingResult.rows.filter((row) => ids.has(Number(row.dam_id)) && row.service_in_period);

  const startMonth = new Date(`${from}T00:00:00Z`);
  startMonth.setUTCDate(1);
  const endMonth = new Date(`${to}T00:00:00Z`);
  endMonth.setUTCDate(1);
  const monthKeys: string[] = [];
  for (const cursor = new Date(startMonth); cursor <= endMonth; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) monthKeys.push(monthKey(cursor));
  const herdMovement = monthKeys.map((month) => {
    const acquiredInMonth = (animal: Record<string, unknown>) => animal.acquisition_date && monthKey(String(animal.acquisition_date)) === month;
    return {
      month: monthLabel(month),
      purchased: filteredAnimals.filter((animal) => animal.acquisition_type === "purchased" && acquiredInMonth(animal)).length,
      bornOnFarm: filteredAnimals.filter((animal) => animal.acquisition_type === "born_on_farm" && monthKey(String(animal.birth_date)) === month).length,
      transferredIn: filteredAnimals.filter((animal) => animal.acquisition_type === "transferred_in" && acquiredInMonth(animal)).length,
      donated: filteredAnimals.filter((animal) => animal.acquisition_type === "donated" && acquiredInMonth(animal)).length,
    };
  });

  const heat = breeding.filter((row) => row.event_type === "heat_observed").length;
  const services = breeding.filter((row) => ["natural_service", "artificial_insemination"].includes(row.event_type) && String(row.event_date).slice(0, 10) >= from && String(row.event_date).slice(0, 10) <= to);
  const outcomes = breeding.filter((row) => row.source_service_id && services.some((service) => Number(service.id) === Number(row.source_service_id)));
  const confirmed = outcomes.filter((row) => row.event_type === "pregnancy_confirmed").length;
  const negative = outcomes.filter((row) => row.event_type === "pregnancy_negative").length;
  const losses = outcomes.filter((row) => row.event_type === "pregnancy_loss").length;
  const resolvedServiceIds = new Set(outcomes.filter((row) => ["pregnancy_confirmed", "pregnancy_negative"].includes(row.event_type)).map((row) => Number(row.source_service_id)));
  const pending = services.filter((service) => !resolvedServiceIds.has(Number(service.id))).length;
  const breedingMethods = ["natural_service", "artificial_insemination"].map((method) => {
    const methodServices = services.filter((service) => service.event_type === method);
    const serviceIds = new Set(methodServices.map((service) => Number(service.id)));
    const methodConfirmed = outcomes.filter((row) => row.event_type === "pregnancy_confirmed" && serviceIds.has(Number(row.source_service_id))).length;
    const unsuccessful = outcomes.filter((row) => row.event_type === "pregnancy_negative" && serviceIds.has(Number(row.source_service_id))).length;
    return { label: displayLabel(method), services: methodServices.length, confirmed: methodConfirmed, unsuccessful, pending: methodServices.length - methodConfirmed - unsuccessful, conceptionRate: methodConfirmed + unsuccessful ? methodConfirmed / (methodConfirmed + unsuccessful) * 100 : 0 };
  });
  const pregnancyOutcomes = monthKeys.map((month) => ({
    month: monthLabel(month),
    confirmed: breeding.filter((row) => monthKey(row.event_date) === month && row.event_type === "pregnancy_confirmed").length,
    negative: breeding.filter((row) => monthKey(row.event_date) === month && row.event_type === "pregnancy_negative").length,
    losses: breeding.filter((row) => monthKey(row.event_date) === month && row.event_type === "pregnancy_loss").length,
  }));
  const reproductionProgress = monthKeys.map((month) => ({
    month: monthLabel(month),
    heatObservations: breeding.filter((row) => row.event_type === "heat_observed" && monthKey(row.event_date) === month).length,
    breedingServices: services.filter((row) => monthKey(row.event_date) === month).length,
    confirmedPregnancies: breeding.filter((row) => row.event_type === "pregnancy_confirmed" && monthKey(row.event_date) === month).length,
    calvings: new Set(calvingResult.rows.filter((row) => ids.has(Number(row.dam_id)) && row.birth_in_period && monthKey(row.birth_date) === month).map((row) => Number(row.id))).size,
  }));
  const healthMonthly = monthKeys.map((month) => ({
    month: monthLabel(month),
    open: health.filter((row) => monthKey(row.record_date) === month && row.status === "open").length,
    resolved: health.filter((row) => monthKey(row.record_date) === month && row.status === "resolved").length,
  }));
  const healthTypes = [...new Set(health.map((row) => String(row.record_type)))].map((recordType) => ({ label: displayLabel(recordType), value: health.filter((row) => row.record_type === recordType).length })).sort((a, b) => b.value - a.value).slice(0, 7);
  const composition = ["Cow", "Heifer", "Calf", "Bull", "Yearling bull"].map((label) => ({ label, value: live.filter((animal) => animal.category === label).length })).filter((item) => item.value);
  const herdStatuses = [
    { label: "All Records", value: filteredRecords.length },
    { label: "Active", value: filteredRecords.filter((animal) => !animal.archived_at && animal.status === "active").length },
    { label: "Sold", value: filteredRecords.filter((animal) => !animal.archived_at && animal.status === "sold").length },
    { label: "Culled", value: filteredRecords.filter((animal) => !animal.archived_at && animal.status === "culled").length },
    { label: "Deceased", value: filteredRecords.filter((animal) => !animal.archived_at && animal.status === "deceased").length },
    { label: "Transferred Out", value: filteredRecords.filter((animal) => !animal.archived_at && animal.status === "transferred_out").length },
    { label: "Archived", value: filteredRecords.filter((animal) => Boolean(animal.archived_at)).length },
  ];
  const breeds = [...new Set(allAnimals.map((animal) => String(animal.breed)))].sort();
  const activeCases = health.filter((row) => row.status === "open").length;
  const resolvedCases = health.filter((row) => row.status === "resolved").length;
  const overdue = health.filter((row) => row.status === "open" && row.follow_up_date && String(row.follow_up_date).slice(0, 10) < to).length;
  const completedOutcomes = confirmed + negative;
  const calvingIds = new Set(calvings.map((row) => Number(row.id)));
  const calfOutcomes = calvingResult.rows.filter((row) => ids.has(Number(row.dam_id)) && row.birth_in_period && row.outcome);
  const liveCalves = calfOutcomes.filter((row) => row.outcome === "live").length;
  const calvingOutcomes = ["live", "stillborn", "neonatal_death"].map((outcome) => ({ label: displayLabel(outcome), value: calfOutcomes.filter((row) => row.outcome === outcome).length }));
  const currentReproduction = reproductionStatusResult.rows.filter((row) => ids.has(Number(row.livestock_id)));
  const todayTime = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  const pregnancyStages = [
    { label: "First Trimester", value: 0 },
    { label: "Second Trimester", value: 0 },
    { label: "Third Trimester", value: 0 },
    { label: "Overdue", value: 0 },
  ];
  currentReproduction.filter((row) => row.event_type === "pregnancy_confirmed" && row.conception_date).forEach((row) => {
    const days = Math.max(0, Math.floor((todayTime - Date.parse(`${String(row.conception_date).slice(0, 10)}T00:00:00Z`)) / 86400000));
    pregnancyStages[days >= 283 ? 3 : days >= 191 ? 2 : days >= 96 ? 1 : 0].value++;
  });
  const nearCalvingEnd = new Date(); nearCalvingEnd.setUTCDate(nearCalvingEnd.getUTCDate() + 30);
  const nearCalvingDate = nearCalvingEnd.toISOString().slice(0, 10);
  const reproductionStatuses = {
    checksDue: pending,
    confirmedPregnant: currentReproduction.filter((row) => row.event_type === "pregnancy_confirmed").length,
    nearCalving: currentReproduction.filter((row) => row.event_type === "pregnancy_confirmed" && row.expected_calving_date && String(row.expected_calving_date).slice(0, 10) >= to && String(row.expected_calving_date).slice(0, 10) <= nearCalvingDate).length,
    pregnancyLosses: losses,
  };

  return NextResponse.json({
    generatedAt: new Date().toISOString(), from, to, filters: { breeds },
    kpis: { liveHerd: live.length, conceptionRate: completedOutcomes ? confirmed / completedOutcomes * 100 : 0, calvingRate: confirmed ? calvingIds.size / confirmed * 100 : 0, liveCalfRate: calfOutcomes.length ? liveCalves / calfOutcomes.length * 100 : 0, activeHealthCases: activeCases, mortalityRate: filteredAnimals.length ? filteredAnimals.filter((animal) => animal.status === "deceased").length / filteredAnimals.length * 100 : 0 },
    herdMovement, composition, herdStatuses,
    reproductionFunnel: [{ label: "Heat Observations", value: heat }, { label: "Breeding Services", value: services.length }, { label: "Pregnancies Confirmed", value: confirmed }, { label: "Calvings Recorded", value: calvingIds.size }],
    reproductionProgress,
    pregnancyOutcomes, pregnancyStages, calvingOutcomes, breedingMethods, reproductionStatuses, healthTypes, healthMonthly,
    healthStatuses: { activeCases, resolvedCases, overdueFollowUps: overdue, mortalityRate: filteredAnimals.length ? filteredAnimals.filter((animal) => animal.status === "deceased").length / filteredAnimals.length * 100 : 0 },
    insights: [
      { level: overdue ? "alert" : "positive", title: overdue ? `${overdue} overdue health follow-up${overdue === 1 ? "" : "s"}` : "Health follow-ups are current", detail: overdue ? "Review unresolved records whose follow-up date has passed." : "No overdue follow-up was found in this period.", href: "/health" },
      { level: pending ? "warning" : "positive", title: `${pending} breeding outcome${pending === 1 ? "" : "s"} pending`, detail: "Services without a confirmed, negative, or loss outcome.", href: "/reproduction?tab=breeding" },
      { level: "neutral", title: `${calvings.length} calving${calvings.length === 1 ? "" : "s"} recorded`, detail: `Across ${monthKeys.length} selected month${monthKeys.length === 1 ? "" : "s"}.`, href: "/reproduction?tab=calving" },
    ],
  }, { headers: { "Cache-Control": "no-store" } });
}
