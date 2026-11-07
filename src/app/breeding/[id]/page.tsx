"use client";

import { use, useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, CalendarClock, CalendarDays, Check, CircleHelp, LockKeyhole, Printer, X } from "lucide-react";
import Link from "next/link";
import SuccessModal from "@/components/ui/success-modal";

type RecordItem = { id: number; livestock_id: number; tag_number: string; livestock_name: string | null; dam_breed: string; sire_tag_number: string | null; sire_name: string | null; sire_breed: string | null; event_type: string; event_date: string; pregnancy_status: string | null; expected_calving_date: string | null; pregnancy_check_due_date: string; details: string | null; performed_by: string | null; added_by: string | null };
type Related = { id: number; event_type: string; event_date: string; pregnancy_status: string | null; source_service_id: number | null; details: string | null; performed_by: string | null };
type Data = { record: RecordItem; related: Related[] };

const labels: Record<string, string> = { natural_service: "Natural breeding", artificial_insemination: "Artificial insemination", heat_observed: "Heat observed", pregnancy_check: "Pregnancy check", pregnancy_confirmed: "Pregnancy confirmed", pregnancy_negative: "Not pregnant", pregnancy_loss: "Pregnancy loss", calving: "Calving", breeding_soundness_exam: "Breeding soundness exam" };
const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`)) : "Not available";
const daysUntil = (value: string) => Math.ceil((Date.parse(`${value}T00:00:00Z`) - Date.parse(`${today()}T00:00:00Z`)) / 86_400_000);

export default function BreedingRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ message: string; href: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [confirmedBy, setConfirmedBy] = useState("");
  const load = useCallback(async () => { const response = await fetch(`/api/breeding/${id}`, { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Breeding record could not load"); setData(body); }, [id]);
  useEffect(() => { queueMicrotask(() => load().catch((reason) => setError(reason instanceof Error ? reason.message : "Breeding record could not load"))); }, [load]);

  async function recordOutcome(confirmed: boolean) {
    if (!data) return;
    if (!outcomeNotes.trim() || !confirmedBy.trim()) { setError("Notes and confirmed by are required"); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/livestock/${data.record.livestock_id}/breeding`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event_type: confirmed ? "pregnancy_confirmed" : "pregnancy_negative", event_date: today(), source_service_id: data.record.id, details: `${confirmed ? "Confirmed" : "Negative check"} from breeding session ${data.record.id}\nNotes: ${outcomeNotes.trim()}`, performed_by: confirmedBy.trim() }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Pregnancy outcome could not be saved");
      await load();
      setSuccess(confirmed
        ? { message: `Pregnancy confirmed for ${data.record.tag_number}. This breeding session is completed, the dam now appears under Active pregnancies, and expected calving tracking is available in her pregnancy profile.`, href: `/pregnancy/${body.id}` }
        : { message: "Negative check recorded. This breeding session is completed and the dam returned to breeding monitoring.", href: "/breeding" });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Pregnancy outcome could not be saved"); }
    finally { setSaving(false); }
  }

  if (error && !data) return <div className="breeding-record-page"><Link href="/breeding" className="secondary-button"><ArrowLeft size={16}/> Back to breeding</Link><p role="alert" className="cattle-error">{error}</p></div>;
  if (!data) return <p>Loading breeding record…</p>;
  const { record, related } = data;
  const serviceIndex = related.findIndex((item) => item.id === record.id);
  const outcome = related.find((item) => String(item.source_service_id) === String(record.id));
  const resolved = Boolean(outcome);
  const outcomeLabel = outcome ? labels[outcome.event_type] || outcome.event_type : "";
  const due = record.pregnancy_check_due_date <= today();
  const details: Record<string, string> = Object.fromEntries((record.details || "").split("\n").map((line) => { const separator = line.indexOf(":"); return separator < 0 ? ["Notes", line] : [line.slice(0, separator), line.slice(separator + 1).trim()]; }).filter(([, value]) => value && !["Not recorded", "None"].includes(value)));
  const remaining = daysUntil(record.pregnancy_check_due_date);

  return <div className="breeding-record-page">
    {success && <SuccessModal message={success.message} onClose={() => setSuccess(null)} action={{ href: success.href, label: success.href.startsWith("/pregnancy/") ? "View pregnancy profile" : "View breeding records" }}/>} 
    <header className="breeding-detail-header"><div><Link href="/breeding" className="breeding-back"><ArrowLeft size={16}/> Breeding records</Link><span className="cattle-eyebrow">Breeding session #{record.id}</span><h1>{record.tag_number} × {record.sire_tag_number || "Unregistered sire"}</h1><div className="breeding-detail-meta"><strong>{labels[record.event_type] || record.event_type}</strong><span>{formatDate(record.event_date)}</span><span>{record.performed_by || record.added_by || "Handler not recorded"}</span></div></div><div className="breeding-detail-actions"><span className={resolved ? "breeding-resolved" : due ? "breeding-alert" : "breeding-waiting"}>{resolved ? <><Check size={13}/> {outcomeLabel}</> : due ? <><AlertTriangle size={13}/> Check due</> : "Awaiting check"}</span><button type="button" className="secondary-button print-record-button" onClick={() => window.print()}><Printer size={16}/> Print / Save PDF</button></div></header>

    {error && <p role="alert" className="cattle-error">{error}</p>}
    <section className="breeding-session-summary"><header><h2>Breeding pair</h2><Help text="Dam and sire recorded for this breeding session."/></header><div className="cattle-table-wrap"><table className="cattle-table breeding-pair-table"><thead><tr><th>Role</th><th>Cattle ID</th><th>Name</th><th>Breed</th><th><span className="sr-only">Profile</span></th></tr></thead><tbody><tr><td><span className="breeding-role dam">Dam</span></td><td><strong>{record.tag_number}</strong></td><td>{record.livestock_name || "Unnamed"}</td><td>{record.dam_breed}</td><td><Link href={`/livestock/${record.livestock_id}`} data-tooltip="Open dam cattle profile">View profile</Link></td></tr><tr><td><span className="breeding-role sire">Sire</span></td><td><strong>{record.sire_tag_number || "Not recorded"}</strong></td><td>{record.sire_name || "Unnamed"}</td><td>{record.sire_breed || "Not recorded"}</td><td>—</td></tr></tbody></table></div></section>

    <section className={`breeding-milestone breeding-milestone-simple ${due && !resolved ? "is-due" : ""}`}><div className="breeding-milestone-copy"><span className="cattle-eyebrow"><CalendarClock size={15}/> Pregnancy check <Help text="Pregnancy outcome can be recorded from day 45 after service."/></span><h2>{resolved ? outcomeLabel : due ? "Pregnancy check is due" : `${remaining} day${remaining === 1 ? "" : "s"} remaining`}</h2><div className="breeding-date-strip"><span><small>Service</small><strong>{formatDate(record.event_date)}</strong></span><span><small>Check from</small><strong>{formatDate(record.pregnancy_check_due_date)}</strong></span><span><small>Expected calving</small><strong>{formatDate(record.expected_calving_date)}</strong></span></div>{resolved && <p>Recorded <strong>{formatDate(outcome?.event_date)}</strong>{outcome?.performed_by && <> by <strong>{outcome.performed_by}</strong></>}</p>}{!resolved && (due ? <div className="pregnancy-outcome-form"><label className="field">Notes<textarea required value={outcomeNotes} onChange={(event) => setOutcomeNotes(event.target.value)} placeholder="Check method, findings, and observations"/></label><label className="field">Confirmed by<input required value={confirmedBy} onChange={(event) => setConfirmedBy(event.target.value)} placeholder="Veterinarian or authorized staff"/></label><div className="breeding-milestone-actions"><button type="button" className="primary-button" disabled={saving} onClick={() => recordOutcome(true)}><Check size={15}/> Confirm pregnant</button><button type="button" className="secondary-button" disabled={saving} onClick={() => recordOutcome(false)}><X size={15}/> Not pregnant</button><small>Notes and confirmer name are required before saving.</small></div></div> : <div className="pregnancy-outcome-lock"><div className="pregnancy-lock-icon"><LockKeyhole size={20}/></div><div><span>Outcome locked</span><strong>Available {formatDate(record.pregnancy_check_due_date)}</strong></div><b>{remaining}<small>days left</small></b></div>)}</div><MiniCalendar serviceDate={record.event_date} checkDate={record.pregnancy_check_due_date} calvingDate={record.expected_calving_date}/></section>

    <section className="breeding-detail-section breeding-record-table-section"><header><span className="cattle-eyebrow">Record details</span><h2>{record.event_type === "artificial_insemination" ? "Insemination details" : "Service details"}</h2></header><div className="cattle-table-wrap"><table className="cattle-table breeding-details-table"><tbody>{Object.entries(details).map(([key, value]) => <tr key={key}><th scope="row">{key}</th><td>{value}</td></tr>)}<tr><th scope="row">Handler / observer</th><td>{record.performed_by || "Not recorded"}</td></tr><tr><th scope="row">Added by</th><td>{record.added_by || "Not recorded"}</td></tr></tbody></table></div></section>

    <section className="breeding-detail-section breeding-record-table-section"><header><span className="cattle-eyebrow">Reproductive history</span><h2>Related records <Help text="Newest reproductive events for this dam. Current marks this session."/></h2></header><div className="cattle-table-wrap"><table className="cattle-table breeding-history-table"><thead><tr><th>Date</th><th>Event</th><th>Recorded by</th><th>Status</th></tr></thead><tbody>{related.map((item) => { const status = item.id === record.id ? "current" : item.pregnancy_status; return <tr key={item.id} className={item.id === record.id ? "current" : ""}><td><time>{formatDate(item.event_date)}</time></td><td><strong>{labels[item.event_type] || item.event_type}</strong></td><td>{item.performed_by || <span className="breeding-table-muted">Not recorded</span>}</td><td>{status ? <span className={`breeding-history-status ${status}`}>{status.replaceAll("_", " ")}</span> : <span className="breeding-table-muted">Not applicable</span>}</td></tr>; })}</tbody></table></div></section>
  </div>;
}

function Help({ text }: { text: string }) { return <span className="breeding-detail-help" role="img" tabIndex={0} aria-label={text} data-tooltip={text}><CircleHelp size={14}/></span>; }

function MiniCalendar({ serviceDate, checkDate, calvingDate }: { serviceDate: string; checkDate: string; calvingDate: string | null }) {
  const focus = new Date(`${checkDate.slice(0, 10)}T00:00:00Z`), year = focus.getUTCFullYear(), month = focus.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay(), count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const dates = { service: serviceDate.slice(0, 10), check: checkDate.slice(0, 10), calving: calvingDate?.slice(0, 10) };
  return <div className="breeding-mini-calendar breeding-check-calendar"><header><CalendarDays size={16}/><strong>{new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(focus)}</strong></header><div className="calendar-weekdays">{"SMTWTFS".split("").map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="calendar-days">{Array.from({ length: firstDay }, (_, index) => <span key={`blank-${index}`}/>)}{Array.from({ length: count }, (_, index) => { const day = index + 1, value = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`, kind = value === dates.check ? "check" : value === dates.service ? "service" : value === dates.calving ? "calving" : ""; return <span key={day} className={kind} title={kind ? `${kind[0].toUpperCase()}${kind.slice(1)} date` : undefined}>{day}</span>; })}</div><footer><span><i className="service"/> Service</span><span><i className="check"/> Check date</span>{calvingDate && <span><i className="calving"/> Calving</span>}</footer></div>;
}
