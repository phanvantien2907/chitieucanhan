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

const CATEGORIES_COLLECTION = "categories";

/** Firestore `categories/{id}` document shape (scoped by `userId`). */
export type CategoryDoc = {
  id: string;
  userId: string;
  name: string;
  description: string;
  nameLower: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  deletedAt: Timestamp | null;
};

function mapSnapshotDoc(
  docId: string,
  data: Record<string, unknown>
): CategoryDoc {
  return {
    id: docId,
    userId: String(data.userId ?? ""),
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    nameLower: String(data.nameLower ?? ""),
    createdAt: (data.createdAt as Timestamp | null) ?? null,
    updatedAt: (data.updatedAt as Timestamp | null) ?? null,
    deletedAt: (data.deletedAt as Timestamp | null) ?? null,
  };
}

function categoriesQuery(uid: string) {
  return query(
    collection(db, CATEGORIES_COLLECTION),
    where("userId", "==", uid)
  );
}

/** One-shot fetch (filter/sort/pagination live in the hook). */
export async function getCategories(uid: string): Promise<CategoryDoc[]> {
  const snapshot = await getDocs(categoriesQuery(uid));
  return snapshot.docs.map((d) =>
    mapSnapshotDoc(d.id, d.data() as Record<string, unknown>)
  );
}

/** Real-time listener for the signed-in user's rows in `categories`. */
export function subscribeCategories(
  uid: string,
  onUpdate: (categories: CategoryDoc[]) => void,
  onError: (error: Error) => void
): () => void {
  return onSnapshot(
    categoriesQuery(uid),
    (snapshot) => {
      const list = snapshot.docs.map((d) =>
        mapSnapshotDoc(d.id, d.data() as Record<string, unknown>)
      );
      onUpdate(list);
    },
    (err) => {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

export async function createCategory(
  uid: string,
  input: { name: string; description: string }
): Promise<void> {
  const name = input.name.trim();
  const description = input.description.trim();
  await addDoc(collection(db, CATEGORIES_COLLECTION), {
    userId: uid,
    name,
    description,
    nameLower: name.toLowerCase(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
  });
}

async function assertCategoryOwner(
  uid: string,
  categoryId: string
): Promise<void> {
  const ref = doc(db, CATEGORIES_COLLECTION, categoryId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Không tìm thấy danh mục.");
  }
  const data = snap.data() as { userId?: string };
  if (data.userId !== uid) {
    throw new Error("Không có quyền thao tác với danh mục này.");
  }
}

export async function updateCategory(
  uid: string,
  categoryId: string,
  input: { name: string; description: string }
): Promise<void> {
  await assertCategoryOwner(uid, categoryId);
  const ref = doc(db, CATEGORIES_COLLECTION, categoryId);
  const name = input.name.trim();
  const description = input.description.trim();
  await updateDoc(ref, {
    name,
    description,
    nameLower: name.toLowerCase(),
    updatedAt: serverTimestamp(),
  });
}

export async function softDeleteCategory(
  uid: string,
  categoryId: string
): Promise<void> {
  await assertCategoryOwner(uid, categoryId);
  const ref = doc(db, CATEGORIES_COLLECTION, categoryId);
  await updateDoc(ref, {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
