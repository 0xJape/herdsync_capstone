export const administeredCareTypes = new Set(["vaccination", "vitamins", "antibiotics", "anti_inflammatory", "dewormer"]);
export const healthRecordTypes = new Set([...administeredCareTypes, "checkup", "newborn_care", "treatment", "injury", "illness"]);

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function validateHealthDates({ recordDate, nextDueDate, followUpDate, treatmentEndDate, withdrawalEndDate }: {
  recordDate: string;
  nextDueDate?: string | null;
  followUpDate?: string | null;
  treatmentEndDate?: string | null;
  withdrawalEndDate?: string | null;
}) {
  if (nextDueDate && nextDueDate < recordDate) return "Next due date cannot precede administration date";
  if (followUpDate && followUpDate < recordDate) return "Follow-up date cannot precede administration date";
  if (treatmentEndDate && treatmentEndDate < recordDate) return "Treatment end date cannot precede treatment start date";
  if (withdrawalEndDate && withdrawalEndDate < (treatmentEndDate || recordDate)) return "Withdrawal end date cannot precede final treatment date";
  return null;
}

export function applyHealthProtocol(recordType: string, recordDate: string, values: Record<string, unknown>) {
  const normalized = { ...values };
  if (recordType === "vaccination") normalized.next_due_date = null;
  if (recordType === "vitamins") normalized.next_due_date = addDays(recordDate, 14);
  if (recordType === "antibiotics") {
    normalized.status = "open";
    normalized.next_due_date = null;
    normalized.follow_up_date = addDays(recordDate, 3);
    normalized.withdrawal_end_date = addDays(recordDate, 21);
  }
  if (recordType === "anti_inflammatory") {
    normalized.status = "open";
    normalized.next_due_date = null;
    normalized.follow_up_date = addDays(recordDate, 3);
    normalized.withdrawal_end_date = addDays(recordDate, 7);
  }
  if (recordType === "dewormer") {
    const minimum = addDays(recordDate, 90);
    const maximum = addDays(recordDate, 183);
    const requested = typeof values.next_due_date === "string" ? values.next_due_date : "";
    normalized.next_due_date = requested && requested >= minimum && requested <= maximum ? requested : minimum;
  }
  return normalized;
}
