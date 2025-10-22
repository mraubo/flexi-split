import { useState, useEffect, useCallback } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number; // in milliseconds, default 5000
}

interface ToastCenterProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
}

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles = {
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
};

const iconStyles = {
  success: "text-green-400",
  error: "text-red-400",
  warning: "text-yellow-400",
  info: "text-blue-400",
};

export default function ToastCenter({ messages, onDismiss }: ToastCenterProps) {
  const [visibleMessages, setVisibleMessages] = useState<ToastMessage[]>(messages);

  // Update visible messages when messages prop changes
  useEffect(() => {
    setVisibleMessages(messages);
  }, [messages]);

  const handleDismiss = useCallback(
    (id: string) => {
      setVisibleMessages((prev) => prev.filter((msg) => msg.id !== id));
      onDismiss(id);
    },
    [onDismiss]
  );

  // Auto-dismiss messages after duration
  useEffect(() => {
    const timers = visibleMessages.map((message) => {
      const duration = message.duration ?? 5000;
      const timer = setTimeout(() => {
        handleDismiss(message.id);
      }, duration);

      return { id: message.id, timer };
    });

    return () => {
      timers.forEach(({ timer }) => clearTimeout(timer));
    };
  }, [visibleMessages, handleDismiss]);

  if (visibleMessages.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-4 right-4 z-50 space-y-2 max-w-sm"
      role="status"
      aria-live="polite"
      aria-label="Powiadomienia"
    >
      {visibleMessages.map((message) => {
        const Icon = toastIcons[message.type];

        return (
          <div
            key={message.id}
            className={`
              flex items-start p-4 rounded-lg border shadow-lg transition-all duration-300 ease-in-out
              ${toastStyles[message.type]}
            `}
            role="alert"
            aria-live="assertive"
          >
            <div className="flex-shrink-0">
              <Icon className={`h-5 w-5 ${iconStyles[message.type]}`} aria-hidden="true" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium">{message.title}</p>
              {message.description && <p className="mt-1 text-sm opacity-90">{message.description}</p>}
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(message.id)}
                  className="inline-flex p-1.5 hover:bg-black/5 focus:ring-2 focus:ring-inset focus:ring-gray-600"
                  aria-label="Zamknij powiadomienie"
                >
                  <span className="sr-only">Zamknij</span>
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Utility functions for creating toasts
export const createToast = (type: ToastType, title: string, description?: string, duration?: number): ToastMessage => ({
  id: Math.random().toString(36).substring(2, 9),
  type,
  title,
  description,
  duration,
});

export const createSuccessToast = (title: string, description?: string) => createToast("success", title, description);

export const createErrorToast = (title: string, description?: string) => createToast("error", title, description, 7000); // Longer duration for errors

export const createWarningToast = (title: string, description?: string) => createToast("warning", title, description);

export const createInfoToast = (title: string, description?: string) => createToast("info", title, description);
