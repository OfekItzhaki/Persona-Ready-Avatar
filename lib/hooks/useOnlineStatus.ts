import { useEffect, useState } from 'react';
import { logger } from '../logger';

/**
 * useOnlineStatus Hook
 * 
 * Detects browser network connectivity status using navigator.onLine API.
 * Listens for online and offline events to track connectivity changes.
 * 
 * Features:
 * - Real-time connectivity detection
 * - Event-driven updates
 * - SSR-safe (returns true during server-side rendering)
 * - Automatic cleanup of event listeners
 * 
 * Requirements: 32
 * 
 * @returns boolean - true if online, false if offline
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isOnline = useOnlineStatus();
 *   
 *   return (
 *     <div>
 *       {isOnline ? 'Connected' : 'Offline'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOnlineStatus(): boolean {
  // Initialize with navigator.onLine if available (client-side)
  // Default to true for SSR
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true; // Assume online during SSR
  });

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') {
      return;
    }

    /**
     * Handle online event
     */
    const handleOnline = () => {
      logger.info('Network connection restored', {
        component: 'useOnlineStatus',
        operation: 'handleOnline',
      });
      setIsOnline(true);
    };

    /**
     * Handle offline event
     */
    const handleOffline = () => {
      logger.warn('Network connection lost', {
        component: 'useOnlineStatus',
        operation: 'handleOffline',
      });
      setIsOnline(false);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Log initial status
    logger.info('Online status hook initialized', {
      component: 'useOnlineStatus',
      operation: 'useEffect',
      initialStatus: navigator.onLine ? 'online' : 'offline',
    });

    // Cleanup event listeners on unmount
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
