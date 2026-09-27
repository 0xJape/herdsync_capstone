import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function LivestockLayout({ children }: { children: ReactNode }) {
  return <DashboardShell title="Cattle" eyebrow="Herd management">{children}</DashboardShell>;
}
