import { useState, useRef, useCallback, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getParticipantErrorMessage } from "@/lib/errorMessages";
import type { CreateParticipantCommand, ParticipantDTO } from "@/types";

interface ParticipantFormProps {
  onCreated: (participant: ParticipantDTO) => void;
  disabled: boolean;
  existingNicknames: string[];
  addParticipant: (command: CreateParticipantCommand) => Promise<ParticipantDTO>;
}

interface NicknameValidationState {
  isValidPattern: boolean;
  isValidLength: boolean;
  isUniqueLocal: boolean;
  conflictRemote?: boolean;
  suggestion?: string;
}

const ParticipantForm = forwardRef<HTMLInputElement, ParticipantFormProps>(
  ({ onCreated, disabled, existingNicknames, addParticipant }: ParticipantFormProps, ref) => {
    const [nickname, setNickname] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validation, setValidation] = useState<NicknameValidationState>({
      isValidPattern: true,
      isValidLength: true,
      isUniqueLocal: true,
    });
    const [errorMessage, setErrorMessage] = useState("");
    const [liveMessage, setLiveMessage] = useState(""); // For aria-live announcements

    const inputRef = useRef<HTMLInputElement>(null);

    const validatePattern = (value: string): boolean => {
      const pattern = /^[a-z0-9_-]+$/;
      return pattern.test(value);
    };

    const validateLength = (value: string): boolean => {
      return value.length >= 3 && value.length <= 30;
    };

    const validateLocalUniqueness = (value: string): boolean => {
      // Case-insensitive uniqueness check
      return !existingNicknames.some((existing) => existing.toLowerCase() === value.toLowerCase());
    };

    const generateSuggestion = (value: string): string => {
      const base = value.toLowerCase();
      let suffix = 1;
      let suggestion = `${base}${suffix}`;

      while (existingNicknames.some((existing) => existing.toLowerCase() === suggestion.toLowerCase())) {
        suffix++;
        suggestion = `${base}${suffix}`;
      }

      return suggestion;
    };

    const updateValidation = useCallback(
      (value: string) => {
        const isValidPattern = validatePattern(value);
        const isValidLength = validateLength(value);
        const isUniqueLocal = validateLocalUniqueness(value);

        const newValidation = {
          isValidPattern,
          isValidLength,
          isUniqueLocal,
          conflictRemote: false,
          suggestion: !isUniqueLocal ? generateSuggestion(value) : undefined,
        };

        setValidation(newValidation);

        // Update live message for screen readers
        if (!isUniqueLocal && newValidation.suggestion) {
          setLiveMessage(`Nazwa jest już używana. Sugestia: ${newValidation.suggestion}`);
        } else if (!isValidPattern) {
          setLiveMessage("Nazwa może zawierać tylko małe litery, cyfry, podkreślenia i myślniki.");
        } else if (!isValidLength) {
          setLiveMessage("Nazwa musi mieć od 3 do 30 znaków.");
        } else {
          setLiveMessage("");
        }
      },
      [existingNicknames]
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
        !validation.conflictRemote
      );
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

        // Reset form
        setNickname("");
        setValidation({
          isValidPattern: true,
          isValidLength: true,
          isUniqueLocal: true,
        });
        setErrorMessage("");

        // Focus back to input
        inputRef.current?.focus();
      } catch (error: any) {
        console.error("Error creating participant:", error);

        // Handle specific error codes
        if (error.status === 409) {
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

    const validationMessage = getValidationMessage();
    const hasError = errorMessage || (nickname && !isValid());

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="nickname" className="text-sm font-medium">
            Dodaj uczestnika
          </Label>
          <span className="text-xs text-gray-500">Maksymalnie 10 uczestników</span>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1">
            <Input
              ref={ref || inputRef}
              id="nickname"
              type="text"
              placeholder="np. jan_kowalski"
              value={nickname}
              onChange={handleInputChange}
              disabled={disabled || isSubmitting}
              aria-invalid={hasError ? true : false}
              aria-describedby={hasError ? "nickname-error" : undefined}
              className={`h-12 text-base ${hasError ? "border-red-500 focus:border-red-500" : ""}`}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
          </div>

          <Button
            type="submit"
            disabled={disabled || !isValid() || isSubmitting}
            className="px-6 h-12 min-w-[120px] text-base"
          >
            {isSubmitting ? "Dodawanie..." : "Dodaj"}
          </Button>
        </form>

        {/* Live region for screen reader announcements */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {liveMessage}
        </div>

        {/* Validation/Error Messages */}
        {hasError && (
          <div id="nickname-error" className="text-sm text-red-600" role="alert" aria-live="polite">
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
    );
  }
);

ParticipantForm.displayName = "ParticipantForm";

export default ParticipantForm;
