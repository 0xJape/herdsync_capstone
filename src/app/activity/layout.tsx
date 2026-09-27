import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function ActivityLayout({ children }: { children: ReactNode }) {
  return <DashboardShell title="Activity" eyebrow="Operations">{children}</DashboardShell>;
}
