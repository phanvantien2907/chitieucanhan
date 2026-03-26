import type { CategoryDoc } from "@/services/category.service";
import type { ExpenseDoc } from "@/services/expense.service";

export type AnalyticsViewMode = "month" | "year";

export type MonthPoint = {
  monthKey: string;
  label: string;
  total: number;
};

export type DayPoint = {
  key: string;
  label: string;
  total: number;
};

export type CategorySlice = {
  name: string;
  value: number;
};

/** Format for tooltips (full VND). */
export function formatVndFull(value: number): string {
  return `${value.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} ₫`;
}

/** Compact axis labels. */
export function formatVndCompact(value: number): string {
  const n = Math.abs(value);
  if (n >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (n >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(value / 1_000).toFixed(0)}k`;
  }
  return String(Math.round(value));
}

export function monthKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const [ys, ms] = key.split("-");
  const year = Number(ys);
  const month = Number(ms);
  return {
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    month: Number.isFinite(month) ? month : 1,
  };
}

export function currentMonthKey(): string {
  return monthKeyFromDate(new Date());
}

export function currentYear(): number {
  return new Date().getFullYear();
}

export function isActiveExpense(e: ExpenseDoc): boolean {
  return e.deletedAt == null;
}

export function expenseMonthKey(e: ExpenseDoc): string | null {
  if (!e.createdAt?.toDate) {
    return null;
  }
  return monthKeyFromDate(e.createdAt.toDate());
}

export function activeExpenses(expenses: ExpenseDoc[]): ExpenseDoc[] {
  return expenses.filter(isActiveExpense);
}

export function sumExpensesInMonth(
  expenses: ExpenseDoc[],
  monthKey: string
): number {
  return activeExpenses(expenses)
    .filter((e) => expenseMonthKey(e) === monthKey)
    .reduce((s, e) => s + e.amount, 0);
}

/** Sum for calendar month range (inclusive) by createdAt. */
export function sumExpensesInYear(expenses: ExpenseDoc[], year: number): number {
  return activeExpenses(expenses).reduce((s, e) => {
    const d = e.createdAt?.toDate();
    if (!d || d.getFullYear() !== year) {
      return s;
    }
    return s + e.amount;
  }, 0);
}

export function countExpensesInMonth(
  expenses: ExpenseDoc[],
  monthKey: string
): number {
  return activeExpenses(expenses).filter((e) => expenseMonthKey(e) === monthKey)
    .length;
}

/** Previous calendar month key from a given YYYY-MM. */
export function previousMonthKey(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  const d = new Date(year, month - 2, 1);
  return monthKeyFromDate(d);
}

/** Previous year. */
export function previousYear(year: number): number {
  return year - 1;
}

/**
 * Percent change: `null` if both zero or previous zero and current zero (no signal).
 */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? null : 100;
  }
  return ((current - previous) / previous) * 100;
}

/** Last `count` month keys ending at `anchorMonthKey` (oldest → newest). */
export function buildMonthKeysEndingAt(
  anchorMonthKey: string,
  count: number
): string[] {
  const { year, month } = parseMonthKey(anchorMonthKey);
  const start = new Date(year, month - 1 - (count - 1), 1);
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    const cur = new Date(start.getFullYear(), start.getMonth() + i, 1);
    keys.push(monthKeyFromDate(cur));
  }
  return keys;
}

function shortMonthLabel(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  return `${String(month).padStart(2, "0")}/${String(year).slice(2)}`;
}

export function buildBarSeriesLast12Months(
  expenses: ExpenseDoc[],
  anchorMonthKey: string
): MonthPoint[] {
  const keys = buildMonthKeysEndingAt(anchorMonthKey, 12);
  return keys.map((k) => ({
    monthKey: k,
    label: shortMonthLabel(k),
    total: sumExpensesInMonth(expenses, k),
  }));
}

export function buildBarSeriesYear(
  expenses: ExpenseDoc[],
  year: number
): MonthPoint[] {
  const points: MonthPoint[] = [];
  for (let m = 1; m <= 12; m++) {
    const k = `${year}-${String(m).padStart(2, "0")}`;
    points.push({
      monthKey: k,
      label: `T${m}`,
      total: sumExpensesInMonth(expenses, k),
    });
  }
  return points;
}

export function buildDailySeriesInMonth(
  expenses: ExpenseDoc[],
  monthKey: string
): DayPoint[] {
  const { year, month } = parseMonthKey(monthKey);
  const daysInMonth = new Date(year, month, 0).getDate();
  const byDay = new Map<number, number>();
  for (let d = 1; d <= daysInMonth; d++) {
    byDay.set(d, 0);
  }
  for (const e of activeExpenses(expenses)) {
    if (expenseMonthKey(e) !== monthKey) {
      continue;
    }
    const dt = e.createdAt?.toDate();
    if (!dt) {
      continue;
    }
    const day = dt.getDate();
    byDay.set(day, (byDay.get(day) ?? 0) + e.amount);
  }
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return {
      key: `${monthKey}-${String(d).padStart(2, "0")}`,
      label: String(d),
      total: byDay.get(d) ?? 0,
    };
  });
}

/** Cumulative sum over monthly points (YTD line). */
export function buildCumulativeFromMonthly(points: MonthPoint[]): {
  label: string;
  total: number;
}[] {
  let acc = 0;
  return points.map((p) => {
    acc += p.total;
    return { label: p.label, total: acc };
  });
}

export function aggregateByCategory(
  expenses: ExpenseDoc[],
  categories: CategoryDoc[],
  filter:
    | { type: "month"; monthKey: string }
    | { type: "year"; year: number }
): CategorySlice[] {
  const nameById = new Map(
    categories
      .filter((c) => c.deletedAt == null)
      .map((c) => [c.id, c.name] as const)
  );

  let list = activeExpenses(expenses);
  if (filter.type === "month") {
    list = list.filter((e) => expenseMonthKey(e) === filter.monthKey);
  } else {
    list = list.filter((e) => {
      const d = e.createdAt?.toDate();
      return d && d.getFullYear() === filter.year;
    });
  }

  const sums = new Map<string, number>();
  for (const e of list) {
    const name = nameById.get(e.categoryId) ?? "Khác";
    sums.set(name, (sums.get(name) ?? 0) + e.amount);
  }
  return Array.from(sums.entries())
    .map(([name, value]) => ({ name, value }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** Calendar month window for stats (current month vs previous). */
export function calendarMonthBounds(
  ref: Date = new Date()
): { monthKey: string; prevMonthKey: string } {
  const monthKey = monthKeyFromDate(ref);
  const prev = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  return { monthKey, prevMonthKey: monthKeyFromDate(prev) };
}

export function activeCategoryCount(categories: CategoryDoc[]): number {
  return categories.filter((c) => c.deletedAt == null).length;
}
