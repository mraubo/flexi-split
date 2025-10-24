import type { ErrorPageConfig } from "@/components/ErrorPage";
import { getPageErrorMessage, getPageErrorDescription } from "./errorMessages";

export function getErrorConfig(statusCode: number): ErrorPageConfig {
  const baseConfig = {
    statusCode,
    message: getPageErrorMessage(statusCode),
    description: getPageErrorDescription(statusCode),
  };

  switch (statusCode) {
    case 401:
      return {
        ...baseConfig,
        title: "Sesja wygasła",
        showLoginButton: true,
        showCountdown: true,
        countdownSeconds: 30,
        showBackButton: false,
        showRefreshButton: false,
      };

    case 403:
      return {
        ...baseConfig,
        title: "Brak dostępu",
        showLoginButton: false,
        showBackButton: true,
        showRefreshButton: false,
        showCountdown: false,
      };

    case 404:
      return {
        ...baseConfig,
        title: "Nie znaleziono",
        showLoginButton: false,
        showBackButton: true,
        showRefreshButton: false,
        showCountdown: false,
      };

    default:
      return {
        ...baseConfig,
        title: "Wystąpił błąd",
        showLoginButton: false,
        showBackButton: true,
        showRefreshButton: true,
        showCountdown: false,
      };
  }
}

export function getIntendedPath(): string | undefined {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("intendedPath") || undefined;
  }
  return undefined;
}

export function saveIntendedPath(path: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("intendedPath", path);
  }
}

export function clearIntendedPath(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("intendedPath");
  }
}
