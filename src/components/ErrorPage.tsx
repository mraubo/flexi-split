import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw, ArrowLeft, LogIn } from "lucide-react";
import { ErrorCountdown } from "./ErrorCountdown";

export interface ErrorPageConfig {
  statusCode: number;
  title: string;
  message: string;
  description?: string;
  showLoginButton?: boolean;
  showBackButton?: boolean;
  showRefreshButton?: boolean;
  showCountdown?: boolean;
  countdownSeconds?: number;
  redirectUrl?: string;
  redirectDelay?: number;
}

interface ErrorPageProps {
  config: ErrorPageConfig;
  intendedPath?: string;
}

export function ErrorPage({ config, intendedPath }: ErrorPageProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Save intended path for after login
  useEffect(() => {
    if (intendedPath && config.statusCode === 401) {
      sessionStorage.setItem("intendedPath", intendedPath);
    }
  }, [intendedPath, config.statusCode]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key for back navigation
      if (event.key === "Escape" && config.showBackButton) {
        handleBack();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [config.showBackButton]);

  const handleLogin = () => {
    setIsRedirecting(true);
    // In a real implementation, this would redirect to auth
    // For now, just redirect to home
    window.location.href = "/";
  };

  const handleBack = () => {
    window.history.back();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleCountdownComplete = () => {
    if (config.redirectUrl) {
      window.location.href = config.redirectUrl;
    } else if (config.statusCode === 401) {
      handleLogin();
    } else {
      handleBack();
    }
  };

  const handleCountdownCancel = () => {
    // Just stop the countdown, don't do anything else
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto" role="main" aria-labelledby="error-title">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle id="error-title" className="text-2xl font-bold text-destructive">
            {config.title}
          </CardTitle>
          <div className="text-sm text-muted-foreground font-medium">Błąd {config.statusCode}</div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">{config.message}</p>
            {config.description && <p className="text-muted-foreground text-sm">{config.description}</p>}
          </div>

          {config.showCountdown && config.countdownSeconds && (
            <div className="flex justify-center">
              <ErrorCountdown
                initialSeconds={config.countdownSeconds}
                onCountdownComplete={handleCountdownComplete}
                onCancel={handleCountdownCancel}
                cancelLabel="Zatrzymaj odliczanie"
              />
            </div>
          )}

          <div className="flex flex-col gap-3">
            {config.showLoginButton && (
              <Button
                onClick={handleLogin}
                disabled={isRedirecting}
                className="w-full gap-2"
                aria-describedby="login-description"
              >
                <LogIn className="h-4 w-4" />
                {isRedirecting ? "Przekierowywanie..." : "Zaloguj się ponownie"}
              </Button>
            )}

            {config.showBackButton && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="w-full gap-2"
                aria-describedby="back-description"
              >
                <ArrowLeft className="h-4 w-4" />
                Powrót
              </Button>
            )}

            {config.showRefreshButton && (
              <Button
                variant="outline"
                onClick={handleRefresh}
                className="w-full gap-2"
                aria-describedby="refresh-description"
              >
                <RefreshCw className="h-4 w-4" />
                Odśwież stronę
              </Button>
            )}
          </div>

          {/* Hidden descriptions for screen readers */}
          <div className="sr-only">
            {config.showLoginButton && (
              <div id="login-description">
                Przekieruje do strony logowania. Po zalogowaniu zostaniesz przekierowany z powrotem do tej strony.
              </div>
            )}
            {config.showBackButton && (
              <div id="back-description">
                Powróci do poprzedniej strony w historii przeglądarki. Możesz również nacisnąć klawisz Escape.
              </div>
            )}
            {config.showRefreshButton && <div id="refresh-description">Przeładuje bieżącą stronę.</div>}
          </div>

          {/* Live region for dynamic content updates */}
          <div aria-live="assertive" aria-atomic="true" className="sr-only">
            {isRedirecting && "Przekierowywanie do strony logowania..."}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
