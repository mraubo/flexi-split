import { Copy, Lock } from "lucide-react";
import type { SettlementDetailsDTO } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SummaryHeaderProps {
  settlement: SettlementDetailsDTO;
  isOwner: boolean;
  isClosed: boolean;
  onCloseClick: () => void;
  onCopyClick: () => void;
  onShareClick?: () => void;
  canClose: boolean;
  canCopy: boolean;
}

export default function SummaryHeader({
  settlement,
  isOwner,
  isClosed,
  onCloseClick,
  onCopyClick,
  onShareClick,
  canClose,
  canCopy,
}: SummaryHeaderProps) {
  const statusLabel = isClosed ? "Zamknięte" : "Otwarte";
  const statusVariant = isClosed ? "secondary" : "default";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* Title and Status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold text-gray-900 truncate">{settlement.title}</h2>
          {isClosed && <Lock className="h-5 w-5 text-gray-400" />}
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={statusVariant} className="shrink-0">
            {statusLabel}
          </Badge>
          <span className="text-sm text-gray-500">
            {settlement.participants_count} uczestników • {settlement.expenses_count} wydatków
          </span>
          {isOwner && (
            <Badge variant="outline" className="shrink-0">
              Właściciel
            </Badge>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {canCopy && (
          <Button onClick={onCopyClick} variant="outline" size="sm" className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">Kopia podsumowania</span>
            <span className="sm:hidden">Kopiuj</span>
          </Button>
        )}

        {onShareClick && (
          <Button onClick={onShareClick} variant="outline" size="sm" className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
              />
            </svg>
            <span className="hidden sm:inline">Udostępnij</span>
            <span className="sm:hidden">Udostępnij</span>
          </Button>
        )}

        {canClose && (
          <Button
            onClick={onCloseClick}
            size="sm"
            className="flex items-center gap-2"
            data-testid="button-close-settlement"
          >
            <Lock className="h-4 w-4" />
            <span>Zamknij rozliczenie</span>
          </Button>
        )}
      </div>
    </div>
  );
}
