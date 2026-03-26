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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryDoc } from "@/services/category.service";
import {
  createExpense,
  updateExpense,
  type ExpenseDoc,
} from "@/services/expense.service";

export function formatThousandsInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n)) {
    return "";
  }
  return n.toLocaleString("vi-VN");
}

export function parseAmountToNumber(display: string): number {
  const digits = display.replace(/\D/g, "");
  return parseInt(digits || "0", 10);
}

const expenseFormSchema = z.object({
  amount: z
    .string()
    .min(1, "Vui lòng nhập số tiền")
    .refine((s) => parseAmountToNumber(s) > 0, "Số tiền không hợp lệ"),
  note: z.string().max(500),
  categoryId: z.string().min(1, "Chọn danh mục"),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

type ExpenseFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  uid: string;
  expense: ExpenseDoc | null;
  activeCategories: CategoryDoc[];
  categoriesLoading: boolean;
  onSuccess: () => void;
};

export function ExpenseForm({
  open,
  onOpenChange,
  mode,
  uid,
  expense,
  activeCategories,
  categoriesLoading,
  onSuccess,
}: ExpenseFormProps) {
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: "",
      note: "",
      categoryId: "",
    },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    if (mode === "edit" && expense) {
      const validCategory = activeCategories.some(
        (c) => c.id === expense.categoryId
      );
      form.reset({
        amount: formatThousandsInput(String(Math.round(expense.amount))),
        note: expense.note ?? "",
        categoryId: validCategory ? expense.categoryId : "",
      });
    } else {
      form.reset({
        amount: "",
        note: "",
        categoryId: "",
      });
    }
  }, [open, expense, mode, form, activeCategories]);

  const onSubmit = form.handleSubmit(async (values) => {
    const amount = parseAmountToNumber(values.amount);
    try {
      if (mode === "create") {
        await createExpense(uid, {
          amount,
          note: values.note,
          categoryId: values.categoryId,
        });
        toast.success("Tạo khoản chi thành công.");
      } else if (expense) {
        await updateExpense(uid, expense.id, {
          amount,
          note: values.note,
          categoryId: values.categoryId,
        });
        toast.success("Cập nhật khoản chi thành công.");
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
  const noCategories = !categoriesLoading && activeCategories.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Thêm khoản chi" : "Sửa khoản chi"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Nhập số tiền, ghi chú và chọn danh mục."
              : "Cập nhật thông tin khoản chi."}
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
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Danh mục</FormLabel>
                  <Select
                    disabled={categoriesLoading || noCategories}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full cursor-pointer disabled:cursor-not-allowed">
                        <SelectValue
                          placeholder={
                            categoriesLoading
                              ? "Đang tải danh mục…"
                              : noCategories
                                ? "Chưa có danh mục"
                                : "Chọn danh mục"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeCategories.map((c) => (
                        <SelectItem
                          key={c.id}
                          value={c.id}
                          className="cursor-pointer"
                        >
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                disabled={submitting || noCategories}
                className="cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting
                  ? "Đang lưu…"
                  : mode === "create"
                    ? "Tạo"
                    : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
