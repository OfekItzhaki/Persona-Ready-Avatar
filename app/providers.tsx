'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { NotificationToast } from '@/components/NotificationToast';
import { ThemeProvider } from '@/components/ThemeProvider';
import { OfflineNotification } from '@/components/OfflineNotification';
import HelpDialog from '@/components/HelpDialog';
import KeyboardShortcutsDialog from '@/components/KeyboardShortcutsDialog';
import { initializeBrowserFallbacks } from '@/lib/utils/browserFallbacks';

/**
 * Providers Component
 *
 * Wraps the application with necessary providers for state management.
 *
 * Features:
 * - React Query for server state management with caching
 * - Configured with default options for queries and mutations
 * - Global NotificationToast component for user feedback
 * - Global HelpDialog accessible via Ctrl+Shift+H (Cmd+Shift+H on Mac)
 * - Global KeyboardShortcutsDialog accessible via Ctrl+Shift+? (Cmd+Shift+? on Mac)
 * - Theme provider for light/dark mode support
 * - Offline notification for connectivity status
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

  // Initialize browser fallbacks on mount
  useEffect(() => {
    initializeBrowserFallbacks();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <OfflineNotification />
        <HelpDialog />
        <KeyboardShortcutsDialog />
        {children}
        <NotificationToast />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
