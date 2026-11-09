import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { ReactNode } from "react";

export default function ReproductionLayout({ children }: { children: ReactNode }) {
  return <DashboardShell title="Reproduction" eyebrow="Herd management">{children}</DashboardShell>;
}