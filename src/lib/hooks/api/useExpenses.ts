import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { UUID, ExpenseDTO, CreateExpenseCommand, UpdateExpenseCommand } from "@/types";

/**
 * Query key factory for expenses
 * Helps manage cache invalidation and query key consistency
 */
export const expensesQueryKeys = {
  all: () => ["expenses"],
  bySettlement: (settlementId: UUID) => [...expensesQueryKeys.all(), settlementId],
  list: (settlementId: UUID) => [...expensesQueryKeys.bySettlement(settlementId), "list"],
  detail: (settlementId: UUID, expenseId: UUID) => [
    ...expensesQueryKeys.bySettlement(settlementId),
    "detail",
    expenseId,
  ],
};

/**
 * Hook to fetch all expenses in a settlement
 */
export function useExpenses(settlementId: UUID) {
  return useQuery({
    queryKey: expensesQueryKeys.list(settlementId),
    queryFn: () => apiClient.get<{ data: ExpenseDTO[] }>(`/api/settlements/${settlementId}/expenses`),
    enabled: !!settlementId,
  });
}

/**
 * Hook to fetch a single expense by ID
 * Used for edit mode to load initial data
 */
export function useExpense(settlementId: UUID, expenseId: UUID, enabled = true) {
  return useQuery({
    queryKey: expensesQueryKeys.detail(settlementId, expenseId),
    queryFn: () => apiClient.get<ExpenseDTO>(`/api/settlements/${settlementId}/expenses/${expenseId}`),
    enabled: enabled && !!settlementId && !!expenseId,
  });
}

/**
 * Hook to create a new expense in a settlement
 */
export function useCreateExpense(settlementId: UUID) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (command: CreateExpenseCommand) =>
      apiClient.post<ExpenseDTO>(`/api/settlements/${settlementId}/expenses`, command),
    onSuccess: () => {
      // Invalidate expenses list to refetch
      queryClient.invalidateQueries({
        queryKey: expensesQueryKeys.list(settlementId),
      });

      // Also invalidate settlements list as it might show expense counts
      queryClient.invalidateQueries({
        queryKey: ["settlements"],
      });
    },
  });
}

/**
 * Hook to update an existing expense in a settlement
 */
export function useUpdateExpense(settlementId: UUID, expenseId: UUID) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (command: UpdateExpenseCommand) =>
      apiClient.put<ExpenseDTO>(`/api/settlements/${settlementId}/expenses/${expenseId}`, command),
    onSuccess: () => {
      // Invalidate expenses list to refetch
      queryClient.invalidateQueries({
        queryKey: expensesQueryKeys.list(settlementId),
      });

      // Invalidate the specific expense detail
      queryClient.invalidateQueries({
        queryKey: expensesQueryKeys.detail(settlementId, expenseId),
      });

      // Also invalidate settlements list as it might show expense counts
      queryClient.invalidateQueries({
        queryKey: ["settlements"],
      });
    },
  });
}

/**
 * Hook to delete an expense from a settlement
 */
export function useDeleteExpense(settlementId: UUID, expenseId: UUID) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.delete(`/api/settlements/${settlementId}/expenses/${expenseId}`),
    onSuccess: () => {
      // Invalidate expenses list to refetch
      queryClient.invalidateQueries({
        queryKey: expensesQueryKeys.list(settlementId),
      });

      // Also invalidate settlements list as it might show expense counts
      queryClient.invalidateQueries({
        queryKey: ["settlements"],
      });
    },
  });
}
