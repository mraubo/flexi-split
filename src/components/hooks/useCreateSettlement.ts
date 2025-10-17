import { useState } from "react";
import type { CreateSettlementCommand, SettlementSummaryDTO, ApiError } from "@/types";

interface UseCreateSettlementResult {
  create: (command: CreateSettlementCommand) => Promise<SettlementSummaryDTO>;
  loading: boolean;
  error: ApiError | null;
}

export function useCreateSettlement(): UseCreateSettlementResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const create = async (command: CreateSettlementCommand): Promise<SettlementSummaryDTO> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/settlements", {
        method: "POST",
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
          message: data.error?.message || "Failed to create settlement",
          details: data.error?.details,
        } as ApiError;
      }

      return data as SettlementSummaryDTO;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setLoading(false);
    }
  };

  return { create, loading, error };
}
