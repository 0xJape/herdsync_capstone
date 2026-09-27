import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function AlertsLayout({ children }: { children: ReactNode }) {
  return <DashboardShell title="Alerts" eyebrow="Operations">{children}</DashboardShell>;
}
