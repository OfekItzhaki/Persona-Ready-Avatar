/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import {
  ISpeechRecognizer,
  AzureSpeechConfig,
  InterimResult,
  FinalResult,
  RecognitionError,
} from '@/types';
import { logger } from '@/lib/logger';

/**
 * SpeechRecognizer
 *
 * Wraps Azure Speech SDK for speech recognition in browser environments.
 * Handles continuous recognition, event processing, and error handling.
 *
 * Requirements: 2.1, 2.3, 2.4, 2.5, 5.1, 5.3, 6.1, 6.2, 6.3, 6.4, 11.5
 */
export class SpeechRecognizer implements ISpeechRecognizer {
  private speechConfig: SpeechSDK.SpeechConfig | null = null;
  private recognizer: SpeechSDK.SpeechRecognizer | null = null;
  private isRecognizingFlag: boolean = false;

  // Event callbacks
  private recognizingCallback: ((result: InterimResult) => void) | null = null;
  private recognizedCallback: ((result: FinalResult) => void) | null = null;
  private errorCallback: ((error: RecognitionError) => void) | null = null;
  private sessionStartedCallback: (() => void) | null = null;
  private sessionStoppedCallback: (() => void) | null = null;

  // MediaRecorder reference for cleanup
  private mediaRecorder: MediaRecorder | null = null;

  /**
   * Configure the speech recognizer with Azure credentials
   *
   * Requirements: 2.1, 2.5
   */
  configure(config: AzureSpeechConfig): void {
    try {
      this.speechConfig = SpeechSDK.SpeechConfig.fromSubscription(config.subscriptionKey, config.region);
      this.speechConfig.speechRecognitionLanguage = config.language;
      this.speechConfig.outputFormat = SpeechSDK.OutputFormat.Simple;
    } catch (error) {
      throw new Error(`Failed to configure speech recognizer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start continuous recognition from audio stream
   *
   * Requirements: 2.4
   */
  async startContinuousRecognition(audioStream: MediaStream): Promise<void> {
    if (!this.speechConfig) throw new Error('Speech recognizer not configured. Call configure() first.');
    if (this.isRecognizingFlag) return;

    try {
      const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(this.createPushStream(audioStream));
      this.recognizer = new SpeechSDK.SpeechRecognizer(this.speechConfig, audioConfig);
      this.setupEventHandlers();

      await new Promise<void>((resolve, reject) => {
        this.recognizer!.startContinuousRecognitionAsync(
          () => { this.isRecognizingFlag = true; resolve(); },
          (error) => reject(new Error(`Failed to start recognition: ${error}`))
        );
      });
    } catch (error) {
      logger.error('Failed to start continuous recognition', { component: 'SpeechRecognizer', error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Stop continuous recognition
   *
   * Requirements: 2.4, 13.2, 12.2
   */
  async stopContinuousRecognition(): Promise<void> {
    if (!this.recognizer || !this.isRecognizingFlag) return;

    try {
      await new Promise<void>((resolve, reject) => {
        this.recognizer!.stopContinuousRecognitionAsync(
          () => { this.isRecognizingFlag = false; resolve(); },
          (error) => reject(new Error(`Failed to stop recognition: ${error}`))
        );
      });
      this.dispose();
    } catch (error) {
      logger.error('Failed to stop continuous recognition', { component: 'SpeechRecognizer', error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Dispose of SpeechRecognizer instance and clean up resources
   *
   * Requirements: 13.2 - Implement proper disposal to prevent memory leaks
   */
  private dispose(): void {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
        this.mediaRecorder = null;
      }
      if (this.recognizer) {
        this.recognizer.recognizing = undefined as any;
        this.recognizer.recognized = undefined as any;
        this.recognizer.canceled = undefined as any;
        this.recognizer.sessionStarted = undefined as any;
        this.recognizer.sessionStopped = undefined as any;
        this.recognizer.close();
        this.recognizer = null;
      }
      this.recognizingCallback = null;
      this.recognizedCallback = null;
      this.errorCallback = null;
      this.sessionStartedCallback = null;
      this.sessionStoppedCallback = null;
    } catch { /* ignore disposal errors */ }
  }

  /**
   * Register callback for interim recognition results
   *
   * Requirements: 5.1
   */
  onRecognizing(callback: (result: InterimResult) => void): void {
    this.recognizingCallback = callback;
  }

  /**
   * Register callback for final recognition results
   *
   * Requirements: 5.3
   */
  onRecognized(callback: (result: FinalResult) => void): void {
    this.recognizedCallback = callback;
  }

  /**
   * Register callback for recognition errors
   *
   * Requirements: 6.1, 6.2, 6.3, 6.4
   */
  onError(callback: (error: RecognitionError) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Register callback for session started event
   */
  onSessionStarted(callback: () => void): void {
    this.sessionStartedCallback = callback;
  }

  /**
   * Register callback for session stopped event
   */
  onSessionStopped(callback: () => void): void {
    this.sessionStoppedCallback = callback;
  }

  /**
   * Check if recognition is currently active
   */
  isRecognizing(): boolean {
    return this.isRecognizingFlag;
  }

  /**
   * Set up event handlers for the recognizer
   *
   * Requirements: 5.1, 5.3, 6.1, 6.2, 6.3, 6.4
   */
  private setupEventHandlers(): void {
    if (!this.recognizer) return;

    this.recognizer.recognizing = (_sender, event) => {
      if (event.result.reason === SpeechSDK.ResultReason.RecognizingSpeech && this.recognizingCallback) {
        this.recognizingCallback({ text: event.result.text, offset: event.result.offset });
      }
    };

    this.recognizer.recognized = (_sender, event) => {
      if (event.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && this.recognizedCallback) {
        this.recognizedCallback({ text: event.result.text, confidence: 0.95, offset: event.result.offset, duration: event.result.duration });
      }
    };

    this.recognizer.canceled = (_sender, event) => {
      if (event.reason === SpeechSDK.CancellationReason.Error) {
        logger.error('Recognition canceled', { component: 'SpeechRecognizer', errorDetails: event.errorDetails });
        if (this.errorCallback) this.errorCallback(this.mapCancellationError(event));
      }
      this.isRecognizingFlag = false;
    };

    this.recognizer.sessionStarted = (_sender, _event) => {
      if (this.sessionStartedCallback) this.sessionStartedCallback();
    };

    this.recognizer.sessionStopped = (_sender, _event) => {
      this.isRecognizingFlag = false;
      if (this.sessionStoppedCallback) this.sessionStoppedCallback();
    };
  }

  /**
   * Create a push stream from MediaStream for Azure Speech SDK
   *
   * Requirements: 2.5
   */
  private createPushStream(mediaStream: MediaStream): SpeechSDK.PushAudioInputStream {
    const pushStream = SpeechSDK.AudioInputStream.createPushStream();

    // Get audio track
    const audioTrack = mediaStream.getAudioTracks()[0];
    if (!audioTrack) {
      throw new Error('No audio track found in MediaStream');
    }

    // Create MediaRecorder to capture audio data
    this.mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType: 'audio/webm',
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        // Convert Blob to ArrayBuffer and push to stream
        event.data.arrayBuffer().then((buffer) => {
          pushStream.write(buffer);
        });
      }
    };

    // Start recording with 100ms chunks
    this.mediaRecorder.start(100);

    return pushStream;
  }

  /**
   * Map Azure Speech SDK cancellation error to domain error type
   *
   * Requirements: 6.1, 6.2, 6.3, 6.4
   */
  private mapCancellationError(
    event: SpeechSDK.SpeechRecognitionCanceledEventArgs
  ): RecognitionError {
    const errorDetails = event.errorDetails || 'Unknown error';

    // Check for authentication errors
    if (errorDetails.includes('authentication') || errorDetails.includes('401')) {
      return {
        type: 'AUTHENTICATION_ERROR',
        message: 'Azure Speech Service authentication failed. Please check your credentials.',
        recoverable: false,
      };
    }

    // Check for network errors
    if (errorDetails.includes('network') || errorDetails.includes('connection')) {
      return {
        type: 'NETWORK_ERROR',
        message: 'Network connection lost. Please check your internet connection.',
        recoverable: true,
      };
    }

    // Check for timeout
    if (errorDetails.includes('timeout')) {
      return {
        type: 'TIMEOUT',
        duration: 60000,
        recoverable: true,
      };
    }

    // Default to synthesis failed
    return {
      type: 'SYNTHESIS_FAILED',
      message: `Speech recognition failed: ${errorDetails}`,
      recoverable: true,
    };
  }
}
