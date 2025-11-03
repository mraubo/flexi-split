import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getParticipantErrorMessage } from "@/lib/errorMessages";
import type { UpdateParticipantCommand, ParticipantItemVM } from "@/types";

interface EditParticipantModalProps {
  participant: ParticipantItemVM | null;
  existingNicknames: string[];
  onSaved: (updatedParticipant: ParticipantItemVM) => void;
  onClose: () => void;
  disabled: boolean;
  updateParticipant: (participantId: string, command: UpdateParticipantCommand) => Promise<ParticipantItemVM>;
}

interface EditParticipantValidationState {
  isValidPattern: boolean;
  isValidLength: boolean;
  isUniqueLocal: boolean;
  conflictRemote?: boolean;
  suggestion?: string;
}

export default function EditParticipantModal({
  participant,
  existingNicknames,
  onSaved,
  onClose,
  disabled,
  updateParticipant,
}: EditParticipantModalProps) {
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validation, setValidation] = useState<EditParticipantValidationState>({
    isValidPattern: true,
    isValidLength: true,
    isUniqueLocal: true,
  });
  const [errorMessage, setErrorMessage] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize form when participant changes
  useEffect(() => {
    if (participant) {
      setNickname(participant.nickname);
      setValidation({
        isValidPattern: true,
        isValidLength: true,
        isUniqueLocal: true,
      });
      setErrorMessage("");
      setIsSubmitting(false);

      // Focus input after dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [participant]);

  const validatePattern = (value: string): boolean => {
    const pattern = /^[a-z0-9_-]+$/;
    return pattern.test(value);
  };

  const validateLength = (value: string): boolean => {
    return value.length >= 3 && value.length <= 30;
  };

  const validateLocalUniqueness = useCallback(
    (value: string): boolean => {
      // Case-insensitive uniqueness check, excluding current participant
      return !existingNicknames.some(
        (existing) =>
          existing.toLowerCase() === value.toLowerCase() &&
          existing.toLowerCase() !== participant?.nickname.toLowerCase()
      );
    },
    [existingNicknames, participant]
  );

  const generateSuggestion = useCallback(
    (value: string): string => {
      const base = value.toLowerCase();
      let suffix = 1;
      let suggestion = `${base}${suffix}`;

      while (existingNicknames.some((existing) => existing.toLowerCase() === suggestion.toLowerCase())) {
        suffix++;
        suggestion = `${base}${suffix}`;
      }

      return suggestion;
    },
    [existingNicknames]
  );

  const updateValidation = useCallback(
    (value: string) => {
      const isValidPattern = validatePattern(value);
      const isValidLength = validateLength(value);
      const isUniqueLocal = validateLocalUniqueness(value);

      const suggestion = !isUniqueLocal ? generateSuggestion(value) : undefined;

      setValidation({
        isValidPattern,
        isValidLength,
        isUniqueLocal,
        conflictRemote: false,
        suggestion,
      });
    },
    [generateSuggestion, validateLocalUniqueness]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNickname(value);
    setErrorMessage("");

    if (value) {
      updateValidation(value);
    } else {
      // Reset validation for empty input
      setValidation({
        isValidPattern: true,
        isValidLength: true,
        isUniqueLocal: true,
      });
    }
  };

  const getValidationMessage = (): string => {
    if (!nickname) return "";

    if (!validation.isValidPattern) {
      return "Nazwa może zawierać tylko małe litery, cyfry, podkreślenia i myślniki.";
    }

    if (!validation.isValidLength) {
      return "Nazwa musi mieć od 3 do 30 znaków.";
    }

    if (!validation.isUniqueLocal) {
      return `Nazwa "${nickname}" jest już używana. Spróbuj "${validation.suggestion}".`;
    }

    if (validation.conflictRemote) {
      return `Nazwa "${nickname}" jest już używana. Spróbuj "${validation.suggestion}".`;
    }

    return "";
  };

  const isValid = (): boolean => {
    return (
      nickname.length > 0 &&
      validation.isValidPattern &&
      validation.isValidLength &&
      validation.isUniqueLocal &&
      !validation.conflictRemote &&
      nickname !== participant?.nickname // Must be different from current
    );
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
      const updatedParticipant = await updateParticipant(participant.id, command);
      onSaved(updatedParticipant);
      onClose(); // Close modal on success
    } catch (error: unknown) {
      // Handle specific error codes
      const err = error as { status?: number };
      if (err.status === 409) {
        // Nickname conflict - update validation with suggestion
        const suggestion = generateSuggestion(nickname);
        setValidation((prev) => ({
          ...prev,
          conflictRemote: true,
          suggestion,
        }));
        setErrorMessage(`Nazwa "${nickname}" jest już używana. Spróbuj "${suggestion}".`);
      } else {
        // Use centralized error message
        setErrorMessage(getParticipantErrorMessage(error));
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
  const hasError = errorMessage || (nickname && !isValid());

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
            <div className="grid gap-2">
              <Label htmlFor="edit-nickname">Nazwa uczestnika</Label>
              <Input
                ref={inputRef}
                id="edit-nickname"
                type="text"
                value={nickname}
                onChange={handleInputChange}
                disabled={disabled || isSubmitting}
                aria-invalid={hasError}
                aria-describedby={hasError ? "edit-nickname-error" : undefined}
                className={`h-12 text-base ${hasError ? "border-red-500 focus:border-red-500" : ""}`}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>

            {/* Validation/Error Messages */}
            {hasError && (
              <div id="edit-nickname-error" className="text-sm text-red-600" role="alert" aria-live="polite">
                {errorMessage || validationMessage}
              </div>
            )}

            {/* Helper Text */}
            {!hasError && !nickname && (
              <p className="text-xs text-gray-500">
                Nazwa musi mieć 3-30 znaków i może zawierać małe litery, cyfry, podkreślenia oraz myślniki.
              </p>
            )}
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
