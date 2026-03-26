"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
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
import { Input } from "@/components/ui/input";
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
  type CategoryFilterMode,
  useCategories,
} from "@/hooks/useCategory";
import { softDeleteCategory, type CategoryDoc } from "@/services/category.service";
import { cn } from "@/lib/utils";

import { CategoryForm } from "./category-form";

function formatDateTime(ts: CategoryDoc["createdAt"]): string {
  if (!ts || typeof ts.toDate !== "function") {
    return "—";
  }
  const d = ts.toDate();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

const FILTER_OPTIONS: { value: CategoryFilterMode; label: string }[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "deleted", label: "Đã xóa" },
  { value: "active", label: "Đang hoạt động" },
];

export function CategoryTable() {
  const {
    uid,
    categories,
    allCount,
    filteredCount,
    totalPages,
    page,
    loading,
    filter,
    setFilter,
    search,
    setSearch,
    goPrev,
    goNext,
    isEmpty,
  } = useCategories();

  const [createOpen, setCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryDoc | null>(null);
  const [detailCategory, setDetailCategory] = useState<CategoryDoc | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<CategoryDoc | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const handleConfirmDelete = async () => {
    if (!uid || !deleteTarget) {
      return;
    }
    setDeletePending(true);
    try {
      await softDeleteCategory(uid, deleteTarget.id);
      toast.success("Đã xóa danh mục.");
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
          Danh mục
        </h1>
        <p className="text-muted-foreground text-sm">
          Nhóm các khoản chi tiêu theo danh mục (ăn uống, di chuyển, …).
        </p>
      </div>

      <Card className="rounded-xl border shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Danh sách</CardTitle>
            <CardDescription>
              {filteredCount} danh mục
              {filter !== "newest" || search
                ? ` (đang lọc trong ${allCount} mục)`
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
                Tạo danh mục
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Thêm danh mục</TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative w-full md:max-w-sm">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                  <Input
                    placeholder="Tìm theo tên hoặc mô tả…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-10 min-h-10 cursor-text rounded-lg pl-9"
                    aria-label="Tìm danh mục"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Tìm kiếm theo tên hoặc mô tả
              </TooltipContent>
            </Tooltip>
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as CategoryFilterMode)}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <SelectTrigger
                    className="h-10 min-h-10 w-full cursor-pointer rounded-lg md:w-[220px]"
                    aria-label="Sắp xếp và lọc"
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
                  <TableHead>Tên</TableHead>
                  <TableHead className="min-w-[200px]">Mô tả</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Cập nhật</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="w-[72px] text-right">
                    Thao tác
                  </TableHead>
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
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20 rounded-full" />
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
                        ? "Chưa có danh mục nào"
                        : "Không có kết quả phù hợp"}
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((row) => {
                    const isDeleted = row.deletedAt != null;
                    const descriptionEmpty =
                      row.description == null ||
                      row.description.trim().length === 0;
                    return (
                      <TableRow
                        key={row.id}
                        className="transition-colors hover:bg-muted/60"
                      >
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[min(280px,50vw)] whitespace-normal">
                          {descriptionEmpty ? (
                            <Badge
                              variant="outline"
                              className="rounded-full font-normal text-muted-foreground"
                            >
                              Chưa có mô tả
                            </Badge>
                          ) : (
                            row.description
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(row.createdAt)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(row.updatedAt)}
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
                                    onClick={() => setDetailCategory(row)}
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
                                    onClick={() => setEditCategory(row)}
                                  >
                                    <Pencil className="size-4" />
                                    Sửa
                                  </DropdownMenuItem>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  {isDeleted
                                    ? "Không thể sửa danh mục đã xóa"
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
                                    ? "Không thể xóa lại"
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
          <CategoryForm
            open={createOpen}
            onOpenChange={setCreateOpen}
            mode="create"
            uid={uid}
            category={null}
            onSuccess={() => {}}
          />
          <CategoryForm
            open={editCategory !== null}
            onOpenChange={(o) => {
              if (!o) {
                setEditCategory(null);
              }
            }}
            mode="edit"
            uid={uid}
            category={editCategory}
            onSuccess={() => setEditCategory(null)}
          />
        </>
      ) : null}

      <Dialog
        open={detailCategory !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDetailCategory(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Chi tiết danh mục</DialogTitle>
            <DialogDescription>
              Thông tin đầy đủ trong hệ thống.
            </DialogDescription>
          </DialogHeader>
          {detailCategory ? (
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">ID</dt>
                <dd className="font-mono text-xs break-all">{detailCategory.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tên</dt>
                <dd className="font-medium">{detailCategory.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Mô tả</dt>
                <dd className="whitespace-pre-wrap">
                  {detailCategory.description == null ||
                  detailCategory.description.trim().length === 0 ? (
                    <Badge
                      variant="outline"
                      className="rounded-full font-normal text-muted-foreground"
                    >
                      Chưa có mô tả
                    </Badge>
                  ) : (
                    detailCategory.description
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ngày tạo</dt>
                <dd>{formatDateTime(detailCategory.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Cập nhật</dt>
                <dd>{formatDateTime(detailCategory.updatedAt)}</dd>
              </div>
              {detailCategory.deletedAt != null ? (
                <div>
                  <dt className="text-muted-foreground">Đánh dấu xóa</dt>
                  <dd>{formatDateTime(detailCategory.deletedAt)}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted-foreground">Trạng thái</dt>
                <dd>
                  {detailCategory.deletedAt != null ? (
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
            <AlertDialogTitle>Xóa danh mục?</AlertDialogTitle>
            <AlertDialogDescription>
              Danh mục sẽ được đánh dấu xóa (không xóa vĩnh viễn). Bạn có chắc
              chắn?
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
