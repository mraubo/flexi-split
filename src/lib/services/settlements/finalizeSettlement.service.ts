import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { AmountCents, UUID, TransferDTO } from "@/types";

export async function calculateSettlementBalances(
  supabase: SupabaseClient<Database>,
  settlementId: string
): Promise<Record<string, number>> {
  // Use a complex query with CTE to calculate net balances
  // Balance = (sum of payments made) - (sum of shares in expenses)
  const { data, error } = await supabase.rpc("calculate_settlement_balances", {
    p_settlement_id: settlementId,
  });

  if (error) {
    throw new Error(`Failed to calculate settlement balances: ${error.message}`);
  }

  // Convert array of {participant_id, balance_cents} to Record<string, number>
  const balances: Record<string, number> = {};
  if (data && Array.isArray(data)) {
    data.forEach((row: { participant_id: string; balance_cents: number }) => {
      balances[row.participant_id] = row.balance_cents;
    });
  }

  return balances;
}

export function calculateTransfers(balances: Record<UUID, AmountCents>): TransferDTO[] {
  const transfers: TransferDTO[] = [];

  // Create working copy of balances to avoid mutating the input
  const workingBalances = { ...balances };

  // Convert to arrays for easier processing
  const creditors = Object.entries(workingBalances)
    .filter(([, balance]) => balance > 0)
    .map(([id, balance]) => ({ id, balance }))
    .sort((a, b) => b.balance - a.balance || a.id.localeCompare(b.id)); // sort by balance desc, then id asc for determinism

  const debtors = Object.entries(workingBalances)
    .filter(([, balance]) => balance < 0)
    .map(([id, balance]) => ({ id, balance: Math.abs(balance) })) // convert to positive for easier comparison
    .sort((a, b) => b.balance - a.balance || a.id.localeCompare(b.id)); // sort by balance desc, then id asc for determinism

  while (creditors.length > 0 && debtors.length > 0) {
    // Get the largest creditor and debtor
    const creditor = creditors[0];
    const debtor = debtors[0];

    // Calculate transfer amount (minimum of what debtor owes and creditor is owed)
    const transferAmount = Math.min(creditor.balance, debtor.balance);

    // Create transfer
    transfers.push({
      from: debtor.id,
      to: creditor.id,
      amount_cents: transferAmount,
    });

    // Update balances
    creditor.balance -= transferAmount;
    debtor.balance -= transferAmount;

    // Remove settled creditors/debtors
    if (creditor.balance === 0) {
      creditors.shift();
    }
    if (debtor.balance === 0) {
      debtors.shift();
    }
  }

  return transfers;
}

export async function validateSettlementForClosing(
  supabase: SupabaseClient<Database>,
  settlementId: string
): Promise<void> {
  // Check if settlement has participants
  const { count: participantCount, error: participantError } = await supabase
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("settlement_id", settlementId);

  if (participantError) {
    throw new Error(`Failed to check participants: ${participantError.message}`);
  }

  if (!participantCount || participantCount === 0) {
    throw new Error("Settlement has no participants");
  }

  // Check if settlement has expenses (optional, but good to validate)
  const { error: expenseError } = await supabase
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("settlement_id", settlementId);

  if (expenseError) {
    throw new Error(`Failed to check expenses: ${expenseError.message}`);
  }

  // Note: Empty settlements (no expenses) are allowed to be closed
  // They will just have zero balances for all participants
}

export async function finalizeSettlement(
  supabase: SupabaseClient<Database>,
  settlementId: string,
  userId: string
): Promise<{
  id: string;
  status: "closed";
  closed_at: string;
  balances: Record<UUID, AmountCents>;
  transfers: TransferDTO[];
}> {
  // Validate settlement can be closed
  await validateSettlementForClosing(supabase, settlementId);

  // Calculate balances
  const balances = await calculateSettlementBalances(supabase, settlementId);

  // Calculate transfers
  const transfers = calculateTransfers(balances);

  // Get current timestamp for consistency
  const closedAt = new Date().toISOString();

  // Convert balances and transfers to JSON format for RPC
  const balancesJson = balances as Record<string, number>;

  const transfersJson = transfers.map((transfer) => ({
    from: transfer.from,
    to: transfer.to,
    amount_cents: transfer.amount_cents,
  }));

  // Save snapshot and update settlement in a transaction
  const { data, error } = await supabase.rpc("finalize_settlement_transaction", {
    p_settlement_id: settlementId,
    p_balances: balancesJson,
    p_transfers: transfersJson,
    p_user_id: userId,
    p_closed_at: closedAt,
  });

  if (error) {
    // Map specific database errors to business logic errors
    let errorMessage = `Failed to finalize settlement: ${error.message}`;

    if (error.message.includes("settlement not found or not authorized")) {
      errorMessage = "Settlement not found or not authorized";
    } else if (error.message.includes("already closed")) {
      errorMessage = "Settlement is already closed";
    }

    throw new Error(errorMessage);
  }

  if (!data) {
    throw new Error("Failed to finalize settlement: no result returned");
  }

  return {
    id: settlementId,
    status: "closed",
    closed_at: closedAt,
    balances,
    transfers,
  };
}
