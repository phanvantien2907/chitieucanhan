"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import {
  type CategoryDoc,
  subscribeCategories,
} from "@/services/category.service";

export type CategoryFilterMode = "newest" | "oldest" | "deleted" | "active";

const PAGE_SIZE = 5;

function ms(ts: CategoryDoc["createdAt"]): number {
  return ts?.toMillis?.() ?? 0;
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
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [filter, debouncedSearch]);

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

    switch (filter) {
      case "active":
        list = list.filter((c) => c.deletedAt == null);
        list.sort(sortByCreatedDesc);
        break;
      case "deleted":
        list = list.filter((c) => c.deletedAt != null);
        list.sort(
          (a, b) =>
            ms(b.updatedAt ?? b.createdAt) - ms(a.updatedAt ?? a.createdAt)
        );
        break;
      case "oldest":
        list.sort(sortByCreatedAsc);
        break;
      case "newest":
      default:
        list.sort(sortByCreatedDesc);
        break;
    }

    return list;
  }, [allCategories, filter, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredSorted.slice(start, start + PAGE_SIZE);
  }, [filteredSorted, page]);

  const goPrev = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const goNext = useCallback(() => {
    setPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  return {
    uid,
    authLoading,
    categories: paginated,
    allCount: allCategories.length,
    filteredCount: filteredSorted.length,
    totalPages,
    page,
    pageSize: PAGE_SIZE,
    loading: authLoading || loading,
    filter,
    setFilter,
    search,
    setSearch,
    setPage,
    goPrev,
    goNext,
    isEmpty: !loading && filteredSorted.length === 0,
  };
}

