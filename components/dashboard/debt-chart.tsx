"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatVndCompact, formatVndFull } from "@/services/analytics.service";
import type { DebtAnalyticsComputed } from "@/services/debt.service";

const COLOR_RECEIVABLE = "#22c55e";
const COLOR_PAYABLE = "#ef4444";
const COLOR_PAID = "#0ea5e9";
const COLOR_PENDING = "#64748b";

type DebtChartProps = {
  loading: boolean;
  analytics: DebtAnalyticsComputed;
  /** When true, phải thu is omitted from charts until the receivable card is unlocked. */
  chartsReceivableMasked?: boolean;
};

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const p = payload[0];
  const name = p?.name ?? "";
  const v = typeof p?.value === "number" ? p.value : 0;
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-2 py-1.5 text-xs shadow-md">
      <div className="font-medium">{name}</div>
      <div className="tabular-nums">{formatVndFull(v)}</div>
    </div>
  );
}

function BarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: { fullName?: string; personName?: string; amount?: number };
  }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const row = payload[0]?.payload;
  const name = row?.fullName ?? row?.personName ?? "";
  const v = typeof row?.amount === "number" ? row.amount : 0;
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-2 py-1.5 text-xs shadow-md">
      <div className="max-w-[220px] font-medium break-words">{name}</div>
      <div className="tabular-nums">{formatVndFull(v)}</div>
    </div>
  );
}

export function DebtChart({
  loading,
  analytics,
  chartsReceivableMasked = false,
}: DebtChartProps) {
  const pieData = analytics.receivableVsPayablePie;
  const barData = analytics.topPersonsPending.map((r) => {
    const full = r.personName;
    return {
      personName: full.length > 28 ? `${full.slice(0, 26)}…` : full,
      fullName: full,
      amount: r.amount,
    };
  });
  const ratioData = analytics.paidVsPendingPie;

  const pieColors = pieData.map((d) =>
    d.name.includes("thu") ? COLOR_RECEIVABLE : COLOR_PAYABLE
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Thống kê nợ</h2>
        <p className="text-muted-foreground text-sm">
          Phải thu / phải trả, theo người (pending), và tỷ lệ đã thanh toán
        </p>
        {chartsReceivableMasked ? (
          <p className="text-muted-foreground mt-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs">
            Số phải thu đang được bảo vệ — biểu đồ chỉ hiển thị phần phải trả và tổng pending
            (không gồm phải thu) cho đến khi bạn mở khóa thẻ &quot;Bạn sẽ nhận&quot;.
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-xl border shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Phải thu vs phải trả
            </CardTitle>
            <CardDescription>Chỉ các khoản pending</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="mx-auto aspect-square max-h-[260px] w-full max-w-[260px] rounded-full" />
            ) : pieData.length === 0 ? (
              <div className="text-muted-foreground flex min-h-[200px] items-center justify-center rounded-xl border border-dashed text-sm">
                Không có khoản pending
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-xs flex-col items-center gap-3">
                <div className="aspect-square w-full max-w-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={pieData[i].name} fill={pieColors[i]} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="text-muted-foreground w-full space-y-1 text-xs">
                  {pieData.map((s, i) => (
                    <li
                      key={s.name}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: pieColors[i] }}
                        />
                        {s.name}
                      </span>
                      <span className="tabular-nums font-medium text-foreground">
                        {formatVndFull(s.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Theo người (top 5)
            </CardTitle>
            <CardDescription>Tổng pending theo tên người liên quan</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-[min(40vh,260px)] w-full rounded-xl" />
            ) : barData.length === 0 ? (
              <div className="text-muted-foreground flex min-h-[200px] items-center justify-center rounded-xl border border-dashed text-sm">
                Không có khoản pending theo người
              </div>
            ) : (
              <div className="h-[min(40vh,280px)] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={barData}
                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted/40"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatVndCompact(v)}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="personName"
                      width={100}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip content={<BarTooltip />} />
                    <Bar
                      dataKey="amount"
                      radius={[0, 4, 4, 0]}
                      fill={COLOR_PENDING}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Đã thanh toán vs còn pending
          </CardTitle>
          <CardDescription>Tổng số tiền theo trạng thái</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <Skeleton className="mx-auto h-[200px] max-w-md rounded-xl" />
          ) : ratioData.length === 0 ? (
            <div className="text-muted-foreground flex min-h-[160px] items-center justify-center rounded-xl border border-dashed text-sm">
              Không có dữ liệu
            </div>
          ) : (
            <div className="mx-auto flex max-w-lg flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center">
              <div className="aspect-square w-full max-w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ratioData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {ratioData.map((s) => (
                        <Cell
                          key={s.name}
                          fill={
                            s.name.includes("thanh toán")
                              ? COLOR_PAID
                              : COLOR_PENDING
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="text-muted-foreground w-full max-w-xs space-y-2 text-sm">
                {ratioData.map((s) => (
                  <li
                    key={s.name}
                    className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: s.name.includes("thanh toán")
                            ? COLOR_PAID
                            : COLOR_PENDING,
                        }}
                      />
                      {s.name}
                    </span>
                    <span className="tabular-nums font-medium text-foreground">
                      {formatVndFull(s.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
