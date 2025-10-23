import { useState, useEffect, useCallback } from "react";
import type { UUID } from "@/types";

export function useExpensesFilter(): {
  participantId: UUID | undefined;
  setParticipantId: (participantId: UUID | undefined) => void;
} {
  const [participantId, setParticipantIdState] = useState<UUID | undefined>(undefined);

  // Read participant_id from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const participantIdParam = urlParams.get("participant_id");
    if (participantIdParam) {
      // Basic UUID validation - in real app this would be more robust
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(participantIdParam)) {
        setParticipantIdState(participantIdParam as UUID);
      }
    }
  }, []);

  // Update URL when participantId changes
  const setParticipantId = useCallback((newParticipantId: UUID | undefined) => {
    setParticipantIdState(newParticipantId);
    const url = new URL(window.location.href);

    if (newParticipantId) {
      url.searchParams.set("participant_id", newParticipantId);
    } else {
      url.searchParams.delete("participant_id");
    }

    window.history.replaceState({}, "", url.toString());
  }, []);

  return { participantId, setParticipantId };
}
