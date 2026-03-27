"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryPath, type CategoryDoc } from "@/services/category.service";
import { cn } from "@/lib/utils";

/** Same styling in table + detail — shadcn Badge only. */
export function CategoryStatusBadge({
  deletedAt,
  className,
}: {
  deletedAt: CategoryDoc["deletedAt"];
  className?: string;
}) {
  const isDeleted = deletedAt != null;
  return isDeleted ? (
    <Badge variant="destructive" className={cn("rounded-full", className)}>
      Đã xóa
    </Badge>
  ) : (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300",
        className
      )}
    >
      Hoạt động
    </Badge>
  );
}

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
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}

export type CategoryDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryDoc | null;
  /** Full list from `useCategories()` / `useCategory()` — never fetch inside this dialog. */
  allCategories: CategoryDoc[];
  /** When false, body shows skeletons (list not ready). */
  categoriesReady: boolean;
};

export function CategoryDetailDialog({
  open,
  onOpenChange,
  category,
  allCategories,
  categoriesReady,
}: CategoryDetailDialogProps) {
  const pathNames = useMemo(() => {
    if (!category || !categoriesReady) {
      return [];
    }
    return getCategoryPath(category.id, allCategories);
  }, [category, categoriesReady, allCategories]);

  const fullPathLabel = useMemo(() => {
    if (!category) {
      return "";
    }
    if (pathNames.length > 0) {
      return pathNames.join(" > ");
    }
    return category.name;
  }, [category, pathNames]);

  /** "Danh mục cha": root → "Danh mục gốc"; else ancestor breadcrumb (no em dash). */
  const parentChainLabel = useMemo(() => {
    if (!category) {
      return "";
    }
    if (category.parentId == null) {
      return "Danh mục gốc";
    }
    const ancestors = pathNames.slice(0, -1);
    if (ancestors.length > 0) {
      return ancestors.join(" > ");
    }
    return "Chưa có thông tin cha";
  }, [category, pathNames]);

  if (!category) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Chi tiết danh mục</DialogTitle>
          <DialogDescription>
            Thông tin đầy đủ trong hệ thống.
          </DialogDescription>
        </DialogHeader>
        {!categoriesReady ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[75%]" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <dl className="grid gap-4 text-sm transition-opacity duration-200">
            <div className="flex flex-col gap-1.5">
              <dt className="text-muted-foreground text-xs font-medium">ID</dt>
              <dd className="m-0 font-mono text-xs break-all">{category.id}</dd>
            </div>
            <div className="flex flex-col gap-1.5">
              <dt className="text-muted-foreground text-xs font-medium">Tên</dt>
              <dd className="m-0 font-medium">{category.name}</dd>
            </div>
            <div className="flex flex-col gap-1.5">
              <dt className="text-muted-foreground text-xs font-medium">
                Đường dẫn
              </dt>
              <dd className="m-0 wrap-break-word">{fullPathLabel}</dd>
            </div>
            <div className="flex flex-col gap-1.5">
              <dt className="text-muted-foreground text-xs font-medium">
                Danh mục cha
              </dt>
              <dd className="m-0 wrap-break-word text-foreground">
                {parentChainLabel}
              </dd>
            </div>
            <div className="flex flex-col gap-1.5">
              <dt className="text-muted-foreground text-xs font-medium">Cấp</dt>
              <dd className="m-0 tabular-nums">L{category.level}</dd>
            </div>
            <div className="flex flex-col gap-1.5">
              <dt className="text-muted-foreground text-xs font-medium">Mô tả</dt>
              <dd className="m-0 whitespace-pre-wrap text-muted-foreground">
                {category.description == null ||
                category.description.trim().length === 0 ? (
                  <span className="italic">Chưa có mô tả</span>
                ) : (
                  category.description
                )}
              </dd>
            </div>
            <div className="flex flex-col gap-1.5">
              <dt className="text-muted-foreground text-xs font-medium">
                Ngày tạo
              </dt>
              <dd className="m-0">{formatDateTime(category.createdAt)}</dd>
            </div>
            <div className="flex flex-col gap-1.5">
              <dt className="text-muted-foreground text-xs font-medium">
                Cập nhật
              </dt>
              <dd className="m-0">{formatDateTime(category.updatedAt)}</dd>
            </div>
            {category.deletedAt != null ? (
              <div className="flex flex-col gap-1.5">
                <dt className="text-muted-foreground text-xs font-medium">
                  Đánh dấu xóa
                </dt>
                <dd className="m-0">{formatDateTime(category.deletedAt)}</dd>
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <dt className="text-muted-foreground text-xs font-medium">
                Trạng thái
              </dt>
              <dd className="m-0">
                <CategoryStatusBadge deletedAt={category.deletedAt} />
              </dd>
            </div>
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}
