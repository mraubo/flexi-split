import { ArrowRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormattedTransfer } from "@/components/hooks/useSettlementSummary";

interface TransfersSectionProps {
  transfers: FormattedTransfer[];
}

export default function TransfersSection({ transfers }: TransfersSectionProps) {
  const handleCopyTransfer = async (transfer: FormattedTransfer) => {
    const transferText = `${transfer.fromNickname} → ${transfer.toNickname}: ${transfer.formattedAmount}`;
    try {
      await navigator.clipboard.writeText(transferText);
      // Could add toast notification here if needed
    } catch {
      // Silent error - clipboard copy failure is handled gracefully
    }
  };

  if (transfers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">Brak przelewów do wyświetlenia - wszyscy są rozliczeni!</div>
    );
  }

  return (
    <div className="space-y-4" data-testid="section-transfers">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">Minimalne przelewy</h3>
      </div>

      {/* Transfers List */}
      <div className="space-y-3">
        {transfers.map((transfer, index) => (
          <div
            key={`${transfer.fromId}-${transfer.toId}-${index}`}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 sm:p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
            data-testid={`transfer-item-${index}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm" data-testid="text-transfer-info">
                <span className="font-medium text-gray-900 truncate">{transfer.fromNickname}</span>
                <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="font-medium text-gray-900 truncate">{transfer.toNickname}</span>
              </div>

              <div className="text-lg font-semibold text-blue-600 sm:ml-2">{transfer.formattedAmount}</div>
            </div>

            <Button
              onClick={() => handleCopyTransfer(transfer)}
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-end sm:self-auto"
              title="Kopiuj przelew"
              data-testid={`button-copy-transfer-${index}`}
            >
              <Copy className="h-4 w-4" />
              <span className="sr-only">Kopiuj przelew</span>
            </Button>
          </div>
        ))}
      </div>

      {/* Summary Note */}
      <div className="text-sm text-gray-500 bg-green-50 p-3 rounded-lg border border-green-200">
        <p>
          <strong>Minimalne przelewy</strong> to najmniejsza liczba transakcji potrzebna do rozliczenia wszystkich sald.
          Wykonanie tych przelewów doprowadzi do pełnego rozliczenia grupy.
        </p>
      </div>
    </div>
  );
}
