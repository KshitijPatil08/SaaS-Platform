import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min cache (matches backend Redis cache)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
