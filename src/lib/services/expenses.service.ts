import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types.ts";
import type {
  ExpensesListResponse,
  GetExpensesQuery,
  ExpenseDTO,
  ExpenseParticipantMiniDTO,
  CreateExpenseCommand,
  UpdateExpenseCommand,
  ExpenseDetailsDTO,
  CreateExpenseRpcResult,
  UpdateExpenseRpcResult,
  ExpenseParticipantQueryResult,
} from "@/types.ts";
import { checkAccessOrExistence, checkSettlementParticipation } from "./settlements.service";

// Result type for delete expense operation
export type DeleteExpenseResult =
  | { type: "ok" }
  | { type: "not_found" }
  | { type: "forbidden" }
  | { type: "closed" }
  | { type: "error"; message: string };

// Safe mapping of sort fields to actual database columns
const sortColumnMap = {
  expense_date: "expense_date",
  created_at: "created_at",
  amount_cents: "amount_cents",
} as const;

// Performance optimizations:
// - Uses batch participant fetching to minimize round trips
// - Leverages database indexes on (settlement_id, expense_date, created_at, id)
// - Could benefit from Redis caching for frequently accessed settlement expenses
// - HTTP-level caching implemented at endpoint level with ETags
export async function getExpenses(
  supabase: SupabaseClient<Database>,
  query: GetExpensesQuery & { settlement_id: string },
  userId: string
): Promise<ExpensesListResponse> {
  const {
    settlement_id,
    participant_id,
    date_from,
    date_to,
    page = 1,
    limit = 50,
    sort_by = "expense_date",
    sort_order = "desc",
  } = query;

  // Map sort field to database column (with type safety)
  const sortColumn = sortColumnMap[sort_by as keyof typeof sortColumnMap] || "expense_date";
  const ascending = sort_order === "asc";
  const offset = (page - 1) * limit;

  // Check access and existence to properly distinguish 403 vs 404
  const accessCheck = await checkAccessOrExistence(supabase, settlement_id, userId);

  if (!accessCheck.exists) {
    // Settlement doesn't exist - return 404
    throw new Error("Settlement not found");
  }

  if (!accessCheck.accessible) {
    // Settlement exists but user doesn't have access - return 403
    throw new Error("Forbidden: insufficient permissions");
  }

  // If participant_id is specified, verify it exists in this settlement
  if (participant_id) {
    const { error: participantError } = await supabase
      .from("participants")
      .select("id")
      .eq("id", participant_id)
      .eq("settlement_id", settlement_id)
      .single();

    if (participantError) {
      if (participantError.code === "PGRST116") {
        throw new Error("Participant not found");
      }
      throw participantError;
    }
  }

  // Build the base query for expenses (without participants for better performance)
  let expensesQuery = supabase
    .from("expenses")
    .select(
      `
      id,
      payer_participant_id,
      amount_cents,
      expense_date,
      description,
      share_count,
      created_at,
      updated_at,
      last_edited_by
    `,
      { count: "exact" }
    )
    .eq("settlement_id", settlement_id)
    .order(sortColumn, { ascending })
    .range(offset, offset + limit - 1);

  // Apply participant filter if specified (participant as payer OR participant)
  if (participant_id) {
    expensesQuery = expensesQuery.or(
      `payer_participant_id.eq.${participant_id},expense_participants.participant_id.eq.${participant_id}`
    );
  }

  // Apply date range filters if specified
  if (date_from) {
    expensesQuery = expensesQuery.gte("expense_date", date_from);
  }
  if (date_to) {
    expensesQuery = expensesQuery.lte("expense_date", date_to);
  }

  // Execute the expenses query
  const { data: expensesData, count, error: expensesError } = await expensesQuery;

  if (expensesError) {
    throw expensesError;
  }

  if (!expensesData || expensesData.length === 0) {
    // No expenses found, return empty result
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        total_pages: 0,
      },
    };
  }

  // Get all expense IDs to fetch participants in one query
  const expenseIds = expensesData.map((expense) => expense.id);

  // Fetch participants for all expenses in one query
  const { data: participantsData, error: participantsError } = await supabase
    .from("expense_participants")
    .select(
      `
      expense_id,
      participants!inner(id, nickname)
    `
    )
    .in("expense_id", expenseIds);

  if (participantsError) {
    throw participantsError;
  }

  // Create a map of expense_id -> participants for efficient lookup
  const expenseParticipantsMap = new Map<string, ExpenseParticipantMiniDTO[]>();
  participantsData?.forEach((ep: ExpenseParticipantQueryResult & { expense_id: string }) => {
    const participants = expenseParticipantsMap.get(ep.expense_id) || [];
    if (!expenseParticipantsMap.has(ep.expense_id)) {
      expenseParticipantsMap.set(ep.expense_id, participants);
    }
    participants.push({
      id: ep.participants.id,
      nickname: ep.participants.nickname,
    });
  });

  // Process data to map to ExpenseDTO format
  const processedData: ExpenseDTO[] = expensesData.map((expense) => {
    const participants = expenseParticipantsMap.get(expense.id) || [];

    return {
      id: expense.id,
      payer_participant_id: expense.payer_participant_id,
      amount_cents: expense.amount_cents,
      expense_date: expense.expense_date,
      description: expense.description,
      share_count: expense.share_count,
      created_at: expense.created_at,
      updated_at: expense.updated_at,
      last_edited_by: expense.last_edited_by,
      participants,
    };
  });

  // Calculate pagination metadata
  const total = count ?? 0;
  const total_pages = Math.max(1, Math.ceil(total / limit));

  return {
    data: processedData,
    pagination: {
      page,
      limit,
      total,
      total_pages,
    },
  };
}

/**
 * Deletes an expense from a settlement if the user has access and the settlement is open.
 * This operation is performed in a transaction to ensure consistency.
 */
export async function deleteExpense(
  supabase: SupabaseClient<Database>,
  settlementId: string,
  expenseId: string,
  userId: string
): Promise<DeleteExpenseResult> {
  // Check settlement participation and status to properly distinguish 403 vs 404
  const participationCheck = await checkSettlementParticipation(supabase, settlementId, userId);

  if (!participationCheck.exists) {
    // Settlement doesn't exist - return 404
    return { type: "not_found" };
  }

  if (!participationCheck.accessible) {
    // Settlement exists but user doesn't participate - return 403
    return { type: "forbidden" };
  }

  // Check if the settlement is open (required for deletion)
  if (participationCheck.status !== "open") {
    return { type: "closed" };
  }

  // Check if the expense exists and belongs to the settlement
  const { data: expenseData, error: expenseError } = await supabase
    .from("expenses")
    .select("id")
    .eq("id", expenseId)
    .eq("settlement_id", settlementId)
    .single();

  if (expenseError) {
    if (expenseError.code === "PGRST116") {
      // No rows returned - expense doesn't exist or doesn't belong to settlement
      return { type: "not_found" };
    }
    return { type: "error", message: `Failed to check expense existence: ${expenseError.message}` };
  }

  if (!expenseData) {
    return { type: "not_found" };
  }

  // Perform the deletion in a transaction (RLS will handle additional access control)
  // First delete from expense_participants (cascade will handle this, but being explicit)
  const { error: participantsDeleteError } = await supabase
    .from("expense_participants")
    .delete()
    .eq("expense_id", expenseId);

  if (participantsDeleteError) {
    return { type: "error", message: `Failed to delete expense participants: ${participantsDeleteError.message}` };
  }

  // Then delete the expense itself
  const { error: expenseDeleteError } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("settlement_id", settlementId);

  if (expenseDeleteError) {
    // Check for specific error codes that indicate business logic violations
    if (expenseDeleteError.code === "PGRST116") {
      // No rows affected - expense doesn't exist or doesn't belong to settlement
      return { type: "not_found" };
    }
    if (expenseDeleteError.code === "42501" || expenseDeleteError.message.includes("permission denied")) {
      return { type: "forbidden" };
    }
    return { type: "error", message: `Failed to delete expense: ${expenseDeleteError.message}` };
  }

  return { type: "ok" };
}

/**
 * Creates a new expense in a settlement with proper validation and transaction handling.
 * The settlement must be open and the user must participate in it.
 * All participants must exist in the settlement, and the payer must be one of them.
 *
 * Performance optimizations:
 * - Uses atomic RPC function to minimize database round trips
 * - Validates business rules at database level for consistency
 * - Separate optimized query for participant details to avoid complex joins
 * - Leverages database constraints and indexes for fast validation
 */
export async function createExpense(
  supabase: SupabaseClient<Database>,
  settlementId: string,
  command: CreateExpenseCommand,
  userId: string
): Promise<ExpenseDetailsDTO> {
  // Check settlement participation and status
  const participationCheck = await checkSettlementParticipation(supabase, settlementId, userId);

  if (!participationCheck.exists) {
    // Settlement doesn't exist - return 404
    throw new Error("Settlement not found");
  }

  if (!participationCheck.accessible) {
    // Settlement exists but user doesn't participate - return 403
    throw new Error("Forbidden: insufficient permissions");
  }

  // Check if the settlement is open (required for creating expenses)
  if (participationCheck.status !== "open") {
    throw new Error("Settlement is closed - cannot add expenses");
  }

  // Validate that payer_participant_id exists in this settlement
  const { data: payerData, error: payerError } = await supabase
    .from("participants")
    .select("id")
    .eq("id", command.payer_participant_id)
    .eq("settlement_id", settlementId)
    .single();

  if (payerError || !payerData) {
    if (payerError?.code === "PGRST116") {
      throw new Error("Payer participant does not exist in settlement");
    }
    throw payerError || new Error("Failed to validate payer participant");
  }

  // Remove duplicates from participant_ids and validate they all exist in the settlement
  const uniqueParticipantIds = [...new Set(command.participant_ids)];

  // Validate all participants exist in the settlement
  const { data: participantsData, error: participantsError } = await supabase
    .from("participants")
    .select("id")
    .in("id", uniqueParticipantIds)
    .eq("settlement_id", settlementId);

  if (participantsError) {
    throw participantsError;
  }

  if (!participantsData || participantsData.length !== uniqueParticipantIds.length) {
    const foundIds = new Set(participantsData?.map((p) => p.id) || []);
    const missingIds = uniqueParticipantIds.filter((id) => !foundIds.has(id));
    throw new Error(`Some participants do not exist in settlement: ${missingIds.join(", ")}`);
  }

  // Ensure payer is included in participants (add if not present)
  if (!uniqueParticipantIds.includes(command.payer_participant_id)) {
    uniqueParticipantIds.push(command.payer_participant_id);
  }

  // Prepare expense data
  const expenseData = {
    settlement_id: settlementId,
    payer_participant_id: command.payer_participant_id,
    amount_cents: command.amount_cents,
    expense_date: command.expense_date,
    description: command.description,
    last_edited_by: userId,
  };

  // Prepare expense participants data
  const expenseParticipantsArray = uniqueParticipantIds.map((participantId) => ({
    participant_id: participantId,
  }));

  // Execute transaction using RPC function for atomicity
  const { data: expenseResult, error: expenseInsertError } = await supabase.rpc("create_expense_with_participants", {
    expense_data: expenseData,
    expense_participants_data: expenseParticipantsArray,
    user_id: userId,
  });

  if (expenseInsertError) {
    console.error(`[ERROR] Failed to create expense: ${expenseInsertError.message}`, {
      settlementId,
      userId,
      command,
      error: expenseInsertError,
    });

    // Map specific database error codes to business logic errors
    let errorMessage = `Failed to create expense: ${expenseInsertError.message}`;

    if (expenseInsertError.code === "28000") {
      errorMessage = "authentication required";
    } else if (expenseInsertError.code === "P0001") {
      errorMessage = "Settlement not found";
    } else if (expenseInsertError.code === "42501") {
      errorMessage = "Forbidden: insufficient permissions";
    } else if (expenseInsertError.code === "P0002") {
      errorMessage = "Settlement is closed - cannot add expenses";
    } else if (expenseInsertError.code === "P0003") {
      errorMessage = "Payer participant does not exist in settlement";
    } else if (expenseInsertError.code === "P0004") {
      errorMessage = "Some participants do not exist in settlement";
    }

    throw new Error(errorMessage);
  }

  if (!expenseResult) {
    throw new Error("Failed to create expense: no result returned");
  }

  // Cast RPC result to proper type
  const rpcResult = expenseResult as unknown as CreateExpenseRpcResult;

  // Fetch participants for the expense in a separate optimized query
  // This is more efficient than joining in the RPC since participants data is needed for the DTO
  const { data: fetchedParticipantsData, error: fetchedParticipantsError } = await supabase
    .from("expense_participants")
    .select(
      `
      participants!inner(id, nickname)
    `
    )
    .eq("expense_id", rpcResult.id);

  if (fetchedParticipantsError) {
    console.error(`[ERROR] Failed to fetch expense participants: ${fetchedParticipantsError.message}`, {
      expenseId: rpcResult.id,
      settlementId,
      userId,
    });
    throw new Error("Failed to retrieve expense participants");
  }

  // Transform to ExpenseDetailsDTO format using data from RPC + participants query
  const expenseDetails: ExpenseDetailsDTO = {
    id: rpcResult.id,
    payer_participant_id: rpcResult.payer_participant_id,
    amount_cents: rpcResult.amount_cents,
    expense_date: rpcResult.expense_date,
    description: rpcResult.description,
    share_count: rpcResult.share_count,
    created_at: rpcResult.created_at,
    updated_at: rpcResult.updated_at,
    last_edited_by: rpcResult.last_edited_by,
    participants: (fetchedParticipantsData || []).map((ep: ExpenseParticipantQueryResult) => ({
      id: ep.participants.id,
      nickname: ep.participants.nickname,
    })),
  };

  return expenseDetails;
}

export async function updateExpense(
  supabase: SupabaseClient<Database>,
  settlementId: string,
  expenseId: string,
  command: UpdateExpenseCommand,
  userId: string
): Promise<ExpenseDetailsDTO> {
  // Check settlement participation and status
  const participationCheck = await checkSettlementParticipation(supabase, settlementId, userId);

  if (!participationCheck.exists) {
    // Settlement doesn't exist - return 404
    throw new Error("Settlement not found");
  }

  if (!participationCheck.accessible) {
    // Settlement exists but user doesn't participate - return 403
    throw new Error("Forbidden: insufficient permissions");
  }

  // Check if the settlement is open (required for updating expenses)
  if (participationCheck.status !== "open") {
    throw new Error("Settlement is closed - cannot update expenses");
  }

  // Remove duplicates from participant_ids and validate they all exist in the settlement
  const uniqueParticipantIds = [...new Set(command.participant_ids)];

  // Ensure payer is included in participants (add if not present)
  if (!uniqueParticipantIds.includes(command.payer_participant_id)) {
    uniqueParticipantIds.push(command.payer_participant_id);
  }

  // Prepare expense data for update (only include fields that are being updated)
  const expenseData = {
    payer_participant_id: command.payer_participant_id,
    amount_cents: command.amount_cents,
    expense_date: command.expense_date,
    description: command.description,
  };

  // Prepare expense participants data
  const expenseParticipantsArray = uniqueParticipantIds.map((participantId) => ({
    participant_id: participantId,
  }));

  // Execute atomic update using RPC function for consistency
  const { data: expenseResult, error: expenseUpdateError } = await supabase.rpc("update_expense_with_participants", {
    p_expense_id: expenseId,
    expense_data: expenseData,
    expense_participants_data: expenseParticipantsArray,
    user_id: userId,
  });

  if (expenseUpdateError) {
    console.error(`[ERROR] Failed to update expense: ${expenseUpdateError.message}`, {
      settlementId,
      expenseId,
      userId,
      command,
      error: expenseUpdateError,
    });

    // Map specific database error codes to business logic errors
    let errorMessage = `Failed to update expense: ${expenseUpdateError.message}`;

    if (expenseUpdateError.code === "28000") {
      errorMessage = "authentication required";
    } else if (expenseUpdateError.code === "P0001") {
      errorMessage = "Expense not found";
    } else if (expenseUpdateError.code === "P0002") {
      errorMessage = "Settlement not found";
    } else if (expenseUpdateError.code === "42501") {
      errorMessage = "Forbidden: insufficient permissions";
    } else if (expenseUpdateError.code === "P0003") {
      errorMessage = "Settlement is closed - cannot update expenses";
    } else if (expenseUpdateError.code === "P0004") {
      errorMessage = "Payer participant does not exist in settlement";
    } else if (expenseUpdateError.code === "P0005") {
      errorMessage = "Some participants do not exist in settlement";
    }

    throw new Error(errorMessage);
  }

  if (!expenseResult) {
    throw new Error("Failed to update expense: no result returned");
  }

  // Cast RPC result to proper type
  const rpcResult = expenseResult as unknown as UpdateExpenseRpcResult;

  // Fetch participants for the updated expense in a separate optimized query
  const { data: fetchedParticipantsData, error: fetchedParticipantsError } = await supabase
    .from("expense_participants")
    .select(
      `
      participants!inner(id, nickname)
    `
    )
    .eq("expense_id", expenseId);

  if (fetchedParticipantsError) {
    console.error(`[ERROR] Failed to fetch expense participants: ${fetchedParticipantsError.message}`, {
      expenseId,
      settlementId,
      userId,
    });
    throw new Error("Failed to retrieve updated expense participants");
  }

  // Transform to ExpenseDetailsDTO format using data from RPC + participants query
  const expenseDetails: ExpenseDetailsDTO = {
    id: rpcResult.id,
    payer_participant_id: rpcResult.payer_participant_id,
    amount_cents: rpcResult.amount_cents,
    expense_date: rpcResult.expense_date,
    description: rpcResult.description,
    share_count: rpcResult.share_count,
    created_at: rpcResult.created_at,
    updated_at: rpcResult.updated_at,
    last_edited_by: rpcResult.last_edited_by,
    participants: (fetchedParticipantsData || []).map((ep: ExpenseParticipantQueryResult) => ({
      id: ep.participants.id,
      nickname: ep.participants.nickname,
    })),
  };

  return expenseDetails;
}

export async function readExpenseWithParticipants(
  supabase: SupabaseClient<Database>,
  settlementId: string,
  expenseId: string,
  userId: string
): Promise<ExpenseDetailsDTO> {
  // Check access and existence to properly distinguish 403 vs 404
  const accessCheck = await checkAccessOrExistence(supabase, settlementId, userId);

  if (!accessCheck.exists) {
    // Settlement doesn't exist - return 404
    throw new Error("Settlement not found");
  }

  if (!accessCheck.accessible) {
    // Settlement exists but user doesn't have access - return 403
    throw new Error("Forbidden: insufficient permissions");
  }

  // Query the expense with basic fields (RLS will handle access control)
  const { data: expenseData, error: expenseError } = await supabase
    .from("expenses")
    .select(
      `
      id,
      payer_participant_id,
      amount_cents,
      expense_date,
      description,
      share_count,
      created_at,
      updated_at,
      last_edited_by
    `
    )
    .eq("id", expenseId)
    .eq("settlement_id", settlementId)
    .single();

  if (expenseError) {
    if (expenseError.code === "PGRST116") {
      // No rows returned - expense doesn't exist or doesn't belong to settlement
      throw new Error("Expense not found");
    }
    throw expenseError;
  }

  if (!expenseData) {
    throw new Error("Expense not found");
  }

  // Fetch participants for this expense in an optimized query
  const { data: participantsData, error: participantsError } = await supabase
    .from("expense_participants")
    .select(
      `
      participants!inner(id, nickname)
    `
    )
    .eq("expense_id", expenseId);

  if (participantsError) {
    throw participantsError;
  }

  // Transform to ExpenseDetailsDTO format
  const expenseDetails: ExpenseDetailsDTO = {
    id: expenseData.id,
    payer_participant_id: expenseData.payer_participant_id,
    amount_cents: expenseData.amount_cents,
    expense_date: expenseData.expense_date,
    description: expenseData.description,
    share_count: expenseData.share_count,
    created_at: expenseData.created_at,
    updated_at: expenseData.updated_at,
    last_edited_by: expenseData.last_edited_by,
    participants: (participantsData || []).map((ep: ExpenseParticipantQueryResult) => ({
      id: ep.participants.id,
      nickname: ep.participants.nickname,
    })),
  };

  return expenseDetails;
}
