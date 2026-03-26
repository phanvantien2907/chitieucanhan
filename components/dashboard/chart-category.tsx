"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatVndFull, type CategorySlice } from "@/services/analytics.service";

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

type ChartCategoryProps = {
  loading: boolean;
  data: CategorySlice[];
  title: string;
  description: string;
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

export function ChartCategory({
  loading,
  data,
  title,
  description,
}: ChartCategoryProps) {
  const empty = !loading && data.length === 0;

  return (
    <Card className="rounded-xl border shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <Skeleton className="mx-auto aspect-square max-h-[min(50vh,320px)] w-full max-w-[320px] rounded-full" />
        ) : empty ? (
          <div className="text-muted-foreground flex min-h-[220px] items-center justify-center rounded-xl border border-dashed text-sm">
            Chưa có dữ liệu
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
            <div className="aspect-square w-full max-w-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                    animationDuration={400}
                  >
                    {data.map((_, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={PIE_COLORS[i % PIE_COLORS.length]!}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="grid w-full gap-1.5 text-xs">
              {data.slice(0, 6).map((row, i) => (
                <li
                  key={row.name}
                  className="text-muted-foreground flex items-center justify-between gap-2"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                      }}
                    />
                    <span className="truncate">{row.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums font-medium text-foreground">
                    {formatVndFull(row.value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
