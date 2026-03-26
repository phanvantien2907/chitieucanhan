"use client";

import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { softDeleteExpense, type ExpenseDoc } from "@/services/expense.service";
import { cn } from "@/lib/utils";

import { ExpenseForm } from "./expense-form";

function formatMoney(amount: number): string {
  return amount.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** `dd/MM/yyyy HH:mm` (24h) */
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

const FILTER_OPTIONS: { value: ExpenseFilterMode; label: string }[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "deleted", label: "Đã xóa" },
  { value: "active", label: "Đang hoạt động" },
];

export function ExpenseTable() {
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
    goPrev,
    goNext,
    activeCategories,
    categoryNameById,
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

  const categoryLabel = (categoryId: string) =>
    categoryNameById.get(categoryId) ?? "—";

  const displayCode = (e: ExpenseDoc) =>
    e.code?.trim() ? e.code : "—";

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
              {filteredCount} khoản chi
              {filter !== "newest"
                ? ` (đang lọc trong ${allCount} khoản)`
                : ""}
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
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
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
                  <TableHead>Ngày tạo</TableHead>
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
                        ? "Chưa có khoản chi nào"
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
                                <span className="text-muted-foreground font-mono text-sm font-medium">
                                  {displayCode(row)}
                                </span>
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
                        <TableCell className="text-muted-foreground max-w-[min(220px,45vw)] whitespace-normal">
                          {row.note?.trim() ? row.note : "—"}
                        </TableCell>
                        <TableCell>{categoryLabel(row.categoryId)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(row.createdAt)}
                        </TableCell>
                        <TableCell>
                          {isDeleted ? (
                            <Badge
                              variant="destructive"
                              className="rounded-full"
                            >
                              Đã xóa
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
                            >
                              Hoạt động
                            </Badge>
                          )}
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
            categoriesLoading={categoriesLoading}
            onSuccess={() => setEditExpense(null)}
          />
        </>
      ) : null}

      <Dialog
        open={detailExpense !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDetailExpense(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Chi tiết khoản chi</DialogTitle>
            <DialogDescription>Thông tin đầy đủ trong hệ thống.</DialogDescription>
          </DialogHeader>
          {detailExpense ? (
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Mã giao dịch</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground font-mono text-sm font-medium">
                    {displayCode(detailExpense)}
                  </span>
                  {detailExpense.code?.trim() ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() =>
                            copyExpenseCode(detailExpense.code)
                          }
                        >
                          <Copy className="size-4" />
                          Sao chép
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy code</TooltipContent>
                    </Tooltip>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">ID</dt>
                <dd className="font-mono text-xs break-all">{detailExpense.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Số tiền</dt>
                <dd className="font-medium tabular-nums">
                  {formatMoney(detailExpense.amount)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ghi chú</dt>
                <dd className="whitespace-pre-wrap">
                  {detailExpense.note?.trim() || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Danh mục</dt>
                <dd>{categoryLabel(detailExpense.categoryId)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ngày tạo</dt>
                <dd>{formatDateTime(detailExpense.createdAt)}</dd>
              </div>
              {detailExpense.deletedAt != null ? (
                <div>
                  <dt className="text-muted-foreground">Đánh dấu xóa</dt>
                  <dd>{formatDateTime(detailExpense.deletedAt)}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted-foreground">Trạng thái</dt>
                <dd>
                  {detailExpense.deletedAt != null ? (
                    <Badge variant="destructive" className="rounded-full">
                      Đã xóa
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
                    >
                      Hoạt động
                    </Badge>
                  )}
                </dd>
              </div>
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>

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
                  variant="destructive"
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
