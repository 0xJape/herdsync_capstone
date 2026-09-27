import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { ReactNode } from "react";

export default function BreedingLayout({ children }: { children: ReactNode }) {
  return <DashboardShell title="Breeding" eyebrow="Herd management">{children}</DashboardShell>;
}
