import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ExpensesDeleteConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  expenseDescription: string;
  amount: string;
  isDeleting?: boolean;
}

export default function ExpensesDeleteConfirmDialog({
  open,
  onConfirm,
  onCancel,
  expenseDescription,
  amount,
  isDeleting = false,
}: ExpensesDeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <AlertDialogTitle>Usuń wydatek</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>Czy na pewno chcesz usunąć ten wydatek?</p>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="font-medium">{expenseDescription}</p>
              <p className="text-sm text-gray-600">Kwota: {amount}</p>
            </div>
            <p className="text-sm text-gray-600">
              Tej akcji nie można cofnąć. Wydatek zostanie trwale usunięty z rozliczenia.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Usuwanie...
              </>
            ) : (
              "Usuń wydatek"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
