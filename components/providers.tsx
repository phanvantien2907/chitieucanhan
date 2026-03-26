"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={0} skipDelayDuration={0}>
        {children}
        <Toaster richColors position="top-right" closeButton />
      </TooltipProvider>
    </ThemeProvider>
  );
}
