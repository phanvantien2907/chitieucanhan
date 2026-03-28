"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import {
  useFirestoreAllExpensesQuery,
  useFirestoreCategoriesQuery,
} from "@/hooks/useFirestoreQueries";
import {
  getExpenseTimeFilterLabel,
  getRangeByFilter,
  toEndOfDay,
  toStartOfDay,
  type ExpenseTimeFilter,
} from "@/lib/date";
import { buildCategorySelectOptions } from "@/services/category.service";
import { expenseOccurrenceMs, type ExpenseDoc } from "@/services/expense.service";

export type ExpenseFilterMode = "newest" | "deleted" | "active";

const PAGE_SIZE = 5;

function sortByExpenseDateDesc(a: ExpenseDoc, b: ExpenseDoc): number {
  return expenseOccurrenceMs(b) - expenseOccurrenceMs(a);
}

function msDeleted(ts: ExpenseDoc["deletedAt"]): number {
  return ts?.toMillis?.() ?? 0;
}

/** Same instant used for sorting / display (expenseDate or legacy createdAt). */
function occurrenceMsForRange(e: ExpenseDoc): number {
  return e.expenseDate?.toMillis?.() ?? e.createdAt?.toMillis?.() ?? 0;
}

export function useExpenses() {
  const { user, isLoading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const [timeFilter, setTimeFilter] = useState<ExpenseTimeFilter>("this_month");
  const allExpensesQuery = useFirestoreAllExpensesQuery(uid);
  const categoriesQuery = useFirestoreCategoriesQuery(uid);

  const allExpensesRaw = allExpensesQuery.data ?? [];
  const allCategories = categoriesQuery.data ?? [];

  const expensesLoading = !!uid && allExpensesQuery.isPending;
  const categoriesLoading = !!uid && categoriesQuery.isPending;

  const timeFilterLabel = useMemo(
    () => getExpenseTimeFilterLabel(timeFilter),
    [timeFilter]
  );

  /** Client-filter by time range (same bounds as lib/date; avoids Firestore composite-index misses). */
  const rangeFilteredExpenses = useMemo(() => {
    const { start, end } = getRangeByFilter(timeFilter);
    const t0 = toStartOfDay(start).getTime();
    const t1 = toEndOfDay(end).getTime();
    return allExpensesRaw.filter((e) => {
      const ms = occurrenceMsForRange(e);
      return ms > 0 && ms >= t0 && ms <= t1;
    });
  }, [allExpensesRaw, timeFilter]);

  const [filter, setFilter] = useState<ExpenseFilterMode>("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [filter, timeFilter]);

  const activeCategories = useMemo(
    () => allCategories.filter((c) => c.deletedAt == null),
    [allCategories]
  );

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of allCategories) {
      m.set(c.id, c.name);
    }
    return m;
  }, [allCategories]);

  const categorySelectOptions = useMemo(
    () => buildCategorySelectOptions(activeCategories),
    [activeCategories]
  );

  const filteredSorted = useMemo(() => {
    let list = [...rangeFilteredExpenses];

    switch (filter) {
      case "active":
        list = list.filter((e) => e.deletedAt == null);
        list.sort(sortByExpenseDateDesc);
        break;
      case "deleted":
        list = list.filter((e) => e.deletedAt != null);
        list.sort((a, b) => msDeleted(b.deletedAt) - msDeleted(a.deletedAt));
        break;
      case "newest":
      default:
        list.sort(sortByExpenseDateDesc);
        break;
    }

    return list;
  }, [rangeFilteredExpenses, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredSorted.slice(start, start + PAGE_SIZE);
  }, [filteredSorted, page]);

  const goPrev = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const goNext = useCallback(() => {
    setPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const loading = authLoading || expensesLoading;
  const categoriesLoadingState = authLoading || categoriesLoading;

  return {
    uid,
    expenses: paginated,
    allCount: rangeFilteredExpenses.length,
    filteredCount: filteredSorted.length,
    totalPages,
    page,
    pageSize: PAGE_SIZE,
    loading,
    categoriesLoading: categoriesLoadingState,
    filter,
    setFilter,
    timeFilter,
    setTimeFilter,
    timeFilterLabel,
    setPage,
    goPrev,
    goNext,
    activeCategories,
    categoryNameById,
    categorySelectOptions,
    isEmpty: !expensesLoading && filteredSorted.length === 0,
  };
}
