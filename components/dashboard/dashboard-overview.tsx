"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, Filter, PieChart } from "lucide-react";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { SavingsPinDialog } from "@/components/savings/pin-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useDebtAnalytics } from "@/hooks/useDebtAnalytics";
import { usePinStatus } from "@/hooks/useSecurity";
import {
  clearDashboardReceivableUnlockedCookie,
  isDashboardReceivableUnlockedCookie,
  setDashboardReceivableUnlockedCookie,
} from "@/lib/dashboard-receivable-pin-session";
import {
  clearDashboardSavingsUnlockedCookie,
  isDashboardSavingsUnlockedCookie,
  setDashboardSavingsUnlockedCookie,
} from "@/lib/dashboard-savings-pin-session";
import { computeDebtAnalyticsForCharts } from "@/services/debt.service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  parseMonthKey,
  previousMonthKey,
  type AnalyticsViewMode,
} from "@/services/analytics.service";

const ChartExpense = dynamic(
  () =>
    import("@/components/dashboard/chart-expense").then((m) => m.ChartExpense),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-6">
        <Skeleton className="h-[min(50vh,280px)] w-full rounded-xl" />
        <Skeleton className="h-[min(50vh,280px)] w-full rounded-xl" />
      </div>
    ),
  }
);

const ChartCategory = dynamic(
  () =>
    import("@/components/dashboard/chart-category").then((m) => m.ChartCategory),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-[min(50vh,280px)] w-full rounded-xl" />
    ),
  }
);

const DebtChart = dynamic(
  () => import("@/components/dashboard/debt-chart").then((m) => m.DebtChart),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </div>
    ),
  }
);

const DebtSummary = dynamic(
  () =>
    import("@/components/dashboard/debt-summary").then((m) => m.DebtSummary),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    ),
  }
);

const RecentExpensesTable = dynamic(
  () =>
    import("@/components/dashboard/recent-expenses-table").then(
      (m) => m.RecentExpensesTable
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full rounded-xl" />,
  }
);

function monthOptionLabel(key: string): string {
  const { year, month } = parseMonthKey(key);
  return `Tháng ${month}/${year}`;
}

export function DashboardOverview() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const { hasPin, pinLoading } = usePinStatus(uid);
  const [savingsUnlocked, setSavingsUnlocked] = useState(false);
  const [receivableUnlocked, setReceivableUnlocked] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [receivablePinDialogOpen, setReceivablePinDialogOpen] = useState(false);

  useEffect(() => {
    if (!uid) {
      clearDashboardSavingsUnlockedCookie();
      clearDashboardReceivableUnlockedCookie();
      setSavingsUnlocked(false);
      setReceivableUnlocked(false);
      return;
    }
    setSavingsUnlocked(isDashboardSavingsUnlockedCookie());
    setReceivableUnlocked(isDashboardReceivableUnlockedCookie());
  }, [uid]);

  const {
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
    lineIsDaily,
    pieSeries,
    stats,
    comparisonLabel,
    chartsEmpty,
    recentExpenseRows,
    recentExpensesEmpty,
    resetFiltersToCurrent,
  } = useAnalytics();

  const { loading: debtLoading, analytics: debtAnalytics, hasAnyDebt, debts } =
    useDebtAnalytics();

  const receivableSensitive =
    !debtLoading && debtAnalytics.pendingReceivable > 0;

  const receivableDisplayValue = useMemo((): number | null => {
    if (debtLoading) return null;
    if (debtAnalytics.pendingReceivable === 0) return 0;
    if (pinLoading) return null;
    if (hasPin && receivableUnlocked) return debtAnalytics.pendingReceivable;
    return null;
  }, [
    debtLoading,
    debtAnalytics.pendingReceivable,
    pinLoading,
    hasPin,
    receivableUnlocked,
  ]);

  const chartAnalytics = useMemo(
    () => computeDebtAnalyticsForCharts(debts, receivableUnlocked),
    [debts, receivableUnlocked]
  );

  const barTitle =
    viewMode === "month"
      ? "Chi tiêu 12 tháng gần nhất"
      : `Chi tiêu theo tháng — ${selectedYear}`;
  const lineTitle =
    viewMode === "month"
      ? `Xu hướng theo ngày — ${monthOptionLabel(selectedMonthKey)}`
      : `Lũy kế trong năm ${selectedYear}`;
  const lineDescription =
    viewMode === "month"
      ? "Tổng chi mỗi ngày trong tháng đã chọn"
      : "Tổng chi lũy kế từ tháng 1 đến tháng 12";

  const pieTitle =
    viewMode === "month"
      ? `Theo danh mục — ${monthOptionLabel(selectedMonthKey)}`
      : `Theo danh mục — năm ${selectedYear}`;

  const pieDescription =
    viewMode === "month"
      ? "Phân bổ chi tiêu trong tháng"
      : "Phân bổ chi tiêu trong năm";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Tổng quan
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Theo dõi chi tiêu, tiết kiệm và danh mục trong một nơi.
        </p>
      </div>

      <StatsCards
        stats={{ ...stats, loading }}
        savingsPin={
          uid
            ? {
                pinLoading,
                hasPin,
                unlocked: savingsUnlocked,
                onRequestUnlock: () => setPinDialogOpen(true),
              }
            : undefined
        }
      />

      {uid && !debtLoading && !hasAnyDebt ? (
        <Card className="rounded-xl border border-dashed shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight">
              Tình hình nợ
            </CardTitle>
            <CardDescription>Không có dữ liệu nợ</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {uid && (debtLoading || hasAnyDebt) ? (
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">
              Tình hình nợ
            </h2>
            <DebtSummary
              loading={debtLoading}
              pendingPayable={debtAnalytics.pendingPayable}
              paidTotal={debtAnalytics.paidTotal}
              receivableSensitive={receivableSensitive}
              receivablePin={{
                pinLoading,
                hasPin,
                unlocked: receivableUnlocked,
                displayValue: receivableDisplayValue,
                onRequestUnlock: () => setReceivablePinDialogOpen(true),
              }}
            />
          </div>
          <DebtChart
            loading={debtLoading}
            analytics={chartAnalytics}
            chartsReceivableMasked={
              receivableSensitive && !receivableUnlocked
            }
          />
        </div>
      ) : null}

      {uid ? (
        <>
          <SavingsPinDialog
            open={pinDialogOpen}
            onOpenChange={setPinDialogOpen}
            dismissible
            mode="verify"
            uid={uid}
            verifyInputId="dashboard-savings-pin"
            onVerified={() => {
              setDashboardSavingsUnlockedCookie();
              setSavingsUnlocked(true);
              setPinDialogOpen(false);
            }}
          />
          <SavingsPinDialog
            open={receivablePinDialogOpen}
            onOpenChange={setReceivablePinDialogOpen}
            dismissible
            mode="verify"
            uid={uid}
            verifyInputId="dashboard-receivable-pin"
            verifyDescription="Nhập mã PIN để xem số phải thu (người khác nợ bạn)."
            onVerified={() => {
              setDashboardReceivableUnlockedCookie();
              setReceivableUnlocked(true);
              setReceivablePinDialogOpen(false);
            }}
          />
        </>
      ) : null}

      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Filter className="size-4" aria-hidden />
              Bộ lọc biểu đồ
            </CardTitle>
            <CardDescription>
              So sánh kỳ:{" "}
              <span className="text-foreground font-medium tabular-nums">
                {viewMode === "month"
                  ? `${monthOptionLabel(selectedMonthKey)} so với ${monthOptionLabel(previousMonthKey(selectedMonthKey))}`
                  : `${selectedYear} so với ${selectedYear - 1}`}
              </span>
              {comparisonLabel.pct != null && (
                <span
                  className={
                    comparisonLabel.pct <= 0
                      ? " ml-1 text-emerald-600 dark:text-emerald-400"
                      : " ml-1 text-red-600 dark:text-red-400"
                  }
                >
                  (
                  {comparisonLabel.pct >= 0 ? "+" : ""}
                  {comparisonLabel.pct.toLocaleString("vi-VN", {
                    maximumFractionDigits: 1,
                  })}
                  %)
                </span>
              )}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full cursor-pointer shrink-0 sm:w-auto"
            onClick={resetFiltersToCurrent}
          >
            Tháng hiện tại
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="view-mode">Xem theo</Label>
            <Select
              value={viewMode}
              onValueChange={(v) => setViewMode(v as AnalyticsViewMode)}
            >
              <SelectTrigger id="view-mode" className="h-10 w-full cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month" className="cursor-pointer">
                  Tháng
                </SelectItem>
                <SelectItem value="year" className="cursor-pointer">
                  Năm
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {viewMode === "month" ? (
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="pick-month">Chọn tháng</Label>
              <Select
                value={selectedMonthKey}
                onValueChange={setSelectedMonthKey}
              >
                <SelectTrigger id="pick-month" className="h-10 w-full cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((k) => (
                    <SelectItem key={k} value={k} className="cursor-pointer">
                      {monthOptionLabel(k)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="pick-year">Chọn năm</Label>
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(Number(v))}
              >
                <SelectTrigger id="pick-year" className="h-10 w-full cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem
                      key={y}
                      value={String(y)}
                      className="cursor-pointer"
                    >
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="size-4" aria-hidden />
            Chi tiêu & xu hướng
          </div>
          <ChartExpense
            loading={loading}
            barData={barSeries}
            lineData={lineSeries}
            lineIsDaily={lineIsDaily}
            barTitle={barTitle}
            lineTitle={lineTitle}
            lineDescription={lineDescription}
            empty={chartsEmpty}
          />
        </div>
        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <PieChart className="size-4" aria-hidden />
            Cơ cấu chi tiêu
          </div>
          <ChartCategory
            loading={loading}
            data={pieSeries}
            title={pieTitle}
            description={pieDescription}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-5">
          <RecentExpensesTable
            rows={recentExpenseRows}
            loading={loading}
            isEmpty={recentExpensesEmpty}
          />
        </div>
      </div>
    </div>
  );
}
