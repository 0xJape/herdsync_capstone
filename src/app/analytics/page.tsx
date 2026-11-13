"use client";

import Link from "next/link";
import { Activity, AlertTriangle, Beef, HeartPulse, RefreshCw, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useEffect, useMemo, useState } from "react";

type Datum = { label: string; value: number };
type AnalyticsData = {
  generatedAt: string; from: string; to: string; filters: { breeds: string[] };
  kpis: { liveHerd: number; breedingSuccess: number; pregnancyRate: number; calvingRate: number; activeHealthCases: number; mortalityRate: number };
  herdMovement: { month: string; closing: number; registrations: number; births: number }[];
  composition: Datum[]; reproductionFunnel: Datum[];
  pregnancyOutcomes: { month: string; confirmed: number; negative: number; losses: number }[];
  healthTypes: Datum[]; healthMonthly: { month: string; open: number; resolved: number }[];
  insights: { level: string; title: string; detail: string; href: string }[];
};
const chartTooltip = { border: "1px solid var(--border)", borderRadius: ".6rem", background: "var(--surface)", color: "var(--foreground)" };
const iso = (date: Date) => date.toISOString().slice(0, 10);
const startForRange = (range: string) => { const date = new Date(); if (range === "30") date.setUTCDate(date.getUTCDate() - 29); else { date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() - Number(range) + 1); } return iso(date); };

function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <article className="analytics-panel"><header><div><h2>{title}</h2><p>{description}</p></div></header><div className="analytics-chart">{children}</div></article>;
}
function EmptyChart() { return <p className="analytics-empty">No records match selected filters.</p>; }

export default function AnalyticsPage() {
  const [range, setRange] = useState("6");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState("");
  const [category, setCategory] = useState("");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const query = useMemo(() => new URLSearchParams({ from: startForRange(range), to: iso(new Date()), breed, sex, category }).toString(), [range, breed, sex, category]);
  useEffect(() => { const controller = new AbortController(); fetch(`/api/analytics?${query}`, { signal: controller.signal, cache: "no-store" }).then((response) => { if (!response.ok) throw new Error("Analytics could not load."); return response.json(); }).then((result: AnalyticsData) => { setData(result); setError(""); }).catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Analytics could not load."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [query]);
  const kpis = data ? [
    ["Live Herd", data.kpis.liveHerd.toLocaleString(), "Active cattle", Beef],
    ["Breeding Success", `${data.kpis.breedingSuccess.toFixed(1)}%`, "Confirmed of completed outcomes", TrendingUp],
    ["Pregnancy Rate", `${data.kpis.pregnancyRate.toFixed(1)}%`, "Confirmed of services", Activity],
    ["Calving Rate", `${data.kpis.calvingRate.toFixed(1)}%`, "Calvings of confirmations", Beef],
    ["Active Health Cases", data.kpis.activeHealthCases.toLocaleString(), "Open in selected period", HeartPulse],
    ["Mortality Rate", `${data.kpis.mortalityRate.toFixed(1)}%`, "Deceased cattle in filtered records", AlertTriangle],
  ] as const : [];
  const reset = () => { setRange("6"); setBreed(""); setSex(""); setCategory(""); };
  return <div className="analytics-page">
    <header className="analytics-hero"><div><h2>Herd Performance Overview</h2><p>Understand herd movement, reproduction, and health performance.</p></div><Link href="/reports" className="primary-button">View Reports</Link></header>
    <section className="analytics-filters" aria-label="Analytics filters"><label>Date range<select value={range} onChange={(event) => setRange(event.target.value)}><option value="1">This month</option><option value="3">Last 3 months</option><option value="6">Last 6 months</option><option value="12">Last year</option></select></label><label>Breed<select value={breed} onChange={(event) => setBreed(event.target.value)}><option value="">All breeds</option>{data?.filters.breeds.map((item) => <option key={item}>{item}</option>)}</select></label><label>Sex<select value={sex} onChange={(event) => setSex(event.target.value)}><option value="">All cattle</option><option value="female">Female</option><option value="male">Male</option></select></label><label>Production class<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All classes</option>{["Cow","Heifer","Calf","Bull","Yearling bull"].map((item) => <option key={item}>{item}</option>)}</select></label><button type="button" onClick={reset} className="secondary-button"><RefreshCw size={15}/> Reset</button></section>
    {error ? <section className="panel" role="alert"><p>{error}</p><button className="secondary-button" onClick={() => location.reload()}>Retry</button></section> : loading || !data ? <p className="panel muted" role="status">Loading analytics…</p> : <>
      <section className="analytics-kpis">{kpis.map(([label, value, detail, Icon]) => <article key={label}><div><span>{label}</span><Icon size={17}/></div><strong>{value}</strong><small>{detail}</small></article>)}</section>
      <section className="analytics-main-grid"><ChartCard title="Herd Movement" description="Record-based closing herd and new records by month.">{data.herdMovement.some((item) => item.closing || item.registrations) ? <ResponsiveContainer width="100%" height="100%"><LineChart data={data.herdMovement}><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5"/><XAxis dataKey="month" tickLine={false} axisLine={false}/><YAxis allowDecimals={false} tickLine={false} axisLine={false}/><Tooltip contentStyle={chartTooltip}/><Legend/><Line type="monotone" dataKey="closing" name="Closing Herd" stroke="#2f7650" strokeWidth={3}/><Line type="monotone" dataKey="registrations" name="Registrations" stroke="#c38745" strokeWidth={2}/><Line type="monotone" dataKey="births" name="Born on Farm" stroke="#6387a8" strokeWidth={2}/></LineChart></ResponsiveContainer> : <EmptyChart/>}</ChartCard>
      <ChartCard title="Reproduction funnel" description="Recorded progression in selected period.">{data.reproductionFunnel.some((item) => item.value) ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.reproductionFunnel} layout="vertical" margin={{ left: 25 }}><CartesianGrid horizontal={false} stroke="var(--border)"/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="label" width={105} tickLine={false} axisLine={false}/><Tooltip contentStyle={chartTooltip}/><Bar dataKey="value" name="Records" fill="#2f7650" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer> : <EmptyChart/>}</ChartCard></section>
      <section className="analytics-chart-grid"><ChartCard title="Pregnancy Outcomes" description="Monthly confirmed, negative, and loss outcomes."><ResponsiveContainer width="100%" height="100%"><BarChart data={data.pregnancyOutcomes}><CartesianGrid vertical={false} stroke="var(--border)"/><XAxis dataKey="month" tickLine={false} axisLine={false}/><YAxis allowDecimals={false}/><Tooltip contentStyle={chartTooltip}/><Legend/><Bar dataKey="confirmed" name="Confirmed" stackId="outcome" fill="#2f7650"/><Bar dataKey="negative" name="Negative" stackId="outcome" fill="#c38745"/><Bar dataKey="losses" name="Losses" stackId="outcome" fill="#b85e56" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Health cases" description="Most recorded health categories.">{data.healthTypes.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.healthTypes} layout="vertical" margin={{ left: 25 }}><CartesianGrid horizontal={false} stroke="var(--border)"/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="label" width={105}/><Tooltip contentStyle={chartTooltip}/><Bar dataKey="value" name="Records" fill="#6387a8" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer> : <EmptyChart/>}</ChartCard>
      <ChartCard title="Health resolution" description="Open and resolved records by month."><ResponsiveContainer width="100%" height="100%"><BarChart data={data.healthMonthly}><CartesianGrid vertical={false} stroke="var(--border)"/><XAxis dataKey="month"/><YAxis allowDecimals={false}/><Tooltip contentStyle={chartTooltip}/><Legend/><Bar dataKey="open" name="Open" stackId="health" fill="#c38745"/><Bar dataKey="resolved" name="Resolved" stackId="health" fill="#2f7650" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></ChartCard>
      <ChartCard title="Herd composition" description="Live cattle by production class.">{data.composition.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.composition} layout="vertical" margin={{ left: 20 }}><CartesianGrid horizontal={false} stroke="var(--border)"/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="label" width={90}/><Tooltip contentStyle={chartTooltip}/><Bar dataKey="value" name="Cattle" fill="#2f7650" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer> : <EmptyChart/>}</ChartCard></section>
      <section className="analytics-insights"><h2>Actionable Insights</h2><div>{data.insights.map((item) => <article key={item.title} className={`analytics-insight analytics-insight-${item.level}`}><strong>{item.title}</strong><p>{item.detail}</p><Link href={item.href}>Review Records →</Link></article>)}</div></section>
    </>}
  </div>;
}
