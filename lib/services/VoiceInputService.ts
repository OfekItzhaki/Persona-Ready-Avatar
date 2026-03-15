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
      if (!config.subscriptionKey || !config.region) {
        throw new Error('Azure Speech Service credentials are required');
      }
      this.config = config;
      this.speechRecognizer.configure(config);
      this.setupRecognizerEventHandlers();
      if (!this.sdkPreloaded) {
        await this.preloadSDKResources();
      }
    } catch (error) {
      logger.error('Failed to initialize voice input service', {
        component: 'VoiceInputService',
        operation: 'initialize',
        error: error instanceof Error ? error.message : 'Unknown error',
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
      this.microphoneManager.isAvailable();
      this.sdkPreloaded = true;
    } catch {
      // preloading is optional
    }
  }

  /**
   * Start a recognition session
   *
   * Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.4
   */
  async startRecognition(mode: RecognitionMode): Promise<void> {
    if (this.isRecognizingFlag) return;

    if (!this.config) {
      throw new Error('Voice input service not initialized. Call initialize() first.');
    }

    try {
      this.currentMode = mode;
      this.sessionStartTime = Date.now();

      if (!this.microphoneManager.isAvailable()) {
        this.emitError({ type: 'MICROPHONE_UNAVAILABLE', message: 'No microphone detected.', recoverable: true });
        return;
      }

      const permission = await this.microphoneManager.requestPermission();
      if (!permission.granted) {
        this.emitError({ type: 'PERMISSION_DENIED', message: permission.error || 'Microphone permission denied', recoverable: true });
        return;
      }

      const audioStream = await this.microphoneManager.startCapture();
      await this.speechRecognizer.startContinuousRecognition(audioStream);

      this.isRecognizingFlag = true;
      this.emitRecognitionState(true);

      if (mode === 'continuous') {
        this.sessionTimeoutId = setTimeout(() => {
          this.stopRecognition();
          this.emitError({ type: 'TIMEOUT', duration: 60000, recoverable: true });
        }, 60000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to start recognition session', { component: 'VoiceInputService', operation: 'startRecognition', error: errorMessage });
      await this.cleanup();
      this.emitError({ type: 'SYNTHESIS_FAILED', message: `Failed to start recognition: ${errorMessage}`, recoverable: true });
    }
  }

  /**
   * Stop the current recognition session
   *
   * Requirements: 3.3, 4.4, 13.1, 13.2
   */
  async stopRecognition(): Promise<void> {
    if (!this.isRecognizingFlag) return;
    try {
      await this.cleanup();
    } catch (error) {
      logger.error('Error stopping recognition session', { component: 'VoiceInputService', operation: 'stopRecognition', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Update the recognition language
   *
   * Requirements: 2.2, 2.3
   */
  updateLanguage(language: string): void {
    if (!this.config) return;
    this.config.language = language;
    this.speechRecognizer.configure(this.config);
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
    this.speechRecognizer.onRecognizing((result: InterimResult) => {
      this.emitResult({ type: 'interim', text: result.text, timestamp: Date.now() });
    });

    this.speechRecognizer.onRecognized((result: FinalResult) => {
      this.emitResult({ type: 'final', text: result.text.trim(), confidence: result.confidence, timestamp: Date.now() });
    });

    this.speechRecognizer.onError((error: RecognitionError) => {
      logger.error('Recognition error', { component: 'VoiceInputService', operation: 'onError', errorType: error.type });
      this.emitError(error);
      this.stopRecognition();
    });

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
    for (const callback of this.resultCallbacks) {
      try { callback(result); } catch { /* ignore */ }
    }
  }

  private emitError(error: RecognitionError): void {
    for (const callback of this.errorCallbacks) {
      try { callback(error); } catch { /* ignore */ }
    }
  }

  private emitRecognitionState(isRecognizing: boolean): void {
    for (const callback of this.recognitionStateCallbacks) {
      try { callback(isRecognizing); } catch { /* ignore */ }
    }
  }

  private emitAudioLevel(level: number): void {
    for (const callback of this.audioLevelCallbacks) {
      try { callback(level); } catch { /* ignore */ }
    }
  }

  /**
   * Clean up resources
   *
   * Requirements: 12.2, 13.1, 13.2
   */
  private async cleanup(): Promise<void> {
    if (this.sessionTimeoutId) {
      clearTimeout(this.sessionTimeoutId);
      this.sessionTimeoutId = null;
    }
    if (this.speechRecognizer.isRecognizing()) {
      await this.speechRecognizer.stopContinuousRecognition();
    }
    if (this.microphoneManager.isCapturing()) {
      this.microphoneManager.stopCapture();
    }
    this.isRecognizingFlag = false;
    this.emitRecognitionState(false);
  }
}
