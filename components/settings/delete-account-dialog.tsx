"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { signOutUser } from "@/services/auth.service";
import { softDeleteUserAccount } from "@/services/user.service";

const CONFIRM_TEXT = "DELETE";

type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uid: string;
};

export function DeleteAccountDialog({
  open,
  onOpenChange,
  uid,
}: DeleteAccountDialogProps) {
  const [confirmInput, setConfirmInput] = useState("");

  useEffect(() => {
    if (!open) {
      setConfirmInput("");
    }
  }, [open]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await softDeleteUserAccount(uid);
      await signOutUser();
    },
    onSuccess: () => {
      toast.success("Tài khoản đã được xóa.");
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error ? e.message : "Không thể xóa tài khoản. Thử lại.";
      toast.error(msg);
    },
  });

  const canConfirm = confirmInput === CONFIRM_TEXT;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[calc(100%-2rem)] gap-4 rounded-xl sm:max-w-md"
        showCloseButton
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const el = document.getElementById("delete-account-confirm");
          el?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Xác nhận xóa tài khoản</DialogTitle>
          <DialogDescription>
            Vui lòng nhập &apos;DELETE&apos; để xác nhận
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="delete-account-confirm">Xác nhận</Label>
          <Input
            id="delete-account-confirm"
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="h-11 min-h-11 rounded-lg font-mono"
            value={confirmInput}
            onChange={(ev) => setConfirmInput(ev.target.value)}
            disabled={deleteMutation.isPending}
            placeholder={CONFIRM_TEXT}
          />
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 w-full cursor-pointer sm:w-auto"
            disabled={deleteMutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-11 min-h-11 w-full cursor-pointer touch-manipulation sm:w-auto"
            disabled={!canConfirm || deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            {deleteMutation.isPending ? "Đang xử lý…" : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
