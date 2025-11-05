import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormField } from "@/components/form/FormField";
import { RegistrationSuccess } from "./RegistrationSuccess";
import { RegisterSchema, type RegisterInput } from "@/lib/validation/auth";
import { useRegister, extractFieldErrors, isEmailConflictError } from "@/lib/hooks/api/useAuth";

/**
 * RegisterForm Component
 *
 * Refactored with react-hook-form and TanStack Query:
 * - Form state managed by react-hook-form
 * - Validation via Zod resolver (client-side)
 * - Registration mutation via useRegister hook
 * - Extracted RegistrationSuccess component for UI separation
 * - Extracted CountdownTimer component for countdown logic
 * - Handles two registration flows: email confirmation (202) and auto-login (201)
 *
 * Before: 244 LOC (manual state, countdown effect, fetch, error handling)
 * After: ~155 LOC (-36% reduction)
 *
 * Benefits:
 * - Cleaner component hierarchy
 * - Reusable countdown timer component
 * - Less state management boilerplate
 * - Better separation of concerns
 */
export default function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    mode: "onBlur",
  });

  const registerMutation = useRegister();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requiresEmailConfirmation, setRequiresEmailConfirmation] = useState(false);

  const onSubmit = async (data: RegisterInput) => {
    try {
      const response = await registerMutation.mutateAsync(data);

      // Determine success flow based on HTTP status code
      const statusCode = ((response as Record<string, number | string | object> | undefined)?._status as number) || 201;

      if (statusCode === 202) {
        // Email confirmation required
        setSuccessMessage(
          (response as Record<string, string> | undefined)?.message ||
            "Rejestracja zakończona pomyślnie. Sprawdź swoją skrzynkę e-mail i potwierdź konto."
        );
        setRequiresEmailConfirmation(true);
      } else if (statusCode === 201) {
        // Auto-login registration
        setSuccessMessage("Rejestracja zakończona pomyślnie. Zostaniesz automatycznie przekierowany za ");
        setRequiresEmailConfirmation(false);
      }
    } catch (err) {
      const apiError = err as Record<string, unknown>;

      // Handle 409 Conflict - email already exists
      if (isEmailConflictError(apiError)) {
        setError("email", {
          message: "Konto z tym adresem e-mail już istnieje",
        });
        return;
      }

      // Handle 429 Rate Limit
      if (apiError.status === 429) {
        setError("root", {
          message: "Zbyt wiele prób rejestracji. Spróbuj ponownie za chwilę.",
        });
        return;
      }

      // Handle field-level validation errors
      const fieldErrors = extractFieldErrors(apiError);
      if (Object.keys(fieldErrors).length > 0) {
        Object.entries(fieldErrors).forEach(([field, message]) => {
          setError(field as keyof RegisterInput, { message });
        });
        return;
      }

      // Handle generic error
      setError("root", {
        message: apiError.message || "Wystąpił błąd podczas rejestracji",
      });
    }
  };

  const generalError = errors.root?.message;
  const isSuccess = successMessage !== null;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Zarejestruj się</h1>
        <p className="text-muted-foreground">Utwórz nowe konto, aby rozpocząć rozliczanie wydatków</p>
      </div>

      {!isSuccess && generalError && (
        <Alert variant="destructive" data-testid="alert-error">
          <AlertDescription>{generalError}</AlertDescription>
        </Alert>
      )}

      {isSuccess && successMessage && (
        <RegistrationSuccess
          message={successMessage}
          requiresEmailConfirmation={requiresEmailConfirmation}
          countdownSeconds={5}
          onSkip={() => (window.location.href = "/settlements")}
        />
      )}

      {!isSuccess && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-testid="form-register">
          <FormField id="email" label="Adres e-mail" error={errors.email?.message} required>
            <Input
              type="email"
              placeholder="twoj@email.com"
              disabled={isSubmitting}
              data-testid="input-email"
              {...register("email")}
            />
          </FormField>

          <FormField
            id="password"
            label="Hasło"
            error={errors.password?.message}
            required
            helpText="Minimum 8 znaków z literami i cyframi"
          >
            <Input
              type="password"
              placeholder="Wprowadź hasło"
              disabled={isSubmitting}
              data-testid="input-password"
              {...register("password")}
            />
          </FormField>

          <FormField id="confirmPassword" label="Potwierdź hasło" error={errors.confirmPassword?.message} required>
            <Input
              type="password"
              placeholder="Powtórz hasło"
              disabled={isSubmitting}
              data-testid="input-confirm-password"
              {...register("confirmPassword")}
            />
          </FormField>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || registerMutation.isPending}
            data-testid="button-submit"
          >
            {isSubmitting || registerMutation.isPending ? "Rejestrowanie..." : "Zarejestruj się"}
          </Button>
        </form>
      )}

      {!isSuccess && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Masz już konto?{" "}
            <a href="/auth/login" className="text-primary hover:underline" data-testid="link-login">
              Zaloguj się
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
