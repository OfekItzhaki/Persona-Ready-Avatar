/**
 * Enhanced Button Component
 * 
 * A modern, accessible button with multiple variants, sizes, and states.
 * Implements smooth transitions, loading states, and WCAG AA accessibility.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
 */

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Size of the button */
  size?: 'sm' | 'md' | 'lg';
  /** Loading state - shows spinner and disables interaction */
  loading?: boolean;
  /** Icon to display in the button */
  icon?: React.ReactNode;
  /** Position of the icon */
  iconPosition?: 'left' | 'right';
  /** Whether button should take full width */
  fullWidth?: boolean;
  /** Button content */
  children: React.ReactNode;
}

/**
 * Loading spinner component
 */
const Spinner: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
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
  );
};

/**
 * Enhanced Button Component
 * 
 * Provides a modern button with:
 * - Four variants: primary, secondary, ghost, danger
 * - Three sizes: sm, md, lg
 * - Loading state with spinner
 * - Disabled state with reduced opacity
 * - Icon support (left/right placement)
 * - Full-width layout option
 * - Smooth hover, active, and focus transitions
 * - WCAG AA accessibility with focus rings
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      children,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Determine if button should be non-interactive
    const isDisabled = disabled || loading;

    // Base styles - common to all buttons
    const baseStyles = `
      inline-flex items-center justify-center
      font-medium rounded-lg
      transition-all duration-200 ease-in-out
      focus:outline-none focus:ring-4
      disabled:cursor-not-allowed
      ${fullWidth ? 'w-full' : ''}
    `;

    // Size styles
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2.5 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-2.5',
    };

    // Variant styles with hover, active, focus, and disabled states
    const variantStyles = {
      primary: `
        bg-blue-600 text-white
        hover:bg-blue-700 hover:shadow-lg hover:scale-[1.02]
        active:bg-blue-800 active:scale-[0.98]
        focus:ring-blue-500/50
        disabled:bg-blue-400 disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none
      `,
      secondary: `
        bg-gray-200 text-gray-900
        dark:bg-gray-700 dark:text-gray-100
        hover:bg-gray-300 hover:shadow-md hover:scale-[1.02]
        dark:hover:bg-gray-600
        active:bg-gray-400 active:scale-[0.98]
        dark:active:bg-gray-500
        focus:ring-gray-500/50
        disabled:bg-gray-100 disabled:text-gray-400 disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none
        dark:disabled:bg-gray-800 dark:disabled:text-gray-600
      `,
      ghost: `
        bg-transparent text-gray-700
        dark:text-gray-300
        hover:bg-gray-100 hover:scale-[1.02]
        dark:hover:bg-gray-800
        active:bg-gray-200 active:scale-[0.98]
        dark:active:bg-gray-700
        focus:ring-gray-500/30
        disabled:text-gray-400 disabled:opacity-60 disabled:hover:scale-100 disabled:hover:bg-transparent
        dark:disabled:text-gray-600
      `,
      danger: `
        bg-red-600 text-white
        hover:bg-red-700 hover:shadow-lg hover:scale-[1.02]
        active:bg-red-800 active:scale-[0.98]
        focus:ring-red-500/50
        disabled:bg-red-400 disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none
      `,
    };

    // Combine all styles
    const buttonClasses = `
      ${baseStyles}
      ${sizeStyles[size]}
      ${variantStyles[variant]}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={buttonClasses}
        aria-busy={loading}
        aria-disabled={isDisabled}
        {...props}
      >
        {/* Loading spinner or left icon */}
        {loading ? (
          <Spinner size={size} />
        ) : icon && iconPosition === 'left' ? (
          <span className="flex-shrink-0" aria-hidden="true">
            {icon}
          </span>
        ) : null}

        {/* Button text */}
        <span>{children}</span>

        {/* Right icon (only if not loading) */}
        {!loading && icon && iconPosition === 'right' && (
          <span className="flex-shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
