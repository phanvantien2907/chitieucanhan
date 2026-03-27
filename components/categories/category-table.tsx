"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
  type CategoryHierarchyFilter,
  useCategory,
} from "@/hooks/useCategory";
import { DISPLAY_FALLBACK_EMPTY } from "@/lib/format";
import { softDeleteCategory, type CategoryDoc, type CategoryTreeNode } from "@/services/category.service";
import { cn } from "@/lib/utils";

import {
  CategoryDetailDialog,
  CategoryStatusBadge,
} from "./category-detail-dialog";
import { CategoryForm } from "./category-form";

const PAGE_SIZE = 5;

type CategoryTreeRowsProps = {
  node: CategoryTreeNode;
  level: number;
  expandedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onDetail: (c: CategoryDoc) => void;
  onEdit: (c: CategoryDoc) => void;
  onDelete: (c: CategoryDoc) => void;
};

const CategoryTreeRows = memo(function CategoryTreeRows({
  node,
  level,
  expandedIds,
  onToggle,
  onDetail,
  onEdit,
  onDelete,
}: CategoryTreeRowsProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isDeleted = node.deletedAt != null;
  const row = node as CategoryDoc;

  return (
    <>
      <TableRow
        className={cn(
          "transition-colors hover:bg-muted/60",
          hasChildren && "cursor-pointer"
        )}
      >
        <TableCell
          className={cn("font-medium", hasChildren && "cursor-pointer")}
          onClick={(e) => {
            if (!hasChildren) return;
            if ((e.target as HTMLElement).closest("button")) return;
            onToggle(node.id);
          }}
        >
          <div
            className="flex min-w-0 items-center gap-0.5"
            style={{ paddingLeft: level * 16 }}
          >
            {hasChildren ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 min-h-9 min-w-9 shrink-0 touch-manipulation"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(node.id);
                }}
                aria-expanded={isExpanded}
                aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}
              >
                {isExpanded ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </Button>
            ) : (
              <span className="inline-flex size-9 shrink-0" aria-hidden />
            )}
            <span className="min-w-0">{node.name}</span>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {formatDateTime(node.createdAt)}
        </TableCell>
        <TableCell>
          <CategoryStatusBadge deletedAt={row.deletedAt} />
        </TableCell>
        <TableCell
          className="text-right"
          onClick={(e) => e.stopPropagation()}
        >
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
              <TooltipContent side="left">Mở menu thao tác</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onDetail(row)}
              >
                <Eye className="size-4" />
                Xem chi tiết
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                disabled={isDeleted}
                onClick={() => onEdit(row)}
              >
                <Pencil className="size-4" />
                Sửa
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer"
                disabled={isDeleted}
                onClick={() => onDelete(row)}
              >
                <Trash2 className="size-4" />
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      {hasChildren && isExpanded
        ? node.children.map((child) => (
            <CategoryTreeRows
              key={child.id}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onDetail={onDetail}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        : null}
    </>
  );
});

function formatDateTime(ts: CategoryDoc["createdAt"]): string {
  if (!ts || typeof ts.toDate !== "function") {
    return DISPLAY_FALLBACK_EMPTY;
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

const HIERARCHY_OPTIONS: { value: CategoryHierarchyFilter; label: string }[] = [
  { value: "all", label: "Tất cả cấp" },
  { value: "root", label: "Chỉ cấp gốc" },
  { value: "sub", label: "Chỉ cấp con" },
];

export function CategoryTable() {
  const {
    uid,
    allCategories,
    categoryTreeForTable,
    allCount,
    filteredCount,
    loading,
    filter,
    setFilter,
    hierarchyFilter,
    setHierarchyFilter,
    search,
    setSearch,
    debouncedSearch,
    isEmpty,
  } = useCategory();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setExpandedIds(new Set());
  }, [debouncedSearch, filter, hierarchyFilter]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const [createOpen, setCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryDoc | null>(null);
  const [detailCategory, setDetailCategory] = useState<CategoryDoc | null>(
    null
  );
  const [page, setPage] = useState(1);

  const totalRootPages = useMemo(
    () => Math.max(1, Math.ceil(categoryTreeForTable.length / PAGE_SIZE)),
    [categoryTreeForTable.length]
  );

  const paginatedRoots = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return categoryTreeForTable.slice(start, start + PAGE_SIZE);
  }, [categoryTreeForTable, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filter, hierarchyFilter]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalRootPages));
  }, [totalRootPages]);

  const canPrev = page > 1;
  const canNext = page < totalRootPages;

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
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
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
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
              <Select
                value={hierarchyFilter}
                onValueChange={(v) =>
                  setHierarchyFilter(v as CategoryHierarchyFilter)
                }
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SelectTrigger
                      className="h-10 min-h-10 w-full cursor-pointer rounded-lg sm:w-[200px]"
                      aria-label="Lọc theo cấp"
                    >
                      <SelectValue placeholder="Cấp" />
                    </SelectTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Gốc / con / tất cả
                  </TooltipContent>
                </Tooltip>
                <SelectContent>
                  {HIERARCHY_OPTIONS.map((o) => (
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
              <Select
                value={filter}
                onValueChange={(v) => setFilter(v as CategoryFilterMode)}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SelectTrigger
                      className="h-10 min-h-10 w-full cursor-pointer rounded-lg sm:w-[220px]"
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
          </div>

          <div className="max-h-[min(70vh,560px)] overflow-auto rounded-xl border bg-muted/20 transition-opacity duration-200">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[200px]">Tên</TableHead>
                  <TableHead className="min-w-[140px]">Ngày tạo</TableHead>
                  <TableHead className="min-w-[100px]">Trạng thái</TableHead>
                  <TableHead className="w-[72px] text-right">
                    Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody key={page}>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="hover:bg-transparent">
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="ml-auto h-8 w-8 rounded-lg" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : isEmpty ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground py-16 text-center text-sm"
                    >
                      {allCount === 0
                        ? "Chưa có danh mục nào"
                        : "Không có kết quả phù hợp"}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRoots.map((node) => (
                    <CategoryTreeRows
                      key={node.id}
                      node={node}
                      level={0}
                      expandedIds={expandedIds}
                      onToggle={toggleExpanded}
                      onDetail={(c) => {
                        if (!loading) {
                          setDetailCategory(c);
                        }
                      }}
                      onEdit={setEditCategory}
                      onDelete={setDeleteTarget}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && !isEmpty && categoryTreeForTable.length > 0 ? (
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
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                  <span className="text-muted-foreground flex h-10 min-w-28 items-center justify-center px-2 text-sm tabular-nums">
                    Trang {page} / {totalRootPages}
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
                        onClick={() =>
                          setPage((p) => Math.min(totalRootPages, p + 1))
                        }
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
          ) : null}

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
            allCategories={allCategories}
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
            allCategories={allCategories}
            onSuccess={() => setEditCategory(null)}
          />
        </>
      ) : null}

      <CategoryDetailDialog
        open={detailCategory !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDetailCategory(null);
          }
        }}
        category={detailCategory}
        allCategories={allCategories}
        categoriesReady={!loading}
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
