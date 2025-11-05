/**
 * FormError Component
 * Displays validation errors with accessibility support
 */

interface FormErrorProps {
  id?: string;
  message?: string;
  role?: string;
}

export function FormError({ id, message, role = "alert" }: FormErrorProps) {
  if (!message) return null;

  return (
    <div id={id} role={role} aria-live="polite" className="text-sm text-red-600" data-testid="form-error">
      {message}
    </div>
  );
}
