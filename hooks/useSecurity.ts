"use client";

import { useEffect, useState } from "react";

import { userHasPin } from "@/services/security.service";

/**
 * Loads whether the signed-in user has a security PIN (Firestore `user_security`).
 */
export function usePinStatus(uid: string | null) {
  const [hasPin, setHasPin] = useState(false);
  const [pinLoading, setPinLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setHasPin(false);
      setPinLoading(false);
      return;
    }
    setPinLoading(true);
    void userHasPin(uid)
      .then(setHasPin)
      .finally(() => setPinLoading(false));
  }, [uid]);

  return { hasPin, pinLoading };
}
