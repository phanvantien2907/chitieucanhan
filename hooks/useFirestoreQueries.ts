"use client";

import { useQuery } from "@tanstack/react-query";

import { memoryCache } from "@/lib/cache";
import { queryKeys } from "@/lib/query-keys";
import { measureAsync } from "@/lib/perf";
import { getCategories, type CategoryDoc } from "@/services/category.service";
import { getDebts, type DebtDoc } from "@/services/debt.service";
import { getExpenses, type ExpenseDoc } from "@/services/expense.service";
import { getSavings, type SavingDoc } from "@/services/savings.service";

const STALE_MS = 5 * 60 * 1000;
const GC_MS = 10 * 60 * 1000;

function disabledKey(name: string) {
  return ["firestore", name, "disabled"] as const;
}

/** Full list — charts, aggregates, real-time sync target. */
export function useFirestoreAllExpensesQuery(uid: string | null) {
  return useQuery({
    queryKey: uid ? queryKeys.expensesAll(uid) : disabledKey("expenses-all"),
    queryFn: async (): Promise<ExpenseDoc[]> => {
      if (!uid) return [];
      return measureAsync("expenses-all", () => getExpenses(uid));
    },
    enabled: !!uid,
    staleTime: STALE_MS,
    gcTime: GC_MS,
    refetchOnWindowFocus: false,
    placeholderData: (): ExpenseDoc[] | undefined =>
      uid ? memoryCache.get<ExpenseDoc[]>(`expenses:${uid}:all`) : undefined,
  });
}

export function useFirestoreCategoriesQuery(uid: string | null) {
  return useQuery({
    queryKey: uid ? queryKeys.categories(uid) : disabledKey("categories"),
    queryFn: async (): Promise<CategoryDoc[]> => {
      if (!uid) return [];
      return measureAsync("categories", () => getCategories(uid));
    },
    enabled: !!uid,
    staleTime: STALE_MS,
    gcTime: GC_MS,
    refetchOnWindowFocus: false,
    placeholderData: (): CategoryDoc[] | undefined =>
      uid ? memoryCache.get<CategoryDoc[]>(`categories:${uid}`) : undefined,
  });
}

export function useFirestoreSavingsQuery(uid: string | null) {
  return useQuery({
    queryKey: uid ? queryKeys.savings(uid) : disabledKey("savings"),
    queryFn: async (): Promise<SavingDoc[]> => {
      if (!uid) return [];
      return measureAsync("savings", () => getSavings(uid));
    },
    enabled: !!uid,
    staleTime: STALE_MS,
    gcTime: GC_MS,
    refetchOnWindowFocus: false,
    placeholderData: (): SavingDoc[] | undefined =>
      uid ? memoryCache.get<SavingDoc[]>(`savings:${uid}`) : undefined,
  });
}

export function useFirestoreDebtsQuery(uid: string | null) {
  return useQuery({
    queryKey: uid ? queryKeys.debts(uid) : disabledKey("debts"),
    queryFn: async (): Promise<DebtDoc[]> => {
      if (!uid) return [];
      return measureAsync("debts", () => getDebts(uid));
    },
    enabled: !!uid,
    staleTime: STALE_MS,
    gcTime: GC_MS,
    refetchOnWindowFocus: false,
    placeholderData: (): DebtDoc[] | undefined =>
      uid ? memoryCache.get<DebtDoc[]>(`debts:${uid}`) : undefined,
  });
}
