import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function UsersLayout({ children }: { children: ReactNode }) {
  return <DashboardShell title="Manage users" eyebrow="Administration">{children}</DashboardShell>;
}
