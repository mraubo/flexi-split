import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDeleteDialogProps {
  open: boolean;
  settlementId?: string;
  settlementTitle?: string;
  onOpenChange: (open: boolean) => void;
  onDeleted: (id: string) => void;
}

export default function ConfirmDeleteDialog({
  open,
  settlementId,
  settlementTitle,
  onOpenChange,
  onDeleted,
}: ConfirmDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!settlementId) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/settlements/${settlementId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        let data;
        try {
          data = await response.json();
        } catch {
          data = { error: { message: "Failed to delete settlement" } };
        }

        if (response.status === 422) {
          setError("Rozliczenie nie jest zamknięte — nie można usunąć.");
        } else if (response.status === 404) {
          setError("Nie znaleziono rozliczenia.");
        } else if (response.status === 403) {
          setError("Brak uprawnień do usunięcia tego rozliczenia.");
        } else {
          setError(data.error?.message || "Wystąpił błąd podczas usuwania.");
        }
        return;
      }

      onDeleted(settlementId);
      handleClose();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
      setError("Wystąpił błąd podczas usuwania rozliczenia.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <div>
              <DialogTitle>Usuń rozliczenie</DialogTitle>
              <DialogDescription>
                Czy na pewno chcesz usunąć rozliczenie &quot;{settlementTitle}&quot;? Ta akcja jest nieodwracalna.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isDeleting}>
            Anuluj
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? "Usuwanie..." : "Usuń"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
