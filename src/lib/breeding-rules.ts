const DAY_MS = 86_400_000;

export const breedingEventTypes = new Set([
  "heat_observed",
  "heat_watch_removed",
  "natural_service",
  "artificial_insemination",
  "pregnancy_check",
  "pregnancy_confirmed",
  "pregnancy_negative",
  "pregnancy_loss",
  "calving",
]);

export function dateOnly(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? value : null;
}

export function addDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(startDate: string, endDate: string) {
  return Math.floor((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / DAY_MS);
}

export function gestationStage(daysPregnant: number) {
  if (daysPregnant >= 283) return { key: "calving", label: "In Labor", guidance: "Observe labor and provide assistance when necessary." };
  if (daysPregnant >= 269) return { key: "pre_calving", label: "Near Calving", guidance: "Prepare a clean, safe, accessible parturition area and monitor signs of labor." };
  if (daysPregnant >= 191) return { key: "late", label: "Late Stage (Third Trimester)", guidance: "Monitor body condition, nutrition, health, and signs of impending labor." };
  if (daysPregnant >= 96) return { key: "mid", label: "Mid Stage (Second Trimester)", guidance: "Monitor rapid fetal growth, nutrition, body condition, and overall health." };
  return { key: "early", label: "Early Stage (First Trimester)", guidance: "Confirm pregnancy near day 90 and monitor early fetal development." };
}

export function dateString(value: string | Date) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

export function breedingDefaults(eventType: string, eventDate: string) {
  if (["natural_service", "artificial_insemination"].includes(eventType)) return { pregnancyStatus: "pending", expectedCalvingDate: addDays(eventDate, 283) };
  if (eventType === "pregnancy_confirmed") return { pregnancyStatus: "pregnant", expectedCalvingDate: null };
  if (eventType === "pregnancy_negative") return { pregnancyStatus: "not_pregnant", expectedCalvingDate: null };
  if (eventType === "pregnancy_loss") return { pregnancyStatus: "lost", expectedCalvingDate: null };
  return { pregnancyStatus: null, expectedCalvingDate: null };
}

export function ageInMonths(birthDate: string, onDate: string) {
  const born = new Date(`${birthDate}T00:00:00Z`), on = new Date(`${onDate}T00:00:00Z`);
  return (on.getUTCFullYear() - born.getUTCFullYear()) * 12 + on.getUTCMonth() - born.getUTCMonth() - (on.getUTCDate() < born.getUTCDate() ? 1 : 0);
}

export function breedingEligibility(birthDate: string, onDate: string, healthStatus?: string | null, bodyConditionScore?: number | null) {
  const months = ageInMonths(birthDate, onDate);
  const health = healthStatus?.toLowerCase();
  const reasons = [months < 18 ? "Under 18 months" : "", !health ? "Health not recorded" : !["excellent", "good", "healthy"].includes(health) ? `Health: ${healthStatus}` : "", bodyConditionScore == null ? "BCS not recorded" : bodyConditionScore < 2 || bodyConditionScore > 4 ? `BCS ${bodyConditionScore} outside 2–4` : ""].filter(Boolean);
  return { months, eligible: reasons.length === 0, firstBreedingWindow: months >= 18 && months <= 24, reasons };
}
