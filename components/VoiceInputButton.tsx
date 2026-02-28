/* eslint-disable no-undef */
'use client';

import { VoiceInputButtonProps } from '@/types';
import { useEffect, useRef } from 'react';

/**
 * VoiceInputButton
 *
 * Button component for controlling voice input with visual feedback.
 * Supports both push-to-talk (press/release) and continuous listening (click) modes.
 *
 * Requirements: 3.1, 3.3, 3.6, 4.1, 4.4, 9.1, 9.2, 9.3, 9.5, 9.6, 10.1, 15.1
 */
export function VoiceInputButton({
  mode,
  isRecognizing,
  onPress,
  onRelease,
  disabled,
}: VoiceInputButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Handle keyboard shortcuts
  // Requirements: 9.1, 9.2, 9.3
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + V for push-to-talk
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        if (!disabled && mode === 'push-to-talk') {
          onPress();
        }
      }

      // Ctrl/Cmd + Shift + L for continuous listening
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'L') {
        event.preventDefault();
        if (!disabled && mode === 'continuous') {
          if (isRecognizing) {
            onRelease();
          } else {
            onPress();
          }
        }
      }

      // Escape to cancel
      if (event.key === 'Escape' && isRecognizing) {
        event.preventDefault();
        onRelease();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isRecognizing, disabled, onPress, onRelease]);

  // Handle mouse/touch events for push-to-talk
  const handleMouseDown = () => {
    if (disabled) return;

    if (mode === 'push-to-talk') {
      onPress();
    }
  };

  const handleMouseUp = () => {
    if (disabled) return;

    if (mode === 'push-to-talk') {
      onRelease();
    }
  };

  // Handle click for continuous listening
  const handleClick = () => {
    if (disabled) return;

    if (mode === 'continuous') {
      if (isRecognizing) {
        onRelease();
      } else {
        onPress();
      }
    }
  };

  // Get button label based on state
  const getButtonLabel = () => {
    if (mode === 'push-to-talk') {
      return isRecognizing ? 'Stop recording' : 'Start voice input';
    } else {
      return isRecognizing ? 'Stop listening' : 'Start continuous listening';
    }
  };

  // Get icon based on state
  const getIcon = () => {
    if (isRecognizing) {
      return (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
          />
        </svg>
      );
    } else {
      return (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      );
    }
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`
        relative inline-flex items-center justify-center
        px-4 py-2 rounded-lg font-medium
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${
          isRecognizing
            ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 animate-pulse'
            : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      onClick={handleClick}
      disabled={disabled}
      aria-label={getButtonLabel()}
      aria-pressed={isRecognizing}
      role="button"
    >
      <span className="flex items-center gap-2">
        {getIcon()}
        <span className="hidden sm:inline">
          {mode === 'push-to-talk' ? 'Push to Talk' : 'Continuous'}
        </span>
      </span>

      {/* Pulsing animation indicator when recording */}
      {isRecognizing && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      )}
    </button>
  );
}
