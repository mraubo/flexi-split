import { useState } from "react";
import type { ApiError } from "@/types";

interface UseDeleteSettlementResult {
  remove: (id: string) => Promise<void>;
  loading: boolean;
  error: ApiError | null;
}

export function useDeleteSettlement(): UseDeleteSettlementResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const remove = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/settlements/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        let data;
        try {
          data = await response.json();
        } catch {
          // If response is not JSON, create generic error
          data = { error: { message: "Failed to delete settlement" } };
        }

        throw {
          status: response.status,
          code: data.error?.code,
          message: data.error?.message || "Failed to delete settlement",
          details: data.error?.details,
        } as ApiError;
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setLoading(false);
    }
  };

  return { remove, loading, error };
}
