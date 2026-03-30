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

import { assertCategoryValidForUser } from "@/services/category.service";
import { db } from "@/lib/firebase";

export const SAVINGS_COLLECTION = "savings";

export type SavingDoc = {
  id: string;
  userId: string;
  /** Legacy field — kept in sync with `balance` for older UI paths. */
  amount: number;
  /** Current spendable balance (deducted when spending from savings). */
  balance: number;
  note: string;
  categoryId: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  deletedAt: Timestamp | null;
};

/** Current balance for a saving row (prefers `balance`, falls back to legacy `amount`). */
export function getSavingBalance(s: SavingDoc): number {
  const b = s.balance;
  if (typeof b === "number" && Number.isFinite(b)) {
    return b;
  }
  return s.amount;
}

export function savingBalanceFromRaw(data: Record<string, unknown>): number {
  const rawBalance = data.balance;
  const rawAmount = data.amount;
  const balance =
    typeof rawBalance === "number"
      ? rawBalance
      : Number(rawBalance ?? Number.NaN);
  const amount =
    typeof rawAmount === "number"
      ? rawAmount
      : Number(rawAmount ?? Number.NaN);
  const b = Number.isFinite(balance) ? balance : amount;
  return Number.isFinite(b) ? b : 0;
}

function mapSavingDoc(docId: string, data: Record<string, unknown>): SavingDoc {
  const rawAmount = data.amount;
  const amount =
    typeof rawAmount === "number"
      ? rawAmount
      : Number(rawAmount ?? Number.NaN);
  const amountN = Number.isFinite(amount) ? amount : 0;
  const balanceN = savingBalanceFromRaw(data);
  return {
    id: docId,
    userId: String(data.userId ?? ""),
    amount: amountN,
    balance: balanceN,
    note: String(data.note ?? ""),
    categoryId: String(data.categoryId ?? ""),
    createdAt: (data.createdAt as Timestamp | null) ?? null,
    updatedAt: (data.updatedAt as Timestamp | null) ?? null,
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
  input: { amount: number; note: string; categoryId: string }
): Promise<void> {
  await assertCategoryValidForUser(uid, input.categoryId);
  const note = input.note.trim();
  await addDoc(collection(db, SAVINGS_COLLECTION), {
    userId: uid,
    amount: input.amount,
    balance: input.amount,
    note,
    categoryId: input.categoryId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
  });
}

export async function updateSaving(
  uid: string,
  savingId: string,
  input: { amount: number; note: string; categoryId: string }
): Promise<void> {
  await assertSavingOwner(uid, savingId);
  await assertCategoryValidForUser(uid, input.categoryId);
  const ref = doc(db, SAVINGS_COLLECTION, savingId);
  const note = input.note.trim();
  await updateDoc(ref, {
    amount: input.amount,
    balance: input.amount,
    note,
    categoryId: input.categoryId,
    updatedAt: serverTimestamp(),
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
