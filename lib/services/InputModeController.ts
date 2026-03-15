/* eslint-disable no-undef */
import { IInputModeController, InputMode } from '@/types';
import { logger } from '@/lib/logger';

/**
 * InputModeController
 *
 * Manages switching between voice and text input modes.
 * Persists user preference to localStorage.
 *
 * Requirements: 7.1, 7.4, 7.5, 7.6
 */
export class InputModeController implements IInputModeController {
  private currentMode: InputMode = 'text';
  private modeChangeCallbacks: Set<(mode: InputMode) => void> = new Set();
  private readonly STORAGE_KEY = 'voice-input-mode-preference';

  constructor() {
    // Load saved preference on initialization
    this.currentMode = this.loadPreference();
  }

  /**
   * Set the current input mode
   *
   * Requirements: 7.1, 7.6
   */
  setMode(mode: InputMode): void {
    if (this.currentMode === mode) {
      return;
    }

    logger.info('Switching input mode', {
      component: 'InputModeController',
      operation: 'setMode',
      from: this.currentMode,
      to: mode,
    });

    this.currentMode = mode;

    // Notify all subscribers
    this.modeChangeCallbacks.forEach((callback) => {
      try {
        callback(mode);
      } catch (error) {
        logger.error('Error in mode change callback', {
          component: 'InputModeController',
          operation: 'setMode',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Persist preference
    this.savePreference();

    logger.info('Input mode switched successfully', {
      component: 'InputModeController',
      operation: 'setMode',
      mode: mode,
    });
  }

  /**
   * Get the current input mode
   *
   * Requirements: 7.1
   */
  getMode(): InputMode {
    return this.currentMode;
  }

  /**
   * Save input mode preference to localStorage
   * Only persists 'text' — voice mode is never saved as a default.
   *
   * Requirements: 7.4
   */
  savePreference(): void {
    try {
      // Only persist text mode; voice mode must be re-selected each session
      localStorage.setItem(this.STORAGE_KEY, 'text');
    } catch {
      // ignore storage errors
    }
  }

  /**
   * Load input mode preference from localStorage
   * Always defaults to 'text' — voice mode must be explicitly chosen each session.
   *
   * Requirements: 7.5
   */
  loadPreference(): InputMode {
    // Always start in text mode regardless of any saved preference.
    // Voice mode requires explicit user opt-in each session.
    return 'text';
  }

  /**
   * Subscribe to input mode changes
   *
   * Requirements: 7.1
   */
  subscribeToModeChanges(callback: (mode: InputMode) => void): () => void {
    this.modeChangeCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.modeChangeCallbacks.delete(callback);
    };
  }
}
