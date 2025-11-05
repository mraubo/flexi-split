import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CountdownTimer } from "./CountdownTimer";

export interface RegistrationSuccessProps {
  /** Success message to display (can include instructions about email confirmation) */
  message: string;
  /** Whether email confirmation is required (202 Accepted) or auto-login (201 Created) */
  requiresEmailConfirmation: boolean;
  /** Optional countdown seconds - if provided, will show countdown and redirect when complete */
  countdownSeconds?: number;
  /** Callback when skip button is clicked */
  onSkip?: () => void;
}

/**
 * RegistrationSuccess Component
 *
 * Displays success message and handles two registration scenarios:
 * 1. Email confirmation required (202): Shows message, user must check email
 * 2. Auto-login (201): Shows countdown timer and skip button for immediate redirect
 *
 * @example
 * // With email confirmation
 * <RegistrationSuccess
 *   message="Rejestracja zakończona. Sprawdź swoją skrzynkę e-mail."
 *   requiresEmailConfirmation={true}
 * />
 *
 * // With auto-login and countdown
 * <RegistrationSuccess
 *   message="Rejestracja zakończona pomyślnie. Zostaniesz automatycznie przekierowany za "
 *   requiresEmailConfirmation={false}
 *   countdownSeconds={5}
 *   onSkip={() => window.location.href = '/settlements'}
 * />
 */
export function RegistrationSuccess({
  message,
  requiresEmailConfirmation,
  countdownSeconds = 5,
  onSkip,
}: RegistrationSuccessProps) {
  const [countdown, setCountdown] = useState(countdownSeconds);

  const handleSkip = () => {
    onSkip?.();
  };

  return (
    <div className="space-y-4">
      <Alert data-testid="alert-success">
        <AlertDescription>
          {message}
          {!requiresEmailConfirmation && countdown > 0 && (
            <CountdownTimer initialSeconds={countdown} onComplete={() => onSkip?.()} onCountdownChange={setCountdown} />
          )}
        </AlertDescription>
      </Alert>

      {!requiresEmailConfirmation && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Nie chcesz czekać? Przejdź od razu do swoich rozliczeń.</p>
          <Button onClick={handleSkip} variant="outline" size="sm" data-testid="button-skip-countdown">
            Przejdź do rozliczeń
          </Button>
        </div>
      )}
    </div>
  );
}
