import { BarChart3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function MonthlyExpenseChartPlaceholder() {
  return (
    <Card className="border-border/80 shadow-sm transition-shadow duration-200 hover:shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-medium">
          Chi tiêu theo tháng
        </CardTitle>
        <BarChart3 className="text-muted-foreground size-4" aria-hidden />
      </CardHeader>
      <CardContent>
        <div className="bg-muted/40 flex aspect-[21/9] w-full flex-col justify-end gap-2 rounded-xl border border-dashed border-border/80 p-4 transition-colors duration-200 md:aspect-[2/1] lg:aspect-[21/9]">
          <div className="flex items-end justify-between gap-2">
            <Skeleton className="h-16 w-[12%] rounded-md transition-all duration-300" />
            <Skeleton className="h-24 w-[12%] rounded-md" />
            <Skeleton className="h-20 w-[12%] rounded-md" />
            <Skeleton className="h-28 w-[12%] rounded-md" />
            <Skeleton className="h-14 w-[12%] rounded-md" />
            <Skeleton className="h-20 w-[12%] rounded-md" />
            <Skeleton className="h-16 w-[12%] rounded-md" />
          </div>
          <p className="text-muted-foreground text-center text-xs">
            Biểu đồ sẽ hiển thị khi kết nối dữ liệu chi tiêu.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
