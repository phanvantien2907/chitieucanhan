"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { clearSavingsPinVerifiedCookie } from "@/lib/savings-pin-session";
import { changeSecurityPin } from "@/services/security.service";

const LOCK_TOAST =
  "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau";

const changePinSchema = z
  .object({
    currentPin: z.string().regex(/^\d{6}$/, "PIN phải gồm đúng 6 chữ số"),
    newPin: z.string().regex(/^\d{6}$/, "PIN phải gồm đúng 6 chữ số"),
    confirmPin: z.string().regex(/^\d{6}$/, "PIN phải gồm đúng 6 chữ số"),
  })
  .refine((data) => data.newPin === data.confirmPin, {
    message: "Mã PIN xác nhận không khớp",
    path: ["confirmPin"],
  })
  .refine((data) => data.newPin !== data.currentPin, {
    message: "Mã PIN mới phải khác PIN hiện tại",
    path: ["newPin"],
  });

type ChangePinValues = z.infer<typeof changePinSchema>;

type ChangePinDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uid: string;
  hasPin: boolean;
  onPinChanged: () => void;
};

function PinInput({
  id,
  autoFocus,
  value,
  onChange,
}: {
  id: string;
  autoFocus?: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Input
      id={id}
      type="password"
      inputMode="numeric"
      autoComplete="off"
      autoFocus={autoFocus}
      maxLength={6}
      placeholder="••••••"
      value={value}
      onChange={(e) => {
        const next = e.target.value.replace(/\D/g, "").slice(0, 6);
        onChange(next);
      }}
      className="h-12 min-h-12 text-center font-mono text-lg tracking-[0.35em] tabular-nums"
      aria-invalid={value.length > 0 && value.length < 6}
    />
  );
}

export function ChangePinDialog({
  open,
  onOpenChange,
  uid,
  hasPin,
  onPinChanged,
}: ChangePinDialogProps) {
  const form = useForm<ChangePinValues>({
    resolver: zodResolver(changePinSchema),
    defaultValues: {
      currentPin: "",
      newPin: "",
      confirmPin: "",
    },
    mode: "onSubmit",
  });

  const currentPin = form.watch("currentPin");
  const newPin = form.watch("newPin");
  const confirmPin = form.watch("confirmPin");

  useEffect(() => {
    if (!open) {
      form.reset({
        currentPin: "",
        newPin: "",
        confirmPin: "",
      });
    }
  }, [open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!hasPin) {
      toast.error(
        "Chưa thiết lập PIN. Vui lòng thiết lập trong mục Tiết kiệm trước."
      );
      return;
    }
    try {
      const result = await changeSecurityPin(
        uid,
        values.currentPin,
        values.newPin
      );
      if (result === "same_pin") {
        toast.error("Mã PIN mới phải khác PIN hiện tại.");
        return;
      }
      if (result === "locked") {
        toast.error(LOCK_TOAST);
        onOpenChange(false);
        return;
      }
      if (result === "wrong") {
        toast.error("Mã PIN hiện tại không đúng.");
        return;
      }
      if (result === "no_pin") {
        toast.error(
          "Chưa thiết lập PIN. Vui lòng thiết lập trong mục Tiết kiệm."
        );
        return;
      }
      clearSavingsPinVerifiedCookie();
      toast.success("Đã đổi mã PIN.");
      onPinChanged();
      onOpenChange(false);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Không thể đổi PIN. Vui lòng thử lại.";
      toast.error(message);
    }
  });

  const submitting = form.formState.isSubmitting;
  const pinsComplete =
    currentPin.length === 6 &&
    newPin.length === 6 &&
    confirmPin.length === 6;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[calc(100%-2rem)] gap-4 rounded-xl sm:max-w-md"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Đổi mã PIN</DialogTitle>
          <DialogDescription>
            Nhập PIN hiện tại và PIN mới (6 chữ số). PIN được mã hóa SHA-256,
            không lưu dạng văn bản.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4">
            <FormField
              control={form.control}
              name="currentPin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="pin-current">PIN hiện tại</FormLabel>
                  <FormControl>
                    <PinInput
                      id="pin-current"
                      autoFocus
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="pin-new">PIN mới</FormLabel>
                  <FormControl>
                    <PinInput
                      id="pin-new"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="pin-confirm">Xác nhận PIN mới</FormLabel>
                  <FormControl>
                    <PinInput
                      id="pin-confirm"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-11 min-h-11 w-full cursor-pointer sm:w-auto"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="h-11 min-h-11 w-full cursor-pointer touch-manipulation sm:w-auto"
                disabled={submitting || !hasPin || !pinsComplete}
              >
                {submitting ? "Đang xử lý…" : "Xác nhận đổi PIN"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
