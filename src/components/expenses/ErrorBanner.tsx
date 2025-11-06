import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type { ApiError } from "@/types";

export interface ErrorBannerProps {
  error?: ApiError | string | null;
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  if (!error) return null;

  const getErrorMessage = (error: ApiError | string): string => {
    if (typeof error === "string") {
      return error;
    }

    // Map API error codes to user-friendly Polish messages
    switch (error.code) {
      case "unauthorized":
        return "Wymagane jest zalogowanie się do systemu.";
      case "forbidden":
        return "Nie masz uprawnień do wykonania tej akcji.";
      case "not_found":
        return "Rozliczenie lub wydatek nie został znaleziony.";
      case "settlement_closed":
        return "Nie można modyfikować wydatków w zamkniętym rozliczeniu.";
      case "invalid_payer":
        return "Wybrany płacący nie istnieje w rozliczeniu.";
      case "invalid_participants":
        return "Niektórzy wybrani uczestnicy nie istnieją w rozliczeniu.";
      case "validation_error":
        return "Wprowadzone dane są nieprawidłowe. Sprawdź wszystkie pola formularza.";
      case "invalid_json":
        return "Wystąpił błąd podczas przetwarzania danych.";
      case "invalid_uuid":
        return "Nieprawidłowy format identyfikatora.";
      default:
        return error.message || "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.";
    }
  };

  const message = getErrorMessage(error);

  return (
    <Alert variant="destructive" role="alert" aria-live="assertive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
