'use client';

import { useAppStore } from '@/lib/store/useAppStore';
import { NotificationService } from '@/lib/services/NotificationService';
import type { Notification } from '@/types';

/**
 * NotificationToast Component
 *
 * Displays notifications from the Zustand store with type-based styling and animations.
 *
 * Features:
 * - Renders notification queue with type-based styling (info, success, warning, error)
 * - Auto-dismiss after configurable duration
 * - Manual dismiss button
 * - ARIA live region for accessibility
 * - Positioned in top-right corner of viewport
 * - Animated entrance and exit
 *
 * Requirements: 10.1, 10.2
 */

interface NotificationToastProps {
  position?: 'top-right' | 'bottom-right';
  className?: string;
}

export function NotificationToast({ 
  position = 'top-right', 
  className = '' 
}: NotificationToastProps) {
  // Get notifications from Zustand store
  const notifications = useAppStore((state) => state.notifications);

  /**
   * Get styling classes based on notification type
   */
  const getTypeStyles = (type: Notification['type']) => {
    switch (type) {
      case 'info':
        return 'bg-blue-600 text-white border-blue-700';
      case 'success':
        return 'bg-green-600 text-white border-green-700';
      case 'warning':
        return 'bg-yellow-500 text-gray-900 border-yellow-600';
      case 'error':
        return 'bg-red-600 text-white border-red-700';
      default:
        return 'bg-gray-600 text-white border-gray-700';
    }
  };

  /**
   * Get icon for notification type
   */
  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'info':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      case 'success':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  /**
   * Handle manual dismiss
   */
  const handleDismiss = (id: string) => {
    NotificationService.getInstance().dismiss(id);
  };

  /**
   * Get position classes
   */
  const positionClasses = position === 'top-right' 
    ? 'top-4 right-4' 
    : 'bottom-4 right-4';

  return (
    <div
      className={`fixed ${positionClasses} z-50 space-y-2 pointer-events-none ${className}`}
      aria-live="polite"
      aria-atomic="false"
      role="region"
      aria-label="Notifications"
    >
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            pointer-events-auto
            flex items-start gap-3 
            min-w-[320px] max-w-md 
            px-4 py-3 
            rounded-lg border-2 shadow-lg
            ${getTypeStyles(notification.type)}
            animate-slide-in-right
          `}
          role="alert"
          aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
        >
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {getTypeIcon(notification.type)}
          </div>

          {/* Message */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium break-words">
              {notification.message}
            </p>
          </div>

          {/* Dismiss Button */}
          <button
            onClick={() => handleDismiss(notification.id)}
            className="flex-shrink-0 ml-2 hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 rounded transition-opacity"
            aria-label="Dismiss notification"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
