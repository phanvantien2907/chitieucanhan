"use client";

import Link from "next/link";
import { KeyRound, PiggyBank, Receipt, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatVndFull } from "@/services/analytics.service";

export type DashboardStats = {
  loading: boolean;
  expenseThisCalendarMonth: number;
  expenseLastCalendarMonth: number;
  monthExpenseChangePct: number | null;
  expenseCountThisMonth: number;
  savingsTotal: number;
};

export type SavingsPinVisibility = {
  pinLoading: boolean;
  hasPin: boolean;
  unlocked: boolean;
  onRequestUnlock: () => void;
};

/** Chi tiêu giảm so với tháng trước → tốt (xanh). */
function formatExpenseDelta(pct: number | null): { text: string; good: boolean } {
  if (pct == null) {
    return { text: "Chưa có so sánh", good: true };
  }
  const up = pct > 0;
  const abs = Math.abs(pct).toLocaleString("vi-VN", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
  return {
    text: `${up ? "+" : "−"}${abs}%`,
    good: !up,
  };
}

export function StatsCards({
  stats,
  savingsPin,
}: {
  stats: DashboardStats;
  savingsPin?: SavingsPinVisibility;
}) {
  const {
    loading,
    expenseThisCalendarMonth,
    expenseLastCalendarMonth,
    monthExpenseChangePct,
    expenseCountThisMonth,
    savingsTotal,
  } = stats;

  const delta = formatExpenseDelta(monthExpenseChangePct);

  const deltaPctClass =
    monthExpenseChangePct == null
      ? "text-muted-foreground"
      : delta.good
        ? "font-medium text-emerald-600 dark:text-emerald-400"
        : "font-medium text-red-600 dark:text-red-400";

  const showSavingsMasked =
    savingsPin != null &&
    !savingsPin.pinLoading &&
    savingsPin.hasPin &&
    !savingsPin.unlocked;

  const showSavingsNoPin =
    savingsPin != null && !savingsPin.pinLoading && !savingsPin.hasPin;

  const savingsValue =
    savingsPin == null
      ? formatVndFull(savingsTotal)
      : savingsPin.pinLoading
        ? null
        : showSavingsMasked
          ? "masked"
          : showSavingsNoPin
            ? "no-pin"
            : formatVndFull(savingsTotal);

  const cards = [
    {
      title: "Chi tiêu tháng này",
      value: formatVndFull(expenseThisCalendarMonth),
      delta: delta.text,
      description: "so với tháng trước",
      icon: Wallet,
      deltaClassName: deltaPctClass,
    },
    {
      title: "Tổng tiết kiệm",
      value: savingsValue,
      delta: "Không áp dụng",
      description:
        showSavingsMasked || showSavingsNoPin
          ? "Ẩn cho đến khi xác thực PIN"
          : "tổng số dư (đang hoạt động)",
      icon: PiggyBank,
      deltaClassName: "text-muted-foreground",
    },
    {
      title: "Giao dịch tháng này",
      value: String(expenseCountThisMonth),
      delta: formatVndFull(expenseLastCalendarMonth),
      description: "tổng chi tháng trước",
      icon: Receipt,
      deltaClassName: "font-medium text-foreground",
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((item) => (
        <Card
          key={item.title}
          className="group border-border/80 rounded-xl shadow-sm transition-shadow duration-200 hover:shadow-md"
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="min-w-0 flex-1 space-y-1">
              <CardDescription>{item.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight">
                {loading || (item.title === "Tổng tiết kiệm" && savingsPin?.pinLoading)
                  ? (
                      <Skeleton className="h-8 w-28 rounded-md" />
                    )
                  : item.title === "Tổng tiết kiệm" && item.value === "masked"
                    ? (
                        <span
                          className="text-muted-foreground font-mono tracking-[0.25em] select-none"
                          aria-hidden
                        >
                          •••••• ₫
                        </span>
                      )
                    : item.title === "Tổng tiết kiệm" && item.value === "no-pin"
                      ? (
                          <span className="text-muted-foreground text-lg font-normal">
                            Chưa thiết lập PIN
                          </span>
                        )
                      : (
                          item.value
                        )}
              </CardTitle>
            </div>
            <div className="bg-muted/80 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 group-hover:bg-muted/90">
              <item.icon className="size-4" aria-hidden />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {item.title === "Tổng tiết kiệm" &&
            savingsPin &&
            !loading &&
            !savingsPin.pinLoading &&
            savingsPin.hasPin &&
            !savingsPin.unlocked ? (
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                  <span className={item.deltaClassName}>{item.delta}</span>
                  <span>{item.description}</span>
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-10 w-full cursor-pointer touch-manipulation"
                      onClick={savingsPin.onRequestUnlock}
                    >
                      <KeyRound className="size-4" />
                      Nhập PIN để xem
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Xác thực mã PIN 6 số để hiển thị tổng tiết kiệm
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : item.title === "Tổng tiết kiệm" &&
              savingsPin &&
              !loading &&
              !savingsPin.pinLoading &&
              !savingsPin.hasPin ? (
              <p className="text-muted-foreground text-xs leading-relaxed">
                <Link
                  href="/dashboard/savings"
                  className="text-primary font-medium underline underline-offset-2 hover:opacity-90"
                >
                  Thiết lập PIN trong Tiết kiệm
                </Link>{" "}
                để bảo vệ và xem số dư tại đây.
              </p>
            ) : (
              <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                {loading ? (
                  <Skeleton className="h-4 w-48" />
                ) : (
                  <>
                    <span className={item.deltaClassName}>{item.delta}</span>
                    <span>{item.description}</span>
                  </>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
