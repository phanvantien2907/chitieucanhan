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
import { Textarea } from "@/components/ui/textarea";
import { createSaving, updateSaving, type SavingDoc } from "@/services/savings.service";

import { formatThousandsInput, parseAmountToNumber } from "@/components/expenses/expense-form";

const savingsFormSchema = z.object({
  amount: z
    .string()
    .min(1, "Vui lòng nhập số tiền")
    .refine((s) => parseAmountToNumber(s) > 0, "Số tiền không hợp lệ"),
  note: z.string().max(500),
});

export type SavingsFormValues = z.infer<typeof savingsFormSchema>;

type SavingsFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  uid: string;
  saving: SavingDoc | null;
  onSuccess: () => void;
};

export function SavingsForm({
  open,
  onOpenChange,
  mode,
  uid,
  saving,
  onSuccess,
}: SavingsFormProps) {
  const form = useForm<SavingsFormValues>({
    resolver: zodResolver(savingsFormSchema),
    defaultValues: {
      amount: "",
      note: "",
    },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    if (mode === "edit" && saving) {
      form.reset({
        amount: formatThousandsInput(String(Math.round(saving.amount))),
        note: saving.note ?? "",
      });
    } else {
      form.reset({
        amount: "",
        note: "",
      });
    }
  }, [open, saving, mode, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const amount = parseAmountToNumber(values.amount);
    try {
      if (mode === "create") {
        await createSaving(uid, {
          amount,
          note: values.note,
        });
        toast.success("Đã tạo khoản tiết kiệm.");
      } else if (saving) {
        await updateSaving(uid, saving.id, {
          amount,
          note: values.note,
        });
        toast.success("Đã cập nhật.");
      }
      onSuccess();
      onOpenChange(false);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Đã xảy ra lỗi. Vui lòng thử lại.";
      toast.error(message);
    }
  });

  const submitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Thêm tiết kiệm" : "Sửa tiết kiệm"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Nhập số tiền và ghi chú."
              : "Cập nhật thông tin khoản tiết kiệm."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số tiền</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="vd: 3.000"
                      className="tabular-nums"
                      {...field}
                      value={field.value}
                      onChange={(e) => {
                        field.onChange(formatThousandsInput(e.target.value));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tùy chọn"
                      rows={3}
                      className="min-h-20 resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="cursor-pointer disabled:cursor-not-allowed"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? "Đang lưu…" : mode === "create" ? "Tạo" : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
