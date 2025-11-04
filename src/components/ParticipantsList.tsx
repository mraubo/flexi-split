import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Crown } from "lucide-react";
import type { ParticipantItemVM } from "@/types";

interface ParticipantsListProps {
  items: ParticipantItemVM[];
  onEdit: (participant: ParticipantItemVM) => void;
  onDelete: (participantId: string) => void;
  isOwner: boolean;
  isLocked: boolean;
}

export default function ParticipantsList({ items, onEdit, onDelete, isOwner, isLocked }: ParticipantsListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Brak uczestników do wyświetlenia</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="list-participants">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900" data-testid="heading-participants">
          Lista uczestników ({items.length})
        </h3>
        {!isOwner && (
          <Badge variant="secondary" className="text-xs" data-testid="badge-read-only">
            Tylko do odczytu
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {items.map((participant) => (
          <div
            key={participant.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
            data-testid={`participant-item-${participant.id}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900" data-testid="text-participant-nickname">
                    {participant.nickname}
                  </span>
                  {participant.isOwner && (
                    <Badge variant="default" className="text-xs flex items-center gap-1" data-testid="badge-owner">
                      <Crown className="h-3 w-3" />
                      Właściciel
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {participant.canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(participant)}
                  aria-label={`Edytuj uczestnika ${participant.nickname}`}
                  className="h-10 w-10 p-0 min-w-[44px] min-h-[44px]"
                  data-testid="button-edit-participant"
                >
                  <Edit2 className="h-5 w-5" />
                  <span className="sr-only">Edytuj</span>
                </Button>
              )}

              {participant.canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(participant.id)}
                  aria-label={`Usuń uczestnika ${participant.nickname}`}
                  className="h-10 w-10 p-0 min-w-[44px] min-h-[44px] text-red-600 hover:text-red-700 hover:bg-red-50"
                  data-testid="button-delete-participant"
                >
                  <Trash2 className="h-5 w-5" />
                  <span className="sr-only">Usuń</span>
                </Button>
              )}

              {!participant.canEdit && !participant.canDelete && isLocked && (
                <div className="text-xs text-gray-500 px-2" data-testid="text-locked-message">
                  Zablokowane
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isLocked && (
        <div
          className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded p-2"
          data-testid="text-lock-banner"
        >
          {isOwner ? (
            <span>Edycja jest zablokowana. {items.length >= 10 && "Osiągnięto limit 10 uczestników."}</span>
          ) : (
            <span>Jesteś tylko właścicielem tego rozliczenia, więc nie możesz edytować uczestników.</span>
          )}
        </div>
      )}
    </div>
  );
}
