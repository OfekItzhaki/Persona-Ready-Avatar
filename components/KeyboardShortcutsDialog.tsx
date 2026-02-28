/* eslint-disable no-undef */
'use client';

import { useEffect, useState } from 'react';

/**
 * KeyboardShortcutsDialog Component
 *
 * Displays voice input keyboard shortcuts in a modal dialog.
 * Accessible via Ctrl+Shift+? (Windows/Linux) or Cmd+Shift+? (Mac).
 *
 * Features:
 * - Keyboard shortcut activation
 * - Modal dialog with backdrop
 * - Scrollable content
 * - Focus trap
 * - Escape to close
 * - ARIA labels for accessibility
 *
 * Requirements: 9.4
 *
 * @component
 * @example
 * ```tsx
 * <KeyboardShortcutsDialog />
 * ```
 */
export default function KeyboardShortcutsDialog() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+? (Windows/Linux) or Cmd+Shift+? (Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '?') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus trap effect
  useEffect(() => {
    if (!isOpen) return;

    const dialog = document.getElementById('keyboard-shortcuts-dialog');
    if (!dialog) return;

    const focusableElements = dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-dialog-title"
    >
      <div
        id="keyboard-shortcuts-dialog"
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="keyboard-shortcuts-dialog-title"
            className="text-2xl font-bold text-gray-900 dark:text-white"
          >
            Voice Input Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
            aria-label="Close keyboard shortcuts dialog"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose dark:prose-invert max-w-none">
            {/* Quick Access Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 dark:text-blue-200 m-0">
                <strong>Quick Access:</strong> Press{' '}
                <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">
                  Ctrl+Shift+?
                </kbd>{' '}
                (Windows/Linux) or{' '}
                <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">
                  Cmd+Shift+?
                </kbd>{' '}
                (Mac) to toggle this guide anytime.
              </p>
            </div>

            {/* Voice Input Shortcuts Section */}
            <section className="mb-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Voice Input Controls
              </h3>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 dark:border-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white font-semibold">
                        Shortcut
                      </th>
                      <th className="px-4 py-3 text-left border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white font-semibold">
                        Action
                      </th>
                      <th className="px-4 py-3 text-left border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white font-semibold">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800">
                    <tr>
                      <td className="px-4 py-3 border-b border-gray-300 dark:border-gray-700">
                        <div className="flex flex-col gap-1">
                          <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs inline-block">
                            Ctrl+Shift+V
                          </kbd>
                          <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs inline-block">
                            Cmd+Shift+V
                          </kbd>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                        Push-to-Talk
                      </td>
                      <td className="px-4 py-3 border-b border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                        Start recording in push-to-talk mode. Hold the key combination while speaking, then release to send.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 border-b border-gray-300 dark:border-gray-700">
                        <div className="flex flex-col gap-1">
                          <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs inline-block">
                            Ctrl+Shift+L
                          </kbd>
                          <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs inline-block">
                            Cmd+Shift+L
                          </kbd>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                        Continuous Listening
                      </td>
                      <td className="px-4 py-3 border-b border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                        Toggle continuous listening mode. Press once to start, press again to stop. Hands-free conversation mode.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 border-b border-gray-300 dark:border-gray-700">
                        <div className="flex flex-col gap-1">
                          <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs inline-block">
                            Ctrl+Shift+I
                          </kbd>
                          <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs inline-block">
                            Cmd+Shift+I
                          </kbd>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                        Switch Input Mode
                      </td>
                      <td className="px-4 py-3 border-b border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                        Toggle between voice input and text input modes. Switch at any time, even during active recording.
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs inline-block">
                          Escape
                        </kbd>
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                        Cancel Recognition
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        Stop the current voice recognition session immediately without sending any text.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Usage Tips Section */}
            <section className="mb-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Usage Tips
              </h3>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Push-to-Talk Mode
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Best for precise control. Hold the button or keyboard shortcut while speaking, then release when done. Your message is automatically sent when you release.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Continuous Listening Mode
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Best for hands-free conversation. Click once to start listening, speak naturally, and click again to stop. The system automatically detects when you finish speaking and sends your message.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Visual Feedback
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Watch for the pulsing red indicator when recording is active. You'll also see interim results as you speak, showing what the system is recognizing in real-time.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Accessibility
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    All voice input controls are keyboard accessible and include screen reader announcements. Use Tab to navigate between controls, and Space or Enter to activate buttons.
                  </p>
                </div>
              </div>
            </section>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                For more information about voice input features, see the application help guide.
              </p>
            </div>
          </div>
        </div>

        {/* Footer with Close Button */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
