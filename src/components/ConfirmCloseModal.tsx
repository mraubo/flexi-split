import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lock } from "lucide-react";
import { formatDate } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmCloseModalProps {
  open: boolean;
  settlementTitle: string;
  expensesCount: number;
  createdAt: Date;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isClosing: boolean;
}

export default function ConfirmCloseModal({
  open,
  settlementTitle,
  expensesCount,
  createdAt,
  onOpenChange,
  onConfirm,
  isClosing,
}: ConfirmCloseModalProps) {
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);

    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił błąd podczas zamykania rozliczenia";
      setError(errorMessage);
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-confirm-close">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Lock className="h-6 w-6 text-blue-600" />
            <div>
              <DialogTitle data-testid="heading-title">Zamknij rozliczenie</DialogTitle>
              <DialogDescription>
                Czy na pewno chcesz zamknąć rozliczenie &quot;{settlementTitle}&quot;? Ta akcja jest nieodwracalna.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Szczegóły rozliczenia:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • Tytuł: <strong data-testid="text-settlement-title">{settlementTitle}</strong>
              </li>
              <li>
                • Liczba kosztów: <strong data-testid="text-expense-count">{expensesCount}</strong>
              </li>
              <li>
                • Data utworzenia: <strong data-testid="text-created-date">{formatDate(createdAt)}</strong>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4" data-testid="box-warning">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-amber-900 mb-1">Ostrzeżenie</h4>
                <p className="text-sm text-amber-800">
                  Po zamknięciu rozliczenia nie będzie można dodawać nowych kosztów ani edytować istniejących.
                  Rozliczenie przejdzie do archiwum i będzie dostępne tylko w trybie tylko-do-odczytu.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div
              className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-md"
              data-testid="error-message"
            >
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isClosing}
            data-testid="button-cancel"
          >
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isClosing}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-close"
          >
            {isClosing ? "Zamykanie..." : "Zamknij rozliczenie"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
