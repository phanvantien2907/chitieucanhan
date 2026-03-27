"use client";

import { Badge } from "@/components/ui/badge";
import {
  BADGE_UNKNOWN_FALLBACK,
  getSafeBadgeValue,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type SoftDeleteStatusBadgeProps = {
  deletedAt: unknown;
  className?: string;
};

/**
 * Active vs soft-deleted — same styling everywhere (categories, expenses, savings).
 */
export function SoftDeleteStatusBadge({
  deletedAt,
  className,
}: SoftDeleteStatusBadgeProps) {
  const isDeleted = deletedAt != null;
  return isDeleted ? (
    <Badge variant="destructive" className={cn("rounded-full", className)}>
      {getSafeBadgeValue("Đã xóa", BADGE_UNKNOWN_FALLBACK)}
    </Badge>
  ) : (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300",
        className
      )}
    >
      {getSafeBadgeValue("Hoạt động", BADGE_UNKNOWN_FALLBACK)}
    </Badge>
  );
}
