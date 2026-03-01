/**
 * Enhanced Input Component
 * 
 * A modern, accessible input field with focus effects and smooth transitions.
 * Implements glowing border effects, scale transitions, and auto-resize functionality.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import React, { useEffect, useRef, useState } from 'react';

export interface InputProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  /** Whether the input should auto-resize based on content */
  autoResize?: boolean;
  /** Maximum number of rows for auto-resize */
  maxRows?: number;
  /** Minimum number of rows for auto-resize */
  minRows?: number;
  /** Error message to display */
  error?: string;
  /** Helper text to display below input */
  helperText?: string;
  /** Label for the input */
  label?: string;
  /** Whether the input is required */
  required?: boolean;
}

/**
 * Enhanced Input Component
 * 
 * Provides a modern input field with:
 * - Glowing border effect on focus
 * - Scale transition (1.0 to 1.01) on focus
 * - 2px border with color change on focus (gray to blue)
 * - 4px focus ring with 20% opacity
 * - Auto-resize with smooth height transitions
 * - WCAG AA accessibility
 */
export const Input = React.forwardRef<HTMLTextAreaElement, InputProps>(
  (
    {
      autoResize = false,
      maxRows = 10,
      minRows = 1,
      error,
      helperText,
      label,
      required = false,
      className = '',
      onFocus,
      onBlur,
      onChange,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    // Handle auto-resize functionality
    useEffect(() => {
      if (!autoResize || !textareaRef.current) return;

      const textarea = textareaRef.current;
      
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      
      // Calculate new height based on content
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
      const minHeight = lineHeight * minRows;
      const maxHeight = lineHeight * maxRows;
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
      
      // Apply new height with smooth transition
      textarea.style.height = `${newHeight}px`;
    }, [props.value, autoResize, minRows, maxRows, textareaRef]);

    // Handle focus events
    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e);
    };

    // Generate unique ID for accessibility
    const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    // Base styles - common to all inputs
    const baseStyles = `
      w-full px-4 py-3
      bg-white dark:bg-gray-800
      text-gray-900 dark:text-gray-100
      placeholder:text-gray-400 dark:placeholder:text-gray-500
      rounded-lg
      transition-all duration-200 ease-in-out
      resize-none
      focus:outline-none
      disabled:cursor-not-allowed disabled:opacity-60
    `;

    // Border styles - changes based on focus and error state
    const borderStyles = error
      ? 'border-2 border-red-500 dark:border-red-400'
      : isFocused
      ? 'border-2 border-blue-500 dark:border-blue-400'
      : 'border-2 border-gray-300 dark:border-gray-600';

    // Focus ring styles - 4px ring with 20% opacity
    const focusRingStyles = error
      ? 'focus:ring-4 focus:ring-red-500/20 dark:focus:ring-red-400/20'
      : 'focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-400/20';

    // Scale transition on focus
    const scaleStyles = isFocused && !disabled ? 'scale-[1.01]' : 'scale-100';

    // Combine all styles
    const inputClasses = `
      ${baseStyles}
      ${borderStyles}
      ${focusRingStyles}
      ${scaleStyles}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            {label}
            {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
          </label>
        )}

        {/* Input container with glow effect */}
        <div className="relative">
          {/* Focus glow effect - appears behind the input */}
          {isFocused && !disabled && !error && (
            <div
              className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur-sm opacity-30 animate-pulse pointer-events-none"
              aria-hidden="true"
            />
          )}

          {/* Textarea input */}
          <textarea
            ref={textareaRef}
            id={inputId}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            className={inputClasses}
            rows={minRows}
            {...props}
          />
        </div>

        {/* Error message */}
        {error && (
          <p
            id={errorId}
            className="mt-2 text-sm text-red-600 dark:text-red-400 animate-in slide-in-from-top-1 duration-200"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Helper text */}
        {helperText && !error && (
          <p
            id={helperId}
            className="mt-2 text-sm text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
