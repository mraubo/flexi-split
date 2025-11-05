import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { LoginSchema, RegisterSchema, type LoginInput, type RegisterInput } from "@/lib/validation/auth";
import { type ApiError } from "@/lib/api.ts";

/**
 * Query key factory for auth-related queries and mutations
 */
export const authQueryKeys = {
  all: () => ["auth"],
  session: () => [...authQueryKeys.all(), "session"],
  user: () => [...authQueryKeys.all(), "user"],
};

/**
 * Response types from auth endpoints
 */
interface LoginResponse {
  message: string;
  user?: {
    id: string;
    email: string;
  };
}

interface RegisterResponse {
  message: string;
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Hook for login mutation
 * Replaces manual fetch with TanStack Query mutation for:
 * - Automatic error handling
 * - Loading state management
 * - Optional callback on success/error
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LoginInput) => {
      // Validate with Zod first
      const validated = LoginSchema.parse(data);
      const response = await apiClient.post<LoginResponse>("/api/auth/login", validated);
      return response;
    },
    onSuccess: () => {
      // Invalidate session/user queries on successful login
      queryClient.invalidateQueries({ queryKey: authQueryKeys.session() });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.user() });
      
      // Redirect after a brief delay to ensure session is established
      setTimeout(() => {
        window.location.href = "/settlements";
      }, 100);
    },
  });
}

export interface RegisterMutationContext {
  statusCode: number;
  requiresEmailConfirmation: boolean;
}

/**
 * Hook for register mutation
 * Handles:
 * - Email validation conflict (409)
 * - Email confirmation required (202)
 * - Auto-login redirect (201)
 * - Field-level validation errors
 *
 * Note: Response status is handled in the component, as it needs to display
 * different UI based on whether email confirmation is required (202) or
 * auto-login is available (201).
 */
export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegisterInput) => {
      // Validate with Zod first
      const validated = RegisterSchema.parse(data);
      
      // For now, make raw fetch to capture status code
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      const responseData = await response.json();
      
      // Store status code in response for component to access
      return {
        ...responseData,
        _status: response.status,
      };
    },
    onSuccess: (data) => {
      // On successful registration, invalidate auth queries
      queryClient.invalidateQueries({ queryKey: authQueryKeys.session() });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.user() });
    },
  });
}

/**
 * Hook for logout mutation
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.post("/api/auth/logout", {});
    },
    onSuccess: () => {
      // Clear all queries on logout
      queryClient.clear();
      
      // Redirect to login
      window.location.href = "/auth/login";
    },
  });
}

/**
 * Extract field-level error from API response
 * Converts API error format to form field errors
 * @param error API error response
 * @returns Object mapping field names to error messages
 */
export function extractFieldErrors(error: ApiError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  // Handle RFC 7807 error response with details array
  if (error.details && Array.isArray(error.details)) {
    error.details.forEach((detail: any) => {
      if (detail.field && detail.message) {
        fieldErrors[detail.field] = detail.message;
      }
    });
  }

  return fieldErrors;
}

/**
 * Determine if error is a 409 Conflict (email already exists)
 */
export function isEmailConflictError(error: any): boolean {
  return error?.status === 409;
}

/**
 * Determine if registration requires email confirmation (202 Accepted)
 */
export function isEmailConfirmationRequired(statusCode: number): boolean {
  return statusCode === 202;
}

/**
 * Determine if registration includes auto-login (201 Created)
 */
export function isAutoLoginRegistration(statusCode: number): boolean {
  return statusCode === 201;
}
