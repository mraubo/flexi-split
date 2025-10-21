import type { APIRoute } from "astro";
import { getExpenses, createExpense } from "@/lib/services/expenses.service";
import { GetExpensesQuerySchema, UUIDSchema, CreateExpenseCommandSchema } from "@/lib/validation/expenses";

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

    // Get and validate the settlement ID from path parameters
    const { settlement_id } = context.params;
    if (!settlement_id) {
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

    // Validate settlement_id UUID format
    const settlementIdValidation = UUIDSchema.safeParse(settlement_id);
    if (!settlementIdValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_uuid",
            message: "invalid settlement ID format",
            details: settlementIdValidation.error.issues,
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Parse and validate query parameters
    const url = new URL(context.request.url);
    const queryValidation = GetExpensesQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!queryValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "query parameter validation failed",
            details: queryValidation.error.issues,
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Call service to get expenses
    const result = await getExpenses(
      supabase,
      {
        settlement_id: settlement_id,
        ...queryValidation.data,
      },
      user.id
    );

    // Calculate ETag for conditional requests
    const body = JSON.stringify(result);
    const etag = `"${await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body)).then((buf) =>
      Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    )}"`;

    // Check for If-None-Match header
    const ifNoneMatch = context.request.headers.get("If-None-Match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
        },
      });
    }

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/json",
        ETag: etag,
        "Cache-Control": "private, no-store",
      },
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
    } else if (errorMessage.includes("Participant not found")) {
      status = 400;
      code = "invalid_participant";
      message = "specified participant does not exist in settlement";
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
    const { settlement_id } = context.params;
    if (!settlement_id) {
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

    // Validate settlement_id UUID format
    const settlementIdValidation = UUIDSchema.safeParse(settlement_id);
    if (!settlementIdValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_uuid",
            message: "invalid settlement ID format",
            details: settlementIdValidation.error.issues,
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_json",
            message: "request body must be valid JSON",
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    const bodyValidation = CreateExpenseCommandSchema.safeParse(requestBody);
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

    // Call service to create expense
    const result = await createExpense(supabase, settlement_id, bodyValidation.data, user.id);

    // Return created expense with 201 Created status
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: {
        "content-type": "application/json",
        "Cache-Control": "no-store",
      },
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
    } else if (errorMessage.includes("Settlement is closed")) {
      status = 422;
      code = "settlement_closed";
      message = "cannot add expenses to a closed settlement";
    } else if (errorMessage.includes("Payer participant does not exist")) {
      status = 422;
      code = "invalid_payer";
      message = "payer participant does not exist in settlement";
    } else if (errorMessage.includes("Some participants do not exist")) {
      status = 422;
      code = "invalid_participants";
      message = "some participants do not exist in settlement";
    } else if (errorMessage.includes("Failed to create expense")) {
      status = 500;
      code = "creation_failed";
      message = "failed to create expense";
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
