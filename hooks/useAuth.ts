"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getAuthAvatarInitials,
  getAuthDisplayLabel,
  subscribeAuthState,
  type AuthUserSnapshot,
} from "@/services/auth.service";

export function useAuth() {
  const [user, setUser] = useState<AuthUserSnapshot | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsub = subscribeAuthState((next) => {
      setUser(next);
      setIsReady(true);
    });
    return unsub;
  }, []);

  const displayLabel = useMemo(
    () => (user ? getAuthDisplayLabel(user.displayName, user.email) : ""),
    [user]
  );

  const initials = useMemo(
    () => (user ? getAuthAvatarInitials(user.displayName, user.email) : "??"),
    [user]
  );

  return {
    user,
    isLoading: !isReady,
    displayLabel,
    email: user?.email ?? null,
    initials,
  };
}
