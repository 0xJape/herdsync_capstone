"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/lib/auth";

export function useCurrentRole() {
  const [role, setRole] = useState<Role | null>(null);
  useEffect(() => { fetch("/api/auth/me").then((response) => response.ok ? response.json() : null).then((user) => setRole(user?.role ?? null)).catch(() => null); }, []);
  useEffect(() => { if (role) document.documentElement.dataset.role = role; }, [role]);
  return role;
}
