"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import {
  loginWithEmailAndProfileCheck,
  loginWithGoogleAndProfileCheck,
  mapLoginErrorToMessage,
} from "@/services/auth.service";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ"),
  password: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu")
    .min(8, "Mật khẩu ít nhất 8 ký tự"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export function useLogin() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onSubmit",
  });

  const onEmailSubmit = form.handleSubmit(async (values) => {
    setAuthError(null);
    try {
      await loginWithEmailAndProfileCheck(values.email, values.password);
      toast.success("Đăng nhập thành công.");
      router.push("/dashboard");
    } catch (error: unknown) {
      const message = mapLoginErrorToMessage(error);
      setAuthError(message);
      toast.error(message);
    }
  });

  const onGoogleSignIn = useCallback(async () => {
    setAuthError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogleAndProfileCheck();
      toast.success("Đăng nhập thành công.");
      router.push("/dashboard");
    } catch (error: unknown) {
      const message = mapLoginErrorToMessage(error);
      setAuthError(message);
      toast.error(message);
    } finally {
      setGoogleLoading(false);
    }
  }, [router]);

  const isSubmitting = form.formState.isSubmitting;

  return {
    form,
    onEmailSubmit,
    onGoogleSignIn,
    authError,
    setAuthError,
    isSubmitting,
    googleLoading,
    isBusy: isSubmitting || googleLoading,
  };
}
