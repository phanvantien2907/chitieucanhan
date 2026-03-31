import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

const USERS_COLLECTION = "users";

export type UserDoc = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: unknown;
  updatedAt: unknown;
  /** Soft-delete: when set, login is blocked (see `ensureUserDocumentAndAssertActive`). */
  deletedAt?: unknown;
};

export type UpsertUserProfileInput = {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

/** Sync profile fields to Firestore `users/{uid}` (merge). */
export async function upsertUserProfile(
  uid: string,
  input: UpsertUserProfileInput
): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, uid);
  const snap = await getDoc(ref);
  const exists = snap.exists();

  await setDoc(
    ref,
    {
      uid,
      displayName: input.displayName,
      email: input.email,
      photoURL: input.photoURL,
      updatedAt: serverTimestamp(),
      ...(exists ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );
}

/** Soft-delete account: sets `deletedAt` on `users/{uid}` (does not remove data). */
export async function softDeleteUserAccount(uid: string): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, uid);
  await updateDoc(ref, {
    deletedAt: serverTimestamp(),
  });
}
