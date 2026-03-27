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
  writeBatch,
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
  parentId: string | null;
  level: number;
  createdAt: Timestamp | null;
  /** Set on create/update. */
  updatedAt: Timestamp | null;
  deletedAt: Timestamp | null;
};

export type CategoryTreeNode = CategoryDoc & {
  children: CategoryTreeNode[];
};

export type CategorySelectOption = {
  value: string;
  label: string;
  depth: number;
};

function mapSnapshotDoc(
  docId: string,
  data: Record<string, unknown>
): CategoryDoc {
  const rawParent = data.parentId;
  const parentId =
    rawParent === null || rawParent === undefined || rawParent === ""
      ? null
      : String(rawParent);

  const rawLevel = data.level;
  const level =
    typeof rawLevel === "number" && Number.isFinite(rawLevel) && rawLevel >= 1
      ? Math.floor(rawLevel)
      : 1;

  return {
    id: docId,
    userId: String(data.userId ?? ""),
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    nameLower: String(data.nameLower ?? ""),
    parentId,
    level,
    createdAt: (data.createdAt as Timestamp | null) ?? null,
    updatedAt: (data.updatedAt as Timestamp | null) ?? null,
    deletedAt: (data.deletedAt as Timestamp | null) ?? null,
  } satisfies CategoryDoc;
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

/**
 * Tree from flat list (only links inside `flat`).
 * Siblings ordered with `compareSibling` (default: Vietnamese name).
 */
export function buildCategoryTreeSorted(
  flat: CategoryDoc[],
  compareSibling: (a: CategoryDoc, b: CategoryDoc) => number = (a, b) =>
    a.name.localeCompare(b.name, "vi")
): CategoryTreeNode[] {
  const byId = new Map(flat.map((c) => [c.id, c]));
  const children = new Map<string, CategoryDoc[]>();
  for (const c of flat) {
    const pid =
      c.parentId != null && byId.has(c.parentId) ? c.parentId : "__root__";
    if (!children.has(pid)) {
      children.set(pid, []);
    }
    children.get(pid)!.push(c);
  }
  for (const arr of children.values()) {
    arr.sort(compareSibling);
  }
  function toNode(c: CategoryDoc): CategoryTreeNode {
    const kids = (children.get(c.id) ?? []).map(toNode);
    return { ...c, children: kids };
  }
  const roots = children.get("__root__") ?? [];
  return roots.map(toNode);
}

/** Tree from flat list; siblings sorted by name. */
export function buildCategoryTree(flat: CategoryDoc[]): CategoryTreeNode[] {
  return buildCategoryTreeSorted(flat, (a, b) =>
    a.name.localeCompare(b.name, "vi")
  );
}

/** DFS order for table / selects (subset). Siblings sorted with `compareSibling` (default: name). */
export function sortCategoriesTreeOrder(
  flat: CategoryDoc[],
  compareSibling: (a: CategoryDoc, b: CategoryDoc) => number = (a, b) =>
    a.name.localeCompare(b.name, "vi")
): CategoryDoc[] {
  const idSet = new Set(flat.map((c) => c.id));
  const children = new Map<string, CategoryDoc[]>();
  for (const c of flat) {
    const pk =
      c.parentId != null && idSet.has(c.parentId) ? c.parentId : "__root__";
    if (!children.has(pk)) {
      children.set(pk, []);
    }
    children.get(pk)!.push(c);
  }
  for (const arr of children.values()) {
    arr.sort(compareSibling);
  }
  const result: CategoryDoc[] = [];
  function walk(pk: string) {
    for (const ch of children.get(pk) ?? []) {
      result.push(ch);
      walk(ch.id);
    }
  }
  walk("__root__");
  const seen = new Set(result.map((r) => r.id));
  for (const c of flat) {
    if (!seen.has(c.id)) {
      result.push(c);
    }
  }
  return result;
}

function depthWithinSubset(c: CategoryDoc, usable: Map<string, CategoryDoc>): number {
  let d = 0;
  let cur: CategoryDoc | undefined = c;
  while (cur?.parentId != null && usable.has(cur.parentId)) {
    d += 1;
    cur = usable.get(cur.parentId);
  }
  return d;
}

/**
 * Hierarchical options for shadcn Select: plain `name` as label; use `depth` for padding-left in UI.
 */
export function buildCategorySelectOptions(
  flat: CategoryDoc[] | undefined,
  opts?: { excludeIds?: Set<string> }
): CategorySelectOption[] {
  const list = flat ?? [];
  const exclude = opts?.excludeIds ?? new Set<string>();
  const usable = list.filter((c) => c.deletedAt == null && !exclude.has(c.id));
  const usableMap = new Map(usable.map((x) => [x.id, x]));
  const ordered = sortCategoriesTreeOrder(usable);
  return ordered.map((c) => {
    const d = depthWithinSubset(c, usableMap);
    return {
      value: c.id,
      label: c.name,
      depth: d,
    };
  });
}

/** "Parent > Child" for active path; stops at missing parent. */
export function getCategoryBreadcrumb(
  categoryId: string,
  flat: CategoryDoc[]
): string {
  const byId = new Map(flat.map((c) => [c.id, c]));
  const chain: string[] = [];
  let cur: string | null = categoryId;
  const guard = new Set<string>();
  while (cur && !guard.has(cur)) {
    guard.add(cur);
    const cat = byId.get(cur);
    if (!cat) {
      break;
    }
    chain.unshift(cat.name);
    cur = cat.parentId;
  }
  return chain.join(" > ");
}

/** Indent depth for a row when `flat` is the displayed subset (orphan roots depth 0). */
export function getCategoryDepthInFilteredList(
  c: CategoryDoc,
  flat: CategoryDoc[]
): number {
  const byId = new Map(flat.map((x) => [x.id, x]));
  let depth = 0;
  let cur: CategoryDoc | undefined = c;
  while (cur?.parentId != null && byId.has(cur.parentId)) {
    depth += 1;
    cur = byId.get(cur.parentId);
  }
  return depth;
}

export function getParentDisplayName(
  category: CategoryDoc,
  flat: CategoryDoc[]
): string {
  if (category.parentId == null) {
    return "—";
  }
  const p = flat.find((c) => c.id === category.parentId);
  if (!p) {
    return "—";
  }
  if (p.deletedAt != null) {
    return `${p.name} (đã xóa)`;
  }
  return p.name;
}

/** All descendant ids of `rootId` (not including `rootId`). */
export function getDescendantCategoryIds(
  rootId: string,
  flat: CategoryDoc[]
): Set<string> {
  return collectDescendantIds(rootId, flat);
}

function collectDescendantIds(
  rootId: string,
  flat: CategoryDoc[]
): Set<string> {
  const result = new Set<string>();
  const children = new Map<string, string[]>();
  for (const c of flat) {
    if (c.parentId == null) {
      continue;
    }
    if (!children.has(c.parentId)) {
      children.set(c.parentId, []);
    }
    children.get(c.parentId)!.push(c.id);
  }
  const queue = [...(children.get(rootId) ?? [])];
  while (queue.length) {
    const id = queue.shift()!;
    if (result.has(id)) {
      continue;
    }
    result.add(id);
    queue.push(...(children.get(id) ?? []));
  }
  return result;
}

/** True if `parentId` would create a cycle (self or descendant as parent). */
export function isInvalidParentChoice(
  categoryId: string | null,
  parentId: string | null,
  flat: CategoryDoc[]
): boolean {
  if (parentId == null) {
    return false;
  }
  if (categoryId != null && parentId === categoryId) {
    return true;
  }
  if (categoryId == null) {
    return false;
  }
  const descendants = collectDescendantIds(categoryId, flat);
  return descendants.has(parentId);
}

function computeDescendantLevelUpdates(
  selfId: string,
  selfLevel: number,
  flat: CategoryDoc[]
): { id: string; level: number }[] {
  const updates: { id: string; level: number }[] = [];
  const queue: { id: string; level: number }[] = [
    { id: selfId, level: selfLevel },
  ];
  while (queue.length) {
    const { id, level } = queue.shift()!;
    const children = flat.filter(
      (c) => c.parentId === id && c.deletedAt == null
    );
    for (const ch of children) {
      const nextLevel = level + 1;
      updates.push({ id: ch.id, level: nextLevel });
      queue.push({ id: ch.id, level: nextLevel });
    }
  }
  return updates.filter((u) => u.id !== selfId);
}

const BATCH_MAX_UPDATES = 500;

async function batchUpdateDescendantLevels(
  updates: { id: string; level: number }[]
): Promise<void> {
  for (let i = 0; i < updates.length; i += BATCH_MAX_UPDATES) {
    const batch = writeBatch(db);
    const chunk = updates.slice(i, i + BATCH_MAX_UPDATES);
    for (const u of chunk) {
      const r = doc(db, CATEGORIES_COLLECTION, u.id);
      batch.update(r, {
        level: u.level,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }
}

/** Use when attaching expenses/savings to a category. */
export async function assertCategoryValidForUser(
  uid: string,
  categoryId: string
): Promise<void> {
  const ref = doc(db, CATEGORIES_COLLECTION, categoryId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Không tìm thấy danh mục.");
  }
  const data = snap.data() as { userId?: string; deletedAt?: Timestamp | null };
  if (data.userId !== uid) {
    throw new Error("Danh mục không hợp lệ.");
  }
  if (data.deletedAt != null) {
    throw new Error("Không thể dùng danh mục đã xóa.");
  }
}

export async function createCategory(
  uid: string,
  input: { name: string; description: string; parentId: string | null }
): Promise<void> {
  const name = input.name.trim();
  const description = input.description.trim();
  const parentId =
    input.parentId != null && input.parentId.trim() !== ""
      ? input.parentId.trim()
      : null;

  let level = 1;
  if (parentId) {
    const pref = doc(db, CATEGORIES_COLLECTION, parentId);
    const psnap = await getDoc(pref);
    if (!psnap.exists()) {
      throw new Error("Không tìm thấy danh mục cha.");
    }
    const parent = mapSnapshotDoc(
      parentId,
      psnap.data() as Record<string, unknown>
    );
    if (parent.userId !== uid) {
      throw new Error("Danh mục cha không hợp lệ.");
    }
    if (parent.deletedAt != null) {
      throw new Error("Không thể chọn danh mục cha đã xóa.");
    }
    level = parent.level + 1;
  }

  await addDoc(collection(db, CATEGORIES_COLLECTION), {
    userId: uid,
    name,
    description,
    nameLower: name.toLowerCase(),
    parentId,
    level,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
  });
}

async function assertCategoryOwner(
  uid: string,
  categoryId: string
): Promise<CategoryDoc> {
  const ref = doc(db, CATEGORIES_COLLECTION, categoryId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Không tìm thấy danh mục.");
  }
  const data = snap.data() as { userId?: string };
  if (data.userId !== uid) {
    throw new Error("Không có quyền thao tác với danh mục này.");
  }
  return mapSnapshotDoc(categoryId, snap.data() as Record<string, unknown>);
}

export async function updateCategory(
  uid: string,
  categoryId: string,
  input: { name: string; description: string; parentId: string | null }
): Promise<void> {
  await assertCategoryOwner(uid, categoryId);
  const all = await getCategories(uid);
  const self = all.find((c) => c.id === categoryId);
  if (!self) {
    throw new Error("Không tìm thấy danh mục.");
  }

  const parentId =
    input.parentId != null && input.parentId.trim() !== ""
      ? input.parentId.trim()
      : null;

  if (parentId === categoryId) {
    throw new Error("Danh mục không thể là cha của chính nó.");
  }
  if (isInvalidParentChoice(categoryId, parentId, all)) {
    throw new Error(
      "Không thể chọn danh mục cha không hợp lệ (tránh vòng lặp)."
    );
  }

  let newLevel = 1;
  if (parentId != null) {
    const parent = all.find((c) => c.id === parentId);
    if (!parent || parent.deletedAt != null) {
      throw new Error(
        "Danh mục cha không hợp lệ (đã xóa hoặc không tồn tại)."
      );
    }
    newLevel = parent.level + 1;
  }

  const ref = doc(db, CATEGORIES_COLLECTION, categoryId);
  const name = input.name.trim();
  const description = input.description.trim();

  await updateDoc(ref, {
    name,
    description,
    nameLower: name.toLowerCase(),
    parentId,
    level: newLevel,
    updatedAt: serverTimestamp(),
  });

  if (newLevel !== self.level) {
    const descendantUpdates = computeDescendantLevelUpdates(
      categoryId,
      newLevel,
      all
    );
    await batchUpdateDescendantLevels(descendantUpdates);
  }
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
