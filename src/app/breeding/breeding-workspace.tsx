"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, Check, ChevronDown, CircleHelp, HeartPulse, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDays, breedingEligibility, dateString } from "@/lib/breeding-rules";
import { useCurrentRole } from "@/lib/use-current-role";

type Animal = { id: number; tag_number: string; name: string | null; sex: "male" | "female"; breed: string; birth_date: string; sire_id: number | null; dam_id: number | null; health_status: string | null; body_condition_score: number | null; physical_assessment_notes: string | null; vaccination_treatment_history: string | null; open_health_cases: number; latest_health_type: string | null; latest_health_date: string | null; latest_health_diagnosis: string | null; latest_health_record_status: string | null; latest_health_follow_up: string | null; breeding_block_reason: string | null; eligibility: { months: number; eligible: boolean; firstBreedingWindow: boolean; reasons: string[] } };
 type BreedingRecord = { id: number; livestock_id: number; sire_id: number | null; tag_number: string; livestock_name: string | null; event_type: string; event_date: string; sire_tag_number: string | null; sire_name?: string | null; pregnancy_status: string | null; expected_calving_date: string | null; cycle_number?: number; pregnancy_check_due_date?: string; workflow_status?: "pending" | "due" | "successful" | "unsuccessful"; details: string | null; performed_by: string | null };
type Prediction = { livestock_id: number; tag_number: string; expected_date: string; source_event_id: number };
type Pagination = { page: number; total: number; hasNext: boolean };
type SirePerformance = { sireId: number; services: number; resolved: number; confirmed: number; successRate: number | null; conflicts: number };
type Data = { cattle: Animal[]; records: BreedingRecord[]; heatPredictions: Prediction[]; pages: { records: Pagination; heatPredictions: Pagination }; form: { heatReadyIds: number[]; cycleCounts: Record<string, number>; sirePerformance: SirePerformance[] } };
type EventType = "heat_observed" | "natural_service" | "artificial_insemination";

const today = () => new Date().toISOString().slice(0, 10);
const daysTo = (date = "") => Math.ceil((Date.parse(`${date.slice(0, 10)}T00:00:00Z`) - Date.parse(`${today()}T00:00:00Z`)) / 86_400_000);
const urgency = (record: BreedingRecord) => record.workflow_status === "successful" || record.workflow_status === "unsuccessful" ? "resolved" : daysTo(record.pregnancy_check_due_date) <= 0 ? "due" : daysTo(record.pregnancy_check_due_date) <= 7 ? "soon" : "scheduled";
const emptyEvent = { livestock_id: "", event_type: "natural_service" as EventType, event_date: today(), sire_id: "", details: "", performed_by: "" };
const labels: Record<EventType, string> = { heat_observed: "Heat observed", natural_service: "Natural service", artificial_insemination: "Artificial insemination" };
const emptyDetails = { health_status: "Healthy", body_condition_score: "", breeding_time: "", breeding_location: "", notes: "", semen_type: "Conventional", batch_number: "", straw_id: "", semen_sire_code: "", semen_sire_name: "", semen_sire_breed: "", semen_source: "", insemination_time: "", technician: "", thaw_temperature: "", thaw_time: "", insemination_site: "" };

export default function BreedingWorkspace({ embeddedDamId, onClose, onSaved, modalOnly, embeddedReadOnly }: { embeddedDamId?: string; onClose?: () => void; onSaved?: (message: string, breedingRecordId: number) => void | Promise<void>; modalOnly?: boolean; embeddedReadOnly?: boolean } = {}) {
  useCurrentRole();
  const router = useRouter();
    const [data, setData] = useState<Data | null>(null); // State to hold breeding data
  const [query, setQuery] = useState("");
  const [event, setEvent] = useState(emptyEvent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectionToast, setSelectionToast] = useState<{ message: string; error: boolean } | null>(null);
  const [details, setDetails] = useState(emptyDetails);
  const [showAddBreeding, setShowAddBreeding] = useState(Boolean((embeddedDamId && !embeddedReadOnly) || modalOnly));
  const [showBreedingGuide, setShowBreedingGuide] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [profileHeatEntry, setProfileHeatEntry] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [openSelector, setOpenSelector] = useState<"dam" | "sire" | null>(null);
  const [recordSearch, setRecordSearch] = useState("");
  const [recordMethod, setRecordMethod] = useState("all");
  const [recordStatus, setRecordStatus] = useState("all");
    const [recordSort, setRecordSort] = useState("check");
  const closeBreeding = () => { setConfirmSave(false); setShowAddBreeding(false); onClose?.(); };
  const walkthrough = [
    { selector: ".breeding-method", title: "Choose breeding method", text: "Start here. Select Natural Breeding or Artificial Insemination." },
    { selector: ".breeding-cattle-selector.dam", title: "Select eligible Dam", text: "Choose Dam. Eligible animals appear first. Restricted animals show reasons." },
    { selector: ".breeding-selector-grid .sire, .breeding-selector-grid .breeding-cattle-selector.sire", title: "Select Sire", text: "Choose Sire. Lineage conflicts are checked before selection." },
    { selector: ".breeding-cattle-sections", title: "Review handler and observations", text: "Review Dam and Sire information, then enter Handler/Observer Name and Notes & Observations." },
    { selector: ".breeding-cattle-sections + .breeding-form-section", title: "Natural Breeding Details", text: "Enter Breeding Time and Breeding Location so this service can be traced later." },
    { selector: ".breeding-cattle-sections ~ .breeding-form-section:last-of-type", title: "Handler and Observations", text: "Enter Handler/Observer Name, choose Not Confirmed or Confirmed, and add Notes & Observations." },
    { selector: ".breeding-entry-modal form footer", title: "Review and save", text: "Save record. You return to the Breeding workspace, where the new session appears at the top of Breeding records. Open it to view pair details, pregnancy-check timing, and reproductive history." },
  ];
  useEffect(() => {
    if (!showAddBreeding || !showBreedingGuide) return;
    const target = document.querySelector(walkthrough[walkthroughStep]?.selector);
    document.querySelectorAll(".breeding-tour-highlight").forEach((node) => node.classList.remove("breeding-tour-highlight"));
    if (target) { target.classList.add("breeding-tour-highlight"); target.scrollIntoView({ behavior: "smooth", block: "center" }); }
    return () => target?.classList.remove("breeding-tour-highlight");
  }, [showAddBreeding, showBreedingGuide, walkthroughStep]);

  async function apiBody(response: Response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return response.json();
    throw new Error(`Server returned ${response.status} ${response.statusText || "instead of JSON"}`);
  }

  const fetchList = useCallback(async (list: "records" | "heatPredictions", page = 1, meta = false) => {
    const params = new URLSearchParams({ list, page: String(page), meta: meta ? "1" : "0" });
    if (list === "records") { params.set("search", recordSearch); params.set("method", recordMethod); params.set("status", recordStatus); params.set("sort", recordSort); }
    const response = await fetch(`/api/breeding?${params}`, { cache: "no-store" }); const body = await apiBody(response);
    if (!response.ok) throw new Error(body.error || "Breeding records could not load"); return body;
  }, [recordMethod, recordSearch, recordSort, recordStatus]);
  const load = useCallback(async () => { const [records, heat] = await Promise.all([fetchList("records", 1, true), fetchList("heatPredictions")]); setData({ cattle: records.cattle, records: records.rows, heatPredictions: heat.rows, pages: { records: records.pagination, heatPredictions: heat.pagination }, form: records.form }); }, [fetchList]);
  const changePage = async (list: "records" | "heatPredictions", page: number) => { try { const result = await fetchList(list, page); setData((current) => current && ({ ...current, [list]: result.rows, pages: { ...current.pages, [list]: result.pagination } })); } catch (reason) { setError(reason instanceof Error ? reason.message : "Breeding records could not load"); } };

  useEffect(() => { queueMicrotask(() => load().catch((reason) => setError(reason instanceof Error ? reason.message : "Breeding records could not load"))); }, [load]);
  useEffect(() => { if (!success) return; const timer = window.setTimeout(() => setSuccess(""), 4200); return () => window.clearTimeout(timer); }, [success]);
  useEffect(() => { if (!selectionToast) return; const timer = window.setTimeout(() => setSelectionToast(null), 3200); return () => window.clearTimeout(timer); }, [selectionToast]);
  useEffect(() => {
    if (embeddedDamId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("add") !== "1") return;
    const livestockId = params.get("livestock_id") || "";
    queueMicrotask(() => {
      setShowAddBreeding(true);
      if (params.get("heat") === "1") { setProfileHeatEntry(true); setEvent({ ...emptyEvent, livestock_id: livestockId, event_type: "heat_observed", event_date: today() }); }
    });
  }, [embeddedDamId]);
  useEffect(() => { if (!showAddBreeding) return; const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; const close = (event: KeyboardEvent) => { if (event.key === "Escape") closeBreeding(); }; document.addEventListener("keydown", close); return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", close); }; }, [showAddBreeding]);
  useEffect(() => {
    if (embeddedDamId) {
      if (!data) return;
      const animal = data.cattle.find((candidate) => String(candidate.id) === embeddedDamId);
      queueMicrotask(() => animal ? setEvent((current) => ({ ...current, livestock_id: animal.sex === "female" ? embeddedDamId : "", sire_id: animal.sex === "male" ? embeddedDamId : "", event_type: "natural_service" })) : setError("Selected cattle is not active or available for breeding workflows."));
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const livestockId = params.get("livestock_id");
    if (!data || !livestockId) return;
    const dam = data.cattle.find((animal) => String(animal.id) === livestockId && animal.sex === "female");
    const recordingHeat = params.get("heat") === "1";
    const message = !dam ? "Selected cattle is not an active female eligible for breeding workflows." : !recordingHeat && !dam.eligibility.eligible ? `Selected cattle cannot breed: ${dam.eligibility.reasons.join(", ")}` : !recordingHeat && !data.form.heatReadyIds.includes(dam.id) ? "Record heat for selected cattle before adding a breeding service." : "";
    queueMicrotask(() => message ? setError(message) : setEvent((current) => ({ ...current, livestock_id: livestockId })));
  }, [data, embeddedDamId]);

  const females = useMemo(() => data?.cattle.filter((animal) => animal.sex === "female" && !animal.breeding_block_reason) ?? [], [data]);
  const embeddedAnimal = data?.cattle.find((animal) => String(animal.id) === embeddedDamId);
  const embeddedFemale = embeddedAnimal?.sex === "female";
  const embeddedMale = embeddedAnimal?.sex === "male";
  useEffect(() => {
    if (!embeddedMale || event.event_type !== "artificial_insemination") return;
    queueMicrotask(() => {
      setEvent((current) => ({ ...current, event_type: "natural_service" }));
      setError("Artificial insemination requires a dam. Male livestock profiles can only be locked as sire for natural service.");
    });
  }, [embeddedMale, event.event_type]);
  const selectedDam = females.find((animal) => String(animal.id) === event.livestock_id);
  const sires = useMemo(() => (data?.cattle.filter((animal) => animal.sex === "male").map((animal) => selectedDam && knownLineageConflict(selectedDam, animal) ? { ...animal, eligibility: { ...animal.eligibility, eligible: false, reasons: [...animal.eligibility.reasons, "Lineage conflict with selected dam"] } } : animal) ?? []).sort((a, b) => {
    const aEligible = breedingEligibility(dateString(a.birth_date), event.event_date, a.health_status, a.body_condition_score).eligible && (!selectedDam || !knownLineageConflict(selectedDam, a));
    const bEligible = breedingEligibility(dateString(b.birth_date), event.event_date, b.health_status, b.body_condition_score).eligible && (!selectedDam || !knownLineageConflict(selectedDam, b));
    return Number(bEligible) - Number(aEligible) || a.tag_number.localeCompare(b.tag_number);
  }), [data?.cattle, event.event_date, selectedDam]);
  const breedingRecords = useMemo(() => data?.records.filter((record) => Object.keys(labels).includes(record.event_type)) ?? [], [data]);
  const serviceRecords = useMemo(() => breedingRecords.filter((record) => ["natural_service", "artificial_insemination"].includes(record.event_type) && (!embeddedDamId || String(record.livestock_id) === embeddedDamId || String(record.sire_id) === embeddedDamId)).sort((a, b) => {
    const rank = { due: 0, soon: 1, scheduled: 2, resolved: 3 };
    return rank[urgency(a)] - rank[urgency(b)] || (a.pregnancy_check_due_date || "").localeCompare(b.pregnancy_check_due_date || "");
  }), [breedingRecords, embeddedDamId]);
  const heatReadyFemales = useMemo(() => females.filter((animal) => data?.form.heatReadyIds.includes(animal.id)), [data?.form.heatReadyIds, females]);
  const latestServices = useMemo(() => { const map = new Map<number, BreedingRecord>(); for (const record of serviceRecords) if (!map.has(record.livestock_id)) map.set(record.livestock_id, record); return map; }, [serviceRecords]);
  const selectedSire = sires.find((animal) => String(animal.id) === event.sire_id);
  const cycleNumber = (selectedDam ? data?.form.cycleCounts[selectedDam.id] ?? 0 : 0) + 1;
  const serviceEvent = ["natural_service", "artificial_insemination"].includes(event.event_type);
  const openChecks = new Map(serviceRecords.filter((record) => record.workflow_status !== "successful" && record.workflow_status !== "unsuccessful").map((record) => [record.id, { due_date: record.pregnancy_check_due_date ?? "" }]));
  function selectDam(animal: Animal) { if (animal.breeding_block_reason || !animal.eligibility.eligible || !heatReadyFemales.some((candidate) => candidate.id === animal.id)) return; setEvent((current) => ({ ...current, livestock_id: String(animal.id), sire_id: "", event_type: serviceEvent ? current.event_type : "natural_service" })); setError(""); }
  function clearMatch() { setEvent({ ...emptyEvent, event_date: today() }); setDetails(emptyDetails); setQuery(""); setOpenSelector(null); setError(""); }

  function requestSave(e: FormEvent) {
    e.preventDefault();
    if (!event.livestock_id) { setError("Select an eligible dam."); return; }
    if (event.event_type === "natural_service" && !event.sire_id) { setError("Select an eligible sire."); return; }
    if (!event.event_date || event.event_date > today()) { setError("Enter a valid breeding date that is not in the future."); return; }
    setError(""); setConfirmSave(true);
  }

  async function save() {
    setSaving(true); setError("");
    try {
      const structuredDetails = serviceEvent ? [
        `Dam health status: ${selectedDam?.health_status || "Not recorded"}`,
        `Body condition score: ${selectedDam?.body_condition_score ?? "Not recorded"}`,
        event.event_type === "natural_service" ? `Breeding time: ${details.breeding_time || "Not recorded"}` : "",
        event.event_type === "natural_service" ? `Breeding location: ${details.breeding_location || "Not recorded"}` : "",
        event.event_type === "artificial_insemination" ? `Semen type: ${details.semen_type}` : "",
        event.event_type === "artificial_insemination" ? `Batch / lot number: ${details.batch_number || "Not recorded"}` : "",
        event.event_type === "artificial_insemination" ? `Straw ID: ${details.straw_id || "Not recorded"}` : "",
        event.event_type === "artificial_insemination" ? `Semen sire code: ${details.semen_sire_code || "Not recorded"}` : "",
        event.event_type === "artificial_insemination" ? `Semen sire name: ${details.semen_sire_name || "Not recorded"}` : "",
        event.event_type === "artificial_insemination" ? `Semen sire breed: ${details.semen_sire_breed || "Not recorded"}` : "",
        event.event_type === "artificial_insemination" ? `Semen source / supplier: ${details.semen_source || "Not recorded"}` : "",
        event.event_type === "artificial_insemination" ? `Insemination time: ${details.insemination_time || "Not recorded"}` : "",
        event.event_type === "artificial_insemination" ? `AI technician: ${details.technician || "Not recorded"}` : "",
        event.event_type === "artificial_insemination" ? `Thaw temperature: ${details.thaw_temperature || "Not recorded"}` : "",
        event.event_type === "artificial_insemination" ? `Thaw time: ${details.thaw_time || "Not recorded"}` : "",
        event.event_type === "artificial_insemination" ? `Insemination site: ${details.insemination_site || "Not recorded"}` : "",
        `Notes: ${details.notes || "None"}`,
      ].filter(Boolean).join("\n") : event.details;
      const response = await fetch(`/api/livestock/${event.livestock_id}/breeding`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...event, sire_id: event.event_type === "artificial_insemination" ? "" : event.sire_id, details: structuredDetails }) });
      const body = await apiBody(response);
      if (!response.ok) throw new Error(body.error || "Breeding event could not be saved");
      const breedingRecordId = Number(body.id);
      const message = `${labels[event.event_type]} #${breedingRecordId} recorded for ${selectedDam?.tag_number || `livestock ${event.livestock_id}`}.`;
      await load(); clearMatch(); setConfirmSave(false); setShowAddBreeding(false);
      if (onSaved) await onSaved(message, breedingRecordId);
      else { window.sessionStorage.setItem("herdsync:reproduction-toast", message); window.sessionStorage.setItem("herdsync:new-breeding", String(breedingRecordId)); router.push("/reproduction"); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Breeding event could not be saved"); }
    finally { setSaving(false); }
  }

  return <div className={`breeding-page breeding-ledger${embeddedDamId ? ` breeding-profile-embedded${embeddedReadOnly ? " breeding-profile-embedded-readonly" : ""}` : ""}${modalOnly ? " breeding-modal-only" : ""}`}>
    {success && <div className="reproduction-toast" role="status"><Check size={17}/><span>{success}</span><button type="button" aria-label="Dismiss notification" onClick={() => setSuccess("")}><X size={15}/></button></div>}
    {selectionToast && <div className={`reproduction-toast ${selectionToast.error ? "is-warning" : ""}`} role="status">{selectionToast.error ? <X size={17}/> : <Check size={17}/>}<span>{selectionToast.message}</span><button type="button" aria-label="Dismiss notification" onClick={() => setSelectionToast(null)}><X size={15}/></button></div>}
    <header className="breeding-ledger-header"><div><h1>Breeding History</h1></div></header>
    {showBreedingGuide && showAddBreeding && <aside className="breeding-walkthrough" aria-label="Breeding tutorial"><div><span className="cattle-eyebrow">Step {walkthroughStep + 1} of {walkthrough.length}</span><h3>{walkthrough[walkthroughStep].title}</h3><button type="button" className="breeding-walkthrough-close" onClick={() => setShowBreedingGuide(false)}>Exit tutorial</button></div><p>{walkthrough[walkthroughStep].text}</p><footer><button type="button" className="secondary-button" disabled={walkthroughStep === 0} onClick={() => setWalkthroughStep((step) => step - 1)}>Back</button><button type="button" className="primary-button" onClick={() => walkthroughStep === walkthrough.length - 1 ? setShowBreedingGuide(false) : setWalkthroughStep((step) => step + 1)}>{walkthroughStep === walkthrough.length - 1 ? "Finish" : "Next"}</button></footer></aside>}
    {showAddBreeding && <div className="cattle-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeBreeding()}><section id="breeding-entry" className={`cattle-modal breeding-inline-entry breeding-entry-modal${profileHeatEntry ? " breeding-heat-modal" : ""}`} role="dialog" aria-modal="true" aria-labelledby="breeding-entry-title">
      <header><div><span className="cattle-eyebrow">Add breeding</span><h2 id="breeding-entry-title">{event.event_type === "artificial_insemination" ? selectedDam ? `Inseminate ${selectedDam.tag_number}` : "Complete insemination record" : serviceEvent ? selectedDam && selectedSire ? `${selectedDam.tag_number} and ${selectedSire.tag_number}` : "Complete breeding record" : labels[event.event_type]}</h2></div><div className="breeding-minor-actions"><button type="button" className="breeding-modal-close" aria-label="Close breeding form" title="Close" onClick={closeBreeding}><X size={20} strokeWidth={2.25}/></button></div></header>
      <form onSubmit={requestSave}>
        {error && <p role="alert" className="cattle-error">{error}</p>}
        {serviceEvent && <FormSection title={event.event_type === "artificial_insemination" ? "Select Dam" : "Select Breeding Pair"} hint={embeddedDamId ? "Selected cattle" : "Only eligible cattle can be selected"}><div className={event.event_type === "natural_service" ? "breeding-selector-grid" : "breeding-ai-dam-selector"}>{embeddedFemale ? <LockedAnimalSelector kind="dam" animal={selectedDam}/> : <DamSelector animal={selectedDam} animals={females} heatReadyIds={data?.form.heatReadyIds ?? []} open={openSelector === "dam"} query={openSelector === "dam" ? query : ""} latestServices={latestServices} onToggle={() => { setQuery(""); setOpenSelector(openSelector === "dam" ? null : "dam"); }} onQuery={setQuery} onSelect={(animal) => { selectDam(animal); setOpenSelector(null); setQuery(""); setSelectionToast({ message: `${animal.tag_number} selected as dam.`, error: false }); }}/>} {event.event_type === "natural_service" && <><span className="breeding-selector-pair">and</span>{embeddedMale ? <LockedAnimalSelector kind="sire" animal={selectedSire}/> : <CattleSelector kind="sire" animal={selectedSire} animals={sires} open={openSelector === "sire"} query={openSelector === "sire" ? query : ""} onToggle={() => { setQuery(""); setOpenSelector(openSelector === "sire" ? null : "sire"); }} onQuery={setQuery} onSelect={(animal) => { setEvent((current) => ({ ...current, sire_id: String(animal.id) })); setOpenSelector(null); setQuery(""); setError(""); setSelectionToast({ message: `${animal.tag_number} selected as sire.`, error: false }); }}/>}</>}</div></FormSection>}
        {serviceEvent && <><fieldset className="breeding-method"><legend><strong>Breeding Method</strong><small>Select breeding method to continue</small></legend><label className={event.event_type === "natural_service" ? "selected" : ""}><input type="radio" name="method" checked={event.event_type === "natural_service"} onChange={() => setEvent({ ...event, event_type: "natural_service" })}/><span><strong>Natural Breeding</strong><small>Traditional mating between dam and sire</small></span></label><label className={event.event_type === "artificial_insemination" ? "selected" : ""}><input type="radio" name="method" checked={event.event_type === "artificial_insemination"} onChange={() => setEvent({ ...event, event_type: "artificial_insemination" })}/><span><strong>Artificial Insemination</strong><small>Controlled breeding with genetic selection</small></span></label></fieldset><FormSection title="Basic Information"><Field label="Breeding Date *"><input required max={today()} type="date" value={event.event_date} onChange={(e) => setEvent({ ...event, event_date: e.target.value })}/></Field><Field label="Species *"><input value="Cattle" readOnly/></Field></FormSection><div className="breeding-cattle-sections"><FormSection title="Dam (Female) Information" hint="Only females on heat and healthy"><AnimalSnapshot label="Dam Livestock ID *" animal={selectedDam}/><Field label="Health Status"><select value={details.health_status} onChange={(e) => setDetails({ ...details, health_status: e.target.value })}><option>Healthy</option><option>Monitor</option><option>Sick</option></select></Field><Field label="Body Condition Score (1-5)"><input type="number" min="1" max="5" step="1" value={details.body_condition_score} onChange={(e) => setDetails({ ...details, body_condition_score: e.target.value })}/></Field></FormSection><FormSection title="Sire (Male) Information" hint="Only healthy males"><AnimalSnapshot label="Sire Livestock ID *" animal={selectedSire}/></FormSection></div>{event.event_type === "natural_service" && <FormSection title="Natural Breeding Details"><Field label="Breeding Time"><input type="time" value={details.breeding_time} onChange={(e) => setDetails({ ...details, breeding_time: e.target.value })}/></Field><Field label="Breeding Location"><input value={details.breeding_location} onChange={(e) => setDetails({ ...details, breeding_location: e.target.value })}/></Field></FormSection>}<FormSection title="Handler and Observations"><Field label="Handler/Observer Name"><input maxLength={150} value={event.performed_by} onChange={(e) => setEvent({ ...event, performed_by: e.target.value })}/></Field><Field label="Notes & Observations"><textarea value={details.notes} onChange={(e) => setDetails({ ...details, notes: e.target.value })}/></Field></FormSection></>}
        {event.event_type === "artificial_insemination" && <FormSection title="Artificial Insemination Details" hint="Record semen traceability and procedure details"><Field label="Semen Type *"><select value={details.semen_type} onChange={(e) => setDetails({ ...details, semen_type: e.target.value })}><option>Conventional</option><option>Sexed</option></select></Field><Field label="Batch / Lot Number *"><input required maxLength={100} value={details.batch_number} onChange={(e) => setDetails({ ...details, batch_number: e.target.value })}/></Field><Field label="Straw ID *"><input required maxLength={100} value={details.straw_id} onChange={(e) => setDetails({ ...details, straw_id: e.target.value })}/></Field><Field label="Semen Sire Code"><input maxLength={100} value={details.semen_sire_code} onChange={(e) => setDetails({ ...details, semen_sire_code: e.target.value })}/></Field><Field label="Semen Sire Name"><input maxLength={150} value={details.semen_sire_name} onChange={(e) => setDetails({ ...details, semen_sire_name: e.target.value })}/></Field><Field label="Semen Sire Breed"><input maxLength={150} value={details.semen_sire_breed} onChange={(e) => setDetails({ ...details, semen_sire_breed: e.target.value })}/></Field><Field label="Source / Supplier"><input maxLength={150} value={details.semen_source} onChange={(e) => setDetails({ ...details, semen_source: e.target.value })}/></Field><Field label="Insemination Time *"><input required type="time" value={details.insemination_time} onChange={(e) => setDetails({ ...details, insemination_time: e.target.value })}/></Field><Field label="AI Technician *"><input required maxLength={150} value={details.technician} onChange={(e) => setDetails({ ...details, technician: e.target.value })}/></Field><Field label="Thaw Temperature"><input placeholder="e.g. 35-37 degrees C" maxLength={50} value={details.thaw_temperature} onChange={(e) => setDetails({ ...details, thaw_temperature: e.target.value })}/></Field><Field label="Thaw Time"><input placeholder="e.g. 30-45 seconds" maxLength={50} value={details.thaw_time} onChange={(e) => setDetails({ ...details, thaw_time: e.target.value })}/></Field><Field label="Insemination Site"><select value={details.insemination_site} onChange={(e) => setDetails({ ...details, insemination_site: e.target.value })}><option value="">Select site</option><option>Uterine body</option><option>Left uterine horn</option><option>Right uterine horn</option><option>Cervix</option></select></Field></FormSection>}
        {!serviceEvent && <div className="breeding-form-grid">
          {profileHeatEntry ? <AnimalSnapshot label="Recording heat for" animal={selectedDam}/> : <Field label="Animal"><select required value={event.livestock_id} onChange={(e) => setEvent({ ...event, livestock_id: e.target.value })}><option value="">Select animal</option>{females.map((animal) => <option key={animal.id} value={animal.id}>{animal.tag_number}  -  {animal.name || animal.breed}</option>)}</select></Field>}
          <Field label="Event date"><input required max={today()} type="date" value={event.event_date} onChange={(e) => setEvent({ ...event, event_date: e.target.value })}/></Field>
          <Field label="Performed by"><input maxLength={150} value={event.performed_by} onChange={(e) => setEvent({ ...event, performed_by: e.target.value })}/></Field>
          <Field label="Notes"><textarea maxLength={10000} value={event.details} onChange={(e) => setEvent({ ...event, details: e.target.value })}/></Field>
        </div>}
        {serviceEvent && <div className="breeding-outcome-preview"><CalendarClock size={17}/><span>Pregnancy check due</span><strong>{addDays(event.event_date, 45)}</strong><small>Status starts as Awaiting Due</small></div>}
        <footer>{profileHeatEntry ? <button type="button" className="secondary-button" onClick={() => setShowAddBreeding(false)}>Cancel</button> : <button type="button" className="secondary-button" onClick={clearMatch}>Clear</button>}<button className="primary-button" disabled={saving || !event.livestock_id || (event.event_type === "natural_service" && !event.sire_id)}>{saving ? "Saving..." : `Review ${labels[event.event_type].toLowerCase()}`}</button></footer>
      </form>
    </section></div>}
    {showAddBreeding && confirmSave && <div className="cattle-modal-backdrop reproduction-confirm-backdrop" role="presentation"><section className="cattle-modal reproduction-confirm-modal is-positive" role="alertdialog" aria-modal="true" aria-labelledby="breeding-confirm-title"><div className="reproduction-confirm-icon"><Check size={24}/></div><header><span className="cattle-eyebrow">Confirm breeding record</span><h2 id="breeding-confirm-title">Add this {labels[event.event_type].toLowerCase()}?</h2><p>Review selected cattle and breeding date. This creates a pregnancy-check workflow.</p></header><div className="reproduction-confirm-summary"><div><span>Dam</span><strong>{selectedDam?.tag_number} · {selectedDam?.name || selectedDam?.breed}</strong></div><div><span>Breeding date</span><strong>{event.event_date}</strong></div>{event.event_type === "natural_service" && <div><span>Sire</span><strong>{selectedSire?.tag_number} · {selectedSire?.name || selectedSire?.breed}</strong></div>}<div><span>Check due</span><strong>{addDays(event.event_date, 45)}</strong></div></div>{error && <p role="alert" className="cattle-error">{error}</p>}<footer><button type="button" className="secondary-button" disabled={saving} onClick={() => setConfirmSave(false)}>Back and edit</button><button type="button" className="primary-button" disabled={saving} onClick={() => void save()}>{saving ? "Saving..." : "Confirm and add"}</button></footer></section></div>}

    <section className="breeding-records"><header><div><h2>Recent breeding records</h2></div><b>{serviceRecords.length} session{serviceRecords.length === 1 ? "" : "s"}</b></header><div className="operations-toolbar">
      <label className="operations-search"><Search size={15}/><input aria-label="Search breeding records" placeholder="Search dam or sire" value={recordSearch} onChange={(e) => setRecordSearch(e.target.value)}/></label>
      <div className="operations-filters">
        <select aria-label="Filter by breeding method" value={recordMethod} onChange={(e) => setRecordMethod(e.target.value)}><option value="all">All methods</option><option value="natural_service">Natural service</option><option value="artificial_insemination">Artificial insemination</option></select>
        <select aria-label="Filter by status" value={recordStatus} onChange={(e) => setRecordStatus(e.target.value)}><option value="all">All statuses</option><option value="due">Due</option><option value="pending">Awaiting Due</option><option value="successful">Successful</option><option value="unsuccessful">Unsuccessful</option></select>
        <select aria-label="Sort breeding records" value={recordSort} onChange={(e) => setRecordSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="check">Pregnancy check date</option><option value="dam">Dam ID</option><option value="sire">Sire ID</option></select>
      </div>
    </div>

    <section className="breeding-records"><div className="cattle-table-wrap"><table className="cattle-table breeding-session-table"><thead><tr><th>Dam</th><th>Sire</th><th>Method</th><th>Breeding date</th><th>Cycle</th><th>Status</th><th>Actions</th></tr></thead><tbody>{serviceRecords.slice(0, 12).map((record) => { const check = openChecks.get(record.id), isDue = !!check && check.due_date <= today(); const returnTo = embeddedDamId ? `/livestock/${embeddedDamId}?tab=pregnancy` : "/reproduction?tab=breeding"; return <tr key={record.id} className={isDue ? "breeding-check-due" : ""}><td><Link className="cattle-identity" href={`/livestock/${record.livestock_id}`}><strong>{record.tag_number}</strong><span>{record.livestock_name || "Unnamed dam"}</span></Link></td><td><div className="cattle-identity"><strong>{record.sire_tag_number || "Not recorded"}</strong><span>{record.sire_name || (record.event_type === "artificial_insemination" ? "AI sire" : "Unnamed sire")}</span></div></td><td><strong>{labels[record.event_type as EventType]}</strong></td><td><span className="breeding-check-date">{record.event_date.slice(0, 10)}</span></td><td><span className="breeding-cycle-cell">{record.cycle_number || 1}</span></td><td>{isDue ? <span className="breeding-alert"><AlertTriangle size={13}/> Check due</span> : check ? <span className="breeding-waiting">Awaiting check</span> : <span className={`breeding-resolved${record.workflow_status === "unsuccessful" ? " breeding-unsuccessful" : ""}`}>{record.workflow_status === "successful" ? "Successful" : "Unsuccessful"}</span>}</td><td><Link className="secondary-button" href={`/breeding/${record.id}?returnTo=${encodeURIComponent(returnTo)}`}>View record</Link></td></tr>; })}</tbody></table></div></section>
    {data && <div className="breeding-records-pagination"><Pager pagination={data.pages.records} onPage={(page) => void changePage("records", page)}/></div>}</section>
  </div>;
}

function DamSelector({ animal, animals, heatReadyIds, open, query, latestServices, onToggle, onQuery, onSelect }: { animal?: Animal; animals: Animal[]; heatReadyIds: number[]; open: boolean; query: string; latestServices: Map<number, BreedingRecord>; onToggle: () => void; onQuery: (value: string) => void; onSelect: (animal: Animal) => void }) {
  const filtered = animals.filter((item) => `${item.tag_number} ${item.name || ""} ${item.breed}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => {
    const aEligible = !a.breeding_block_reason && a.eligibility.eligible && heatReadyIds.includes(a.id);
    const bEligible = !b.breeding_block_reason && b.eligibility.eligible && heatReadyIds.includes(b.id);
    return Number(bEligible) - Number(aEligible) || a.tag_number.localeCompare(b.tag_number);
  });
  return <div className="breeding-cattle-selector dam"><button type="button" className="breeding-selector-trigger" onClick={onToggle} aria-expanded={open}><span className="breeding-selector-avatar"></span><span>{animal ? <><small>Selected dam <EligibilityHelp label="Dam eligibility requirements" text="At least 18 months old, active heat recorded, good or excellent health, and BCS 2-4."/></small><strong>{animal.tag_number}  -  {animal.name || animal.breed}</strong><em>{animal.breed}  -  {animal.eligibility.months} mo  -  {animal.health_status || "No health status"}  -  BCS {animal.body_condition_score ?? "Not recorded"}</em></> : <><small>Dam <EligibilityHelp label="Dam eligibility requirements" text="At least 18 months old, active heat recorded, good or excellent health, and BCS 2-4."/></small><strong>Select dam</strong><em>Restricted females remain visible</em></>}</span><b>{animal ? "Change" : "Choose"}</b></button>{open && <div className="breeding-selector-menu"><label><Search size={15}/><input autoFocus aria-label="Search dams" placeholder="Search dams" value={query} onChange={(e) => onQuery(e.target.value)}/></label><div>{filtered.map((item) => { const reasons = [...item.eligibility.reasons]; if (!heatReadyIds.includes(item.id)) reasons.push("No active heat record"); const eligible = item.eligibility.eligible && heatReadyIds.includes(item.id); const service = latestServices.get(item.id); return <div className={`breeding-selector-option ${eligible ? "" : "restricted"}`} key={item.id}><button type="button" disabled={!eligible} onClick={() => onSelect(item)}><span><strong>{item.tag_number}</strong><small>{item.name || item.breed}  -  {item.breed}</small></span><span><b>{eligible ? "Eligible" : "Restricted"}</b>{eligible && <small>{item.health_status} health  -  BCS {item.body_condition_score}{service?.cycle_number ? `  -  Cycle ${service.cycle_number + 1}` : ""}</small>}</span></button>{!eligible && <RestrictionDetails animal={item} reasons={reasons}/>}</div>; })}{!filtered.length && <p>No matching cattle.</p>}</div></div>}</div>;
}
function CattleSelector({ kind, animal, animals, open, query, latestServices, onToggle, onQuery, onSelect }: { kind: "dam" | "sire"; animal?: Animal; animals: Animal[]; open: boolean; query: string; latestServices?: Map<number, BreedingRecord>; onToggle: () => void; onQuery: (value: string) => void; onSelect: (animal: Animal) => void }) { const filtered = animals.filter((item) => `${item.tag_number} ${item.name || ""} ${item.breed}`.toLowerCase().includes(query.toLowerCase())); const help = kind === "dam" ? "At least 18 months old, active heat recorded, good or excellent health, and BCS 2-4." : "At least 18 months old, good or excellent health, BCS 2-4, and no recorded lineage conflict with selected dam."; return <div className={`breeding-cattle-selector ${kind}`}><button type="button" className="breeding-selector-trigger" onClick={onToggle} aria-expanded={open}><span className="breeding-selector-avatar"></span><span>{animal ? <><small>{kind === "dam" ? "Selected dam" : "Selected sire"} <EligibilityHelp label={`${kind} eligibility requirements`} text={help}/></small><strong>{animal.tag_number}  -  {animal.name || animal.breed}</strong><em>{animal.breed}  -  {animal.eligibility.months} mo  -  {animal.health_status || "No health status"}  -  BCS {animal.body_condition_score ?? "Not recorded"}</em></> : <><small>{kind === "dam" ? "Dam" : "Sire"} <EligibilityHelp label={`${kind} eligibility requirements`} text={help}/></small><strong>Select {kind}</strong><em>Good or excellent health  -  BCS 2-4</em></>}</span><b>{animal ? "Change" : "Choose"}</b></button>{open && <div className="breeding-selector-menu"><label><Search size={15}/><input autoFocus aria-label={`Search ${kind}s`} placeholder={`Search ${kind}s`} value={query} onChange={(e) => onQuery(e.target.value)}/></label><div>{filtered.map((item) => { const service = latestServices?.get(item.id); return <div className={`breeding-selector-option ${item.eligibility.eligible ? "" : "restricted"}`} key={item.id}><button type="button" disabled={!item.eligibility.eligible} onClick={() => onSelect(item)}><span><strong>{item.tag_number}</strong><small>{item.name || item.breed}  -  {item.breed}</small></span><span><b>{item.eligibility.eligible ? "Eligible" : "Restricted"}</b>{item.eligibility.eligible && <small>{item.health_status} health  -  BCS {item.body_condition_score}{service?.cycle_number ? `  -  Cycle ${service.cycle_number + 1}` : ""}</small>}</span></button>{!item.eligibility.eligible && <RestrictionDetails animal={item} reasons={item.eligibility.reasons}/>}</div>; })}{!filtered.length && <p>No matching cattle.</p>}</div></div>}</div>; }
function RestrictionDetails({ animal, reasons }: { animal: Animal; reasons: string[] }) { return <details className="breeding-restriction-details"><summary><ChevronDown size={13}/> Why restricted</summary><ul>{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><Link href={`/livestock/${animal.id}?from=breeding#reproductive-readiness`}>View profile</Link></details>; }
function EligibilityHelp({ label, text }: { label: string; text: string }) { return <span className="breeding-help" role="img" tabIndex={0} aria-label={`${label}: ${text}`} data-tooltip={text}><CircleHelp size={14}/></span>; }
function FormSection({ title, hint, children }: { title: React.ReactNode; hint?: string; children: React.ReactNode }) { return <fieldset className="breeding-form-section"><legend><strong>{title}</strong>{hint && <small title={hint} data-tooltip={hint}>{hint}</small>}</legend><div>{children}</div></fieldset>; }
function LockedAnimalSelector({ kind, animal }: { kind: "dam" | "sire"; animal?: Animal }) { const label = kind === "dam" ? "Dam" : "Sire"; return <div className={`breeding-cattle-selector ${kind}`}><div className="breeding-selector-trigger breeding-selector-locked"><span><small>Selected cattle</small><strong>{animal ? `${animal.tag_number} - ${animal.name || animal.breed}` : `${label} unavailable`}</strong>{animal && <em>{animal.breed} - {animal.eligibility.months} mo - {animal.health_status || "No health status"} - BCS {animal.body_condition_score ?? "Not recorded"}</em>}</span></div></div>; }
function RequiredLabel({ label }: { label: string }) { const required = label.endsWith(" *") || ["Handler/Observer Name", "Breeding Time", "Breeding Location"].includes(label); return <>{label.replace(/ \*$/, "")}{required && <span className="required-mark" aria-hidden="true"> *</span>}</>; }
function AnimalSnapshot({ label, animal }: { label: string; animal?: Animal }) { return <div className="breeding-animal-snapshot"><span><RequiredLabel label={label}/></span><strong>{animal ? `${animal.tag_number}  -  ${animal.name || animal.breed}` : "Select from pair selector"}</strong>{animal && <><small>{animal.breed}  -  {animal.eligibility.months} months  -  {animal.health_status || "Health not recorded"}  -  BCS {animal.body_condition_score ?? "not recorded"}</small><div className="breeding-health-summary"><span><b>{animal.open_health_cases || 0}</b> open health case{animal.open_health_cases === 1 ? "" : "s"}</span><span><b>Latest check</b> {animal.latest_health_date ? `${animal.latest_health_type}  -  ${animal.latest_health_date.slice(0, 10)}` : "No health checks recorded"}</span>{animal.latest_health_diagnosis && <span><b>Finding</b> {animal.latest_health_diagnosis}</span>}{animal.latest_health_follow_up && <span><b>Follow-up</b> {animal.latest_health_follow_up.slice(0, 10)}</span>}{animal.physical_assessment_notes && <span><b>Assessment</b> {animal.physical_assessment_notes}</span>}<Link href={`/livestock/${animal.id}?from=breeding`}>View full health profile</Link></div></>}</div>; }
const fieldHelp: Record<string, string> = {
  "AI Technician *": "Person who performed the insemination.",
  Animal: "Cattle receiving this breeding event.",
  "Batch / Lot Number *": "Supplier batch used to trace the semen dose.",
  "Body Condition Score (1-5)": "Current condition score; breeding target is 2 through 4.",
  "Breeding Date *": "Date mating or insemination occurred; future dates are not allowed.",
  "Breeding Location": "Pen, pasture, or facility where natural breeding occurred.",
  "Breeding Time": "Approximate time natural breeding occurred.",
  "Event date": "Date this reproductive event occurred.",
  "Handler/Observer Name": "Person who handled cattle or observed natural breeding.",
  "Health Status": "Dam health observed at breeding time.",
  "Insemination Site": "Anatomical placement site used during insemination.",
  "Insemination Time *": "Time artificial insemination was performed.",
  Notes: "Optional details useful for later review.",
  "Notes & Observations": "Optional behavior, procedure, or follow-up observations.",
  "Performed by": "Person who recorded or performed this event.",
  "Semen Sire Breed": "Breed recorded by the semen supplier.",
  "Semen Sire Code": "Supplier or registry identifier for the semen sire.",
  "Semen Sire Name": "Registered or common name of the semen sire.",
  "Semen Type *": "Dose category used for this insemination.",
  "Source / Supplier": "Organization that supplied the semen dose.",
  "Straw ID *": "Unique identifier printed on the semen straw.",
  "Thaw Temperature": "Temperature used to thaw the semen dose.",
  "Thaw Time": "Duration the semen dose was thawed before use.",
};
function Field({ label, children }: { label: string; children: React.ReactNode }) { return label === "Species *" ? null : <label className="field"><span className="breeding-field-label"><RequiredLabel label={label}/>{fieldHelp[label] && <EligibilityHelp label={`${label.replace(" *", "")} help`} text={fieldHelp[label]}/>}</span>{children}</label>; }
function Pager({ pagination, onPage }: { pagination: Pagination; onPage: (page: number) => void }) { return <nav className="operations-pagination" aria-label="List pagination"><button className="secondary-button" disabled={pagination.page === 1} onClick={() => onPage(pagination.page - 1)}>Previous</button><span>{pagination.total ? `${(pagination.page - 1) * 7 + 1}-${Math.min(pagination.page * 7, pagination.total)} of ${pagination.total}` : "0 items"}</span><button className="secondary-button" disabled={!pagination.hasNext} onClick={() => onPage(pagination.page + 1)}>Next</button></nav>; }
function CheckTimeline({ record }: { record: BreedingRecord }) { const level = urgency(record), days = daysTo(record.pregnancy_check_due_date); const text = level === "resolved" ? "Completed" : days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : days <= 7 ? `Due in ${days}d` : `${days}d remaining`; const progress = Math.max(0, Math.min(100, ((45 - Math.max(0, days)) / 45) * 100)); return <div className={`breeding-check-timeline ${level}`}><span><strong>{record.pregnancy_check_due_date?.slice(0, 10) || "Not scheduled"}</strong><b>{text}</b></span><div aria-label={text}><i style={{ width: `${progress}%` }}/></div></div>; }
function knownLineageConflict(dam: Animal, sire: Animal) { const damParents = [dam.sire_id, dam.dam_id].filter((id): id is number => id != null); const sireParents = [sire.sire_id, sire.dam_id].filter((id): id is number => id != null); return damParents.includes(sire.id) || sireParents.includes(dam.id) || damParents.some((id) => sireParents.includes(id)); }
function ReadinessPassport({ animal }: { animal?: Animal }) { const checks = animal ? [{ label: "Age", ok: animal.eligibility.months >= 18 }, { label: "Health", ok: ["good", "excellent", "healthy"].includes((animal.health_status || "").toLowerCase()) }, { label: "BCS", ok: animal.body_condition_score != null && animal.body_condition_score >= 2 && animal.body_condition_score <= 4 }] : []; return <section className="breeding-passport"><span className="cattle-eyebrow">Dam readiness passport</span><h3>{animal?.tag_number || "Select a dam"}</h3><div>{checks.length ? checks.map((check) => <span className={check.ok ? "approved" : "missing"} key={check.label}><Check size={13}/>{check.label}</span>) : <small>Age, health, and body condition stamps appear here.</small>}</div></section>; }
function LineagePreview({ dam, sire, cattle }: { dam?: Animal; sire?: Animal; cattle: Animal[] }) { const tag = (id: number | null) => cattle.find((animal) => animal.id === id)?.tag_number || "Not recorded"; const shared = dam && sire ? [dam.sire_id, dam.dam_id].filter((id): id is number => id != null && [sire.sire_id, sire.dam_id].includes(id)) : []; const direct = dam && sire ? dam.sire_id === sire.id || dam.dam_id === sire.id ? `${sire.tag_number} -> ${dam.tag_number}` : sire.sire_id === dam.id || sire.dam_id === dam.id ? `${dam.tag_number} -> ${sire.tag_number}` : null : null; const conflict = !!dam && !!sire && knownLineageConflict(dam, sire); const pedigreeComplete = !!dam && !!sire && [dam.sire_id, dam.dam_id, sire.sire_id, sire.dam_id].every((id) => id != null); const status = !dam || !sire ? "pending" : conflict ? "conflict" : pedigreeComplete ? "clear" : "incomplete"; const parentClass = (id: number | null) => shared.includes(id as number) || (!!dam && !!sire && (id === dam.id || id === sire.id)) ? "lineage-node-conflict" : ""; return <section className={`breeding-lineage ${status}`}><header><span><small>Pedigree check</small><strong>Pair lineage review</strong></span><b>{status === "conflict" ? "Conflict" : status === "clear" ? "Clear" : status === "incomplete" ? "Incomplete" : "Waiting"}</b></header><div className="lineage-pair"><div><span>Dam</span><strong>{dam?.tag_number || "Select dam"}</strong><small className={parentClass(dam?.sire_id ?? null)}><b>Sire</b>{dam ? tag(dam.sire_id) : "Not recorded"}</small><small className={parentClass(dam?.dam_id ?? null)}><b>Dam</b>{dam ? tag(dam.dam_id) : "Not recorded"}</small></div><i className={conflict ? "conflict" : ""}>{conflict ? "!" : "x"}</i><div><span>Sire</span><strong>{sire?.tag_number || "Select sire"}</strong><small className={parentClass(sire?.sire_id ?? null)}><b>Sire</b>{sire ? tag(sire.sire_id) : "Not recorded"}</small><small className={parentClass(sire?.dam_id ?? null)}><b>Dam</b>{sire ? tag(sire.dam_id) : "Not recorded"}</small></div></div>{conflict && <div className="lineage-conflict-chart"><span>{shared.length ? shared.map(tag).join(", ") : direct}</span><b>{shared.length ? "shared parent of both animals" : "direct parent relationship"}</b><span>{dam?.tag_number} x {sire?.tag_number}</span></div>}<p>{!dam || !sire ? "Select both animals to check recorded lineage." : conflict ? shared.length ? `Shared parent ${shared.map(tag).join(", ")} found. Choose another pair.` : "Parent-to-offspring relationship found. Choose another pair." : pedigreeComplete ? "No conflict found across recorded parents." : "No conflict found in available records. Some parent details are missing."}</p></section>; }
function CheckUnlockRing({ date }: { date: string }) { const elapsed = Math.max(0, Math.floor((Date.parse(today()) - Date.parse(`${date}T00:00:00`)) / 86_400_000)); const progress = Math.min(45, elapsed); return <section className="breeding-unlock"><span className="cattle-eyebrow">Pregnancy check unlock</span><div className="unlock-ring" style={{ "--progress": `${progress / 45 * 360}deg` } as React.CSSProperties}><strong>{progress >= 45 ? "Ready" : 45 - progress}</strong><small>{progress >= 45 ? "day 45+" : "days left"}</small></div><p>{addDays(date, 45)}</p></section>; }

