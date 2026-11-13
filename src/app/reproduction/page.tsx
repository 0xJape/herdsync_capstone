"use client";

import { Fragment, Suspense, useCallback, useDeferredValue, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import BreedingPage from "@/app/breeding/page";
import BreedingWorkspace from "@/app/breeding/breeding-workspace";

type Summary = { pregnancies: number; checksDue: number; nearCalving: number; careDue: number };
type PregnancyCheck = { livestock_id: number; tag_number: string; name: string | null; breeding_date: string; check_date: string; expected_calving_date: string; source_event_id: number; result: string | null; check_status: "completed" | "not_yet_available" | "overdue" | "due" };
type Pregnancy = { livestock_id: number; pregnancy_id: number; tag_number: string; name: string | null; breed: string; expected_calving_date: string; days_pregnant: number; key: string; label: string };
type PregnancyDetail = { pregnancy: (Pregnancy & { confirmation_id: number; birth_date: string; health_status: string; body_condition_score: string | null; current_weight_kg: string; sire_id: number | null; sire_tag_number: string | null; sire_name: string | null; sire_breed: string | null; conception_date: string; next_checkup_date: string | null; checkup_due: boolean; checkup_overdue: boolean; key: string; label: string; guidance: string }) | null; checkups: { id: number; checkup_date: string; health_status: string; body_condition_score: string; weight_kg: string; veterinarian: string }[] };
type BreedingDetail = { record: { id: number; livestock_id: number; tag_number: string; livestock_name: string | null; dam_breed: string; sire_tag_number: string | null; sire_name: string | null; sire_breed: string | null; event_type: string; event_date: string; pregnancy_status: string | null; expected_calving_date: string | null; pregnancy_check_due_date: string; details: string | null; performed_by: string | null; added_by: string | null } };
type Pagination = { page: number; total: number; hasNext: boolean };
type ListResponse<T> = { rows: T[]; pagination: Pagination; summary?: Summary };

const emptySummary: Summary = { pregnancies: 0, checksDue: 0, nearCalving: 0, careDue: 0 };
const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`)) : "Not recorded";
const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const checkStatusLabel = (value: PregnancyCheck["check_status"]) => ({ not_yet_available: "Awaiting Due", due: "Due", overdue: "Overdue", completed: "Completed" })[value];
export default function ReproductionPage() {
  return <Suspense fallback={null}><ReproductionTabs/></Suspense>;
}

function ReproductionTabs() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const tab = requestedTab === "breeding" || requestedTab === "pregnancy" || requestedTab === "calving" ? requestedTab : "overview";
  return <div className="reproduction-parent-workspace">
    <nav className="workspace-tabs" aria-label="Reproduction sections">
      <Link className={tab === "overview" ? "active" : ""} aria-current={tab === "overview" ? "page" : undefined} href="/reproduction">Overview</Link>
      <Link className={tab === "breeding" ? "active" : ""} aria-current={tab === "breeding" ? "page" : undefined} href="/reproduction?tab=breeding">Breeding History</Link>
      <Link className={tab === "pregnancy" ? "active" : ""} aria-current={tab === "pregnancy" ? "page" : undefined} href="/reproduction?tab=pregnancy">Pregnancy History</Link>
      <Link className={tab === "calving" ? "active" : ""} aria-current={tab === "calving" ? "page" : undefined} href="/reproduction?tab=calving">Calving History</Link>
    </nav>
    {tab === "overview" ? <ReproductionOverview/> : <BreedingPage mode={tab}/>} 
  </div>;
}

function ReproductionOverview() {
  const [summary, setSummary] = useState(emptySummary);
  const [checks, setChecks] = useState<PregnancyCheck[]>([]);
  const [pregnancies, setPregnancies] = useState<Pregnancy[]>([]);
  const [totals, setTotals] = useState({ checks: 0, care: 0, calvings: 0 });
    const [pages, setPages] = useState<{ checks: Pagination; pregnancies: Pagination }>({ checks: { page: 1, total: 0, hasNext: false }, pregnancies: { page: 1, total: 0, hasNext: false } });
  const [checkSearch, setCheckSearch] = useState("");
  const [pregnancySearch, setPregnancySearch] = useState("");
  const deferredCheckSearch = useDeferredValue(checkSearch);
  const deferredPregnancySearch = useDeferredValue(pregnancySearch);
  const [checkFilter, setCheckFilter] = useState("all");
  const [pregnancyFilter, setPregnancyFilter] = useState("all");
  const [checksLoading, setChecksLoading] = useState(true);
  const [pregnanciesLoading, setPregnanciesLoading] = useState(true);
  const [error, setError] = useState("");
    const [review, setReview] = useState<PregnancyCheck | null>(null);
  const [detail, setDetail] = useState<BreedingDetail | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [confirmedBy, setConfirmedBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [toastWarning, setToastWarning] = useState(false);
  const [newPregnancyLivestockId, setNewPregnancyLivestockId] = useState<number | null>(null);
  const [newBreedingRecordId, setNewBreedingRecordId] = useState<number | null>(null);
  const [breedingNotice, setBreedingNotice] = useState("");
  const [focus, setFocus] = useState<"split" | "checks" | "pregnancies">("split");
  const [workspaceView, setWorkspaceView] = useState<"checks" | "pregnancies">("checks");
  const [showAddBreeding, setShowAddBreeding] = useState(false);
  const [pregnancyDetail, setPregnancyDetail] = useState<PregnancyDetail | null>(null);
  const [pregnancyDetailLoading, setPregnancyDetailLoading] = useState(false);
  const [pregnancyDetailError, setPregnancyDetailError] = useState("");

  const loadChecks = useCallback(async (page = 1, filter = checkFilter, search = deferredCheckSearch) => {
    setChecksLoading(true); setError("");
    try {
      const response = await fetch(`/api/breeding?list=pregnancyChecks&pageSize=5&page=${page}&meta=1&search=${encodeURIComponent(search)}&pendingOnly=1&checkStatus=${filter}`, { cache: "no-store" });
      const checkData = await response.json() as ListResponse<PregnancyCheck> & { error?: string };
      if (!response.ok) throw new Error(checkData.error || "Pregnancy checks could not load");
      setChecks(checkData.rows);
      setPages((current) => ({ ...current, checks: checkData.pagination }));
      setSummary(checkData.summary ?? emptySummary);
      setTotals((current) => ({ ...current, checks: checkData.pagination.total }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Reproduction data could not load"); }
    finally { setChecksLoading(false); }
  }, [deferredCheckSearch, checkFilter]);

  const loadPregnancies = useCallback(async (page = 1) => {
    setPregnanciesLoading(true); setError("");
    try {
      const response = await fetch(`/api/breeding?list=pregnancies&pageSize=5&page=${page}&search=${encodeURIComponent(deferredPregnancySearch)}&pregnancyStatus=${pregnancyFilter}`, { cache: "no-store" });
      const pregnancyData = await response.json() as ListResponse<Pregnancy> & { error?: string };
      if (!response.ok) throw new Error(pregnancyData.error || "Active pregnancies could not load");
      setPregnancies(pregnancyData.rows);
      setPages((current) => ({ ...current, pregnancies: pregnancyData.pagination }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Reproduction data could not load"); }
    finally { setPregnanciesLoading(false); }
  }, [deferredPregnancySearch, pregnancyFilter]);

  const loadTotals = useCallback(async () => {
    const [careResponse, calvingResponse] = await Promise.all([fetch("/api/breeding?list=care&pageSize=5&page=1", { cache: "no-store" }), fetch("/api/breeding?list=calvingHistory&pageSize=5&page=1", { cache: "no-store" })]);
    if (!careResponse.ok || !calvingResponse.ok) return;
    const [careData, calvingData] = await Promise.all([careResponse.json() as Promise<ListResponse<unknown>>, calvingResponse.json() as Promise<ListResponse<unknown>>]);
    setTotals((current) => ({ ...current, care: careData.pagination.total, calvings: calvingData.pagination.total }));
  }, []);

  const load = useCallback((checkPage: number, pregnancyPage: number) => {
    if (checkPage !== pages.checks.page) return loadChecks(checkPage);
    if (pregnancyPage !== pages.pregnancies.page) return loadPregnancies(pregnancyPage);
    return Promise.resolve();
  }, [loadChecks, loadPregnancies, pages.checks.page, pages.pregnancies.page]);
  const loading = false;

  useEffect(() => { queueMicrotask(() => loadChecks()); }, [loadChecks]);
  useEffect(() => { queueMicrotask(() => loadPregnancies()); }, [loadPregnancies]);
  useEffect(() => { queueMicrotask(() => loadTotals()); }, [loadTotals]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 4200); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { const message = window.sessionStorage.getItem("herdsync:reproduction-toast"); if (!message) return; window.sessionStorage.removeItem("herdsync:reproduction-toast"); setToast(message); }, []);
  useEffect(() => { const value = window.sessionStorage.getItem("herdsync:new-breeding"); if (!value) return; window.sessionStorage.removeItem("herdsync:new-breeding"); setNewBreedingRecordId(Number(value)); setCheckFilter("upcoming"); }, []);
  useEffect(() => { const showToast = (event: Event) => { setToastWarning(false); setToast((event as CustomEvent<string>).detail); }; window.addEventListener("herdsync:toast", showToast); return () => window.removeEventListener("herdsync:toast", showToast); }, []);
  useEffect(() => { if (newPregnancyLivestockId === null) return; const timer = window.setTimeout(() => setNewPregnancyLivestockId(null), 6000); return () => window.clearTimeout(timer); }, [newPregnancyLivestockId]);
  useEffect(() => { if (newBreedingRecordId === null) return; const timer = window.setTimeout(() => setNewBreedingRecordId(null), 15000); return () => window.clearTimeout(timer); }, [newBreedingRecordId]);
  useEffect(() => { if (!breedingNotice) return; const timer = window.setTimeout(() => setBreedingNotice(""), 15000); return () => window.clearTimeout(timer); }, [breedingNotice]);
  useEffect(() => { if (newBreedingRecordId === null || !checks.some((item) => item.source_event_id === newBreedingRecordId)) return; requestAnimationFrame(() => document.querySelector(".reproduction-checks-table .reproduction-new-pregnancy")?.scrollIntoView({ behavior: "smooth", block: "center" })); }, [checks, newBreedingRecordId]);

  function openReview(item: PregnancyCheck) { setReview(item); setNotes(""); setConfirmedBy(""); setError(""); }

  async function openPregnancyDetail(item: Pregnancy) {
    setPregnancyDetail(null); setPregnancyDetailLoading(true); setPregnancyDetailError("");
    try {
      const response = await fetch(`/api/pregnancy/${item.livestock_id}?livestock=1`, { cache: "no-store" });
      const body = await response.json() as PregnancyDetail & { error?: string };
      if (!response.ok) throw new Error(body.error || "Pregnancy details could not load");
      if (!body.pregnancy) throw new Error("No active pregnancy record found for this dam");
      setPregnancyDetail({ ...body, pregnancy: { ...body.pregnancy, pregnancy_id: body.pregnancy.confirmation_id } });
    } catch (reason) { setPregnancyDetailError(reason instanceof Error ? reason.message : "Pregnancy details could not load"); }
    finally { setPregnancyDetailLoading(false); }
  }

  async function openDetail(item: PregnancyCheck) {
    if (detail?.record.id === item.source_event_id) { setDetail(null); return; }
    setError("");
    try {
      const response = await fetch(`/api/breeding/${item.source_event_id}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Breeding details could not load");
      setDetail(body);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Breeding details could not load"); }
  }

  function openReviewWhenDue(item: PregnancyCheck) {
    if (item.check_status === "due" || item.check_status === "overdue") { openReview(item); return; }
    setToastWarning(true);
    setToast(`Pregnancy confirmation is not available yet. Next check is due ${formatDate(item.check_date)}.`);
  }

  function changeFocus(value: "split" | "checks" | "pregnancies") {
    setFocus(value);
    if (value === "split") setDetail(null);
  }

  function requestOutcome(confirmed: boolean) {
    if (!notes.trim() || !confirmedBy.trim()) { setError("Findings and confirmed by are required"); return; }
    setError(""); setPendingOutcome(confirmed);
  }

  async function saveOutcome(confirmed: boolean) {
    if (!review) return;
    if (!notes.trim() || !confirmedBy.trim()) { setError("Findings and confirmed by are required"); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/livestock/${review.livestock_id}/breeding`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event_type: confirmed ? "pregnancy_confirmed" : "pregnancy_negative", event_date: today(), source_service_id: review.source_event_id, details: `${confirmed ? "Confirmed" : "Negative check"} from breeding session ${review.source_event_id}\nNotes: ${notes.trim()}`, performed_by: confirmedBy.trim() }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Pregnancy outcome could not be saved");
      if (confirmed) { setNewPregnancyLivestockId(review.livestock_id); setFocus("split"); setWorkspaceView("pregnancies"); }
      setPendingOutcome(null); setReview(null); setToastWarning(false); setToast(confirmed ? `${review.tag_number} moved into Active pregnancies.` : `${review.tag_number} returned to breeding monitoring.`);
      await loadChecks(pages.checks.page);
      if (confirmed) await loadPregnancies(1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Pregnancy outcome could not be saved"); }
    finally { setSaving(false); }
  }

  return <div className="reproduction-page">
    <header className="reproduction-header"><div><h1>Reproduction Workspace</h1></div><div className="reproduction-header-actions"><button type="button" className="primary-button" onClick={() => setShowAddBreeding(true)}><Plus size={16}/> Record breeding</button></div></header>
    {showAddBreeding && <BreedingWorkspace modalOnly onClose={() => setShowAddBreeding(false)} onSaved={async (message, breedingRecordId) => { setShowAddBreeding(false); setBreedingNotice(message); setNewBreedingRecordId(breedingRecordId); setCheckSearch(""); setCheckFilter("upcoming"); await Promise.all([loadChecks(1, "upcoming", ""), loadTotals()]); }}/>} 
    {error && !review && <p role="alert" className="cattle-error">{error}</p>}
    <section className="reproduction-summary" aria-label="Reproduction summary"><div><span>Awaiting checks</span><strong>{totals.checks}</strong><small>{summary.checksDue} due now</small></div><div><span>Active pregnancies</span><strong>{summary.pregnancies}</strong><small>{summary.nearCalving} near calving</small></div><div><span>Pending calf care</span><strong>{totals.care}</strong><small>{summary.careDue} due now</small></div><div><span>Calving records</span><strong>{totals.calvings}</strong><small>Recorded outcomes</small></div></section>

    <nav className="reproduction-workspace-tabs" aria-label="Reproduction workspace views"><button type="button" className={workspaceView === "checks" ? "active" : ""} aria-current={workspaceView === "checks" ? "page" : undefined} onClick={() => setWorkspaceView("checks")}>Breeding &amp; Pregnancy Checks</button><button type="button" className={workspaceView === "pregnancies" ? "active" : ""} aria-current={workspaceView === "pregnancies" ? "page" : undefined} onClick={() => setWorkspaceView("pregnancies")}>Active Pregnancies</button></nav>

    <div className={`reproduction-pipeline reproduction-workspace-view-${workspaceView} reproduction-focus-${focus}`}>
      <PipelinePanel id="checks" title="Breeding & Pregnancy Checks" focus={focus}>
        <TableFilters search={checkSearch} onSearch={setCheckSearch} value={checkFilter} onFilter={setCheckFilter} options={[{ value: "all", label: "All checks" }, { value: "overdue", label: "Overdue" }, { value: "due", label: "Due" }, { value: "upcoming", label: "Awaiting Due" }]}/>
        {breedingNotice && <div className="reproduction-table-notice" role="status"><Check size={17}/><span>{breedingNotice}</span><button type="button" aria-label="Dismiss notification" onClick={() => setBreedingNotice("")}><X size={15}/></button></div>}
        {loading ? <Empty text="Loading live records…"/> : checks.length === 0 ? <Empty text="No breeding sessions awaiting a pregnancy check."/> : <><div className="cattle-table-wrap"><table className="cattle-table reproduction-table reproduction-checks-table"><thead><tr><th>Dam</th><th>Service</th><th>Check</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{checks.map((item) => { const open = detail?.record.id === item.source_event_id; const reviewAllowed = item.check_status === "due" || item.check_status === "overdue"; const isNew = item.source_event_id === newBreedingRecordId; return <Fragment key={item.source_event_id}><tr className={`reproduction-clickable-row${isNew ? " reproduction-new-pregnancy" : ""}${item.check_status === "due" ? " reproduction-check-due-today" : ""}${item.check_status === "overdue" ? " reproduction-check-overdue" : ""}`} tabIndex={0} aria-expanded={open} onClick={() => openDetail(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDetail(item); } }}><td><Link href={`/livestock/${item.livestock_id}`} onClick={(event) => event.stopPropagation()}><strong>{item.tag_number}</strong>{isNew && <span className="reproduction-new-badge">New</span>}</Link><small>{item.name || "Unnamed"}</small></td><td>{formatDate(item.breeding_date)}</td><td>{formatDate(item.check_date)}</td><td><span className={`reproduction-status ${item.check_status}`}>{checkStatusLabel(item.check_status)}</span></td><td><div className="reproduction-row-actions"><button type="button" className="reproduction-details-toggle" aria-expanded={open} onClick={(event) => { event.stopPropagation(); openDetail(item); }}><span>{open ? "Hide" : "Details"}</span>{open ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}</button></div></td></tr>{open && <tr className="reproduction-detail-row"><td colSpan={5}><BreedingDetailDropdown data={detail} canReview={reviewAllowed} onReview={() => { if (reviewAllowed) openReview(item); else { setToastWarning(true); setToast("Confirmation is available when pregnancy check is due."); } }}/></td></tr>}</Fragment>; })}</tbody></table></div><TablePagination pagination={pages.checks} onPage={(page) => load(page, pages.pregnancies.page)}/></>}
      </PipelinePanel>
      {workspaceView === "checks" && detail && <aside className="reproduction-panel reproduction-check-detail-panel"><header><div><span className="cattle-eyebrow">Selected check</span><h2>Breeding details</h2></div><button type="button" className="secondary-button" onClick={() => setDetail(null)}>Close</button></header><BreedingDetailDropdown data={detail} canReview={Boolean(checks.find(item => item.source_event_id === detail.record.id && (item.check_status === "due" || item.check_status === "overdue")))} onReview={() => { const item = checks.find(candidate => candidate.source_event_id === detail.record.id); if (item) openReviewWhenDue(item); }}/></aside>}
      <div className="reproduction-transfer" aria-hidden="true"><ArrowRight size={20}/><span>Confirmed</span></div>
      <PipelinePanel id="pregnancies" title="Active Pregnancies" focus={focus}>
        <TableFilters search={pregnancySearch} onSearch={setPregnancySearch} value={pregnancyFilter} onFilter={setPregnancyFilter} options={[{ value: "all", label: "All trimesters" }, { value: "first", label: "First trimester" }, { value: "second", label: "Second trimester" }, { value: "third", label: "Third trimester" }]}/>
        {loading ? <Empty text="Loading live records…"/> : pregnancies.length === 0 ? <Empty text="No active pregnancies."/> : <><div className="cattle-table-wrap"><table className="cattle-table reproduction-table reproduction-pregnancies-table"><thead><tr><th>Cattle ID</th><th>Expected calving</th><th>Pregnancy stage</th><th>Gestation</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{pregnancies.map((item) => <tr key={item.pregnancy_id} className={`reproduction-clickable-row${item.livestock_id === newPregnancyLivestockId ? " reproduction-new-pregnancy" : ""}`} tabIndex={0} onClick={() => openPregnancyDetail(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openPregnancyDetail(item); } }}><td><Link href={`/livestock/${item.livestock_id}`} onClick={(event) => event.stopPropagation()}><strong>{item.tag_number}</strong></Link>{item.livestock_id === newPregnancyLivestockId && <span className="reproduction-new-badge">New</span>}<small>{item.name || item.breed}</small></td><td>{formatDate(item.expected_calving_date)}</td><td><span className={`pregnancy-stage pregnancy-stage-${item.key}`}>{item.label}</span></td><td><div className="reproduction-gestation"><strong>Day {item.days_pregnant}</strong><progress max="283" value={Math.min(item.days_pregnant, 283)} aria-label={`${item.tag_number} gestation progress`}/><small>{Math.min(100, Math.round(item.days_pregnant / 283 * 100))}% of ~283 days</small></div></td><td><button type="button" className="pregnancy-table-open" onClick={(event) => { event.stopPropagation(); openPregnancyDetail(item); }}>View details</button></td></tr>)}</tbody></table></div><TablePagination pagination={pages.pregnancies} onPage={(page) => load(pages.checks.page, page)}/></>}
      </PipelinePanel>
    </div>

    {(pregnancyDetailLoading || pregnancyDetailError || pregnancyDetail) && <PregnancyQuickView data={pregnancyDetail} loading={pregnancyDetailLoading} error={pregnancyDetailError} onClose={() => { setPregnancyDetail(null); setPregnancyDetailError(""); }}/>} 

    {review && <div className="cattle-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setReview(null); }}><section className="cattle-modal compact-modal reproduction-review-modal" role="dialog" aria-modal="true" aria-labelledby="pregnancy-review-title"><header><div><span className="cattle-eyebrow">Pregnancy confirmation</span><h2 id="pregnancy-review-title">Review {review.tag_number}</h2><p>{review.name || "Unnamed dam"} · Service #{review.source_event_id}</p></div><button type="button" className="cattle-modal-close" aria-label="Close" onClick={() => setReview(null)} disabled={saving}><X size={18}/></button></header><div className="reproduction-review-dates"><div><span>Service</span><strong>{formatDate(review.breeding_date)}</strong></div><div><span>Check due</span><strong>{formatDate(review.check_date)}</strong></div><div><span>Expected calving</span><strong>{formatDate(review.expected_calving_date)}</strong></div></div><div className="reproduction-review-fields"><label className="field"><span>Findings <span className="cattle-required-marker" aria-hidden="true">*</span></span><textarea required value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Check method, findings, and observations"/></label><label className="field"><span>Confirmed by <span className="cattle-required-marker" aria-hidden="true">*</span></span><input required value={confirmedBy} onChange={(event) => setConfirmedBy(event.target.value)} placeholder="Veterinarian or authorized staff"/></label></div>{error && <p role="alert" className="cattle-error">{error}</p>}<footer><button type="button" className="secondary-button" disabled={saving} onClick={() => requestOutcome(false)}><X size={15}/> Not pregnant</button><button type="button" className="primary-button" disabled={saving} onClick={() => requestOutcome(true)}><Check size={15}/> Confirm pregnant</button></footer></section></div>}
    {review && pendingOutcome !== null && <div className="cattle-modal-backdrop reproduction-confirm-backdrop" role="presentation"><section className={`cattle-modal reproduction-confirm-modal ${pendingOutcome ? "is-positive" : "is-negative"}`} role="alertdialog" aria-modal="true" aria-labelledby="outcome-confirm-title"><div className="reproduction-confirm-icon">{pendingOutcome ? <Check size={24}/> : <X size={24}/>}</div><header><span className="cattle-eyebrow">Final confirmation</span><h2 id="outcome-confirm-title">Record as {pendingOutcome ? "pregnant" : "not pregnant"}?</h2><p>This completes breeding session #{review.source_event_id} for <strong>{review.tag_number}</strong>. Outcome cannot be edited from this screen.</p></header><div className="reproduction-confirm-summary"><div><span>Findings</span><p>{notes}</p></div><div><span>Confirmed by</span><strong>{confirmedBy}</strong></div></div>{error && <p role="alert" className="cattle-error">{error}</p>}<footer><button type="button" className="secondary-button" disabled={saving} onClick={() => setPendingOutcome(null)}>Go back</button><button type="button" className={pendingOutcome ? "primary-button" : "danger-button"} disabled={saving} onClick={() => saveOutcome(pendingOutcome)}>{saving ? "Saving…" : `Yes, record ${pendingOutcome ? "pregnant" : "not pregnant"}`}</button></footer></section></div>}
    {toast && <div className={`reproduction-toast ${toastWarning ? "is-warning" : ""}`} role="status">{toastWarning ? <X size={17}/> : <Check size={17}/>}<span>{toast}</span><button type="button" aria-label="Dismiss notification" onClick={() => setToast("")}><X size={15}/></button></div>}
  </div>;
}

 function PipelinePanel({ id, title, children, focus }: { id: "checks" | "pregnancies"; title: string; children: React.ReactNode; focus: "split" | "checks" | "pregnancies" }) { const collapsed = focus !== "split" && focus !== id; return <section id={id} className={`reproduction-panel ${collapsed ? "is-collapsed" : ""}`}><header><div><h2>{title}</h2></div></header>{children}</section>; }
function Empty({ text }: { text: string }) { return <p className="reproduction-empty">{text}</p>; }
function PregnancyQuickView({ data, loading, error, onClose }: { data: PregnancyDetail | null; loading: boolean; error: string; onClose: () => void }) {
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [onClose]);
  const pregnancy = data?.pregnancy, latest = data?.checkups[0], progress = pregnancy ? Math.min(100, Math.round(pregnancy.days_pregnant / 283 * 100)) : 0;
  return <div className="pregnancy-quick-view-layer"><button type="button" className="pregnancy-quick-view-backdrop" aria-label="Close pregnancy details" onClick={onClose}/><aside className="pregnancy-quick-view" role="dialog" aria-modal="true" aria-labelledby="pregnancy-quick-view-title"><header><div><span className="cattle-eyebrow">Reproductive record</span><h2 id="pregnancy-quick-view-title">{pregnancy?.name || pregnancy?.tag_number || "Pregnancy details"}</h2>{pregnancy && <p>{pregnancy.tag_number} · {pregnancy.breed}</p>}</div><button type="button" className="cattle-modal-close" aria-label="Close pregnancy details" autoFocus onClick={onClose}><X size={18}/></button></header><div className="pregnancy-quick-view-body">{loading ? <Empty text="Loading pregnancy details…"/> : error ? <p className="cattle-error" role="alert">{error}</p> : pregnancy && <><section className="pregnancy-quick-progress"><div><div><span className="cattle-eyebrow">Gestation progress</span><h3>{pregnancy.days_pregnant} <small>days pregnant</small></h3></div><span className={`pregnancy-stage pregnancy-stage-${pregnancy.key}`}>{pregnancy.label}</span></div><progress max="283" value={Math.min(283, pregnancy.days_pregnant)}/><p><span>{progress}% complete</span><span>~283 days</span></p><div className="pregnancy-quick-grid"><QuickMetric label="Bred" value={formatDate(pregnancy.conception_date)}/><QuickMetric label="Expected calving" value={formatDate(pregnancy.expected_calving_date)}/></div></section><section className="pregnancy-quick-section"><header><div><span className="cattle-eyebrow">Current condition</span><h3>Latest assessment</h3></div><small>{latest ? formatDate(latest.checkup_date) : "Not recorded"}</small></header><div className="pregnancy-quick-grid"><QuickMetric label="Health" value={label(latest?.health_status || pregnancy.health_status || "unknown")}/><QuickMetric label="Body condition" value={latest?.body_condition_score ? `${latest.body_condition_score} / 5` : "Not recorded"}/><QuickMetric label="Weight" value={(latest?.weight_kg || pregnancy.current_weight_kg) ? `${latest?.weight_kg || pregnancy.current_weight_kg} kg` : "Not recorded"}/><QuickMetric label="Checkups" value={`${data.checkups.length} recorded`}/></div></section><section className={`pregnancy-quick-next${pregnancy.checkup_overdue ? " is-overdue" : ""}`}><div><span>Next checkup</span><strong>{formatDate(pregnancy.next_checkup_date)}</strong></div><b>{pregnancy.checkup_overdue ? "Overdue" : pregnancy.checkup_due ? "Due" : "Scheduled"}</b></section><section className="pregnancy-quick-section"><header><div><span className="cattle-eyebrow">Breeding pair</span><h3>Dam and sire</h3></div></header><div className="pregnancy-quick-pair"><article><span>Dam</span><strong>{pregnancy.tag_number} · {pregnancy.name || "Unnamed"}</strong><small>{pregnancy.breed}</small></article><i>×</i><article><span>Sire</span><strong>{pregnancy.sire_tag_number ? `${pregnancy.sire_tag_number} · ${pregnancy.sire_name || "Unnamed"}` : "Not recorded"}</strong><small>{pregnancy.sire_breed || "Breed not recorded"}</small></article></div></section><section className="pregnancy-quick-section"><header><div><span className="cattle-eyebrow">Checkup history</span><h3>Recent assessments</h3></div><small>Last 3</small></header>{data.checkups.length ? <div className="cattle-table-wrap"><table className="pregnancy-quick-table"><thead><tr><th>Date</th><th>Health</th><th>BCS</th><th>Weight</th></tr></thead><tbody>{data.checkups.slice(0, 3).map((checkup) => <tr key={checkup.id}><td>{formatDate(checkup.checkup_date)}</td><td>{label(checkup.health_status)}</td><td>{checkup.body_condition_score || "—"}</td><td>{checkup.weight_kg ? `${checkup.weight_kg} kg` : "—"}</td></tr>)}</tbody></table></div> : <Empty text="No pregnancy checkups recorded."/>}</section></>}</div>{pregnancy && <footer><Link className="secondary-button" href={`/pregnancy/${pregnancy.pregnancy_id}?returnTo=/reproduction`}>Add checkup</Link><Link className="primary-button" href={`/pregnancy/${pregnancy.pregnancy_id}?returnTo=/reproduction`}>Record calving</Link></footer>}</aside></div>;
}
function QuickMetric({ label: metricLabel, value }: { label: string; value: string }) { return <div className="pregnancy-quick-metric"><span>{metricLabel}</span><strong>{value}</strong></div>; }
function TablePagination({ pagination, onPage }: { pagination: Pagination; onPage: (page: number) => void }) { return <nav className="operations-pagination reproduction-pagination" aria-label="Table pages"><button type="button" className="secondary-button" disabled={pagination.page === 1} onClick={() => onPage(pagination.page - 1)}>Previous</button><span>Page {pagination.page} of {Math.max(1, Math.ceil(pagination.total / 5))}</span><button type="button" className="secondary-button" disabled={!pagination.hasNext} onClick={() => onPage(pagination.page + 1)}>Next</button></nav>; }
function TableFilters({ search, onSearch, value, onFilter, options }: { search: string; onSearch: (value: string) => void; value: string; onFilter: (value: string) => void; options: { value: string; label: string }[] }) { return <div className="reproduction-filters"><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search dam ID or name" aria-label="Search dam"/><select value={value} onChange={(event) => onFilter(event.target.value)} aria-label="Filter records">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>; }
function BreedingDetailDropdown({ data, canReview, onReview }: { data: BreedingDetail; canReview: boolean; onReview: () => void }) {
  const record = data.record;
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [form, setForm] = useState({ event_date: record.event_date.slice(0, 10), performed_by: record.performed_by || "", details: record.details || "" });
  useEffect(() => {
    setEditing(false);
    setEditError("");
    setForm({ event_date: record.event_date.slice(0, 10), performed_by: record.performed_by || "", details: record.details || "" });
  }, [record.id, record.event_date, record.performed_by, record.details]);
  const daysUntilCheck = Math.ceil((new Date(`${record.pregnancy_check_due_date}T00:00:00`).getTime() - new Date(`${today()}T00:00:00`).getTime()) / 86400000);
  const timelineLabel = daysUntilCheck < 0 ? `${Math.abs(daysUntilCheck)} days overdue` : daysUntilCheck === 0 ? "Due today" : `${daysUntilCheck} days until check`;
  const checkWindowDays = Math.max(1, Math.ceil((new Date(`${record.pregnancy_check_due_date}T00:00:00`).getTime() - new Date(`${record.event_date.slice(0, 10)}T00:00:00`).getTime()) / 86400000));
  const timelineProgress = Math.max(0, Math.min(100, Math.round((checkWindowDays - daysUntilCheck) / checkWindowDays * 100)));
  const details = [["Current timeline", timelineLabel]];
  async function saveEdit() {
    setSavingEdit(true); setEditError("");
    try {
      const response = await fetch(`/api/breeding/${record.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Breeding record could not be updated");
      record.event_date = form.event_date; record.performed_by = form.performed_by; record.details = form.details;
      setEditing(false);
      window.dispatchEvent(new CustomEvent("herdsync:toast", { detail: "Breeding record updated." }));
    } catch (reason) { setEditError(reason instanceof Error ? reason.message : "Breeding record could not be updated"); }
    finally { setSavingEdit(false); }
  }
  return <section className="reproduction-detail-dropdown" aria-label={`Breeding session ${record.id} details`} style={{ "--timeline-progress": `${timelineProgress}%` } as CSSProperties}>
    <header><div><strong>Breeding record #{record.id}</strong></div><button type="button" className="pregnancy-table-open" onClick={() => setEditing((value) => !value)}>{editing ? "Cancel" : "Edit"}</button></header>
    {editing ? <div className="reproduction-detail-edit"><label>Breeding date<input required max={today()} type="date" value={form.event_date} onChange={(event) => setForm({ ...form, event_date: event.target.value })}/></label><label>Handler / observer<input maxLength={150} value={form.performed_by} onChange={(event) => setForm({ ...form, performed_by: event.target.value })}/></label><label className="reproduction-detail-notes">Notes <small>({form.details.length}/50)</small><textarea maxLength={50} value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })}/></label>{editError && <p className="cattle-error" role="alert">{editError}</p>}<button type="button" className="primary-button" disabled={savingEdit || !form.event_date} onClick={saveEdit}>{savingEdit ? "Saving…" : "Save changes"}</button></div> : <><div className="reproduction-detail-list"><span>Female cattle (dam)</span><strong>{record.livestock_name ? `${record.livestock_name} (${record.tag_number})` : record.tag_number}</strong><span>Male cattle (sire)</span><strong>{record.sire_name && record.sire_tag_number ? `${record.sire_name} (${record.sire_tag_number})` : record.sire_tag_number || record.sire_name || "Not recorded"}</strong><span>Breeding method</span><strong>{label(record.event_type)}</strong><span>Breeding date</span><strong>{formatDate(record.event_date)}</strong><span>Pregnancy check due</span><strong>{formatDate(record.pregnancy_check_due_date)}</strong><span>Expected calving date</span><strong>{formatDate(record.expected_calving_date)}</strong><span>Female breed</span><strong>{record.dam_breed || "Not recorded"}</strong><span>Male cattle breed</span><strong>{record.sire_breed || "Not recorded"}</strong><span>Handler / observer</span><strong>{record.performed_by || "Not recorded"}</strong>{details.map(([key, value]) => <Fragment key={key}><span>{key}</span><strong>{String(value).slice(0, 50)}</strong></Fragment>)}</div><div className="reproduction-detail-actions"><Link className="secondary-button reproduction-detail-review" href={`/breeding/${record.id}`}>View breeding profile</Link><button type="button" className={`primary-button reproduction-detail-review ${canReview ? "" : "is-unavailable"}`} onClick={onReview}>Confirm pregnancy</button></div></>}</section>;
}
