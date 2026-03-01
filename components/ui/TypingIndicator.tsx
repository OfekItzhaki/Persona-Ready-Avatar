'use client';

import { useEffect, useState } from 'react';

/**
 * TypingIndicator Component
 * 
 * Elegant pulsing animation for typing dots that indicates the agent is processing.
 * 
 * Features:
 * - Elegant pulsing animation for typing dots
 * - GPU-accelerated properties for smooth animation
 * - Respects prefers-reduced-motion setting
 * - Glassmorphism background matching agent messages
 * 
 * Requirements: 6.7
 */

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className = '' }: TypingIndicatorProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return (
    <div className={`flex justify-start ${className}`}>
      <div
        className="max-w-[80%] rounded-2xl px-4 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-gray-100 shadow-md border border-white/20"
        role="status"
        aria-label="Agent is typing"
        aria-live="polite"
      >
        <div className="flex items-center gap-1">
          <span className="text-sm">Agent is typing</span>
          <div className="flex gap-1 ml-1">
            {/* Three pulsing dots with staggered animation delays */}
            <span
              className={`w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full ${
                prefersReducedMotion ? '' : 'animate-bounce'
              }`}
              style={prefersReducedMotion ? {} : { animationDelay: '0ms' }}
              aria-hidden="true"
            ></span>
            <span
              className={`w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full ${
                prefersReducedMotion ? '' : 'animate-bounce'
              }`}
              style={prefersReducedMotion ? {} : { animationDelay: '150ms' }}
              aria-hidden="true"
            ></span>
            <span
              className={`w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full ${
                prefersReducedMotion ? '' : 'animate-bounce'
              }`}
              style={prefersReducedMotion ? {} : { animationDelay: '300ms' }}
              aria-hidden="true"
            ></span>
          </div>
        </div>
      </div>
    </div>
  );
}
