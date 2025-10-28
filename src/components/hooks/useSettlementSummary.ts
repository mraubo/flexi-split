import { useState, useEffect, useCallback, useMemo } from "react";
import type { SettlementSnapshotDTO, ApiError, UUID, AmountCents, ParticipantDTO } from "@/types";

interface UseSettlementSummaryResult {
  settlementSnapshot: SettlementSnapshotDTO | null;
  loading: boolean;
  error: ApiError | null;
  formattedBalances: FormattedBalance[];
  formattedTransfers: FormattedTransfer[];
  totals: BalanceTotals;
  closeSettlement: (idempotencyKey?: string) => Promise<void>;
  isClosing: boolean;
  reload: () => void;
}

export interface FormattedBalance {
  participantId: UUID;
  nickname: string;
  amountCents: AmountCents;
  formattedAmount: string;
  sign: "+" | "-" | "0";
}

export interface FormattedTransfer {
  fromId: UUID;
  fromNickname: string;
  toId: UUID;
  toNickname: string;
  amountCents: AmountCents;
  formattedAmount: string;
}

interface BalanceTotals {
  sumPayable: number;
  sumReceivable: number;
  isBalanced: boolean;
}

type ParticipantMap = Record<UUID, string>;

export function useSettlementSummary(settlementId: string, status: "open" | "closed"): UseSettlementSummaryResult {
  const [settlementSnapshot, setSettlementSnapshot] = useState<SettlementSnapshotDTO | null>(null);
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

  // Format balances for display
  const formattedBalances = useMemo((): FormattedBalance[] => {
    if (!settlementSnapshot?.balances) return [];

    return Object.entries(settlementSnapshot.balances)
      .map(([participantId, amountCents]) => ({
        participantId: participantId as UUID,
        nickname: participantsMap[participantId] || "Nieznany uczestnik",
        amountCents: amountCents as AmountCents,
        formattedAmount: formatCurrency(Math.abs(amountCents)),
        sign: (amountCents > 0 ? "+" : amountCents < 0 ? "-" : "0") as "+" | "-" | "0",
      }))
      .sort((a, b) => {
        // Sort by amount (negative first, then positive, then zero)
        if (a.amountCents !== b.amountCents) {
          return a.amountCents - b.amountCents;
        }
        // Then by nickname for stable sort
        return a.nickname.localeCompare(b.nickname, "pl");
      });
  }, [settlementSnapshot?.balances, participantsMap]);

  // Format transfers for display
  const formattedTransfers = useMemo((): FormattedTransfer[] => {
    if (!settlementSnapshot?.transfers) return [];

    return settlementSnapshot.transfers
      .map((transfer) => ({
        fromId: transfer.from,
        fromNickname: participantsMap[transfer.from] || "Nieznany uczestnik",
        toId: transfer.to,
        toNickname: participantsMap[transfer.to] || "Nieznany uczestnik",
        amountCents: transfer.amount_cents,
        formattedAmount: formatCurrency(transfer.amount_cents),
      }))
      .sort((a, b) => {
        // Sort by from nickname, then to nickname for stable sort
        const fromCompare = a.fromNickname.localeCompare(b.fromNickname, "pl");
        if (fromCompare !== 0) return fromCompare;
        return a.toNickname.localeCompare(b.toNickname, "pl");
      });
  }, [settlementSnapshot?.transfers, participantsMap]);

  // Calculate totals for control sum
  const totals = useMemo((): BalanceTotals => {
    if (!settlementSnapshot?.balances) {
      return { sumPayable: 0, sumReceivable: 0, isBalanced: true };
    }

    const balances = Object.values(settlementSnapshot.balances) as number[];
    const sumPayable = balances.filter((b) => b < 0).reduce((sum, b) => sum + Math.abs(b), 0);
    const sumReceivable = balances.filter((b) => b > 0).reduce((sum, b) => sum + b, 0);

    return {
      sumPayable,
      sumReceivable,
      isBalanced: Math.abs(sumPayable - sumReceivable) < 1, // Allow for small floating point differences
    };
  }, [settlementSnapshot?.balances]);

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

// Utility function for currency formatting
function formatCurrency(amountCents: number, currency = "PLN"): string {
  const amount = amountCents / 100;
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
  }).format(amount);
}
