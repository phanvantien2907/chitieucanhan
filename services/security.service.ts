import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Timestamp as FirestoreTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

const USER_SECURITY_COLLECTION = "user_security";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000;

export type UserSecurityDoc = {
  uid: string;
  pin: string;
  failedAttempts: number;
  lockUntil: FirestoreTimestamp | null;
  createdAt: FirestoreTimestamp | null;
  updatedAt: FirestoreTimestamp | null;
};

/** SHA-256 hex; salt with uid so the same PIN differs per user. */
export async function hashPin(uid: string, pin: string): Promise<string> {
  const payload = `${uid}:${pin}`;
  const enc = new TextEncoder().encode(payload);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function mapUserSecurity(
  docId: string,
  data: Record<string, unknown>
): UserSecurityDoc {
  return {
    uid: String(data.uid ?? docId),
    pin: String(data.pin ?? ""),
    failedAttempts: Number(data.failedAttempts ?? 0),
    lockUntil: (data.lockUntil as FirestoreTimestamp | null) ?? null,
    createdAt: (data.createdAt as FirestoreTimestamp | null) ?? null,
    updatedAt: (data.updatedAt as FirestoreTimestamp | null) ?? null,
  };
}

export async function getUserSecurity(
  uid: string
): Promise<UserSecurityDoc | null> {
  const ref = doc(db, USER_SECURITY_COLLECTION, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return null;
  }
  return mapUserSecurity(snap.id, snap.data() as Record<string, unknown>);
}

/** `true` if user has a PIN document with a stored hash. */
export async function userHasPin(uid: string): Promise<boolean> {
  const row = await getUserSecurity(uid);
  return row != null && row.pin.length > 0;
}

export async function setInitialPin(uid: string, pin: string): Promise<void> {
  const ref = doc(db, USER_SECURITY_COLLECTION, uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data() as { pin?: string };
    if (data.pin && data.pin.length > 0) {
      throw new Error("PIN đã được thiết lập.");
    }
  }
  const hashed = await hashPin(uid, pin);
  await setDoc(ref, {
    uid,
    pin: hashed,
    failedAttempts: 0,
    lockUntil: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export type VerifyPinResult = "ok" | "wrong" | "locked" | "no_pin";

export async function verifyPin(
  uid: string,
  pin: string
): Promise<VerifyPinResult> {
  const ref = doc(db, USER_SECURITY_COLLECTION, uid);
  let snap = await getDoc(ref);
  if (!snap.exists()) {
    return "no_pin";
  }

  let data = snap.data() as {
    pin?: string;
    failedAttempts?: number;
    lockUntil?: FirestoreTimestamp | null;
  };

  const storedHash = String(data.pin ?? "");
  if (!storedHash) {
    return "no_pin";
  }

  const nowMs = Date.now();
  const lockTs = data.lockUntil;

  if (lockTs?.toMillis != null && lockTs.toMillis() > nowMs) {
    return "locked";
  }

  if (lockTs?.toMillis != null && lockTs.toMillis() <= nowMs) {
    await updateDoc(ref, {
      failedAttempts: 0,
      lockUntil: null,
      updatedAt: serverTimestamp(),
    });
    snap = await getDoc(ref);
    data = snap.data() as typeof data;
  }

  const inputHash = await hashPin(uid, pin);
  if (inputHash === storedHash) {
    await updateDoc(ref, {
      failedAttempts: 0,
      lockUntil: null,
      updatedAt: serverTimestamp(),
    });
    return "ok";
  }

  const attempts = Number(data.failedAttempts ?? 0) + 1;
  const patch: Record<string, unknown> = {
    failedAttempts: attempts,
    updatedAt: serverTimestamp(),
  };
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    patch.lockUntil = Timestamp.fromDate(new Date(nowMs + LOCK_DURATION_MS));
  }
  await updateDoc(ref, patch);
  return "wrong";
}
