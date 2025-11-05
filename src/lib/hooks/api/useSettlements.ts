import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  UUID,
  SettlementSummaryDTO,
  CreateSettlementCommand,
  UpdateSettlementCommand,
  GetSettlementsQuery,
  PagedResponse,
} from "@/types";

/**
 * Query key factory for settlements
 * Helps manage cache invalidation and query key consistency
 */
export const settlementsQueryKeys = {
  all: () => ["settlements"],
  lists: () => [...settlementsQueryKeys.all(), "list"],
  list: (filters: GetSettlementsQuery) => [...settlementsQueryKeys.lists(), filters],
  details: () => [...settlementsQueryKeys.all(), "detail"],
  detail: (id: UUID) => [...settlementsQueryKeys.details(), id],
};

/**
 * Hook to fetch all settlements with pagination and filtering
 */
export function useSettlements(query: GetSettlementsQuery = {}) {
  return useQuery({
    queryKey: settlementsQueryKeys.list(query),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (query.page !== undefined) {
        params.append("page", String(query.page));
      }
      if (query.limit !== undefined) {
        params.append("limit", String(query.limit));
      }
      if (query.sortBy) {
        params.append("sortBy", query.sortBy);
      }
      if (query.sortOrder) {
        params.append("sortOrder", query.sortOrder);
      }

      const endpoint = params.toString() ? `/api/settlements?${params.toString()}` : "/api/settlements";

      return apiClient.get<PagedResponse<SettlementSummaryDTO>>(endpoint);
    },
  });
}

/**
 * Hook to fetch a single settlement by ID
 */
export function useSettlement(id: UUID) {
  return useQuery({
    queryKey: settlementsQueryKeys.detail(id),
    queryFn: () => apiClient.get<SettlementSummaryDTO>(`/api/settlements/${id}`),
    enabled: !!id,
  });
}

/**
 * Hook to create a new settlement
 */
export function useCreateSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (command: CreateSettlementCommand) => apiClient.post<SettlementSummaryDTO>("/api/settlements", command),
    onSuccess: (data) => {
      // Invalidate settlements list to refetch
      queryClient.invalidateQueries({
        queryKey: settlementsQueryKeys.lists(),
      });

      // Cache the newly created settlement
      queryClient.setQueryData(settlementsQueryKeys.detail(data.id), data);
    },
  });
}

/**
 * Hook to update a settlement
 */
export function useUpdateSettlement(id: UUID) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (command: UpdateSettlementCommand) =>
      apiClient.put<SettlementSummaryDTO>(`/api/settlements/${id}`, command),
    onSuccess: (data) => {
      // Update the specific settlement in cache
      queryClient.setQueryData(settlementsQueryKeys.detail(id), data);

      // Invalidate the list to refetch
      queryClient.invalidateQueries({
        queryKey: settlementsQueryKeys.lists(),
      });
    },
  });
}

/**
 * Hook to delete (soft delete) a settlement
 */
export function useDeleteSettlement(id: UUID) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.delete(`/api/settlements/${id}`),
    onSuccess: () => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: settlementsQueryKeys.detail(id),
      });

      // Invalidate the list to refetch
      queryClient.invalidateQueries({
        queryKey: settlementsQueryKeys.lists(),
      });
    },
  });
}

/**
 * Hook to close (finalize) a settlement
 */
export function useCloseSettlement(id: UUID) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (idempotencyKey?: string) => {
      const headers: Record<string, string> = {};
      if (idempotencyKey) {
        headers["Idempotency-Key"] = idempotencyKey;
      }

      return apiClient.post<SettlementSummaryDTO>(`/api/settlements/${id}/close`, {}, { headers });
    },
    onSuccess: (data) => {
      // Update the settlement in cache with new status
      queryClient.setQueryData(settlementsQueryKeys.detail(id), data);

      // Invalidate the list and settlement snapshot
      queryClient.invalidateQueries({
        queryKey: settlementsQueryKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: ["settlement-snapshot", id],
      });
    },
  });
}
