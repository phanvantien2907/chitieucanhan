"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import type { User } from "firebase/auth";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type SaveProfileInput } from "@/hooks/useProfile";

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên hiển thị")
    .max(100, "Tối đa 100 ký tự"),
  photoURL: z
    .string()
    .trim()
    .max(2000)
    .refine(
      (v) => !v || /^https?:\/\/.+/i.test(v),
      "Nhập URL ảnh hợp lệ (http hoặc https)"
    ),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

type ProfileFormProps = {
  user: User | null;
  authLoading: boolean;
  saving: boolean;
  onSave: (input: SaveProfileInput) => Promise<void>;
};

export function ProfileForm({
  user,
  authLoading,
  saving,
  onSave,
}: ProfileFormProps) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      photoURL: "",
    },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (!user) {
      return;
    }
    form.reset({
      displayName: user.displayName ?? "",
      photoURL: user.photoURL ?? "",
    });
  }, [user, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await onSave({
        displayName: values.displayName,
        photoURL: values.photoURL,
      });
      toast.success("Đã cập nhật hồ sơ.");
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Không thể lưu. Vui lòng thử lại.";
      toast.error(message);
    }
  });

  if (authLoading) {
    return (
      <Card className="rounded-xl border shadow-sm">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="rounded-xl border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Tài khoản</CardTitle>
          <CardDescription>Không tìm thấy phiên đăng nhập.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border shadow-sm transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">Thông tin hồ sơ</CardTitle>
        <CardDescription>
          Tên hiển thị và ảnh đại diện (URL). Email chỉ xem, không đổi tại đây.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-5">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên hiển thị</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="name"
                      placeholder="Nguyễn Văn A"
                      className="h-11 min-h-11 rounded-lg"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-2">
              <label
                className="text-sm font-medium leading-none"
                htmlFor="settings-email"
              >
                Email
              </label>
              <Input
                id="settings-email"
                type="email"
                value={user.email ?? ""}
                disabled
                readOnly
                className="h-11 min-h-11 rounded-lg bg-muted/60"
              />
              <p className="text-muted-foreground text-xs">
                Email đăng nhập chỉ đọc. Đổi email cần luồng xác thực riêng.
              </p>
            </div>
            <FormField
              control={form.control}
              name="photoURL"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ảnh đại diện (URL)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="url"
                      inputMode="url"
                      autoComplete="photo"
                      placeholder="https://..."
                      className="h-11 min-h-11 rounded-lg"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="submit"
                    className="h-11 min-h-11 w-full cursor-pointer touch-manipulation sm:w-auto"
                    disabled={saving}
                  >
                    {saving ? "Đang lưu…" : "Lưu thay đổi"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Lưu tên và ảnh đại diện lên Firebase
                </TooltipContent>
              </Tooltip>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
