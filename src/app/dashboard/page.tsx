"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardPlus, Plus, Search, Users, X } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentRole } from "@/lib/use-current-role";

type DashboardData = {
  updatedAt: string;
  operations: { overdue: number; dueToday: number; upcoming: number; unscheduled: number };
  stats: { label: string; value: number; detail: string; kind: string; trendPercent: number; trendDirection: "up" | "down" | "flat" }[];
  composition: { label: string; value: number }[];
  population: { month: string; value: number }[];
  alerts: { title: string; livestockId: number; tagNumber: string; dueDate: string | null; dayCount: number; level: string; category: string; timing: string }[];
  attention: AttentionData;
  recent: { title: string; detail: string }[];
};

type AttentionData = { items: DashboardData["alerts"]; total: number; page: number; pageSize: number; hasNext: boolean };

function PopulationChart({ data }: { data: DashboardData["population"] }) {
  const first = data[0]?.value ?? 0;
  const latest = data.at(-1)?.value ?? 0;
  const netChange = latest - first;
  const averageAddition = data.length > 1 ? netChange / (data.length - 1) : 0;
  return <Card>
    <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>Cattle registration history</CardTitle><CardDescription>Cumulative non-archived cattle records by month. Current month is partial.</CardDescription></div>{data.length > 0 && <div className="chart-summary"><strong>{data.at(-1)?.value}</strong><span>Current herd</span></div>}</div></CardHeader>
    {data.length === 0 ? <p className="muted mt-5 text-sm">No population data available.</p> : <>
      <div className="registration-chart mt-4" role="img" aria-label={`Cumulative cattle records: ${data.map((item) => `${item.month}: ${item.value}`).join(", ")}`}><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 18, right: 8, left: 0, bottom: 4 }}><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" /><XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} /><YAxis width={30} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} /><Tooltip formatter={(value) => [value, "Cattle"]} contentStyle={{ border: "1px solid var(--border)", borderRadius: ".5rem", background: "var(--surface)", color: "var(--foreground)" }} /><Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={3} dot={{ r: 4, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></div>
      <details className="chart-values text-xs"><summary>View exact values</summary><ul>{data.map((item, index) => <li key={index}><span>{item.month}</span><strong>{item.value}</strong></li>)}</ul></details><dl className="chart-insights"><div><dt>Net change</dt><dd>{netChange > 0 ? "+" : ""}{netChange}</dd></div><div><dt>Average added</dt><dd>{averageAddition.toFixed(1)} / month</dd></div><div><dt>Latest month</dt><dd>{data.at(-1)?.month}</dd></div></dl>
    </>}
  </Card>;
}

function ActivityCalendar({ alerts }: { alerts: DashboardData["alerts"] }) {
  const [month, setMonth] = useState(() => { const value = new Date(); return new Date(value.getFullYear(), value.getMonth(), 1); });
  const [selectedDate, setSelectedDate] = useState("");
  const year = month.getFullYear(), monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const byDate = new Map<string, DashboardData["alerts"]>();
  for (const alert of alerts) if (alert.dueDate) byDate.set(alert.dueDate, [...(byDate.get(alert.dueDate) ?? []), alert]);
  const dateKey = (day: number) => `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const selectedEvents = byDate.get(selectedDate) ?? [];
  return <><section className="activity-calendar" aria-label="All activity alerts calendar">
    <header><div><CalendarDays size={18}/><div><strong>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong><small>Health, breeding, calving, heat, and calf care</small></div></div><nav aria-label="Calendar month"><button type="button" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} aria-label="Previous month"><ChevronLeft size={16}/></button><button type="button" onClick={() => setMonth(new Date())}>Today</button><button type="button" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} aria-label="Next month"><ChevronRight size={16}/></button></nav></header>
    <div className="activity-calendar-weekdays" aria-hidden="true">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day) => <span key={day}>{day}</span>)}</div>
    <div className="activity-calendar-grid">{Array.from({ length: firstDay }, (_, index) => <span key={`blank-${index}`} className="calendar-blank"/>)}{Array.from({ length: days }, (_, index) => { const day = index + 1, key = dateKey(day), events = byDate.get(key) ?? [], isToday = key === new Date().toLocaleDateString("en-CA"); return <button type="button" key={key} aria-label={`View activity alerts for ${new Date(`${key}T00:00:00`).toLocaleDateString()}`} onClick={() => setSelectedDate(key)} className={isToday ? "calendar-date calendar-today" : "calendar-date"}><time dateTime={key}>{day}</time><span className="calendar-date-events">{events.slice(0, 3).map((event, eventIndex) => <span key={`${event.title}-${event.livestockId}-${eventIndex}`} className={`calendar-event calendar-event-${event.level}`} title={`${event.title}  -  ${event.tagNumber}`}><span>{event.title}</span><b>{event.tagNumber}</b></span>)}{events.length > 3 && <small>+{events.length - 3} more</small>}</span></button>; })}</div>
  </section>{selectedDate && <div className="cattle-modal-backdrop no-print" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedDate("")}><section className="cattle-modal compact-modal calendar-day-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-calendar-day-title"><div className="cattle-panel-heading"><div><span className="cattle-eyebrow">All activity alerts</span><h2 id="dashboard-calendar-day-title">{new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setSelectedDate("")}><X size={18}/></button></div>{selectedEvents.length ? <div className="calendar-day-events">{selectedEvents.map((event, index) => <Link key={`${event.title}-${event.livestockId}-${index}`} href={`/livestock/${event.livestockId}`} className={`dashboard-calendar-detail calendar-event-${event.level}`}><i/><div><strong>{event.tagNumber}</strong><span>{event.category}</span></div><div><strong>{event.title}</strong><span>{event.timing}</span></div></Link>)}</div> : <p className="muted calendar-day-empty">No activity alerts scheduled for this date.</p>}</section></div>}</>;
}

export default function DashboardPage() {
  const role = useCurrentRole();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [date, setDate] = useState("");
  const alertRange = 7 as const;
  const [attention, setAttention] = useState<AttentionData | null>(null);
  const [attentionLoading, setAttentionLoading] = useState(false);
  const [attentionSearch, setAttentionSearch] = useState("");
  const [attentionCategory, setAttentionCategory] = useState("");
  const [attentionUrgency, setAttentionUrgency] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/dashboard", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(response.status === 401 ? "Session expired. Please sign in again." : "Dashboard could not load. Please try again.");
        return response.json();
      })
      .then((result: DashboardData) => {
        if (controller.signal.aborted) return;
        setData(result);
        setAttention(result.attention);
        setDate(new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }));
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Dashboard could not load.");
      });
    return () => controller.abort();
  }, [attempt]);
  function loadAttention(page: number, range: 3 | 7 | 30 = alertRange, search = attentionSearch, category = attentionCategory, urgency = attentionUrgency) {
    setAttentionLoading(true);
    const query = new URLSearchParams({ mode: "attention", range: String(range), page: String(page), search, category, urgency });
    fetch(`/api/dashboard?${query}`, { cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error("Attention alerts could not load."); return response.json(); })
      .then((result: { attention: AttentionData }) => setAttention(result.attention))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Attention alerts could not load."))
      .finally(() => setAttentionLoading(false));
  }
  const total = data?.composition.reduce((sum, item) => sum + item.value, 0) ?? 0;
  const visibleAlerts = attention?.items ?? [];
  const herdColors = ["#347854", "#c38745", "#6387a8", "#8d6e9d", "#b85e56"];
  const compositionGradient = data?.composition.map((item, index, items) => { const start = total ? items.slice(0, index).reduce((sum, part) => sum + part.value, 0) / total * 100 : 0; const end = total ? start + item.value / total * 100 : 0; return `${herdColors[index % herdColors.length]} ${start}% ${end}%`; }).join(", ") ?? "var(--surface-muted) 0 100%";
  const overdue = data?.operations.overdue ?? 0;
  return <div className="farm-dashboard">
    <section className={`dashboard-hero status-banner ${overdue ? "status-banner-urgent" : "status-banner-clear"}`} role="status">
      <div className="status-banner-content"><span className="status-banner-icon" aria-hidden="true">{overdue ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}</span><div><p className="dashboard-kicker">{overdue ? "Action required" : "Today’s farm status"}{date && <> <span aria-hidden="true"> - </span> {date}</>}</p><h2>{data ? overdue ? `${overdue} overdue follow-up${overdue === 1 ? "" : "s"}` : "No overdue follow-ups" : "Loading farm status…"}</h2><p>{overdue ? "These health tasks are past due. Review them now to protect herd welfare." : "No past-due health work. Continue with routine herd records."}</p></div></div>
      {overdue > 0 && <div className="dashboard-hero-actions"><a href="#needs-attention" className="urgent-button">Review overdue now <span aria-hidden="true">→</span></a></div>}
    </section>
    {error ? <div className="panel" role="alert"><p>{error}</p><div className="mt-3 flex gap-4"><button className="dashboard-link" onClick={() => { setError(""); setAttempt(attempt + 1); }}>Retry</button><Link href="/login" className="dashboard-link">Sign in</Link></div></div> : !data ? <p className="panel muted" role="status">Loading farm overview…</p> : <>
      <section className="dashboard-zone dashboard-zone-overview" aria-labelledby="overview-heading"><div className="dashboard-zone-heading"><h2 id="overview-heading" className="dashboard-zone-title">Overview</h2><time className="dashboard-updated" dateTime={data.updatedAt}>Updated {new Date(data.updatedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</time></div><div className="farm-metrics">
        {(["cattle", "health", "due"] as const).map((kind) => {
          const stat = data.stats.find((item) => item.kind === kind);
          const trend = stat?.trendPercent ?? 0;
          const trendLabel = trend === 0 ? "No change" : `${trend > 0 ? "↑" : "↓"} ${Math.abs(trend)}%`;
          return <motion.div key={kind} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35, delay: .08 * (kind === "cattle" ? 0 : kind === "health" ? 1 : 2) }} whileHover={{ y: -2 }}><Link href={kind === "cattle" ? "/livestock" : role === "faculty" ? "/dashboard" : "/health"} className={`group panel metric-card metric-${kind}`}>
            <div className="metric-heading"><h2><span className="metric-label-desktop">{kind === "cattle" ? "Live cattle" : kind === "health" ? "Active clinical cases" : "Follow-ups  -  next 7 days"}</span><span className="metric-label-mobile">{kind === "cattle" ? "Cattle" : kind === "health" ? "Clinical" : "Due soon"}</span></h2><span className={`metric-trend metric-trend-${stat?.trendDirection ?? "flat"}`} aria-label={`${trendLabel} versus last month`}>{trendLabel}</span></div>
            <p className="metric-value">{stat?.value ?? "—"}</p>
            <p className="metric-detail">{kind === "cattle" ? stat?.detail ?? "Count unavailable" : kind === "health" ? "Unresolved illness, injury, or clinical treatment" : "Care due today through seven days from today"}</p>
          </Link></motion.div>;
        })}
      </div></section>
      <section className="dashboard-zone dashboard-zone-priority" aria-labelledby="priority-heading"><h2 id="priority-heading" className="dashboard-zone-title">Priority</h2><div className="operations-strip" aria-label="Operations summary"><dl>{([['Overdue', data.operations.overdue, 'critical'], ['Due today', data.operations.dueToday, 'today'], ['Next 7 days', data.operations.upcoming, 'high'], ['Unscheduled', data.operations.unscheduled, 'unscheduled']] as const).map(([label, value, level]) => <div key={label} className={`operation-count operation-${level}`}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><nav className="dashboard-quick-actions" aria-label="Quick actions">{role !== "faculty" && <><Link href="/livestock" className="secondary-button"><Plus size={15} /> Add cattle</Link><Link href="/health" className="secondary-button"><ClipboardPlus size={15} /> Record health</Link></>}<Link href="/livestock" className="secondary-button"><Users size={15} /> View herd</Link></nav></div>
        <Card className="attention-workspace" id="needs-attention">
          <div className="attention-workspace-header"><div><span className="attention-kicker"><CalendarDays size={15}/> Care schedule</span><CardTitle>Needs Attention</CardTitle><CardDescription>Clinical follow-ups and scheduled care, ranked by urgency.</CardDescription></div>{role !== "faculty" && <Link href="/health" className="dashboard-link text-xs">View Health Records →</Link>}</div>
          <div className="attention-controls"><div className="alert-legend" aria-label="Urgency color key"><span><i className="legend-critical" />Overdue</span><span><i className="legend-today" />Today</span><span><i className="legend-high" />Within 3 Days</span><span><i className="legend-warning" />Upcoming</span><span><i className="legend-unscheduled" />Needs Schedule</span></div></div>
          <ActivityCalendar alerts={data.alerts}/>
          <form className="attention-table-tools" onSubmit={(event) => { event.preventDefault(); loadAttention(1); }} aria-label="Filter care events"><label className="cattle-search"><Search size={17}/><input value={attentionSearch} onChange={(event) => setAttentionSearch(event.target.value)} placeholder="Search animal or care event" aria-label="Search care events" /></label><select value={attentionCategory} onChange={(event) => setAttentionCategory(event.target.value)} aria-label="Filter by category"><option value="">All Categories</option>{[...new Set(data.alerts.map((alert) => alert.category))].sort().map((category) => <option key={category} value={category}>{category}</option>)}</select><select value={attentionUrgency} onChange={(event) => setAttentionUrgency(event.target.value)} aria-label="Filter by urgency"><option value="">All Urgencies</option><option value="critical">Overdue</option><option value="today">Today</option><option value="high">Within 3 Days</option><option value="warning">Upcoming</option><option value="unscheduled">Needs Schedule</option></select><button type="submit" className="secondary-button" disabled={attentionLoading}>{attentionLoading ? "Filtering…" : "Apply Filters"}</button>{(attentionSearch || attentionCategory || attentionUrgency) && <button type="button" className="dashboard-link" onClick={() => { setAttentionSearch(""); setAttentionCategory(""); setAttentionUrgency(""); loadAttention(1, alertRange, "", "", ""); }}>Clear</button>}</form>
          {visibleAlerts.length === 0 ? <p className="muted py-8 text-sm">No alerts in selected period.</p> : <div className="mt-4 overflow-x-auto" role="region" aria-label="Needs attention table" tabIndex={0}>
            <table className="attention-table"><caption className="sr-only">Health care events ordered by earliest due date</caption><thead><tr><th scope="col">Urgency</th><th scope="col">Category</th><th scope="col">Animal</th><th scope="col">Care event</th><th scope="col">When</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
              <tbody>{visibleAlerts.map((alert, index) => <tr key={index} className={`attention-row attention-row-${alert.level}`}>
                <td><span className={`priority-tag priority-${alert.level}`}><i aria-hidden="true" />{alert.level === "critical" ? "Overdue" : alert.level === "today" ? "Today" : alert.level === "high" ? "Soon" : alert.level === "unscheduled" ? "Unscheduled" : "Upcoming"}</span></td>
                <td><span className="alert-category">{alert.category}</span></td><td className="font-semibold">{alert.tagNumber}</td><td>{alert.title}</td><td><strong className="attention-timing">{alert.timing}</strong>{alert.dueDate && <span className="muted block text-xs">{new Date(`${alert.dueDate}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>}</td>
                <td><Link href={`/livestock/${alert.livestockId}`} className="dashboard-link" aria-label={`Review ${alert.title} for ${alert.tagNumber}, ${alert.timing}`}>Review →</Link></td>
              </tr>)}</tbody>
            </table>
          </div>}
          {attention && attention.total > attention.pageSize && <nav className="operations-pagination" aria-label="Needs attention pages"><button className="secondary-button" type="button" disabled={attention.page === 1 || attentionLoading} onClick={() => loadAttention(attention.page - 1)}>Previous</button><span>{`${(attention.page - 1) * attention.pageSize + 1}–${Math.min(attention.page * attention.pageSize, attention.total)} of ${attention.total}`}</span><button className="secondary-button" type="button" disabled={!attention.hasNext || attentionLoading} onClick={() => loadAttention(attention.page + 1)}>Next</button></nav>}
          {attention && attention.total > 3 && role !== "faculty" && <Link href="/alerts" className="mobile-alert-continuation">View all {attention.total} alerts →</Link>}
        </Card>
      </section>
      <section className="dashboard-zone dashboard-zone-insights" aria-labelledby="insights-heading"><h2 id="insights-heading" className="dashboard-zone-title">Herd Insights</h2><Card className="composition-card">
          <div><CardTitle>Herd Composition</CardTitle><CardDescription>Live cattle by production class</CardDescription></div>
          {data.composition.length === 0 ? <p className="muted text-sm">No cattle records yet.</p> : <div className="composition-chart"><motion.div initial={{ opacity: 0, scale: .92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .55 }} className="composition-donut" style={{ background: `conic-gradient(${compositionGradient})` }} role="img" aria-label={`Herd composition: ${data.composition.map((item) => `${item.label} ${item.value}`).join(", ")}`}><div><strong>{total}</strong><span>Total Cattle</span></div></motion.div><dl className="composition-legend">{data.composition.map((item, index) => <div key={item.label}><dt><span className={`herd-dot herd-color-${index % 5}`} />{item.label}</dt><dd><strong>{item.value}</strong><span>{Math.round(item.value / total * 100)}%</span></dd></div>)}</dl></div>}
        </Card><div className="farm-secondary-grid">
        <PopulationChart data={data.population} />
        <Card><CardTitle>Recent records</CardTitle><CardDescription>Latest cattle registrations and health entries</CardDescription>
          {data.recent.length === 0 ? <p className="muted mt-5 text-sm">No recent records.</p> : <div className="mt-3 overflow-x-auto" role="region" aria-label="Recent records table" tabIndex={0}>
            <table className="recent-records-table"><caption className="sr-only">Five latest records, newest first</caption>
              <thead><tr><th scope="col">Record</th><th scope="col">Details</th></tr></thead>
              <tbody>{data.recent.map((item, index) => <tr key={index} className={`recent-record-row recent-record-${index % 3}`}><td><span className="recent-record-marker" aria-hidden="true" /><strong>{item.title}</strong></td><td className="muted">{item.detail}</td></tr>)}</tbody>
            </table>
          </div>}
        </Card>
      </div></section>
    </>}
  </div>;
}

