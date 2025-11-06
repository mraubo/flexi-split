import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { NicknameInput } from "@/components/form/NicknameInput";
import { useParticipantNickname } from "@/components/hooks/useParticipantNickname";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getParticipantErrorMessage, type ApiError } from "@/lib/errorMessages";
import type { UpdateParticipantCommand, ParticipantItemVM, ParticipantDTO } from "@/types";

interface EditParticipantModalProps {
  participant: ParticipantItemVM | null;
  existingNicknames: string[];
  onSaved: (updatedParticipant: ParticipantItemVM) => void;
  onClose: () => void;
  disabled: boolean;
  updateParticipant: (participantId: string, command: UpdateParticipantCommand) => Promise<ParticipantDTO>;
}

export default function EditParticipantModal({
  participant,
  existingNicknames,
  onSaved,
  onClose,
  disabled,
  updateParticipant,
}: EditParticipantModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    nickname,
    setNickname,
    validation,
    errorMessage,
    setErrorMessage,
    isSubmitting,
    setIsSubmitting,
    updateValidation,
    getValidationMessage,
    isValid,
    reset,
    handleRemoteConflict,
  } = useParticipantNickname(existingNicknames, participant?.nickname);

  // Initialize form when participant changes
  useEffect(() => {
    if (participant) {
      // The hook's reset() will initialize with the current nickname
      // We need to update the hook's state to the participant's nickname
      setNickname(participant.nickname);
      reset();
      setErrorMessage("");

      // Focus input after dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [participant, setNickname, reset, setErrorMessage]);

  const handleInputChange = (value: string) => {
    setNickname(value);
    setErrorMessage("");

    if (value) {
      updateValidation(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!participant || !isValid() || isSubmitting || disabled) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const command: UpdateParticipantCommand = { nickname };
      const updatedDTO = await updateParticipant(participant.id, command);

      // Convert DTO to ItemVM for callback
      const updatedParticipant: ParticipantItemVM = {
        id: updatedDTO.id,
        nickname: updatedDTO.nickname,
        isOwner: updatedDTO.is_owner,
        canEdit: true,
        canDelete: !updatedDTO.is_owner,
      };

      onSaved(updatedParticipant);
      onClose(); // Close modal on success
    } catch (error: unknown) {
      // Handle specific error codes
      const apiError = error as ApiError;
      if (apiError.status === 409) {
        // Nickname conflict - generate suggestion and handle conflict
        const base = nickname.toLowerCase();
        let suffix = 1;
        let suggestion = `${base}${suffix}`;

        // Find next available suggestion (excluding current nickname)
        while (
          existingNicknames.some(
            (existing) =>
              existing.toLowerCase() === suggestion.toLowerCase() &&
              existing.toLowerCase() !== participant?.nickname.toLowerCase()
          )
        ) {
          suffix++;
          suggestion = `${base}${suffix}`;
        }

        handleRemoteConflict(suggestion);
      } else {
        // Use centralized error message
        setErrorMessage(getParticipantErrorMessage(apiError));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const validationMessage = getValidationMessage();

  return (
    <Dialog open={!!participant} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edytuj uczestnika</DialogTitle>
          <DialogDescription>
            Zmień nazwę uczestnika rozliczenia. Nazwa musi być unikalna w ramach tego rozliczenia.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <NicknameInput
              ref={inputRef}
              id="edit-nickname"
              value={nickname}
              onChange={handleInputChange}
              validation={validation}
              validationMessage={validationMessage}
              errorMessage={errorMessage}
              disabled={disabled}
              isSubmitting={isSubmitting}
              label="Nazwa uczestnika"
              helperText="Nazwa musi mieć 3-30 znaków i może zawierać małe litery, cyfry, podkreślenia oraz myślniki."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-12 px-6 text-base min-w-[100px]"
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={disabled || !isValid() || isSubmitting}
              className="h-12 px-6 text-base min-w-[100px]"
            >
              {isSubmitting ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
