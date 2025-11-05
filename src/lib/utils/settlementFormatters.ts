/**
 * Settlement-specific formatting utilities
 * Handles formatting of balances, transfers, and totals for settlement summaries
 */

import type { UUID, AmountCents } from "@/types";
import { formatCurrency } from "./formatters";

/**
 * Formatted balance for display
 */
export interface FormattedBalance {
  participantId: UUID;
  nickname: string;
  amountCents: AmountCents;
  formattedAmount: string;
  sign: "+" | "-" | "0";
}

/**
 * Formatted transfer for display
 */
export interface FormattedTransfer {
  fromId: UUID;
  fromNickname: string;
  toId: UUID;
  toNickname: string;
  amountCents: AmountCents;
  formattedAmount: string;
}

/**
 * Balance totals for control sum
 */
export interface BalanceTotals {
  sumPayable: number;
  sumReceivable: number;
  isBalanced: boolean;
}

/**
 * Transfer from settlement snapshot
 */
export interface Transfer {
  from: UUID;
  to: UUID;
  amount_cents: AmountCents;
}

/**
 * Formats balances for display in settlement summary
 * 
 * @param balances - Record of participant IDs to balance amounts in cents
 * @param participantsMap - Map of participant IDs to nicknames
 * @returns Array of formatted balances sorted by amount (debtors first, then creditors)
 */
export function formatBalances(
  balances: Record<UUID, AmountCents> | undefined | null,
  participantsMap: Record<UUID, string>
): FormattedBalance[] {
  if (!balances) return [];

  return Object.entries(balances)
    .map(([participantId, amountCents]) => ({
      participantId: participantId as UUID,
      nickname: participantsMap[participantId] || "Nieznany uczestnik",
      amountCents: amountCents as AmountCents,
      formattedAmount: formatCurrency(Math.abs(amountCents)),
      sign: (amountCents > 0 ? "+" : amountCents < 0 ? "-" : "0") as "+" | "-" | "0",
    }))
    .sort((a, b) => {
      // Sort by amount (negative first, then positive, then zero)
      if (a.amountCents !== b.amountCents) {
        return a.amountCents - b.amountCents;
      }
      // Then by nickname for stable sort
      return a.nickname.localeCompare(b.nickname, "pl");
    });
}

/**
 * Formats transfers for display in settlement summary
 * 
 * @param transfers - Array of transfer objects from settlement snapshot
 * @param participantsMap - Map of participant IDs to nicknames
 * @returns Array of formatted transfers sorted by from/to nicknames
 */
export function formatTransfers(
  transfers: Transfer[] | undefined | null,
  participantsMap: Record<UUID, string>
): FormattedTransfer[] {
  if (!transfers) return [];

  return transfers
    .map((transfer) => ({
      fromId: transfer.from,
      fromNickname: participantsMap[transfer.from] || "Nieznany uczestnik",
      toId: transfer.to,
      toNickname: participantsMap[transfer.to] || "Nieznany uczestnik",
      amountCents: transfer.amount_cents,
      formattedAmount: formatCurrency(transfer.amount_cents),
    }))
    .sort((a, b) => {
      // Sort by from nickname, then to nickname for stable sort
      const fromCompare = a.fromNickname.localeCompare(b.fromNickname, "pl");
      if (fromCompare !== 0) return fromCompare;
      return a.toNickname.localeCompare(b.toNickname, "pl");
    });
}

/**
 * Calculates balance totals for control sum verification
 * 
 * @param balances - Record of participant IDs to balance amounts in cents
 * @returns Object containing sum of payables, receivables, and balance status
 */
export function calculateBalanceTotals(
  balances: Record<UUID, AmountCents> | undefined | null
): BalanceTotals {
  if (!balances) {
    return { sumPayable: 0, sumReceivable: 0, isBalanced: true };
  }

  const balanceValues = Object.values(balances) as number[];
  const sumPayable = balanceValues.filter((b) => b < 0).reduce((sum, b) => sum + Math.abs(b), 0);
  const sumReceivable = balanceValues.filter((b) => b > 0).reduce((sum, b) => sum + b, 0);

  return {
    sumPayable,
    sumReceivable,
    isBalanced: Math.abs(sumPayable - sumReceivable) < 1, // Allow for small floating point differences
  };
}
