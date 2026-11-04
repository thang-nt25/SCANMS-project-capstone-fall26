import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api/client";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 60000,
      retry: (count, error) =>
        count < 1 && error instanceof ApiError && error.status >= 500,
    },
    mutations: { retry: false },
  },
});
