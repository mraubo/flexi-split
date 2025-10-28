import { CheckCircle, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/types";

interface ControlSumNoteProps {
  totals: {
    sumPayable: number;
    sumReceivable: number;
    isBalanced: boolean;
  };
}

export default function ControlSumNote({ totals }: ControlSumNoteProps) {
  const { sumPayable, sumReceivable, isBalanced } = totals;

  return (
    <div
      className={`p-4 rounded-lg border ${isBalanced ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {isBalanced ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Kontrola sum rozliczenia</h4>

          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Suma do zapłaty:</span>
              <span className="font-medium">{formatCurrency(sumPayable)}</span>
            </div>
            <div className="flex justify-between">
              <span>Suma do otrzymania:</span>
              <span className="font-medium">{formatCurrency(sumReceivable)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1 mt-2">
              <span className="font-medium">Różnica:</span>
              <span className={`font-medium ${isBalanced ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(Math.abs(sumPayable - sumReceivable))}
              </span>
            </div>
          </div>

          <p className={`text-sm mt-2 ${isBalanced ? "text-green-700" : "text-red-700"}`}>
            {isBalanced ? (
              <>
                <strong>Rozliczenie jest zrównoważone.</strong> Suma kwot do zapłaty równa się sumie kwot do otrzymania.
              </>
            ) : (
              <>
                <strong>Uwaga: Rozliczenie nie jest zrównoważone.</strong> Istnieje niezgodność w obliczeniach.
                Skontaktuj się z administratorem systemu.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
