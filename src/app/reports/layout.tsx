import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return <DashboardShell title="Reports" eyebrow="Operations">{children}</DashboardShell>;
}
