import type { APIRoute } from "astro";
import { removeParticipant, getById, updateNickname } from "@/lib/services/participants.service";
import { ParticipantIdSchema } from "@/lib/validation/settlements";
import { UpdateParticipantCommandSchema } from "@/lib/validation/participants";
import {
  validateAuthentication,
  validateSettlementId,
  createErrorResponse,
  calculateETag,
  handleConditionalRequest,
} from "@/lib/api";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    // Get supabase client and user from context
    const { supabase, user } = context.locals;

    // Validate authentication
    const { user: validatedUser, error: authError } = validateAuthentication(user);
    if (authError) return authError;

    // Validate settlement ID
    const { settlement_id } = context.params;
    const { settlementId: validatedSettlementId, error: settlementIdError } = validateSettlementId(settlement_id);
    if (settlementIdError) return settlementIdError;

    // Validate participant ID
    const { id } = context.params;
    if (!id) {
      return createErrorResponse("invalid_request", "participant ID is required", 400, undefined, "/id");
    }

    const participantIdValidation = ParticipantIdSchema.safeParse(id);
    if (!participantIdValidation.success) {
      return createErrorResponse(
        "invalid_uuid",
        "invalid participant ID format",
        400,
        participantIdValidation.error ? participantIdValidation.error.issues : undefined,
        "/id"
      );
    }

    // Call service to get participant
    const participant = await getById(supabase, validatedSettlementId, id, (validatedUser as { id: string }).id);

    // Calculate ETag for caching
    const etag = await calculateETag(participant);

    // Handle conditional requests
    const ifNoneMatch = context.request.headers.get("if-none-match");
    const conditionalResponse = handleConditionalRequest(ifNoneMatch, etag);
    if (conditionalResponse) return conditionalResponse;

    // Return successful response with caching headers
    return new Response(JSON.stringify(participant), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ETag: etag,
        "Last-Modified": new Date(participant.updated_at).toUTCString(),
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (error: unknown) {
    // Map service errors to appropriate HTTP status codes
    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage.includes("Settlement not found")) {
      return createErrorResponse("not_found", "settlement not found", 404);
    } else if (errorMessage.includes("Forbidden")) {
      return createErrorResponse("forbidden", "insufficient permissions", 403);
    } else if (errorMessage.includes("Participant not found")) {
      return createErrorResponse("not_found", "participant not found", 404);
    }

    return createErrorResponse("server_error", "An unexpected error occurred", 500);
  }
};

export const DELETE: APIRoute = async (context) => {
  try {
    // Get supabase client and user from context
    const { supabase, user } = context.locals;

    // Validate authentication
    const { user: validatedUser, error: authError } = validateAuthentication(user);
    if (authError) return authError;

    // Validate settlement ID
    const { settlement_id } = context.params;
    const { settlementId: validatedSettlementId, error: settlementIdError } = validateSettlementId(settlement_id);
    if (settlementIdError) return settlementIdError;

    // Validate participant ID
    const { id } = context.params;
    if (!id) {
      return createErrorResponse("invalid_request", "participant ID is required", 400);
    }

    const participantIdValidation = ParticipantIdSchema.safeParse(id);
    if (!participantIdValidation.success) {
      return createErrorResponse(
        "invalid_uuid",
        "invalid participant ID format",
        400,
        participantIdValidation.error ? participantIdValidation.error.issues : undefined
      );
    }

    // Call service to remove participant
    await removeParticipant(supabase, validatedSettlementId, id, (validatedUser as { id: string }).id);

    // Return successful response - 204 No Content
    return new Response(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: unknown) {
    // Map service errors to appropriate HTTP status codes
    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage.includes("Settlement not found")) {
      return createErrorResponse("not_found", "settlement not found", 404);
    } else if (errorMessage.includes("Forbidden")) {
      return createErrorResponse("forbidden", "insufficient permissions", 403);
    } else if (errorMessage.includes("Participant not found")) {
      return createErrorResponse("not_found", "participant not found", 404);
    } else if (errorMessage.includes("Settlement is closed")) {
      return createErrorResponse("unprocessable_entity", "cannot remove participant from closed settlement", 422);
    } else if (errorMessage.includes("has associated expenses")) {
      return createErrorResponse("unprocessable_entity", "cannot remove participant with associated expenses", 422);
    } else if (errorMessage.includes("Failed to remove participant")) {
      return createErrorResponse("server_error", "failed to remove participant from the database", 500);
    }

    return createErrorResponse("server_error", "An unexpected error occurred", 500);
  }
};

export const PUT: APIRoute = async (context) => {
  try {
    // Get supabase client and user from context
    const { supabase, user } = context.locals;

    // Validate authentication
    const { user: validatedUser, error: authError } = validateAuthentication(user);
    if (authError) return authError;

    // Validate settlement ID
    const { settlement_id } = context.params;
    const { settlementId: validatedSettlementId, error: settlementIdError } = validateSettlementId(settlement_id);
    if (settlementIdError) return settlementIdError;

    // Validate participant ID
    const { id } = context.params;
    if (!id) {
      return createErrorResponse("invalid_request", "participant ID is required", 400, undefined, "/id");
    }

    const participantIdValidation = ParticipantIdSchema.safeParse(id);
    if (!participantIdValidation.success) {
      return createErrorResponse(
        "invalid_uuid",
        "invalid participant ID format",
        400,
        participantIdValidation.error ? participantIdValidation.error.issues : undefined,
        "/id"
      );
    }

    // Parse and validate request body
    const body = await context.request.json().catch(() => {
      return createErrorResponse("invalid_request", "invalid JSON in request body", 400);
    });

    if (body instanceof Response) return body; // Error response from json parsing

    const bodyValidation = UpdateParticipantCommandSchema.safeParse(body);
    if (!bodyValidation.success) {
      return createErrorResponse(
        "validation_error",
        "request body validation failed",
        400,
        bodyValidation.error.issues,
        bodyValidation.error.issues.length > 0 ? `/${bodyValidation.error.issues[0].path.join("/")}` : undefined
      );
    }

    // Call service to update participant nickname
    const updatedParticipant = await updateNickname(
      supabase,
      validatedSettlementId,
      id,
      bodyValidation.data.nickname,
      (validatedUser as { id: string }).id
    );

    // Calculate ETag for caching
    const etag = await calculateETag(updatedParticipant);

    // Return successful response
    return new Response(JSON.stringify(updatedParticipant), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ETag: etag,
        "Last-Modified": new Date(updatedParticipant.updated_at).toUTCString(),
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (error: unknown) {
    // Map service errors to appropriate HTTP status codes
    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage.includes("Settlement not found")) {
      return createErrorResponse("not_found", "settlement not found", 404);
    } else if (errorMessage.includes("Forbidden")) {
      return createErrorResponse("forbidden", "insufficient permissions", 403);
    } else if (errorMessage.includes("Participant not found")) {
      return createErrorResponse("not_found", "participant not found", 404);
    } else if (errorMessage.includes("Settlement is closed")) {
      return createErrorResponse("unprocessable_entity", "cannot update participant in closed settlement", 422);
    } else if (errorMessage.includes("Nickname already exists")) {
      return createErrorResponse("conflict", "nickname already exists in this settlement", 409);
    } else if (errorMessage.includes("Failed to update participant")) {
      return createErrorResponse("server_error", "failed to update participant in the database", 500);
    }

    return createErrorResponse("server_error", "An unexpected error occurred", 500);
  }
};
