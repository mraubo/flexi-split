import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types.ts";
import type {
  SettlementsListResponse,
  GetSettlementsQuery,
  CreateSettlementCommand,
  SettlementDetailsDTO,
  SettlementWithExpenses,
} from "@/types.ts";

// Safe mapping of sort fields to actual database columns
const sortColumnMap = {
  created_at: "created_at",
  updated_at: "updated_at",
  title: "title",
} as const;

export async function listSettlements(
  supabase: SupabaseClient<Database>,
  query: GetSettlementsQuery
): Promise<SettlementsListResponse> {
  const { status, page = 1, limit = 20, sort_by = "created_at", sort_order = "desc" } = query;

  // Map sort field to database column (with type safety)
  const sortColumn = sortColumnMap[sort_by as keyof typeof sortColumnMap] || "created_at";
  const ascending = sort_order === "asc";
  const offset = (page - 1) * limit;

  // Build the base query with expenses data for total calculation
  let dbQuery = supabase
    .from("settlements")
    .select(
      `
      id, title, status, currency, participants_count, expenses_count, created_at, updated_at, closed_at, last_edited_by, deleted_at,
      expenses(amount_cents)
    `,
      { count: "exact" }
    )
    .is("deleted_at", null) // Filter out soft-deleted records
    .order(sortColumn, { ascending })
    .range(offset, offset + limit - 1);

  // Apply status filter if provided
  if (status) {
    dbQuery = dbQuery.eq("status", status);
  }

  // Execute the query
  const { data, count, error } = await dbQuery;

  if (error) {
    throw error;
  }

  // Process data to calculate total expenses amount
  const processedData = (data as SettlementWithExpenses[]).map((settlement) => ({
    ...settlement,
    total_expenses_amount_cents:
      settlement.expenses?.reduce((sum, expense) => sum + (expense.amount_cents || 0), 0) || 0,
  }));

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

export async function deleteSettlementSoft(
  supabase: SupabaseClient<Database>,
  settlementId: string,
  userId: string
): Promise<void> {
  // First, fetch the settlement to verify ownership and status
  const { data: settlement, error: fetchError } = await supabase
    .from("settlements")
    .select("id, owner_id, status, deleted_at")
    .eq("id", settlementId)
    .is("deleted_at", null) // Ensure it's not already soft-deleted
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      // No rows returned
      throw new Error("Settlement not found");
    }
    throw fetchError;
  }

  // Verify ownership
  if (settlement.owner_id !== userId) {
    throw new Error("Forbidden: insufficient permissions");
  }

  // Verify status is closed
  if (settlement.status !== "closed") {
    throw new Error("Unprocessable Content: settlement is not closed");
  }

  // Perform soft delete
  const { error: deleteError } = await supabase
    .from("settlements")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_edited_by: userId,
    })
    .eq("id", settlementId);

  if (deleteError) {
    throw deleteError;
  }
}

export async function getSettlementById(
  supabase: SupabaseClient<Database>,
  settlementId: string
): Promise<SettlementDetailsDTO> {
  // Fetch settlement with expenses data for total calculation
  const { data, error } = await supabase
    .from("settlements")
    .select(
      `
      id, title, status, currency, participants_count, expenses_count, created_at, updated_at, closed_at, last_edited_by, deleted_at,
      expenses(amount_cents)
    `
    )
    .eq("id", settlementId)
    .is("deleted_at", null) // Filter out soft-deleted records
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned - settlement doesn't exist
      throw new Error("Settlement not found");
    }
    throw error;
  }

  // Calculate total expenses amount
  const totalExpensesAmountCents =
    (data as SettlementWithExpenses).expenses?.reduce((sum, expense) => sum + (expense.amount_cents || 0), 0) || 0;

  return {
    ...data,
    total_expenses_amount_cents: totalExpensesAmountCents,
  };
}

export async function checkAccessOrExistence(
  supabase: SupabaseClient<Database>,
  settlementId: string,
  userId: string
): Promise<{ exists: boolean; accessible: boolean }> {
  // Use RPC call to check existence and ownership without RLS restrictions
  // Function exists in database but types haven't been regenerated yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("check_settlement_access", {
    p_settlement_id: settlementId,
    p_user_id: userId,
  });

  if (error) {
    // If RPC function doesn't exist yet, provide clear error message
    throw new Error(`RPC function check_settlement_access not available: ${error.message}`);
  }

  // Safely validate the response
  if (!data || typeof data !== "object") {
    throw new Error("Invalid response from check_settlement_access");
  }

  const result = data as { exists: boolean; accessible: boolean };
  return result;
}

export async function createSettlement(
  supabase: SupabaseClient<Database>,
  command: CreateSettlementCommand,
  userId: string
): Promise<SettlementDetailsDTO> {
  const { data, error } = await supabase
    .from("settlements")
    .insert([
      {
        title: command.title,
        owner_id: userId,
        // Let DB defaults handle: status='open', currency='PLN', participants_count=0, expenses_count=0
      },
    ])
    .select(
      "id, title, status, currency, participants_count, expenses_count, created_at, updated_at, closed_at, last_edited_by, deleted_at"
    )
    .single();

  if (error) {
    // Map specific database errors to business logic errors
    if (
      error.message?.toLowerCase().includes("max open settlements") ||
      (error.code === "23505" && error.message?.includes("settlements_open_limit"))
    ) {
      const e = new Error("Maximum number of open settlements exceeded") as Error & {
        code: string;
      };
      e.code = "MAX_OPEN_SETTLEMENTS";
      throw e;
    }
    throw error;
  }

  // Add total expenses amount for new settlement (always 0)
  return {
    ...data,
    total_expenses_amount_cents: 0,
  };
}

export async function updateSettlementTitle(
  supabase: SupabaseClient<Database>,
  settlementId: string,
  title: string,
  userId: string
): Promise<SettlementDetailsDTO> {
  // First, fetch the settlement to verify ownership and status
  const { data: settlement, error: fetchError } = await supabase
    .from("settlements")
    .select("id, owner_id, status, deleted_at")
    .eq("id", settlementId)
    .is("deleted_at", null) // Ensure it's not soft-deleted
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      // No rows returned
      throw new Error("Settlement not found");
    }
    throw fetchError;
  }

  // Verify ownership
  if (settlement.owner_id !== userId) {
    throw new Error("Forbidden: insufficient permissions");
  }

  // Verify status is open (can only update open settlements)
  if (settlement.status !== "open") {
    throw new Error("Unprocessable Entity: settlement is not open");
  }

  // Perform the update
  const { data: updatedSettlement, error: updateError } = await supabase
    .from("settlements")
    .update({
      title,
      updated_at: new Date().toISOString(),
      last_edited_by: userId,
    })
    .eq("id", settlementId)
    .select(
      "id, title, status, currency, participants_count, expenses_count, created_at, updated_at, closed_at, last_edited_by, deleted_at"
    )
    .single();

  if (updateError) {
    throw updateError;
  }

  // Fetch expenses data for total calculation
  const { data: expensesData, error: expensesError } = await supabase
    .from("settlements")
    .select("expenses(amount_cents)")
    .eq("id", settlementId)
    .single();

  if (expensesError) {
    throw expensesError;
  }

  // Calculate total expenses amount
  const totalExpensesAmountCents =
    (expensesData as SettlementWithExpenses).expenses?.reduce((sum, expense) => sum + (expense.amount_cents || 0), 0) ||
    0;

  return {
    ...updatedSettlement,
    total_expenses_amount_cents: totalExpensesAmountCents,
  };
}
