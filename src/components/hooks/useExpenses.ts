import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  ExpensesListResponse,
  ExpenseDTO,
  ExpensesQueryState,
  ExpenseGroupVM,
  ExpenseCardVM,
  ApiError,
} from "@/types";

export interface UseExpensesResult {
  // Data
  queryState: ExpensesQueryState;
  groups: ExpenseGroupVM[];
  hasMore: boolean;

  // State
  loading: boolean;
  error: ApiError | null;

  // Actions
  setQueryState: (updater: (prev: ExpensesQueryState) => ExpensesQueryState) => void;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useExpenses(settlementId: string, initialQueryState: ExpensesQueryState): UseExpensesResult {
  const [queryState, setQueryStateInternal] = useState<ExpensesQueryState>(initialQueryState);
  const [allExpenses, setAllExpenses] = useState<ExpenseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [etag, setEtag] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Group expenses by date and map to VM
  const groups = useMemo(() => {
    const groupsMap = new Map<string, ExpenseCardVM[]>();

    // Group expenses by date
    allExpenses.forEach((expense) => {
      const dateKey = expense.expense_date;
      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, []);
      }

      const cardVM: ExpenseCardVM = {
        id: expense.id,
        payerNickname: expense.participants.find((p) => p.id === expense.payer_participant_id)?.nickname || "Nieznany",
        amountCents: expense.amount_cents,
        expenseDate: new Date(expense.expense_date),
        description: expense.description,
        shareCount: expense.share_count,
        participantsShort: expense.participants.map((p) => p.nickname),
        canEdit: true, // Will be calculated based on permissions
        canDelete: true, // Will be calculated based on permissions
      };

      const groupItems = groupsMap.get(dateKey);
      if (groupItems) {
        groupItems.push(cardVM);
      }
    });

    // Convert to sorted groups
    const sortedGroups: ExpenseGroupVM[] = Array.from(groupsMap.entries())
      .map(([dateStr, items]) => ({
        date: new Date(dateStr),
        items: items.sort((a, b) => {
          // Sort by created_at within the same date for stable ordering
          // Since we don't have created_at in VM, sort by amount as secondary sort
          if (a.amountCents !== b.amountCents) {
            return b.amountCents - a.amountCents; // Higher amounts first
          }
          return a.payerNickname.localeCompare(b.payerNickname); // Alphabetical by payer
        }),
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Most recent dates first

    return sortedGroups;
  }, [allExpenses]);

  const setQueryState = useCallback((updater: (prev: ExpensesQueryState) => ExpensesQueryState) => {
    setQueryStateInternal(updater);
    // Reset data when query changes
    setAllExpenses([]);
    setEtag(null);
    setHasMore(false);
  }, []);

  const buildQueryString = useCallback((state: ExpensesQueryState) => {
    const params = new URLSearchParams();
    if (state.participantId) params.set("participant_id", state.participantId);
    params.set("page", state.page.toString());
    params.set("limit", state.limit.toString());
    params.set("sort_by", state.sort_by);
    params.set("sort_order", state.sort_order);
    return params.toString();
  }, []);

  const fetchExpenses = useCallback(
    async (state: ExpensesQueryState, append = false): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const queryString = buildQueryString(state);
        const headers: Record<string, string> = {};

        // Add If-None-Match header for conditional requests if we have an ETag
        if (etag && append) {
          headers["If-None-Match"] = etag;
        }

        const response = await fetch(`/api/settlements/${settlementId}/expenses?${queryString}`, {
          headers,
        });

        // Handle 304 Not Modified
        if (response.status === 304) {
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          const errorData = data as { error?: { code?: string; message?: string; details?: unknown } };
          throw {
            status: response.status,
            code: errorData.error?.code,
            message: errorData.error?.message || "Failed to fetch expenses",
            details: errorData.error?.details,
          } as ApiError;
        }

        const expensesData = data as ExpensesListResponse;

        // Store ETag for future conditional requests
        const responseEtag = response.headers.get("ETag");
        if (responseEtag) {
          setEtag(responseEtag);
        }

        if (append) {
          // Append new data to existing data
          setAllExpenses((prev) => [...prev, ...expensesData.data]);
        } else {
          // Replace all data
          setAllExpenses(expensesData.data);
        }

        // Check if there's more data
        const totalPages = expensesData.pagination.total_pages;
        const currentPage = expensesData.pagination.page;
        setHasMore(currentPage < totalPages);
      } catch (err) {
        setError(err as ApiError);
        if (!append) {
          setAllExpenses([]);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [settlementId, buildQueryString, etag]
  );

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    const nextPage = queryState.page + 1;
    const nextQueryState = { ...queryState, page: nextPage };

    await fetchExpenses(nextQueryState, true);

    // Update query state to reflect new page
    setQueryStateInternal((prev) => ({ ...prev, page: nextPage }));
  }, [queryState, loading, hasMore, fetchExpenses]);

  const refetch = useCallback(async () => {
    const resetQueryState = { ...queryState, page: 1 };
    setQueryStateInternal(resetQueryState);
    await fetchExpenses(resetQueryState, false);
  }, [queryState, fetchExpenses]);

  // Initial fetch
  useEffect(() => {
    if (settlementId) {
      fetchExpenses(queryState, false);
    }
  }, [settlementId, queryState, fetchExpenses]);

  // Refetch when filter state changes (but not page, that's handled by loadMore)
  const filterState = useMemo(
    () => ({
      participantId: queryState.participantId,
      sort_by: queryState.sort_by,
      sort_order: queryState.sort_order,
      limit: queryState.limit,
    }),
    [queryState.participantId, queryState.sort_by, queryState.sort_order, queryState.limit]
  );

  useEffect(() => {
    if (settlementId) {
      const newQueryState = { ...filterState, page: 1 };
      fetchExpenses(newQueryState, false);
      setQueryStateInternal((prev) => ({ ...prev, ...filterState, page: 1 }));
    }
  }, [settlementId, filterState, fetchExpenses]);

  return {
    queryState,
    groups,
    hasMore,
    loading,
    error,
    setQueryState,
    loadMore,
    refetch,
  };
}
