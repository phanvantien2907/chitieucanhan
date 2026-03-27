"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import {
  type DebtDoc,
  subscribeDebts,
} from "@/services/debt.service";

export type DebtFilterMode =
  | "all"
  | "pending"
  | "paid"
  | "receivable"
  | "payable";

const PAGE_SIZE = 5;

function ms(ts: DebtDoc["createdAt"]): number {
  return ts?.toMillis?.() ?? 0;
}

function sortByCreatedDesc(a: DebtDoc, b: DebtDoc): number {
  return ms(b.createdAt) - ms(a.createdAt);
}

export function useDebts() {
  const { user, isLoading: authLoading } = useAuth();
  const uid = user?.uid ?? null;
  const dueReminderShown = useRef(false);

  useEffect(() => {
    dueReminderShown.current = false;
  }, [uid]);

  const [allDebts, setAllDebts] = useState<DebtDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DebtFilterMode>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    if (!uid) {
      setAllDebts([]);
      setLoading(false);
      dueReminderShown.current = false;
      return;
    }
    setLoading(true);
    const unsub = subscribeDebts(
      uid,
      (next) => {
        setAllDebts(next);
        setLoading(false);
      },
      (err) => {
        toast.error(err.message || "Không thể tải khoản nợ.");
        setLoading(false);
      }
    );
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (authLoading || loading || !uid || dueReminderShown.current) {
      return;
    }
    const active = allDebts.filter((d) => d.deletedAt == null);
    const pendingWithDue = active.filter(
      (d) => d.status === "pending" && d.dueDate != null
    );
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);
    const soon = pendingWithDue.filter((d) => {
      const due = d.dueDate!.toDate();
      return due >= now && due <= weekEnd;
    });
    if (soon.length > 0) {
      dueReminderShown.current = true;
      toast.info(
        `Có ${soon.length} khoản nợ sắp đến hạn trong 7 ngày tới.`,
        { id: "debt-due-reminder", duration: 6000 }
      );
    }
  }, [authLoading, loading, uid, allDebts]);

  const filteredSorted = useMemo(() => {
    let list = allDebts.filter((d) => d.deletedAt == null);

    switch (filter) {
      case "pending":
        list = list.filter((d) => d.status === "pending");
        break;
      case "paid":
        list = list.filter((d) => d.status === "paid");
        break;
      case "receivable":
        list = list.filter((d) => d.type === "receivable");
        break;
      case "payable":
        list = list.filter((d) => d.type === "payable");
        break;
      case "all":
      default:
        break;
    }

    return [...list].sort(sortByCreatedDesc);
  }, [allDebts, filter]);

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
    debts: paginated,
    allCount: allDebts.filter((d) => d.deletedAt == null).length,
    filteredCount: filteredSorted.length,
    totalPages,
    page,
    pageSize: PAGE_SIZE,
    loading: authLoading || loading,
    filter,
    setFilter,
    setPage,
    goPrev,
    goNext,
    isEmpty: !authLoading && !loading && filteredSorted.length === 0,
  };
}
