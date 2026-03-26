import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

const SAVINGS_COLLECTION = "savings";

export type SavingDoc = {
  id: string;
  userId: string;
  amount: number;
  note: string;
  createdAt: Timestamp | null;
  deletedAt: Timestamp | null;
};

function mapSavingDoc(docId: string, data: Record<string, unknown>): SavingDoc {
  const rawAmount = data.amount;
  const amount =
    typeof rawAmount === "number"
      ? rawAmount
      : Number(rawAmount ?? Number.NaN);
  return {
    id: docId,
    userId: String(data.userId ?? ""),
    amount: Number.isFinite(amount) ? amount : 0,
    note: String(data.note ?? ""),
    createdAt: (data.createdAt as Timestamp | null) ?? null,
    deletedAt: (data.deletedAt as Timestamp | null) ?? null,
  };
}

function savingsQuery(uid: string) {
  return query(
    collection(db, SAVINGS_COLLECTION),
    where("userId", "==", uid)
  );
}

export async function getSavings(uid: string): Promise<SavingDoc[]> {
  const snapshot = await getDocs(savingsQuery(uid));
  return snapshot.docs.map((d) =>
    mapSavingDoc(d.id, d.data() as Record<string, unknown>)
  );
}

export function subscribeSavings(
  uid: string,
  onUpdate: (rows: SavingDoc[]) => void,
  onError: (error: Error) => void
): () => void {
  return onSnapshot(
    savingsQuery(uid),
    (snapshot) => {
      const list = snapshot.docs.map((d) =>
        mapSavingDoc(d.id, d.data() as Record<string, unknown>)
      );
      onUpdate(list);
    },
    (err) => {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

async function assertSavingOwner(uid: string, savingId: string): Promise<void> {
  const ref = doc(db, SAVINGS_COLLECTION, savingId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Không tìm thấy khoản tiết kiệm.");
  }
  const data = snap.data() as { userId?: string };
  if (data.userId !== uid) {
    throw new Error("Không có quyền thao tác.");
  }
}

export async function createSaving(
  uid: string,
  input: { amount: number; note: string }
): Promise<void> {
  const note = input.note.trim();
  await addDoc(collection(db, SAVINGS_COLLECTION), {
    userId: uid,
    amount: input.amount,
    note,
    createdAt: serverTimestamp(),
    deletedAt: null,
  });
}

export async function updateSaving(
  uid: string,
  savingId: string,
  input: { amount: number; note: string }
): Promise<void> {
  await assertSavingOwner(uid, savingId);
  const ref = doc(db, SAVINGS_COLLECTION, savingId);
  const note = input.note.trim();
  await updateDoc(ref, {
    amount: input.amount,
    note,
  });
}

export async function softDeleteSaving(
  uid: string,
  savingId: string
): Promise<void> {
  await assertSavingOwner(uid, savingId);
  const ref = doc(db, SAVINGS_COLLECTION, savingId);
  await updateDoc(ref, {
    deletedAt: serverTimestamp(),
  });
}
