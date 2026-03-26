"use client";

import { useCallback, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";

import { auth } from "@/lib/firebase";
import {
  changePasswordWithCurrent,
  userHasPasswordProvider,
} from "@/services/auth.service";
import { userHasPin } from "@/services/security.service";
import { upsertUserProfile } from "@/services/user.service";

export type SaveProfileInput = {
  displayName: string;
  photoURL: string;
};

export function useProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasPin, setHasPin] = useState(false);
  const [pinLoading, setPinLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        setPinLoading(true);
        try {
          setHasPin(await userHasPin(u.uid));
        } finally {
          setPinLoading(false);
        }
      } else {
        setHasPin(false);
        setPinLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const refreshPinState = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) {
      return;
    }
    setPinLoading(true);
    try {
      setHasPin(await userHasPin(u.uid));
    } finally {
      setPinLoading(false);
    }
  }, []);

  const saveProfile = useCallback(async (input: SaveProfileInput) => {
    const u = auth.currentUser;
    if (!u) {
      throw new Error("Chưa đăng nhập.");
    }
    setSavingProfile(true);
    try {
      const displayName = input.displayName.trim();
      const photoTrim = input.photoURL.trim();
      const photoURL = photoTrim.length > 0 ? photoTrim : null;
      await updateProfile(u, {
        displayName: displayName.length > 0 ? displayName : null,
        photoURL,
      });
      await upsertUserProfile(u.uid, {
        displayName: displayName.length > 0 ? displayName : null,
        email: u.email,
        photoURL,
      });
      await u.reload();
      setUser(auth.currentUser);
    } finally {
      setSavingProfile(false);
    }
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const u = auth.currentUser;
      if (!u) {
        throw new Error("Chưa đăng nhập.");
      }
      setChangingPassword(true);
      try {
        await changePasswordWithCurrent(currentPassword, newPassword);
        await u.reload();
        setUser(auth.currentUser);
      } finally {
        setChangingPassword(false);
      }
    },
    []
  );

  return {
    user,
    authLoading,
    hasPin,
    pinLoading,
    hasPasswordProvider: user ? userHasPasswordProvider(user) : false,
    savingProfile,
    changingPassword,
    saveProfile,
    changePassword,
    refreshPinState,
  };
}
