import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";

const USERS_COLLECTION = "users";

export type UserDoc = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: unknown;
  updatedAt: unknown;
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
