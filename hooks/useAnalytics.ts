"use client";

import { useCallback, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import {
  useFirestoreAllExpensesQuery,
  useFirestoreCategoriesQuery,
  useFirestoreSavingsQuery,
} from "@/hooks/useFirestoreQueries";
import {
  aggregateByCategory,
  buildBarSeriesLast12Months,
  buildBarSeriesYear,
  buildCumulativeFromMonthly,
  buildDailySeriesInMonth,
  calendarMonthBounds,
  countExpensesInMonth,
  currentMonthKey,
  currentYear,
  type AnalyticsViewMode,
  type CategorySlice,
  type MonthPoint,
  pctChange,
  previousMonthKey,
  previousYear,
  sumExpensesInMonth,
  sumExpensesInYear,
} from "@/services/analytics.service";
import type { CategoryDoc } from "@/services/category.service";
import {
  expenseOccurrenceMs,
  type ExpenseDoc,
} from "@/services/expense.service";
import { getSavingBalance, type SavingDoc } from "@/services/savings.service";

function activeSavingsTotal(savings: SavingDoc[]): number {
  return savings
    .filter((s) => s.deletedAt == null)
    .reduce((acc, row) => acc + getSavingBalance(row), 0);
}

const RECENT_EXPENSES_LIMIT = 5;

export type RecentExpenseRow = {
  id: string;
  expense: ExpenseDoc;
  categoryName: string | null;
};

function generateMonthOptions(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return keys;
}

function generateYearOptions(): number[] {
  const y = currentYear();
  return Array.from({ length: 5 }, (_, i) => y - i);
}

export function useAnalytics() {
  const { user, isLoading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const expensesQuery = useFirestoreAllExpensesQuery(uid);
  const categoriesQuery = useFirestoreCategoriesQuery(uid);
  const savingsQuery = useFirestoreSavingsQuery(uid);

  const expenses = expensesQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const savings = savingsQuery.data ?? [];

  const [viewMode, setViewMode] = useState<AnalyticsViewMode>("month");
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const yearOptions = useMemo(() => generateYearOptions(), []);

  const dataLoading =
    !!uid &&
    (expensesQuery.isPending ||
      categoriesQuery.isPending ||
      savingsQuery.isPending);

  const barSeries = useMemo((): MonthPoint[] => {
    if (viewMode === "month") {
      return buildBarSeriesLast12Months(expenses, selectedMonthKey);
    }
    return buildBarSeriesYear(expenses, selectedYear);
  }, [expenses, viewMode, selectedMonthKey, selectedYear]);

  const lineSeries = useMemo((): Array<{ label: string; total: number }> => {
    if (viewMode === "month") {
      return buildDailySeriesInMonth(expenses, selectedMonthKey);
    }
    const monthly = buildBarSeriesYear(expenses, selectedYear);
    return buildCumulativeFromMonthly(monthly);
  }, [expenses, viewMode, selectedMonthKey, selectedYear]);

  const pieSeries = useMemo((): CategorySlice[] => {
    if (viewMode === "month") {
      return aggregateByCategory(expenses, categories, {
        type: "month",
        monthKey: selectedMonthKey,
      });
    }
    return aggregateByCategory(expenses, categories, {
      type: "year",
      year: selectedYear,
    });
  }, [expenses, categories, viewMode, selectedMonthKey, selectedYear]);

  const stats = useMemo(() => {
    const { monthKey, prevMonthKey } = calendarMonthBounds();
    const thisMonth = sumExpensesInMonth(expenses, monthKey);
    const lastMonth = sumExpensesInMonth(expenses, prevMonthKey);
    const change = pctChange(thisMonth, lastMonth);
    return {
      calendarMonthKey: monthKey,
      prevCalendarMonthKey: prevMonthKey,
      expenseThisCalendarMonth: thisMonth,
      expenseLastCalendarMonth: lastMonth,
      monthExpenseChangePct: change,
      expenseCountThisMonth: countExpensesInMonth(expenses, monthKey),
      savingsTotal: activeSavingsTotal(savings),
    };
  }, [expenses, savings]);

  const comparisonLabel = useMemo(() => {
    if (viewMode === "month") {
      const cur = sumExpensesInMonth(expenses, selectedMonthKey);
      const prev = sumExpensesInMonth(
        expenses,
        previousMonthKey(selectedMonthKey)
      );
      return {
        current: cur,
        previous: prev,
        pct: pctChange(cur, prev),
      };
    }
    const cur = sumExpensesInYear(expenses, selectedYear);
    const prev = sumExpensesInYear(expenses, previousYear(selectedYear));
    return {
      current: cur,
      previous: prev,
      pct: pctChange(cur, prev),
    };
  }, [expenses, viewMode, selectedMonthKey, selectedYear]);

  const chartsEmpty = useMemo(
    () => barSeries.every((p) => p.total === 0),
    [barSeries]
  );

  const recentExpenseRows = useMemo((): RecentExpenseRow[] => {
    const nameById = new Map(
      categories
        .filter((c: CategoryDoc) => c.deletedAt == null)
        .map((c) => [c.id, c.name] as const)
    );
    const active = expenses
      .filter((e) => e.deletedAt == null)
      .sort((a, b) => expenseOccurrenceMs(b) - expenseOccurrenceMs(a))
      .slice(0, RECENT_EXPENSES_LIMIT);
    return active.map((e) => ({
      id: e.id,
      expense: e,
      categoryName: nameById.get(e.categoryId) ?? null,
    }));
  }, [expenses, categories]);

  const resetFiltersToCurrent = useCallback(() => {
    setViewMode("month");
    setSelectedMonthKey(currentMonthKey());
    setSelectedYear(currentYear());
  }, []);

  const loading = authLoading || dataLoading;

  const recentExpensesEmpty =
    !loading && recentExpenseRows.length === 0;

  return {
    uid,
    loading,
    viewMode,
    setViewMode,
    selectedMonthKey,
    setSelectedMonthKey,
    selectedYear,
    setSelectedYear,
    monthOptions,
    yearOptions,
    barSeries,
    lineSeries,
    lineIsDaily: viewMode === "month",
    pieSeries,
    stats,
    comparisonLabel,
    chartsEmpty,
    recentExpenseRows,
    recentExpensesEmpty,
    resetFiltersToCurrent,
  };
}
