export const breeds = ["Brahman", "Angus", "Holstein", "Native/Carabao", "Crossbreed"] as const;
export const livestockStatuses = ["active", "sold", "culled", "deceased", "transferred_out"] as const;
export const healthStatuses = ["excellent", "good", "fair", "poor"] as const;
export const birthTypes = ["Single", "Twins", "Triplets", "Quadruplets"] as const;
export const calfVigorScores = ["1 - Weak", "2 - Below average", "3 - Normal", "4 - Vigorous"] as const;
export const calvingDifficultyScores = ["1 - No assistance", "2 - Easy pull", "3 - Hard pull", "4 - Surgery"] as const;
export const acquisitionTypes = ["born_on_farm", "purchased", "donated", "transferred_in"] as const;

export const livestockFields = [
  "name", "sex", "breed", "birth_date", "birth_weight_kg", "current_weight_kg",
  "color_markings", "status", "acquisition_date", "acquisition_type", "notes", "purchased", "seller",
  "seller_contact", "seller_address", "previous_farm", "purchase_price", "birth_type", "calf_vigor",
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
  if (typeof normalized.health_status === "string") {
    const healthStatus = normalized.health_status.trim().toLowerCase();
    normalized.health_status = healthStatus === "healthy" ? "good" : healthStatus;
  }
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
  if (birthDate > new Date().toISOString().slice(0, 10)) return "Birth date cannot be in the future";
  if (cattleCategory(body.sex, birthDate) === "Calf" && body.has_calved === true) return "A calf cannot have calved before";
  const currentWeight = Number(body.current_weight_kg);
  if (!Number.isFinite(currentWeight) || currentWeight <= 0) return "Current weight must be greater than 0 kg";
  if (body.birth_weight_kg != null && (!Number.isFinite(Number(body.birth_weight_kg)) || Number(body.birth_weight_kg) <= 0)) return "Birth weight must be greater than 0 kg";
  if (body.purchase_price != null && (!Number.isFinite(Number(body.purchase_price)) || Number(body.purchase_price) <= 0)) return "Purchase price must be greater than 0";
  const acquisitionType = String(body.acquisition_type ?? "born_on_farm");
  if (!acquisitionTypes.includes(acquisitionType as typeof acquisitionTypes[number])) return "Invalid acquisition type";
  if (acquisitionType !== "born_on_farm" && !String(body.acquisition_date ?? "").trim()) return "Acquisition date is required";
  if (acquisitionType === "purchased" && !String(body.seller ?? "").trim()) return "Seller is required for purchased cattle";
  if (acquisitionType === "donated" && !String(body.seller ?? "").trim()) return "Donor is required for donated cattle";
  if (acquisitionType === "transferred_in" && !String(body.previous_farm ?? "").trim()) return "Previous farm is required for transferred cattle";
  if (acquisitionType !== "born_on_farm" && !String(body.seller_contact ?? "").trim()) return "Acquisition contact is required";
  if (acquisitionType !== "born_on_farm" && !String(body.seller_address ?? "").trim()) return "Acquisition address is required";
  if (acquisitionType === "purchased" && body.purchase_price == null) return "Purchase price is required for purchased cattle";
  for (const field of ["acquisition_date", "weaning_date"] as const) if (body[field] != null && (!/^\d{4}-\d{2}-\d{2}$/.test(String(body[field])) || Number.isNaN(Date.parse(`${body[field]}T00:00:00Z`)))) return `Invalid ${field}`;
  if (!livestockStatuses.includes(String(body.status ?? "active") as typeof livestockStatuses[number])) return "Invalid status";
  if (body.body_condition_score != null && (!Number.isInteger(Number(body.body_condition_score)) || Number(body.body_condition_score) < 1 || Number(body.body_condition_score) > 6)) return "BCS must be an integer from 1 to 6";
  if (body.health_status != null && !healthStatuses.includes(String(body.health_status) as typeof healthStatuses[number])) return "Invalid health status";
  if (!birthTypes.includes(String(body.birth_type) as typeof birthTypes[number])) return "Birth type is required";
  if (body.calf_vigor != null && !calfVigorScores.includes(String(body.calf_vigor) as typeof calfVigorScores[number])) return "Invalid calf vigor";
  if (body.calving_difficulty != null && !calvingDifficultyScores.includes(String(body.calving_difficulty) as typeof calvingDifficultyScores[number])) return "Invalid calving difficulty";
  return null;
}
