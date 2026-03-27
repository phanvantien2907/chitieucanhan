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
import type {
  CategoryDoc,
  CategorySelectOption,
} from "@/services/category.service";
import { createSaving, updateSaving, type SavingDoc } from "@/services/savings.service";

import { formatThousandsInput, parseAmountToNumber } from "@/components/expenses/expense-form";

const savingsFormSchema = z.object({
  amount: z
    .string()
    .min(1, "Vui lòng nhập số tiền")
    .refine((s) => parseAmountToNumber(s) > 0, "Số tiền không hợp lệ"),
  note: z.string().max(500),
  categoryId: z.string().min(1, "Chọn danh mục"),
});

export type SavingsFormValues = z.infer<typeof savingsFormSchema>;

type SavingsFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  uid: string;
  saving: SavingDoc | null;
  activeCategories: CategoryDoc[];
  categorySelectOptions: CategorySelectOption[];
  categoriesLoading: boolean;
  onSuccess: () => void;
};

export function SavingsForm({
  open,
  onOpenChange,
  mode,
  uid,
  saving,
  activeCategories,
  categorySelectOptions,
  categoriesLoading,
  onSuccess,
}: SavingsFormProps) {
  const form = useForm<SavingsFormValues>({
    resolver: zodResolver(savingsFormSchema),
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
    if (mode === "edit" && saving) {
      const validCategory = activeCategories.some(
        (c) => c.id === saving.categoryId
      );
      form.reset({
        amount: formatThousandsInput(String(Math.round(saving.amount))),
        note: saving.note ?? "",
        categoryId:
          validCategory && saving.categoryId
            ? saving.categoryId
            : "",
      });
    } else {
      form.reset({
        amount: "",
        note: "",
        categoryId: "",
      });
    }
  }, [open, saving, mode, form, activeCategories]);

  const onSubmit = form.handleSubmit(async (values) => {
    const amount = parseAmountToNumber(values.amount);
    try {
      if (mode === "create") {
        await createSaving(uid, {
          amount,
          note: values.note,
          categoryId: values.categoryId,
        });
        toast.success("Đã tạo khoản tiết kiệm.");
      } else if (saving) {
        await updateSaving(uid, saving.id, {
          amount,
          note: values.note,
          categoryId: values.categoryId,
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
  const noCategories = !categoriesLoading && activeCategories.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Thêm tiết kiệm" : "Sửa tiết kiệm"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Nhập số tiền, ghi chú và chọn danh mục."
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
                {submitting ? "Đang lưu…" : mode === "create" ? "Tạo" : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
