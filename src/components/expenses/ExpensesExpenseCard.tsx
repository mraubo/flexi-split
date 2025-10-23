import { useState } from "react";
import type { ExpenseCardVM, ApiError } from "@/types";
import { formatCurrency } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, Users } from "lucide-react";
import ExpensesDeleteConfirmDialog from "./ExpensesDeleteConfirmDialog";

interface ExpensesExpenseCardProps {
  expense: ExpenseCardVM;
  settlementId: string;
  onDeleted: () => void;
  isReadOnly: boolean;
}

export default function ExpensesExpenseCard({
  expense,
  settlementId,
  onDeleted,
  isReadOnly,
}: ExpensesExpenseCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = () => {
    // TODO: Implement edit functionality
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/settlements/${settlementId}/expenses/${expense.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const error: ApiError = {
          status: response.status,
          code: data.error?.code,
          message: data.error?.message || "Failed to delete expense",
          details: data.error?.details,
        };
        throw error;
      }

      // Success - hide dialog and notify parent
      setShowDeleteDialog(false);
      onDeleted();
    } catch {
      // Error handling - for now just log, could show toast in the future
      // TODO: Show error toast to user
      // Hide dialog on error too
      setShowDeleteDialog(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  // Truncate description if too long
  const truncatedDescription =
    expense.description && expense.description.length > 60
      ? `${expense.description.substring(0, 60)}...`
      : expense.description;

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="font-medium text-gray-900">{expense.payerNickname}</div>
                <div className="text-lg font-semibold text-gray-900">{formatCurrency(expense.amountCents)}</div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Users className="h-3 w-3" />
                  <span>{expense.shareCount} osób</span>
                </div>
              </div>

              {truncatedDescription && <div className="text-sm text-gray-600 mb-2">{truncatedDescription}</div>}

              <div className="text-xs text-gray-500">Uczestnicy: {expense.participantsShort.join(", ")}</div>
            </div>

            {!isReadOnly && (expense.canEdit || expense.canDelete) && (
              <div className="ml-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Otwórz menu akcji</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {expense.canEdit && (
                      <DropdownMenuItem onClick={handleEdit}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edytuj
                      </DropdownMenuItem>
                    )}
                    {expense.canDelete && (
                      <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Usuń
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ExpensesDeleteConfirmDialog
        open={showDeleteDialog}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        expenseDescription={expense.description || "wydatek"}
        amount={formatCurrency(expense.amountCents)}
        isDeleting={isDeleting}
      />
    </>
  );
}
