"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  HeartPulse,
  Eye,
  Pencil,
  Plus,
  Search,
  Stethoscope,
  Archive as ArchiveIcon,
  X,
} from "lucide-react";
import { addDays } from "@/lib/health-rules";
import SuccessModal from "@/components/ui/success-modal";
import HealthTreatmentModal from "@/components/health-treatment-modal";
import { useCurrentRole } from "@/lib/use-current-role";

type Animal = { id: number; tag_number: string; name: string | null };
type BatchDose = { dose: string; unit: string; route: string };
type HealthRecord = {
  id: number;
  livestock_id: number;
  tag_number: string;
  livestock_name: string | null;
  record_type: string;
  record_date: string;
  diagnosis: string | null;
  details: string | null;
  treatment: string | null;
  medication_name: string | null;
  dose: string | null;
  administration_route: string | null;
  treatment_end_date: string | null;
  withdrawal_end_date: string | null;
  veterinarian: string | null;
  follow_up_date: string | null;
  next_due_date?: string | null;
  added_by: string | null;
  status: string;
  archived_at?: string | null;
};
type PregnancyAlert = { id: number; livestock_id: number; tag_number: string; livestock_name: string | null; next_checkup_date: string; expected_calving_date: string };
const dateOnly = (value: string) => value.slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);
const titleCase = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
const empty = {
  livestock_id: "",
  record_type: "",
  record_date: today(),
  diagnosis: "",
  details: "",
  treatment: "",
  medication_name: "",
  dose: "",
  dosage_unit: "ml",
  administration_route: "",
  treatment_end_date: "",
  withdrawal_required: "",
  withdrawal_end_date: "",
  repeat_days: "",
  next_due_date: "",
  veterinarian: "",
  follow_up_date: "",
  status: "open",
};
const fallbackTreatmentNames: Record<string, string[]> = {
  vaccination: [
    "FMD vaccine",
    "Hemorrhagic septicemia vaccine",
    "Blackleg vaccine",
    "Anthrax vaccine",
  ],
  vitamins: ["Vitamin A, D & E", "Vitamin B complex", "Multivitamin"],
  antibiotics: ["Oxytetracycline", "Penicillin", "Amoxicillin"],
  anti_inflammatory: ["Flunixin meglumine", "Meloxicam", "Ketoprofen"],
  dewormer: ["Ivermectin", "Albendazole", "Fenbendazole"],
};
const treatmentProtocols = {
  vitamins: { nextDays: 14, reminderDays: 7 },
  dewormer: { nextDays: 90, reminderDays: 14 },
  antibiotics: { withdrawalDays: 21, followUpDays: 3 },
  anti_inflammatory: { withdrawalDays: 7, followUpDays: 3 },
} as const;
const careClass = (record: HealthRecord, label: string) =>
  label === "Follow-up"
    ? "care-follow-up"
    : record.record_type === "vaccination"
      ? "care-vaccination"
      : record.record_type === "treatment"
        ? "care-treatment"
        : "care-default";

export default function HealthPage() {
  useCurrentRole();
  const searchParams = useSearchParams();
  const [animals, setAnimals] = useState<Animal[]>([]),
    [records, setRecords] = useState<HealthRecord[]>([]), [pregnancies, setPregnancies] = useState<PregnancyAlert[]>([]);
  const [treatmentNames, setTreatmentNames] = useState(fallbackTreatmentNames);
  const [form, setForm] = useState(empty),
    [editing, setEditing] = useState<number | null>(null),
    [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<HealthRecord | null>(null);
  const [viewingEditing, setViewingEditing] = useState(false);
  const [confirmingViewEdit, setConfirmingViewEdit] = useState(false);
  const [archiving, setArchiving] = useState<HealthRecord | null>(null);
  const [toast, setToast] = useState("");
  const [batch, setBatch] = useState(false),
    [batchIds, setBatchIds] = useState<string[]>([]),
    [batchDoses, setBatchDoses] = useState<Record<string, BatchDose>>({});
  const [livestockSearch, setLivestockSearch] = useState("");
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [recordType, setRecordType] = useState("all"),
    [dateFrom, setDateFrom] = useState(""),
    [dateTo, setDateTo] = useState(""),
    [datePreset, setDatePreset] = useState("all"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [careView, setCareView] = useState<"schedule" | "restrictions">("schedule");
  const [careFilter, setCareFilter] = useState("all");
  const [carePage, setCarePage] = useState(1);
  const [success, setSuccess] = useState("");
      useEffect(() => {
        if (!toast) return;
        const timeout = window.setTimeout(() => setToast(""), 4000);
        return () => window.clearTimeout(timeout);
      }, [toast]);
    const applyDatePreset = (preset: string) => {
      const end = today();
      setDatePreset(preset);
      if (preset === "all") { setDateFrom(""); setDateTo(""); }
      else if (preset === "today") { setDateFrom(end); setDateTo(end); }
      else if (preset === "7-days") { setDateFrom(addDays(end, -6)); setDateTo(end); }
      else if (preset === "30-days") { setDateFrom(addDays(end, -29)); setDateTo(end); }
      setPage(1);
    };
  const [showGuide, setShowGuide] = useState(false), [guideStep, setGuideStep] = useState(0);
  const [linkedRecords, setLinkedRecords] = useState<HealthRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  });
  const healthGuide = [
    { selector: ".health-page-header", title: "Health workspace", text: "Start a health record here for checkups, vaccines, medicines, vitamins, and deworming." },
    { selector: ".health-page > .health-records-panel:first-of-type", title: "Priority care worklist", text: "Review care due this week and switch to medicine restrictions requiring monitoring." },
    { selector: ".health-calendar-panel", title: "Care calendar", text: "Navigate scheduled care by month and select a date to inspect its events." },
    { selector: ".health-agenda", title: "Upcoming agenda", text: "See nearest follow-ups, treatment dates, pregnancy checks, and expected calving dates." },
    { selector: ".health-page > .health-records-panel:last-of-type", title: "Health records", text: "Search, filter, review, edit, or archive recorded health history." },
  ];
  useEffect(() => {
    if (!showGuide) return;
    const target = document.querySelector(healthGuide[guideStep]?.selector);
    document.querySelectorAll(".health-tour-highlight").forEach((node) => node.classList.remove("health-tour-highlight"));
    if (target) { target.classList.add("health-tour-highlight"); target.scrollIntoView({ behavior: "smooth", block: "center" }); }
    return () => target?.classList.remove("health-tour-highlight");
  }, [guideStep, showGuide]);
  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(
      `/api/health?search=${encodeURIComponent(search)}`,
    );
    if (!response.ok) throw new Error("Could not load health records");
    const data: { records: HealthRecord[]; pregnancies: PregnancyAlert[] } = await response.json();
    setRecords(data.records);
    setPregnancies(data.pregnancies);
    setLoading(false);
  }, [search]);
  useEffect(() => {
    fetch("/api/livestock")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then(setAnimals)
      .catch(() => setError("Could not load livestock"));
    fetch("/api/treatment-products")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((products: { treatment_type: string; name: string }[]) =>
        setTreatmentNames(
          products.reduce<Record<string, string[]>>((catalog, product) => {
            (catalog[product.treatment_type] ??= []).push(product.name);
            return catalog;
          }, {}),
        ),
      )
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const livestockId = searchParams.get("livestock_id"), action = searchParams.get("action");
    const recordTypes = ["checkup", "vaccination", "treatment", "vitamins", "dewormer", "antibiotics", "anti_inflammatory"];
    if (!livestockId || !action || !["record", ...recordTypes].includes(action)) return;
    const recordType = action === "record" ? "checkup" : action;
    queueMicrotask(() => {
      setEditing(null);
      setBatch(false);
      setForm({ ...empty, livestock_id: livestockId, record_type: recordType });
      setLivestockSearch("");
      setShowForm(true);
    });
    fetch(`/api/health?livestock_id=${encodeURIComponent(livestockId)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { records: HealthRecord[] }) => setLinkedRecords(data.records))
      .catch(() => setError("Could not load selected cattle health restrictions"));
  }, [searchParams]);
  useEffect(() => { queueMicrotask(() => load().catch((cause) => { setError(cause instanceof Error ? cause.message : "Could not load health records"); setLoading(false); })); }, [load]);
  const visibleRecords = useMemo(
    () =>
      records.filter((record) =>
        (status === "all" || (status === "archived" ? !!record.archived_at : !record.archived_at && record.status === status)) &&
        (recordType === "all" || record.record_type === recordType) &&
        (!dateFrom || dateOnly(record.record_date) >= dateFrom) &&
        (!dateTo || dateOnly(record.record_date) <= dateTo),
      ).sort((a, b) => {
        const end = addDays(today(), 7);
        const priority = (record: HealthRecord) => [record.follow_up_date, record.next_due_date]
          .some((date) => !!date && dateOnly(date) >= today() && dateOnly(date) <= end) ? 0 : 1;
        return priority(a) - priority(b) || dateOnly(b.record_date).localeCompare(dateOnly(a.record_date));
      }),
    [records, status, recordType, dateFrom, dateTo],
  );
  const recordTypes = ["all", "checkup", "vaccination", "vitamins", "antibiotics", "anti_inflammatory", "dewormer"];
  const filteredAnimals = livestockSearch.trim()
    ? animals.filter((animal) =>
        String(animal.id) === form.livestock_id ||
        `${animal.tag_number} ${animal.name ?? ""}`
          .toLowerCase()
          .includes(livestockSearch.trim().replace("—", " ").replace(/\s+/g, " ").toLowerCase()),
      )
    : [];
  const selectedAnimal = animals.find(
    (animal) => String(animal.id) === form.livestock_id,
  );
  useEffect(() => {
    if (!selectedAnimal || (livestockSearch && livestockSearch !== String(selectedAnimal.id))) return;
    queueMicrotask(() => setLivestockSearch(selectedAnimal.tag_number));
  }, [livestockSearch, selectedAnimal]);
  const pageCount = Math.max(1, Math.ceil(visibleRecords.length / 10));
  const currentPage = Math.min(page, pageCount);
  const pagedRecords = visibleRecords.slice((currentPage - 1) * 10, currentPage * 10);
  const scheduled = useMemo(
    () =>
      [...records.filter((record) => !record.archived_at)
        .flatMap(
          (record) =>
            [
              record.follow_up_date && {
                record,
                date: dateOnly(record.follow_up_date),
                label: "Follow-up",
              },
              record.next_due_date && {
                record,
                date: dateOnly(record.next_due_date),
                label: "Next due",
              },
              record.next_due_date && record.record_type === "vitamins" && {
                record,
                date: addDays(dateOnly(record.next_due_date), -7),
                label: "Vitamin reminder",
              },
              record.next_due_date && record.record_type === "dewormer" && {
                record,
                date: addDays(dateOnly(record.next_due_date), -14),
                label: "Deworming reminder",
              },
              record.withdrawal_end_date && {
                record,
                date: dateOnly(record.withdrawal_end_date),
                label: "Withdrawal ends",
              },
            ].filter(Boolean) as {
              record: HealthRecord;
              date: string;
              label: string;
            }[],
        )
        , ...pregnancies.flatMap((pregnancy) => [
          { record: { ...pregnancy, record_type: "pregnancy", status: "open", record_date: pregnancy.next_checkup_date, diagnosis: null, details: null, treatment: null, medication_name: null, dose: null, administration_route: null, treatment_end_date: null, withdrawal_end_date: null, veterinarian: null, follow_up_date: null, added_by: null }, date: dateOnly(pregnancy.next_checkup_date), label: "Pregnancy checkup" },
          { record: { ...pregnancy, record_type: "pregnancy", status: "open", record_date: pregnancy.expected_calving_date, diagnosis: null, details: null, treatment: null, medication_name: null, dose: null, administration_route: null, treatment_end_date: null, withdrawal_end_date: null, veterinarian: null, follow_up_date: null, added_by: null }, date: dateOnly(pregnancy.expected_calving_date), label: "Expected calving" },
        ])].sort((a, b) => a.date.localeCompare(b.date)),
    [records, pregnancies],
  );
  const activeRestrictions = useMemo(
    () => {
      const restricted = records.filter(
        (record) =>
          !record.archived_at &&
          (record.status === "open" && record.record_type === "antibiotics") ||
            (record.withdrawal_end_date &&
              dateOnly(record.withdrawal_end_date) >= today()),
      );
      return [...new Map(restricted.map((record) => [record.livestock_id, record])).values()];
    },
    [records],
  );
  const selectedRestriction = [...linkedRecords, ...activeRestrictions].find(
    (record) => !record.archived_at && String(record.livestock_id) === form.livestock_id &&
      ((record.status === "open" && record.record_type === "antibiotics") ||
        !!(record.withdrawal_end_date && dateOnly(record.withdrawal_end_date) >= today())),
  );
  const monthKey = month.toISOString().slice(0, 7),
    monthEvents = scheduled.filter((event) => event.date.startsWith(monthKey));
  const selectedDateEvents = monthEvents.filter(
    (event) => event.date === selectedDate,
  );
  const firstWeekday = month.getUTCDay(),
    daysInMonth = new Date(
      Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
    ).getUTCDate();
  const calendarDays = Array.from(
    { length: firstWeekday + daysInMonth },
    (_, index) => (index < firstWeekday ? null : index - firstWeekday + 1),
  );
  const upcoming = scheduled
    .filter((event) => event.date >= today())
    .slice(0, 5);
  const weekEnd = addDays(today(), 7);
  const weekEvents = scheduled.filter(
    (event) => event.date >= today() && event.date <= weekEnd && (event.record.status === "open" || event.label !== "Follow-up"),
  );
  const urgentWeek = weekEvents.filter((event) => careFilter === "all" || event.label === careFilter);
  const careFilterOptions = [...new Set(weekEvents.map((event) => event.label))];
  const filteredRestrictions = activeRestrictions.filter((record) => careFilter === "all" || (careFilter === "withdrawal" ? !!record.withdrawal_end_date && dateOnly(record.withdrawal_end_date) >= today() : record.record_type === "antibiotics"));
  const careItems = careView === "schedule" ? urgentWeek : filteredRestrictions;
  const carePageCount = Math.max(1, Math.ceil(careItems.length / 5));
  const currentCarePage = Math.min(carePage, carePageCount);
  const pagedCareItems = careItems.slice((currentCarePage - 1) * 5, currentCarePage * 5);
  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setError(""); 
    if (batch && !editing && batchIds.some((id) => !batchDoses[id]?.dose || Number(batchDoses[id].dose) <= 0 || !batchDoses[id].route)) { 
      setError("Enter a valid dosage and route of administration for every selected animal.");
      return;
    }
    const wasEditing = editing !== null;
    const savedCount = batch && !editing ? batchIds.length : 1;
    const nextDue = form.repeat_days
      ? addDays(form.record_date, Number(form.repeat_days))
      : form.next_due_date;
    const payload = viewingEditing ? {
      veterinarian: form.veterinarian,
      details: form.details,
    } : {
      ...form,
      livestock_ids: batch && !editing ? batchIds : undefined,
      batch_doses: batch && !editing ? Object.fromEntries(batchIds.map((id) => [id, `${batchDoses[id].dose} ${batchDoses[id].unit}`])) : undefined,
      batch_routes: batch && !editing ? Object.fromEntries(batchIds.map((id) => [id, batchDoses[id].route])) : undefined,
      treatment: form.medication_name,
      dose: `${form.dose} ${form.dosage_unit}`.trim(),
      treatment_start_date: form.record_date,
      next_due_date: nextDue,
      withdrawal_required: form.withdrawal_required === "yes",
    };
    const response = await fetch(
      editing ? `/api/health/${editing}` : "/api/health",
      {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const body = response.status === 204 ? null : await response.json();
    if (!response.ok) return setError(body?.error ?? "Save failed");
    setForm(empty);
    setBatch(false);
    setBatchIds([]);
    setBatchDoses({});
    setEditing(null);
    setShowForm(false);
    await load();
    if (wasEditing && viewingEditing && viewing) {
      setViewing({ ...viewing, record_type: form.record_type, record_date: form.record_date, diagnosis: form.diagnosis || null, details: form.details || null, treatment: form.medication_name || null, medication_name: form.medication_name || null, dose: `${form.dose} ${form.dosage_unit}`.trim() || null, administration_route: form.administration_route || null, treatment_end_date: form.treatment_end_date || null, withdrawal_end_date: form.withdrawal_end_date || null, veterinarian: form.veterinarian || null, follow_up_date: form.follow_up_date || null, next_due_date: nextDue || null, status: form.status });
      setViewingEditing(false);
      setConfirmingViewEdit(false);
      setToast("Health record updated successfully.");
    } else setSuccess(wasEditing ? "Health record updated successfully." : savedCount > 1 ? `Treatment recorded for ${savedCount} cattle.` : "Health record added successfully.");
  }
  function edit(record: HealthRecord, inline = viewing !== null) {
    setEditing(record.id);
    setBatch(false);
    setShowForm(!inline);
    setViewingEditing(inline);
    if (inline) setViewing(record);
    setForm({
      ...empty,
      livestock_id: String(record.livestock_id),
      record_type: record.record_type,
      record_date: dateOnly(record.record_date),
      diagnosis: record.diagnosis ?? "",
      details: record.details ?? "",
      treatment: record.treatment ?? "",
      medication_name: record.medication_name ?? record.treatment ?? "",
      dose: record.dose?.split(" ")[0] ?? "",
      dosage_unit: record.dose?.split(" ").slice(1).join(" ") || "ml",
      administration_route: record.administration_route ?? "",
      treatment_end_date: record.treatment_end_date
        ? dateOnly(record.treatment_end_date)
        : "",
      withdrawal_required: record.withdrawal_end_date ? "yes" : "no",
      withdrawal_end_date: record.withdrawal_end_date
        ? dateOnly(record.withdrawal_end_date)
        : "",
      next_due_date: record.next_due_date ? dateOnly(record.next_due_date) : "",
      veterinarian: record.veterinarian ?? "",
      follow_up_date: record.follow_up_date
        ? dateOnly(record.follow_up_date)
        : "",
      status: record.status,
    });
  }
  async function archive(record: HealthRecord) {
    const response = await fetch(`/api/health/${record.id}`, {
      method: "DELETE",
    });
    if (!response.ok)
      return setError((await response.json()).error ?? "Archive failed");
    await load();
    setArchiving(null);
    setToast(`${titleCase(record.record_type)} record for ${record.tag_number} archived successfully.`);
  }
  const field = (name: keyof typeof empty, value: string) =>
    setForm((current) => ({ ...current, [name]: value }));
  const applyTreatmentProtocol = (recordType: string, recordDate = form.record_date) => {
    const protocol = treatmentProtocols[recordType as keyof typeof treatmentProtocols];
    setForm((current) => ({
      ...current,
      record_type: recordType,
      record_date: recordDate,
      medication_name: "",
      repeat_days: protocol && "nextDays" in protocol ? String(protocol.nextDays) : "",
      next_due_date: protocol && "nextDays" in protocol ? addDays(recordDate, protocol.nextDays) : "",
      withdrawal_required: protocol && "withdrawalDays" in protocol ? "yes" : "",
      withdrawal_end_date: protocol && "withdrawalDays" in protocol ? addDays(recordDate, protocol.withdrawalDays) : "",
      follow_up_date: protocol && "followUpDays" in protocol ? addDays(recordDate, protocol.followUpDays) : "",
    }));
  };
  const changeMonth = (offset: number) =>
    setMonth(
      (current) =>
        new Date(
          Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + offset, 1),
        ),
    );

  return (
    <main className="health-page">
      <header className="health-page-header">
        <div>
          <h1>Health &amp; medical care</h1>
          <p>
            Monitor active cases, follow-ups, vaccinations, and treatment
            history.
          </p>
        </div>
        <div className="health-header-actions"><button type="button" className="secondary-button" onClick={() => { setGuideStep(0); setShowGuide(true); }}><CircleHelp size={16}/> Health page guide</button><button
          type="button"
          className="primary-button"
          onClick={() => {
            setEditing(null);
            setForm(empty);
            setShowForm(true);
          }}
        >
          <Plus size={16} /> Add health record
        </button></div>
      </header>
      {showGuide && <aside className="breeding-walkthrough health-walkthrough" aria-label="Health page guide"><div><span className="cattle-eyebrow">Step {guideStep + 1} of {healthGuide.length}</span><h3>{healthGuide[guideStep].title}</h3><button type="button" className="breeding-walkthrough-close" onClick={() => setShowGuide(false)}>Exit guide</button></div><p>{healthGuide[guideStep].text}</p><footer><button type="button" className="secondary-button" disabled={guideStep === 0} onClick={() => setGuideStep((step) => step - 1)}>Back</button><button type="button" className="primary-button" onClick={() => guideStep === healthGuide.length - 1 ? setShowGuide(false) : setGuideStep((step) => step + 1)}>{guideStep === healthGuide.length - 1 ? "Finish" : "Next"}</button></footer></aside>}
      {error && (
        <p role="alert" className="cattle-error">
          {error}
        </p>
      )}
      <div className="health-workspace">
        <section className="panel health-calendar-panel">
          <header>
            <div>
              <span className="cattle-eyebrow">Care schedule</span>
              <h2>
                <CalendarDays size={18} />{" "}
                {new Intl.DateTimeFormat("en-PH", {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(month)}
              </h2>
            </div>
            <div>
              <button
                type="button"
                className="icon-button"
                aria-label="Previous month"
                onClick={() => changeMonth(-1)}
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                className="calendar-today"
                onClick={() => {
                  const now = new Date();
                  setMonth(
                    new Date(
                      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
                    ),
                  );
                }}
              >
                Today
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Next month"
                onClick={() => changeMonth(1)}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </header>
          <div className="health-calendar-weekdays">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="health-calendar-grid">
            {calendarDays.map((day, index) =>
              day ? (
                <div
                  key={day}
                  role="button"
                  tabIndex={0}
                  aria-label={`View care scheduled for ${formatDate(`${monthKey}-${String(day).padStart(2, "0")}`)}`}
                  onClick={() =>
                    setSelectedDate(
                      `${monthKey}-${String(day).padStart(2, "0")}`,
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedDate(
                        `${monthKey}-${String(day).padStart(2, "0")}`,
                      );
                    }
                  }}
                  className={
                    `${monthKey}-${String(day).padStart(2, "0")}` === today()
                      ? "today"
                      : undefined
                  }
                >
                  <span>{day}</span>
                  {monthEvents
                    .filter((event) => Number(event.date.slice(8, 10)) === day)
                    .slice(0, 2)
                    .map((event) => (
                      <Link
                        key={`${event.record.id}-${event.label}`}
                        className={careClass(event.record, event.label)}
                        href={`/livestock/${event.record.livestock_id}?returnTo=%2Fhealth`}
                        onClick={(clickEvent) => clickEvent.stopPropagation()}
                        title={`${event.record.tag_number}: ${event.label}`}
                      >
                        <i />
                        {event.record.tag_number}
                      </Link>
                    ))}
                </div>
              ) : (
                <div key={`blank-${index}`} className="blank" />
              ),
            )}
          </div>
        </section>
        {selectedDate && (
          <div
            className="cattle-modal-backdrop no-print"
            role="presentation"
            onMouseDown={(event) =>
              event.target === event.currentTarget && setSelectedDate("")
            }
          >
            <section
              className="cattle-modal compact-modal calendar-day-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="calendar-day-title"
            >
              <div className="cattle-panel-heading">
                <div>
                  <span className="cattle-eyebrow">Care schedule</span>
                  <h2 id="calendar-day-title">{formatDate(selectedDate)}</h2>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Close"
                  onClick={() => setSelectedDate("")}
                >
                  <X size={18} />
                </button>
              </div>
              {selectedDateEvents.length ? (
                <div className="calendar-day-events">
                  {selectedDateEvents.map((event) => (
                    <Link
                      key={`${event.record.id}-${event.label}`}
                      href={`/livestock/${event.record.livestock_id}?returnTo=%2Fhealth`}
                      className={careClass(event.record, event.label)}
                    >
                      <i />
                      <div>
                        <strong>{event.record.tag_number}</strong>
                        <span>{event.record.livestock_name || "Unnamed cattle"}</span>
                      </div>
                      <div>
                        <strong>{event.label}</strong>
                        <span>{event.record.medication_name || event.record.treatment || event.record.record_type.replaceAll("_", " ")}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="muted calendar-day-empty">No care scheduled for this date.</p>
              )}
            </section>
          </div>
        )}
        <aside className="panel health-agenda">
          <span className="cattle-eyebrow">Next actions</span>
          <h2>Upcoming care</h2>
          {upcoming.length ? (
            upcoming.map((event) => (
              <Link
                key={`${event.record.id}-${event.label}`}
                className={careClass(event.record, event.label)}
                href={`/livestock/${event.record.livestock_id}?returnTo=%2Fhealth`}
              >
                <time dateTime={event.date}>
                  <strong>{new Date(event.date).getUTCDate()}</strong>
                  <span>{formatDate(event.date).split(" ")[0]}</span>
                </time>
                <div>
                  <strong>{event.record.tag_number}</strong>
                  <span>
                    {event.label}  - {" "}
                    {event.record.record_type.replaceAll("_", " ")}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="health-agenda-empty">
              <CalendarDays size={20} />
              <strong>No upcoming care</strong>
              <span>Scheduled follow-ups appear here.</span>
            </div>
          )}
        </aside>
      </div>
      <section className="breeding-records health-records-panel">
        <header><div><h2>Health Records</h2></div><b>{visibleRecords.length} record{visibleRecords.length === 1 ? "" : "s"}</b></header>
          <div className="operations-toolbar health-record-tools">
            <label className="operations-search">
              <Search size={15} />
              <input
                aria-label="Search health records"
                placeholder="Search cattle or diagnosis"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              />
            </label>
            <div className="operations-filters"><label className="health-care-filter"><span>Care type</span><select aria-label="Filter care type" value={recordType} onChange={(event) => { setRecordType(event.target.value); setPage(1); }}>
              {recordTypes.map((type) => <option key={type} value={type}>{type === "all" ? "All care types" : titleCase(type)}</option>)}
            </select></label>
            <select
              aria-label="Filter status"
              value={status}
              onChange={(event) => { setStatus(event.target.value); setPage(1); }}
            >
              <option value="all">All statuses</option>
              <option value="open">Active care</option>
              <option value="resolved">Completed</option>
              <option value="archived">Archived</option>
            </select>
            <label className="health-date-filter"><span>Date</span><select aria-label="Filter records by date" value={datePreset} onChange={(event) => applyDatePreset(event.target.value)}><option value="all">All dates</option><option value="today">Today</option><option value="7-days">Last 7 days</option><option value="30-days">Last 30 days</option><option value="custom">Custom range</option></select></label>
            {datePreset === "custom" && <><label className="health-date-filter"><span>From</span><input aria-label="Filter records from date" type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => { setDatePreset("custom"); setDateFrom(event.target.value); setPage(1); }} /></label>
            <label className="health-date-filter"><span>To</span><input aria-label="Filter records to date" type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => { setDatePreset("custom"); setDateTo(event.target.value); setPage(1); }} /></label></>}
            {(dateFrom || dateTo) && <button type="button" className="secondary-button health-clear-filter" onClick={() => applyDatePreset("all")}>Clear dates</button>}</div>
          </div>
        {loading ? (
          <p className="muted">Loading health records…</p>
        ) : visibleRecords.length ? (
          <>
            <div className="clinical-history-table" role="region" aria-label="Clinical history table" tabIndex={0}>
              <table>
                <caption className="sr-only">Clinical health records, newest first</caption>
                <thead><tr><th scope="col">Cattle ID</th><th scope="col">Record</th><th scope="col">Administered By</th><th scope="col">Date</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>{pagedRecords.map((record) => (
                <tr key={record.id}>
                  <td className="clinical-animal">
                    <Link href={`/livestock/${record.livestock_id}?returnTo=%2Fhealth`} className="care-treatment" data-tooltip="Open cattle profile">
                      {record.tag_number}
                    </Link>
                    <span>{record.livestock_name || "Unnamed animal"}</span>
                  </td>
                  <td><span className={`clinical-record-type health-type-${record.record_type}`}>{titleCase(record.record_type)}</span></td>
                  <td>{record.added_by || "Unknown"}</td>
                  <td><time dateTime={record.record_date}>
                    {formatDate(record.record_date)}
                  </time></td>
                  <td><span className={`record-status ${record.archived_at ? "archived" : record.status}`}>
                    <span data-tooltip={record.archived_at ? "Archived records remain available for history but do not drive care schedules." : record.status === "open" ? "Active care still needs monitoring or follow-up." : "Completed care needs no further action."}>{record.archived_at ? "Archived" : record.status === "open" ? "Active" : "Completed"}</span>
                  </span></td>
                  <td><div className="health-row-actions">
                    <button type="button" className="icon-button" aria-label={`View ${record.tag_number} health record`} data-tooltip="View this health record" onClick={() => setViewing(record)}>
                      <Eye size={15} />
                    </button>
                    {!record.archived_at && <button
                      type="button"
                      className="icon-button"
                      aria-label={`Archive ${record.tag_number} health record`}
                      data-tooltip="Archive this health record"
                      onClick={() => setArchiving(record)}
                    >
                      <ArchiveIcon size={15} />
                    </button>}
                  </div></td>
                </tr>
              ))}</tbody></table>
            </div>
            <div className="health-pagination-wrap">
              <p>{`${(currentPage - 1) * 10 + 1}–${Math.min(currentPage * 10, visibleRecords.length)} of ${visibleRecords.length}`}</p>
              <nav
                className="health-pagination"
                aria-label="Health records pages"
              >
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  <ChevronLeft size={15} />
                  <span>Previous</span>
                </button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                  (number) => (
                    <button
                      type="button"
                      key={number}
                      aria-current={currentPage === number ? "page" : undefined}
                      onClick={() => setPage(number)}
                    >
                      {number}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  disabled={currentPage === pageCount}
                  onClick={() => setPage((current) => current + 1)}
                >
                  <span>Next</span>
                  <ChevronRight size={15} />
                </button>
              </nav>
            </div>
          </>
        ) : (
          <div className="health-empty">
            <HeartPulse size={20} />
            <strong>No matching health records</strong>
            <span>Change filters or add first record.</span>
          </div>
        )}
      </section>
      {success && <SuccessModal message={success} onClose={() => setSuccess("")}/>}
      {showForm && <HealthTreatmentModal animals={animals} initialLivestockId={form.livestock_id} initialRecordType={form.record_type} editingRecord={editing ? records.find((record) => record.id === editing) ?? null : null} restrictions={[...linkedRecords, ...activeRestrictions]} onClose={() => setShowForm(false)} onError={setError} onSaved={async (message) => { const wasEditing = editing !== null; setShowForm(false); setEditing(null); await load(); if (wasEditing) setToast(message); else setSuccess(message); }}/>} 
      {viewing && <div className="cattle-modal-backdrop health-view-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setViewing(null)}><section className="cattle-modal health-view-modal" role="dialog" aria-modal="true" aria-labelledby="health-view-title"><header><div><span className="cattle-eyebrow">Health record</span><h2 id="health-view-title">{titleCase(viewing.record_type)} details</h2></div><button type="button" className="icon-button" aria-label="Close record details" onClick={() => setViewing(null)}><X size={18}/></button></header><dl className="health-view-grid"><div><dt>Cattle ID</dt><dd>{viewing.tag_number}</dd></div><div><dt>Cattle name</dt><dd>{viewing.livestock_name || "—"}</dd></div><div><dt>Record type</dt><dd>{titleCase(viewing.record_type)}</dd></div><div><dt>Status</dt><dd>{viewing.status === "open" ? "Active" : "Completed"}</dd></div><div><dt>Date administered</dt><dd>{formatDate(viewing.record_date)}</dd></div><div><dt>Administered by</dt><dd>{viewing.veterinarian || viewing.added_by || "—"}</dd></div><div><dt>Diagnosis</dt><dd>{viewing.diagnosis || "—"}</dd></div><div><dt>Treatment</dt><dd>{viewing.medication_name || viewing.treatment || "—"}</dd></div><div><dt>Dose</dt><dd>{viewing.dose || "—"}</dd></div><div><dt>Route</dt><dd>{viewing.administration_route || "—"}</dd></div><div><dt>Treatment end</dt><dd>{viewing.treatment_end_date ? formatDate(viewing.treatment_end_date) : "—"}</dd></div><div><dt>Withdrawal end</dt><dd>{viewing.withdrawal_end_date ? formatDate(viewing.withdrawal_end_date) : "—"}</dd></div><div><dt>Follow-up</dt><dd>{viewing.follow_up_date ? formatDate(viewing.follow_up_date) : "—"}</dd></div><div><dt>Next due</dt><dd>{viewing.next_due_date ? formatDate(viewing.next_due_date) : "—"}</dd></div><div className="health-view-wide"><dt>Notes / observations</dt><dd>{viewing.details || "—"}</dd></div></dl><footer className="modal-actions"><button type="button" className="secondary-button" onClick={() => setViewing(null)}>Close</button><button type="button" className="primary-button" onClick={() => { const record = viewing; setViewing(null); edit(record); }}><Pencil size={15}/> Edit record</button></footer></section></div>}
      {toast && <div className="reproduction-toast" role="status"><Check size={17}/><span>{toast}</span><button type="button" aria-label="Dismiss notification" onClick={() => setToast("")}><X size={15}/></button></div>}
      {archiving && <div className="cattle-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setArchiving(null)}><section className="cattle-modal health-archive-modal" role="alertdialog" aria-modal="true" aria-labelledby="health-archive-title" aria-describedby="health-archive-description"><header><div className="health-archive-icon"><ArchiveIcon size={20}/></div><div><span className="cattle-eyebrow">Archive health record</span><h2 id="health-archive-title">Archive {titleCase(archiving.record_type)} record?</h2></div></header><p id="health-archive-description">This removes the record for <strong>{archiving.tag_number}</strong> from active care schedules and restrictions. It remains available under Archived records.</p><footer><button type="button" className="secondary-button" onClick={() => setArchiving(null)}><X size={15}/> Cancel</button><button type="button" className="primary-button" onClick={() => void archive(archiving)}><ArchiveIcon size={15}/> Archive record</button></footer></section></div>}
      {viewing && viewingEditing && <div className="cattle-modal-backdrop health-view-backdrop health-inline-edit-backdrop" role="presentation"><section className="cattle-modal health-view-modal health-inline-edit-modal" role="dialog" aria-modal="true" aria-labelledby="health-inline-edit-title"><header><div><span className="cattle-eyebrow">Editing health record</span><h2 id="health-inline-edit-title">{titleCase(form.record_type)} for {viewing.tag_number}</h2></div><button type="button" className="icon-button" aria-label="Cancel editing" onClick={() => setViewingEditing(false)}><X size={18}/></button></header><form className="health-inline-edit-form" onSubmit={(event) => { event.preventDefault(); setConfirmingViewEdit(true); }}><label className="field"><span>Record type</span><select required value={form.record_type} onChange={(event) => field("record_type",event.target.value)}><option value="checkup">Checkup</option><option value="vaccination">Vaccination</option><option value="vitamins">Vitamins</option><option value="antibiotics">Antibiotics</option><option value="anti_inflammatory">Anti-Inflammatory</option><option value="dewormer">Dewormer</option></select></label><label className="field"><span>Date administered</span><input required type="date" max={today()} value={form.record_date} onChange={(event) => field("record_date",event.target.value)}/></label><label className="field"><span>Administered by</span><input required value={form.veterinarian} onChange={(event) => field("veterinarian",event.target.value)}/></label><label className="field"><span>Status</span><select value={form.status} onChange={(event) => field("status",event.target.value)}><option value="open">Active</option><option value="resolved">Completed</option></select></label><label className="field"><span>Treatment / medication</span><input value={form.medication_name} onChange={(event) => field("medication_name",event.target.value)}/></label><label className="field"><span>Dose</span><span className="dose-field"><input type="number" min="0" step="any" value={form.dose} onChange={(event) => field("dose",event.target.value)}/><select aria-label="Dosage unit" value={form.dosage_unit} onChange={(event) => field("dosage_unit",event.target.value)}>{["ml","cc","mg","g","IU"].map((unit) => <option key={unit}>{unit}</option>)}</select></span></label><label className="field"><span>Administration route</span><select value={form.administration_route} onChange={(event) => field("administration_route",event.target.value)}><option value="">Not specified</option>{[["Intramuscular (IM)","IM"],["Subcutaneous (SC)","SC"],["Intravenous (IV)","IV"],["Oral","Oral"],["Topical","Topical"],["Nasal","Nasal"]].map(([label,value]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field"><span>Follow-up date</span><input type="date" value={form.follow_up_date} onChange={(event) => field("follow_up_date",event.target.value)}/></label><label className="field health-view-wide"><span>Notes / observations</span><textarea value={form.details} onChange={(event) => field("details",event.target.value)}/></label><footer className="health-view-wide modal-actions"><button type="button" className="secondary-button" onClick={() => setViewingEditing(false)}><X size={15}/> Cancel</button><button type="submit" className="primary-button"><Check size={15}/> Review changes</button></footer></form></section>{confirmingViewEdit && <section className="cattle-modal compact-modal health-inline-confirm" role="alertdialog" aria-modal="true" aria-labelledby="health-inline-confirm-title"><header><div><span className="cattle-eyebrow">Final check</span><h2 id="health-inline-confirm-title">Are these changes correct?</h2></div></header><p className="muted">Confirm updated details for {viewing.tag_number}.</p><footer className="modal-actions"><button type="button" className="secondary-button" onClick={() => setConfirmingViewEdit(false)}><Pencil size={15}/> Continue editing</button><button type="button" className="primary-button" onClick={() => void submit({ preventDefault() {} } as FormEvent)}><Check size={15}/> Confirm changes</button></footer></section>}</div>}
      {false && showForm && (
        <div
          className="cattle-modal-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setShowForm(false)
          }
        >
          <section
            className="cattle-modal health-record-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="health-form-title"
          >
            <header>
              <div>
                <span className="cattle-eyebrow">Clinical entry</span>
                <h2 id="health-form-title">
                  {editing ? "Edit health record" : "Add health record"}
                </h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close"
                onClick={() => setShowForm(false)}
              >
                <X size={18} />
              </button>
            </header>
            <form onSubmit={submit}>
              <label className="field">
                Livestock
                <select
                  required
                  value={form.livestock_id}
                  onChange={(event) =>
                    field("livestock_id", event.target.value)
                  }
                >
                  <option value="">Select cattle</option>
                  {animals.map((animal) => (
                    <option key={animal.id} value={animal.id}>
                      {animal.tag_number}
                      {animal.name ? ` — ${animal.name}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Record type
                <select
                  required
                  value={form.record_type}
                  onChange={(event) => field("record_type", event.target.value)}
                >
                  {[
                    "checkup",
                    "vaccination",
                    "treatment",
                    "injury",
                    "illness",
                  ].map((type) => (
                    <option key={type} value={type}>{titleCase(type)}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Record date
                <input
                  required
                  type="date"
                  value={form.record_date}
                  onChange={(event) => field("record_date", event.target.value)}
                />
              </label>
              <label className="field">
                Status
                <select
                  value={form.status}
                  onChange={(event) => field("status", event.target.value)}
                >
                  <option value="open">Active care</option>
                  <option value="resolved">Completed</option>
                </select>
              </label>
              <label className="field">
                Diagnosis
                <textarea
                  value={form.diagnosis}
                  onChange={(event) => field("diagnosis", event.target.value)}
                />
              </label>
              <label className="field">
                Treatment
                <textarea
                  value={form.treatment}
                  onChange={(event) => field("treatment", event.target.value)}
                />
              </label>
              <label className="field">
                Veterinarian
                <input
                  value={form.veterinarian}
                  onChange={(event) =>
                    field("veterinarian", event.target.value)
                  }
                />
              </label>
              <label className="field">
                Follow-up date
                <input
                  type="date"
                  value={form.follow_up_date}
                  onChange={(event) =>
                    field("follow_up_date", event.target.value)
                  }
                />
              </label>
              <label className="field health-form-wide">
                Details
                <textarea
                  value={form.details}
                  onChange={(event) => field("details", event.target.value)}
                />
              </label>
              <footer className="health-form-wide">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  {editing ? "Save changes" : "Add record"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {false && showForm && (
        <div
          className="cattle-modal-backdrop treatment-backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setShowForm(false)
          }
        >
          <section
            className="cattle-modal treatment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="treatment-form-title"
          >
            <header>
              <div>
                <span className="cattle-eyebrow">Health treatment</span>
                <h2 id="treatment-form-title">
                  {editing ? "Edit treatment" : "Record health treatment"}
                </h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close"
                onClick={() => setShowForm(false)}
              >
                <X size={18} />
              </button>
            </header>
            <form onSubmit={submit}>
              {!editing && (
                <label className="batch-toggle health-form-wide">
                  <input
                    type="checkbox"
                    checked={batch}
                    onChange={(event) => {
                      setBatch(event.target.checked);
                      setBatchIds([]);
                      setBatchDoses({});
                    }}
                  />
                  <span>
                    <strong>Enable Batch Recording (Multiple Animals)</strong>
                    <small>
                      Record one treatment with an individual dosage for each animal
                    </small>
                  </span>
                </label>
              )}
              <div className="field health-form-wide">
                <label htmlFor="livestock-search">
                  {batch && !editing ? "Livestock *" : "Livestock ID *"}
                </label>
                <input
                  id="livestock-search"
                  type="search"
                  placeholder="Search by tag ID or animal name"
                  value={!batch && selectedAnimal ? selectedAnimal?.tag_number ?? "" : livestockSearch}
                  onChange={(event) => {
                    if (!batch) field("livestock_id", "");
                    setLivestockSearch(event.target.value);
                  }}
                  aria-controls="livestock-results"
                  autoComplete="off"
                />
                {!batch && selectedAnimal && (
                  <strong aria-live="polite">
                    Selected: {selectedAnimal?.tag_number}
                    {selectedAnimal?.name ? ` — ${selectedAnimal?.name}` : ""}
                  </strong>
                )}
                {!batch && selectedRestriction && (
                  <div className="treatment-notice" role="alert">
                    <strong>{selectedAnimal?.tag_number}{selectedAnimal?.name ? ` — ${selectedAnimal?.name}` : ""}: medicine restriction active</strong>
                    <p>No sale, slaughter, meat, or milk clearance while this restriction remains active.</p>
                    <small>
                      {selectedRestriction?.medication_name || selectedRestriction?.treatment || "Antimicrobial treatment"}
                      {selectedRestriction?.follow_up_date ? `  -  Checkup ${formatDate(selectedRestriction?.follow_up_date ?? "")}` : ""}
                      {selectedRestriction?.withdrawal_end_date ? `  -  Restricted through ${formatDate(selectedRestriction?.withdrawal_end_date ?? "")}` : ""}
                    </small>
                  </div>
                )}
                <div
                  id="livestock-results"
                  className="animal-picker"
                  role={batch && !editing ? "group" : "listbox"}
                  aria-label="Matching livestock"
                >
                  {filteredAnimals.length ? (
                    (batch && !editing ? filteredAnimals : filteredAnimals.slice(0, 8)).map((animal) =>
                      batch && !editing ? (() => {
                        const id = String(animal.id);
                        const selected = batchIds.includes(id);
                        const dosage = batchDoses[id] ?? { dose: "", unit: form.dosage_unit, route: form.administration_route };
                        return <div className={`batch-animal-row ${selected ? "batch-animal-selected" : ""}`} key={animal.id}>
                          <label><input type="checkbox" checked={selected} onChange={(event) => setBatchIds((current) => {
                            if (event.target.checked) {
                              setBatchDoses((doses) => ({ ...doses, [id]: dosage }));
                              return [...current, id];
                            }
                            setBatchDoses((doses) => { const next = { ...doses }; delete next[id]; return next; });
                            return current.filter((currentId) => currentId !== id);
                          })}/><span><strong>{animal.tag_number}</strong>{animal.name && <small>{animal.name}</small>}</span></label>
                          <span className="dose-field"><input disabled={!selected} required={selected} aria-label={`Dosage for ${animal.tag_number}`} placeholder="Dose" type="number" min="0.01" step="any" value={dosage.dose} onChange={(event) => setBatchDoses((current) => ({ ...current, [id]: { ...dosage, dose: event.target.value } }))}/><select disabled={!selected} aria-label={`Dosage unit for ${animal.tag_number}`} value={dosage.unit} onChange={(event) => setBatchDoses((current) => ({ ...current, [id]: { ...dosage, unit: event.target.value } }))}>{["ml", "cc", "mg", "g", "IU"].map((unit) => <option key={unit}>{unit}</option>)}</select></span>
                          <select disabled={!selected} required={selected} aria-label={`Route of administration for ${animal.tag_number}`} value={dosage.route} onChange={(event) => setBatchDoses((current) => ({ ...current, [id]: { ...dosage, route: event.target.value } }))}><option value="">Select route</option>{[["Intramuscular (IM)", "IM"], ["Subcutaneous (SC)", "SC"], ["Intravenous (IV)", "IV"], ["Oral", "Oral"], ["Topical", "Topical"], ["Nasal", "Nasal"]].map(([label, value]) => <option key={value} value={value}>{label}</option>)}</select>
                        </div>;
                      })() : (
                        <button
                          key={animal.id}
                          type="button"
                          role="option"
                          aria-selected={
                            form.livestock_id === String(animal.id)
                          }
                          onClick={() => {
                            field("livestock_id", String(animal.id));
                            setLivestockSearch(animal.tag_number);
                          }}
                        >
                          {animal.tag_number}
                          {animal.name ? ` — ${animal.name}` : ""}
                        </button>
                      ),
                    )
                  ) : (
                    <span className="muted">No matching livestock</span>
                  )}
                </div>
              </div>
              <label className="field">
                Treatment Type *
                <select
                  required
                  value={form.record_type}
                  onChange={(event) => applyTreatmentProtocol(event.target.value)}
                >
                  <option value="">Select treatment type</option>
                  <option value="vaccination">Vaccine</option>
                  <option value="vitamins">Vitamins</option>
                  <option value="antibiotics">Antibiotics</option>
                  <option value="anti_inflammatory">Anti-Inflammatory</option>
                  <option value="dewormer">Dewormer</option>
                </select>
              </label>
              <label className="field">
                Treatment Name *
                <select
                  required
                  disabled={!form.record_type}
                  value={form.medication_name}
                  onChange={(event) => field("medication_name", event.target.value)}
                >
                  <option value="">Select treatment name</option>
                  {form.medication_name && !(treatmentNames[form.record_type] ?? []).includes(form.medication_name) && <option value={form.medication_name}>{form.medication_name}</option>}
                  {(treatmentNames[form.record_type] ?? []).map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
                <small>Current approved product inventory.</small>
              </label>
              {(!batch || editing) && <label className="field">
                Dosage *
                <span className="dose-field">
                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    value={form.dose}
                    onChange={(event) => field("dose", event.target.value)}
                  />
                  <select
                    aria-label="Dosage unit"
                    value={form.dosage_unit}
                    onChange={(event) =>
                      field("dosage_unit", event.target.value)
                    }
                  >
                    {["ml", "cc", "mg", "g", "IU"].map((unit) => (
                      <option key={unit}>{unit}</option>
                    ))}
                  </select>
                </span>
              </label>}
              {(!batch || editing) && <label className="field">
                Route of Administration *
                <select
                  required
                  value={form.administration_route}
                  onChange={(event) =>
                    field("administration_route", event.target.value)
                  }
                >
                  <option value="">Select route</option>
                  {[
                    ["Intramuscular (IM)", "IM"],
                    ["Subcutaneous (SC)", "SC"],
                    ["Intravenous (IV)", "IV"],
                    ["Oral", "Oral"],
                    ["Topical", "Topical"],
                    ["Nasal", "Nasal"],
                  ].map(([label, value]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>}
              <label className="field">
                Date Administered *
                <input
                  required
                  type="date"
                  value={form.record_date}
                  onChange={(event) => {
                    const recordDate = event.target.value;
                    if (form.record_type in treatmentProtocols) applyTreatmentProtocol(form.record_type, recordDate);
                    else field("record_date", recordDate);
                  }}
                />
              </label>
              <label className="field">
                Administered By *
                <input
                  required
                  value={form.veterinarian}
                  onChange={(event) =>
                    field("veterinarian", event.target.value)
                  }
                />
              </label>
              {form.record_type && <section className={`treatment-protocol-card health-form-wide protocol-${form.record_type}`} role="status">
                <div className="treatment-protocol-icon"><CalendarDays size={20} /></div>
                <div className="treatment-protocol-copy">
                  {form.record_type === "vaccination" && <><span>Vaccination Protocol</span><strong>Case-by-Case Scheduling</strong><p>No automatic next dose. Schedule only when approved guidance requires it.</p></>}
                  {form.record_type === "vitamins" && <><span>Vitamin Protocol</span><strong>Automatic Scheduling Enabled</strong><p>Repeats every 2 weeks with reminder 7 days before.</p><small>Next Treatment: {formatDate(form.next_due_date)}</small></>}
                  {form.record_type === "antibiotics" && <><span>Antibiotic Protocol</span><strong>Withdrawal and Monitoring Active</strong><p>No automatic repeat. No sale, slaughter, meat, or milk clearance during withdrawal.</p><small>Required Checkup: {formatDate(form.follow_up_date)}  -  Withdrawal Ends: {formatDate(form.withdrawal_end_date)}</small></>}
                  {form.record_type === "anti_inflammatory" && <><span>Anti-Inflammatory Protocol</span><strong>Monitoring Protocol Active</strong><p>Re-administer only after authorized review if pain persists.</p><small>Required Checkup: {formatDate(form.follow_up_date)}  -  Withdrawal Ends: {formatDate(form.withdrawal_end_date)}</small></>}
                  {form.record_type === "dewormer" && <><span>Deworming Protocol</span><strong>Automatic Scheduling Enabled</strong><p>Defaults to 3 months, adjustable up to 6 months, with reminder 14 days before.</p><small>Next Treatment: {formatDate(form.next_due_date)}</small></>}
                </div>
              </section>}
              {(form.record_type === "vitamins" || form.record_type === "dewormer") && <label className="field">
                Next Due Date
                <input
                  type="date"
                  min={form.record_type === "dewormer" ? addDays(form.record_date, 90) : undefined}
                  max={form.record_type === "dewormer" ? addDays(form.record_date, 183) : undefined}
                  readOnly={form.record_type === "vitamins"}
                  value={form.next_due_date}
                  onChange={(event) =>
                    field("next_due_date", event.target.value)
                  }
                />
              </label>}
              {(form.record_type === "antibiotics" || form.record_type === "anti_inflammatory") && <><label className="field">Withdrawal Ends<input type="date" min={form.record_date} value={form.withdrawal_end_date} onChange={(event) => field("withdrawal_end_date", event.target.value)}/><small data-tooltip="Until this date, do not clear animal for sale, slaughter, meat, or milk use.">Product withdrawal restriction end date.</small></label><label className="field">Required Checkup<input type="date" min={form.record_date} value={form.follow_up_date} onChange={(event) => field("follow_up_date", event.target.value)}/><small data-tooltip="Clinical review required before treatment is closed or repeated.">Monitoring follow-up date.</small></label></>}
              <label className="field health-form-wide">
                Notes / Observations
                <textarea
                  value={form.details}
                  onChange={(event) => field("details", event.target.value)}
                />
              </label>
              <footer className="health-form-wide">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  disabled={
                    batch && !editing ? !batchIds.length : !form.livestock_id
                  }
                >
                  {editing
                    ? "Save treatment"
                    : `Record treatment${batch && batchIds.length ? ` for ${batchIds.length} animals` : ""}`}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
