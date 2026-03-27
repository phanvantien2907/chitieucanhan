"use client";

import { useMemo } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useFirestoreDebtsQuery } from "@/hooks/useFirestoreQueries";
import {
  computeDebtAnalytics,
  type DebtAnalyticsComputed,
} from "@/services/debt.service";

export function useDebtAnalytics() {
  const { user, isLoading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const debtsQuery = useFirestoreDebtsQuery(uid);
  const debts = debtsQuery.data ?? [];
  const dataLoading = !!uid && debtsQuery.isPending;

  const analytics = useMemo((): DebtAnalyticsComputed => {
    return computeDebtAnalytics(debts);
  }, [debts]);

  const hasAnyDebt = useMemo(() => {
    return debts.some((d) => d.deletedAt == null);
  }, [debts]);

  const loading = authLoading || dataLoading;

  return {
    uid,
    loading,
    debts,
    analytics,
    hasAnyDebt,
  };
}
