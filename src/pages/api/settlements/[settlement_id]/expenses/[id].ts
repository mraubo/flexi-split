import type { APIRoute } from "astro";
import { deleteExpense, readExpenseWithParticipants, updateExpense } from "@/lib/services/expenses.service";
import {
  GetExpenseParamsSchema,
  DeleteExpenseParamsSchema,
  UpdateExpenseParamsSchema,
  UpdateExpenseCommandSchema,
} from "@/lib/validation/expenses";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  // Extract parameters for logging in case of errors
  const { settlement_id, id } = context.params;
  const { supabase, user } = context.locals;

  try {
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

    if (!settlement_id || !id) {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_request",
            message: "settlement ID and expense ID are required",
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Validate UUID format for both settlement_id and id
    const paramsValidation = GetExpenseParamsSchema.safeParse({
      settlement_id,
      id,
    });

    if (!paramsValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_uuid",
            message: "invalid settlement ID or expense ID format",
            details: paramsValidation.error.issues,
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Call service to read expense with participants
    const expenseDetails = await readExpenseWithParticipants(
      supabase,
      paramsValidation.data.settlement_id,
      paramsValidation.data.id,
      user.id
    );

    // Calculate ETag for conditional requests
    const body = JSON.stringify(expenseDetails);
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
    } else if (errorMessage.includes("Expense not found")) {
      status = 404;
      code = "not_found";
      message = "expense not found";
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

export const PUT: APIRoute = async (context) => {
  const { settlement_id, id } = context.params;
  const { supabase, user } = context.locals;

  try {
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

    if (!settlement_id || !id) {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_request",
            message: "settlement ID and expense ID are required",
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Validate UUID format for both settlement_id and id
    const paramsValidation = UpdateExpenseParamsSchema.safeParse({
      settlement_id,
      id,
    });

    if (!paramsValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_uuid",
            message: "invalid settlement ID or expense ID format",
            details: paramsValidation.error.issues,
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

    const bodyValidation = UpdateExpenseCommandSchema.safeParse(requestBody);
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

    // Call service to update expense
    const updatedExpense = await updateExpense(
      supabase,
      paramsValidation.data.settlement_id,
      paramsValidation.data.id,
      bodyValidation.data,
      user.id
    );

    // Return updated expense with 200 OK status
    return new Response(JSON.stringify(updatedExpense), {
      status: 200,
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
    } else if (errorMessage.includes("Expense not found")) {
      status = 404;
      code = "not_found";
      message = "expense not found";
    } else if (errorMessage.includes("Settlement is closed")) {
      status = 422;
      code = "settlement_closed";
      message = "cannot update expense in a closed settlement";
    } else if (errorMessage.includes("Payer participant does not exist")) {
      status = 422;
      code = "invalid_payer";
      message = "payer participant does not exist in settlement";
    } else if (errorMessage.includes("Some participants do not exist")) {
      status = 422;
      code = "invalid_participants";
      message = "some participants do not exist in settlement";
    } else if (errorMessage.includes("Failed to update expense")) {
      status = 500;
      code = "update_failed";
      message = "failed to update expense";
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

/**
 * DELETE /settlements/{settlement_id}/expenses/{id}
 *
 * Deletes an expense from a settlement. Only allowed when settlement status is 'open'.
 * Returns 204 No Content on success.
 */
export const DELETE: APIRoute = async (context) => {
  // Extract parameters for logging in case of errors
  const { settlement_id, id } = context.params;
  const { supabase, user } = context.locals;

  try {
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
    if (!settlement_id || !id) {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_request",
            message: "settlement ID and expense ID are required",
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Validate UUID format for both settlement_id and id
    const paramsValidation = DeleteExpenseParamsSchema.safeParse({
      settlement_id,
      id,
    });

    if (!paramsValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "invalid_uuid",
            message: "invalid settlement ID or expense ID format",
            details: paramsValidation.error.issues,
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Call service to delete expense
    const result = await deleteExpense(
      supabase,
      paramsValidation.data.settlement_id,
      paramsValidation.data.id,
      user.id
    );

    // Map service result to HTTP response
    switch (result.type) {
      case "ok":
        // Successful deletion - return 204 No Content
        return new Response(null, { status: 204 });

      case "not_found":
        return new Response(
          JSON.stringify({
            error: {
              code: "not_found",
              message: "expense not found or does not belong to the settlement",
            },
          }),
          {
            status: 404,
            headers: { "content-type": "application/json" },
          }
        );

      case "forbidden":
        return new Response(
          JSON.stringify({
            error: {
              code: "forbidden",
              message: "insufficient permissions to delete this expense",
            },
          }),
          {
            status: 403,
            headers: { "content-type": "application/json" },
          }
        );

      case "closed":
        return new Response(
          JSON.stringify({
            error: {
              code: "settlement_closed",
              message: "cannot delete expense from a closed settlement",
            },
          }),
          {
            status: 422,
            headers: { "content-type": "application/json" },
          }
        );

      case "error":
        // Log the error for debugging (in production, this would go to a logging service)
        console.error("Error deleting expense:", result.message);

        return new Response(
          JSON.stringify({
            error: {
              code: "server_error",
              message: "an unexpected error occurred while deleting the expense",
            },
          }),
          {
            status: 500,
            headers: { "content-type": "application/json" },
          }
        );

      default:
        // This should never happen, but TypeScript requires it
        return new Response(
          JSON.stringify({
            error: {
              code: "server_error",
              message: "an unexpected error occurred",
            },
          }),
          {
            status: 500,
            headers: { "content-type": "application/json" },
          }
        );
    }
  } catch (error: unknown) {
    // Log unexpected errors with context for debugging and audit trail
    const errorMessage = error instanceof Error ? error.message : "unknown error";
    const errorDetails = {
      endpoint: "DELETE /settlements/[settlement_id]/expenses/[id]",
      settlement_id: settlement_id,
      expense_id: id,
      user_id: user?.id,
      timestamp: new Date().toISOString(),
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    };

    console.error("Unexpected error in DELETE expense endpoint:", errorDetails);

    // In production, this would be sent to a logging service like Sentry, CloudWatch, etc.
    // For now, we log to console with structured format

    return new Response(
      JSON.stringify({
        error: {
          code: "server_error",
          message: "an unexpected error occurred while deleting the expense",
          details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
        },
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
};
