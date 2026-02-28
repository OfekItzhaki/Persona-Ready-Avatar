'use client';

import { InterimResultDisplayProps } from '@/types';

/**
 * InterimResultDisplay
 *
 * Displays interim recognition text with distinct styling during voice input.
 * Shows/hides based on recognition state and updates text in real-time.
 * Includes proper ARIA attributes for screen reader announcements.
 * Shows processing indicator when finalizing recognition.
 *
 * Requirements: 5.1, 5.4, 10.4, 15.3
 */
export function InterimResultDisplay({ text, visible, isProcessing = false }: InterimResultDisplayProps) {
  // Don't render if not visible
  if (!visible) {
    return null;
  }

  return (
    <div
      className="
        px-4 py-3 rounded-lg
        bg-gray-100 dark:bg-gray-800
        border border-gray-300 dark:border-gray-600
        transition-all duration-200
      "
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {isProcessing ? (
        // Processing indicator (Requirement 15.3)
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 animate-spin text-yellow-600 dark:text-yellow-500"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-sm italic text-gray-600 dark:text-gray-400">
            Processing speech...
          </p>
        </div>
      ) : text ? (
        // Interim text display (Requirement 5.4)
        <p
          className="
          text-sm italic
          text-gray-600 dark:text-gray-400
          leading-relaxed
        "
        >
          {text}
        </p>
      ) : null}
    </div>
  );
}
