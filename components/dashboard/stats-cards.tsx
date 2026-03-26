import { FolderTree, Percent, PiggyBank, Wallet } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const stats = [
  {
    title: "Tổng chi tiêu tháng này",
    value: "12,4M ₫",
    delta: "+5,2%",
    description: "so với tháng trước",
    icon: Wallet,
    deltaPositive: false,
  },
  {
    title: "Tổng tiết kiệm",
    value: "48,2M ₫",
    delta: "+2,1%",
    description: "mục tiêu đang đạt",
    icon: PiggyBank,
    deltaPositive: true,
  },
  {
    title: "Số danh mục",
    value: "12",
    delta: "+2",
    description: "danh mục hoạt động",
    icon: FolderTree,
    deltaPositive: true,
  },
  {
    title: "Biến động",
    value: "−3,8%",
    delta: "ổn định",
    description: "xu hướng chi tiêu",
    icon: Percent,
    deltaPositive: true,
  },
] as const;

export function StatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => (
        <Card
          key={item.title}
          className="group border-border/80 shadow-sm transition-shadow duration-200 hover:shadow-md"
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardDescription>{item.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight">
                {item.value}
              </CardTitle>
            </div>
            <div className="bg-muted/80 text-muted-foreground flex size-9 items-center justify-center rounded-lg transition-colors duration-200 group-hover:bg-muted/90">
              <item.icon className="size-4" aria-hidden />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
              <span
                className={
                  item.deltaPositive
                    ? "font-medium text-emerald-600 dark:text-emerald-400"
                    : "font-medium text-amber-600 dark:text-amber-400"
                }
              >
                {item.delta}
              </span>
              <span>{item.description}</span>
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
