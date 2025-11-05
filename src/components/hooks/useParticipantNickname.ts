import { useState, useCallback } from "react";

export interface NicknameValidationState {
  isValidPattern: boolean;
  isValidLength: boolean;
  isUniqueLocal: boolean;
  conflictRemote?: boolean;
  suggestion?: string;
}

export interface UseParticipantNicknameResult {
  nickname: string;
  setNickname: (value: string) => void;
  validation: NicknameValidationState;
  errorMessage: string;
  setErrorMessage: (message: string) => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  updateValidation: (value: string) => void;
  getValidationMessage: () => string;
  isValid: () => boolean;
  reset: () => void;
  handleRemoteConflict: (suggestion: string) => void;
}

/**
 * Hook for managing participant nickname validation
 * Handles pattern, length, and uniqueness validation with remote conflict detection
 *
 * @param existingNicknames - List of nicknames to check uniqueness against
 * @param currentNickname - Current nickname (for edit mode, excluded from uniqueness check)
 */
export function useParticipantNickname(
  existingNicknames: string[],
  currentNickname?: string
): UseParticipantNicknameResult {
  const [nickname, setNickname] = useState(currentNickname || "");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validation, setValidation] = useState<NicknameValidationState>({
    isValidPattern: true,
    isValidLength: true,
    isUniqueLocal: true,
  });

  const validatePattern = useCallback((value: string): boolean => {
    const pattern = /^[a-z0-9_-]+$/;
    return pattern.test(value);
  }, []);

  const validateLength = useCallback((value: string): boolean => {
    return value.length >= 3 && value.length <= 30;
  }, []);

  const validateLocalUniqueness = useCallback(
    (value: string): boolean => {
      // Case-insensitive uniqueness check
      // Exclude current nickname if in edit mode
      return !existingNicknames.some(
        (existing) =>
          existing.toLowerCase() === value.toLowerCase() &&
          (!currentNickname || existing.toLowerCase() !== currentNickname.toLowerCase())
      );
    },
    [existingNicknames, currentNickname]
  );

  const generateSuggestion = useCallback(
    (value: string): string => {
      const base = value.toLowerCase();
      let suffix = 1;
      let suggestion = `${base}${suffix}`;

      while (
        existingNicknames.some(
          (existing) =>
            existing.toLowerCase() === suggestion.toLowerCase() &&
            (!currentNickname || existing.toLowerCase() !== currentNickname.toLowerCase())
        )
      ) {
        suffix++;
        suggestion = `${base}${suffix}`;
      }

      return suggestion;
    },
    [existingNicknames, currentNickname]
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
    [generateSuggestion, validateLocalUniqueness, validatePattern, validateLength]
  );

  const getValidationMessage = useCallback((): string => {
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
  }, [nickname, validation]);

  const isValid = useCallback((): boolean => {
    // Must have content
    if (nickname.length === 0) return false;

    // All validation checks must pass
    if (!validation.isValidPattern || !validation.isValidLength || !validation.isUniqueLocal) {
      return false;
    }

    // No remote conflicts
    if (validation.conflictRemote) return false;

    // In edit mode, must be different from current
    if (currentNickname && nickname === currentNickname) return false;

    return true;
  }, [nickname, validation, currentNickname]);

  const reset = useCallback(() => {
    setNickname(currentNickname || "");
    setErrorMessage("");
    setValidation({
      isValidPattern: true,
      isValidLength: true,
      isUniqueLocal: true,
    });
  }, [currentNickname]);

  const handleRemoteConflict = useCallback(
    (suggestion: string) => {
      setValidation((prev) => ({
        ...prev,
        conflictRemote: true,
        suggestion,
      }));
      setErrorMessage(`Nazwa "${nickname}" jest już używana. Spróbuj "${suggestion}".`);
    },
    [nickname]
  );

  return {
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
  };
}
