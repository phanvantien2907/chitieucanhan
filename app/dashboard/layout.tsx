import type { ReactNode } from "react";

import { CommandSearch } from "@/components/layout/command-search";
import { DashboardAuthGate } from "@/components/layout/dashboard-auth-gate";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DashboardAuthGate>
      <CommandSearch>
        <DashboardShell>{children}</DashboardShell>
      </CommandSearch>
    </DashboardAuthGate>
  );
}
