/**
 * Single source of truth for calendar-day bounds used with Firestore `Timestamp.fromDate`.
 * All expense dates and range filters must go through `toStartOfDay` / `toEndOfDay`.
 */

/** 00:00:00.000 on the same calendar day as `date` (local). */
export function toStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 23:59:59.999 on the same calendar day as `date` (local). */
export function toEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** First instant of the calendar month containing `ref` (local month). */
export function getStartOfMonth(ref: Date = new Date()): Date {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  return toStartOfDay(new Date(y, m, 1));
}

/** Last instant of the calendar month containing `ref` (local month). */
export function getEndOfMonth(ref: Date = new Date()): Date {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  return toEndOfDay(new Date(y, m + 1, 0));
}

export type ExpenseTimeFilter =
  | "this_month"
  | "prev_month"
  | "last_3_months"
  | "last_6_months"
  | "last_12_months";

export type ExpenseDateRange = { start: Date; end: Date };

/** Inclusive [start, end] for Firestore `expenseDate` queries (local calendar). */
export function getRangeByFilter(filter: ExpenseTimeFilter): ExpenseDateRange {
  const now = new Date();

  switch (filter) {
    case "this_month":
      return { start: getStartOfMonth(now), end: getEndOfMonth(now) };
    case "prev_month": {
      const ref = new Date(now);
      ref.setMonth(ref.getMonth() - 1);
      return { start: getStartOfMonth(ref), end: getEndOfMonth(ref) };
    }
    case "last_3_months":
    case "last_6_months":
    case "last_12_months": {
      const monthsBack =
        filter === "last_3_months" ? 3 : filter === "last_6_months" ? 6 : 12;
      const startRef = new Date(now);
      startRef.setMonth(startRef.getMonth() - monthsBack);
      return {
        start: toStartOfDay(startRef),
        end: toEndOfDay(now),
      };
    }
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

/** Toolbar label for the active time filter. */
export function getExpenseTimeFilterLabel(
  filter: ExpenseTimeFilter,
  ref: Date = new Date()
): string {
  switch (filter) {
    case "this_month":
      return `Tháng ${ref.getMonth() + 1}/${ref.getFullYear()}`;
    case "prev_month": {
      const p = new Date(ref);
      p.setMonth(p.getMonth() - 1);
      return `Tháng ${p.getMonth() + 1}/${p.getFullYear()}`;
    }
    case "last_3_months":
      return "3 tháng gần nhất";
    case "last_6_months":
      return "6 tháng gần nhất";
    case "last_12_months":
      return "1 năm gần nhất";
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}
