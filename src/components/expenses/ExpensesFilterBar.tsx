import type { ParticipantDTO, UUID } from "@/types";
import { useExpensesFilter } from "@/components/hooks/useExpensesFilter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Users } from "lucide-react";

interface ExpensesFilterBarProps {
  participants: ParticipantDTO[];
  disabled?: boolean;
}

export default function ExpensesFilterBar({ participants, disabled = false }: ExpensesFilterBarProps) {
  const { participantId: selectedParticipantId, setParticipantId } = useExpensesFilter();
  const handleParticipantChange = (value: string) => {
    if (value === "all") {
      setParticipantId(undefined);
    } else {
      setParticipantId(value as UUID);
    }
  };

  const handleClearFilter = () => {
    setParticipantId(undefined);
  };

  const selectedParticipant = participants.find((p) => p.id === selectedParticipantId);

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Users className="h-4 w-4" />
        <span>Filtruj koszty</span>
      </div>

      <Select value={selectedParticipantId || "all"} onValueChange={handleParticipantChange} disabled={disabled}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Wybierz uczestnika..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <span>Wszystkie koszty</span>
            </div>
          </SelectItem>
          {participants.map((participant) => (
            <SelectItem key={participant.id} value={participant.id}>
              <div className="flex items-center gap-2">
                <span>{participant.nickname}</span>
                {participant.is_owner && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Właściciel</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedParticipantId && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearFilter}
          disabled={disabled}
          className="flex items-center gap-1"
        >
          <X className="h-3 w-3" />
          Wyczyść
        </Button>
      )}

      {selectedParticipant && (
        <div className="text-sm text-gray-600">Pokazywane koszty {selectedParticipant.nickname}</div>
      )}
    </div>
  );
}
