import { useState, useEffect, useCallback, useMemo } from "react";
import type { UUID, ApiError, AmountCents, ParticipantDTO } from "@/types";
import {
  formatBalances,
  formatTransfers,
  calculateBalanceTotals,
  type FormattedBalance,
  type FormattedTransfer,
  type BalanceTotals,
} from "@/lib/utils/settlementFormatters";

interface SettlementSnapshotData {
  balances: Record<UUID, AmountCents>;
  transfers: Array<{ from: UUID; to: UUID; amount_cents: AmountCents }>;
}

interface UseSettlementSummaryResult {
  settlementSnapshot: SettlementSnapshotData | null;
  loading: boolean;
  error: ApiError | null;
  formattedBalances: FormattedBalance[];
  formattedTransfers: FormattedTransfer[];
  totals: BalanceTotals;
  closeSettlement: (idempotencyKey?: string) => Promise<void>;
  isClosing: boolean;
  reload: () => void;
}

type ParticipantMap = Record<UUID, string>;

export function useSettlementSummary(settlementId: string, status: "open" | "closed"): UseSettlementSummaryResult {
  const [settlementSnapshot, setSettlementSnapshot] = useState<SettlementSnapshotData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [participantsMap, setParticipantsMap] = useState<ParticipantMap>({});

  // Fetch participants for nickname mapping
  const fetchParticipants = useCallback(async () => {
    try {
      const response = await fetch(`/api/settlements/${settlementId}/participants`);
      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          code: data.error?.code,
          message: data.error?.message || "Failed to fetch participants",
          details: data.error?.details,
        } as ApiError;
      }

      // Create participant map for quick lookups
      const map: ParticipantMap = {};
      data.data.forEach((participant: ParticipantDTO) => {
        map[participant.id] = participant.nickname;
      });
      setParticipantsMap(map);
    } catch {
      // Don't set error state here as participants are secondary data
      // Silent error - participants data is not critical for summary display
    }
  }, [settlementId]);

  // Fetch settlement snapshot (only for closed settlements)
  const fetchSnapshot = useCallback(async () => {
    if (status !== "closed") {
      setSettlementSnapshot(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/settlements/${settlementId}/snapshot`);
      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          code: data.error?.code,
          message: data.error?.message || "Failed to fetch settlement snapshot",
          details: data.error?.details,
        } as ApiError;
      }

      setSettlementSnapshot(data);
    } catch (err) {
      setError(err as ApiError);
      setSettlementSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [settlementId, status]);

  // Close settlement
  const closeSettlement = useCallback(
    async (idempotencyKey?: string) => {
      setIsClosing(true);
      setError(null);

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (idempotencyKey) {
          headers["Idempotency-Key"] = idempotencyKey;
        }

        const response = await fetch(`/api/settlements/${settlementId}/close`, {
          method: "POST",
          headers,
          body: JSON.stringify({}),
        });

        const data = await response.json();

        if (!response.ok) {
          throw {
            status: response.status,
            code: data.error?.code,
            message: data.error?.message || "Failed to close settlement",
            details: data.error?.details,
          } as ApiError;
        }

        // Reload snapshot data after successful close
        await fetchSnapshot();
      } catch (err) {
        setError(err as ApiError);
      } finally {
        setIsClosing(false);
      }
    },
    [settlementId, fetchSnapshot]
  );

  // Format balances for display using shared formatter
  const formattedBalances = useMemo(
    () => formatBalances(settlementSnapshot?.balances, participantsMap),
    [settlementSnapshot?.balances, participantsMap]
  );

  // Format transfers for display using shared formatter
  const formattedTransfers = useMemo(
    () => formatTransfers(settlementSnapshot?.transfers, participantsMap),
    [settlementSnapshot?.transfers, participantsMap]
  );

  // Calculate totals for control sum using shared formatter
  const totals = useMemo(
    () => calculateBalanceTotals(settlementSnapshot?.balances),
    [settlementSnapshot?.balances]
  );

  const reload = useCallback(() => {
    fetchSnapshot();
    fetchParticipants();
  }, [fetchSnapshot, fetchParticipants]);

  // Initial load
  useEffect(() => {
    fetchParticipants();
    fetchSnapshot();
  }, [fetchParticipants, fetchSnapshot]);

  return {
    settlementSnapshot,
    loading,
    error,
    formattedBalances,
    formattedTransfers,
    totals,
    closeSettlement,
    isClosing,
    reload,
  };
}
