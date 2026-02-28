'use client';

import { useOnlineStatus } from '@/lib/hooks';
import { useEffect, useState } from 'react';

/**
 * OfflineNotification Component
 * 
 * Displays a persistent notification banner when the browser loses network connectivity.
 * Automatically dismisses when connectivity is restored.
 * 
 * Features:
 * - Persistent banner display while offline
 * - Automatic dismissal when online
 * - ARIA labels for accessibility
 * - Smooth slide-in/out animations
 * - Non-intrusive positioning at top of viewport
 * 
 * Requirements: 32
 * 
 * Acceptance Criteria:
 * - Detects when browser loses network connectivity
 * - Displays persistent offline notification banner
 * - Dismisses notification when connectivity restored
 * - Includes ARIA labels for accessibility
 * - Uses navigator.onLine API
 * - Listens for online and offline events
 * 
 * @example
 * ```tsx
 * // Add to app layout or providers
 * <OfflineNotification />
 * ```
 */
export function OfflineNotification() {
  const isOnline = useOnlineStatus();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      // Show notification immediately when going offline
      setShow(true);
    } else {
      // Delay hiding to allow smooth transition
      const timer = setTimeout(() => {
        setShow(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  // Don't render anything if we should be hidden
  if (!show) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      aria-label="Network connectivity status"
      className={`
        fixed top-0 left-0 right-0 z-50
        bg-yellow-500 dark:bg-yellow-600
        text-gray-900 dark:text-gray-100
        px-4 py-3
        shadow-lg
        transition-transform duration-300 ease-in-out
        ${isOnline ? '-translate-y-full' : 'translate-y-0'}
      `}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
        {/* Offline Icon */}
        <svg
          className="w-5 h-5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
          />
        </svg>

        {/* Message */}
        <p className="text-sm font-medium">
          <span className="font-semibold">You are offline.</span>
          {' '}
          Message sending is disabled. Your messages will be queued and sent when connection is restored.
        </p>
      </div>
    </div>
  );
}
