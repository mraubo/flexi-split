/**
 * FormError Component
 * Displays validation errors with accessibility support
 */

interface FormErrorProps {
  id?: string;
  message?: string;
  role?: string;
  testId?: string;
}

export function FormError({ id, message, role = "alert", testId }: FormErrorProps) {
  if (!message) return null;

  return (
    <div id={id} role={role} aria-live="polite" className="text-sm text-red-600" data-testid={testId || "form-error"}>
      {message}
    </div>
  );
}
