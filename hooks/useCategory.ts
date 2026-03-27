"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import {
  buildCategorySelectOptions,
  buildCategoryTree,
  buildCategoryTreeSorted,
  sortCategoriesTreeOrder,
  type CategoryDoc,
  type CategoryTreeNode,
  subscribeCategories,
} from "@/services/category.service";

export type CategoryFilterMode = "newest" | "oldest" | "deleted" | "active";

export type CategoryHierarchyFilter = "all" | "root" | "sub";

function ms(ts: CategoryDoc["createdAt"]): number {
  return ts?.toMillis?.() ?? 0;
}

function msUpdated(c: CategoryDoc): number {
  return ms(c.updatedAt ?? c.createdAt);
}

function sortByCreatedDesc(a: CategoryDoc, b: CategoryDoc): number {
  return ms(b.createdAt) - ms(a.createdAt);
}

function sortByCreatedAsc(a: CategoryDoc, b: CategoryDoc): number {
  return ms(a.createdAt) - ms(b.createdAt);
}

export function useCategories() {
  const { user, isLoading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const [allCategories, setAllCategories] = useState<CategoryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryFilterMode>("newest");
  const [hierarchyFilter, setHierarchyFilter] =
    useState<CategoryHierarchyFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!uid) {
      setAllCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeCategories(
      uid,
      (next) => {
        setAllCategories(next);
        setLoading(false);
      },
      (err) => {
        toast.error(err.message || "Không thể tải danh mục.");
        setLoading(false);
      }
    );
    return unsub;
  }, [uid]);

  const siblingCompare = useMemo(() => {
    switch (filter) {
      case "oldest":
        return sortByCreatedAsc;
      case "deleted":
        return (a: CategoryDoc, b: CategoryDoc) =>
          msUpdated(b) - msUpdated(a);
      case "active":
      case "newest":
      default:
        return sortByCreatedDesc;
    }
  }, [filter]);

  const filteredSorted = useMemo(() => {
    let list = [...allCategories];

    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.nameLower.includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }

    switch (hierarchyFilter) {
      case "root":
        list = list.filter((c) => c.parentId == null);
        break;
      case "sub":
        list = list.filter((c) => c.parentId != null);
        break;
      case "all":
      default:
        break;
    }

    switch (filter) {
      case "active":
        list = list.filter((c) => c.deletedAt == null);
        break;
      case "deleted":
        list = list.filter((c) => c.deletedAt != null);
        break;
      case "oldest":
      case "newest":
      default:
        break;
    }

    return sortCategoriesTreeOrder(list, siblingCompare);
  }, [allCategories, filter, debouncedSearch, hierarchyFilter, siblingCompare]);

  /** Memoized tree for expand/collapse table (matches filter + sort). */
  const categoryTreeForTable = useMemo(
    (): CategoryTreeNode[] =>
      buildCategoryTreeSorted(filteredSorted, siblingCompare),
    [filteredSorted, siblingCompare]
  );

  const categoryTree = useMemo(
    () => buildCategoryTree(allCategories.filter((c) => c.deletedAt == null)),
    [allCategories]
  );

  const activeCategoriesForForms = useMemo(
    () => allCategories.filter((c) => c.deletedAt == null),
    [allCategories]
  );

  const categorySelectOptions = useMemo(
    () => buildCategorySelectOptions(activeCategoriesForForms),
    [activeCategoriesForForms]
  );

  return {
    uid,
    authLoading,
    allCategories,
    categoryTreeForTable,
    allCount: allCategories.length,
    filteredCount: filteredSorted.length,
    loading: authLoading || loading,
    filter,
    setFilter,
    hierarchyFilter,
    setHierarchyFilter,
    search,
    setSearch,
    debouncedSearch,
    isEmpty: !authLoading && !loading && filteredSorted.length === 0,
    categoryTree,
    categorySelectOptions,
    activeCategoriesForForms,
  };
}

/** @alias useCategories — same hook (subscription + filters). */
export function useCategory() {
  return useCategories();
}
