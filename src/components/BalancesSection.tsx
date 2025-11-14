import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { FormattedBalance } from "@/components/hooks/useSettlementSummary";

interface BalancesSectionProps {
  balances: FormattedBalance[];
}

export default function BalancesSection({ balances }: BalancesSectionProps) {
  if (balances.length === 0) {
    return <div className="text-center py-8 text-gray-500">Brak danych sald do wyświetlenia</div>;
  }

  return (
    <div className="space-y-4" data-testid="section-balances">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">Saldo per osoba</h3>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center gap-1">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <span>+ kwota do otrzymania</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingDown className="h-4 w-4 text-red-600" />
          <span>- kwota do zapłaty</span>
        </div>
        <div className="flex items-center gap-1">
          <Minus className="h-4 w-4 text-gray-500" />
          <span>0 rozliczony</span>
        </div>
      </div>

      {/* Balances List */}
      <div className="space-y-3">
        {balances.map((balance) => (
          <div
            key={balance.participantId}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            data-testid={`balance-item-${balance.participantId}`}
          >
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                {balance.sign === "+" && <TrendingUp className="h-5 w-5 text-green-600" />}
                {balance.sign === "-" && <TrendingDown className="h-5 w-5 text-red-600" />}
                {balance.sign === "0" && <Minus className="h-5 w-5 text-gray-500" />}
              </div>
              <span className="font-medium text-gray-900">{balance.nickname}</span>
            </div>

            <div className="flex items-center gap-2 pl-8 sm:pl-0">
              <span
                className={`font-semibold text-lg ${
                  balance.sign === "+" ? "text-green-600" : balance.sign === "-" ? "text-red-600" : "text-gray-500"
                }`}
                data-testid={`text-balance-${balance.participantId}`}
              >
                {balance.sign === "-" ? "-" : balance.sign === "+" ? "+" : ""}
                {balance.formattedAmount}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Note */}
      <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-200">
        <p>
          <strong>Saldo</strong> pokazuje kwotę, którą dana osoba powinna otrzymać (+) lub zapłacić (-) w ramach
          rozliczenia. Kwoty zostały obliczone z dokładnością do grosza.
        </p>
      </div>
    </div>
  );
}
