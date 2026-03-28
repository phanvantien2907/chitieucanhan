"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SoftDeleteStatusBadge } from "@/components/badges/soft-delete-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type ExpenseFilterMode,
  useExpenses,
} from "@/hooks/useExpense";
import {
  BADGE_UNKNOWN_FALLBACK,
  DISPLAY_FALLBACK_EMPTY,
  getSafeBadgeValue,
} from "@/lib/format";
import {
  formatExpenseDateDdMmYyyy,
  softDeleteExpense,
  type ExpenseDoc,
} from "@/services/expense.service";
import { cn } from "@/lib/utils";

import { ExpenseTimeRangeFilter } from "./expense-filter";
import { ExpenseDetailDialog } from "./expense-detail-dialog";
import { ExpenseForm } from "./expense-form";

function formatMoney(amount: number): string {
  return amount.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

const FILTER_OPTIONS: { value: ExpenseFilterMode; label: string }[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "deleted", label: "Đã xóa" },
  { value: "active", label: "Đang hoạt động" },
];

export function ExpenseTable() {
  const queryClient = useQueryClient();
  const {
    uid,
    expenses,
    allCount,
    filteredCount,
    totalPages,
    page,
    loading,
    categoriesLoading,
    filter,
    setFilter,
    timeFilter,
    setTimeFilter,
    timeFilterLabel,
    goPrev,
    goNext,
    activeCategories,
    categoryNameById,
    categorySelectOptions,
    isEmpty,
  } = useExpenses();

  const [createOpen, setCreateOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseDoc | null>(null);
  const [detailExpense, setDetailExpense] = useState<ExpenseDoc | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseDoc | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const handleConfirmDelete = async () => {
    if (!uid || !deleteTarget) {
      return;
    }
    setDeletePending(true);
    try {
      await softDeleteExpense(uid, deleteTarget.id);
      await queryClient.invalidateQueries({
        queryKey: ["firestore", "expenses", uid],
      });
      toast.success("Đã xóa khoản chi.");
      setDeleteTarget(null);
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Không thể xóa. Vui lòng thử lại."
      );
    } finally {
      setDeletePending(false);
    }
  };

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const copyExpenseCode = (code: string) => {
    void navigator.clipboard.writeText(code).then(
      () => {
        toast.success("Đã sao chép mã.");
      },
      () => {
        toast.error("Không thể sao chép.");
      }
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Chi tiêu
        </h1>
        <p className="text-muted-foreground text-sm">
          Theo dõi chi tiêu theo danh mục và lịch sử giao dịch.
        </p>
      </div>

      <Card className="rounded-xl border shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Danh sách</CardTitle>
            <CardDescription>
              <span className="font-medium text-foreground">{timeFilterLabel}</span>
              {" · "}
              {filteredCount} khoản chi
              {filter !== "newest" ? " (đang lọc trạng thái)" : ""}
            </CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                className="h-10 min-h-10 w-full cursor-pointer touch-manipulation sm:w-auto"
                onClick={() => setCreateOpen(true)}
                disabled={categoriesLoading || activeCategories.length === 0}
              >
                <Plus className="size-4" />
                Thêm chi tiêu
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {activeCategories.length === 0 && !categoriesLoading
                ? "Hãy tạo danh mục trước"
                : "Thêm khoản chi"}
            </TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:justify-end">
            <ExpenseTimeRangeFilter
              value={timeFilter}
              onValueChange={setTimeFilter}
              disabled={loading}
            />
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as ExpenseFilterMode)}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <SelectTrigger
                    className="h-10 min-h-10 w-full cursor-pointer rounded-lg md:w-[200px]"
                    aria-label="Lọc và sắp xếp"
                  >
                    <SelectValue placeholder="Lọc" />
                  </SelectTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Lọc và sắp xếp danh sách
                </TooltipContent>
              </Tooltip>
              <SelectContent>
                {FILTER_OPTIONS.map((o) => (
                  <SelectItem
                    key={o.value}
                    value={o.value}
                    className="cursor-pointer"
                  >
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-muted/20">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[200px]">Mã</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead className="min-w-[120px]">Ghi chú</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead className="whitespace-nowrap">Ngày chi tiêu</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[72px] text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto h-8 w-8 rounded-lg" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : isEmpty ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={7}
                      className="text-muted-foreground py-16 text-center text-sm"
                    >
                      {allCount === 0
                        ? "Không có chi tiêu trong khoảng thời gian này"
                        : "Không có kết quả phù hợp"}
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((row) => {
                    const isDeleted = row.deletedAt != null;
                    return (
                      <TableRow
                        key={row.id}
                        className="transition-colors hover:bg-muted/60"
                      >
                        <TableCell>
                          <div className="flex max-w-[min(240px,55vw)] items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className="max-w-[min(200px,40vw)] truncate font-mono text-xs font-medium"
                                >
                                  {getSafeBadgeValue(
                                    row.code?.trim() ?? null,
                                    BADGE_UNKNOWN_FALLBACK
                                  )}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>Mã giao dịch</TooltipContent>
                            </Tooltip>
                            {row.code?.trim() ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 shrink-0 cursor-pointer"
                                    aria-label="Copy code"
                                    onClick={() => copyExpenseCode(row.code)}
                                  >
                                    <Copy className="size-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy code</TooltipContent>
                              </Tooltip>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(row.amount)}
                        </TableCell>
                        <TableCell className="max-w-[120px] md:max-w-[200px]">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="min-w-0 max-w-[120px] cursor-default overflow-hidden text-ellipsis whitespace-nowrap md:max-w-[200px]">
                                <Badge
                                  variant="outline"
                                  className="block max-w-full truncate font-normal"
                                >
                                  {getSafeBadgeValue(
                                    row.note?.trim() ?? null,
                                    "Không có ghi chú"
                                  )}
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-xs wrap-break-word"
                            >
                              {getSafeBadgeValue(
                                row.note?.trim() ?? null,
                                "Không có ghi chú"
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="max-w-[min(220px,50vw)] truncate rounded-full font-medium"
                          >
                            {getSafeBadgeValue(
                              categoryNameById.get(row.categoryId) ?? null,
                              BADGE_UNKNOWN_FALLBACK
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {formatExpenseDateDdMmYyyy(
                            row.expenseDate,
                            row.createdAt
                          ) || DISPLAY_FALLBACK_EMPTY}
                        </TableCell>
                        <TableCell>
                          <SoftDeleteStatusBadge deletedAt={row.deletedAt} />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 min-h-9 min-w-9 cursor-pointer touch-manipulation"
                                    aria-label="Mở thao tác"
                                  >
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                Mở menu thao tác
                              </TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end" className="w-48">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => setDetailExpense(row)}
                                  >
                                    <Eye className="size-4" />
                                    Xem chi tiết
                                  </DropdownMenuItem>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  Xem chi tiết
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DropdownMenuItem
                                    className="cursor-pointer"
                                    disabled={isDeleted}
                                    onClick={() => setEditExpense(row)}
                                  >
                                    <Pencil className="size-4" />
                                    Sửa
                                  </DropdownMenuItem>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  {isDeleted
                                    ? "Không thể sửa khoản đã xóa"
                                    : "Chỉnh sửa"}
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DropdownMenuItem
                                    variant="destructive"
                                    className="cursor-pointer"
                                    disabled={isDeleted}
                                    onClick={() => setDeleteTarget(row)}
                                  >
                                    <Trash2 className="size-4" />
                                    Xóa
                                  </DropdownMenuItem>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  {isDeleted
                                    ? "Đã xóa rồi"
                                    : "Xóa"}
                                </TooltipContent>
                              </Tooltip>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && filteredCount > 0 && (
            <Pagination>
              <PaginationContent className="flex w-full flex-wrap items-center justify-between gap-2 sm:justify-center">
                <PaginationItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="default"
                        className={cn(
                          "h-10 min-h-10 gap-1 rounded-lg touch-manipulation",
                          canPrev
                            ? "cursor-pointer"
                            : "cursor-not-allowed"
                        )}
                        onClick={goPrev}
                        disabled={!canPrev}
                        aria-label="Trang trước"
                      >
                        <ChevronLeft className="size-4" />
                        Trước
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Trang trước</TooltipContent>
                  </Tooltip>
                </PaginationItem>
                <PaginationItem>
                  <span className="text-muted-foreground flex h-10 min-w-16 items-center justify-center px-2 text-sm tabular-nums">
                    {page} / {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="default"
                        className={cn(
                          "h-10 min-h-10 gap-1 rounded-lg touch-manipulation",
                          canNext
                            ? "cursor-pointer"
                            : "cursor-not-allowed"
                        )}
                        onClick={goNext}
                        disabled={!canNext}
                        aria-label="Trang sau"
                      >
                        Sau
                        <ChevronRight className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Trang tiếp theo</TooltipContent>
                  </Tooltip>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>

      {uid ? (
        <>
          <ExpenseForm
            open={createOpen}
            onOpenChange={setCreateOpen}
            mode="create"
            uid={uid}
            expense={null}
            activeCategories={activeCategories}
            categorySelectOptions={categorySelectOptions}
            categoriesLoading={categoriesLoading}
            onSuccess={() => {}}
          />
          <ExpenseForm
            open={editExpense !== null}
            onOpenChange={(o) => {
              if (!o) {
                setEditExpense(null);
              }
            }}
            mode="edit"
            uid={uid}
            expense={editExpense}
            activeCategories={activeCategories}
            categorySelectOptions={categorySelectOptions}
            categoriesLoading={categoriesLoading}
            onSuccess={() => setEditExpense(null)}
          />
        </>
      ) : null}

      <ExpenseDetailDialog
        open={detailExpense !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDetailExpense(null);
          }
        }}
        expense={detailExpense}
        categoryLabel={
          detailExpense
            ? categoryNameById.get(detailExpense.categoryId) ?? null
            : null
        }
        onCopyCode={copyExpenseCode}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o && !deletePending) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa khoản chi?</AlertDialogTitle>
            <AlertDialogDescription>
              Khoản chi sẽ được đánh dấu xóa (không xóa vĩnh viễn). Xác nhận bên
              dưới.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deletePending}
              className="cursor-pointer disabled:cursor-not-allowed"
            >
              Hủy
            </AlertDialogCancel>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  disabled={deletePending}
                  className="cursor-pointer disabled:cursor-not-allowed"
                  onClick={() => void handleConfirmDelete()}
                >
                  {deletePending ? "Đang xử lý…" : "Xóa"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Xóa (soft delete)</TooltipContent>
            </Tooltip>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
