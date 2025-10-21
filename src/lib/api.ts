import { UUIDSchema } from "@/lib/validation/settlements";

/**
 * Common API response types
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Creates a standardized error response for API endpoints
 */
export function createErrorResponse(code: string, message: string, status: number, details?: unknown): Response {
  const errorResponse: ApiErrorResponse = {
    error: {
      code,
      message,
    },
  };

  if (details) {
    errorResponse.error.details = details;
  }

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Validates authentication and returns user or error response
 */
export function validateAuthentication(user: unknown): { user: unknown; error: Response | null } {
  if (!user) {
    return { user: null, error: createErrorResponse("unauthorized", "authentication required", 401) };
  }
  return { user, error: null };
}

/**
 * Validates settlement ID from path parameters and returns validated ID
 */
export function validateSettlementId(settlement_id: string | undefined): {
  settlementId: string;
  error: Response | null;
} {
  if (!settlement_id) {
    return { settlementId: "", error: createErrorResponse("invalid_request", "settlement ID is required", 400) };
  }

  const settlementIdValidation = UUIDSchema.safeParse(settlement_id);
  if (!settlementIdValidation.success) {
    return {
      settlementId: "",
      error: createErrorResponse(
        "invalid_uuid",
        "invalid settlement ID format",
        400,
        settlementIdValidation.error ? settlementIdValidation.error.issues : undefined
      ),
    };
  }

  return { settlementId: settlement_id, error: null };
}

/**
 * Validates query parameters using a Zod schema
 */
export function validateQueryParams<T>(
  schema: { safeParse: (data: unknown) => { success: boolean; error?: { issues: unknown }; data?: T } },
  queryParams: URLSearchParams
): { response: Response | null; data: T | null } {
  const queryValidation = schema.safeParse(Object.fromEntries(queryParams));

  if (!queryValidation.success) {
    return {
      response: createErrorResponse(
        "validation_error",
        "query parameter validation failed",
        400,
        queryValidation.error ? queryValidation.error.issues : undefined
      ),
      data: null,
    };
  }

  return { response: null, data: queryValidation.data || null };
}

/**
 * Calculates ETag for conditional requests
 */
export async function calculateETag(data: unknown): Promise<string> {
  const body = JSON.stringify(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `"${hashHex}"`;
}

/**
 * Handles conditional requests with If-None-Match header
 */
export function handleConditionalRequest(ifNoneMatch: string | null, etag: string): Response | null {
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
      },
    });
  }
  return null;
}
