import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoginSchema, type LoginInput } from "@/lib/validation/auth";
import { getValidationErrorMessage } from "@/lib/errorMessages";

export default function LoginForm() {
  const [formData, setFormData] = useState<LoginInput>({
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Validate form
    const result = LoginSchema.safeParse(formData);
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
      const response = await fetch("/api/auth/login", {
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
            setError(data.message || "Nieprawidłowe dane logowania");
          }
        } else if (response.status === 401) {
          setError("Nieprawidłowy adres e-mail lub hasło");
        } else if (response.status === 429) {
          setError("Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.");
        } else {
          setError(data.message || "Wystąpił błąd podczas logowania");
        }
        return;
      }

      // Success - redirect to settlements
      window.location.href = "/settlements";
    } catch {
      setError("Wystąpił błąd połączenia. Spróbuj ponownie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof LoginInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Zaloguj się</h1>
        <p className="text-muted-foreground">Wprowadź swoje dane, aby uzyskać dostęp do rozliczeń</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-login">
        {error && (
          <Alert variant="destructive" data-testid="alert-error">
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
            data-testid="input-email"
          />
          {fieldErrors.email && (
            <p id="email-error" className="text-sm text-destructive" data-testid="error-email">
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
            placeholder="Wprowadź hasło"
            disabled={isSubmitting}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
            data-testid="input-password"
          />
          {fieldErrors.password && (
            <p id="password-error" className="text-sm text-destructive" data-testid="error-password">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="button-submit">
          {isSubmitting ? "Logowanie..." : "Zaloguj się"}
        </Button>
      </form>

      <div className="text-center space-y-2">
        <a href="/auth/forgot-password" className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
          Zapomniałeś hasła?
        </a>
        <p className="text-sm text-muted-foreground">
          Nie masz konta?{" "}
          <a href="/auth/register" className="text-primary hover:underline" data-testid="link-register">
            Zarejestruj się
          </a>
        </p>
      </div>
    </div>
  );
}
