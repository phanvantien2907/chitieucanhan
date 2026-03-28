"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { DatePicker } from "@/components/ui/date-picker";
import type {
  CategoryDoc,
  CategorySelectOption,
} from "@/services/category.service";
import { toStartOfDay } from "@/lib/date";
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
  expenseDate: z.date({
    required_error: "Chọn ngày chi tiêu",
    invalid_type_error: "Ngày không hợp lệ",
  }),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

type ExpenseFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  uid: string;
  expense: ExpenseDoc | null;
  activeCategories: CategoryDoc[];
  categorySelectOptions: CategorySelectOption[];
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
  categorySelectOptions,
  categoriesLoading,
  onSuccess,
}: ExpenseFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: "",
      note: "",
      categoryId: "",
      expenseDate: toStartOfDay(new Date()),
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
      const created = expense.createdAt?.toDate?.();
      const expenseDate =
        (expense.expenseDate?.toDate?.()
          ? toStartOfDay(expense.expenseDate.toDate())
          : null) ??
        (created ? toStartOfDay(created) : toStartOfDay(new Date()));
      form.reset({
        amount: formatThousandsInput(String(Math.round(expense.amount))),
        note: expense.note ?? "",
        categoryId: validCategory ? expense.categoryId : "",
        expenseDate,
      });
    } else {
      form.reset({
        amount: "",
        note: "",
        categoryId: "",
        expenseDate: toStartOfDay(new Date()),
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
          expenseDate: values.expenseDate,
        });
        toast.success("Tạo khoản chi thành công.");
      } else if (expense) {
        await updateExpense(uid, expense.id, {
          amount,
          note: values.note,
          categoryId: values.categoryId,
          expenseDate: values.expenseDate,
        });
        toast.success("Cập nhật khoản chi thành công.");
      }
      await queryClient.invalidateQueries({
        queryKey: ["firestore", "expenses", uid],
      });
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
              ? "Nhập số tiền, ngày phát sinh, ghi chú và chọn danh mục."
              : "Cập nhật thông tin khoản chi."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4">
            <FormField
              control={form.control}
              name="expenseDate"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-2">
                  <FormLabel>Ngày chi tiêu</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      disabled={submitting}
                      aria-invalid={!!form.formState.errors.expenseDate}
                    />
                  </FormControl>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Chọn đúng ngày bạn đã chi (có thể nhập lại sau hoặc ghi nhận
                    chi tiêu trước đó — ví dụ tiền mua hôm qua nhưng ghi sổ hôm
                    nay).
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                    <SelectContent className="max-h-72 overflow-y-auto p-1">
                      {categorySelectOptions.map((o) => (
                        <SelectItem
                          key={o.value}
                          value={o.value}
                          className="cursor-pointer rounded-md text-sm"
                          style={{
                            paddingLeft: `calc(0.75rem + ${o.depth} * 1rem)`,
                          }}
                        >
                          {o.label}
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
