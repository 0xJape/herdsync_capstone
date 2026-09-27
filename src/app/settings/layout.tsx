import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <DashboardShell title="Settings" eyebrow="Administration">{children}</DashboardShell>;
}
