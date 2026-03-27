import { QueryClient } from "@tanstack/react-query";

const STALE_MS = 5 * 60 * 1000;
const GC_MS = 10 * 60 * 1000;

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_MS,
        gcTime: GC_MS,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}
