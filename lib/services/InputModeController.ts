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
   *
   * Requirements: 7.4
   */
  savePreference(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, this.currentMode);

      logger.debug('Input mode preference saved', {
        component: 'InputModeController',
        operation: 'savePreference',
        mode: this.currentMode,
      });
    } catch (error) {
      logger.error('Failed to save input mode preference', {
        component: 'InputModeController',
        operation: 'savePreference',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Load input mode preference from localStorage
   *
   * Requirements: 7.5
   */
  loadPreference(): InputMode {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);

      if (saved === 'voice' || saved === 'text') {
        logger.info('Input mode preference loaded', {
          component: 'InputModeController',
          operation: 'loadPreference',
          mode: saved,
        });
        return saved;
      }

      // Default to text mode
      logger.info('No saved input mode preference, using default', {
        component: 'InputModeController',
        operation: 'loadPreference',
        defaultMode: 'text',
      });
      return 'text';
    } catch (error) {
      logger.error('Failed to load input mode preference', {
        component: 'InputModeController',
        operation: 'loadPreference',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return default on error
      return 'text';
    }
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
