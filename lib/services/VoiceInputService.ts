import {
  IVoiceInputService,
  AzureSpeechConfig,
  RecognitionMode,
  RecognitionResult,
  RecognitionError,
  InterimResult,
  FinalResult,
} from '@/types';
import { MicrophoneManager } from './MicrophoneManager';
import { SpeechRecognizer } from './SpeechRecognizer';
import { logger } from '@/lib/logger';

/**
 * VoiceInputService
 *
 * Orchestrates voice input functionality by coordinating MicrophoneManager
 * and SpeechRecognizer. Handles recognition sessions,
 * result processing, and error handling.
 *
 * Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4,
 *               5.1, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5, 8.1, 8.5, 13.1, 13.2,
 *               13.3, 13.4, 13.5
 */
export class VoiceInputService implements IVoiceInputService {
  private static instance: VoiceInputService | null = null;

  private microphoneManager: MicrophoneManager;
  private speechRecognizer: SpeechRecognizer;

  private currentMode: RecognitionMode = 'push-to-talk';
  private isRecognizingFlag: boolean = false;
  private sessionStartTime: number = 0;
  private sessionTimeoutId: NodeJS.Timeout | null = null;

  // Event callbacks
  private resultCallbacks: Set<(result: RecognitionResult) => void> = new Set();
  private errorCallbacks: Set<(error: RecognitionError) => void> = new Set();
  private recognitionStateCallbacks: Set<(isRecognizing: boolean) => void> = new Set();
  private audioLevelCallbacks: Set<(level: number) => void> = new Set();

  // Configuration
  private config: AzureSpeechConfig | null = null;

  // SDK preloading flag
  private sdkPreloaded: boolean = false;

  constructor(
    microphoneManager: MicrophoneManager,
    speechRecognizer: SpeechRecognizer
  ) {
    this.microphoneManager = microphoneManager;
    this.speechRecognizer = speechRecognizer;
  }

  /**
   * Get singleton instance of VoiceInputService
   */
  static getInstance(): VoiceInputService {
    if (!VoiceInputService.instance) {
      const microphoneManager = new MicrophoneManager();
      const speechRecognizer = new SpeechRecognizer();

      VoiceInputService.instance = new VoiceInputService(
        microphoneManager,
        speechRecognizer
      );
    }
    return VoiceInputService.instance;
  }

  /**
   * Initialize the voice input service with Azure Speech configuration
   *
   * Requirements: 2.1
   */
  async initialize(config: AzureSpeechConfig): Promise<void> {
    try {
      logger.info('Initializing voice input service', {
        component: 'VoiceInputService',
        operation: 'initialize',
        language: config.language,
      });

      // Validate configuration
      if (!config.subscriptionKey || !config.region) {
        throw new Error('Azure Speech Service credentials are required');
      }

      this.config = config;

      // Configure speech recognizer
      this.speechRecognizer.configure(config);

      // Set up speech recognizer event handlers
      this.setupRecognizerEventHandlers();

      // Preload SDK resources if not already done
      // Requirements: 14.1 - Optimize recognition session start latency
      if (!this.sdkPreloaded) {
        await this.preloadSDKResources();
      }

      logger.info('Voice input service initialized successfully', {
        component: 'VoiceInputService',
        operation: 'initialize',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Failed to initialize voice input service', {
        component: 'VoiceInputService',
        operation: 'initialize',
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Preload Azure Speech SDK resources to reduce session start latency
   *
   * Requirements: 14.1 - Target < 500ms from user activation to recognition start
   */
  private async preloadSDKResources(): Promise<void> {
    try {
      logger.info('Preloading Azure Speech SDK resources', {
        component: 'VoiceInputService',
        operation: 'preloadSDKResources',
      });

      // Preload microphone by checking availability
      // This initializes browser audio APIs without requesting permission
      this.microphoneManager.isAvailable();

      // Mark as preloaded
      this.sdkPreloaded = true;

      logger.info('Azure Speech SDK resources preloaded', {
        component: 'VoiceInputService',
        operation: 'preloadSDKResources',
      });
    } catch (error) {
      logger.warn('Failed to preload SDK resources', {
        component: 'VoiceInputService',
        operation: 'preloadSDKResources',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - preloading is an optimization, not critical
    }
  }

  /**
   * Start a recognition session
   *
   * Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.4
   */
  async startRecognition(mode: RecognitionMode): Promise<void> {
    if (this.isRecognizingFlag) {
      logger.warn('Recognition already in progress', {
        component: 'VoiceInputService',
        operation: 'startRecognition',
      });
      return;
    }

    if (!this.config) {
      throw new Error('Voice input service not initialized. Call initialize() first.');
    }

    try {
      logger.info('Starting recognition session', {
        component: 'VoiceInputService',
        operation: 'startRecognition',
        mode: mode,
      });

      this.currentMode = mode;
      this.sessionStartTime = Date.now();

      // Check microphone availability
      // Requirements: 1.5
      if (!this.microphoneManager.isAvailable()) {
        const error: RecognitionError = {
          type: 'MICROPHONE_UNAVAILABLE',
          message: 'No microphone detected. Please connect a microphone and try again.',
          recoverable: true,
        };
        this.emitError(error);
        return;
      }

      // Request microphone permission if needed
      // Requirements: 1.1, 1.2
      const permission = await this.microphoneManager.requestPermission();
      if (!permission.granted) {
        const error: RecognitionError = {
          type: 'PERMISSION_DENIED',
          message: permission.error || 'Microphone permission denied',
          recoverable: true,
        };
        this.emitError(error);
        return;
      }

      // Start audio capture
      // Requirements: 1.3
      const audioStream = await this.microphoneManager.startCapture();

      // Start speech recognition
      // Requirements: 2.4
      await this.speechRecognizer.startContinuousRecognition(audioStream);

      this.isRecognizingFlag = true;
      this.emitRecognitionState(true);

      // Set up session timeout for continuous mode
      // Requirements: 13.4, 13.5
      if (mode === 'continuous') {
        this.sessionTimeoutId = setTimeout(() => {
          logger.warn('Recognition session timed out', {
            component: 'VoiceInputService',
            operation: 'startRecognition',
            duration: 60000,
          });

          this.stopRecognition();

          const error: RecognitionError = {
            type: 'TIMEOUT',
            duration: 60000,
            recoverable: true,
          };
          this.emitError(error);
        }, 60000); // 60 second timeout
      }

      logger.info('Recognition session started successfully', {
        component: 'VoiceInputService',
        operation: 'startRecognition',
        mode: mode,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Failed to start recognition session', {
        component: 'VoiceInputService',
        operation: 'startRecognition',
        error: errorMessage,
      });

      // Clean up on error
      await this.cleanup();

      const recognitionError: RecognitionError = {
        type: 'SYNTHESIS_FAILED',
        message: `Failed to start recognition: ${errorMessage}`,
        recoverable: true,
      };
      this.emitError(recognitionError);
    }
  }

  /**
   * Stop the current recognition session
   *
   * Requirements: 3.3, 4.4, 13.1, 13.2
   */
  async stopRecognition(): Promise<void> {
    if (!this.isRecognizingFlag) {
      return;
    }

    try {
      logger.info('Stopping recognition session', {
        component: 'VoiceInputService',
        operation: 'stopRecognition',
        duration: Date.now() - this.sessionStartTime,
      });

      await this.cleanup();

      logger.info('Recognition session stopped successfully', {
        component: 'VoiceInputService',
        operation: 'stopRecognition',
      });
    } catch (error) {
      logger.error('Error stopping recognition session', {
        component: 'VoiceInputService',
        operation: 'stopRecognition',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update the recognition language
   *
   * Requirements: 2.2, 2.3
   */
  updateLanguage(language: string): void {
    if (!this.config) {
      logger.warn('Cannot update language: service not initialized', {
        component: 'VoiceInputService',
        operation: 'updateLanguage',
      });
      return;
    }

    logger.info('Updating recognition language', {
      component: 'VoiceInputService',
      operation: 'updateLanguage',
      from: this.config.language,
      to: language,
    });

    this.config.language = language;

    // Reconfigure speech recognizer with new language
    this.speechRecognizer.configure(this.config);

    logger.info('Recognition language updated', {
      component: 'VoiceInputService',
      operation: 'updateLanguage',
      language: language,
    });
  }

  /**
   * Subscribe to recognition results
   *
   * Requirements: 5.1, 5.3
   */
  subscribeToResults(callback: (result: RecognitionResult) => void): () => void {
    this.resultCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.resultCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to recognition errors
   *
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
   */
  subscribeToErrors(callback: (error: RecognitionError) => void): () => void {
    this.errorCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.errorCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to recognition state changes
   */
  subscribeToRecognitionState(callback: (isRecognizing: boolean) => void): () => void {
    this.recognitionStateCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.recognitionStateCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to audio level updates
   */
  subscribeToAudioLevels(callback: (level: number) => void): () => void {
    this.audioLevelCallbacks.add(callback);

    // Subscribe to microphone manager audio levels
    const unsubscribeMic = this.microphoneManager.subscribeToAudioLevels((level) => {
      this.emitAudioLevel(level);
    });

    // Return unsubscribe function
    return () => {
      this.audioLevelCallbacks.delete(callback);
      unsubscribeMic();
    };
  }

  /**
   * Check if recognition is currently active
   */
  isRecognizing(): boolean {
    return this.isRecognizingFlag;
  }

  /**
   * Get the current recognition mode
   */
  getMode(): RecognitionMode {
    return this.currentMode;
  }

  /**
   * Set up event handlers for the speech recognizer
   *
   * Requirements: 5.1, 5.3, 6.1, 6.2, 6.3, 6.4, 14.2
   */
  private setupRecognizerEventHandlers(): void {
    // Handle interim results
    // Requirements: 5.1, 14.2 - Minimize processing overhead for < 200ms latency
    this.speechRecognizer.onRecognizing((result: InterimResult) => {
      // Create result object inline to minimize allocations
      const recognitionResult: RecognitionResult = {
        type: 'interim',
        text: result.text,
        timestamp: Date.now(),
      };

      // Emit immediately without additional processing
      this.emitResult(recognitionResult);
    });

    // Handle final results
    // Requirements: 5.3, 3.4, 4.3, 8.1, 8.5
    this.speechRecognizer.onRecognized((result: FinalResult) => {
      // Trim whitespace from recognized text
      // Requirements: 8.5
      const trimmedText = result.text.trim();

      const recognitionResult: RecognitionResult = {
        type: 'final',
        text: trimmedText,
        confidence: result.confidence,
        timestamp: Date.now(),
      };

      this.emitResult(recognitionResult);
    });

    // Handle errors
    // Requirements: 6.1, 6.2, 6.3, 6.4
    this.speechRecognizer.onError((error: RecognitionError) => {
      logger.error('Recognition error', {
        component: 'VoiceInputService',
        operation: 'onError',
        errorType: error.type,
        message: error.type === 'TIMEOUT' ? `Timeout after ${error.duration}ms` : error.message,
      });

      this.emitError(error);

      // Stop recognition on error
      this.stopRecognition();
    });

    // Handle session stopped
    this.speechRecognizer.onSessionStopped(() => {
      this.isRecognizingFlag = false;
      this.emitRecognitionState(false);
    });
  }

  /**
   * Emit recognition result to all subscribers
   * Optimized for minimal latency
   *
   * Requirements: 5.1, 5.3, 14.2
   */
  private emitResult(result: RecognitionResult): void {
    // Use for-of loop for better performance than forEach
    for (const callback of this.resultCallbacks) {
      try {
        callback(result);
      } catch (error) {
        logger.error('Error in result callback', {
          component: 'VoiceInputService',
          operation: 'emitResult',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Emit error to all subscribers
   *
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
   */
  private emitError(error: RecognitionError): void {
    for (const callback of this.errorCallbacks) {
      try {
        callback(error);
      } catch (err) {
        logger.error('Error in error callback', {
          component: 'VoiceInputService',
          operation: 'emitError',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Emit recognition state change to all subscribers
   */
  private emitRecognitionState(isRecognizing: boolean): void {
    for (const callback of this.recognitionStateCallbacks) {
      try {
        callback(isRecognizing);
      } catch (error) {
        logger.error('Error in recognition state callback', {
          component: 'VoiceInputService',
          operation: 'emitRecognitionState',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Emit audio level to all subscribers
   */
  private emitAudioLevel(level: number): void {
    for (const callback of this.audioLevelCallbacks) {
      try {
        callback(level);
      } catch (error) {
        logger.error('Error in audio level callback', {
          component: 'VoiceInputService',
          operation: 'emitAudioLevel',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Clean up resources
   *
   * Requirements: 12.2, 13.1, 13.2
   */
  private async cleanup(): Promise<void> {
    // Clear session timeout
    if (this.sessionTimeoutId) {
      clearTimeout(this.sessionTimeoutId);
      this.sessionTimeoutId = null;
    }

    // Stop speech recognition
    // Requirements: 13.2
    if (this.speechRecognizer.isRecognizing()) {
      await this.speechRecognizer.stopContinuousRecognition();
    }

    // Stop microphone capture
    // Requirements: 12.2
    if (this.microphoneManager.isCapturing()) {
      this.microphoneManager.stopCapture();
    }

    this.isRecognizingFlag = false;
    this.emitRecognitionState(false);
  }
}
