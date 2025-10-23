import { useState } from "react";
import { useSettlementDetails } from "@/components/hooks/useSettlementDetails";
import { useQueryParamStep } from "@/components/hooks/useQueryParamStep";
import { useCurrentUser } from "@/components/hooks/useCurrentUser";
import SettlementHeader from "./SettlementHeader";
import SettlementStepper from "./SettlementStepper";
import ReadOnlyBanner from "./ReadOnlyBanner";
import ParticipantsViewShell from "./ParticipantsViewShell";
import ExpensesView from "./ExpensesView";
import ToastCenter, { type ToastMessage, createSuccessToast, createErrorToast } from "./ToastCenter";
import LoadingSkeleton from "./LoadingSkeleton";
import ErrorState from "./ErrorState";

interface SettlementDetailsPageProps {
  settlementId: string;
}

export default function SettlementDetailsPage({ settlementId }: SettlementDetailsPageProps) {
  const { settlement, loading, error, reload } = useSettlementDetails(settlementId);
  const { step: activeStep, setStep: setActiveStep } = useQueryParamStep();
  const { user } = useCurrentUser();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: ToastMessage) => {
    setToasts((prev) => [...prev, toast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Handle error states
  if (!loading && error) {
    if (error.status === 404) {
      return (
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 text-muted-foreground mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">Rozliczenie nie zostało znalezione</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Sprawdź czy link jest poprawny lub wróć do listy rozliczeń.
            </p>
          </div>
        </div>
      );
    }

    if (error.status === 403) {
      return (
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 text-muted-foreground mb-4">🚫</div>
            <h3 className="text-lg font-semibold mb-2">Brak dostępu do rozliczenia</h3>
            <p className="text-muted-foreground mb-6 max-w-md">Nie masz uprawnień do wyświetlenia tego rozliczenia.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <ErrorState message={error.message || "Wystąpił nieoczekiwany błąd"} onRetry={reload} />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <LoadingSkeleton />
      </div>
    );
  }

  // No settlement data
  if (!settlement) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 text-muted-foreground mb-4">🔍</div>
          <h3 className="text-lg font-semibold mb-2">Rozliczenie nie zostało znalezione</h3>
          <p className="text-muted-foreground mb-6 max-w-md">Nie udało się załadować danych rozliczenia.</p>
        </div>
      </div>
    );
  }

  const isReadOnly = settlement.status === "closed";
  const isOwner = !!(user && settlement.owner_id === user.id);

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Settlement Header */}
      <div className="mb-6 group">
        <SettlementHeader
          settlement={settlement}
          isReadOnly={isReadOnly}
          onUpdated={() => {
            addToast(createSuccessToast("Tytuł został zaktualizowany"));
            // Reload settlement data to reflect changes from server
            reload();
          }}
          onError={(errorMessage) => {
            addToast(createErrorToast("Błąd podczas aktualizacji tytułu", errorMessage));
          }}
        />
      </div>

      {/* Settlement Stepper */}
      <SettlementStepper activeStep={activeStep} onStepChange={setActiveStep} isReadOnly={isReadOnly} />

      {/* Read Only Banner */}
      <ReadOnlyBanner isVisible={isReadOnly} />

      {/* Step Content - TODO: Implement step components */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeStep === "participants" && (
          <ParticipantsViewShell
            settlementId={settlementId}
            isOwner={isOwner}
            status={settlement.status as "open" | "closed"}
            expensesCount={settlement.expenses_count}
          />
        )}

        {activeStep === "expenses" && (
          <ExpensesView settlementId={settlementId} isOwner={isOwner} isReadOnly={isReadOnly} />
        )}

        {activeStep === "summary" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Podsumowanie</h2>
            <p className="text-gray-500">Podsumowanie rozliczenia - wkrótce...</p>
          </div>
        )}
      </div>

      {/* Toast Center */}
      <ToastCenter messages={toasts} onDismiss={removeToast} />
    </div>
  );
}
