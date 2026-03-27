"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  setInitialPin,
  verifyPin,
} from "@/services/security.service";

const LOCK_TOAST =
  "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau";

type SavingsPinDialogProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, user can close with overlay/Escape (e.g. dashboard unlock). */
  dismissible?: boolean;
  mode: "set" | "verify";
  uid: string;
  onVerified: () => void;
  /** Overrides verify-mode description (e.g. dashboard receivable unlock). */
  verifyDescription?: string;
  /** Input id for verify mode (avoid duplicate ids with multiple dialogs). */
  verifyInputId?: string;
};

export function SavingsPinDialog({
  open,
  onOpenChange,
  dismissible = false,
  mode,
  uid,
  onVerified,
  verifyDescription,
  verifyInputId = "savings-pin",
}: SavingsPinDialogProps) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setValue("");
    }
  }, [open, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(value)) {
      toast.error("PIN phải gồm đúng 6 chữ số.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "set") {
        await setInitialPin(uid, value);
        toast.success("Đã thiết lập PIN.");
        onVerified();
        setValue("");
      } else {
        const result = await verifyPin(uid, value);
        if (result === "locked") {
          toast.error(LOCK_TOAST);
          setValue("");
          return;
        }
        if (result === "wrong") {
          toast.error("Mã PIN không đúng.");
          setValue("");
          return;
        }
        if (result === "no_pin") {
          toast.error("Chưa thiết lập PIN.");
          return;
        }
        toast.success("Xác thực thành công.");
        onVerified();
        setValue("");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Đã xảy ra lỗi. Vui lòng thử lại.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={dismissible}
        onPointerDownOutside={
          dismissible ? undefined : (e) => e.preventDefault()
        }
        onEscapeKeyDown={dismissible ? undefined : (e) => e.preventDefault()}
      >
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-lg">
            {mode === "set" ? "Thiết lập mã PIN" : "Nhập mã PIN"}
          </DialogTitle>
          <DialogDescription>
            {mode === "set"
              ? "Tạo mã PIN 6 số để bảo vệ mục Tiết kiệm. PIN được mã hóa và không lưu dạng văn bản."
              : verifyDescription ?? "Nhập PIN 6 số để tiếp tục."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={verifyInputId}>
              PIN (6 số)
            </Label>
            <Input
              id={verifyInputId}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              maxLength={6}
              placeholder="••••••"
              value={value}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, 6);
                setValue(next);
              }}
              className="h-12 min-h-12 text-center font-mono text-lg tracking-[0.4em] tabular-nums"
              aria-invalid={value.length > 0 && value.length < 6}
            />
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              type="submit"
              className="h-11 min-h-11 w-full cursor-pointer sm:max-w-xs"
              disabled={submitting || value.length !== 6}
            >
              {submitting
                ? "Đang xử lý…"
                : mode === "set"
                  ? "Lưu PIN"
                  : "Xác nhận"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
