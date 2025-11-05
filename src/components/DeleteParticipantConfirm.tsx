import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { getParticipantErrorMessage } from "@/lib/errorMessages";
import type { ParticipantItemVM } from "@/types";

interface DeleteParticipantConfirmProps {
  participant: ParticipantItemVM | null;
  onDeleted: (participantId: string) => void;
  onClose: () => void;
  disabled: boolean;
  deleteParticipant: (participantId: string) => Promise<void>;
}

export default function DeleteParticipantConfirm({
  participant,
  onDeleted,
  onClose,
  disabled,
  deleteParticipant,
}: DeleteParticipantConfirmProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleDelete = async () => {
    if (!participant || isDeleting || disabled) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    try {
      await deleteParticipant(participant.id);
      onDeleted(participant.id);
      onClose(); // Close dialog on success
    } catch (error: unknown) {
      // Use centralized error message
      const apiError = error as unknown as typeof error;
      setErrorMessage(getParticipantErrorMessage(apiError as { status?: number }));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  if (!participant) {
    return null;
  }

  return (
    <AlertDialog open={!!participant} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <AlertDialogTitle>Usuń uczestnika</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                Czy na pewno chcesz usunąć uczestnika{" "}
                <span className="font-medium">&quot;{participant.nickname}&quot;</span>?
                {participant.isOwner && (
                  <span className="block mt-1 text-yellow-600 font-medium">
                    ⚠️ To jest właściciel rozliczenia. Usunięcie może wpłynąć na uprawnienia.
                  </span>
                )}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="py-4">
          <div className="text-sm text-gray-600 space-y-2">
            <p>• Uczestnik zostanie trwale usunięty z rozliczenia.</p>
            <p>• Wszystkie powiązane dane zostaną usunięte.</p>
            {!participant.isOwner && <p>• Jeśli uczestnik ma powiązane wydatki, usunięcie nie będzie możliwe.</p>}
          </div>

          {errorMessage && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="text-sm text-red-800" role="alert">
                {errorMessage}
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={isDeleting} className="h-12 px-6 text-base min-w-[100px]">
            Anuluj
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={disabled || isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600 h-12 px-6 text-base min-w-[100px]"
          >
            {isDeleting ? "Usuwanie..." : "Usuń"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
