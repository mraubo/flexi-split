import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types.ts";
import type { ParticipantsListResponse, GetParticipantsQuery, ParticipantDTO } from "@/types.ts";
import { checkAccessOrExistence } from "@/lib/services/settlements.service";

/**
 * Adds a new participant to a settlement with proper validation and business rules
 */
export async function addParticipant(
  supabase: SupabaseClient<Database>,
  settlementId: string,
  nickname: string,
  userId: string,
  isOwner = false
): Promise<ParticipantDTO> {
  // Check if settlement exists and user has access
  const { data: settlement, error: settlementError } = await supabase
    .from("settlements")
    .select("owner_id, status, participants_count")
    .eq("id", settlementId)
    .is("deleted_at", null)
    .single();

  if (settlementError || !settlement) {
    throw new Error("Settlement not found");
  }

  if (settlement.owner_id !== userId) {
    throw new Error("Forbidden: insufficient permissions");
  }

  // Check that settlement is open (business rule)
  if (settlement.status !== "open") {
    throw new Error("Settlement is closed: cannot add participants to closed settlements");
  }

  // Check participant limit (max 10 participants)
  if ((settlement.participants_count || 0) >= 10) {
    throw new Error("Maximum participant limit reached: cannot add more than 10 participants");
  }

  // If setting as owner, check that no owner exists yet
  if (isOwner) {
    const { data: existingOwner } = await supabase
      .from("participants")
      .select("id")
      .eq("settlement_id", settlementId)
      .eq("is_owner", true)
      .maybeSingle();

    if (existingOwner) {
      throw new Error("Owner already exists for this settlement");
    }
  }

  // Check nickname uniqueness (case-insensitive)
  const nicknameNorm = nickname.toLowerCase();
  const { data: conflict } = await supabase
    .from("participants")
    .select("id")
    .eq("settlement_id", settlementId)
    .eq("nickname_norm", nicknameNorm)
    .maybeSingle();

  if (conflict) {
    throw new Error("Nickname already exists in this settlement");
  }

  // Insert the participant
  const { data: newParticipant, error: insertError } = await supabase
    .from("participants")
    .insert({
      settlement_id: settlementId,
      nickname,
      is_owner: isOwner,
      last_edited_by: userId,
    })
    .select(
      `
      id,
      nickname,
      is_owner,
      created_at,
      updated_at,
      last_edited_by
    `
    )
    .single();

  if (insertError || !newParticipant) {
    throw new Error(`Failed to add participant: ${insertError?.message || "unknown error"}`);
  }

  // Update participants_count in settlements table
  const { error: updateError } = await supabase
    .from("settlements")
    .update({
      participants_count: (settlement.participants_count || 0) + 1,
      updated_at: new Date().toISOString(),
      last_edited_by: userId,
    })
    .eq("id", settlementId);

  if (updateError) {
    // If settlement update fails, we should ideally rollback the participant insertion
    // For now, we'll throw an error and let the user know
    throw new Error(`Failed to update settlement count: ${updateError.message}`);
  }

  // Return the newly created participant as DTO
  return {
    id: newParticipant.id,
    nickname: newParticipant.nickname,
    is_owner: newParticipant.is_owner,
    created_at: newParticipant.created_at,
    updated_at: newParticipant.updated_at,
    last_edited_by: newParticipant.last_edited_by,
  };
}

/**
 * Updates a participant's nickname with proper validation and business rules
 */
export async function updateNickname(
  supabase: SupabaseClient<Database>,
  settlementId: string,
  participantId: string,
  nickname: string,
  userId: string
): Promise<ParticipantDTO> {
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

  // Check that the participant exists and belongs to the settlement
  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id, settlement_id")
    .eq("id", participantId)
    .eq("settlement_id", settlementId)
    .single();

  if (participantError || !participant) {
    throw new Error("Participant not found");
  }

  // Check that settlement is open (business rule)
  const { data: settlement, error: settlementError } = await supabase
    .from("settlements")
    .select("status")
    .eq("id", settlementId)
    .single();

  if (settlementError) {
    throw new Error(`Failed to fetch settlement: ${settlementError.message}`);
  }

  if (settlement.status !== "open") {
    throw new Error("Settlement is closed: cannot update participants in closed settlements");
  }

  // Check nickname uniqueness (case-insensitive)
  const nicknameNorm = nickname.toLowerCase();
  const { data: conflict } = await supabase
    .from("participants")
    .select("id")
    .eq("settlement_id", settlementId)
    .eq("nickname_norm", nicknameNorm)
    .neq("id", participantId)
    .maybeSingle();

  if (conflict) {
    throw new Error("Nickname already exists in this settlement");
  }

  // Update the participant
  const { data: updated, error: updateError } = await supabase
    .from("participants")
    .update({
      nickname,
      last_edited_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("settlement_id", settlementId)
    .eq("id", participantId)
    .select(
      `
      id,
      nickname,
      is_owner,
      created_at,
      updated_at,
      last_edited_by
    `
    )
    .single();

  if (updateError || !updated) {
    throw new Error(`Failed to update participant: ${updateError?.message || "unknown error"}`);
  }

  // Return the updated participant as DTO
  return {
    id: updated.id,
    nickname: updated.nickname,
    is_owner: updated.is_owner,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    last_edited_by: updated.last_edited_by,
  };
}

/**
 * Removes a participant from a settlement with proper validation and business rules
 */
export async function removeParticipant(
  supabase: SupabaseClient<Database>,
  settlementId: string,
  participantId: string,
  userId: string
): Promise<void> {
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

  // Check that the participant exists and belongs to the settlement
  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id, settlement_id")
    .eq("id", participantId)
    .eq("settlement_id", settlementId)
    .single();

  if (participantError || !participant) {
    throw new Error("Participant not found");
  }

  // Check that settlement is open (business rule)
  const { data: settlement, error: settlementError } = await supabase
    .from("settlements")
    .select("status")
    .eq("id", settlementId)
    .single();

  if (settlementError) {
    throw new Error(`Failed to fetch settlement: ${settlementError.message}`);
  }

  if (settlement.status !== "open") {
    throw new Error("Settlement is closed: cannot remove participants from closed settlements");
  }

  // Check referential integrity - participant should not have expenses
  const { count: payerCount, error: payerError } = await supabase
    .from("expenses")
    .select("*", { count: "exact", head: true })
    .eq("settlement_id", settlementId)
    .eq("payer_participant_id", participantId);

  if (payerError) {
    throw new Error(`Failed to check expenses as payer: ${payerError.message}`);
  }

  const { count: participantCount, error: participantError2 } = await supabase
    .from("expense_participants")
    .select("*", { count: "exact", head: true })
    .eq("participant_id", participantId);

  if (participantError2) {
    throw new Error(`Failed to check expense participants: ${participantError2.message}`);
  }

  if ((payerCount || 0) > 0 || (participantCount || 0) > 0) {
    throw new Error("Cannot remove participant: participant has associated expenses");
  }

  // Execute deletion in a transaction
  const { error: deleteError } = await supabase
    .from("participants")
    .delete()
    .eq("id", participantId)
    .eq("settlement_id", settlementId);

  if (deleteError) {
    throw new Error(`Failed to remove participant: ${deleteError.message}`);
  }
}

/**
 * Gets a single participant by ID with proper access control and validation
 */
export async function getById(
  supabase: SupabaseClient<Database>,
  settlementId: string,
  participantId: string,
  userId: string
): Promise<ParticipantDTO> {
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

  // Fetch the participant with the required fields
  const { data: participant, error } = await supabase
    .from("participants")
    .select(
      `
      id,
      nickname,
      is_owner,
      created_at,
      updated_at,
      last_edited_by
    `
    )
    .eq("id", participantId)
    .eq("settlement_id", settlementId)
    .single();

  if (error || !participant) {
    throw new Error("Participant not found");
  }

  // Return the participant as DTO
  return {
    id: participant.id,
    nickname: participant.nickname,
    is_owner: participant.is_owner,
    created_at: participant.created_at,
    updated_at: participant.updated_at,
    last_edited_by: participant.last_edited_by,
  };
}

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
