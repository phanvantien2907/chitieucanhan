import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { toStartOfDay } from "@/lib/date";
import { assertCategoryValidForUser } from "@/services/category.service";
import {
  SAVINGS_COLLECTION,
  savingBalanceFromRaw,
} from "@/services/savings.service";
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
  /** When true, `amount` was deducted from `savingsId`. */
  fromSavings: boolean;
  savingsId: string | null;
  savingsName: string | null;
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
    fromSavings: Boolean(data.fromSavings ?? false),
    savingsId:
      data.savingsId != null && data.savingsId !== ""
        ? String(data.savingsId)
        : null,
    savingsName:
      data.savingsName != null && String(data.savingsName).trim() !== ""
        ? String(data.savingsName)
        : null,
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

async function getExpenseForOwner(
  uid: string,
  expenseId: string
): Promise<ExpenseDoc> {
  const ref = doc(db, EXPENSES_COLLECTION, expenseId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Expense not found.");
  }
  const data = snap.data() as Record<string, unknown>;
  if (String(data.userId ?? "") !== uid) {
    throw new Error("You do not have permission to modify this expense.");
  }
  return mapExpenseDoc(expenseId, data);
}

export type CreateExpenseInput = {
  amount: number;
  note: string;
  categoryId: string;
  expenseDate: Date;
  fromSavings?: boolean;
  savingsId?: string | null;
  savingsName?: string | null;
};

export async function createExpense(
  uid: string,
  input: CreateExpenseInput
): Promise<void> {
  await assertCategoryValidForUser(uid, input.categoryId);
  const note = input.note.trim();
  const fromSavings = Boolean(input.fromSavings);
  const savingsId = input.savingsId ?? null;
  const savingsNameRaw = input.savingsName?.trim() ?? "";
  const savingsName = savingsNameRaw !== "" ? savingsNameRaw : null;

  if (fromSavings) {
    if (!savingsId || !savingsName) {
      throw new Error("Chọn khoản tiết kiệm.");
    }
    const code = await generateExpenseCode();
    const expenseRef = doc(collection(db, EXPENSES_COLLECTION));
    await runTransaction(db, async (transaction) => {
      const savingRef = doc(db, SAVINGS_COLLECTION, savingsId);
      const savingSnap = await transaction.get(savingRef);
      if (!savingSnap.exists()) {
        throw new Error("Không tìm thấy khoản tiết kiệm.");
      }
      const sData = savingSnap.data() as Record<string, unknown>;
      if (String(sData.userId ?? "") !== uid) {
        throw new Error("Không có quyền thao tác.");
      }
      if (sData.deletedAt != null) {
        throw new Error("Khoản tiết kiệm không còn hiệu lực.");
      }
      const balance = savingBalanceFromRaw(sData);
      if (input.amount > balance) {
        throw new Error("Không đủ số dư tiết kiệm.");
      }
      const newBal = balance - input.amount;
      transaction.update(savingRef, {
        balance: newBal,
        amount: newBal,
        updatedAt: serverTimestamp(),
      });
      transaction.set(expenseRef, {
        userId: uid,
        code,
        amount: input.amount,
        note,
        categoryId: input.categoryId,
        expenseDate: dateToExpenseTimestamp(input.expenseDate),
        fromSavings: true,
        savingsId,
        savingsName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deletedAt: null,
      });
    });
    return;
  }

  const code = await generateExpenseCode();
  await addDoc(collection(db, EXPENSES_COLLECTION), {
    userId: uid,
    code,
    amount: input.amount,
    note,
    categoryId: input.categoryId,
    expenseDate: dateToExpenseTimestamp(input.expenseDate),
    fromSavings: false,
    savingsId: null,
    savingsName: null,
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
  await assertCategoryValidForUser(uid, input.categoryId);
  const prev = await getExpenseForOwner(uid, expenseId);
  const ref = doc(db, EXPENSES_COLLECTION, expenseId);
  const note = input.note.trim();

  if (
    prev.fromSavings &&
    prev.savingsId &&
    prev.deletedAt == null &&
    prev.amount !== input.amount
  ) {
    await runTransaction(db, async (transaction) => {
      const expenseSnap = await transaction.get(ref);
      if (!expenseSnap.exists()) {
        throw new Error("Expense not found.");
      }
      const cur = mapExpenseDoc(
        expenseId,
        expenseSnap.data() as Record<string, unknown>
      );
      if (String(cur.userId ?? "") !== uid) {
        throw new Error("You do not have permission to modify this expense.");
      }
      if (cur.deletedAt != null) {
        throw new Error("Không thể sửa khoản đã xóa.");
      }
      if (!cur.fromSavings || !cur.savingsId) {
        throw new Error("Dữ liệu khoản chi không hợp lệ.");
      }
      const savingRef = doc(db, SAVINGS_COLLECTION, cur.savingsId);
      const savingSnap = await transaction.get(savingRef);
      if (!savingSnap.exists()) {
        throw new Error("Không tìm thấy khoản tiết kiệm liên kết.");
      }
      const sData = savingSnap.data() as Record<string, unknown>;
      if (String(sData.userId ?? "") !== uid) {
        throw new Error("Không có quyền thao tác.");
      }
      const balance = savingBalanceFromRaw(sData);
      const newBal = balance + cur.amount - input.amount;
      if (newBal < 0) {
        throw new Error("Không đủ số dư tiết kiệm để chỉnh sửa số tiền.");
      }
      transaction.update(savingRef, {
        balance: newBal,
        amount: newBal,
        updatedAt: serverTimestamp(),
      });
      transaction.update(ref, {
        amount: input.amount,
        note,
        categoryId: input.categoryId,
        expenseDate: dateToExpenseTimestamp(input.expenseDate),
        updatedAt: serverTimestamp(),
      });
    });
    return;
  }

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
  const prev = await getExpenseForOwner(uid, expenseId);
  const ref = doc(db, EXPENSES_COLLECTION, expenseId);
  if (prev.deletedAt != null) {
    return;
  }

  if (prev.fromSavings && prev.savingsId) {
    await runTransaction(db, async (transaction) => {
      const expenseSnap = await transaction.get(ref);
      if (!expenseSnap.exists()) {
        return;
      }
      const cur = mapExpenseDoc(
        expenseId,
        expenseSnap.data() as Record<string, unknown>
      );
      if (cur.deletedAt != null) {
        return;
      }
      const savingRef = doc(db, SAVINGS_COLLECTION, cur.savingsId!);
      const savingSnap = await transaction.get(savingRef);
      if (
        savingSnap.exists() &&
        String((savingSnap.data() as { userId?: string }).userId ?? "") ===
          uid &&
        (savingSnap.data() as { deletedAt?: unknown }).deletedAt == null
      ) {
        const sData = savingSnap.data() as Record<string, unknown>;
        const balance = savingBalanceFromRaw(sData);
        const newBal = balance + cur.amount;
        transaction.update(savingRef, {
          balance: newBal,
          amount: newBal,
          updatedAt: serverTimestamp(),
        });
      }
      transaction.update(ref, {
        deletedAt: serverTimestamp(),
      });
    });
    return;
  }

  await updateDoc(ref, {
    deletedAt: serverTimestamp(),
  });
}
