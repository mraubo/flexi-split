import type { ChangeEvent } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { UUID, ExpenseParticipantMiniDTO } from "@/types";

export interface ParticipantsChecklistProps {
  items: ExpenseParticipantMiniDTO[];
  selectedIds: UUID[];
  onChange: (ids: UUID[]) => void;
  error?: string;
}

export function ParticipantsChecklist({ items, selectedIds, onChange, error }: ParticipantsChecklistProps) {
  const handleParticipantToggle = (participantId: UUID, checked: boolean) => {
    if (checked) {
      onChange([...selectedIds, participantId]);
    } else {
      onChange(selectedIds.filter((id) => id !== participantId));
    }
  };

  const handleSelectAll = () => {
    onChange(items.map((p) => p.id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const allSelected = selectedIds.length === items.length;
  const noneSelected = selectedIds.length === 0;

  return (
    <div className="space-y-3" data-testid="field-participants">
      <div className="flex md:items-center md:justify-between flex-col md:flex-row">
        <Label className="mb-2 md:mb-0">
          Uczestnicy podziału <span className="text-red-500">*</span>
        </Label>
        <div className="flex gap-2 flex-wrap md:flex-nowrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={allSelected}
            data-testid="button-select-all"
          >
            Zaznacz wszystkich
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            disabled={noneSelected}
            data-testid="button-deselect-all"
          >
            Odznacz wszystkich
          </Button>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 gap-2 p-3 border rounded-md ${error ? "border-red-500" : "border-gray-200"}`}
        role="group"
        aria-labelledby="participants-label"
        aria-describedby={error ? "participants-error" : "participants-help"}
        data-testid="group-participants"
      >
        {items.map((participant) => (
          <div key={participant.id} className="flex items-center space-x-2">
            <Checkbox
              id={`participant-${participant.id}`}
              checked={selectedIds.includes(participant.id)}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleParticipantToggle(participant.id, e.target.checked)}
              data-testid={`checkbox-participant-${participant.id}`}
            />
            <Label
              htmlFor={`participant-${participant.id}`}
              className="text-sm font-normal cursor-pointer select-none"
              data-testid={`label-participant-${participant.id}`}
            >
              {participant.nickname}
            </Label>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600" data-testid="text-selected-count">
          Zaznaczonych: {selectedIds.length} z {items.length}
        </span>
      </div>

      {error && (
        <p id="participants-error" className="text-sm text-red-600" role="alert" data-testid="error-participants">
          {error}
        </p>
      )}

      <p id="participants-help" className="text-xs text-gray-500" data-testid="text-helper">
        Wybierz uczestników, między którymi zostanie podzielony koszt wydatku
      </p>
    </div>
  );
}
