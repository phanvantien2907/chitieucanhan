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
import {
  formatThousandsInput,
  parseAmountToNumber,
} from "@/components/expenses/expense-form";
import {
  createDebt,
  formatDueDateForInput,
  parseDueDateInput,
  updateDebt,
  type DebtDoc,
  type DebtType,
} from "@/services/debt.service";

const debtFormSchema = z.object({
  type: z.enum(["receivable", "payable"]),
  personName: z.string().min(1, "Vui lòng nhập tên"),
  amount: z
    .string()
    .min(1, "Vui lòng nhập số tiền")
    .refine((s) => parseAmountToNumber(s) > 0, "Số tiền không hợp lệ"),
  note: z.string().max(2000),
  dueDate: z.string().optional(),
});

export type DebtFormValues = z.infer<typeof debtFormSchema>;

type DebtFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  uid: string;
  debt: DebtDoc | null;
  onSuccess: () => void;
};

export function DebtForm({
  open,
  onOpenChange,
  mode,
  uid,
  debt,
  onSuccess,
}: DebtFormProps) {
  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: {
      type: "payable",
      personName: "",
      amount: "",
      note: "",
      dueDate: "",
    },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    if (mode === "edit" && debt) {
      form.reset({
        type: debt.type,
        personName: debt.personName,
        amount: formatThousandsInput(String(Math.round(debt.amount))),
        note: debt.note ?? "",
        dueDate: formatDueDateForInput(debt.dueDate),
      });
    } else {
      form.reset({
        type: "payable",
        personName: "",
        amount: "",
        note: "",
        dueDate: "",
      });
    }
  }, [open, debt, mode, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const amount = parseAmountToNumber(values.amount);
    const dueTs = parseDueDateInput(values.dueDate ?? "");
    try {
      if (mode === "create") {
        await createDebt(uid, {
          type: values.type as DebtType,
          personName: values.personName,
          amount,
          note: values.note,
          dueDate: dueTs,
        });
        toast.success("Đã tạo khoản nợ.");
      } else if (debt) {
        await updateDebt(uid, debt.id, {
          type: values.type as DebtType,
          personName: values.personName,
          amount,
          note: values.note,
          dueDate: dueTs,
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
            {mode === "create" ? "Thêm khoản nợ" : "Sửa khoản nợ"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Ghi nhận khoản người khác nợ bạn hoặc bạn nợ người khác."
              : "Cập nhật thông tin khoản nợ."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full cursor-pointer">
                        <SelectValue placeholder="Chọn loại" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="receivable" className="cursor-pointer">
                        Họ nợ bạn
                      </SelectItem>
                      <SelectItem value="payable" className="cursor-pointer">
                        Bạn nợ
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="personName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên người liên quan</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Họ tên hoặc biệt danh"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
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
                      placeholder="vd: 1.000.000"
                      className="tabular-nums"
                      {...field}
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(formatThousandsInput(e.target.value))
                      }
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
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hạn trả (tùy chọn)</FormLabel>
                  <FormControl>
                    <Input type="date" className="cursor-pointer" {...field} />
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
                className="cursor-pointer"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={submitting}
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
