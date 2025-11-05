import type { ApiError } from "@/types";

/**
 * Typed HTTP client for frontend API calls
 * Handles RFC 7807 error responses and provides type-safe request/response handling
 */

interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
  pointer?: string;
}

interface ApiErrorBody {
  error: ApiErrorDetail;
}

interface ApiSuccessBody<T> {
  data: T;
}

type ApiResponse<T> = ApiSuccessBody<T> | ApiErrorBody;

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a typed API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const body = await response.json() as ApiResponse<T>;

    if (!response.ok) {
      const errorBody = body as ApiErrorBody;
      const error: ApiError = {
        status: response.status,
        code: errorBody.error?.code || "unknown_error",
        message: errorBody.error?.message || "An error occurred",
        details: errorBody.error?.details,
      };

      const errorWithStatus = error as ApiError & { status: number };
      errorWithStatus.status = response.status;

      throw errorWithStatus;
    }

    const successBody = body as ApiSuccessBody<T>;
    return successBody.data;
  }

  /**
   * GET request
   */
  get<T>(endpoint: string, options: Omit<RequestInit, "method"> = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "GET",
    });
  }

  /**
   * POST request
   */
  post<T>(
    endpoint: string,
    body?: unknown,
    options: Omit<RequestInit, "method" | "body"> = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  put<T>(
    endpoint: string,
    body?: unknown,
    options: Omit<RequestInit, "method" | "body"> = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  delete<T>(
    endpoint: string,
    options: Omit<RequestInit, "method"> = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  }

  /**
   * PATCH request
   */
  patch<T>(
    endpoint: string,
    body?: unknown,
    options: Omit<RequestInit, "method" | "body"> = {}
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

/**
 * Singleton instance of API client
 * Used on browser side for API calls
 */
export const apiClient = new ApiClient();
