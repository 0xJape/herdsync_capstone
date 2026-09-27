"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  Pencil,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import { addDays } from "@/lib/health-rules";
import SuccessModal from "@/components/ui/success-modal";
import HealthTreatmentModal from "@/components/health-treatment-modal";
import { useCurrentRole } from "@/lib/use-current-role";

type Animal = { id: number; tag_number: string; name: string | null };
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
};
type PregnancyAlert = { id: number; livestock_id: number; tag_number: string; livestock_name: string | null; next_checkup_date: string; expected_calving_date: string };
const dateOnly = (value: string) => value.slice(0, 10);
const today = () => new Date().toISOString().slice(0, 10);
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
  const [batch, setBatch] = useState(false),
    [batchIds, setBatchIds] = useState<string[]>([]);
  const [livestockSearch, setLivestockSearch] = useState("");
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [success, setSuccess] = useState("");
  const [linkedRecords, setLinkedRecords] = useState<HealthRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  });
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
    setEditing(null);
    setBatch(false);
    setForm({ ...empty, livestock_id: livestockId, record_type: recordType });
    setLivestockSearch("");
    setShowForm(true);
    fetch(`/api/health?livestock_id=${encodeURIComponent(livestockId)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { records: HealthRecord[] }) => setLinkedRecords(data.records))
      .catch(() => setError("Could not load selected cattle health restrictions"));
  }, [searchParams]);
  useEffect(() => { load().catch((cause) => { setError(cause instanceof Error ? cause.message : "Could not load health records"); setLoading(false); }); }, [load]);
  const visibleRecords = useMemo(
    () =>
      records.filter((record) => status === "all" || record.status === status),
    [records, status],
  );
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
      [...records
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
          (record.status === "open" && record.record_type === "antibiotics") ||
            (record.withdrawal_end_date &&
              dateOnly(record.withdrawal_end_date) >= today()),
      );
      return [...new Map(restricted.map((record) => [record.livestock_id, record])).values()];
    },
    [records],
  );
  const selectedRestriction = [...linkedRecords, ...activeRestrictions].find(
    (record) => String(record.livestock_id) === form.livestock_id &&
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
  const urgentWeek = scheduled
    .filter((event) => event.date >= today() && event.date <= weekEnd && (event.record.status === "open" || event.label !== "Follow-up"))
    .slice(0, 4);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const wasEditing = editing !== null;
    const savedCount = batch && !editing ? batchIds.length : 1;
    const nextDue = form.repeat_days
      ? addDays(form.record_date, Number(form.repeat_days))
      : form.next_due_date;
    const payload = {
      ...form,
      livestock_ids: batch && !editing ? batchIds : undefined,
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
    setEditing(null);
    setShowForm(false);
    await load();
    setSuccess(wasEditing ? "Health record updated successfully." : savedCount > 1 ? `Treatment recorded for ${savedCount} cattle.` : "Health record added successfully.");
  }
  function edit(record: HealthRecord) {
    setEditing(record.id);
    setBatch(false);
    setShowForm(true);
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
    if (
      !confirm(`Archive ${record.record_type} record for ${record.tag_number}?`)
    )
      return;
    const response = await fetch(`/api/health/${record.id}`, {
      method: "DELETE",
    });
    if (!response.ok)
      return setError((await response.json()).error ?? "Archive failed");
    await load();
    setSuccess(`${record.record_type.replaceAll("_", " ")} record for ${record.tag_number} archived successfully.`);
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
          <span className="cattle-eyebrow">Herd care center</span>
          <h1>Health & medical care</h1>
          <p>
            Monitor active cases, follow-ups, vaccinations, and treatment
            history.
          </p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setEditing(null);
            setForm(empty);
            setShowForm(true);
          }}
        >
          <Plus size={16} /> Add health record
        </button>
      </header>
      {error && (
        <p role="alert" className="cattle-error">
          {error}
        </p>
      )}
      <section className="panel health-week">
        <header>
          <div className="health-week-title">
            <div aria-hidden="true">
              <CalendarDays size={18} />
            </div>
            <div>
              <span className="cattle-eyebrow">Priority schedule</span>
              <h2>Needs attention this week</h2>
              <p>
                Overdue and upcoming care requiring action within seven days.
              </p>
            </div>
          </div>
          <span>{urgentWeek.length} scheduled</span>
        </header>
        {urgentWeek.length ? (
          <div className="health-overview">
            {urgentWeek.map((event) => {
              const isOverdue = event.date < today(),
                isToday = event.date === today();
              return (
                <Link
                  key={`${event.record.id}-${event.label}`}
                  href={`/livestock/${event.record.livestock_id}`}
                  className={`${careClass(event.record, event.label)}${isOverdue ? " urgent" : ""}`}
                >
                  <div>
                    <span>
                      {isOverdue
                        ? "Overdue"
                        : isToday
                          ? "Due today"
                          : event.label}
                    </span>
                    <strong>{event.record.tag_number}</strong>
                    <small>
                      {event.record.record_type.replaceAll("_", " ")} ·{" "}
                      {formatDate(event.date)}
                    </small>
                  </div>
                  <CalendarDays size={17} />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="health-week-clear">
            <HeartPulse size={18} />
            <div>
              <strong>No urgent care scheduled</strong>
              <span>No open follow-ups due within seven days.</span>
            </div>
          </div>
        )}
      </section>
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
                        href={`/livestock/${event.record.livestock_id}`}
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
                      href={`/livestock/${event.record.livestock_id}`}
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
                href={`/livestock/${event.record.livestock_id}`}
              >
                <time dateTime={event.date}>
                  <strong>{new Date(event.date).getUTCDate()}</strong>
                  <span>{formatDate(event.date).split(" ")[0]}</span>
                </time>
                <div>
                  <strong>{event.record.tag_number}</strong>
                  <span>
                    {event.label} ·{" "}
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
      {activeRestrictions.length > 0 && (
        <section className="panel treatment-notice" aria-label="Medicine restrictions">
          <HeartPulse size={18} />
          <div>
            <strong>Medicine restrictions and checkups</strong>
            <p>{activeRestrictions.length} cattle require antimicrobial or withdrawal monitoring. No slaughter, meat, or milk clearance while withdrawal is active.</p>
            <div className="health-overview">
              {activeRestrictions.map((record) => (
                <Link key={record.id} href={`/livestock/${record.livestock_id}`} className="care-treatment">
                  <div>
                    <span>{record.withdrawal_end_date && dateOnly(record.withdrawal_end_date) >= today() ? "Withdrawal active" : "AMR stewardship"}</span>
                    <strong>{record.tag_number}</strong>
                    <small>{record.medication_name || record.treatment || "Antimicrobial treatment"}{record.follow_up_date ? ` · Checkup ${formatDate(record.follow_up_date)}` : ""}{record.withdrawal_end_date ? ` · Restricted through ${formatDate(record.withdrawal_end_date)}` : ""}</small>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      <section className="panel health-records-panel">
        <header>
          <div>
            <span className="cattle-eyebrow">Clinical history</span>
            <h2>
              <Stethoscope size={18} /> Health records
            </h2>
          </div>
          <div className="health-record-tools">
            <label>
              <Search size={15} />
              <input
                aria-label="Search health records"
                placeholder="Search cattle or diagnosis"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              />
            </label>
            <select
              aria-label="Filter status"
              value={status}
              onChange={(event) => { setStatus(event.target.value); setPage(1); }}
            >
              <option value="all">All statuses</option>
              <option value="open">Active care</option>
              <option value="resolved">Completed</option>
            </select>
          </div>
        </header>
        {loading ? (
          <p className="muted">Loading health records…</p>
        ) : visibleRecords.length ? (
          <>
            <div className="health-record-table">
              {pagedRecords.map((record) => (
                <article key={record.id}>
                  <div className="health-record-animal">
                    <Link href={`/livestock/${record.livestock_id}`}>
                      {record.tag_number}
                    </Link>
                    <span>{record.livestock_name || "Unnamed animal"}</span>
                  </div>
                  <div>
                    <strong>{record.record_type.replaceAll("_", " ")}</strong>
                    <span>
                      {record.diagnosis || record.details || "Routine care"}
                    </span>
                    <span>Added by {record.added_by || "Unknown"}</span>
                  </div>
                  <time dateTime={record.record_date}>
                    {formatDate(record.record_date)}
                  </time>
                  <span className={`record-status ${record.status}`}>
                    {record.status === "open" ? "Active" : "Completed"}
                  </span>
                  <div className="health-row-actions">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Edit ${record.tag_number} health record`}
                      onClick={() => edit(record)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      aria-label={`Archive ${record.tag_number} health record`}
                      onClick={() => archive(record)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {pageCount > 1 && (
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
            )}
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
      {showForm && <HealthTreatmentModal animals={animals} initialLivestockId={form.livestock_id} initialRecordType={form.record_type} editingRecord={editing ? records.find((record) => record.id === editing) ?? null : null} restrictions={[...linkedRecords, ...activeRestrictions]} onClose={() => setShowForm(false)} onError={setError} onSaved={async (message) => { setShowForm(false); setEditing(null); await load(); setSuccess(message); }}/>}
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
                    <option key={type}>{type}</option>
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
                    }}
                  />
                  <span>
                    <strong>Enable Batch Recording (Multiple Animals)</strong>
                    <small>
                      Record same treatment for multiple animals at once
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
                      {selectedRestriction?.follow_up_date ? ` · Checkup ${formatDate(selectedRestriction?.follow_up_date ?? "")}` : ""}
                      {selectedRestriction?.withdrawal_end_date ? ` · Restricted through ${formatDate(selectedRestriction?.withdrawal_end_date ?? "")}` : ""}
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
                    filteredAnimals.slice(0, 8).map((animal) =>
                      batch && !editing ? (
                        <label key={animal.id}>
                          <input
                            type="checkbox"
                            checked={batchIds.includes(String(animal.id))}
                            onChange={(event) =>
                              setBatchIds((current) =>
                                event.target.checked
                                  ? [...current, String(animal.id)]
                                  : current.filter(
                                      (id) => id !== String(animal.id),
                                    ),
                              )
                            }
                          />
                          <span>
                            {animal.tag_number}
                            {animal.name ? ` — ${animal.name}` : ""}
                          </span>
                        </label>
                      ) : (
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
                <input
                  className="treatment-name-input"
                  required
                  list="treatment-name-suggestions"
                  disabled={!form.record_type}
                  placeholder="Type or select treatment name"
                  value={form.medication_name}
                  onChange={(event) =>
                    field("medication_name", event.target.value)
                  }
                />
                <datalist id="treatment-name-suggestions">
                  {(treatmentNames[form.record_type] ?? []).map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <small>
                  Current product inventory. Entering another approved product
                  adds it to this list.
                </small>
              </label>
              <label className="field">
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
              </label>
              <label className="field">
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
              </label>
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
                  {form.record_type === "vaccination" && <><span>Vaccine schedule</span><strong>Case-by-case scheduling</strong><p>No automatic next dose. Schedule only when approved guidance requires it.</p></>}
                  {form.record_type === "vitamins" && <><span>Vitamin schedule</span><strong>Automatic scheduling enabled</strong><p>Repeats every 2 weeks with reminder 7 days before.</p><small>Next treatment: {formatDate(form.next_due_date)}</small></>}
                  {form.record_type === "antibiotics" && <><span>AMR protocol</span><strong>Withdrawal and monitoring active</strong><p>No automatic repeat. No sale, slaughter, meat, or milk clearance during withdrawal.</p><small>Checkup: {formatDate(form.follow_up_date)} · Withdrawal ends: {formatDate(form.withdrawal_end_date)}</small></>}
                  {form.record_type === "anti_inflammatory" && <><span>Pain management</span><strong>Monitoring protocol active</strong><p>Re-administer only after authorized review if pain persists.</p><small>Checkup: {formatDate(form.follow_up_date)} · Withdrawal ends: {formatDate(form.withdrawal_end_date)}</small></>}
                  {form.record_type === "dewormer" && <><span>Deworming schedule</span><strong>Automatic scheduling enabled</strong><p>Defaults to 3 months, adjustable up to 6 months, with reminder 14 days before.</p><small>Next treatment: {formatDate(form.next_due_date)}</small></>}
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
              {(form.record_type === "antibiotics" || form.record_type === "anti_inflammatory") && <><label className="field">Withdrawal Ends<input type="date" min={form.record_date} value={form.withdrawal_end_date} onChange={(event) => field("withdrawal_end_date", event.target.value)}/></label><label className="field">Required Checkup<input type="date" min={form.record_date} value={form.follow_up_date} onChange={(event) => field("follow_up_date", event.target.value)}/></label></>}
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
