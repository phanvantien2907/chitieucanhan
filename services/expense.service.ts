import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

const EXPENSES_COLLECTION = "expenses";
const CATEGORIES_COLLECTION = "categories";

const CODE_PREFIX = "CT";
const CODE_RANDOM_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_GENERATION_MAX_ATTEMPTS = 30;

/** Firestore `expenses/{id}` document shape (scoped by `userId`). */
export type ExpenseDoc = {
  id: string;
  userId: string;
  /** `#CT-YYYYMMDD-XXXX` — only set for new documents; legacy rows may be empty. */
  code: string;
  amount: number;
  note: string;
  categoryId: string;
  createdAt: Timestamp | null;
  deletedAt: Timestamp | null;
};

function padYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function randomSuffix4(): string {
  let s = "";
  for (let i = 0; i < 4; i++) {
    s +=
      CODE_RANDOM_CHARSET[
        Math.floor(Math.random() * CODE_RANDOM_CHARSET.length)
      ] ?? "0";
  }
  return s;
}

/** Returns whether `code` is already used in `expenses`. */
export async function isExpenseCodeTaken(code: string): Promise<boolean> {
  const q = query(
    collection(db, EXPENSES_COLLECTION),
    where("code", "==", code),
    limit(1)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Builds `#CT-YYYYMMDD-XXXX` (uppercase alphanumerics) and retries if Firestore already has it.
 */
export async function generateExpenseCode(): Promise<string> {
  for (let attempt = 0; attempt < CODE_GENERATION_MAX_ATTEMPTS; attempt++) {
    const ymd = padYmd(new Date());
    const suffix = randomSuffix4();
    const code = `#${CODE_PREFIX}${ymd}${suffix}`;
    const taken = await isExpenseCodeTaken(code);
    if (!taken) {
      return code;
    }
  }
  throw new Error("Không tạo được mã giao dịch duy nhất.");
}

function mapExpenseDoc(
  docId: string,
  data: Record<string, unknown>
): ExpenseDoc {
  const rawAmount = data.amount;
  const amount =
    typeof rawAmount === "number"
      ? rawAmount
      : Number(rawAmount ?? Number.NaN);
  return {
    id: docId,
    userId: String(data.userId ?? ""),
    code: String(data.code ?? ""),
    amount: Number.isFinite(amount) ? amount : 0,
    note: String(data.note ?? ""),
    categoryId: String(data.categoryId ?? ""),
    createdAt: (data.createdAt as Timestamp | null) ?? null,
    deletedAt: (data.deletedAt as Timestamp | null) ?? null,
  };
}

function expensesQuery(uid: string) {
  return query(
    collection(db, EXPENSES_COLLECTION),
    where("userId", "==", uid)
  );
}

export async function getExpenses(uid: string): Promise<ExpenseDoc[]> {
  const snapshot = await getDocs(expensesQuery(uid));
  return snapshot.docs.map((d) =>
    mapExpenseDoc(d.id, d.data() as Record<string, unknown>)
  );
}

export function subscribeExpenses(
  uid: string,
  onUpdate: (expenses: ExpenseDoc[]) => void,
  onError: (error: Error) => void
): () => void {
  return onSnapshot(
    expensesQuery(uid),
    (snapshot) => {
      const list = snapshot.docs.map((d) =>
        mapExpenseDoc(d.id, d.data() as Record<string, unknown>)
      );
      onUpdate(list);
    },
    (err) => {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

async function assertExpenseOwner(uid: string, expenseId: string): Promise<void> {
  const ref = doc(db, EXPENSES_COLLECTION, expenseId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Expense not found.");
  }
  const data = snap.data() as { userId?: string };
  if (data.userId !== uid) {
    throw new Error("You do not have permission to modify this expense.");
  }
}

async function assertCategoryValidForExpense(
  uid: string,
  categoryId: string
): Promise<void> {
  const ref = doc(db, CATEGORIES_COLLECTION, categoryId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Category not found.");
  }
  const data = snap.data() as { userId?: string; deletedAt?: Timestamp | null };
  if (data.userId !== uid) {
    throw new Error("Invalid category.");
  }
  if (data.deletedAt != null) {
    throw new Error("Cannot use a deleted category.");
  }
}

export async function createExpense(
  uid: string,
  input: { amount: number; note: string; categoryId: string }
): Promise<void> {
  await assertCategoryValidForExpense(uid, input.categoryId);
  const note = input.note.trim();
  const code = await generateExpenseCode();
  await addDoc(collection(db, EXPENSES_COLLECTION), {
    userId: uid,
    code,
    amount: input.amount,
    note,
    categoryId: input.categoryId,
    createdAt: serverTimestamp(),
    deletedAt: null,
  });
}

export async function updateExpense(
  uid: string,
  expenseId: string,
  input: { amount: number; note: string; categoryId: string }
): Promise<void> {
  await assertExpenseOwner(uid, expenseId);
  await assertCategoryValidForExpense(uid, input.categoryId);
  const ref = doc(db, EXPENSES_COLLECTION, expenseId);
  const note = input.note.trim();
  await updateDoc(ref, {
    amount: input.amount,
    note,
    categoryId: input.categoryId,
  });
}

export async function softDeleteExpense(
  uid: string,
  expenseId: string
): Promise<void> {
  await assertExpenseOwner(uid, expenseId);
  const ref = doc(db, EXPENSES_COLLECTION, expenseId);
  await updateDoc(ref, {
    deletedAt: serverTimestamp(),
  });
}
