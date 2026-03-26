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
import { mapPasswordChangeError } from "@/services/auth.service";

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Nhập mật khẩu hiện tại")
      .max(128),
    newPassword: z
      .string()
      .min(6, "Mật khẩu mới tối thiểu 6 ký tự")
      .max(128, "Tối đa 128 ký tự"),
    confirmPassword: z.string().min(1, "Xác nhận mật khẩu mới"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Mật khẩu mới phải khác mật khẩu hiện tại",
    path: ["newPassword"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

type ChangePasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canUsePasswordChange: boolean;
  changingPassword: boolean;
  onChangePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
};

export function ChangePasswordDialog({
  open,
  onOpenChange,
  canUsePasswordChange,
  changingPassword,
  onChangePassword,
}: ChangePasswordDialogProps) {
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (!open) {
      form.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!canUsePasswordChange) {
      toast.error(
        "Tài khoản đăng nhập bằng Google. Đổi mật khẩu trong tài khoản Google."
      );
      return;
    }
    try {
      await onChangePassword(values.currentPassword, values.newPassword);
      toast.success("Đã đổi mật khẩu đăng nhập.");
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(mapPasswordChangeError(e));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[calc(100%-2rem)] gap-4 rounded-xl sm:max-w-md"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Đổi mật khẩu</DialogTitle>
          <DialogDescription>
            Nhập mật khẩu hiện tại và mật khẩu mới. Chỉ áp dụng cho tài khoản
            đăng nhập bằng email.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="pwd-current">Mật khẩu hiện tại</FormLabel>
                  <FormControl>
                    <Input
                      id="pwd-current"
                      type="password"
                      autoComplete="current-password"
                      className="h-11 min-h-11 rounded-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="pwd-new">Mật khẩu mới</FormLabel>
                  <FormControl>
                    <Input
                      id="pwd-new"
                      type="password"
                      autoComplete="new-password"
                      className="h-11 min-h-11 rounded-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="pwd-confirm">Xác nhận mật khẩu mới</FormLabel>
                  <FormControl>
                    <Input
                      id="pwd-confirm"
                      type="password"
                      autoComplete="new-password"
                      className="h-11 min-h-11 rounded-lg"
                      {...field}
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
                disabled={changingPassword}
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="h-11 min-h-11 w-full cursor-pointer touch-manipulation sm:w-auto"
                disabled={changingPassword || !canUsePasswordChange}
              >
                {changingPassword ? "Đang xử lý…" : "Lưu mật khẩu"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
