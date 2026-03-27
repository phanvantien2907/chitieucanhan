import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { getCategories } from "@/services/category.service";
import { createExpense } from "@/services/expense.service";
import { db } from "@/lib/firebase";

const DEBTS_COLLECTION = "debts";

export type DebtType = "receivable" | "payable";
export type DebtStatus = "pending" | "paid";

/** Firestore `debts/{id}` document (scoped by `userId`). */
export type DebtDoc = {
  id: string;
  userId: string;
  type: DebtType;
  personName: string;
  amount: number;
  note: string;
  dueDate: Timestamp | null;
  status: DebtStatus;
  paidAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  deletedAt: Timestamp | null;
};

function mapDebtDoc(docId: string, data: Record<string, unknown>): DebtDoc {
  const rawAmount = data.amount;
  const amount =
    typeof rawAmount === "number"
      ? rawAmount
      : Number(rawAmount ?? Number.NaN);
  const typeRaw = String(data.type ?? "");
  const type: DebtType =
    typeRaw === "payable" || typeRaw === "receivable" ? typeRaw : "payable";
  const statusRaw = String(data.status ?? "");
  const status: DebtStatus =
    statusRaw === "paid" || statusRaw === "pending" ? statusRaw : "pending";

  return {
    id: docId,
    userId: String(data.userId ?? ""),
    type,
    personName: String(data.personName ?? ""),
    amount: Number.isFinite(amount) ? amount : 0,
    note: String(data.note ?? ""),
    dueDate: (data.dueDate as Timestamp | null) ?? null,
    status,
    paidAt: (data.paidAt as Timestamp | null) ?? null,
    createdAt: (data.createdAt as Timestamp | null) ?? null,
    updatedAt: (data.updatedAt as Timestamp | null) ?? null,
    deletedAt: (data.deletedAt as Timestamp | null) ?? null,
  };
}

function debtsQuery(uid: string) {
  return query(
    collection(db, DEBTS_COLLECTION),
    where("userId", "==", uid)
  );
}

export async function getDebts(uid: string): Promise<DebtDoc[]> {
  const snapshot = await getDocs(debtsQuery(uid));
  return snapshot.docs.map((d) =>
    mapDebtDoc(d.id, d.data() as Record<string, unknown>)
  );
}

export function subscribeDebts(
  uid: string,
  onUpdate: (rows: DebtDoc[]) => void,
  onError: (error: Error) => void
): () => void {
  return onSnapshot(
    debtsQuery(uid),
    (snapshot) => {
      const list = snapshot.docs.map((d) =>
        mapDebtDoc(d.id, d.data() as Record<string, unknown>)
      );
      onUpdate(list);
    },
    (err) => {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

async function assertDebtOwner(uid: string, debtId: string): Promise<DebtDoc> {
  const ref = doc(db, DEBTS_COLLECTION, debtId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Không tìm thấy khoản nợ.");
  }
  const row = mapDebtDoc(debtId, snap.data() as Record<string, unknown>);
  if (row.userId !== uid) {
    throw new Error("Không có quyền thao tác.");
  }
  return row;
}

async function getFirstActiveCategoryId(uid: string): Promise<string | null> {
  const cats = await getCategories(uid);
  const active = cats.find((c) => c.deletedAt == null);
  return active?.id ?? null;
}

export async function createDebt(
  uid: string,
  input: {
    type: DebtType;
    personName: string;
    amount: number;
    note: string;
    dueDate: Timestamp | null;
  }
): Promise<void> {
  const personName = input.personName.trim();
  if (!personName) {
    throw new Error("Vui lòng nhập tên người liên quan.");
  }
  await addDoc(collection(db, DEBTS_COLLECTION), {
    userId: uid,
    type: input.type,
    personName,
    amount: input.amount,
    note: input.note.trim(),
    dueDate: input.dueDate,
    status: "pending",
    paidAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
  });
}

export async function updateDebt(
  uid: string,
  debtId: string,
  input: {
    type: DebtType;
    personName: string;
    amount: number;
    note: string;
    dueDate: Timestamp | null;
  }
): Promise<void> {
  const existing = await assertDebtOwner(uid, debtId);
  if (existing.deletedAt != null) {
    throw new Error("Không thể sửa khoản đã xóa.");
  }
  if (existing.status === "paid") {
    throw new Error("Không thể sửa khoản đã hoàn tất.");
  }
  const personName = input.personName.trim();
  if (!personName) {
    throw new Error("Vui lòng nhập tên người liên quan.");
  }
  const ref = doc(db, DEBTS_COLLECTION, debtId);
  await updateDoc(ref, {
    type: input.type,
    personName,
    amount: input.amount,
    note: input.note.trim(),
    dueDate: input.dueDate,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Marks debt as paid. For `payable`, creates an expense (first active category).
 */
export async function markAsPaid(uid: string, debtId: string): Promise<void> {
  const existing = await assertDebtOwner(uid, debtId);
  if (existing.deletedAt != null) {
    throw new Error("Không thể thao tác với khoản đã xóa.");
  }
  if (existing.status === "paid") {
    throw new Error("Khoản này đã được đánh dấu đã trả.");
  }

  const ref = doc(db, DEBTS_COLLECTION, debtId);

  if (existing.type === "payable") {
    const categoryId = await getFirstActiveCategoryId(uid);
    if (!categoryId) {
      throw new Error(
        "Cần ít nhất một danh mục chi tiêu đang hoạt động để ghi khoản trả nợ tự động."
      );
    }
    await updateDoc(ref, {
      status: "paid",
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const noteParts = [`Trả nợ: ${existing.personName}`];
    if (existing.note.trim()) {
      noteParts.push(existing.note.trim());
    }
    await createExpense(uid, {
      amount: existing.amount,
      note: noteParts.join(" — "),
      categoryId,
    });
  } else {
    await updateDoc(ref, {
      status: "paid",
      paidAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function softDeleteDebt(
  uid: string,
  debtId: string
): Promise<void> {
  const existing = await assertDebtOwner(uid, debtId);
  if (existing.status === "paid") {
    throw new Error("Không thể xóa khoản đã hoàn tất.");
  }
  const ref = doc(db, DEBTS_COLLECTION, debtId);
  await updateDoc(ref, {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** `YYYY-MM-DD` from `<input type="date" />` → Firestore `Timestamp` at local noon. */
export function parseDueDateInput(isoDate: string): Timestamp | null {
  const t = isoDate.trim();
  if (!t) return null;
  const d = new Date(`${t}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Timestamp.fromDate(d);
}

/** For controlled date input from `DebtDoc.dueDate`. */
export function formatDueDateForInput(ts: Timestamp | null): string {
  if (!ts || typeof ts.toDate !== "function") return "";
  const d = ts.toDate();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
