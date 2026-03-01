/**
 * GlassCard Component
 * 
 * A modern card component with glassmorphism effects (frosted glass appearance).
 * Features backdrop-filter blur, semi-transparent backgrounds, subtle borders,
 * and configurable shadow depths with smooth transitions.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import React, { useEffect, useState } from 'react';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Blur intensity level */
  blur?: 'sm' | 'md' | 'lg';
  /** Background opacity (0-1) */
  opacity?: number;
  /** Whether to show subtle border */
  border?: boolean;
  /** Shadow depth */
  shadow?: 'sm' | 'md' | 'lg' | 'xl';
  /** Padding size */
  padding?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Card content */
  children: React.ReactNode;
}

/**
 * GlassCard Component
 * 
 * Provides a glassmorphism card with:
 * - Configurable backdrop-filter blur (sm: 4px, md: 12px, lg: 24px)
 * - Semi-transparent backgrounds with configurable opacity
 * - Subtle border with rgba(255, 255, 255, 0.18)
 * - Configurable shadow depths (sm, md, lg, xl)
 * - Smooth transitions (0.3s ease-in-out) for effect changes
 * - Fallback for browsers without backdrop-filter support
 */
export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      blur = 'md',
      opacity = 0.8,
      border = true,
      shadow = 'lg',
      padding = 'md',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    // Validate opacity is between 0 and 1
    const validOpacity = Math.max(0, Math.min(1, opacity));

    // Check if backdrop-filter is supported
    const [supportsBackdropFilter, setSupportsBackdropFilter] = useState(true);

    useEffect(() => {
      // Feature detection for backdrop-filter
      if (typeof window !== 'undefined' && typeof CSS !== 'undefined' && CSS.supports) {
        const supported = CSS.supports('backdrop-filter', 'blur(1px)') || 
                         CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
        setSupportsBackdropFilter(supported);
      }
    }, []);

    // Blur level mapping (sm: 4px, md: 12px, lg: 24px)
    const blurStyles = {
      sm: 'backdrop-blur-sm', // 4px
      md: 'backdrop-blur-md', // 12px
      lg: 'backdrop-blur-lg', // 24px
    };

    // Shadow depth mapping
    const shadowStyles = {
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-xl',
    };

    // Padding size mapping
    const paddingStyles = {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    // Base styles - common to all glass cards
    const baseStyles = `
      rounded-lg
      transition-all duration-300 ease-in-out
    `;

    // Background with opacity - increase opacity if backdrop-filter not supported
    const fallbackOpacity = supportsBackdropFilter ? validOpacity : Math.min(validOpacity + 0.2, 1);
    const backgroundStyles = `
      bg-white/[${fallbackOpacity}]
      dark:bg-gray-800/[${fallbackOpacity}]
    `;

    // Border styles (subtle white border)
    const borderStyles = border
      ? 'border border-white/[0.18] dark:border-white/[0.18]'
      : '';

    // Combine all styles
    const cardClasses = `
      ${baseStyles}
      ${supportsBackdropFilter ? blurStyles[blur] : ''}
      ${backgroundStyles}
      ${borderStyles}
      ${shadowStyles[shadow]}
      ${paddingStyles[padding]}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    return (
      <div
        ref={ref}
        className={cardClasses}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
