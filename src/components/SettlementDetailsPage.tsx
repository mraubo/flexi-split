import { useState, useEffect } from "react";
import { useSettlementDetails } from "@/components/hooks/useSettlementDetails";
import { useQueryParamStep } from "@/components/hooks/useQueryParamStep";
import SettlementHeader from "./SettlementHeader";
import SettlementStepper from "./SettlementStepper";
import ReadOnlyBanner from "./ReadOnlyBanner";
import ParticipantsViewShell from "./ParticipantsViewShell";
import ExpensesView from "./ExpensesView";
import SummaryPage from "./SummaryPage";
import ToastCenter, { type ToastMessage, createSuccessToast, createErrorToast } from "./ToastCenter";
import LoadingSkeleton from "./LoadingSkeleton";
import ErrorState from "./ErrorState";
import type { User } from "@supabase/supabase-js";

interface SettlementDetailsPageProps {
  settlementId: string;
  user: User | null;
}

export default function SettlementDetailsPage({ settlementId, user }: SettlementDetailsPageProps) {
  const { settlement, loading, error, reload } = useSettlementDetails(settlementId);
  const { step: activeStep, setStep: setActiveStep } = useQueryParamStep();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: ToastMessage) => {
    setToasts((prev) => [...prev, toast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Handle redirects for error states
  useEffect(() => {
    if (!loading && error) {
      if (error.status === 404) {
        window.location.href = "/404";
      } else if (error.status === 403) {
        window.location.href = "/403";
      } else if (error.status === 401) {
        window.location.href = "/401";
      }
    }
  }, [loading, error]);

  // Handle error states
  if (!loading && error) {
    if (error.status === 404 || error.status === 403 || error.status === 401) {
      return null; // Will redirect via useEffect
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

      <SettlementStepper activeStep={activeStep} onStepChange={setActiveStep} isReadOnly={false} />

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
          <SummaryPage settlement={settlement} isOwner={isOwner} onSettlementClosed={reload} />
        )}
      </div>

      {/* Toast Center */}
      <ToastCenter messages={toasts} onDismiss={removeToast} />
    </div>
  );
}
