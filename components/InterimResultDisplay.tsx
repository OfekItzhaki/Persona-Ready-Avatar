'use client';

import { InterimResultDisplayProps } from '@/types';

/**
 * InterimResultDisplay
 *
 * Displays interim recognition text with distinct styling during voice input.
 * Shows/hides based on recognition state and updates text in real-time.
 * Includes proper ARIA attributes for screen reader announcements.
 *
 * Requirements: 5.1, 5.4, 10.4
 */
export function InterimResultDisplay({ text, visible }: InterimResultDisplayProps) {
  // Don't render if not visible or no text
  if (!visible || !text) {
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
      <p
        className="
        text-sm italic
        text-gray-600 dark:text-gray-400
        leading-relaxed
      "
      >
        {text}
      </p>
    </div>
  );
}
