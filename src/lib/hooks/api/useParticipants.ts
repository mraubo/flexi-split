import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  UUID,
  ParticipantDTO,
  CreateParticipantCommand,
  UpdateParticipantCommand,
  ApiError,
} from "@/types";

/**
 * Query key factory for participants
 * Helps manage cache invalidation and query key consistency
 */
export const participantsQueryKeys = {
  all: () => ["participants"],
  bySettlement: (settlementId: UUID) => [...participantsQueryKeys.all(), settlementId],
  list: (settlementId: UUID) => [...participantsQueryKeys.bySettlement(settlementId), "list"],
};

/**
 * Hook to fetch all participants in a settlement
 */
export function useParticipants(settlementId: UUID) {
  return useQuery({
    queryKey: participantsQueryKeys.list(settlementId),
    queryFn: () =>
      apiClient.get<{ data: ParticipantDTO[] }>(
        `/api/settlements/${settlementId}/participants`
      ),
    enabled: !!settlementId,
  });
}

/**
 * Hook to create a new participant in a settlement
 */
export function useCreateParticipant(settlementId: UUID) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (command: CreateParticipantCommand) =>
      apiClient.post<{ data: ParticipantDTO }>(
        `/api/settlements/${settlementId}/participants`,
        command
      ),
    onSuccess: () => {
      // Invalidate participants list to refetch
      queryClient.invalidateQueries({
        queryKey: participantsQueryKeys.list(settlementId),
      });

      // Also invalidate expenses list as it might reference participants
      queryClient.invalidateQueries({
        queryKey: ["expenses", settlementId],
      });
    },
  });
}

/**
 * Hook to update a participant in a settlement
 */
export function useUpdateParticipant(settlementId: UUID, participantId: UUID) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (command: UpdateParticipantCommand) =>
      apiClient.put<{ data: ParticipantDTO }>(
        `/api/settlements/${settlementId}/participants/${participantId}`,
        command
      ),
    onSuccess: () => {
      // Invalidate participants list to refetch
      queryClient.invalidateQueries({
        queryKey: participantsQueryKeys.list(settlementId),
      });

      // Also invalidate expenses list as it might reference this participant
      queryClient.invalidateQueries({
        queryKey: ["expenses", settlementId],
      });
    },
  });
}

/**
 * Hook to delete a participant from a settlement
 */
export function useDeleteParticipant(settlementId: UUID, participantId: UUID) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.delete<void>(
        `/api/settlements/${settlementId}/participants/${participantId}`
      ),
    onSuccess: () => {
      // Invalidate participants list to refetch
      queryClient.invalidateQueries({
        queryKey: participantsQueryKeys.list(settlementId),
      });

      // Also invalidate expenses list as participant might be referenced
      queryClient.invalidateQueries({
        queryKey: ["expenses", settlementId],
      });
    },
  });
}
