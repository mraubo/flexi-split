import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RegisterSchema, type RegisterInput } from "@/lib/validation/auth";
import { getValidationErrorMessage } from "@/lib/errorMessages";

export default function RegisterForm() {
  const [formData, setFormData] = useState<RegisterInput>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  // Countdown timer effect
  useEffect(() => {
    if (redirectCountdown && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (redirectCountdown === 0) {
      setRedirectCountdown(null);
    }
  }, [redirectCountdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setFieldErrors({});
    setIsSuccess(false);
    setRedirectCountdown(null);

    // Validate form
    const result = RegisterSchema.safeParse(formData);
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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: result.data.email,
          password: result.data.password,
          confirmPassword: result.data.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400 || response.status === 422) {
          // Handle validation errors
          if (data.details && Array.isArray(data.details)) {
            const errors: Record<string, string> = {};
            data.details.forEach((detail: { field?: string; message?: string }) => {
              if (detail.field && detail.message) {
                errors[detail.field] = detail.message;
              }
            });
            setFieldErrors(errors);
          } else {
            setError(data.message || "Nieprawidłowe dane rejestracji");
          }
        } else if (response.status === 409) {
          setError("Konto z tym adresem e-mail już istnieje");
        } else if (response.status === 429) {
          setError("Zbyt wiele prób rejestracji. Spróbuj ponownie za chwilę.");
        } else {
          setError(data.message || "Wystąpił błąd podczas rejestracji");
        }
        return;
      }

      // Success - check if email confirmation is required
      if (response.status === 202) {
        setSuccessMessage(
          data.message || "Rejestracja zakończona pomyślnie. Sprawdź swoją skrzynkę e-mail i potwierdź konto."
        );
        setIsSuccess(true);
      } else if (response.status === 201) {
        setSuccessMessage("Rejestracja zakończona pomyślnie. Zostaniesz automatycznie przekierowany za ");
        setIsSuccess(true);
        setRedirectCountdown(5);
        // Redirect after 5 seconds
        setTimeout(() => {
          window.location.href = "/settlements";
        }, 5000);
      }
    } catch {
      setError("Wystąpił błąd połączenia. Spróbuj ponownie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof RegisterInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Zarejestruj się</h1>
        <p className="text-muted-foreground">Utwórz nowe konto, aby rozpocząć rozliczanie wydatków</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <AlertDescription>
            {successMessage}
            {redirectCountdown !== null && <span className="font-semibold">{redirectCountdown}</span>}
          </AlertDescription>
        </Alert>
      )}

      {isSuccess && redirectCountdown !== null && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Nie chcesz czekać? Przejdź od razu do swoich rozliczeń.</p>
          <Button onClick={() => (window.location.href = "/settlements")} variant="outline" size="sm">
            Przejdź do rozliczeń
          </Button>
        </div>
      )}

      {!isSuccess && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Adres e-mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange("email")}
              placeholder="twoj@email.com"
              disabled={isSubmitting}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
            />
            {fieldErrors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Hasło</Label>
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
            <Label htmlFor="confirmPassword">Potwierdź hasło</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange("confirmPassword")}
              placeholder="Powtórz hasło"
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
            {isSubmitting ? "Rejestrowanie..." : "Zarejestruj się"}
          </Button>
        </form>
      )}

      {!isSuccess && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Masz już konto?{" "}
            <a href="/auth/login" className="text-primary hover:underline">
              Zaloguj się
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
