import { useState, useEffect, useCallback } from "react";
import type { SettlementDetailsDTO, ApiError } from "@/types";

interface UseSettlementDetailsResult {
  settlement: SettlementDetailsDTO | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
}

export function useSettlementDetails(settlementId: string): UseSettlementDetailsResult {
  const [settlement, setSettlement] = useState<SettlementDetailsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchSettlement = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/settlements/${settlementId}`);
      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          code: data.error?.code,
          message: data.error?.message || "Failed to fetch settlement",
          details: data.error?.details,
        } as ApiError;
      }

      setSettlement(data);
    } catch (err) {
      setError(err as ApiError);
      setSettlement(null);
    } finally {
      setLoading(false);
    }
  }, [settlementId]);

  const reload = useCallback(() => {
    fetchSettlement();
  }, [fetchSettlement]);

  useEffect(() => {
    if (settlementId) {
      fetchSettlement();
    }
  }, [fetchSettlement, settlementId]);

  return {
    settlement,
    loading,
    error,
    reload,
  };
}
