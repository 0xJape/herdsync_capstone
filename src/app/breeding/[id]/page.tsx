"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CalendarClock, CalendarDays, Check, CircleHelp, LockKeyhole, Printer, X } from "lucide-react";
import Link from "next/link";
import SuccessModal from "@/components/ui/success-modal";
import { safeReturnPath } from "@/lib/return-path";

type RecordItem = { id: number; livestock_id: number; tag_number: string; livestock_name: string | null; dam_breed: string; sire_id: number | null; sire_tag_number: string | null; sire_name: string | null; sire_breed: string | null; event_type: string; event_date: string; pregnancy_status: string | null; expected_calving_date: string | null; pregnancy_check_due_date: string; details: string | null; performed_by: string | null; added_by: string | null; photo_urls: string[] };
type Related = { id: number; event_type: string; event_date: string; pregnancy_status: string | null; source_service_id: number | null; details: string | null; performed_by: string | null };
type Data = { record: RecordItem; related: Related[] };

const labels: Record<string, string> = { natural_service: "Natural breeding", artificial_insemination: "Artificial insemination", heat_observed: "Heat observed", pregnancy_check: "Pregnancy check", pregnancy_confirmed: "Pregnancy confirmed", pregnancy_negative: "Not pregnant", pregnancy_loss: "Pregnancy loss", calving: "Calving", breeding_soundness_exam: "Breeding soundness exam" };
const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`)) : "Not available";
const daysUntil = (value: string) => Math.ceil((Date.parse(`${value}T00:00:00Z`) - Date.parse(`${today()}T00:00:00Z`)) / 86_400_000);

export default function BreedingRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const returnTo = safeReturnPath(searchParams.get("returnTo"), "/breeding"); // Use originating route in review header back link
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ message: string; href: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [confirmedBy, setConfirmedBy] = useState("");
  const [pendingOutcome, setPendingOutcome] = useState<boolean | null>(null);
  const [viewPhoto, setViewPhoto] = useState<number | null>(null);
  const [photoSwipeStart, setPhotoSwipeStart] = useState<number | null>(null);
  const load = useCallback(async () => { const response = await fetch(`/api/breeding/${id}`, { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Breeding record could not load"); setData(body); }, [id]);
  useEffect(() => { queueMicrotask(() => load().catch((reason) => setError(reason instanceof Error ? reason.message : "Breeding record could not load"))); }, [load]);
  useEffect(() => {
    const notes = document.querySelector<HTMLTextAreaElement>(".pregnancy-outcome-form textarea");
    if (!notes) return;
    notes.maxLength = 50;
    const label = notes.closest("label");
    if (label?.firstChild?.nodeType === Node.TEXT_NODE) label.firstChild.textContent = "Notes (50 characters max)";
  }, [data]);

  async function recordOutcome(confirmed: boolean) {
    if (!data) return;
    if (pendingOutcome === null) {
      requestOutcome(confirmed);
      return;
    }
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

  function requestOutcome(confirmed: boolean) {
    if (!outcomeNotes.trim() || !confirmedBy.trim()) { setError("Notes and confirmed by are required"); return; }
    setError(""); setPendingOutcome(confirmed);
  }

  if (error && !data) return <div className="breeding-record-page"><Link href={returnTo} className="secondary-button"><ArrowLeft size={16}/> Back to breeding</Link><p role="alert" className="cattle-error">{error}</p></div>;
  if (!data) return <p>Loading breeding record…</p>;
  const { record, related } = data;
  const outcome = related.find((item) => String(item.source_service_id) === String(record.id));
  const resolved = Boolean(outcome);
  const unsuccessful = outcome?.event_type === "pregnancy_negative";
  const outcomeLabel = outcome ? labels[outcome.event_type] || outcome.event_type : "";
  const due = record.pregnancy_check_due_date <= today();
  const details: Record<string, string> = Object.fromEntries((record.details || "").split("\n").map((line) => { const separator = line.indexOf(":"); return separator < 0 ? ["Notes", line] : [line.slice(0, separator), line.slice(separator + 1).trim()]; }).filter(([, value]) => value && !["Not recorded", "None"].includes(value)));
  const remaining = daysUntil(record.pregnancy_check_due_date);

  return <div className="breeding-record-page">
    {success && <SuccessModal message={success.message} onClose={() => setSuccess(null)} action={{ href: success.href, label: success.href.startsWith("/pregnancy/") ? "View pregnancy profile" : "View breeding records" }}/>} 
    {pendingOutcome !== null && <div className="cattle-modal-backdrop reproduction-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setPendingOutcome(null); }}><section className={`cattle-modal reproduction-confirm-modal ${pendingOutcome ? "is-positive" : "is-negative"}`} role="alertdialog" aria-modal="true" aria-labelledby="outcome-confirm-title"><div className="reproduction-confirm-icon">{pendingOutcome ? <Check size={24}/> : <X size={24}/>}</div><header><span className="cattle-eyebrow">Final confirmation</span><h2 id="outcome-confirm-title">Record as {pendingOutcome ? "pregnant" : "not pregnant"}?</h2><p>This completes breeding session #{record.id} for <strong>{record.tag_number}</strong>. Outcome cannot be edited from this screen.</p></header><div className="reproduction-confirm-summary"><div><span>Findings</span><p>{outcomeNotes}</p></div><div><span>Confirmed by</span><strong>{confirmedBy}</strong></div></div>{error && <p role="alert" className="cattle-error">{error}</p>}<footer><button type="button" className="secondary-button" disabled={saving} onClick={() => setPendingOutcome(null)}>Go back</button><button type="button" className={pendingOutcome ? "primary-button" : "danger-button"} disabled={saving} onClick={() => recordOutcome(pendingOutcome)}>{saving ? "Saving…" : `Yes, record ${pendingOutcome ? "pregnant" : "not pregnant"}`}</button></footer></section></div>}
    <header className="breeding-detail-header"><div><Link href={returnTo} className="breeding-back"><ArrowLeft size={16}/> Breeding records</Link><span className="cattle-eyebrow">Breeding session #{record.id}</span><h1>{record.tag_number} × {record.sire_tag_number || "Unregistered sire"}</h1></div><div className="breeding-detail-actions"><span className={`${resolved ? "breeding-resolved" : due ? "breeding-alert" : "breeding-waiting"}${unsuccessful ? " breeding-unsuccessful" : ""}`}>{resolved ? <>{outcome?.event_type === "pregnancy_negative" ? <X size={13}/> : <Check size={13}/>} {outcomeLabel}</> : due ? <><AlertTriangle size={13}/> Check due</> : "Awaiting check"}</span><button type="button" className="secondary-button print-record-button" onClick={() => window.print()}><Printer size={16}/> Print / Save PDF</button></div></header>

    {error && <p role="alert" className="cattle-error">{error}</p>}
    <section className="breeding-record-photo-panel">{record.photo_urls?.length ? <div className="breeding-record-photo-carousel"><button type="button" className="breeding-record-photo-open" onClick={() => setViewPhoto(0)} onTouchStart={(event) => setPhotoSwipeStart(event.changedTouches[0].clientX)} onTouchEnd={(event) => { if (photoSwipeStart === null || record.photo_urls.length < 2) return; const delta = event.changedTouches[0].clientX - photoSwipeStart; if (Math.abs(delta) > 40) setViewPhoto((current) => (current === null ? 0 : (current + (delta < 0 ? 1 : -1) + record.photo_urls.length) % record.photo_urls.length)); setPhotoSwipeStart(null); }} aria-label="Open breeding photos"><img src={record.photo_urls[0]} alt={`Breeding session ${record.id}, photo 1`}/></button>{record.photo_urls.length > 1 && <div className="breeding-record-photo-dots">{record.photo_urls.map((_, index) => <span key={index} className={index === 0 ? "active" : ""}/>)}</div>}</div> : <div aria-label="No breeding photo"><span>🐄</span><strong>No photo added</strong></div>}</section>
    {viewPhoto !== null && <div className="breeding-photo-lightbox" role="dialog" aria-modal="true" aria-label="Breeding photo viewer" onMouseDown={(event) => event.target === event.currentTarget && setViewPhoto(null)}><button type="button" className="breeding-photo-lightbox-close" aria-label="Close photo" onClick={() => setViewPhoto(null)}><X size={22}/></button><div className="breeding-photo-lightbox-stage" onTouchStart={(event) => setPhotoSwipeStart(event.changedTouches[0].clientX)} onTouchEnd={(event) => { if (photoSwipeStart === null || record.photo_urls.length < 2) return; const delta = event.changedTouches[0].clientX - photoSwipeStart; if (Math.abs(delta) > 40) setViewPhoto((current) => (current === null ? 0 : (current + (delta < 0 ? 1 : -1) + record.photo_urls.length) % record.photo_urls.length)); setPhotoSwipeStart(null); }}><img src={record.photo_urls[viewPhoto]} alt={`Breeding session ${record.id}, photo ${viewPhoto + 1}`}/></div>{record.photo_urls.length > 1 && <footer><span>Swipe or use arrows · {viewPhoto + 1} / {record.photo_urls.length}</span><button type="button" onClick={() => setViewPhoto((current) => (current === null ? 0 : (current - 1 + record.photo_urls.length) % record.photo_urls.length))}>Previous</button><button type="button" onClick={() => setViewPhoto((current) => (current === null ? 0 : (current + 1) % record.photo_urls.length))}>Next</button></footer>}</div>}
    <section className="breeding-session-summary breeding-record-pair"><header><h2>Breeding pair</h2><Help text="Dam and sire recorded for this breeding session."/></header><div className="breeding-cattle-sections"><div className="breeding-cattle-selector dam"><div className="breeding-selector-trigger breeding-selector-locked"><span><small>Selected dam</small><strong>{record.tag_number} - {record.livestock_name || record.dam_breed}</strong><em>{record.dam_breed}</em></span><Link href={`/livestock/${record.livestock_id}`} data-tooltip="Open dam cattle profile">View profile</Link></div></div><div className="breeding-cattle-selector sire"><div className="breeding-selector-trigger breeding-selector-locked"><span><small>Selected sire</small><strong>{record.sire_tag_number || "Not recorded"} - {record.sire_name || record.sire_breed || "Unnamed"}</strong><em>{record.sire_breed || "Breed not recorded"}</em></span>{record.sire_id && <Link href={`/livestock/${record.sire_id}`} data-tooltip="Open sire cattle profile">View profile</Link>}</div></div></div><div className="breeding-pair-meta"><span><small>Breeding method</small><strong>{labels[record.event_type] || record.event_type}</strong></span><span><small>Service date</small><strong>{formatDate(record.event_date)}</strong></span><span><small>Handler / observer</small><strong>{record.performed_by || record.added_by || "Not recorded"}</strong></span></div></section>

    <section className={`breeding-milestone breeding-milestone-simple ${due && !resolved ? "is-due" : ""}`}><div className="breeding-milestone-copy"><span className="cattle-eyebrow"><CalendarClock size={15}/> Pregnancy check <Help text="Pregnancy outcome can be recorded from day 45 after service."/></span><h2>{resolved ? outcome?.event_type === "pregnancy_negative" ? "Breeding unsuccessful" : outcomeLabel : due ? "Pregnancy check is due" : `${remaining} day${remaining === 1 ? "" : "s"} remaining`}</h2><div className="breeding-date-strip"><span><small>Service</small><strong>{formatDate(record.event_date)}</strong></span><span><small>Check from</small><strong>{formatDate(record.pregnancy_check_due_date)}</strong></span><span><small>Expected calving</small><strong>{formatDate(record.expected_calving_date)}</strong></span></div>{resolved && <p>Recorded <strong>{formatDate(outcome?.event_date)}</strong>{outcome?.performed_by && <> by <strong>{outcome.performed_by}</strong></>}</p>}{!resolved && (due ? <div className="pregnancy-outcome-form"><label className="field">Notes<textarea required value={outcomeNotes} onChange={(event) => setOutcomeNotes(event.target.value)} placeholder="Check method, findings, and observations"/></label><label className="field">Confirmed by<input required value={confirmedBy} onChange={(event) => setConfirmedBy(event.target.value)} placeholder="Veterinarian or authorized staff"/></label><div className="breeding-milestone-actions"><button type="button" className="primary-button" disabled={saving} onClick={() => recordOutcome(true)}><Check size={15}/> Confirm pregnant</button><button type="button" className="secondary-button" disabled={saving} onClick={() => recordOutcome(false)}><X size={15}/> Not pregnant</button><small>Notes and confirmer name are required before saving.</small></div></div> : <div className="pregnancy-outcome-lock"><div className="pregnancy-lock-icon"><LockKeyhole size={20}/></div><div><span>Outcome locked</span><strong>Available {formatDate(record.pregnancy_check_due_date)}</strong></div><b>{remaining}<small>days left</small></b></div>)}</div><MiniCalendar serviceDate={record.event_date} checkDate={record.pregnancy_check_due_date} calvingDate={record.expected_calving_date}/></section>

    <section className="breeding-detail-section breeding-record-table-section breeding-service-details"><header><span className="cattle-eyebrow">Record details</span><h2>{record.event_type === "artificial_insemination" ? "Insemination details" : "Service details"}</h2></header><div className="cattle-table-wrap"><table className="cattle-table breeding-details-table"><tbody>{Object.entries(details).map(([key, value]) => <tr key={key}><th scope="row">{key}</th><td>{value}</td></tr>)}<tr><th scope="row">Handler / observer</th><td>{record.performed_by || "Not recorded"}</td></tr><tr><th scope="row">Added by</th><td>{record.added_by || "Not recorded"}</td></tr></tbody></table></div></section>

    <section className="breeding-detail-section breeding-record-table-section breeding-related-records"><header><span className="cattle-eyebrow">Reproductive history</span><h2>Related records <Help text="Newest breeding events for this dam. Current marks this session."/></h2></header><div className="cattle-table-wrap"><table className="cattle-table breeding-history-table"><thead><tr><th>Date</th><th>Event</th><th>Recorded by</th><th>Status</th></tr></thead><tbody>{related.filter((item) => item.event_type !== "heat_observed").map((item) => { const status = item.id === record.id ? "current" : item.pregnancy_status; return <tr key={item.id} className={item.id === record.id ? "current" : ""}><td><time>{formatDate(item.event_date)}</time></td><td><strong>{labels[item.event_type] || item.event_type}</strong></td><td>{item.performed_by || <span className="breeding-table-muted">Not recorded</span>}</td><td>{status ? <span className={`breeding-history-status ${status}`}>{status.replaceAll("_", " ")}</span> : <span className="breeding-table-muted">Not applicable</span>}</td></tr>; })}</tbody></table></div></section>
  </div>;
}

function Help({ text }: { text: string }) { return <span className="breeding-detail-help" role="img" tabIndex={0} aria-label={text} data-tooltip={text}><CircleHelp size={14}/></span>; }

function MiniCalendar({ serviceDate, checkDate, calvingDate }: { serviceDate: string; checkDate: string; calvingDate: string | null }) {
  const focus = new Date(`${checkDate.slice(0, 10)}T00:00:00Z`), year = focus.getUTCFullYear(), month = focus.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay(), count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const dates = { service: serviceDate.slice(0, 10), check: checkDate.slice(0, 10), calving: calvingDate?.slice(0, 10) };
  return <div className="breeding-mini-calendar breeding-check-calendar"><header><CalendarDays size={16}/><strong>{new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(focus)}</strong></header><div className="calendar-weekdays">{"SMTWTFS".split("").map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="calendar-days">{Array.from({ length: firstDay }, (_, index) => <span key={`blank-${index}`}/>)}{Array.from({ length: count }, (_, index) => { const day = index + 1, value = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`, kind = value === dates.check ? "check" : value === dates.service ? "service" : value === dates.calving ? "calving" : ""; return <span key={day} className={kind} title={kind ? `${kind[0].toUpperCase()}${kind.slice(1)} date` : undefined}>{day}</span>; })}</div><footer><span><i className="service"/> Service</span><span><i className="check"/> Check date</span>{calvingDate && <span><i className="calving"/> Calving</span>}</footer></div>;
}

