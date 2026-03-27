"use client";

import { useState } from "react";
import {
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
  type SavingsFilterMode,
  useSavings,
} from "@/hooks/useSavings";
import { softDeleteSaving, type SavingDoc } from "@/services/savings.service";
import {
  BADGE_UNKNOWN_FALLBACK,
  DISPLAY_FALLBACK_EMPTY,
  getSafeBadgeValue,
} from "@/lib/format";
import { cn } from "@/lib/utils";

import { SavingsForm } from "./savings-form";

function formatMoney(amount: number): string {
  return amount.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** `dd/MM/yyyy HH:mm` (24h) */
function formatDateTime(ts: SavingDoc["createdAt"]): string {
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

function SavingsCategoryBadge({
  categoryId,
  categoryNameById,
  noCategoriesInApp,
}: {
  categoryId: string;
  categoryNameById: Map<string, string>;
  noCategoriesInApp: boolean;
}) {
  const label = categoryNameById.get(categoryId);
  if (noCategoriesInApp) {
    return (
      <Badge
        variant="outline"
        className="max-w-[min(220px,50vw)] truncate rounded-full border-amber-500/45 bg-amber-500/12 font-medium text-amber-950 dark:text-amber-100"
        title="Chưa có danh mục nào trong hệ thống"
      >
        {getSafeBadgeValue("Chưa có danh mục", BADGE_UNKNOWN_FALLBACK)}
      </Badge>
    );
  }
  if (!categoryId?.trim() || label == null) {
    return (
      <Badge
        variant="outline"
        className="max-w-[min(220px,50vw)] truncate rounded-full border-amber-500/40 bg-amber-500/8 font-medium text-amber-900 dark:text-amber-200"
        title="Chưa gán danh mục"
      >
        {getSafeBadgeValue("Chưa phân loại", BADGE_UNKNOWN_FALLBACK)}
      </Badge>
    );
  }
  const display = getSafeBadgeValue(label, BADGE_UNKNOWN_FALLBACK);
  return (
    <Badge
      variant="secondary"
      className="max-w-[min(220px,50vw)] truncate rounded-full border border-emerald-500/35 bg-emerald-500/12 font-medium text-emerald-900 dark:text-emerald-200/90"
      title={display}
    >
      {display}
    </Badge>
  );
}

const FILTER_OPTIONS: { value: SavingsFilterMode; label: string }[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "deleted", label: "Đã xóa" },
  { value: "active", label: "Đang hoạt động" },
];

export function SavingsTable() {
  const {
    uid,
    savings,
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
    categorySelectOptions,
    isEmpty,
  } = useSavings();

  const noCategoriesInApp = activeCategories.length === 0;

  const [createOpen, setCreateOpen] = useState(false);
  const [editSaving, setEditSaving] = useState<SavingDoc | null>(null);
  const [detailSaving, setDetailSaving] = useState<SavingDoc | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavingDoc | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const handleConfirmDelete = async () => {
    if (!uid || !deleteTarget) {
      return;
    }
    setDeletePending(true);
    try {
      await softDeleteSaving(uid, deleteTarget.id);
      toast.success("Đã xóa khoản tiết kiệm.");
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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Tiết kiệm
        </h1>
        <p className="text-muted-foreground text-sm">
          Theo dõi các khoản tiết kiệm — được bảo vệ bằng PIN.
        </p>
      </div>

      <Card className="rounded-xl border shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Danh sách</CardTitle>
            <CardDescription>
              {filteredCount} khoản
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
              >
                <Plus className="size-4" />
                Thêm khoản
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Thêm khoản tiết kiệm</TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as SavingsFilterMode)}
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
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead className="min-w-[120px]">Danh mục</TableHead>
                  <TableHead className="min-w-[140px]">Ghi chú</TableHead>
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
                        <Skeleton className="ml-auto h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-36" />
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
                      colSpan={6}
                      className="text-muted-foreground py-16 text-center text-sm"
                    >
                      {allCount === 0
                        ? "Chưa có khoản tiết kiệm nào"
                        : "Không có kết quả phù hợp"}
                    </TableCell>
                  </TableRow>
                ) : (
                  savings.map((row) => {
                    const isDeleted = row.deletedAt != null;
                    return (
                      <TableRow
                        key={row.id}
                        className="transition-colors hover:bg-muted/60"
                      >
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(row.amount)}
                        </TableCell>
                        <TableCell>
                          <SavingsCategoryBadge
                            categoryId={row.categoryId}
                            categoryNameById={categoryNameById}
                            noCategoriesInApp={noCategoriesInApp}
                          />
                        </TableCell>
                        <TableCell className="max-w-[min(260px,50vw)] whitespace-normal">
                          {row.note?.trim() ? (
                            <span className="text-muted-foreground">
                              {row.note}
                            </span>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className="cursor-default rounded-full font-normal text-muted-foreground"
                                >
                                  {getSafeBadgeValue(
                                    "Không có ghi chú",
                                    BADGE_UNKNOWN_FALLBACK
                                  )}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Ghi chú trống hoặc chưa nhập
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(row.createdAt)}
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
                                    onClick={() => setDetailSaving(row)}
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
                                    onClick={() => setEditSaving(row)}
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
                                    : "Xóa (soft delete)"}
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
          <SavingsForm
            open={createOpen}
            onOpenChange={setCreateOpen}
            mode="create"
            uid={uid}
            saving={null}
            activeCategories={activeCategories}
            categorySelectOptions={categorySelectOptions}
            categoriesLoading={categoriesLoading}
            onSuccess={() => {}}
          />
          <SavingsForm
            open={editSaving !== null}
            onOpenChange={(o) => {
              if (!o) {
                setEditSaving(null);
              }
            }}
            mode="edit"
            uid={uid}
            saving={editSaving}
            activeCategories={activeCategories}
            categorySelectOptions={categorySelectOptions}
            categoriesLoading={categoriesLoading}
            onSuccess={() => setEditSaving(null)}
          />
        </>
      ) : null}

      <Dialog
        open={detailSaving !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDetailSaving(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Chi tiết</DialogTitle>
            <DialogDescription>Thông tin khoản tiết kiệm.</DialogDescription>
          </DialogHeader>
          {detailSaving ? (
            <dl className="grid gap-4 text-sm">
              <div className="flex flex-col gap-1.5">
                <dt className="text-muted-foreground text-xs font-medium">
                  ID
                </dt>
                <dd className="m-0 font-mono text-xs break-all">
                  {detailSaving.id}
                </dd>
              </div>
              <div className="flex flex-col gap-1.5">
                <dt className="text-muted-foreground text-xs font-medium">
                  Số tiền
                </dt>
                <dd className="m-0 font-medium tabular-nums">
                  {formatMoney(detailSaving.amount)}
                </dd>
              </div>
              <div className="flex flex-col gap-1.5">
                <dt className="text-muted-foreground text-xs font-medium">
                  Danh mục
                </dt>
                <dd className="m-0">
                  <SavingsCategoryBadge
                    categoryId={detailSaving.categoryId}
                    categoryNameById={categoryNameById}
                    noCategoriesInApp={noCategoriesInApp}
                  />
                </dd>
              </div>
              <div className="flex flex-col gap-1.5">
                <dt className="text-muted-foreground text-xs font-medium">
                  Ghi chú
                </dt>
                <dd className="m-0">
                  {detailSaving.note?.trim() ? (
                    <span className="whitespace-pre-wrap text-muted-foreground">
                      {detailSaving.note}
                    </span>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className="cursor-default rounded-full font-normal text-muted-foreground"
                        >
                          {getSafeBadgeValue(
                            "Không có ghi chú",
                            BADGE_UNKNOWN_FALLBACK
                          )}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Ghi chú trống hoặc chưa nhập
                      </TooltipContent>
                    </Tooltip>
                  )}
                </dd>
              </div>
              <div className="flex flex-col gap-1.5">
                <dt className="text-muted-foreground text-xs font-medium">
                  Ngày tạo
                </dt>
                <dd className="m-0">{formatDateTime(detailSaving.createdAt)}</dd>
              </div>
              {detailSaving.deletedAt != null ? (
                <div className="flex flex-col gap-1.5">
                  <dt className="text-muted-foreground text-xs font-medium">
                    Đánh dấu xóa
                  </dt>
                  <dd className="m-0">
                    {formatDateTime(detailSaving.deletedAt)}
                  </dd>
                </div>
              ) : null}
              <div className="flex flex-col gap-1.5">
                <dt className="text-muted-foreground text-xs font-medium">
                  Trạng thái
                </dt>
                <dd className="m-0">
                  <SoftDeleteStatusBadge deletedAt={detailSaving.deletedAt} />
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
            <AlertDialogTitle>Xóa khoản tiết kiệm?</AlertDialogTitle>
            <AlertDialogDescription>
              Khoản tiết kiệm sẽ được đánh dấu xóa.
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
