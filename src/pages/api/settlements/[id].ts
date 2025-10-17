import type { APIRoute } from "astro";
import { UUIDSchema } from "@/lib/validation/settlements.ts";
import { deleteSettlementSoft } from "@/lib/services/settlements.service.ts";

export const prerender = false;

export const DELETE: APIRoute = async (context) => {
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

    // Validate UUID format
    const uuidValidation = UUIDSchema.safeParse(id);
    if (!uuidValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_uuid",
            message: "invalid settlement ID format",
            details: uuidValidation.error.issues,
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Call service to perform soft delete
    await deleteSettlementSoft(supabase, id, user.id);

    // Return 204 No Content on success (no body, no Content-Length header)
    return new Response(null, {
      status: 204,
      headers: {},
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
    } else if (errorMessage.includes("Unprocessable Content")) {
      status = 422;
      code = "unprocessable_content";
      message = "settlement is not closed";
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
