"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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
import {
  formatVndCompact,
  formatVndFull,
  type MonthPoint,
} from "@/services/analytics.service";

type ChartExpenseProps = {
  loading: boolean;
  barData: MonthPoint[];
  lineData: Array<{ label: string; total: number }>;
  lineIsDaily: boolean;
  barTitle: string;
  lineTitle: string;
  lineDescription: string;
  empty: boolean;
};

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const v = payload[0]?.value ?? 0;
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-2 py-1.5 text-xs shadow-md">
      <span className="font-medium tabular-nums">{formatVndFull(v)}</span>
    </div>
  );
}

export function ChartExpense({
  loading,
  barData,
  lineData,
  lineIsDaily,
  barTitle,
  lineTitle,
  lineDescription,
  empty,
}: ChartExpenseProps) {
  const barColor = "hsl(var(--chart-2) / 0.9)";
  const lineColor = "hsl(var(--chart-1) / 0.95)";

  return (
    <div className="grid gap-6 lg:grid-cols-1">
      <Card className="rounded-xl border shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{barTitle}</CardTitle>
          <CardDescription>Chi tiêu theo tháng (đã lọc giao dịch)</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <Skeleton className="h-[min(50vh,280px)] w-full rounded-xl" />
          ) : empty ? (
            <div className="text-muted-foreground flex min-h-[220px] items-center justify-center rounded-xl border border-dashed text-sm">
              Chưa có dữ liệu
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="h-[min(50vh,280px)] min-w-[min(100%,520px)]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted/40"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => formatVndCompact(Number(v))}
                      width={48}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.35)" }} />
                    <Bar
                      dataKey="total"
                      name="Chi tiêu"
                      fill={barColor}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                      animationDuration={400}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl border shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{lineTitle}</CardTitle>
          <CardDescription>{lineDescription}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <Skeleton className="h-[min(50vh,280px)] w-full rounded-xl" />
          ) : empty ? (
            <div className="text-muted-foreground flex min-h-[220px] items-center justify-center rounded-xl border border-dashed text-sm">
              Chưa có dữ liệu
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="h-[min(50vh,280px)] min-w-[min(100%,520px)]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={lineData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted/40"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: lineIsDaily ? 9 : 11 }}
                      interval={lineIsDaily ? "preserveStartEnd" : 0}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => formatVndCompact(Number(v))}
                      width={48}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name={lineIsDaily ? "Trong ngày" : "Lũy kế"}
                      stroke={lineColor}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      animationDuration={400}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
