import { useState, useEffect } from "react";
import { Check, X, Edit2 } from "lucide-react";
import type { SettlementDetailsDTO } from "@/types";
import { useUpdateSettlementTitle } from "@/components/hooks/useUpdateSettlementTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SettlementHeaderProps {
  settlement: SettlementDetailsDTO;
  isReadOnly: boolean;
  onUpdated: (updatedSettlement: SettlementDetailsDTO) => void;
  onError?: (errorMessage: string) => void;
}

export default function SettlementHeader({ settlement, isReadOnly, onUpdated, onError }: SettlementHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(settlement.title);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { updateTitle, loading, error } = useUpdateSettlementTitle(settlement.id);

  // Reset form when settlement changes
  useEffect(() => {
    setTitle(settlement.title);
    setIsEditing(false);
    setValidationError(null);
  }, [settlement.title]);

  // Reset form when switching to read-only mode
  useEffect(() => {
    if (isReadOnly) {
      setIsEditing(false);
      setValidationError(null);
    }
  }, [isReadOnly]);

  const handleEdit = () => {
    if (!isReadOnly) {
      setIsEditing(true);
      setValidationError(null);
    }
  };

  const handleCancel = () => {
    setTitle(settlement.title);
    setIsEditing(false);
    setValidationError(null);
  };

  const validateTitle = (value: string): string | null => {
    if (!value.trim()) {
      return "Tytuł jest wymagany";
    }
    if (value.length > 100) {
      return "Tytuł może mieć maksymalnie 100 znaków";
    }
    return null;
  };

  const handleSave = async () => {
    const error = validateTitle(title);
    if (error) {
      setValidationError(error);
      return;
    }

    try {
      await updateTitle(title);
      setIsEditing(false);
      setValidationError(null);
      // Trigger reload of settlement data
      onUpdated({ ...settlement, title });
    } catch (error) {
      // Call error callback to show toast
      const errorMessage = error instanceof Error ? error.message : "Wystąpił błąd podczas zapisywania";
      onError?.(errorMessage);
      // Keep editing mode active so user can try again
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <Label htmlFor="settlement-title" className="sr-only">
              Tytuł rozliczenia
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="settlement-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setValidationError(null);
                }}
                onKeyDown={handleKeyDown}
                className={`text-2xl font-bold ${validationError ? "border-red-500" : ""}`}
                placeholder="Wprowadź tytuł rozliczenia"
                disabled={loading}
                maxLength={100}
                data-testid="input-settlement-title"
              />
              <Button onClick={handleSave} size="sm" disabled={loading || !!validationError} className="shrink-0" data-testid="button-save-title">
                <Check className="h-4 w-4" />
                <span className="sr-only">Zapisz</span>
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm" disabled={loading} className="shrink-0" data-testid="button-cancel-edit">
                <X className="h-4 w-4" />
                <span className="sr-only">Anuluj</span>
              </Button>
            </div>
            {validationError && (
              <p className="text-sm text-red-600" role="alert" data-testid="error-validation">
                {validationError}
              </p>
            )}
            {error && (
              <p className="text-sm text-red-600" role="alert" data-testid="error-api">
                {error.message || "Wystąpił błąd podczas zapisywania"}
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 truncate" data-testid="heading-settlement-title">{settlement.title}</h1>
            {!isReadOnly && (
              <Button
                onClick={handleEdit}
                variant="ghost"
                size="sm"
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid="button-edit-title"
              >
                <Edit2 className="h-4 w-4" />
                <span className="sr-only">Edytuj tytuł</span>
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="ml-4 flex items-center gap-2 shrink-0">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            settlement.status === "open" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
          }`}
          data-testid="badge-status"
        >
          {settlement.status === "open" ? "Otwarte" : "Zamknięte"}
        </span>
        <span className="text-sm text-gray-500">
          <span data-testid="text-participants-count">{settlement.participants_count}</span> uczestników • <span data-testid="text-expenses-count">{settlement.expenses_count}</span> wydatków
        </span>
      </div>
    </div>
  );
}
