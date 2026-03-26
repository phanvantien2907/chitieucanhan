import { MonthlyExpenseChartPlaceholder } from "@/components/dashboard/chart-placeholder";
import { RecentExpensesTable } from "@/components/dashboard/recent-expenses-table";
import { StatsCards } from "@/components/dashboard/stats-cards";

export default function DashboardPage() {
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
      <StatsCards />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentExpensesTable />
        </div>
        <div className="lg:col-span-2">
          <MonthlyExpenseChartPlaceholder />
        </div>
      </div>
    </div>
  );
}
