"use client";

import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  clearSavingsPinVerifiedCookie,
  isSavingsPinVerifiedCookie,
  setSavingsPinVerifiedCookie,
} from "@/lib/savings-pin-session";
import { userHasPin } from "@/services/security.service";

import { SavingsPinDialog } from "./pin-dialog";
import { SavingsTable } from "./savings-table";

export function SavingsPinGate() {
  const { user, isLoading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const [checkingPin, setCheckingPin] = useState(true);
  const [hasPin, setHasPin] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!uid) {
      clearSavingsPinVerifiedCookie();
      setCheckingPin(false);
      setUnlocked(false);
      setHasPin(false);
      return;
    }

    let cancelled = false;
    setCheckingPin(true);
    void (async () => {
      try {
        const hp = await userHasPin(uid);
        if (cancelled) {
          return;
        }
        setHasPin(hp);
        if (hp && isSavingsPinVerifiedCookie()) {
          setUnlocked(true);
        } else {
          setUnlocked(false);
        }
      } finally {
        if (!cancelled) {
          setCheckingPin(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const handleVerified = () => {
    setSavingsPinVerifiedCookie();
    setUnlocked(true);
    setHasPin(true);
  };

  if (authLoading || checkingPin) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 p-1">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!uid) {
    return null;
  }

  const showPinDialog = !unlocked;
  const pinMode = hasPin ? "verify" : "set";

  return (
    <>
      <SavingsPinDialog
        open={showPinDialog}
        mode={pinMode}
        uid={uid}
        onVerified={handleVerified}
      />
      {unlocked ? <SavingsTable /> : null}
    </>
  );
}
