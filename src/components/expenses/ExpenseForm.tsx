import React, { useEffect, useState, useMemo } from "react";
import type { UUID, ExpenseDTO, ExpenseParticipantMiniDTO, ApiError, DateString } from "@/types";
import { useExpenseForm } from "@/components/hooks/useExpenseForm";
import { useParticipants } from "@/components/hooks/useParticipants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Import field components (will be created next)
import { AmountInput } from "@/components/expenses/AmountInput";
import { PayerSelect } from "@/components/expenses/PayerSelect";
import { ParticipantsChecklist } from "@/components/expenses/ParticipantsChecklist";
import { DateInput } from "@/components/expenses/DateInput";
import { DescriptionField } from "@/components/expenses/DescriptionField";
import { SharePreview } from "@/components/expenses/SharePreview";
import { ErrorBanner } from "@/components/expenses/ErrorBanner";

export interface ExpenseFormProps {
  mode: "create" | "edit";
  settlementId: UUID;
  expenseId?: UUID;
  initialData?: ExpenseDTO;
  onSaved?: (id: UUID) => void;
}

export function ExpenseForm({ mode, settlementId, expenseId, initialData, onSaved }: ExpenseFormProps) {
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(mode === "edit" && !initialData);
  const [expenseLoadError, setExpenseLoadError] = useState<ApiError | null>(null);
  const [loadedExpenseData, setLoadedExpenseData] = useState<ExpenseDTO | null>(initialData || null);

  // Load participants data
  const {
    participants: participantDTOs,
    loading: participantsLoading,
    error: participantsError,
  } = useParticipants(
    settlementId,
    0, // expensesCount - not needed for form
    "open", // status - assume open for form, will be validated by API
    true // isOwner - assume owner for form access, will be validated by API
  );

  // Convert to ExpenseParticipantMiniDTO format
  const participants: ExpenseParticipantMiniDTO[] = useMemo(
    () => participantDTOs.map((p) => ({ id: p.id, nickname: p.nickname })),
    [participantDTOs]
  );

  const { formState, updateField, submitForm, cancelForm, apiError } = useExpenseForm({
    mode,
    settlementId,
    expenseId,
    participants,
    initialData: loadedExpenseData || undefined,
    onSaved: (id) => {
      // Navigate back to expenses list after successful save
      window.location.assign(`/settlements/${settlementId}?step=expenses`);
      onSaved?.(id);
    },
  });

  // Load initial data for edit mode if not provided
  useEffect(() => {
    if (mode === "edit" && !initialData && expenseId) {
      setIsLoadingInitialData(true);

      fetch(`/api/settlements/${settlementId}/expenses/${expenseId}`)
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw {
              status: response.status,
              code: errorData.error?.code || "not_found",
              message: errorData.error?.message || "Nie udało się załadować danych wydatku.",
              details: errorData.error?.details,
            } as ApiError;
          }
          return response.json();
        })
        .then((data) => {
          // Store the loaded expense data
          setLoadedExpenseData(data);
          setIsLoadingInitialData(false);
        })
        .catch((error) => {
          setIsLoadingInitialData(false);
          setExpenseLoadError(error as ApiError);
        });
    }
  }, [mode, initialData, settlementId, expenseId]);

  const handleCancel = () => {
    cancelForm();
    window.location.assign(`/settlements/${settlementId}?step=expenses`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitForm();
  };

  if (participantsLoading || isLoadingInitialData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">{participantsLoading ? "Ładowanie uczestników..." : "Ładowanie danych wydatku..."}</span>
      </div>
    );
  }

  if (participantsError) {
    return (
      <ErrorBanner
        error={{
          status: participantsError.status,
          code: participantsError.code,
          message: participantsError.message || "Nie udało się załadować danych uczestników rozliczenia.",
          details: participantsError.details,
        }}
      />
    );
  }

  if (expenseLoadError) {
    return <ErrorBanner error={expenseLoadError} />;
  }

  const title = mode === "create" ? "Dodaj wydatek" : "Edytuj wydatek";

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card data-testid="card-expense-form">
        <CardHeader>
          <CardTitle data-testid="heading-title">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} aria-describedby="form-errors" data-testid="form-expense">
            <div className="space-y-6">
              {/* Amount Input */}
              <AmountInput
                value={formState.amountCents}
                onChange={(cents: number | undefined) => updateField("amountCents", cents)}
                error={formState.errors.amount}
              />

              {/* Payer Select */}
              <PayerSelect
                participants={participants}
                value={formState.payerId}
                onChange={(id: UUID) => updateField("payerId", id)}
                error={formState.errors.payer}
              />

              {/* Participants Checklist */}
              <ParticipantsChecklist
                items={participants}
                selectedIds={formState.participantIds}
                onChange={(ids: UUID[]) => updateField("participantIds", ids)}
                error={formState.errors.participants}
              />

              {/* Share Preview */}
              <SharePreview amountCents={formState.amountCents} selectedCount={formState.participantIds.length} />

              {/* Date Input */}
              <DateInput
                value={formState.date}
                onChange={(date: DateString) => updateField("date", date)}
                error={formState.errors.date}
              />

              {/* Description Field */}
              <DescriptionField
                value={formState.description}
                onChange={(desc: string) => updateField("description", desc)}
                error={formState.errors.description}
              />

              {/* Error Banner */}
              <ErrorBanner error={apiError} />

              {/* Form Actions */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={!formState.isValid || formState.isSubmitting}
                  className="flex-1"
                  data-testid="button-save"
                >
                  {formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Zapisywanie...
                    </>
                  ) : (
                    "Zapisz"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={formState.isSubmitting}
                  className="flex-1"
                  data-testid="button-cancel"
                >
                  Anuluj
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
