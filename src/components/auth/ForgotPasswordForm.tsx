import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ForgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validation/auth";
import { getValidationErrorMessage } from "@/lib/errorMessages";

export default function ForgotPasswordForm() {
  const [formData, setFormData] = useState<ForgotPasswordInput>({
    email: "",
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
    const result = ForgotPasswordSchema.safeParse(formData);
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
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result.data),
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
            setError(data.message || "Nieprawidłowy adres e-mail");
          }
        } else if (response.status === 429) {
          setError("Zbyt wiele prób resetowania hasła. Spróbuj ponownie za chwilę.");
        } else {
          setError(data.message || "Wystąpił błąd podczas wysyłania linku resetowania");
        }
        return;
      }

      // Success - show neutral message regardless of whether email exists
      setSuccessMessage(
        "Jeśli podany adres e-mail istnieje w systemie, otrzymasz wiadomość z linkiem do resetowania hasła."
      );
    } catch {
      setError("Wystąpił błąd połączenia. Spróbuj ponownie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ForgotPasswordInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Resetowanie hasła</h1>
        {!successMessage && (
          <p className="text-muted-foreground">Wprowadź swój adres e-mail, aby otrzymać link do resetowania hasła</p>
        )}
      </div>

      {successMessage ? (
        // Success state - show only success message and navigation links
        <>
          <Alert>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>

          <div className="text-center space-y-2">
            <a href="/auth/login" className="text-sm text-primary hover:underline">
              Powrót do logowania
            </a>
            <p className="text-sm text-muted-foreground">
              Nie masz konta?{" "}
              <a href="/auth/register" className="text-sm text-primary hover:underline">
                Zarejestruj się
              </a>
            </p>
          </div>
        </>
      ) : (
        // Form state - show the form
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Wysyłanie..." : "Wyślij link resetowania"}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <a href="/auth/login" className="text-sm text-primary hover:underline">
              Powrót do logowania
            </a>
            <p className="text-sm text-muted-foreground">
              Nie masz konta?{" "}
              <a href="/auth/register" className="text-sm text-primary hover:underline">
                Zarejestruj się
              </a>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
