import type { APIRoute } from "astro";
import {
  CloseSettlementParamsSchema,
  CloseSettlementBodySchema,
  CloseSettlementResponseSchema,
  IdempotencyKeySchema,
} from "@/lib/validation/settlements.ts";
import { finalizeSettlement } from "@/lib/services/settlements/finalizeSettlement.service.ts";
import { checkAccessOrExistence, checkSettlementParticipation } from "@/lib/services/settlements.service.ts";

export const prerender = false;

export const POST: APIRoute = async (context) => {
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
    const paramsValidation = CloseSettlementParamsSchema.safeParse({ id });
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

    // Parse and validate request body (should be empty for close operation)
    let requestBody: unknown;
    try {
      requestBody = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_json",
            message: "invalid JSON in request body",
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Validate the request body against the schema (should be empty object)
    const bodyValidation = CloseSettlementBodySchema.safeParse(requestBody);
    if (!bodyValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "request body validation failed",
            details: bodyValidation.error.issues,
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Validate Idempotency-Key header if provided
    const idempotencyKey = context.request.headers.get("Idempotency-Key");
    if (idempotencyKey) {
      const keyValidation = IdempotencyKeySchema.safeParse(idempotencyKey);
      if (!keyValidation.success) {
        return new Response(
          JSON.stringify({
            error: {
              code: "invalid_idempotency_key",
              message: "invalid Idempotency-Key header format",
              details: keyValidation.error.issues,
            },
          }),
          {
            status: 400,
            headers: { "content-type": "application/json" },
          }
        );
      }
    }

    // Check access and existence to properly distinguish 403 vs 404
    const accessCheck = await checkAccessOrExistence(supabase, id, user.id);

    if (!accessCheck.exists) {
      // Settlement doesn't exist - return 404
      return new Response(
        JSON.stringify({
          error: {
            code: "not_found",
            message: "settlement not found",
          },
        }),
        {
          status: 404,
          headers: { "content-type": "application/json" },
        }
      );
    }

    if (!accessCheck.accessible) {
      // Settlement exists but user doesn't have access - return 403
      return new Response(
        JSON.stringify({
          error: {
            code: "forbidden",
            message: "insufficient permissions",
          },
        }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Check settlement status for idempotency (if already closed, return success)
    const participationCheck = await checkSettlementParticipation(supabase, id, user.id);
    if (participationCheck.status === "closed") {
      // Settlement is already closed, check if we have a snapshot to return
      const { data: snapshot, error: snapshotError } = await supabase
        .from("settlement_snapshots")
        .select("balances, transfers, created_at")
        .eq("settlement_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!snapshotError && snapshot) {
        // Return the existing closed settlement data
        const result = {
          id,
          status: "closed" as const,
          closed_at: snapshot.created_at,
          balances: snapshot.balances as Record<string, number>,
          transfers: snapshot.transfers as { from: string; to: string; amount_cents: number }[],
        };

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
    }

    // User has access and settlement is open, finalize the settlement
    const result = await finalizeSettlement(supabase, id, user.id);

    // Validate response against schema before sending
    const responseValidation = CloseSettlementResponseSchema.safeParse(result);
    if (!responseValidation.success) {
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
    } else if (errorMessage.includes("settlement not found or not authorized")) {
      status = 403;
      code = "forbidden";
      message = "insufficient permissions";
    } else if (errorMessage.includes("already closed")) {
      status = 422;
      code = "unprocessable_entity";
      message = "settlement is already closed";
    } else if (errorMessage.includes("Settlement has no participants")) {
      status = 422;
      code = "unprocessable_entity";
      message = "settlement has no participants";
    } else if (errorMessage.includes("Failed to calculate settlement balances")) {
      status = 500;
      code = "server_error";
      message = "failed to calculate settlement balances";
    } else if (errorMessage.includes("Failed to finalize settlement")) {
      status = 500;
      code = "server_error";
      message = "failed to finalize settlement";
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
