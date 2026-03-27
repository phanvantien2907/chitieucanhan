"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import {
  computeDebtAnalytics,
  type DebtAnalyticsComputed,
  type DebtDoc,
  subscribeDebts,
} from "@/services/debt.service";

export function useDebtAnalytics() {
  const { user, isLoading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const [debts, setDebts] = useState<DebtDoc[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setDebts([]);
      setDataLoading(false);
      return;
    }
    setDataLoading(true);
    let first = true;
    const unsub = subscribeDebts(
      uid,
      (rows) => {
        setDebts(rows);
        if (first) {
          first = false;
          setDataLoading(false);
        }
      },
      (err) => {
        toast.error(err.message || "Không thể tải dữ liệu nợ.");
        if (first) {
          first = false;
          setDataLoading(false);
        }
      }
    );
    return unsub;
  }, [uid]);

  const analytics = useMemo((): DebtAnalyticsComputed => {
    return computeDebtAnalytics(debts);
  }, [debts]);

  const hasAnyDebt = useMemo(() => {
    return debts.some((d) => d.deletedAt == null);
  }, [debts]);

  const loading = authLoading || (uid != null && dataLoading);

  return {
    uid,
    loading,
    debts,
    analytics,
    hasAnyDebt,
  };
}
