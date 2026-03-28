"use client";

import { Copy } from "lucide-react";

import { SoftDeleteStatusBadge } from "@/components/badges/soft-delete-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BADGE_UNKNOWN_FALLBACK,
  DISPLAY_FALLBACK_EMPTY,
  getSafeBadgeValue,
} from "@/lib/format";
import {
  formatExpenseDateDdMmYyyy,
  type ExpenseDoc,
} from "@/services/expense.service";

function formatMoney(amount: number): string {
  return amount.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** `dd/MM/yyyy HH:mm` for updatedAt */
function formatDateTime(
  ts: ExpenseDoc["updatedAt"]
): string {
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

type ExpenseDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseDoc | null;
  categoryLabel: string | null;
  onCopyCode: (code: string) => void;
};

export function ExpenseDetailDialog({
  open,
  onOpenChange,
  expense,
  categoryLabel,
  onCopyCode,
}: ExpenseDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Chi tiết khoản chi</DialogTitle>
          <DialogDescription>
            Thông tin đầy đủ trong hệ thống.
          </DialogDescription>
        </DialogHeader>
        {expense ? (
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Mã giao dịch</dt>
              <dd className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="font-mono text-xs font-medium"
                >
                  {getSafeBadgeValue(
                    expense.code?.trim() ?? null,
                    BADGE_UNKNOWN_FALLBACK
                  )}
                </Badge>
                {expense.code?.trim() ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => onCopyCode(expense.code)}
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
              <dd className="font-mono text-xs break-all">{expense.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Số tiền</dt>
              <dd className="font-medium tabular-nums">
                {formatMoney(expense.amount)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ghi chú</dt>
              <dd className="m-0">
                <Badge
                  variant="outline"
                  className="max-w-full whitespace-pre-wrap font-normal"
                >
                  {getSafeBadgeValue(
                    expense.note?.trim() ?? null,
                    "Không có ghi chú"
                  )}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Danh mục</dt>
              <dd>
                <Badge variant="secondary" className="rounded-full font-medium">
                  {getSafeBadgeValue(categoryLabel, BADGE_UNKNOWN_FALLBACK)}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ngày chi tiêu</dt>
              <dd>
                {formatExpenseDateDdMmYyyy(
                  expense.expenseDate,
                  expense.createdAt
                ) || DISPLAY_FALLBACK_EMPTY}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ngày cập nhật</dt>
              <dd>{formatDateTime(expense.updatedAt)}</dd>
            </div>
            {expense.deletedAt != null ? (
              <div>
                <dt className="text-muted-foreground">Đánh dấu xóa</dt>
                <dd>{formatDateTime(expense.deletedAt)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted-foreground">Trạng thái</dt>
              <dd>
                <SoftDeleteStatusBadge deletedAt={expense.deletedAt} />
              </dd>
            </div>
          </dl>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
