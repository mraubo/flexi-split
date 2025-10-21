import type { APIRoute } from "astro";
import { UUIDSchema, UpdateSettlementSchema } from "@/lib/validation/settlements.ts";
import {
  deleteSettlementSoft,
  getSettlementById,
  checkAccessOrExistence,
  updateSettlementTitle,
} from "@/lib/services/settlements.service.ts";

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

    // User has access, fetch the settlement details
    const settlement = await getSettlementById(supabase, id);

    return new Response(JSON.stringify(settlement), {
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

export const PUT: APIRoute = async (context) => {
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

    // Parse and validate request body
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

    // Validate the request body against the schema
    const bodyValidation = UpdateSettlementSchema.safeParse(requestBody);
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

    // Update the settlement title
    const updatedSettlement = await updateSettlementTitle(supabase, id, bodyValidation.data.title, user.id);

    return new Response(JSON.stringify(updatedSettlement), {
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
      message = "settlement is not open";
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
