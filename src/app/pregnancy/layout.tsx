import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { ReactNode } from "react";

export default function PregnancyLayout({ children }: { children: ReactNode }) {
  return <DashboardShell title="Pregnancy" eyebrow="Herd management">{children}</DashboardShell>;
}
