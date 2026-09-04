import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Fix: Reduced from 5 minutes to 30 seconds.
      // At 5 min, stale profile/permission data persists through role changes,
      // plan upgrades, and MFA enrollment — users see outdated UI state for too long.
      // 30s balances freshness with avoiding unnecessary refetches on every focus.
      staleTime: 30 * 1000, // 30 seconds
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
