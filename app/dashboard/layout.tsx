import type { ReactNode } from "react";

import { DashboardAuthGate } from "@/components/layout/dashboard-auth-gate";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DashboardAuthGate>
      <DashboardShell>{children}</DashboardShell>
    </DashboardAuthGate>
  );
}
