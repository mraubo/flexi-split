import { useState, useCallback } from "react";
import type { ApiError } from "@/types";

interface UseUpdateSettlementTitleResult {
  updateTitle: (title: string) => Promise<void>;
  loading: boolean;
  error: ApiError | null;
}

export function useUpdateSettlementTitle(settlementId: string): UseUpdateSettlementTitleResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const updateTitle = useCallback(
    async (title: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/settlements/${settlementId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw {
            status: response.status,
            code: data.error?.code,
            message: data.error?.message || "Failed to update settlement title",
            details: data.error?.details,
          } as ApiError;
        }

        // Success - the hook doesn't need to return data, just handle success/error
      } catch (err) {
        setError(err as ApiError);
        throw err; // Re-throw so the component can handle it
      } finally {
        setLoading(false);
      }
    },
    [settlementId]
  );

  return {
    updateTitle,
    loading,
    error,
  };
}
