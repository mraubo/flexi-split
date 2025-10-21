import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types.ts";
import type { ParticipantsListResponse, GetParticipantsQuery, ParticipantDTO } from "@/types.ts";
import { checkAccessOrExistence } from "./settlements.service";

export async function listParticipants(
  supabase: SupabaseClient<Database>,
  settlementId: string,
  query: GetParticipantsQuery,
  userId: string
): Promise<ParticipantsListResponse> {
  const { page = 1, limit = 50 } = query;

  // Ensure limit doesn't exceed maximum allowed value
  const effectiveLimit = Math.min(limit, 100);
  const offset = (page - 1) * effectiveLimit;

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

  // Build the query to get participants with count
  const { data, count, error } = await supabase
    .from("participants")
    .select(
      `
      id,
      nickname,
      is_owner,
      created_at,
      updated_at,
      last_edited_by
    `,
      { count: "exact" }
    )
    .eq("settlement_id", settlementId)
    .order("created_at", { ascending: true })
    .range(offset, offset + effectiveLimit - 1);

  if (error) {
    throw new Error(`Failed to fetch participants: ${error.message}`);
  }

  // Transform data to DTOs
  const participants: ParticipantDTO[] = (data || []).map((participant) => ({
    id: participant.id,
    nickname: participant.nickname,
    is_owner: participant.is_owner,
    created_at: participant.created_at,
    updated_at: participant.updated_at,
    last_edited_by: participant.last_edited_by,
  }));

  const total = count || 0;
  const totalPages = Math.ceil(total / effectiveLimit);

  return {
    data: participants,
    pagination: {
      page,
      limit: effectiveLimit,
      total,
      total_pages: totalPages,
    },
  };
}
