import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UUID, ExpenseParticipantMiniDTO } from "@/types";

export interface PayerSelectProps {
  participants: ExpenseParticipantMiniDTO[];
  value?: UUID;
  onChange: (id: UUID) => void;
  error?: string;
}

export function PayerSelect({ participants, value, onChange, error }: PayerSelectProps) {
  const handleValueChange = (selectedValue: string) => {
    // Ignore empty string changes (can happen during Select internal lifecycle)
    if (selectedValue === "") {
      return;
    }
    onChange(selectedValue as UUID);
  };

  return (
    <div className="space-y-2" data-testid="field-payer">
      <Label htmlFor="payer-select">
        Płacący <span className="text-red-500">*</span>
      </Label>
      <Select value={value || ""} onValueChange={handleValueChange}>
        <SelectTrigger
          id="payer-select"
          aria-invalid={!!error}
          aria-describedby={error ? "payer-error" : undefined}
          className={error ? "border-red-500" : ""}
          data-testid="select-payer"
        >
          <SelectValue placeholder="Wybierz kto zapłacił" />
        </SelectTrigger>
        <SelectContent>
          {participants.map((participant) => (
            <SelectItem key={participant.id} value={participant.id} data-testid={`select-item-${participant.id}`}>
              {participant.nickname}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p id="payer-error" className="text-sm text-red-600" role="alert" data-testid="error-payer">
          {error}
        </p>
      )}
      <p className="text-xs text-gray-500" data-testid="text-helper">
        Wybierz osobę, która pokryła koszt wydatku
      </p>
    </div>
  );
}
