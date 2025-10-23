import { useState, useEffect, useCallback } from "react";
import { getParticipantErrorMessage } from "@/lib/errorMessages";
import type {
  ParticipantsListResponse,
  ParticipantDTO,
  CreateParticipantCommand,
  UpdateParticipantCommand,
  ApiError,
  ParticipantsListVM,
  ParticipantItemVM,
} from "@/types";

// View model types for participants
export type LockReason = "closed" | null;

export interface ParticipantsViewVM {
  isOwner: boolean;
  status: "open" | "closed";
  expensesCount: number;
  participantsCount: number;
  isLocked: boolean;
  lockReason: LockReason;
}

export interface UseParticipantsResult {
  // Data
  participants: ParticipantDTO[];
  pagination: ParticipantsListResponse["pagination"] | null;
  viewModel: ParticipantsViewVM | null;

  // State
  loading: boolean;
  error: ApiError | null;

  // Actions
  fetchList: () => Promise<void>;
  add: (command: CreateParticipantCommand) => Promise<ParticipantDTO>;
  update: (participantId: string, command: UpdateParticipantCommand) => Promise<ParticipantDTO>;
  remove: (participantId: string) => Promise<void>;
  reload: () => void;
}

export function useParticipants(
  settlementId: string,
  expensesCount: number,
  status: "open" | "closed",
  isOwner: boolean
): UseParticipantsResult {
  const [participants, setParticipants] = useState<ParticipantDTO[]>([]);
  const [pagination, setPagination] = useState<ParticipantsListResponse["pagination"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Calculate view model based on current state
  const viewModel: ParticipantsViewVM | null = status
    ? {
        isOwner,
        status,
        expensesCount,
        participantsCount: participants.length,
        isLocked: status === "closed",
        lockReason: status === "closed" ? "closed" : null,
      }
    : null;

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/settlements/${settlementId}/participants?page=1&limit=50`);
      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          code: data.error?.code,
          message: data.error?.message || "Failed to fetch participants",
          details: data.error?.details,
        } as ApiError;
      }

      setParticipants(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err as ApiError);
      setParticipants([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [settlementId]);

  const add = useCallback(
    async (command: CreateParticipantCommand): Promise<ParticipantDTO> => {
      const response = await fetch(`/api/settlements/${settlementId}/participants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      const data = await response.json();

      console.log(data);

      if (!response.ok) {
        throw {
          status: response.status,
          code: data.error?.code,
          message: data.error?.message || "Failed to add participant",
          details: data.error?.details,
        } as ApiError;
      }

      // Add the new participant to the list and reload to get fresh data
      await fetchList();
      return data;
    },
    [settlementId, fetchList]
  );

  const update = useCallback(
    async (participantId: string, command: UpdateParticipantCommand): Promise<ParticipantDTO> => {
      const response = await fetch(`/api/settlements/${settlementId}/participants/${participantId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          code: data.error?.code,
          message: data.error?.message || "Failed to update participant",
          details: data.error?.details,
        } as ApiError;
      }

      // Update the participant in the list and reload to get fresh data
      await fetchList();
      return data;
    },
    [settlementId, fetchList]
  );

  const remove = useCallback(
    async (participantId: string): Promise<void> => {
      const response = await fetch(`/api/settlements/${settlementId}/participants/${participantId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw {
          status: response.status,
          code: data.error?.code,
          message: data.error?.message || "Failed to remove participant",
          details: data.error?.details,
        } as ApiError;
      }

      // Remove the participant from the list and reload to get fresh data
      await fetchList();
    },
    [settlementId, fetchList]
  );

  const reload = useCallback(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (settlementId) {
      fetchList();
    }
  }, [fetchList, settlementId]);

  return {
    participants,
    pagination,
    viewModel,
    loading,
    error,
    fetchList,
    add,
    update,
    remove,
    reload,
  };
}

// Utility function to create participant list view model with stable sorting
export function createParticipantsListVM(
  participants: ParticipantDTO[],
  isOwner: boolean,
  isLocked: boolean
): ParticipantsListVM {
  // Sort participants stably: owners first, then alphabetically by nickname
  const sortedParticipants = [...participants].sort((a, b) => {
    // Owners come first
    if (a.is_owner && !b.is_owner) return -1;
    if (!a.is_owner && b.is_owner) return 1;

    // Then sort alphabetically by nickname (case-insensitive)
    const nicknameA = a.nickname.toLowerCase();
    const nicknameB = b.nickname.toLowerCase();

    if (nicknameA < nicknameB) return -1;
    if (nicknameA > nicknameB) return 1;

    // For stable sort, use original order as tiebreaker
    return 0;
  });

  const items: ParticipantItemVM[] = sortedParticipants.map((participant) => ({
    id: participant.id,
    nickname: participant.nickname,
    isOwner: participant.is_owner,
    canEdit: isOwner && !isLocked,
    canDelete: isOwner && !isLocked,
  }));

  return {
    items,
    canCreate: isOwner && !isLocked && participants.length < 10,
    canEdit: isOwner && !isLocked,
    canDelete: isOwner && !isLocked,
  };
}
