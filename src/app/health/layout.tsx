import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function HealthLayout({ children }: { children: ReactNode }) {
  return <DashboardShell title="Health records" eyebrow="Herd health">{children}</DashboardShell>;
}
