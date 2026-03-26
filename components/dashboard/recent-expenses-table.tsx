"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RecentExpenseRow } from "@/hooks/useAnalytics";
import type { ExpenseDoc } from "@/services/expense.service";

const RECENT_LIMIT = 5;

/** `dd/MM/yyyy HH:mm` — aligned with chi tiêu table. */
function formatDateTime(ts: ExpenseDoc["createdAt"]): string {
  if (!ts || typeof ts.toDate !== "function") {
    return "—";
  }
  const d = ts.toDate();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function formatAmount(amount: number): string {
  return `${amount.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} ₫`;
}

type RecentExpensesTableProps = {
  rows: RecentExpenseRow[];
  loading: boolean;
  isEmpty: boolean;
};

export function RecentExpensesTable({
  rows,
  loading,
  isEmpty,
}: RecentExpensesTableProps) {
  return (
    <Card className="border-border/80 shadow-sm transition-shadow duration-200 hover:shadow-sm">
      <CardHeader>
        <CardTitle>Chi tiêu gần đây</CardTitle>
        <CardDescription>
          {RECENT_LIMIT} giao dịch mới nhất (đang hoạt động), cập nhật theo thời
          gian thực.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Ngày</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead className="hidden sm:table-cell">Ghi chú</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="pr-6 text-right">Số tiền</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: RECENT_LIMIT }).map((_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  <TableCell className="pl-6">
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <Skeleton className="ml-auto h-4 w-20" />
                  </TableCell>
                </TableRow>
              ))
            ) : isEmpty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground py-12 text-center text-sm"
                >
                  Chưa có khoản chi tiêu nào.
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ id, expense, categoryName }) => (
                <TableRow
                  key={id}
                  className="group transition-colors duration-150"
                >
                  <TableCell className="text-muted-foreground group-hover:text-foreground pl-6 text-xs font-medium whitespace-nowrap sm:text-sm">
                    {formatDateTime(expense.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">{categoryName}</TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-[140px] truncate sm:table-cell">
                    {expense.note?.trim() ? expense.note : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      Hoạt động
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6 text-right font-medium tabular-nums">
                    {formatAmount(expense.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
      {!loading && !isEmpty ? (
        <CardFooter className="flex justify-end border-t px-6 pt-4 pb-6">
          <Button variant="outline" size="sm" className="cursor-pointer" asChild>
            <Link href="/dashboard/expenses">Xem tất cả chi tiêu</Link>
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
