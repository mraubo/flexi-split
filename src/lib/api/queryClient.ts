import { QueryClient } from "@tanstack/react-query";

/**
 * Create and configure QueryClient for TanStack Query
 * Configured with sensible defaults for the FlexiSplit application
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /**
         * Stale time: Data is fresh for 5 minutes
         * After 5 minutes, data is considered stale but still cached
         */
        staleTime: 5 * 60 * 1000,

        /**
         * Cache time: Keep unused data in cache for 10 minutes
         * After 10 minutes, garbage collect the data
         */
        gcTime: 10 * 60 * 1000,

        /**
         * Retry failed requests 3 times with exponential backoff
         * Don't retry for 4xx errors (client errors)
         */
        retry: (failureCount, error: unknown) => {
          // Don't retry 4xx errors (client errors)
          const errorStatus = (error as Record<string, unknown>)?.status as number | undefined;
          if (errorStatus && errorStatus >= 400 && errorStatus < 500) {
            return false;
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },

        /**
         * Retry delay: 1000ms * 2^(attempt - 1)
         * 1s, 2s, 4s delays
         */
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        /**
         * Automatically refetch data when window regains focus
         * Important for mobile apps and browser tabs
         */
        refetchOnWindowFocus: true,

        /**
         * Don't automatically refetch when component mounts (already fresh)
         * unless data is stale
         */
        refetchOnMount: true,

        /**
         * Don't automatically refetch when reconnecting to network
         * Saves bandwidth and reduces unnecessary requests
         */
        refetchOnReconnect: true,
      },

      mutations: {
        /**
         * Retry failed mutations 1 time
         * Don't retry 4xx errors
         */
        retry: (failureCount, error: unknown) => {
          const errorStatus = (error as Record<string, unknown>)?.status as number | undefined;
          if (errorStatus && errorStatus >= 400 && errorStatus < 500) {
            return false;
          }
          return failureCount < 1;
        },

        /**
         * Retry delay for mutations: 1000ms * 2^(attempt - 1)
         */
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    },
  });
}

/**
 * Global instance of QueryClient
 * Should be created once and shared across the app
 */
let queryClient: QueryClient | null = null;

/**
 * Get or create global QueryClient instance
 * Ensures singleton pattern across the application
 */
export function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = createQueryClient();
  }
  return queryClient;
}

/**
 * Reset QueryClient (useful for testing)
 */
export function resetQueryClient(): void {
  queryClient = null;
}
