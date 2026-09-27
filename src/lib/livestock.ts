export const breeds = ["Brahman", "Angus", "Holstein", "Native/Carabao", "Crossbreed"] as const;
export const livestockStatuses = ["active", "sold", "culled", "deceased", "transferred"] as const;
export const healthStatuses = ["excellent", "good", "fair", "poor"] as const;

export const livestockFields = [
  "name", "sex", "breed", "birth_date", "birth_weight_kg", "current_weight_kg",
  "color_markings", "status", "acquisition_date", "notes", "purchased", "seller",
  "seller_contact", "seller_address", "purchase_price", "birth_type", "calf_vigor",
  "calving_difficulty", "weaning_date", "management_decision",
  "has_calved", "sire_id", "dam_id",
  "vaccination_treatment_history", "body_condition_score", "health_status", "physical_assessment_notes",
] as const;

export function cattleCategory(sex: unknown, birthDate: unknown, hasCalved = false) {
  const born = new Date(`${String(birthDate).slice(0, 10)}T00:00:00Z`);
  const today = new Date();
  let age = today.getUTCFullYear() - born.getUTCFullYear();
  if (today.getUTCMonth() < born.getUTCMonth() || (today.getUTCMonth() === born.getUTCMonth() && today.getUTCDate() < born.getUTCDate())) age--;
  if (age < 1) return "Calf";
  if (sex === "female") return hasCalved || age >= 2 ? "Cow" : "Heifer";
  return age < 2 ? "Yearling bull" : "Bull";
}

export function withCategory<T extends Record<string, unknown>>(animal: T) {
  return { ...animal, category: cattleCategory(animal.sex, animal.birth_date, animal.has_calved === true) };
}

export function normalizeLivestock(body: Record<string, unknown>) {
  const normalized = { ...body };
  for (const field of livestockFields) if (normalized[field] === "") normalized[field] = null;
  normalized.purchased = normalized.purchased === true;
  normalized.has_calved = normalized.has_calved === true;
  for (const field of ["birth_weight_kg", "current_weight_kg", "purchase_price", "body_condition_score"] as const) {
    if (normalized[field] !== null && normalized[field] !== undefined) normalized[field] = Number(normalized[field]);
  }
  return normalized;
}

export function validateLivestock(body: Record<string, unknown>) {
  if (!String(body.breed ?? "").trim()) return "Breed is required";
  if (!(["male", "female"] as string[]).includes(String(body.sex))) return "Sex must be male or female";
  const birthDate = String(body.birth_date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(`${birthDate}T00:00:00Z`))) return "Valid birth date is required";
  const currentWeight = Number(body.current_weight_kg);
  if (!Number.isFinite(currentWeight) || currentWeight <= 0) return "Current weight must be greater than 0 kg";
  if (body.birth_weight_kg != null && (!Number.isFinite(Number(body.birth_weight_kg)) || Number(body.birth_weight_kg) <= 0)) return "Birth weight must be greater than 0 kg";
  if (body.purchase_price != null && (!Number.isFinite(Number(body.purchase_price)) || Number(body.purchase_price) <= 0)) return "Purchase price must be greater than 0";
  for (const field of ["acquisition_date", "weaning_date"] as const) if (body[field] != null && (!/^\d{4}-\d{2}-\d{2}$/.test(String(body[field])) || Number.isNaN(Date.parse(`${body[field]}T00:00:00Z`)))) return `Invalid ${field}`;
  if (!livestockStatuses.includes(String(body.status ?? "active") as typeof livestockStatuses[number])) return "Invalid status";
  if (body.body_condition_score != null && (!Number.isInteger(Number(body.body_condition_score)) || Number(body.body_condition_score) < 1 || Number(body.body_condition_score) > 6)) return "BCS must be an integer from 1 to 6";
  if (body.health_status != null && !healthStatuses.includes(String(body.health_status) as typeof healthStatuses[number])) return "Invalid health status";
  if (body.purchased === true && !String(body.seller ?? "").trim()) return "Seller is required for purchased cattle";
  return null;
}
