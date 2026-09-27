"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { addDays } from "@/lib/health-rules";

export type HealthAnimal = { id: number; tag_number: string; name: string | null };
export type EditableHealthRecord = {
  id: number; livestock_id: number; record_type: string; record_date: string;
  diagnosis: string | null; details: string | null; treatment: string | null;
  medication_name: string | null; dose: string | null; administration_route: string | null;
  treatment_end_date: string | null; withdrawal_end_date: string | null;
  veterinarian: string | null; follow_up_date: string | null; next_due_date?: string | null;
  status: string;
};

type Props = {
  animals: HealthAnimal[];
  initialLivestockId?: string;
  initialRecordType?: string;
  editingRecord?: EditableHealthRecord | null;
  lockedLivestock?: boolean;
  allowBatch?: boolean;
  restrictions?: EditableHealthRecord[];
  onClose: () => void;
  onSaved: (message: string) => void | Promise<void>;
  onError?: (message: string) => void;
};

const today = () => new Date().toISOString().slice(0, 10);
const dateOnly = (value: string) => value.slice(0, 10);
const formatDate = (value: string) => new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
const empty = { livestock_id: "", record_type: "", record_date: today(), diagnosis: "", details: "", treatment: "", medication_name: "", dose: "", dosage_unit: "ml", administration_route: "", treatment_end_date: "", withdrawal_required: "", withdrawal_end_date: "", repeat_days: "", next_due_date: "", veterinarian: "", follow_up_date: "", status: "open" };
const fallbackTreatmentNames: Record<string, string[]> = {
  vaccination: ["FMD vaccine", "Hemorrhagic septicemia vaccine", "Blackleg vaccine", "Anthrax vaccine"],
  vitamins: ["Vitamin A, D & E", "Vitamin B complex", "Multivitamin"],
  antibiotics: ["Oxytetracycline", "Penicillin", "Amoxicillin"],
  anti_inflammatory: ["Flunixin meglumine", "Meloxicam", "Ketoprofen"],
  dewormer: ["Ivermectin", "Albendazole", "Fenbendazole"],
};
const protocols = {
  vitamins: { nextDays: 14 }, dewormer: { nextDays: 90 },
  antibiotics: { withdrawalDays: 21, followUpDays: 3 },
  anti_inflammatory: { withdrawalDays: 7, followUpDays: 3 },
} as const;

export default function HealthTreatmentModal({ animals, initialLivestockId = "", initialRecordType = "", editingRecord, lockedLivestock = false, allowBatch = true, restrictions = [], onClose, onSaved, onError }: Props) {
  const editing = editingRecord ?? null;
  const [form, setForm] = useState(() => editing ? {
    ...empty, livestock_id: String(editing.livestock_id), record_type: editing.record_type,
    record_date: dateOnly(editing.record_date), diagnosis: editing.diagnosis ?? "", details: editing.details ?? "",
    treatment: editing.treatment ?? "", medication_name: editing.medication_name ?? editing.treatment ?? "",
    dose: editing.dose?.split(" ")[0] ?? "", dosage_unit: editing.dose?.split(" ").slice(1).join(" ") || "ml",
    administration_route: editing.administration_route ?? "", treatment_end_date: editing.treatment_end_date ? dateOnly(editing.treatment_end_date) : "",
    withdrawal_required: editing.withdrawal_end_date ? "yes" : "no", withdrawal_end_date: editing.withdrawal_end_date ? dateOnly(editing.withdrawal_end_date) : "",
    next_due_date: editing.next_due_date ? dateOnly(editing.next_due_date) : "", veterinarian: editing.veterinarian ?? "",
    follow_up_date: editing.follow_up_date ? dateOnly(editing.follow_up_date) : "", status: editing.status,
  } : { ...empty, livestock_id: initialLivestockId, record_type: initialRecordType });
  const [batch, setBatch] = useState(false), [batchIds, setBatchIds] = useState<string[]>([]);
  const [search, setSearch] = useState(""), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const [treatmentNames, setTreatmentNames] = useState(fallbackTreatmentNames);
  useEffect(() => { fetch("/api/treatment-products").then((r) => r.ok ? r.json() : Promise.reject()).then((products: { treatment_type: string; name: string }[]) => setTreatmentNames(products.reduce<Record<string, string[]>>((catalog, product) => { (catalog[product.treatment_type] ??= []).push(product.name); return catalog; }, {}))).catch(() => undefined); }, []);
  const field = (name: keyof typeof empty, value: string) => setForm((current) => ({ ...current, [name]: value }));
  const selectedAnimal = animals.find((animal) => String(animal.id) === form.livestock_id);
  const matches = useMemo(() => search.trim() ? animals.filter((animal) => String(animal.id) === form.livestock_id || `${animal.tag_number} ${animal.name ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8) : [], [animals, form.livestock_id, search]);
  const restriction = restrictions.find((record) => String(record.livestock_id) === form.livestock_id && ((record.status === "open" && record.record_type === "antibiotics") || !!(record.withdrawal_end_date && dateOnly(record.withdrawal_end_date) >= today())));
  const applyProtocol = (recordType: string, recordDate = form.record_date) => { const protocol = protocols[recordType as keyof typeof protocols]; setForm((current) => ({ ...current, record_type: recordType, record_date: recordDate, medication_name: "", repeat_days: protocol && "nextDays" in protocol ? String(protocol.nextDays) : "", next_due_date: protocol && "nextDays" in protocol ? addDays(recordDate, protocol.nextDays) : "", withdrawal_required: protocol && "withdrawalDays" in protocol ? "yes" : "", withdrawal_end_date: protocol && "withdrawalDays" in protocol ? addDays(recordDate, protocol.withdrawalDays) : "", follow_up_date: protocol && "followUpDays" in protocol ? addDays(recordDate, protocol.followUpDays) : "" })); };
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setError(""); const count = batch && !editing ? batchIds.length : 1; const payload = { ...form, livestock_ids: batch && !editing ? batchIds : undefined, treatment: form.medication_name, dose: `${form.dose} ${form.dosage_unit}`.trim(), treatment_start_date: form.record_date, next_due_date: form.repeat_days ? addDays(form.record_date, Number(form.repeat_days)) : form.next_due_date, withdrawal_required: form.withdrawal_required === "yes" }; try { const response = await fetch(editing ? `/api/health/${editing.id}` : "/api/health", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const body = response.status === 204 ? null : await response.json(); if (!response.ok) throw new Error(body?.error ?? "Save failed"); await onSaved(editing ? "Health record updated successfully." : count > 1 ? `Treatment recorded for ${count} cattle.` : "Health record added successfully."); } catch (cause) { const message = cause instanceof Error ? cause.message : "Save failed"; setError(message); onError?.(message); } finally { setSaving(false); } }
  return <div className="cattle-modal-backdrop treatment-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="cattle-modal treatment-modal" role="dialog" aria-modal="true" aria-labelledby="treatment-form-title"><header><div><span className="cattle-eyebrow">Health treatment</span><h2 id="treatment-form-title">{editing ? "Edit treatment" : "Record health treatment"}</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={onClose}><X size={18}/></button></header><form onSubmit={submit}>
    {error && <p role="alert" className="cattle-error health-form-wide">{error}</p>}
    {allowBatch && !editing && !lockedLivestock && <label className="batch-toggle health-form-wide"><input type="checkbox" checked={batch} onChange={(event) => { setBatch(event.target.checked); setBatchIds([]); }}/><span><strong>Enable Batch Recording (Multiple Animals)</strong><small>Record same treatment for multiple animals at once</small></span></label>}
    <div className="field health-form-wide"><label htmlFor="livestock-search">{batch ? "Livestock *" : "Livestock ID *"}</label><input id="livestock-search" type="search" placeholder="Search by tag ID or animal name" value={lockedLivestock || (!batch && selectedAnimal) ? selectedAnimal?.tag_number ?? "" : search} disabled={lockedLivestock} onChange={(event) => { if (!batch) field("livestock_id", ""); setSearch(event.target.value); }} autoComplete="off"/>{selectedAnimal && !batch && <strong>Selected: {selectedAnimal.tag_number}{selectedAnimal.name ? ` — ${selectedAnimal.name}` : ""}</strong>}{restriction && <div className="treatment-notice" role="alert"><strong>{selectedAnimal?.tag_number}: medicine restriction active</strong><p>No sale, slaughter, meat, or milk clearance while restriction remains active.</p></div>}{!lockedLivestock && <div className="animal-picker" role={batch ? "group" : "listbox"}>{matches.length ? matches.map((animal) => batch ? <label key={animal.id}><input type="checkbox" checked={batchIds.includes(String(animal.id))} onChange={(event) => setBatchIds((current) => event.target.checked ? [...current, String(animal.id)] : current.filter((id) => id !== String(animal.id)))}/><span>{animal.tag_number}{animal.name ? ` — ${animal.name}` : ""}</span></label> : <button key={animal.id} type="button" role="option" aria-selected={form.livestock_id === String(animal.id)} onClick={() => { field("livestock_id", String(animal.id)); setSearch(animal.tag_number); }}>{animal.tag_number}{animal.name ? ` — ${animal.name}` : ""}</button>) : <span className="muted">Search livestock</span>}</div>}</div>
    <label className="field">Treatment Type *<select required value={form.record_type} onChange={(event) => applyProtocol(event.target.value)}><option value="">Select treatment type</option><option value="checkup">Checkup</option><option value="vaccination">Vaccine</option><option value="vitamins">Vitamins</option><option value="antibiotics">Antibiotics</option><option value="anti_inflammatory">Anti-Inflammatory</option><option value="dewormer">Dewormer</option></select></label>
    <label className="field">Treatment Name *<input className="treatment-name-input" required list="treatment-name-suggestions" disabled={!form.record_type} placeholder="Type or select treatment name" value={form.medication_name} onChange={(event) => field("medication_name", event.target.value)}/><datalist id="treatment-name-suggestions">{(treatmentNames[form.record_type] ?? []).map((name) => <option key={name} value={name}/>)}</datalist></label>
    <label className="field">Dosage *<span className="dose-field"><input required type="number" min="0" step="any" value={form.dose} onChange={(event) => field("dose", event.target.value)}/><select aria-label="Dosage unit" value={form.dosage_unit} onChange={(event) => field("dosage_unit", event.target.value)}>{["ml", "cc", "mg", "g", "IU"].map((unit) => <option key={unit}>{unit}</option>)}</select></span></label>
    <label className="field">Route of Administration *<select required value={form.administration_route} onChange={(event) => field("administration_route", event.target.value)}><option value="">Select route</option>{[["Intramuscular (IM)", "IM"], ["Subcutaneous (SC)", "SC"], ["Intravenous (IV)", "IV"], ["Oral", "Oral"], ["Topical", "Topical"], ["Nasal", "Nasal"]].map(([label, value]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="field">Date Administered *<input required type="date" value={form.record_date} onChange={(event) => form.record_type in protocols ? applyProtocol(form.record_type, event.target.value) : field("record_date", event.target.value)}/></label>
    <label className="field">Administered By *<input required value={form.veterinarian} onChange={(event) => field("veterinarian", event.target.value)}/></label>
    {form.record_type && <section className={`treatment-protocol-card health-form-wide protocol-${form.record_type}`} role="status"><div className="treatment-protocol-icon"><CalendarDays size={20}/></div><div className="treatment-protocol-copy"><strong>{form.record_type.replaceAll("_", " ")} protocol</strong>{form.next_due_date && <small>Next treatment: {formatDate(form.next_due_date)}</small>}{form.follow_up_date && <small>Checkup: {formatDate(form.follow_up_date)}</small>}{form.withdrawal_end_date && <small>Withdrawal ends: {formatDate(form.withdrawal_end_date)}</small>}</div></section>}
    {(form.record_type === "vitamins" || form.record_type === "dewormer") && <label className="field">Next Due Date<input type="date" min={form.record_type === "dewormer" ? addDays(form.record_date, 90) : undefined} max={form.record_type === "dewormer" ? addDays(form.record_date, 183) : undefined} readOnly={form.record_type === "vitamins"} value={form.next_due_date} onChange={(event) => field("next_due_date", event.target.value)}/></label>}
    {(form.record_type === "antibiotics" || form.record_type === "anti_inflammatory") && <><label className="field">Withdrawal Ends<input type="date" min={form.record_date} value={form.withdrawal_end_date} onChange={(event) => field("withdrawal_end_date", event.target.value)}/></label><label className="field">Required Checkup<input type="date" min={form.record_date} value={form.follow_up_date} onChange={(event) => field("follow_up_date", event.target.value)}/></label></>}
    <label className="field health-form-wide">Notes / Observations<textarea value={form.details} onChange={(event) => field("details", event.target.value)}/></label><footer className="health-form-wide"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={saving || (batch ? !batchIds.length : !form.livestock_id)}>{saving ? "Saving…" : editing ? "Save treatment" : `Record treatment${batch && batchIds.length ? ` for ${batchIds.length} animals` : ""}`}</button></footer>
  </form></section></div>;
}
