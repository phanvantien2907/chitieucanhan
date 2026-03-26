"use client";

import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { DashboardHeader } from "@/components/layout/header";
import { DashboardSidebar } from "@/components/layout/sidebar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <DashboardSidebar />
      <SidebarInset className="min-h-svh overflow-x-hidden transition-[margin] duration-200 ease-linear">
        <DashboardHeader />
        <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 lg:p-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
