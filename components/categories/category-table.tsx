"use client";

import { memo, useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
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
  useCategories,
} from "@/hooks/useCategory";
import {
  getCategoryBreadcrumb,
  getParentDisplayName,
  softDeleteCategory,
  type CategoryDoc,
  type CategoryTreeNode,
} from "@/services/category.service";
import { cn } from "@/lib/utils";

import { CategoryForm } from "./category-form";

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
          {isDeleted ? (
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
  } = useCategories();

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

          <div className="max-h-[min(70vh,560px)] overflow-auto rounded-xl border bg-muted/20">
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
              <TableBody>
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
                      colSpan={4}
                      className="text-muted-foreground py-16 text-center text-sm"
                    >
                      {allCount === 0
                        ? "Chưa có danh mục nào"
                        : "Không có kết quả phù hợp"}
                    </TableCell>
                  </TableRow>
                ) : (
                  categoryTreeForTable.map((node) => (
                    <CategoryTreeRows
                      key={node.id}
                      node={node}
                      level={0}
                      expandedIds={expandedIds}
                      onToggle={toggleExpanded}
                      onDetail={setDetailCategory}
                      onEdit={setEditCategory}
                      onDelete={setDeleteTarget}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

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
                <dt className="text-muted-foreground">Đường dẫn</dt>
                <dd className="text-sm">
                  {getCategoryBreadcrumb(detailCategory.id, allCategories)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Danh mục cha</dt>
                <dd>{getParentDisplayName(detailCategory, allCategories)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Cấp</dt>
                <dd>
                  <Badge variant="secondary" className="tabular-nums">
                    L{detailCategory.level}
                  </Badge>
                </dd>
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
