"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardAuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
        <Skeleton className="h-9 w-48 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="h-32 w-full max-w-md rounded-xl" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
