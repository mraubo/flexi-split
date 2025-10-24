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

export function getValidationErrorMessage(field: string, error: unknown): string {
  if (error && typeof error === "object" && "issues" in error) {
    const errorWithIssues = error as { issues?: unknown[] };
    if (Array.isArray(errorWithIssues.issues)) {
      const fieldError = errorWithIssues.issues.find((issue: unknown) => {
        return (
          issue &&
          typeof issue === "object" &&
          "path" in issue &&
          Array.isArray((issue as { path?: unknown }).path) &&
          (issue as { path?: unknown[] }).path?.includes(field)
        );
      });
      if (
        fieldError &&
        typeof fieldError === "object" &&
        "message" in fieldError &&
        typeof (fieldError as { message: unknown }).message === "string"
      ) {
        return (fieldError as { message: string }).message;
      }
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

export function getPageErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return "Żądanie zawiera nieprawidłowe dane.";
    case 401:
      return "Wymagane jest zalogowanie się, aby uzyskać dostęp do tej strony.";
    case 403:
      return "Nie masz uprawnień do wyświetlenia tej strony.";
    case 404:
      return "Strona, której szukasz, nie została znaleziona.";
    case 429:
      return "Wykonałeś zbyt wiele żądań. Spróbuj ponownie za chwilę.";
    case 500:
      return "Wystąpił błąd serwera. Spróbuj ponownie później.";
    case 502:
      return "Błąd połączenia z serwerem. Spróbuj ponownie.";
    case 503:
      return "Serwis jest tymczasowo niedostępny. Spróbuj ponownie później.";
    default:
      return "Wystąpił nieoczekiwany błąd.";
  }
}

export function getPageErrorDescription(statusCode: number): string {
  switch (statusCode) {
    case 401:
      return "Twoja sesja mogła wygasnąć lub nie jesteś zalogowany. Zaloguj się ponownie, aby kontynuować.";
    case 403:
      return "Możesz nie mieć wystarczających uprawnień lub zasób może być prywatny.";
    case 404:
      return "Sprawdź czy adres URL jest poprawny lub wróć do strony głównej.";
    case 429:
      return "Serwer chroni się przed nadmiernym ruchem. Odczekaj chwilę przed ponowną próbą.";
    case 500:
      return "To nie Twoja wina - problem leży po stronie serwera. Spróbuj odświeżyć stronę za chwilę.";
    case 502:
    case 503:
      return "Serwis może być w trakcie konserwacji lub doświadczamy tymczasowych problemów technicznych.";
    default:
      return "Jeśli problem będzie się powtarzał, skontaktuj się z administratorem.";
  }
}
