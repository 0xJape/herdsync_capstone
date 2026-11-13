import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return <DashboardShell title="Analytics" eyebrow="Decision Support">{children}</DashboardShell>;
}
