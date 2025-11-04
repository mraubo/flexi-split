import React from "react";
import { formatCurrency } from "@/types";
import { calculateShareInfo } from "@/components/hooks/useExpenseForm";
import type { AmountCents } from "@/types";

export interface SharePreviewProps {
  amountCents?: AmountCents;
  selectedCount: number;
}

export function SharePreview({ amountCents, selectedCount }: SharePreviewProps) {
  const { shareCount, perPersonAmount } = calculateShareInfo(amountCents, selectedCount);

  const hasValidData = amountCents && selectedCount > 0;

  return (
    <div className="p-4 bg-gray-50 rounded-lg border" data-testid="component-share-preview">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Podgląd podziału</h3>

      {hasValidData ? (
        <div className="space-y-1 text-sm" data-testid="text-share-info">
          <div>
            <span className="text-gray-600">Osób w podziale:</span> <span className="font-medium">{shareCount}</span>
          </div>
          <div>
            <span className="text-gray-600">Część na osobę:</span>{" "}
            <span className="font-medium">{formatCurrency(perPersonAmount)}</span>
          </div>
          {shareCount > 1 && (
            <div>
              <span className="text-gray-600">Łączna kwota:</span>{" "}
              <span className="font-medium">{formatCurrency(amountCents)}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500" data-testid="text-share-info">
          Wprowadź kwotę i wybierz uczestników, aby zobaczyć podgląd podziału
        </p>
      )}
    </div>
  );
}
