"use client";

import { Activity, BarChart3, Bell, Beef, CalendarClock, FileText, HeartPulse, LayoutDashboard, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Stethoscope, Sun, Users, Workflow, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useState, useSyncExternalStore } from "react";

import type { Role } from "@/lib/auth";
import { NotificationDrawer } from "@/components/layout/notification-drawer";
const links = [["Dashboard", LayoutDashboard, "/dashboard"], ["Activity", Activity, "/activity"], ["Cattle", Beef, "/livestock"], ["Health", HeartPulse, "/health"], ["Reproduction", Workflow, "/reproduction"], ["Analytics", BarChart3, "/analytics"], ["Reports", FileText, "/reports"], ["Manage users", Users, "/manage-users"]] as const;
const linkGroup = (href: string) => ["/health", "/breeding", "/pregnancy", "/reproduction"].includes(href) ? "Herd care" : ["/activity", "/manage-users"].includes(href) ? "Administration" : ["/analytics", "/reports", "/settings"].includes(href) ? "Tools" : "Overview";
const access: Record<Role, readonly string[]> = { admin: ["/activity", "/manage-users", "/settings"], veterinarian: ["/dashboard", "/livestock", "/health", "/breeding", "/pregnancy", "/reproduction", "/analytics", "/reports", "/settings"], farm_aide: ["/dashboard", "/livestock", "/health", "/breeding", "/pregnancy", "/reproduction", "/settings"], faculty: ["/dashboard", "/livestock", "/analytics", "/reports", "/settings"] };
const roleLabels: Record<Role, string> = { admin: "Administrator", veterinarian: "Veterinarian", farm_aide: "Farm aide", faculty: "Faculty" };
function readTheme() {
  try { return localStorage.getItem("herdsync-theme") === "dark"; } catch { return false; }
}
function subscribeTheme(update: () => void) {
  window.addEventListener("storage", update);
  window.addEventListener("herdsync-theme", update);
  return () => {
    window.removeEventListener("storage", update);
    window.removeEventListener("herdsync-theme", update);
  };
}

export function DashboardShell({ title, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const storedDark = useSyncExternalStore(subscribeTheme, readTheme, () => false);
  const [themeOverride, setThemeOverride] = useState<boolean | null>(null);
  const dark = themeOverride ?? storedDark;
  const [open, setOpen] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ display_name: string; role: Role } | null>(null);
  const [alertCount, setAlertCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    return () => {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "";
    };
  }, [dark]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setOpen(localStorage.getItem("herdsync-sidebar") !== "collapsed"); } catch { /* Keep expanded when storage is unavailable. */ }
    });
    fetch("/api/auth/me").then((response) => response.ok ? response.json() : null).then(setUser).catch(() => null);
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (user && !access[user.role].some((href) => pathname === href || pathname.startsWith(`${href}/`))) router.replace(access[user.role][0]);
  }, [pathname, router, user]);
  useEffect(() => {
    if (!user || !["veterinarian", "farm_aide"].includes(user.role)) return;
    const update = () => fetch("/api/alerts", { cache: "no-store" }).then((response) => response.ok ? response.json() : []).then((alerts: { acknowledgedAt: string | null }[]) => setAlertCount(alerts.filter((alert) => !alert.acknowledgedAt).length)).catch(() => null);
    void update();
    const timer = window.setInterval(update, 60_000);
    window.addEventListener("focus", update);
    window.addEventListener("herdsync-alerts", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); window.removeEventListener("herdsync-alerts", update); };
  }, [pathname, user]);
  function toggleTheme() {
    setThemeOverride(!dark);
    try { localStorage.setItem("herdsync-theme", dark ? "light" : "dark"); } catch { /* Keep session theme when storage is unavailable. */ }
    window.dispatchEvent(new Event("herdsync-theme"));
  }
  function toggleSidebar() { setOpen((value) => { const next = !value; localStorage.setItem("herdsync-sidebar", next ? "open" : "collapsed"); return next; }); }
  async function logout() {
    setLoggingOut(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Could not log out. Please try again.");
      setLoggingOut(false);
    }
  }
  const navigation = user ? links.filter(([, , href]) => access[user.role].includes(href)) : [];
  const reproductionTab = searchParams.get("tab") ?? "breeding";
  return <main className={dark ? "dark dashboard-shell" : "dashboard-shell"}>
    <aside id="workspace-sidebar" className={open ? "sidebar" : "sidebar sidebar-collapsed"} aria-label="Workspace sidebar">
      <Link href="/" aria-label="HerdSync home" data-tooltip="Go to HerdSync home" data-tooltip-side="right" className="flex items-center gap-3 font-semibold text-[var(--accent)]">
        <Image src="/herdsync_logo.png" alt="" width={40} height={40} className="h-auto w-10 shrink-0 object-contain" />
        <span className="sidebar-label">HerdSync</span>
      </Link>
      <nav aria-label="Main navigation" className="sidebar-navigation">
          { ["Overview", "Herd care", "Administration", "Tools"].map((group) => { const items = navigation.filter(([, , href]) => linkGroup(href) === group); return items.length ? <section className="nav-group" key={group} aria-labelledby={`nav-${group.replace(" ", "-").toLowerCase()}`}><p className="nav-heading" id={`nav-${group.replace(" ", "-").toLowerCase()}`}>{group}</p>{items.map(([label, Icon, href]) => <div key={href}><Link href={href} aria-label={label} aria-current={pathname === href ? "page" : undefined} data-tooltip={`Open ${label.toLowerCase()}`} data-tooltip-side="right" className={pathname === href ? "nav-link nav-active" : "nav-link"}>
          <Icon size={18} aria-hidden="true" className="shrink-0" /><span className="sidebar-label">{label}</span>
        </Link>{href === "/reproduction" && open && <div className="nav-group-nested" aria-label="Reproduction sections">{([["Breeding", CalendarClock, "breeding"], ["Pregnancy", Stethoscope, "pregnancy"], ["Calving", Beef, "calving"]] as const).map(([tabLabel, TabIcon, tab]) => <Link key={tab} href={`/reproduction?tab=${tab}`} aria-current={pathname === "/reproduction" && reproductionTab === tab ? "page" : undefined} className={pathname === "/reproduction" && reproductionTab === tab ? "nav-link nav-active" : "nav-link"}><TabIcon size={16} aria-hidden="true" className="shrink-0" /><span className="sidebar-label">{tabLabel}</span></Link>)}</div>}</div>)}</section> : null; })}
      </nav>
    </aside>
    <section className={open ? "dashboard-main" : "dashboard-main dashboard-main-collapsed"}>
      <header className="dashboard-header">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={toggleSidebar} aria-controls="workspace-sidebar" aria-expanded={open} aria-label={open ? "Collapse sidebar" : "Expand sidebar"} data-tooltip={open ? "Collapse navigation" : "Expand navigation"} className="icon-button shrink-0">{open ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}</button>
          <div>{pathname.includes("/") && pathname.split("/").filter(Boolean).length > 1 && <nav className="dashboard-breadcrumbs" aria-label="Breadcrumb"><Link href="/dashboard" data-tooltip="Go to Dashboard">Dashboard</Link><span aria-hidden="true">/</span><Link href={pathname.startsWith("/livestock/") ? "/livestock" : pathname.startsWith("/pregnancy/") ? "/reproduction" : pathname.startsWith("/breeding/") ? "/breeding" : "/dashboard"}>{pathname.startsWith("/pregnancy/") ? "Reproduction" : title}</Link><span aria-hidden="true">/</span><span aria-current="page">{pathname.startsWith("/livestock/") ? "Cattle Profile" : pathname.startsWith("/pregnancy/") ? "Reproductive Profile" : pathname.startsWith("/breeding/") ? "Breeding Record" : title}</span></nav>}<h1 className="text-xl font-semibold">{pathname.startsWith("/pregnancy/") ? "Reproduction" : title}</h1></div>
        </div>
        <div className="header-actions"><time className="header-date" dateTime={new Date().toISOString().slice(0, 10)}>{new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time>{user && ["veterinarian", "farm_aide"].includes(user.role) && <button type="button" className="icon-button notification-button" aria-label={alertCount ? `View ${alertCount} new notification${alertCount === 1 ? "" : "s"}` : "View notifications"} aria-expanded={notificationsOpen} aria-controls="notification-drawer" data-tooltip={alertCount ? `${alertCount} unacknowledged notification${alertCount === 1 ? "" : "s"}` : "Review herd notifications"} onClick={() => setNotificationsOpen((value) => !value)}><Bell size={18} />{alertCount > 0 && <span className="notification-badge" aria-hidden="true">{alertCount > 99 ? "99+" : alertCount}</span>}</button>}<button onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} data-tooltip={dark ? "Use light theme" : "Use dark theme"} className="icon-button shrink-0">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>{user && <button onClick={logout} disabled={loggingOut} aria-label={loggingOut ? "Logging out" : "Log out"} data-tooltip={loggingOut ? "Logging out…" : "Log out"} className="icon-button shrink-0">{loggingOut ? <X size={18} /> : <LogOut size={18} />}</button>}{user && <Link href="/settings" className="header-user" aria-label={`Open profile settings for ${user.display_name}`} data-tooltip="Open profile settings" data-tooltip-align="end"><span className="avatar" aria-hidden="true">{user.display_name.charAt(0).toUpperCase()}</span><span><strong>{user.display_name}</strong><small>{roleLabels[user.role]}</small></span></Link>}</div>
      </header>
      <div className="dashboard-content">{error && <p role="alert" className="panel">{error}</p>}{children}</div>
    </section>
    <NotificationDrawer open={notificationsOpen} onClose={() => setNotificationsOpen(false)} onCountChange={setAlertCount}/>
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {navigation.slice(0, 4).map(([label, Icon, href]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={pathname === href ? "mobile-nav-link mobile-nav-active" : "mobile-nav-link"}><Icon size={21} aria-hidden="true" /><span>{label}</span></Link>)}
      <button onClick={() => setMobileMenu((value) => !value)} className={mobileMenu ? "mobile-nav-link mobile-nav-active" : "mobile-nav-link"} aria-expanded={mobileMenu} aria-controls="mobile-more-menu"><Menu size={21} aria-hidden="true" /><span>More</span></button>
      {mobileMenu && <div id="mobile-more-menu" className="mobile-more-menu"><p className="mobile-more-heading">More</p>{["Overview", "Herd care", "Administration", "Tools"].map((group) => { const items = navigation.slice(4).filter(([, , href]) => linkGroup(href) === group); return items.length ? <section key={group}><p className="mobile-more-heading">{group}</p>{items.map(([label, Icon, href]) => <Link key={href} href={href} className="mobile-more-action"><span><Icon size={18}/>{label}</span></Link>)}</section> : null; })}<div className="mobile-more-divider" /><button onClick={toggleTheme} className="mobile-more-action"><span>{dark ? <Sun size={18} /> : <Moon size={18} />}Appearance</span><small>{dark ? "Dark" : "Light"}</small></button><button onClick={logout} disabled={loggingOut} className="mobile-more-action mobile-more-danger"><span>{loggingOut ? <X size={18} /> : <LogOut size={18} />} {loggingOut ? "Leaving…" : "Log out"}</span></button></div>}
    </nav>
  </main>;
}