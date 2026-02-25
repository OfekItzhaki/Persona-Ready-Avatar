'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { NotificationToast } from '@/components/NotificationToast';

/**
 * Providers Component
 *
 * Wraps the application with necessary providers for state management.
 *
 * Features:
 * - React Query for server state management with caching
 * - Configured with default options for queries and mutations
 * - Global NotificationToast component for user feedback
 *
 * Configuration:
 * - staleTime: 5 minutes (Requirement 11.2)
 * - retry: 3 attempts for failed requests
 * - gcTime: 10 minutes (garbage collection time - data kept in cache after becoming stale)
 * - refetchOnWindowFocus: false (prevent unnecessary refetches)
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes (Requirement 11.2)
            gcTime: 10 * 60 * 1000, // 10 minutes (garbage collection time)
            refetchOnWindowFocus: false,
            retry: 3,
          },
          mutations: {
            retry: 1, // Retry mutations once on failure
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <NotificationToast />
    </QueryClientProvider>
  );
}
