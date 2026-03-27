"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import {
  buildCategorySelectOptions,
  type CategoryDoc,
  subscribeCategories,
} from "@/services/category.service";
import {
  type SavingDoc,
  subscribeSavings,
} from "@/services/savings.service";

export type SavingsFilterMode = "newest" | "oldest" | "deleted" | "active";

const PAGE_SIZE = 5;

function ms(ts: SavingDoc["createdAt"]): number {
  return ts?.toMillis?.() ?? 0;
}

function msDeleted(ts: SavingDoc["deletedAt"]): number {
  return ts?.toMillis?.() ?? 0;
}

function sortByCreatedDesc(a: SavingDoc, b: SavingDoc): number {
  return ms(b.createdAt) - ms(a.createdAt);
}

function sortByCreatedAsc(a: SavingDoc, b: SavingDoc): number {
  return ms(a.createdAt) - ms(b.createdAt);
}

export function useSavings() {
  const { user, isLoading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const [allSavings, setAllSavings] = useState<SavingDoc[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [filter, setFilter] = useState<SavingsFilterMode>("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    if (!uid) {
      setAllSavings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeSavings(
      uid,
      (next) => {
        setAllSavings(next);
        setLoading(false);
      },
      (err) => {
        toast.error(err.message || "Không thể tải tiết kiệm.");
        setLoading(false);
      }
    );
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setAllCategories([]);
      setCategoriesLoading(false);
      return;
    }
    setCategoriesLoading(true);
    const unsub = subscribeCategories(
      uid,
      (next) => {
        setAllCategories(next);
        setCategoriesLoading(false);
      },
      (err) => {
        toast.error(err.message || "Không thể tải danh mục.");
        setCategoriesLoading(false);
      }
    );
    return unsub;
  }, [uid]);

  const activeCategories = useMemo(
    () => allCategories.filter((c) => c.deletedAt == null),
    [allCategories]
  );

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of allCategories) {
      m.set(c.id, c.name);
    }
    return m;
  }, [allCategories]);

  const categorySelectOptions = useMemo(
    () => buildCategorySelectOptions(activeCategories),
    [activeCategories]
  );

  const filteredSorted = useMemo(() => {
    let list = [...allSavings];

    switch (filter) {
      case "active":
        list = list.filter((s) => s.deletedAt == null);
        list.sort(sortByCreatedDesc);
        break;
      case "deleted":
        list = list.filter((s) => s.deletedAt != null);
        list.sort((a, b) => msDeleted(b.deletedAt) - msDeleted(a.deletedAt));
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
  }, [allSavings, filter]);

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

  const categoriesLoadingState = authLoading || categoriesLoading;

  return {
    uid,
    authLoading,
    savings: paginated,
    allCount: allSavings.length,
    filteredCount: filteredSorted.length,
    totalPages,
    page,
    pageSize: PAGE_SIZE,
    loading: authLoading || loading,
    categoriesLoading: categoriesLoadingState,
    filter,
    setFilter,
    setPage,
    goPrev,
    goNext,
    activeCategories,
    categoryNameById,
    categorySelectOptions,
    isEmpty: !authLoading && !loading && filteredSorted.length === 0,
  };
}
