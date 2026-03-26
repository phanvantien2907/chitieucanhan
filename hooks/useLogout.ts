"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { mapFirebaseAuthError, signOutUser } from "@/services/auth.service";

export function useLogout() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const logout = useCallback(async () => {
    setIsPending(true);
    try {
      await signOutUser();
      toast.success("Đăng xuất thành công.");
      router.push("/login");
    } catch (error: unknown) {
      toast.error(mapFirebaseAuthError(error));
    } finally {
      setIsPending(false);
    }
  }, [router]);

  return { logout, isPending };
}
