import { useRef, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NicknameInput } from "@/components/form/NicknameInput";
import { useParticipantNickname } from "@/components/hooks/useParticipantNickname";
import { getParticipantErrorMessage } from "@/lib/errorMessages";
import type { CreateParticipantCommand, ParticipantDTO } from "@/types";

interface ParticipantFormProps {
  onCreated: (participant: ParticipantDTO) => void;
  disabled: boolean;
  existingNicknames: string[];
  addParticipant: (command: CreateParticipantCommand) => Promise<ParticipantDTO>;
}

const ParticipantForm = forwardRef<HTMLInputElement, ParticipantFormProps>(
  ({ onCreated, disabled, existingNicknames, addParticipant }: ParticipantFormProps, ref) => {
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

        // Reset form
        reset();

        // Focus back to input
        const inputElement = typeof ref === "function" ? inputRef.current : ref?.current;
        inputElement?.focus();
      } catch (error: unknown) {
        // Handle specific error codes
        const err = error as { status?: number };
        if (err.status === 409) {
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
          const apiError = error as { status?: number };
          setErrorMessage(getParticipantErrorMessage(apiError));
        }
      } finally {
        setIsSubmitting(false);
      }
    };

    const validationMessage = getValidationMessage();

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="nickname" className="text-sm font-medium">
            Dodaj uczestnika
          </Label>
          <span className="text-xs text-gray-500">Maksymalnie 10 uczestników</span>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-3" data-testid="form-participant">
          <div className="flex-1">
            <NicknameInput
              ref={ref || inputRef}
              id="nickname"
              value={nickname}
              onChange={handleInputChange}
              validation={validation}
              validationMessage={validationMessage}
              errorMessage={errorMessage}
              disabled={disabled}
              isSubmitting={isSubmitting}
              placeholder="np. jan_kowalski"
              label={undefined}
              helperText="Nazwa musi mieć 3-30 znaków i może zawierać małe litery, cyfry, podkreślenia oraz myślniki."
              data-testid="input-nickname"
            />
          </div>

          <Button
            type="submit"
            disabled={disabled || !isValid() || isSubmitting}
            className="px-6 h-12 min-w-[120px] text-base"
            data-testid="button-add-participant"
          >
            {isSubmitting ? "Dodawanie..." : "Dodaj"}
          </Button>
        </form>
      </div>
    );
  }
);

ParticipantForm.displayName = "ParticipantForm";

export default ParticipantForm;
