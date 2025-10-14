import type { APIRoute } from "astro";
import { GetSettlementsQuerySchema } from "@/lib/validation/settlements.ts";
import { listSettlements } from "@/lib/services/settlements.service.ts";

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
