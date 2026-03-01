'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/types';

/**
 * MessageBubble Component
 * 
 * Enhanced message bubble with smooth animations for chat messages.
 * 
 * Features:
 * - Slide-in animation from appropriate direction (right for user, left for agent)
 * - Fade-in animation from 0 to 1 opacity
 * - Scale animation from 0.95 to 1.0
 * - 300ms duration with spring easing cubic-bezier(0.34, 1.56, 0.64, 1)
 * - Automatic cleanup of inline styles after animation completes
 * - Hover effect with scale to 1.02
 * - Gradient background for user messages (blue-600 to blue-700)
 * - Glassmorphism background for agent messages
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

interface MessageBubbleProps {
  message: ChatMessage;
  isUser: boolean;
  children: React.ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
}

export function MessageBubble({
  message,
  isUser,
  children,
  onMouseEnter,
  onMouseLeave,
  className = '',
}: MessageBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = bubbleRef.current;
    if (!element || hasAnimated) return;

    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      // Skip animation if user prefers reduced motion
      setHasAnimated(true);
      return;
    }

    // Check if animate is available (may not be in test environments)
    if (typeof element.animate !== 'function') {
      setHasAnimated(true);
      return;
    }

    // Determine animation direction based on sender (Requirement 6.1)
    const translateX = isUser ? '20px' : '-20px';

    // Define animation keyframes (Requirements 6.1, 6.2, 6.3)
    const keyframes = [
      {
        opacity: '0',
        transform: `translateX(${translateX}) scale(0.95)`,
      },
      {
        opacity: '1',
        transform: 'translateX(0) scale(1)',
      },
    ];

    // Configure animation options (Requirement 6.4)
    const options: KeyframeAnimationOptions = {
      duration: 300, // 300ms duration
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Spring easing
      fill: 'forwards',
    };

    // Start animation using Web Animations API
    const animation = element.animate(keyframes, options);

    // Clean up inline styles after animation completes (Requirement 6.5)
    animation.onfinish = () => {
      element.style.opacity = '';
      element.style.transform = '';
      setHasAnimated(true);
    };

    // Cleanup on unmount
    return () => {
      animation.cancel();
    };
  }, [isUser, hasAnimated]);

  return (
    <div
      ref={bubbleRef}
      className={`
        flex ${isUser ? 'justify-end' : 'justify-start'}
        ${className}
      `}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={`
          max-w-[80%] rounded-2xl px-4 py-3
          transition-transform duration-200
          hover:scale-[1.02]
          ${
            isUser
              ? // User message: gradient background (Requirement 6.6)
                'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
              : // Agent message: glassmorphism background (Requirement 6.6)
                'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-gray-100 shadow-md border border-white/20'
          }
        `}
        role="article"
        aria-label={`${isUser ? 'Your' : 'Agent'} message`}
      >
        {children}
      </div>
    </div>
  );
}
