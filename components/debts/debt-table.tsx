"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
import { type DebtFilterMode, useDebts } from "@/hooks/useDebt";
import {
  markAsPaid,
  softDeleteDebt,
  type DebtDoc,
} from "@/services/debt.service";
import {
  BADGE_UNKNOWN_FALLBACK,
  BADGE_UNKNOWN_VISUAL,
  DISPLAY_FALLBACK_EMPTY,
  getSafeBadgeValue,
} from "@/lib/format";
import { cn } from "@/lib/utils";

import { DebtForm } from "./debt-form";

function formatMoney(amount: number): string {
  return amount.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(ts: DebtDoc["createdAt"]): string {
  if (!ts || typeof ts.toDate !== "function") {
    return DISPLAY_FALLBACK_EMPTY;
  }
  const d = ts.toDate();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function formatDueOnly(ts: DebtDoc["dueDate"]): string {
  if (!ts || typeof ts.toDate !== "function") {
    return DISPLAY_FALLBACK_EMPTY;
  }
  const d = ts.toDate();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function TypeBadge({ debt }: { debt: DebtDoc }) {
  if (debt.type === "receivable") {
    return (
      <Badge className="rounded-full border-0 bg-emerald-600 text-white hover:bg-emerald-600/90">
        {getSafeBadgeValue("Họ nợ bạn", BADGE_UNKNOWN_FALLBACK)}
      </Badge>
    );
  }
  if (debt.type === "payable") {
    return (
      <Badge variant="destructive" className="rounded-full">
        {getSafeBadgeValue("Bạn nợ", BADGE_UNKNOWN_FALLBACK)}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className={cn("rounded-full", BADGE_UNKNOWN_VISUAL)}>
      {getSafeBadgeValue(BADGE_UNKNOWN_FALLBACK, BADGE_UNKNOWN_FALLBACK)}
    </Badge>
  );
}

function StatusBadge({ debt }: { debt: DebtDoc }) {
  if (debt.status === "paid") {
    return (
      <Badge className="rounded-full border-0 bg-emerald-600 text-white hover:bg-emerald-600/90">
        {getSafeBadgeValue("Đã trả", BADGE_UNKNOWN_FALLBACK)}
      </Badge>
    );
  }
  if (debt.status === "pending") {
    return (
      <Badge
        variant="secondary"
        className="rounded-full border-amber-500/40 bg-amber-500/15 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
      >
        {getSafeBadgeValue("Chưa trả", BADGE_UNKNOWN_FALLBACK)}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className={cn("rounded-full", BADGE_UNKNOWN_VISUAL)}>
      {getSafeBadgeValue(BADGE_UNKNOWN_FALLBACK, BADGE_UNKNOWN_FALLBACK)}
    </Badge>
  );
}

const FILTER_OPTIONS: { value: DebtFilterMode; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chưa trả" },
  { value: "paid", label: "Đã trả" },
  { value: "receivable", label: "Họ nợ bạn" },
  { value: "payable", label: "Bạn nợ" },
];

export function DebtTable() {
  const {
    uid,
    debts,
    allCount,
    filteredCount,
    totalPages,
    page,
    loading,
    filter,
    setFilter,
    goPrev,
    goNext,
    isEmpty,
  } = useDebts();

  const [createOpen, setCreateOpen] = useState(false);
  const [editDebt, setEditDebt] = useState<DebtDoc | null>(null);
  const [detailDebt, setDetailDebt] = useState<DebtDoc | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DebtDoc | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [paidTarget, setPaidTarget] = useState<DebtDoc | null>(null);
  const [paidPending, setPaidPending] = useState(false);

  const handleConfirmDelete = async () => {
    if (!uid || !deleteTarget) {
      return;
    }
    setDeletePending(true);
    try {
      await softDeleteDebt(uid, deleteTarget.id);
      toast.success("Đã xóa khoản nợ.");
      setDeleteTarget(null);
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Không thể xóa. Vui lòng thử lại."
      );
    } finally {
      setDeletePending(false);
    }
  };

  const handleConfirmPaid = async () => {
    if (!uid || !paidTarget) {
      return;
    }
    setPaidPending(true);
    try {
      await markAsPaid(uid, paidTarget.id);
      toast.success(
        paidTarget.type === "payable"
          ? "Đã đánh dấu đã trả và ghi chi tiêu."
          : "Đã đánh dấu đã trả."
      );
      setPaidTarget(null);
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ? e.message : "Không thể cập nhật. Vui lòng thử lại."
      );
    } finally {
      setPaidPending(false);
    }
  };

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Nợ
        </h1>
        <p className="text-muted-foreground text-sm">
          Theo dõi khoản phải thu và phải trả.
        </p>
      </div>

      <Card className="rounded-xl border shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Danh sách</CardTitle>
            <CardDescription>
              {filteredCount} khoản
              {filter !== "all"
                ? ` (trong ${allCount} khoản)`
                : ""}
            </CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                className="h-10 min-h-10 w-full cursor-pointer touch-manipulation sm:w-auto"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" />
                Thêm khoản nợ
              </Button>
            </TooltipTrigger>
            <TooltipContent>Thêm khoản nợ mới</TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as DebtFilterMode)}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <SelectTrigger
                    className="h-10 min-h-10 w-full cursor-pointer rounded-lg sm:w-[220px]"
                    aria-label="Lọc"
                  >
                    <SelectValue placeholder="Lọc" />
                  </SelectTrigger>
                </TooltipTrigger>
                <TooltipContent>Lọc theo trạng thái hoặc loại</TooltipContent>
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

          <div className="max-h-[min(70vh,560px)] overflow-x-auto overflow-y-auto rounded-xl border bg-muted/20">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[120px]">Loại</TableHead>
                  <TableHead className="min-w-[120px]">Người</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead className="min-w-[110px]">Hạn</TableHead>
                  <TableHead className="min-w-[100px]">Trạng thái</TableHead>
                  <TableHead className="min-w-[140px]">Ngày tạo</TableHead>
                  <TableHead className="w-[72px] text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                      <TableCell>
                        <Skeleton className="h-5 w-24 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="ml-auto h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
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
                      Chưa có khoản nợ nào
                    </TableCell>
                  </TableRow>
                ) : (
                  debts.map((row) => {
                    const isPaid = row.status === "paid";
                    return (
                      <TableRow
                        key={row.id}
                        className="transition-colors hover:bg-muted/60"
                      >
                        <TableCell>
                          <TypeBadge debt={row} />
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.personName}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(row.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDueOnly(row.dueDate)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge debt={row} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDateTime(row.createdAt)}
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
                                    aria-label="Thao tác"
                                  >
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="left">
                                Menu thao tác
                              </TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end" className="w-52">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => setDetailDebt(row)}
                                  >
                                    <Eye className="size-4" />
                                    Xem chi tiết
                                  </DropdownMenuItem>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  Xem chi tiết
                                </TooltipContent>
                              </Tooltip>
                              {!isPaid ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <DropdownMenuItem
                                      className="cursor-pointer"
                                      onClick={() => setEditDebt(row)}
                                    >
                                      <Pencil className="size-4" />
                                      Sửa
                                    </DropdownMenuItem>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    Chỉnh sửa khoản nợ
                                  </TooltipContent>
                                </Tooltip>
                              ) : null}
                              {!isPaid ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <DropdownMenuItem
                                      className="cursor-pointer"
                                      onClick={() => setPaidTarget(row)}
                                    >
                                      <CheckCircle2 className="size-4" />
                                      Đã trả
                                    </DropdownMenuItem>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    Đánh dấu đã thanh toán
                                  </TooltipContent>
                                </Tooltip>
                              ) : null}
                              {!isPaid ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <DropdownMenuItem
                                      variant="destructive"
                                      className="cursor-pointer"
                                      onClick={() => setDeleteTarget(row)}
                                    >
                                      <Trash2 className="size-4" />
                                      Xóa
                                    </DropdownMenuItem>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    Xóa khoản nợ
                                  </TooltipContent>
                                </Tooltip>
                              ) : null}
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
                          canPrev ? "cursor-pointer" : "cursor-not-allowed"
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
                          canNext ? "cursor-pointer" : "cursor-not-allowed"
                        )}
                        onClick={goNext}
                        disabled={!canNext}
                        aria-label="Trang sau"
                      >
                        Sau
                        <ChevronRight className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Trang sau</TooltipContent>
                  </Tooltip>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>

      {uid ? (
        <>
          <DebtForm
            open={createOpen}
            onOpenChange={setCreateOpen}
            mode="create"
            uid={uid}
            debt={null}
            onSuccess={() => {}}
          />
          <DebtForm
            open={editDebt !== null}
            onOpenChange={(o) => {
              if (!o) {
                setEditDebt(null);
              }
            }}
            mode="edit"
            uid={uid}
            debt={editDebt}
            onSuccess={() => setEditDebt(null)}
          />
        </>
      ) : null}

      <Dialog
        open={detailDebt !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDetailDebt(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Chi tiết khoản nợ</DialogTitle>
            <DialogDescription>
              Thông tin đầy đủ trong hệ thống.
            </DialogDescription>
          </DialogHeader>
          {detailDebt ? (
            <div className="space-y-4">
              {detailDebt.status === "paid" ? (
                <div className="bg-muted/60 rounded-xl border px-4 py-3 text-center text-sm font-medium">
                  Đã hoàn tất
                </div>
              ) : null}
              <dl className="grid gap-4 text-sm">
                <div className="flex flex-col gap-1.5">
                  <dt className="text-muted-foreground text-xs font-medium">
                    Loại
                  </dt>
                  <dd className="m-0">
                    <TypeBadge debt={detailDebt} />
                  </dd>
                </div>
                <div className="flex flex-col gap-1.5">
                  <dt className="text-muted-foreground text-xs font-medium">
                    Người
                  </dt>
                  <dd className="m-0 font-medium">{detailDebt.personName}</dd>
                </div>
                <div className="flex flex-col gap-1.5">
                  <dt className="text-muted-foreground text-xs font-medium">
                    Số tiền
                  </dt>
                  <dd className="m-0 font-medium tabular-nums">
                    {formatMoney(detailDebt.amount)} ₫
                  </dd>
                </div>
                <div className="flex flex-col gap-1.5">
                  <dt className="text-muted-foreground text-xs font-medium">
                    Ghi chú
                  </dt>
                  <dd className="m-0">
                    <Badge variant="outline" className="max-w-full whitespace-normal font-normal">
                      {getSafeBadgeValue(
                        detailDebt.note?.trim() ?? null,
                        BADGE_UNKNOWN_FALLBACK
                      )}
                    </Badge>
                  </dd>
                </div>
                <div className="flex flex-col gap-1.5">
                  <dt className="text-muted-foreground text-xs font-medium">
                    Hạn trả
                  </dt>
                  <dd className="m-0">{formatDueOnly(detailDebt.dueDate)}</dd>
                </div>
                <div className="flex flex-col gap-1.5">
                  <dt className="text-muted-foreground text-xs font-medium">
                    Trạng thái
                  </dt>
                  <dd className="m-0">
                    <StatusBadge debt={detailDebt} />
                  </dd>
                </div>
                <div className="flex flex-col gap-1.5">
                  <dt className="text-muted-foreground text-xs font-medium">
                    Ngày tạo
                  </dt>
                  <dd className="m-0">{formatDateTime(detailDebt.createdAt)}</dd>
                </div>
                {detailDebt.status === "paid" ? (
                  <div className="flex flex-col gap-1.5">
                    <dt className="text-muted-foreground text-xs font-medium">
                      Ngày hoàn tất
                    </dt>
                    <dd className="m-0">
                      {detailDebt.paidAt
                        ? formatDateTime(detailDebt.paidAt)
                        : DISPLAY_FALLBACK_EMPTY}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={paidTarget !== null}
        onOpenChange={(o) => {
          if (!o && !paidPending) {
            setPaidTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận đã trả?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn xác nhận khoản nợ này đã được thanh toán?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={paidPending}
              className="cursor-pointer disabled:cursor-not-allowed"
            >
              Hủy
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={paidPending}
              className="cursor-pointer disabled:cursor-not-allowed"
              onClick={() => void handleConfirmPaid()}
            >
              {paidPending ? "Đang xử lý…" : "Xác nhận"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <AlertDialogTitle>Xóa khoản nợ?</AlertDialogTitle>
            <AlertDialogDescription>
              Khoản nợ sẽ được đánh dấu xóa.
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
              <TooltipContent>Xóa khoản nợ</TooltipContent>
            </Tooltip>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
