import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReadOnlyBannerProps {
  isVisible: boolean;
  onDismiss?: () => void;
}

export default function ReadOnlyBanner({ isVisible, onDismiss }: ReadOnlyBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isVisible || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">Rozliczenie jest zamknięte</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>To rozliczenie zostało zamknięte i nie można już wprowadzać zmian.</p>
          </div>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="inline-flex text-yellow-800 hover:bg-yellow-100 hover:text-yellow-900 focus:ring-yellow-600"
                aria-label="Zamknij powiadomienie"
              >
                <span className="sr-only">Zamknij</span>
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
