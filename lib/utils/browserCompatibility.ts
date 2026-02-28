/* eslint-disable no-undef */
/**
 * Browser Compatibility Utility
 *
 * Checks browser support for Web APIs required by voice input functionality.
 *
 * Requirements:
 * - 11.1: Support voice input in Chrome, Edge, and Safari browsers
 * - 11.3: Detect browser compatibility before attempting to initialize MicrophoneManager
 */

/**
 * Result of browser compatibility check
 */
export interface CompatibilityResult {
  /** Whether the browser supports all required features */
  isCompatible: boolean;
  /** Detailed checks for each required feature */
  checks: {
    /** navigator.mediaDevices API support */
    mediaDevices: boolean;
    /** getUserMedia API support */
    getUserMedia: boolean;
    /** AudioContext API support */
    audioContext: boolean;
    /** MediaRecorder API support */
    mediaRecorder: boolean;
  };
  /** Human-readable message describing compatibility status */
  message: string;
}

/**
 * Check browser compatibility for voice input features
 *
 * Validates that the browser supports all required Web APIs:
 * - navigator.mediaDevices: Required for microphone access
 * - getUserMedia: Required for audio capture
 * - AudioContext: Required for audio level monitoring
 * - MediaRecorder: Required for audio recording
 *
 * @returns Compatibility result with detailed checks
 *
 * @example
 * ```typescript
 * const result = checkBrowserCompatibility();
 * if (!result.isCompatible) {
 *   console.error(result.message);
 *   console.log('Missing features:', result.checks);
 * }
 * ```
 */
export function checkBrowserCompatibility(): CompatibilityResult {
  // Check for navigator.mediaDevices
  const hasMediaDevices = typeof navigator !== 'undefined' && 'mediaDevices' in navigator;

  // Check for getUserMedia (requires mediaDevices to exist first)
  const hasGetUserMedia = hasMediaDevices && 'getUserMedia' in navigator.mediaDevices;

  // Check for AudioContext (with webkit prefix fallback for Safari)
  const hasAudioContext =
    typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);

  // Check for MediaRecorder
  const hasMediaRecorder = typeof window !== 'undefined' && 'MediaRecorder' in window;

  const checks = {
    mediaDevices: hasMediaDevices,
    getUserMedia: hasGetUserMedia,
    audioContext: hasAudioContext,
    mediaRecorder: hasMediaRecorder,
  };

  // Browser is compatible if all checks pass
  const isCompatible = Object.values(checks).every((check) => check);

  // Generate appropriate message
  const message = isCompatible
    ? 'Browser supports voice input'
    : 'Browser does not support required audio APIs. Voice input requires a modern browser like Chrome 90+, Edge 90+, or Safari 14+.';

  return {
    isCompatible,
    checks,
    message,
  };
}
