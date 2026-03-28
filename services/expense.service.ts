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
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { toStartOfDay } from "@/lib/date";
import { assertCategoryValidForUser } from "@/services/category.service";
import { db } from "@/lib/firebase";

const EXPENSES_COLLECTION = "expenses";

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
  /**
   * Ngày phát sinh chi tiêu (date-only, local midnight). Independent from `createdAt`.
   * Legacy documents may omit this — UI falls back to `createdAt`.
   */
  expenseDate: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  deletedAt: Timestamp | null;
};

function padYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/** Firestore timestamp for the user's selected expense date (local calendar day). */
export function dateToExpenseTimestamp(d: Date): Timestamp {
  return Timestamp.fromDate(toStartOfDay(d));
}

/** Parse `dd/MM/yyyy` then normalize with `toStartOfDay` (same as save path). */
export function parseDdMmYyyyToDate(s: string): Date | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) {
    return null;
  }
  const day = Number(m[1]);
  const month1 = Number(m[2]);
  const year = Number(m[3]);
  if (
    month1 < 1 ||
    month1 > 12 ||
    day < 1 ||
    day > new Date(year, month1, 0).getDate()
  ) {
    return null;
  }
  return toStartOfDay(new Date(year, month1 - 1, day));
}

function parseExpenseDateField(raw: unknown): Timestamp | null {
  if (raw == null || raw === undefined) {
    return null;
  }
  if (
    typeof raw === "object" &&
    raw !== null &&
    "toMillis" in raw &&
    typeof (raw as Timestamp).toMillis === "function"
  ) {
    return raw as Timestamp;
  }
  if (typeof raw === "string") {
    const parsed = parseDdMmYyyyToDate(raw);
    if (parsed) {
      return Timestamp.fromDate(parsed);
    }
  }
  return null;
}

/** Display `dd/MM/yyyy` from expense date, with optional fallback timestamp. */
export function formatExpenseDateDdMmYyyy(
  expenseDate: Timestamp | null,
  fallback: Timestamp | null
): string {
  const ts = expenseDate ?? fallback;
  if (!ts || typeof ts.toDate !== "function") {
    return "";
  }
  const d = ts.toDate();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

/** Millis for sorting / filtering by occurrence date (expense date or legacy createdAt). */
export function expenseOccurrenceMs(e: ExpenseDoc): number {
  const ts = e.expenseDate ?? e.createdAt;
  return ts?.toMillis?.() ?? 0;
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
    expenseDate: parseExpenseDateField(data.expenseDate),
    createdAt: (data.createdAt as Timestamp | null) ?? null,
    updatedAt: (data.updatedAt as Timestamp | null) ?? null,
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

export async function createExpense(
  uid: string,
  input: {
    amount: number;
    note: string;
    categoryId: string;
    expenseDate: Date;
  }
): Promise<void> {
  await assertCategoryValidForUser(uid, input.categoryId);
  const note = input.note.trim();
  const code = await generateExpenseCode();
  await addDoc(collection(db, EXPENSES_COLLECTION), {
    userId: uid,
    code,
    amount: input.amount,
    note,
    categoryId: input.categoryId,
    expenseDate: dateToExpenseTimestamp(input.expenseDate),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
  });
}

export async function updateExpense(
  uid: string,
  expenseId: string,
  input: {
    amount: number;
    note: string;
    categoryId: string;
    expenseDate: Date;
  }
): Promise<void> {
  await assertExpenseOwner(uid, expenseId);
  await assertCategoryValidForUser(uid, input.categoryId);
  const ref = doc(db, EXPENSES_COLLECTION, expenseId);
  const note = input.note.trim();
  await updateDoc(ref, {
    amount: input.amount,
    note,
    categoryId: input.categoryId,
    expenseDate: dateToExpenseTimestamp(input.expenseDate),
    updatedAt: serverTimestamp(),
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
