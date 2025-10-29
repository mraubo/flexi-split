import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ResetPasswordSchema, type ResetPasswordInput } from "@/lib/validation/auth";
import { getValidationErrorMessage } from "@/lib/errorMessages";

export default function ResetPasswordForm() {
  const [formData, setFormData] = useState<ResetPasswordInput>({
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    // Validate form
    const result = ResetPasswordSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path.length > 0) {
          const field = issue.path[0] as string;
          errors[field] = getValidationErrorMessage(field, result.error) || issue.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: result.data.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400 || response.status === 422) {
          // Handle validation errors
          if (data.details && Array.isArray(data.details)) {
            const errors: Record<string, string> = {};
            data.details.forEach((detail: { field: string; message: string }) => {
              if (detail.field && detail.message) {
                errors[detail.field] = detail.message;
              }
            });
            setFieldErrors(errors);
          } else {
            setError(data.message || "Nieprawidłowe dane");
          }
        } else if (response.status === 401) {
          setError("Link resetowania jest nieprawidłowy lub wygasł");
        } else if (response.status === 429) {
          setError("Zbyt wiele prób resetowania hasła. Spróbuj ponownie za chwilę.");
        } else if (response.status === 501) {
          setError("Funkcjonalność resetowania hasła nie jest jeszcze dostępna. Skontaktuj się z administratorem.");
        } else {
          setError(data.message || "Wystąpił błąd podczas resetowania hasła");
        }
        return;
      }

      // Success
      setSuccessMessage(data.message || "Hasło zostało pomyślnie zmienione. Możesz się teraz zalogować.");
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 2000);
    } catch {
      setError("Wystąpił błąd połączenia. Spróbuj ponownie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ResetPasswordInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Ustaw nowe hasło</h1>
        <p className="text-muted-foreground">Wprowadź nowe hasło dla swojego konta</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">Nowe hasło</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange("password")}
            placeholder="Minimum 8 znaków z literami i cyframi"
            disabled={isSubmitting}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
          />
          {fieldErrors.password && (
            <p id="password-error" className="text-sm text-destructive">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Potwierdź nowe hasło</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange("confirmPassword")}
            placeholder="Powtórz nowe hasło"
            disabled={isSubmitting}
            aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
          />
          {fieldErrors.confirmPassword && (
            <p id="confirmPassword-error" className="text-sm text-destructive">
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Ustawianie hasła..." : "Ustaw nowe hasło"}
        </Button>
      </form>

      <div className="text-center">
        <a href="/auth/login" className="text-sm text-primary hover:underline">
          Powrót do logowania
        </a>
      </div>
    </div>
  );
}
