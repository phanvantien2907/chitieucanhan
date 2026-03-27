"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
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
import type { ExpenseDoc } from "@/services/expense.service";
import { subscribeCategories } from "@/services/category.service";
import { subscribeExpenses } from "@/services/expense.service";
import type { SavingDoc } from "@/services/savings.service";
import { subscribeSavings } from "@/services/savings.service";

function activeSavingsTotal(savings: SavingDoc[]): number {
  return savings
    .filter((s) => s.deletedAt == null)
    .reduce((s, row) => s + row.amount, 0);
}

function expenseCreatedMs(e: ExpenseDoc): number {
  return e.createdAt?.toMillis?.() ?? 0;
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

  const [expenses, setExpenses] = useState<ExpenseDoc[]>([]);
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [savings, setSavings] = useState<SavingDoc[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [viewMode, setViewMode] = useState<AnalyticsViewMode>("month");
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    if (!uid) {
      setExpenses([]);
      setCategories([]);
      setSavings([]);
      setDataLoading(false);
      return;
    }
    setDataLoading(true);
    let pending = 3;
    const markFirst = () => {
      pending -= 1;
      if (pending <= 0) {
        setDataLoading(false);
      }
    };
    let firstExp = true;
    let firstCat = true;
    let firstSav = true;
    const u1 = subscribeExpenses(
      uid,
      (next) => {
        setExpenses(next);
        if (firstExp) {
          firstExp = false;
          markFirst();
        }
      },
      (err) => {
        toast.error(err.message || "Không thể tải chi tiêu.");
        if (firstExp) {
          firstExp = false;
          markFirst();
        }
      }
    );
    const u2 = subscribeCategories(
      uid,
      (next) => {
        setCategories(next);
        if (firstCat) {
          firstCat = false;
          markFirst();
        }
      },
      (err) => {
        toast.error(err.message || "Không thể tải danh mục.");
        if (firstCat) {
          firstCat = false;
          markFirst();
        }
      }
    );
    const u3 = subscribeSavings(
      uid,
      (next) => {
        setSavings(next);
        if (firstSav) {
          firstSav = false;
          markFirst();
        }
      },
      (err) => {
        toast.error(err.message || "Không thể tải tiết kiệm.");
        if (firstSav) {
          firstSav = false;
          markFirst();
        }
      }
    );
    return () => {
      u1();
      u2();
      u3();
    };
  }, [uid]);

  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const yearOptions = useMemo(() => generateYearOptions(), []);

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
        .filter((c) => c.deletedAt == null)
        .map((c) => [c.id, c.name] as const)
    );
    const active = expenses
      .filter((e) => e.deletedAt == null)
      .sort((a, b) => expenseCreatedMs(b) - expenseCreatedMs(a))
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

  const loading = authLoading || (uid != null && dataLoading);

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
