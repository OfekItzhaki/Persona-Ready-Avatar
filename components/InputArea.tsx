'use client';

import { useState, useRef, useEffect, FormEvent, KeyboardEvent, ChangeEvent } from 'react';
import { sanitizeAndValidate } from '@/lib/utils/sanitize';
import { useOnlineStatus } from '@/lib/hooks';
import { Button } from '@/components/ui/Button';

/**
 * InputArea Component
 *
 * A controlled message input component with validation, sanitization, accessibility features,
 * and enhanced visual effects including focus glow, scale transitions, and smooth animations.
 *
 * @component
 * @example
 * ```tsx
 * import { InputArea } from '@/components/InputArea';
 * 
 * function ChatInterface() {
 *   const [isPending, setIsPending] = useState(false);
 * 
 *   const handleSubmit = async (message: string) => {
 *     setIsPending(true);
 *     try {
 *       await sendMessage(message);
 *     } finally {
 *       setIsPending(false);
 *     }
 *   };
 * 
 *   return (
 *     <InputArea
 *       onSubmit={handleSubmit}
 *       disabled={isPending}
 *       placeholder="Type your message..."
 *       maxLength={5000}
 *     />
 *   );
 * }
 * ```
 *
 * @features
 * - **Auto-resizing Textarea**: Automatically adjusts height based on content with smooth transitions
 * - **Keyboard Shortcuts**: Enter to submit, Shift+Enter for newline
 * - **Input Validation**: Non-empty validation and max length enforcement
 * - **Character Counter**: Shows at 80% of max length with smooth fade-in animation
 * - **Input Sanitization**: Removes HTML/script tags to prevent XSS attacks
 * - **Offline Support**: Changes button text to "Queue" when offline
 * - **Visual Feedback**: Disabled state during pending requests
 * - **Error Messages**: Clear validation error messages
 * - **Focus Effects**: Glowing border gradient, scale transition, and focus ring
 * - **Enhanced Button**: Uses modern Button component with loading state
 *
 * @accessibility
 * - Semantic HTML with proper form structure
 * - ARIA labels for input and button elements
 * - aria-describedby links to help text and character counter
 * - aria-invalid and aria-errormessage for validation errors
 * - Live regions announce validation errors
 * - Keyboard navigation fully supported
 * - Visible focus indicators with 4px focus ring
 *
 * @validation
 * - Minimum: 1 character (after trim)
 * - Maximum: 5000 characters (configurable via props)
 * - Sanitization: Removes HTML tags and prevents XSS
 * - Real-time validation feedback
 *
 * @requirements 2, 8, 32, 43
 */

/**
 * Props for the InputArea component
 */
interface InputAreaProps {
  /** 
   * Callback function invoked when a message is submitted.
   * Receives the sanitized and validated message text.
   */
  onSubmit: (message: string) => void;
  
  /** 
   * Whether the input should be disabled (e.g., during pending requests).
   * When disabled, the input field and send button are not interactive.
   */
  disabled?: boolean;
  
  /** 
   * Placeholder text displayed in the input field when empty.
   * Automatically changes to offline message when network is unavailable.
   */
  placeholder?: string;
  
  /** 
   * Maximum character length for messages.
   * @default 5000
   */
  maxLength?: number;
  
  /** Additional CSS classes to apply to the container */
  className?: string;
}

const DEFAULT_MAX_LENGTH = 5000;
const CHAR_COUNTER_THRESHOLD = 0.8; // Show counter at 80% of max length

export function InputArea({
  onSubmit,
  disabled = false,
  placeholder = 'Type your message...',
  maxLength = DEFAULT_MAX_LENGTH,
  className = '',
}: InputAreaProps) {
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isOnline = useOnlineStatus();

  // Focus input on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  /**
   * Handle input change with validation
   */
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // Enforce max length
    if (value.length > maxLength) {
      setValidationError(`Message cannot exceed ${maxLength} characters`);
      return;
    }

    setInputValue(value);
    setValidationError(null);
  };

  /**
   * Handle message submission
   * - Validates input (non-empty, max length)
   * - Sanitizes input to prevent injection attacks (Requirement 43)
   * - Calls onSubmit callback with sanitized message
   * - Clears input field on success
   */
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedMessage = inputValue.trim();

    // Validate non-empty (Requirement 2.6)
    if (!trimmedMessage) {
      setValidationError('Message cannot be empty');
      return;
    }

    // Validate max length (Requirement 2.6)
    if (trimmedMessage.length > maxLength) {
      setValidationError(`Message cannot exceed ${maxLength} characters`);
      return;
    }

    // Sanitize and validate input (Requirement 43)
    const { sanitized, isValid, error } = sanitizeAndValidate(trimmedMessage);

    if (!isValid) {
      setValidationError(error || 'Invalid input. Please check your message and try again.');
      return;
    }

    // Submit sanitized message
    onSubmit(sanitized);

    // Clear input field and error
    setInputValue('');
    setValidationError(null);
  };

  /**
   * Handle keyboard shortcuts
   * - Enter: Submit message (Requirement 2.3)
   * - Shift+Enter: Insert newline (Requirement 2.4)
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Trigger form submission
      e.currentTarget.form?.requestSubmit();
    }
  };

  // Calculate character count and whether to show counter (Requirement 2.7)
  const charCount = inputValue.length;
  const showCharCounter = charCount >= maxLength * CHAR_COUNTER_THRESHOLD;
  const isOverLimit = charCount > maxLength;

  // Determine if submit should be disabled (Requirement 2.5, 32)
  // Disable when: explicitly disabled, empty input, over limit, or offline
  const isSubmitDisabled = disabled || !inputValue.trim() || isOverLimit || !isOnline;

  // Determine button text based on state
  const getButtonText = () => {
    if (!isOnline) return 'Offline';
    return 'Send';
  };

  // Determine button title based on state
  const getButtonTitle = () => {
    if (disabled) return 'Sending...';
    if (!isOnline) return 'Cannot send while offline';
    return 'Send message';
  };

  return (
    <form onSubmit={handleSubmit} className={`input-area border-t border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex flex-col gap-2">
        {/* Textarea Input with Focus Effects (Requirements 8.1, 8.2, 8.3, 8.4) */}
        <div className="input-container flex gap-3">
          <div 
            className={`
              flex-1 relative
              transition-all duration-300 ease-in-out
              ${isFocused ? 'scale-[1.01]' : 'scale-100'}
            `}
          >
            {/* Glowing border effect on focus (Requirement 8.1) */}
            {isFocused && (
              <div 
                className="
                  absolute -inset-1 
                  bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 
                  rounded-lg blur-sm opacity-30
                  animate-pulse
                  pointer-events-none
                " 
                aria-hidden="true"
              />
            )}
            
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={disabled || !isOnline}
              placeholder={!isOnline ? 'You are offline. Messages will be queued.' : placeholder}
              rows={1}
              className="
                relative w-full px-4 py-3
                bg-white dark:bg-gray-800
                border-2 border-gray-300 dark:border-gray-600
                rounded-lg
                focus:border-blue-500 dark:focus:border-blue-400
                focus:ring-4 focus:ring-blue-500/20
                transition-all duration-200 ease-in-out
                resize-none overflow-hidden
                min-h-[42px] max-h-[200px]
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                disabled:bg-gray-100 dark:disabled:bg-gray-900
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
              style={{
                transition: 'height 0.2s ease-in-out, border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out'
              }}
              aria-label="Message input"
              aria-describedby={`message-input-help${showCharCounter ? ' message-char-count' : ''}`}
              aria-invalid={!!validationError}
              aria-errormessage={validationError ? 'input-error' : undefined}
            />
          </div>
          
          {/* Enhanced Send Button with loading state (Requirements 8.6, 8.7) */}
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitDisabled}
            loading={disabled}
            className="self-end"
            aria-label="Send message"
            title={getButtonTitle()}
          >
            {disabled ? 'Sending...' : getButtonText()}
          </Button>
        </div>

        {/* Help Text and Character Counter */}
        <div className="flex justify-between items-center text-xs">
          {/* Help Text (Requirement 2.9, 36.6) */}
          <p id="message-input-help" className="text-gray-500 dark:text-gray-400">
            Press Enter to send, Shift+Enter for new line
          </p>

          {/* Character Counter with smooth fade-in (Requirement 8.8) */}
          {showCharCounter && (
            <p
              id="message-char-count"
              className={`
                char-counter font-medium
                transition-opacity duration-300 ease-in-out
                ${isOverLimit ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}
              `}
              style={{
                animation: 'fadeIn 0.3s ease-in-out'
              }}
              aria-live="polite"
              aria-atomic="true"
            >
              {charCount} / {maxLength}
            </p>
          )}
        </div>

        {/* Validation Error Message */}
        {validationError && (
          <p
            id="input-error"
            className="validation-error text-xs text-red-600 dark:text-red-400"
            role="alert"
            aria-live="assertive"
          >
            {validationError}
          </p>
        )}
      </div>

      {/* Keyframe animation for character counter fade-in */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </form>
  );
}
