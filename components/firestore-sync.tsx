"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { memoryCache } from "@/lib/cache";
import { queryKeys } from "@/lib/query-keys";
import { subscribeCategories } from "@/services/category.service";
import { subscribeDebts } from "@/services/debt.service";
import { subscribeExpenses } from "@/services/expense.service";
import { subscribeSavings } from "@/services/savings.service";

/**
 * Single set of Firestore listeners per signed-in user; updates TanStack Query cache
 * so all hooks share one subscription per collection (deduplicated).
 */
export function FirestoreSync() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const qc = useQueryClient();
  const prevUid = useRef<string | null>(null);

  useEffect(() => {
    if (prevUid.current !== uid) {
      if (prevUid.current != null) {
        qc.removeQueries({ queryKey: queryKeys.firestoreRoot });
        memoryCache.clear();
      }
      prevUid.current = uid;
    }
    if (!uid) {
      return;
    }

    const u1 = subscribeExpenses(
      uid,
      (data) => {
        qc.setQueryData(queryKeys.expenses(uid), data);
        memoryCache.set(`expenses:${uid}`, data);
      },
      (err) => toast.error(err.message || "Không thể tải chi tiêu.")
    );
    const u2 = subscribeCategories(
      uid,
      (data) => {
        qc.setQueryData(queryKeys.categories(uid), data);
        memoryCache.set(`categories:${uid}`, data);
      },
      (err) => toast.error(err.message || "Không thể tải danh mục.")
    );
    const u3 = subscribeSavings(
      uid,
      (data) => {
        qc.setQueryData(queryKeys.savings(uid), data);
        memoryCache.set(`savings:${uid}`, data);
      },
      (err) => toast.error(err.message || "Không thể tải tiết kiệm.")
    );
    const u4 = subscribeDebts(
      uid,
      (data) => {
        qc.setQueryData(queryKeys.debts(uid), data);
        memoryCache.set(`debts:${uid}`, data);
      },
      (err) => toast.error(err.message || "Không thể tải khoản nợ.")
    );

    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, [uid, qc]);

  return null;
}
