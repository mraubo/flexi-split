import type { APIRoute } from "astro";
import { listParticipants } from "@/lib/services/participants.service";
import { GetParticipantsQuerySchema } from "@/lib/validation/settlements";
import {
  validateAuthentication,
  validateSettlementId,
  validateQueryParams,
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

    // Validate query parameters
    const url = new URL(context.request.url);
    const { response: queryError, data: queryData } = validateQueryParams(GetParticipantsQuerySchema, url.searchParams);
    if (queryError) return queryError;

    // Call service to get participants
    const result = await listParticipants(
      supabase,
      validatedSettlementId,
      queryData || {},
      (validatedUser as { id: string }).id
    );

    // Calculate ETag for conditional requests
    const etag = await calculateETag(result);

    // Check for conditional request
    const ifNoneMatch = context.request.headers.get("If-None-Match");
    const conditionalResponse = handleConditionalRequest(ifNoneMatch, etag);
    if (conditionalResponse) return conditionalResponse;

    // Return successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "content-type": "application/json",
        ETag: etag,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: unknown) {
    // Map service errors to appropriate HTTP status codes
    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage.includes("Settlement not found")) {
      return createErrorResponse("not_found", "settlement not found", 404);
    } else if (errorMessage.includes("Forbidden")) {
      return createErrorResponse("forbidden", "insufficient permissions", 403);
    } else if (errorMessage.includes("Failed to fetch participants")) {
      return createErrorResponse("server_error", "failed to retrieve participants from the database", 500);
    }

    return createErrorResponse("server_error", "An unexpected error occurred", 500);
  }
};
