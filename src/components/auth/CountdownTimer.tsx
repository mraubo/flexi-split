import React, { useState, useEffect } from "react";

export interface CountdownTimerProps {
  initialSeconds: number;
  onComplete: () => void;
  onCountdownChange?: (seconds: number) => void;
}

/**
 * CountdownTimer Component
 *
 * Displays a countdown timer that executes a callback when it reaches zero.
 * Used after successful registration to redirect to settlements page.
 *
 * @example
 * <CountdownTimer
 *   initialSeconds={5}
 *   onComplete={() => window.location.href = '/settlements'}
 *   onCountdownChange={(seconds) => setCountdown(seconds)}
 * />
 */
export function CountdownTimer({ initialSeconds, onComplete, onCountdownChange }: CountdownTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (secondsRemaining > 0) {
      const timer = setTimeout(() => {
        const newCount = secondsRemaining - 1;
        setSecondsRemaining(newCount);
        onCountdownChange?.(newCount);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (secondsRemaining === 0) {
      // Execute callback when countdown reaches zero
      onComplete();
    }
  }, [secondsRemaining, onComplete, onCountdownChange]);

  return <span className="font-semibold">{secondsRemaining}</span>;
}
