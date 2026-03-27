"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, BadgeCheck, Lock } from "lucide-react";

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
import { cn } from "@/lib/utils";
import { formatVndFull } from "@/services/analytics.service";

export type ReceivablePinState = {
  pinLoading: boolean;
  hasPin: boolean;
  unlocked: boolean;
  /** `null` = amount hidden (PIN required); `number` = safe to render (including 0). */
  displayValue: number | null;
  onRequestUnlock: () => void;
};

type DebtSummaryProps = {
  loading: boolean;
  pendingPayable: number;
  paidTotal: number;
  /** When true, receivable amount is non-zero and may require PIN to view. */
  receivableSensitive: boolean;
  receivablePin: ReceivablePinState;
};

export function DebtSummary({
  loading,
  pendingPayable,
  paidTotal,
  receivableSensitive,
  receivablePin,
}: DebtSummaryProps) {
  const {
    pinLoading: receivablePinLoading,
    hasPin,
    unlocked,
    displayValue: receivableDisplay,
    onRequestUnlock,
  } = receivablePin;

  const receivableLocked =
    receivableSensitive &&
    !receivablePinLoading &&
    receivableDisplay === null &&
    hasPin;

  const receivableNoPin =
    receivableSensitive &&
    !receivablePinLoading &&
    !hasPin;

  const receivableCard = (
    <Card
      role={receivableLocked ? "button" : undefined}
      tabIndex={receivableLocked ? 0 : undefined}
      onClick={receivableLocked ? () => onRequestUnlock() : undefined}
      onKeyDown={
        receivableLocked
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onRequestUnlock();
              }
            }
          : undefined
      }
      className={cn(
        "group border-border/80 rounded-xl shadow-sm transition-shadow duration-200 hover:shadow-md",
        receivableLocked &&
          "cursor-pointer touch-manipulation ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="min-w-0 flex-1 space-y-1">
          <CardDescription>Bạn sẽ nhận</CardDescription>
          <CardTitle
            className={cn(
              "text-2xl font-bold tabular-nums tracking-tight md:text-3xl min-h-9",
              receivableDisplay !== null &&
                receivableSensitive &&
                "animate-in fade-in-0 duration-300"
            )}
          >
            {loading || receivablePinLoading ? (
              <Skeleton className="h-9 w-36 rounded-md" />
            ) : receivableDisplay !== null ? (
              formatVndFull(receivableDisplay)
            ) : (
              <span
                className="text-muted-foreground font-mono tracking-[0.2em] select-none"
                aria-hidden
              >
                ******
              </span>
            )}
          </CardTitle>
        </div>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
            receivableSensitive && (receivableLocked || receivableNoPin)
              ? "bg-muted/80 text-muted-foreground"
              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          )}
        >
          {receivableSensitive && (receivableLocked || receivableNoPin) ? (
            <Lock className="size-4" aria-hidden />
          ) : (
            <ArrowDownLeft className="size-4" aria-hidden />
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading || receivablePinLoading ? (
          <Skeleton className="h-4 w-44" />
        ) : receivableNoPin ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            Yêu cầu mã PIN để xem.{" "}
            <Link
              href="/dashboard/savings"
              className="text-primary font-medium underline underline-offset-2 hover:opacity-90"
            >
              Thiết lập PIN trong Tiết kiệm
            </Link>
          </p>
        ) : receivableLocked ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            Yêu cầu mã PIN để xem.{" "}
            <span className="text-foreground font-medium">Nhấn để mở</span>
          </p>
        ) : (
          <p className="text-muted-foreground text-xs leading-relaxed">
            Người khác nợ bạn
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {receivableSensitive ? (
        <Tooltip>
          <TooltipTrigger asChild>{receivableCard}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            {receivableNoPin
              ? "Cần mã PIN để xem"
              : unlocked && receivableDisplay !== null
                ? "Dữ liệu đã được mở khóa"
                : "Cần mã PIN để xem"}
          </TooltipContent>
        </Tooltip>
      ) : (
        receivableCard
      )}

      <PayableAndPaidCards
        loading={loading}
        pendingPayable={pendingPayable}
        paidTotal={paidTotal}
      />
    </div>
  );
}

function PayableAndPaidCards({
  loading,
  pendingPayable,
  paidTotal,
}: {
  loading: boolean;
  pendingPayable: number;
  paidTotal: number;
}) {
  const items = [
    {
      title: "Bạn phải trả",
      sub: "Bạn đang nợ người khác",
      value: pendingPayable,
      icon: ArrowUpRight,
      iconClass: "bg-red-500/15 text-red-600 dark:text-red-400",
    },
    {
      title: "Đã thanh toán",
      sub: "Tổng các khoản đã hoàn tất",
      value: paidTotal,
      icon: BadgeCheck,
      iconClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    },
  ] as const;

  return (
    <>
      {items.map((item) => (
        <Card
          key={item.title}
          className="group border-border/80 rounded-xl shadow-sm transition-shadow duration-200 hover:shadow-md"
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="min-w-0 flex-1 space-y-1">
              <CardDescription>{item.title}</CardDescription>
              <CardTitle className="text-2xl font-bold tabular-nums tracking-tight md:text-3xl">
                {loading ? (
                  <Skeleton className="h-9 w-36 rounded-md" />
                ) : (
                  formatVndFull(item.value)
                )}
              </CardTitle>
            </div>
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${item.iconClass}`}
            >
              <item.icon className="size-4" aria-hidden />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-xs leading-relaxed">
              {loading ? <Skeleton className="h-4 w-44" /> : item.sub}
            </p>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
