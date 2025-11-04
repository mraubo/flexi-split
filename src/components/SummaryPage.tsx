import { useState } from "react";
import { useSettlementSummary } from "@/components/hooks/useSettlementSummary";
import SummaryHeader from "./SummaryHeader";
import BalancesSection from "./BalancesSection";
import TransfersSection from "./TransfersSection";
import ControlSumNote from "./ControlSumNote";
import ConfirmCloseModal from "./ConfirmCloseModal";
import CopySummaryButton from "./CopySummaryButton";
import LoadingSkeleton from "./LoadingSkeleton";
import ErrorState from "./ErrorState";
import type { SettlementDetailsDTO } from "@/types";

interface SummaryPageProps {
  settlement: SettlementDetailsDTO;
  isOwner: boolean;
  onSettlementClosed?: () => void;
}

export default function SummaryPage({ settlement, isOwner, onSettlementClosed }: SummaryPageProps) {
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [copySuccessToast, setCopySuccessToast] = useState(false);

  const {
    settlementSnapshot,
    loading,
    error,
    formattedBalances,
    formattedTransfers,
    totals,
    closeSettlement,
    isClosing,
    reload,
  } = useSettlementSummary(settlement.id, settlement.status as "open" | "closed");

  const isClosed = settlement.status === "closed";

  const canClose = isOwner && !isClosed;
  const canCopy = isClosed && settlementSnapshot !== null;

  const handleCloseClick = () => {
    setShowCloseModal(true);
  };

  const handleCloseConfirm = async () => {
    await closeSettlement();
    // After successful close, notify parent component to reload settlement data
    // This will update the settlement status and show the snapshot
    onSettlementClosed?.();
  };

  const handleCopySuccess = () => {
    setCopySuccessToast(true);
    setTimeout(() => setCopySuccessToast(false), 3000);
  };

  // Handle loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="space-y-6">
        <ErrorState message={error.message || "Wystąpił błąd podczas ładowania podsumowania"} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-summary">
      {/* Header */}
      <SummaryHeader
        settlement={settlement}
        isOwner={isOwner}
        isClosed={isClosed}
        onCloseClick={handleCloseClick}
        onCopyClick={handleCopySuccess}
        canClose={canClose}
        canCopy={canCopy}
      />

      {/* Show message for open settlements */}
      {!isClosed && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="text-blue-600 mb-2">
            <svg className="h-12 w-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Rozliczenie jest otwarte</h3>
          <p className="text-blue-700 mb-4">
            Aby zobaczyć podsumowanie sald i przelewów, najpierw zamknij rozliczenie. Zamknięcie rozliczenia jest
            nieodwracalne i oznacza zakończenie edycji.
          </p>
        </div>
      )}

      {/* Show snapshot for closed settlements */}
      {isClosed && settlementSnapshot && (
        <>
          {/* Balances Section */}
          <BalancesSection balances={formattedBalances} />

          {/* Transfers Section */}
          <TransfersSection transfers={formattedTransfers} />

          {/* Control Sum Note */}
          <ControlSumNote totals={totals} />

          {/* Copy Summary Button (standalone for closed settlements) */}
          <div className="flex justify-center">
            <CopySummaryButton
              settlementTitle={settlement.title}
              balances={formattedBalances}
              transfers={formattedTransfers}
              onCopied={handleCopySuccess}
            />
          </div>
        </>
      )}

      {/* Close Confirmation Modal */}
      <ConfirmCloseModal
        open={showCloseModal}
        settlementTitle={settlement.title}
        expensesCount={settlement.expenses_count}
        createdAt={new Date(settlement.created_at)}
        onOpenChange={setShowCloseModal}
        onConfirm={handleCloseConfirm}
        isClosing={isClosing}
      />

      {/* Copy Success Toast */}
      {copySuccessToast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          Podsumowanie zostało skopiowane do schowka!
        </div>
      )}
    </div>
  );
}
