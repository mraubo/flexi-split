import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types.ts";
import type { SettlementsListResponse, GetSettlementsQuery } from "@/types.ts";

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

  // Build the base query
  let dbQuery = supabase
    .from("settlements")
    .select(
      "id, title, status, currency, participants_count, expenses_count, created_at, updated_at, closed_at, last_edited_by",
      { count: "exact" }
    )
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

  // Calculate pagination metadata
  const total = count ?? 0;
  const total_pages = Math.max(1, Math.ceil(total / limit));

  return {
    data: data ?? [],
    pagination: {
      page,
      limit,
      total,
      total_pages,
    },
  };
}
