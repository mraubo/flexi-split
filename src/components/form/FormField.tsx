/**
 * FormField Component
 * Combines label, input, and error message for consistent form field UI
 * Works with any input element
 */

import React from "react";
import { FormLabel } from "./FormLabel";
import { FormError } from "./FormError";

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  helpText?: string;
  children: React.ReactNode;
}

export function FormField({ id, label, error, required = false, helpText, children }: FormFieldProps) {
  const childProps: Record<string, unknown> = {
    "aria-invalid": !!error,
    "aria-describedby": error ? `${id}-error` : undefined,
  };

  return (
    <div className="space-y-2">
      <FormLabel id={id} label={label} required={required} helpText={helpText} />

      <div className="relative">{React.cloneElement(children as React.ReactElement, childProps)}</div>

      <FormError id={`${id}-error`} message={error} testId={`error-${id}`} />
    </div>
  );
}
