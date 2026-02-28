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

  /**
   * Configure the speech recognizer with Azure credentials
   *
   * Requirements: 2.1, 2.5
   */
  configure(config: AzureSpeechConfig): void {
    try {
      logger.info('Configuring speech recognizer', {
        component: 'SpeechRecognizer',
        operation: 'configure',
        language: config.language,
        region: config.region,
      });

      // Create speech configuration
      this.speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
        config.subscriptionKey,
        config.region
      );

      // Set recognition language
      this.speechConfig.speechRecognitionLanguage = config.language;

      // Set output format to simple (text only)
      this.speechConfig.outputFormat = SpeechSDK.OutputFormat.Simple;

      logger.info('Speech recognizer configured successfully', {
        component: 'SpeechRecognizer',
        operation: 'configure',
        language: config.language,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Failed to configure speech recognizer', {
        component: 'SpeechRecognizer',
        operation: 'configure',
        error: errorMessage,
      });

      throw new Error(`Failed to configure speech recognizer: ${errorMessage}`);
    }
  }

  /**
   * Start continuous recognition from audio stream
   *
   * Requirements: 2.4
   */
  async startContinuousRecognition(audioStream: MediaStream): Promise<void> {
    if (!this.speechConfig) {
      throw new Error('Speech recognizer not configured. Call configure() first.');
    }

    if (this.isRecognizingFlag) {
      logger.warn('Recognition already in progress', {
        component: 'SpeechRecognizer',
        operation: 'startContinuousRecognition',
      });
      return;
    }

    try {
      logger.info('Starting continuous recognition', {
        component: 'SpeechRecognizer',
        operation: 'startContinuousRecognition',
      });

      // Create audio config from MediaStream
      const audioConfig = SpeechSDK.AudioConfig.fromStreamInput(this.createPushStream(audioStream));

      // Create recognizer
      this.recognizer = new SpeechSDK.SpeechRecognizer(this.speechConfig, audioConfig);

      // Set up event handlers
      this.setupEventHandlers();

      // Start continuous recognition
      await new Promise<void>((resolve, reject) => {
        this.recognizer!.startContinuousRecognitionAsync(
          () => {
            this.isRecognizingFlag = true;
            logger.info('Continuous recognition started', {
              component: 'SpeechRecognizer',
              operation: 'startContinuousRecognition',
            });
            resolve();
          },
          (error) => {
            logger.error('Failed to start continuous recognition', {
              component: 'SpeechRecognizer',
              operation: 'startContinuousRecognition',
              error: error,
            });
            reject(new Error(`Failed to start recognition: ${error}`));
          }
        );
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Error in startContinuousRecognition', {
        component: 'SpeechRecognizer',
        operation: 'startContinuousRecognition',
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Stop continuous recognition
   *
   * Requirements: 2.4
   */
  async stopContinuousRecognition(): Promise<void> {
    if (!this.recognizer || !this.isRecognizingFlag) {
      return;
    }

    try {
      logger.info('Stopping continuous recognition', {
        component: 'SpeechRecognizer',
        operation: 'stopContinuousRecognition',
      });

      await new Promise<void>((resolve, reject) => {
        this.recognizer!.stopContinuousRecognitionAsync(
          () => {
            this.isRecognizingFlag = false;
            logger.info('Continuous recognition stopped', {
              component: 'SpeechRecognizer',
              operation: 'stopContinuousRecognition',
            });
            resolve();
          },
          (error) => {
            logger.error('Failed to stop continuous recognition', {
              component: 'SpeechRecognizer',
              operation: 'stopContinuousRecognition',
              error: error,
            });
            reject(new Error(`Failed to stop recognition: ${error}`));
          }
        );
      });

      // Dispose recognizer
      if (this.recognizer) {
        this.recognizer.close();
        this.recognizer = null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Error in stopContinuousRecognition', {
        component: 'SpeechRecognizer',
        operation: 'stopContinuousRecognition',
        error: errorMessage,
      });

      throw error;
    }
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
    if (!this.recognizer) {
      return;
    }

    // Recognizing event (interim results)
    this.recognizer.recognizing = (sender, event) => {
      if (event.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
        const interimResult: InterimResult = {
          text: event.result.text,
          offset: event.result.offset,
        };

        logger.debug('Interim recognition result', {
          component: 'SpeechRecognizer',
          operation: 'recognizing',
          text: interimResult.text,
        });

        if (this.recognizingCallback) {
          this.recognizingCallback(interimResult);
        }
      }
    };

    // Recognized event (final results)
    this.recognizer.recognized = (sender, event) => {
      if (event.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        const finalResult: FinalResult = {
          text: event.result.text,
          confidence: 0.95, // Azure doesn't provide confidence in simple format
          offset: event.result.offset,
          duration: event.result.duration,
        };

        logger.info('Final recognition result', {
          component: 'SpeechRecognizer',
          operation: 'recognized',
          text: finalResult.text,
        });

        if (this.recognizedCallback) {
          this.recognizedCallback(finalResult);
        }
      } else if (event.result.reason === SpeechSDK.ResultReason.NoMatch) {
        logger.warn('No speech recognized', {
          component: 'SpeechRecognizer',
          operation: 'recognized',
        });
      }
    };

    // Canceled event (errors)
    this.recognizer.canceled = (sender, event) => {
      logger.error('Recognition canceled', {
        component: 'SpeechRecognizer',
        operation: 'canceled',
        reason: event.reason,
        errorDetails: event.errorDetails,
      });

      if (event.reason === SpeechSDK.CancellationReason.Error) {
        const error = this.mapCancellationError(event);

        if (this.errorCallback) {
          this.errorCallback(error);
        }
      }

      this.isRecognizingFlag = false;
    };

    // Session started event
    this.recognizer.sessionStarted = (sender, event) => {
      logger.info('Recognition session started', {
        component: 'SpeechRecognizer',
        operation: 'sessionStarted',
        sessionId: event.sessionId,
      });

      if (this.sessionStartedCallback) {
        this.sessionStartedCallback();
      }
    };

    // Session stopped event
    this.recognizer.sessionStopped = (sender, event) => {
      logger.info('Recognition session stopped', {
        component: 'SpeechRecognizer',
        operation: 'sessionStopped',
        sessionId: event.sessionId,
      });

      this.isRecognizingFlag = false;

      if (this.sessionStoppedCallback) {
        this.sessionStoppedCallback();
      }
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
    const mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType: 'audio/webm',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        // Convert Blob to ArrayBuffer and push to stream
        event.data.arrayBuffer().then((buffer) => {
          pushStream.write(new Uint8Array(buffer));
        });
      }
    };

    // Start recording with 100ms chunks
    mediaRecorder.start(100);

    // Store reference for cleanup
    (pushStream as any)._mediaRecorder = mediaRecorder;

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
