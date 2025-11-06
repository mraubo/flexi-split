import { useState, useCallback } from "react";
import { validateNickname, validateNicknameUniqueness, generateNicknameSuggestion } from "@/lib/utils/validators";

/**
 * Validation state for nickname input
 */
interface NicknameValidationState {
  isValidPattern: boolean;
  isValidLength: boolean;
  isUniqueLocal: boolean;
  conflictRemote?: boolean;
  suggestion?: string;
}

/**
 * Hook for nickname validation with pattern, length, and uniqueness checks
 * Handles both local and remote validation
 *
 * Usage:
 * const { validation, updateValidation, isValid, getValidationMessage } = useNicknameValidation(
 *   existingNicknames,
 *   currentNickname
 * );
 */
export function useNicknameValidation(existingNicknames: string[], currentNickname?: string) {
  const [validation, setValidation] = useState<NicknameValidationState>({
    isValidPattern: true,
    isValidLength: true,
    isUniqueLocal: true,
  });

  /**
   * Update validation state based on input value
   */
  const updateValidation = useCallback(
    (value: string) => {
      // Validate pattern and length
      const patternValidation = validateNickname(value);
      const isValidPattern = patternValidation.valid;
      const isValidLength = patternValidation.valid; // If pattern passes, length is OK

      // Validate uniqueness
      const uniquenessValidation = validateNicknameUniqueness(value, existingNicknames, currentNickname);
      const isUniqueLocal = uniquenessValidation.unique;

      setValidation({
        isValidPattern,
        isValidLength,
        isUniqueLocal,
        conflictRemote: false,
        suggestion: uniquenessValidation.suggestion,
      });
    },
    [existingNicknames, currentNickname]
  );

  /**
   * Get human-readable validation message
   */
  const getValidationMessage = useCallback(
    (value: string): string => {
      if (!value) return "";

      const patternValidation = validateNickname(value);
      if (!patternValidation.valid) {
        return patternValidation.error || "";
      }

      const uniquenessValidation = validateNicknameUniqueness(value, existingNicknames, currentNickname);
      if (!uniquenessValidation.unique) {
        return `Nazwa "${value}" jest już używana. Spróbuj "${uniquenessValidation.suggestion}".`;
      }

      if (validation.conflictRemote && validation.suggestion) {
        return `Nazwa "${value}" jest już używana. Spróbuj "${validation.suggestion}".`;
      }

      return "";
    },
    [existingNicknames, currentNickname, validation.conflictRemote, validation.suggestion]
  );

  /**
   * Check if value is valid
   */
  const isValid = useCallback(
    (value: string): boolean => {
      return (
        value.length > 0 &&
        validation.isValidPattern &&
        validation.isValidLength &&
        validation.isUniqueLocal &&
        !validation.conflictRemote &&
        value !== currentNickname // Must be different from current
      );
    },
    [validation, currentNickname]
  );

  /**
   * Handle remote validation error (e.g., 409 Conflict)
   * Updates validation with suggestion
   */
  const handleRemoteConflict = useCallback(
    (value: string) => {
      const suggestion = generateNicknameSuggestion(value, existingNicknames);
      setValidation((prev) => ({
        ...prev,
        conflictRemote: true,
        suggestion,
      }));
    },
    [existingNicknames]
  );

  /**
   * Clear remote conflict flag
   */
  const clearRemoteConflict = useCallback(() => {
    setValidation((prev) => ({
      ...prev,
      conflictRemote: false,
    }));
  }, []);

  /**
   * Reset validation to initial state
   */
  const reset = useCallback(() => {
    setValidation({
      isValidPattern: true,
      isValidLength: true,
      isUniqueLocal: true,
    });
  }, []);

  return {
    validation,
    updateValidation,
    getValidationMessage,
    isValid,
    handleRemoteConflict,
    clearRemoteConflict,
    reset,
  };
}
