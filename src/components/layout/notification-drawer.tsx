"use client";

import { AlertTriangle, Bell, Check, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Alert = { healthRecordId: number; livestockId: number; tagNumber: string; alertType: string; title: string; dueDate: string; status: "overdue" | "today" | "upcoming" | "later"; acknowledgedAt: string | null };
const labels: Record<Alert["status"], string> = { overdue: "Overdue", today: "Today", upcoming: "Upcoming", later: "Later" };
const order: Alert["status"][] = ["overdue", "today", "upcoming", "later"];

function dueText(alert: Alert) {
  const days = Math.round((new Date(`${alert.dueDate}T00:00:00`).getTime() - new Date(`${new Date().toLocaleDateString("en-CA")}T00:00:00`).getTime()) / 86_400_000);
  if (days < 0) return `${Math.abs(days)} day${days === -1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return new Date(`${alert.dueDate}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationDrawer({ open, onClose, onCountChange }: { open: boolean; onClose: () => void; onCountChange: (count: number) => void }) {
  const [alerts, setAlerts] = useState<Alert[]>([]), [loading, setLoading] = useState(false), [error, setError] = useState("");
  const closeButton = useRef<HTMLButtonElement>(null);
  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/alerts", { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? "Session expired. Sign in again." : "Notifications could not load.");
      const data: Alert[] = await response.json();
      setAlerts(data); onCountChange(data.filter((item) => !item.acknowledgedAt).length);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Notifications could not load."); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (open) { void Promise.resolve().then(load); requestAnimationFrame(() => closeButton.current?.focus()); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [open, onClose]);
  if (!open) return null;
  const active = alerts.filter((item) => !item.acknowledgedAt);
  return <div className="notification-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section id="notification-drawer" className="notification-drawer" role="dialog" aria-modal="true" aria-labelledby="notification-title">
      <header className="notification-drawer-header"><div><span className="cattle-eyebrow">Care queue</span><h2 id="notification-title">Notifications</h2></div><button ref={closeButton} type="button" className="icon-button" aria-label="Close notifications" onClick={onClose}><X size={18}/></button></header>
      <div className="notification-drawer-summary"><Bell size={16}/><strong>{active.length}</strong><span>need attention</span></div>
      {error && <div className="operations-error" role="alert"><span>{error}</span><button onClick={() => void load()}>Retry</button></div>}
      {loading ? <p className="notification-empty" role="status">Loading notifications…</p> : active.length === 0 ? <div className="notification-empty"><Check size={28}/><strong>No notifications needing attention.</strong><span>Current care schedule is clear.</span></div> : <div className="notification-groups">{order.map((status) => { const items = active.filter((item) => item.status === status); return items.length ? <section key={status} className="notification-group" aria-labelledby={`notifications-${status}`}><h3 id={`notifications-${status}`}>{labels[status]} <span>{items.length}</span></h3>{items.map((alert) => <Link key={`${alert.healthRecordId}:${alert.alertType}`} href={`/livestock/${alert.livestockId}`} onClick={onClose} className={`notification-item notification-${status}`} aria-label={`View cattle ${alert.tagNumber}: ${alert.title}, ${dueText(alert)}`}><span className="notification-icon"><AlertTriangle size={16}/></span><div className="notification-copy"><strong>Cattle {alert.tagNumber}</strong><span className="notification-care-pill">{alert.title}</span><time dateTime={alert.dueDate}>{dueText(alert)}</time></div><ChevronRight className="notification-chevron" size={18}/></Link>)}</section> : null; })}</div>}
    </section>
  </div>;
}
