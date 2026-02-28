/* eslint-disable no-undef */
'use client';

import { InputModeToggleProps } from '@/types';
import { useEffect } from 'react';

/**
 * InputModeToggle
 *
 * Toggle control for switching between voice and text input modes.
 * Displays current mode state visually and handles click events.
 *
 * Requirements: 7.1, 9.5, 9.6, 10.1, 10.6
 */
export function InputModeToggle({ currentMode, onModeChange, disabled }: InputModeToggleProps) {
  // Handle keyboard shortcut: Ctrl/Cmd + Shift + I
  // Requirement: 9.5
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'I') {
        event.preventDefault();
        if (!disabled) {
          const newMode = currentMode === 'voice' ? 'text' : 'voice';
          onModeChange(newMode);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMode, disabled, onModeChange]);

  // Handle toggle click
  const handleClick = () => {
    if (disabled) return;

    const newMode = currentMode === 'voice' ? 'text' : 'voice';
    onModeChange(newMode);
  };

  // Get appropriate label for screen readers
  // Requirement: 10.1, 10.6
  const getAriaLabel = () => {
    return `Switch to ${currentMode === 'voice' ? 'text' : 'voice'} input. Current mode: ${currentMode}`;
  };

  // Get icon for current mode
  const getIcon = (mode: 'voice' | 'text') => {
    if (mode === 'voice') {
      return (
        <svg
          className="w-5 h-5"
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
    } else {
      return (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      );
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        relative inline-flex items-center justify-center
        w-14 h-8 rounded-full
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${currentMode === 'voice' ? 'bg-blue-600' : 'bg-gray-400 dark:bg-gray-600'}
      `}
      aria-label={getAriaLabel()}
      aria-pressed={currentMode === 'voice'}
      role="button"
    >
      {/* Toggle slider */}
      <span
        className={`
          absolute inline-flex items-center justify-center
          w-6 h-6 rounded-full bg-white shadow-md
          transform transition-transform duration-200
          ${currentMode === 'voice' ? 'translate-x-3' : '-translate-x-3'}
        `}
      >
        {/* Icon inside slider */}
        <span className="text-gray-700">{getIcon(currentMode)}</span>
      </span>

      {/* Screen reader only text for current mode */}
      <span className="sr-only">
        {currentMode === 'voice' ? 'Voice input mode active' : 'Text input mode active'}
      </span>
    </button>
  );
}
