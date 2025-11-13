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
import type { CreateParticipantCommand, ParticipantDTO } from "@/types";

interface AddParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingNicknames: string[];
  onCreated: (participant: ParticipantDTO) => void;
  disabled: boolean;
  addParticipant: (command: CreateParticipantCommand) => Promise<ParticipantDTO>;
}

export default function AddParticipantDialog({
  open,
  onOpenChange,
  existingNicknames,
  onCreated,
  disabled,
  addParticipant,
}: AddParticipantDialogProps) {
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
  } = useParticipantNickname(existingNicknames);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleInputChange = (value: string) => {
    setNickname(value);
    setErrorMessage("");

    if (value) {
      updateValidation(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid() || isSubmitting || disabled) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const command: CreateParticipantCommand = { nickname };
      const participant = await addParticipant(command);
      onCreated(participant);
      handleClose();
    } catch (error: unknown) {
      // Handle specific error codes
      const apiError = error as ApiError;
      if (apiError.status === 409) {
        // Nickname conflict - generate suggestion and handle conflict
        const base = nickname.toLowerCase();
        let suffix = 1;
        let suggestion = `${base}${suffix}`;

        // Find next available suggestion
        while (existingNicknames.some((existing) => existing.toLowerCase() === suggestion.toLowerCase())) {
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
      reset();
      onOpenChange(false);
    }
  };

  const validationMessage = getValidationMessage();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" data-testid="dialog-add-participant">
        <DialogHeader>
          <DialogTitle>Dodaj uczestnika</DialogTitle>
          <DialogDescription>
            Dodaj nowego uczestnika do rozliczenia. Nazwa musi być unikalna w ramach tego rozliczenia.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <NicknameInput
              ref={inputRef}
              id="add-nickname"
              value={nickname}
              onChange={handleInputChange}
              validation={validation}
              validationMessage={validationMessage}
              errorMessage={errorMessage}
              disabled={disabled}
              isSubmitting={isSubmitting}
              placeholder="np. jan_kowalski"
              label="Nazwa uczestnika"
              helperText="Nazwa musi mieć 3-30 znaków i może zawierać małe litery, cyfry, podkreślenia oraz myślniki."
              data-testid="input-nickname"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-12 px-6 text-base min-w-[100px]"
              data-testid="button-cancel-add-participant"
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={disabled || !isValid() || isSubmitting}
              className="h-12 px-6 text-base min-w-[100px]"
              data-testid="button-submit-add-participant"
            >
              {isSubmitting ? "Dodawanie..." : "Dodaj"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
