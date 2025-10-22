// Error message utilities for Polish translations

export interface ApiError {
  status: number;
  code?: string;
  message?: string;
  details?: unknown;
}

export function getParticipantErrorMessage(error: ApiError): string {
  switch (error.status) {
    case 400:
      return "Nieprawidłowe dane. Sprawdź wprowadzone informacje.";
    case 401:
      return "Brak autoryzacji. Zaloguj się ponownie.";
    case 403:
      return "Brak uprawnień do wykonania tej operacji.";
    case 404:
      return "Uczestnik nie został znaleziony.";
    case 409:
      return "Nazwa uczestnika jest już używana w tym rozliczeniu.";
    case 422:
      if (error.message?.includes("settlement is closed")) {
        return "Nie można modyfikować uczestników zamkniętego rozliczenia.";
      }
      if (error.message?.includes("maximum participant limit")) {
        return "Osiągnięto maksymalną liczbę uczestników (10).";
      }
      if (error.message?.includes("associated expenses")) {
        return "Nie można usunąć uczestnika, który ma powiązane wydatki.";
      }
      return "Operacja nie może zostać wykonana z powodu reguł biznesowych.";
    case 500:
      return "Wystąpił błąd serwera. Spróbuj ponownie później.";
    default:
      return error.message || "Wystąpił nieoczekiwany błąd.";
  }
}

export function getSettlementErrorMessage(error: ApiError): string {
  switch (error.status) {
    case 400:
      return "Nieprawidłowe dane. Sprawdź wprowadzone informacje.";
    case 401:
      return "Brak autoryzacji. Zaloguj się ponownie.";
    case 403:
      return "Brak dostępu do tego rozliczenia.";
    case 404:
      return "Rozliczenie nie zostało znalezione.";
    case 422:
      return "Rozliczenie jest w nieprawidłowym stanie.";
    case 500:
      return "Wystąpił błąd serwera. Spróbuj ponownie później.";
    default:
      return error.message || "Wystąpił nieoczekiwany błąd.";
  }
}

export function getValidationErrorMessage(field: string, error: any): string {
  if (error?.issues && Array.isArray(error.issues)) {
    const fieldError = error.issues.find((issue: any) => issue.path?.includes(field));
    if (fieldError) {
      return fieldError.message;
    }
  }

  // Fallback messages based on field
  switch (field) {
    case "nickname":
      return "Nieprawidłowa nazwa uczestnika.";
    case "title":
      return "Nieprawidłowy tytuł rozliczenia.";
    default:
      return "Nieprawidłowe dane.";
  }
}
