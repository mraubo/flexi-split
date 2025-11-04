import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormattedBalance, FormattedTransfer } from "@/components/hooks/useSettlementSummary";

interface CopySummaryButtonProps {
  settlementTitle: string;
  balances: FormattedBalance[];
  transfers: FormattedTransfer[];
  disabled?: boolean;
  onCopied?: () => void;
}

export default function CopySummaryButton({
  settlementTitle,
  balances,
  transfers,
  disabled = false,
  onCopied,
}: CopySummaryButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const generateSummaryText = (): string => {
    const lines: string[] = [];

    // Header
    lines.push(`Rozliczenie: ${settlementTitle}`);
    lines.push(`Data: ${new Date().toLocaleDateString("pl-PL")}`);
    lines.push("");

    // Balances
    lines.push("SALDO PER OSOBA:");
    balances.forEach((balance) => {
      const sign = balance.sign === "-" ? "-" : balance.sign === "+" ? "+" : "";
      lines.push(`${balance.nickname}: ${sign}${balance.formattedAmount}`);
    });
    lines.push("");

    // Transfers
    if (transfers.length > 0) {
      lines.push("MINIMALNE PRZELEWY:");
      transfers.forEach((transfer) => {
        lines.push(`${transfer.fromNickname} → ${transfer.toNickname}: ${transfer.formattedAmount}`);
      });
    } else {
      lines.push("Wszyscy są rozliczeni! 🎉");
    }
    lines.push("");

    // Footer
    lines.push("Wygenerowane przez FlexiSplit");

    return lines.join("\n");
  };

  const handleCopy = async () => {
    setIsCopying(true);

    try {
      const summaryText = generateSummaryText();
      await navigator.clipboard.writeText(summaryText);

      setIsCopied(true);
      onCopied?.();

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch {
      // Silent error - clipboard copy failure is handled by UI feedback
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Button
      onClick={handleCopy}
      disabled={disabled || isCopying}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
      data-testid="button-copy-summary"
    >
      {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
      <span className="hidden sm:inline">{isCopied ? "Skopiowane!" : "Kopia podsumowania"}</span>
      <span className="sm:hidden">{isCopied ? "Skopiowane!" : "Kopiuj"}</span>
    </Button>
  );
}
