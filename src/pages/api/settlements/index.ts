import type { APIRoute } from "astro";
import { GetSettlementsQuerySchema, CreateSettlementSchema } from "@/lib/validation/settlements.ts";
import { listSettlements, createSettlement } from "@/lib/services/settlements.service.ts";

export const prerender = false;

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

    // Parse and validate query parameters
    const queryParams = Object.fromEntries(context.url.searchParams);
    const parsed = GetSettlementsQuerySchema.safeParse(queryParams);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_query",
            message: "Invalid query parameters",
            details: parsed.error.issues,
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Call service to get settlements
    const result = await listSettlements(supabase, parsed.data);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error: unknown) {
    // Log error for debugging (in production, use proper logging)
    // console.error('Error in GET /api/settlements:', error);

    // Map Supabase/PostgREST errors to appropriate HTTP status codes
    let status = 500;
    let code = "server_error";
    let message = "An unexpected error occurred";

    // Check for permission/RLS errors
    const errorMessage = error instanceof Error ? error.message : "";
    const errorCode = (error as { code?: string })?.code;
    if (errorCode === "42501" || /permission/i.test(errorMessage)) {
      status = 403;
      code = "forbidden";
      message = "insufficient permissions";
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

export const POST: APIRoute = async (context) => {
  try {
    // Get supabase client and user from context
    const { supabase, user } = context.locals;
    console.log("user", user);
    // Check authentication
    if (!user) {
      return new Response(
        JSON.stringify({
          error: "unauthorized",
        }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Parse and validate JSON body
    let payload: unknown;
    try {
      payload = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          details: { body: "invalid json" },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Validate the payload against schema
    const parsed = CreateSettlementSchema.safeParse(payload);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          details: parsed.error.issues,
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Create the settlement
    const result = await createSettlement(supabase, parsed.data, user.id);

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (error: unknown) {
    // Handle business logic errors
    const errorWithCode = error as { code?: string };
    if (errorWithCode.code === "MAX_OPEN_SETTLEMENTS") {
      return new Response(
        JSON.stringify({
          error: "business_rule_violation",
          code: "MAX_OPEN_SETTLEMENTS",
        }),
        {
          status: 422,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Handle database/supabase errors
    const errorMessage = error instanceof Error ? error.message : "";
    const errorCode = (error as { code?: string })?.code;
    if (errorCode === "42501" || /permission/i.test(errorMessage)) {
      return new Response(
        JSON.stringify({
          error: "unauthorized",
        }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Log error for debugging (in production, use proper logging)
    console.error("Error in POST /api/settlements:", error);

    // Generic server error
    return new Response(
      JSON.stringify({
        error: "internal_error",
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
};
