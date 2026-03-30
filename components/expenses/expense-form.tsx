"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { SavingsPinDialog } from "@/components/savings/pin-dialog";
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
import { useFirestoreSavingsQuery } from "@/hooks/useFirestoreQueries";
import { usePinStatus } from "@/hooks/useSecurity";
import { queryKeys } from "@/lib/query-keys";
import type {
  CategoryDoc,
  CategorySelectOption,
} from "@/services/category.service";
import {
  createExpense,
  updateExpense,
  type ExpenseDoc,
} from "@/services/expense.service";
import { getSavingBalance } from "@/services/savings.service";
import { toStartOfDay } from "@/lib/date";

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

function formatMoney(amount: number): string {
  return amount.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
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
  moneySource: z.enum(["normal", "savings"]),
  savingsId: z.string(),
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
  const { hasPin, pinLoading } = usePinStatus(uid);
  const savingsQuery = useFirestoreSavingsQuery(open ? uid : null);
  const [pinOpen, setPinOpen] = useState(false);
  const [savingsUnlocked, setSavingsUnlocked] = useState(false);
  const pinSuccessRef = useRef(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: "",
      note: "",
      categoryId: "",
      expenseDate: toStartOfDay(new Date()),
      moneySource: "normal",
      savingsId: "",
    },
    mode: "onSubmit",
  });

  const moneySource = form.watch("moneySource");

  const activeSavings = useMemo(() => {
    const rows = savingsQuery.data ?? [];
    return rows.filter((s) => s.deletedAt == null);
  }, [savingsQuery.data]);

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
        moneySource: expense.fromSavings ? "savings" : "normal",
        savingsId: expense.savingsId ?? "",
      });
      setSavingsUnlocked(true);
      setPinOpen(false);
    } else {
      form.reset({
        amount: "",
        note: "",
        categoryId: "",
        expenseDate: toStartOfDay(new Date()),
        moneySource: "normal",
        savingsId: "",
      });
      setSavingsUnlocked(false);
      setPinOpen(false);
    }
  }, [open, expense, mode, form, activeCategories]);

  const onSubmit = form.handleSubmit(async (values) => {
    const amount = parseAmountToNumber(values.amount);
    try {
      if (mode === "create") {
        if (values.moneySource === "savings") {
          if (!savingsUnlocked) {
            toast.error("Vui lòng nhập PIN để xác thực.");
            return;
          }
          if (!values.savingsId) {
            toast.error("Chọn khoản tiết kiệm.");
            return;
          }
          const selected = activeSavings.find((s) => s.id === values.savingsId);
          if (!selected) {
            toast.error("Khoản tiết kiệm không hợp lệ.");
            return;
          }
          const bal = getSavingBalance(selected);
          if (amount > bal) {
            toast.error("Không đủ số dư tiết kiệm.");
            return;
          }
          const savingsName = selected.note.trim() || "Tiết kiệm";
          await createExpense(uid, {
            amount,
            note: values.note,
            categoryId: values.categoryId,
            expenseDate: values.expenseDate,
            fromSavings: true,
            savingsId: values.savingsId,
            savingsName,
          });
        } else {
          await createExpense(uid, {
            amount,
            note: values.note,
            categoryId: values.categoryId,
            expenseDate: values.expenseDate,
            fromSavings: false,
            savingsId: null,
            savingsName: null,
          });
        }
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
        queryKey: queryKeys.expensesAll(uid),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.savings(uid),
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
  const showSavingsPick =
    mode === "create" &&
    moneySource === "savings" &&
    savingsUnlocked &&
    hasPin;

  return (
    <>
      <SavingsPinDialog
        open={pinOpen}
        onOpenChange={(o) => {
          setPinOpen(o);
          if (!o) {
            if (!pinSuccessRef.current) {
              form.setValue("moneySource", "normal");
              form.setValue("savingsId", "");
            }
            pinSuccessRef.current = false;
          }
        }}
        dismissible
        mode="verify"
        uid={uid}
        verifyDescription="Nhập PIN để chọn khoản tiết kiệm."
        verifyInputId="expense-savings-pin"
        onVerified={() => {
          pinSuccessRef.current = true;
          setSavingsUnlocked(true);
          setPinOpen(false);
        }}
      />
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
              {mode === "edit" && expense?.fromSavings ? (
                <div className="bg-muted/40 rounded-lg border px-3 py-2 text-sm">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    Nguồn tiền
                  </p>
                  <p className="mt-1 font-medium">
                    Từ tiết kiệm
                    {expense.savingsName ? ` — ${expense.savingsName}` : ""}
                  </p>
                </div>
              ) : null}
              {mode === "create" ? (
                <FormField
                  control={form.control}
                  name="moneySource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nguồn tiền</FormLabel>
                      <Select
                        disabled={submitting || pinLoading}
                        onValueChange={(v: "normal" | "savings") => {
                          if (v === "normal") {
                            field.onChange("normal");
                            form.setValue("savingsId", "");
                            setSavingsUnlocked(false);
                            return;
                          }
                          if (pinLoading) {
                            return;
                          }
                          if (!hasPin) {
                            toast.error(
                              "Vui lòng thiết lập PIN trong mục Tiết kiệm."
                            );
                            return;
                          }
                          pinSuccessRef.current = false;
                          field.onChange("savings");
                          form.setValue("savingsId", "");
                          setSavingsUnlocked(false);
                          setPinOpen(true);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full cursor-pointer disabled:cursor-not-allowed">
                            <SelectValue placeholder="Chọn nguồn" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem
                            value="normal"
                            className="cursor-pointer"
                          >
                            Chi tiêu thường
                          </SelectItem>
                          <SelectItem
                            value="savings"
                            className="cursor-pointer"
                          >
                            Từ tiết kiệm
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {moneySource === "savings" && !savingsUnlocked ? (
                        <p className="text-muted-foreground text-xs">
                          Nhập PIN trong hộp thoại để chọn khoản tiết kiệm.
                        </p>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
              {showSavingsPick ? (
                <FormField
                  control={form.control}
                  name="savingsId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chọn khoản tiết kiệm</FormLabel>
                      <Select
                        disabled={submitting || savingsQuery.isLoading}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full cursor-pointer disabled:cursor-not-allowed">
                            <SelectValue
                              placeholder={
                                savingsQuery.isLoading
                                  ? "Đang tải…"
                                  : "Chọn khoản tiết kiệm"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-72 overflow-y-auto">
                          {activeSavings.length === 0 ? (
                            <div className="text-muted-foreground px-2 py-6 text-center text-sm">
                              Chưa có khoản tiết kiệm đang hoạt động.
                            </div>
                          ) : (
                            activeSavings.map((s) => {
                              const bal = getSavingBalance(s);
                              const label =
                                s.note.trim() !== ""
                                  ? s.note
                                  : `Tiết kiệm · ${s.id.slice(0, 6)}…`;
                              return (
                                <SelectItem
                                  key={s.id}
                                  value={s.id}
                                  className="cursor-pointer"
                                >
                                  <span className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                                    <span>{label}</span>
                                    <span className="text-muted-foreground tabular-nums text-xs">
                                      {formatMoney(bal)} đ
                                    </span>
                                  </span>
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
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
    </>
  );
}
