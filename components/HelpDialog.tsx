'use client';

import { useEffect, useState } from 'react';

/**
 * HelpDialog Component
 * 
 * Displays the feature usage guide in a modal dialog.
 * Accessible via Ctrl+Shift+H (Windows/Linux) or Cmd+Shift+H (Mac).
 * 
 * Features:
 * - Keyboard shortcut activation
 * - Modal dialog with backdrop
 * - Scrollable content
 * - Focus trap
 * - Escape to close
 * - ARIA labels for accessibility
 * 
 * @component
 * @example
 * ```tsx
 * <HelpDialog />
 * ```
 */
export default function HelpDialog() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+H (Windows/Linux) or Cmd+Shift+H (Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
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

    const dialog = document.getElementById('help-dialog');
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
      aria-labelledby="help-dialog-title"
    >
      <div
        id="help-dialog"
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="help-dialog-title"
            className="text-2xl font-bold text-gray-900 dark:text-white"
          >
            Feature Usage Guide
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
            aria-label="Close help dialog"
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
                  Ctrl+Shift+H
                </kbd>{' '}
                (Windows/Linux) or{' '}
                <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">
                  Cmd+Shift+H
                </kbd>{' '}
                (Mac) to toggle this guide anytime.
              </p>
            </div>

            {/* Table of Contents */}
            <nav className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Table of Contents</h3>
              <ul className="space-y-1">
                <li><a href="#audio-controls" className="text-blue-600 dark:text-blue-400 hover:underline">Audio Controls</a></li>
                <li><a href="#avatar-customization" className="text-blue-600 dark:text-blue-400 hover:underline">Avatar Customization</a></li>
                <li><a href="#message-operations" className="text-blue-600 dark:text-blue-400 hover:underline">Message Operations</a></li>
                <li><a href="#conversation-management" className="text-blue-600 dark:text-blue-400 hover:underline">Conversation Management</a></li>
                <li><a href="#settings-panel" className="text-blue-600 dark:text-blue-400 hover:underline">Settings Panel</a></li>
                <li><a href="#keyboard-shortcuts" className="text-blue-600 dark:text-blue-400 hover:underline">Keyboard Shortcuts</a></li>
                <li><a href="#performance-monitoring" className="text-blue-600 dark:text-blue-400 hover:underline">Performance Monitoring</a></li>
                <li><a href="#offline-mode" className="text-blue-600 dark:text-blue-400 hover:underline">Offline Mode</a></li>
              </ul>
            </nav>

            {/* Audio Controls Section */}
            <section id="audio-controls" className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Audio Controls</h3>
              <p className="mb-4">The Audio Controller provides comprehensive control over the avatar's speech output.</p>
              
              <h4 className="text-lg font-medium mb-2">Volume Control</h4>
              <ul className="mb-4">
                <li><strong>Adjust Volume:</strong> Use the volume slider to set audio level from 0% to 100%</li>
                <li><strong>Keyboard:</strong> Use arrow keys (↑/↓) when the slider is focused</li>
                <li><strong>Persistence:</strong> Your volume setting is automatically saved</li>
              </ul>

              <h4 className="text-lg font-medium mb-2">Mute/Unmute</h4>
              <ul className="mb-4">
                <li><strong>Toggle Mute:</strong> Click the speaker icon button</li>
                <li><strong>Keyboard:</strong> Press Space or Enter when the mute button is focused</li>
                <li><strong>Behavior:</strong> Muting preserves your volume level; unmuting restores it</li>
              </ul>

              <h4 className="text-lg font-medium mb-2">Playback Speed</h4>
              <ul className="mb-4">
                <li><strong>Options:</strong> 0.5x, 0.75x, 1.0x (normal), 1.25x, 1.5x, 2.0x</li>
                <li><strong>Usage:</strong> Select your preferred speed from the dropdown</li>
                <li><strong>Note:</strong> This affects playback speed, not the speech synthesis rate</li>
              </ul>

              <h4 className="text-lg font-medium mb-2">Pause and Resume</h4>
              <ul className="mb-4">
                <li><strong>Pause Speech:</strong> Click the pause button (⏸) during playback</li>
                <li><strong>Resume Speech:</strong> Click the play button (▶) to continue</li>
                <li><strong>Avatar Behavior:</strong> Avatar freezes lip movements when paused</li>
              </ul>
            </section>

            {/* Avatar Customization Section */}
            <section id="avatar-customization" className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Avatar Customization</h3>
              <p className="mb-4">Personalize your avatar's appearance with various customization options.</p>
              
              <h4 className="text-lg font-medium mb-2">Skin Tone</h4>
              <ul className="mb-4">
                <li><strong>Options:</strong> 6+ preset skin tone swatches</li>
                <li><strong>Usage:</strong> Click on a color swatch to apply</li>
                <li><strong>Effect:</strong> Changes avatar's skin material in real-time</li>
              </ul>

              <h4 className="text-lg font-medium mb-2">Eye Color</h4>
              <ul className="mb-4">
                <li><strong>Options:</strong> 8+ preset eye color swatches</li>
                <li><strong>Effect:</strong> Updates avatar's eye material while preserving cornea effects</li>
              </ul>

              <h4 className="text-lg font-medium mb-2">Hair Color</h4>
              <ul className="mb-4">
                <li><strong>Options:</strong> 8+ preset hair color swatches</li>
                <li><strong>Note:</strong> Only available if avatar model includes hair geometry</li>
              </ul>

              <h4 className="text-lg font-medium mb-2">Manual Expressions</h4>
              <ul className="mb-4">
                <li><strong>Available:</strong> Neutral, Happy, Sad, Surprised, Angry</li>
                <li><strong>Duration:</strong> Expression displays for 2 seconds then returns to neutral</li>
                <li><strong>Limitation:</strong> Disabled during active speech</li>
              </ul>
            </section>

            {/* Message Operations Section */}
            <section id="message-operations" className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Message Operations</h3>
              
              <h4 className="text-lg font-medium mb-2">Editing Messages</h4>
              <ul className="mb-4">
                <li><strong>Availability:</strong> Your 5 most recent messages</li>
                <li><strong>Activate:</strong> Hover over a message and click the edit button (✏️)</li>
                <li><strong>Save:</strong> Click save (✓) or press Enter</li>
                <li><strong>Cancel:</strong> Click cancel (✗) or press Escape</li>
              </ul>

              <h4 className="text-lg font-medium mb-2">Deleting Messages</h4>
              <ul className="mb-4">
                <li><strong>Activate:</strong> Hover over any message and click delete button (🗑️)</li>
                <li><strong>Confirmation:</strong> A dialog appears asking you to confirm</li>
                <li><strong>Scope:</strong> Can delete both user and agent messages</li>
              </ul>

              <h4 className="text-lg font-medium mb-2">Message Search</h4>
              <ul className="mb-4">
                <li><strong>Usage:</strong> Type your search query in the search bar</li>
                <li><strong>Behavior:</strong> Case-insensitive search with highlighted matches</li>
                <li><strong>Clear:</strong> Click X button or press Escape</li>
              </ul>

              <h4 className="text-lg font-medium mb-2">Message Reactions</h4>
              <ul className="mb-4">
                <li><strong>Options:</strong> Thumbs up (👍) or thumbs down (👎)</li>
                <li><strong>Availability:</strong> Agent messages only</li>
                <li><strong>Usage:</strong> Hover over agent message to reveal reaction buttons</li>
              </ul>
            </section>

            {/* Conversation Management Section */}
            <section id="conversation-management" className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Conversation Management</h3>
              
              <h4 className="text-lg font-medium mb-2">Exporting Conversations</h4>
              <ul className="mb-4">
                <li><strong>Formats:</strong> JSON (with metadata) or plain text</li>
                <li><strong>Filename:</strong> Includes timestamp (e.g., conversation-2024-01-15-143022.json)</li>
                <li><strong>Content:</strong> All messages in chronological order</li>
              </ul>

              <h4 className="text-lg font-medium mb-2">Importing Conversations</h4>
              <ul className="mb-4">
                <li><strong>Supported:</strong> JSON and plain text formats</li>
                <li><strong>Options:</strong> Replace current conversation or append to it</li>
                <li><strong>Validation:</strong> Invalid files show error notification</li>
              </ul>
            </section>

            {/* Settings Panel Section */}
            <section id="settings-panel" className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Settings Panel</h3>
              <p className="mb-4">Access via settings button (⚙️) or press Ctrl+, (Cmd+, on Mac)</p>
              
              <h4 className="text-lg font-medium mb-2">Audio Settings</h4>
              <ul className="mb-4">
                <li><strong>Speech Rate:</strong> 0.5x to 2.0x (controls synthesis speed)</li>
                <li><strong>Speech Pitch:</strong> -50% to +50% (adjusts voice pitch)</li>
                <li><strong>Audio Quality:</strong> Low (16kHz), Medium (24kHz), High (48kHz)</li>
              </ul>

              <h4 className="text-lg font-medium mb-2">Graphics Settings</h4>
              <ul className="mb-4">
                <li><strong>Quality Presets:</strong> Low, Medium, High, Ultra</li>
                <li><strong>Effect:</strong> Changes post-processing and shadow quality</li>
              </ul>

              <h4 className="text-lg font-medium mb-2">Appearance Settings</h4>
              <ul className="mb-4">
                <li><strong>Theme:</strong> Light, Dark, or System</li>
                <li><strong>High Contrast Mode:</strong> Maximum contrast for accessibility</li>
              </ul>
            </section>

            {/* Keyboard Shortcuts Section */}
            <section id="keyboard-shortcuts" className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Keyboard Shortcuts</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 dark:border-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2 text-left border-b border-gray-300 dark:border-gray-700">Shortcut</th>
                      <th className="px-4 py-2 text-left border-b border-gray-300 dark:border-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs">Ctrl+Shift+H</kbd> / <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs">Cmd+Shift+H</kbd>
                      </td>
                      <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">Open this help guide</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs">Ctrl+,</kbd> / <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs">Cmd+,</kbd>
                      </td>
                      <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">Open settings panel</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs">Ctrl+Shift+P</kbd> / <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs">Cmd+Shift+P</kbd>
                      </td>
                      <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">Toggle performance monitor</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs">Escape</kbd>
                      </td>
                      <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">Close modals and dialogs</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs">Tab</kbd>
                      </td>
                      <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">Navigate to next element</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs">Enter</kbd>
                      </td>
                      <td className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">Send message</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs">Shift+Enter</kbd>
                      </td>
                      <td className="px-4 py-2">Insert newline</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Performance Monitoring Section */}
            <section id="performance-monitoring" className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Performance Monitoring</h3>
              <p className="mb-4">Press Ctrl+Shift+P (Cmd+Shift+P on Mac) to toggle the performance monitor.</p>
              
              <h4 className="text-lg font-medium mb-2">Metrics Displayed</h4>
              <ul className="mb-4">
                <li><strong>FPS:</strong> Frames per second with color coding (Green ≥60, Yellow 30-59, Red &lt;30)</li>
                <li><strong>Frame Time:</strong> Milliseconds per frame</li>
                <li><strong>Memory Usage:</strong> JavaScript heap usage in MB</li>
                <li><strong>Network Latency:</strong> Round-trip time for API requests</li>
              </ul>
            </section>

            {/* Offline Mode Section */}
            <section id="offline-mode" className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Offline Mode</h3>
              
              <h4 className="text-lg font-medium mb-2">Offline Detection</h4>
              <ul className="mb-4">
                <li><strong>Indicator:</strong> Persistent banner appears when offline</li>
                <li><strong>Message:</strong> "You are offline. Messages will be queued."</li>
              </ul>

              <h4 className="text-lg font-medium mb-2">Message Queuing</h4>
              <ul className="mb-4">
                <li><strong>Behavior:</strong> Messages sent while offline are queued</li>
                <li><strong>Visual:</strong> Queued messages show "pending" indicator</li>
                <li><strong>Limit:</strong> Maximum 50 messages in queue</li>
                <li><strong>Auto-Send:</strong> Messages sent automatically when connectivity restored</li>
              </ul>
            </section>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                For complete documentation, see <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">docs/FEATURE_USAGE_GUIDE.md</code>
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
