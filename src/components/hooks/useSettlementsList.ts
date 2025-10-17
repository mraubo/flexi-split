import { useState, useEffect, useCallback } from "react";
import type { SettlementsQueryState, SettlementCardVM, ApiError, SettlementsListResponse } from "@/types";
import { mapSettlementToVM } from "@/types";

interface UseSettlementsListResult {
  items: SettlementCardVM[];
  pagination: SettlementsListResponse["pagination"];
  loading: boolean;
  error: ApiError | null;
  initialLoading: boolean;
  reload: () => void;
  loadMore: () => void;
  hasMore: boolean;
}

export function useSettlementsList(query: SettlementsQueryState): UseSettlementsListResult {
  const [items, setItems] = useState<SettlementCardVM[]>([]);
  const [pagination, setPagination] = useState<SettlementsListResponse["pagination"]>({
    page: 1,
    limit: query.limit,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const fetchSettlements = useCallback(
    async (page = 1, append = false) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          status: query.status,
          page: page.toString(),
          limit: query.limit.toString(),
          sort_by: query.sort_by,
          sort_order: query.sort_order,
        });

        const response = await fetch(`/api/settlements?${params}`);
        const data: SettlementsListResponse = await response.json();

        if (!response.ok) {
          // For SettlementsListResponse, parse error from response body if available
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            errorData = { error: { message: "Failed to fetch settlements" } };
          }
          throw {
            status: response.status,
            code: errorData.error?.code,
            message: errorData.error?.message || "Failed to fetch settlements",
            details: errorData.error?.details,
          } as ApiError;
        }

        const vmItems = data.data.map(mapSettlementToVM);

        if (append) {
          setItems((prev) => [...prev, ...vmItems]);
        } else {
          setItems(vmItems);
        }

        setPagination(data.pagination);
      } catch (err) {
        setError(err as ApiError);
      } finally {
        setLoading(false);
        setHasLoadedOnce(true);
      }
    },
    [query]
  );

  const reload = useCallback(() => {
    fetchSettlements(1, false);
  }, [fetchSettlements]);

  const loadMore = useCallback(() => {
    if (pagination.page < pagination.total_pages) {
      fetchSettlements(pagination.page + 1, true);
    }
  }, [fetchSettlements, pagination.page, pagination.total_pages]);

  // Initial fetch and refetch when query changes
  useEffect(() => {
    fetchSettlements(1, false);
  }, [fetchSettlements]);

  return {
    items,
    pagination,
    loading,
    error,
    initialLoading: !hasLoadedOnce,
    reload,
    loadMore,
    hasMore: pagination.page < pagination.total_pages,
  };
}
