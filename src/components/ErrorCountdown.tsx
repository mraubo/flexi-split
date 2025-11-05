import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface ErrorCountdownProps {
  initialSeconds: number;
  onCountdownComplete: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
}

export function ErrorCountdown({
  initialSeconds,
  onCountdownComplete,
  onCancel,
  cancelLabel = "Anuluj",
}: ErrorCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onCountdownComplete();
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft(secondsLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft, onCountdownComplete]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <div className="text-sm text-muted-foreground mb-1">Automatyczne przekierowanie za:</div>
        <div className="text-2xl font-mono font-bold">{formatTime(secondsLeft)}</div>
      </div>
      {onCancel && (
        <Button variant="outline" size="sm" onClick={onCancel} className="shrink-0">
          {cancelLabel}
        </Button>
      )}
    </div>
  );
}
