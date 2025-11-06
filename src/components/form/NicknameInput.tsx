import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NicknameValidationState } from "@/components/hooks/useParticipantNickname";

export interface NicknameInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  validationMessage: string;
  errorMessage: string;
  validation?: NicknameValidationState;
  disabled?: boolean;
  isSubmitting?: boolean;
  placeholder?: string;
  label?: string;
  helperText?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  autoSelect?: boolean;
  className?: string;
  "data-testid"?: string;
}

/**
 * Reusable NicknameInput Component
 *
 * Handles display of nickname input field with validation feedback
 * Supports both create (ParticipantForm) and edit (EditParticipantModal) modes
 *
 * Props:
 * - id: HTML id for the input
 * - value: Current nickname value
 * - onChange: Callback when value changes
 * - validation: Validation state from useParticipantNickname hook
 * - validationMessage: Message from getValidationMessage()
 * - errorMessage: Custom error message (e.g., from API)
 * - disabled: Disable input
 * - isSubmitting: Show submitting state
 * - placeholder: Input placeholder text
 * - label: Label text (optional)
 * - helperText: Help text below input (optional)
 * - inputRef: Ref to input element
 * - autoFocus: Focus input on mount
 * - autoSelect: Select text on focus
 * - className: Additional CSS classes
 * - data-testid: Test ID for testing
 */
export const NicknameInput = React.forwardRef<HTMLInputElement, NicknameInputProps>(
  (
    {
      id,
      value,
      onChange,
      validationMessage,
      errorMessage,
      disabled = false,
      isSubmitting = false,
      placeholder = "np. jan_kowalski",
      label = "Nazwa uczestnika",
      helperText,
      autoSelect = false,
      className = "",
      "data-testid": dataTestid,
    },
    ref
  ) => {
    const hasError = errorMessage || (value && !validationMessage);
    const displayError = errorMessage || validationMessage;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (autoSelect) {
        e.target.select();
      }
    };

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={id} className="text-sm font-medium">
            {label}
          </Label>
        )}

        <Input
          ref={ref}
          id={id}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          disabled={disabled || isSubmitting}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
          aria-invalid={hasError ? true : false}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={`h-12 text-base ${hasError ? "border-red-500 focus:border-red-500" : ""} ${className}`}
          data-testid={dataTestid}
        />

        {/* Error/Validation Messages */}
        {hasError && (
          <div id={`${id}-error`} className="text-sm text-red-600" role="alert" aria-live="polite">
            {displayError}
          </div>
        )}

        {/* Helper Text */}
        {!hasError && !value && helperText && <p className="text-xs text-gray-500">{helperText}</p>}
      </div>
    );
  }
);

NicknameInput.displayName = "NicknameInput";
