import type { APIRoute } from "astro";
import { GetSettlementSnapshotParamsSchema, SettlementSnapshotResponseSchema } from "@/lib/validation/settlements.ts";
import { getSettlementSnapshot } from "@/lib/services/settlements.service.ts";

export const prerender = false;

/**
 * GET /settlements/{settlement_id}/snapshot
 *
 * Retrieves the settlement calculation results (balances and transfers) for a closed settlement.
 * Only accessible to settlement participants (owner or participants in the settlement).
 *
 * @param context - Astro API route context
 * @returns SettlementSnapshotDTO with balances and transfers
 */
export const GET: APIRoute = async (context) => {
  try {
    // Get supabase client and user from context
    const { supabase, user } = context.locals;

    // Check authentication
    if (!user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "unauthorized",
            message: "authentication required",
          },
        }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Get and validate the settlement ID from path parameters
    const { id } = context.params;
    if (!id) {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_request",
            message: "settlement ID is required",
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Validate UUID format for settlement ID
    const paramsValidation = GetSettlementSnapshotParamsSchema.safeParse({ id });
    if (!paramsValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_uuid",
            message: "invalid settlement ID format",
            details: paramsValidation.error.issues,
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Get settlement snapshot using service function
    const result = await getSettlementSnapshot(supabase, id, user.id);

    // Validate response against schema before sending
    const responseValidation = SettlementSnapshotResponseSchema.safeParse(result);
    if (!responseValidation.success) {
      console.error("[ERROR] Response validation failed:", responseValidation.error);
      return new Response(
        JSON.stringify({
          error: {
            code: "server_error",
            message: "response validation failed",
          },
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error: unknown) {
    // Map service errors to appropriate HTTP status codes
    let status = 500;
    let code = "server_error";
    let message = "An unexpected error occurred";

    const errorMessage = error instanceof Error ? error.message : "";

    if (errorMessage.includes("Settlement not found")) {
      status = 404;
      code = "not_found";
      message = "settlement not found";
    } else if (errorMessage.includes("Forbidden")) {
      status = 403;
      code = "forbidden";
      message = "insufficient permissions";
    } else if (errorMessage.includes("Unprocessable Entity")) {
      status = 422;
      code = "unprocessable_entity";
      message = "settlement is not closed";
    } else if (errorMessage.includes("Snapshot not found")) {
      status = 500;
      code = "server_error";
      message = "snapshot data not found for closed settlement";
    }

    return new Response(
      JSON.stringify({
        error: {
          code,
          message,
        },
      }),
      {
        status,
        headers: { "content-type": "application/json" },
      }
    );
  }
};
