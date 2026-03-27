/** Canonical TanStack Query keys for Firestore-backed collections (per user). */
export const queryKeys = {
  expenses: (uid: string) => ["firestore", "expenses", uid] as const,
  categories: (uid: string) => ["firestore", "categories", uid] as const,
  savings: (uid: string) => ["firestore", "savings", uid] as const,
  debts: (uid: string) => ["firestore", "debts", uid] as const,
  /** Prefix for invalidation on sign-out */
  firestoreRoot: ["firestore"] as const,
};
