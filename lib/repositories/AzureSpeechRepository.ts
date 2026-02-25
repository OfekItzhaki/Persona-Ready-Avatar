import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { logger } from '../logger';
import { getEnvConfig } from '../env';
import type {
  IAzureSpeechRepository,
  SpeechConfig,
  SynthesisResult,
  SpeechError,
  Result,
  VisemeEvent,
} from '@/types';

/**
 * AzureSpeechRepository
 * 
 * Wraps the Azure Speech SDK for text-to-speech synthesis with viseme data collection.
 * 
 * Responsibilities:
 * - Create and configure SpeechSynthesizer with API key and region
 * - Convert text to audio using Azure Neural TTS
 * - Subscribe to VisemeReceived events during synthesis
 * - Collect viseme data with timing information
 * - Convert Azure audio output to Web Audio API AudioBuffer format
 * - Transform SDK errors to domain SpeechError types
 * - Manage SDK lifecycle (create synthesizer, dispose after use)
 */
export class AzureSpeechRepository implements IAzureSpeechRepository {
  /**
   * Synthesize speech from text with viseme data collection
   * 
   * @param text - The text to synthesize
   * @param config - Speech configuration (voice, language, output format)
   * @returns Result containing SynthesisResult (audio buffer + visemes) or SpeechError
   */
  async synthesize(
    text: string,
    config: SpeechConfig
  ): Promise<Result<SynthesisResult, SpeechError>> {
    logger.info('Starting speech synthesis', {
      component: 'AzureSpeechRepository',
      textLength: text.length,
      voice: config.voice,
      language: config.language,
      outputFormat: config.outputFormat,
    });

    let synthesizer: sdk.SpeechSynthesizer | null = null;

    try {
      // Get environment configuration
      const envConfig = getEnvConfig();

      // Create speech configuration
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        envConfig.azureSpeechKey,
        envConfig.azureSpeechRegion
      );

      // Set voice and output format
      speechConfig.speechSynthesisVoiceName = config.voice;
      speechConfig.speechSynthesisOutputFormat = this.mapOutputFormat(config.outputFormat);

      // Create synthesizer with null audio config (we'll handle audio ourselves)
      synthesizer = new sdk.SpeechSynthesizer(speechConfig, undefined);

      // Collect viseme events
      const visemes: VisemeEvent[] = [];

      synthesizer.visemeReceived = (_sender, event) => {
        const viseme: VisemeEvent = {
          visemeId: event.visemeId,
          audioOffset: event.audioOffset / 10000, // Convert from 100-nanosecond units to milliseconds
          duration: 0, // Azure doesn't provide duration, will be calculated later
        };

        visemes.push(viseme);

        logger.debug('Viseme received', {
          component: 'AzureSpeechRepository',
          visemeId: viseme.visemeId,
          audioOffset: viseme.audioOffset,
        });
      };

      // Perform synthesis
      const result = await this.performSynthesis(synthesizer, text);

      if (!result.success) {
        return result;
      }

      // Calculate viseme durations
      this.calculateVisemeDurations(visemes);

      // Convert audio data to AudioBuffer
      const audioBuffer = await this.convertToAudioBuffer(result.data);

      logger.info('Speech synthesis completed successfully', {
        component: 'AzureSpeechRepository',
        visemeCount: visemes.length,
        audioDuration: audioBuffer.duration,
      });

      return {
        success: true,
        data: {
          audioBuffer,
          visemes,
        },
      };
    } catch (error) {
      return this.handleError(error);
    } finally {
      // Clean up synthesizer
      if (synthesizer) {
        synthesizer.close();
        logger.debug('Synthesizer disposed', {
          component: 'AzureSpeechRepository',
        });
      }
    }
  }

  /**
   * Perform the actual synthesis operation
   * 
   * @param synthesizer - The speech synthesizer instance
   * @param text - The text to synthesize
   * @returns Result containing audio data or error
   */
  private async performSynthesis(
    synthesizer: sdk.SpeechSynthesizer,
    text: string
  ): Promise<Result<ArrayBuffer, SpeechError>> {
    return new Promise((resolve) => {
      synthesizer.speakTextAsync(
        text,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            logger.debug('Audio synthesis completed', {
              component: 'AzureSpeechRepository',
              audioDataLength: result.audioData.byteLength,
            });

            resolve({
              success: true,
              data: result.audioData,
            });
          } else if (result.reason === sdk.ResultReason.Canceled) {
            const cancellation = sdk.CancellationDetails.fromResult(result);
            const error = this.mapCancellationError(cancellation);

            logger.error('Speech synthesis canceled', {
              component: 'AzureSpeechRepository',
              reason: cancellation.reason,
              errorCode: cancellation.ErrorCode,
              errorDetails: cancellation.errorDetails,
            });

            resolve({
              success: false,
              error,
            });
          } else {
            const error: SpeechError = {
              type: 'SYNTHESIS_FAILED',
              reason: `Unexpected result reason: ${result.reason}`,
            };

            logger.error('Speech synthesis failed with unexpected reason', {
              component: 'AzureSpeechRepository',
              reason: result.reason,
            });

            resolve({
              success: false,
              error,
            });
          }
        },
        (error) => {
          logger.error('Speech synthesis error', {
            component: 'AzureSpeechRepository',
            error: error.toString(),
          });

          resolve({
            success: false,
            error: {
              type: 'SYNTHESIS_FAILED',
              reason: error.toString(),
            },
          });
        }
      );
    });
  }

  /**
   * Map output format string to Azure SDK format enum
   * 
   * @param format - The output format string
   * @returns Azure SDK audio format enum value
   */
  private mapOutputFormat(format: string): sdk.SpeechSynthesisOutputFormat {
    switch (format) {
      case 'audio-16khz-32kbitrate-mono-mp3':
        return sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
      case 'audio-24khz-48kbitrate-mono-mp3':
        return sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;
      case 'raw-16khz-16bit-mono-pcm':
        return sdk.SpeechSynthesisOutputFormat.Raw16Khz16BitMonoPcm;
      default:
        // Default to 24khz MP3
        return sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;
    }
  }

  /**
   * Map Azure SDK cancellation details to domain SpeechError
   * 
   * @param cancellation - The cancellation details from Azure SDK
   * @returns Domain SpeechError
   */
  private mapCancellationError(cancellation: sdk.CancellationDetails): SpeechError {
    if (cancellation.reason === sdk.CancellationReason.Error) {
      // Check for specific error codes
      if (cancellation.ErrorCode === sdk.CancellationErrorCode.ConnectionFailure) {
        return {
          type: 'NETWORK_ERROR',
          message: cancellation.errorDetails || 'Network connection failed',
        };
      }

      if (
        cancellation.ErrorCode === sdk.CancellationErrorCode.AuthenticationFailure ||
        cancellation.errorDetails?.includes('authentication') ||
        cancellation.errorDetails?.includes('subscription')
      ) {
        return {
          type: 'INVALID_KEY',
          message: cancellation.errorDetails || 'Authentication failed - invalid API key',
        };
      }

      if (
        cancellation.errorDetails?.includes('region') ||
        cancellation.errorDetails?.includes('endpoint')
      ) {
        return {
          type: 'INVALID_REGION',
          region: cancellation.errorDetails || 'Invalid region',
        };
      }
    }

    // Generic synthesis failure
    return {
      type: 'SYNTHESIS_FAILED',
      reason: cancellation.errorDetails || 'Speech synthesis was canceled',
    };
  }

  /**
   * Calculate duration for each viseme based on timing between events
   * 
   * @param visemes - Array of viseme events (modified in place)
   */
  private calculateVisemeDurations(visemes: VisemeEvent[]): void {
    for (let i = 0; i < visemes.length; i++) {
      if (i < visemes.length - 1) {
        // Duration is the time until the next viseme
        visemes[i].duration = visemes[i + 1].audioOffset - visemes[i].audioOffset;
      } else {
        // Last viseme: use average duration of previous visemes or default to 100ms
        if (visemes.length > 1) {
          const avgDuration =
            visemes.slice(0, -1).reduce((sum, v) => sum + v.duration, 0) / (visemes.length - 1);
          visemes[i].duration = avgDuration;
        } else {
          visemes[i].duration = 100; // Default 100ms for single viseme
        }
      }
    }
  }

  /**
   * Convert Azure audio data (ArrayBuffer) to Web Audio API AudioBuffer
   * 
   * @param audioData - Raw audio data from Azure SDK
   * @returns Web Audio API AudioBuffer
   */
  private async convertToAudioBuffer(audioData: ArrayBuffer): Promise<AudioBuffer> {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    try {
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(audioData.slice(0));

      logger.debug('Audio data converted to AudioBuffer', {
        component: 'AzureSpeechRepository',
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
      });

      return audioBuffer;
    } catch (error) {
      logger.error('Failed to decode audio data', {
        component: 'AzureSpeechRepository',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new Error('Failed to decode audio data');
    }
  }

  /**
   * Handle errors and transform to domain SpeechError
   * 
   * @param error - The caught error
   * @returns Result with SpeechError
   */
  private handleError(error: unknown): Result<SynthesisResult, SpeechError> {
    if (error instanceof Error) {
      // Check for specific error patterns
      if (error.message.includes('authentication') || error.message.includes('subscription')) {
        logger.error('Authentication error', {
          component: 'AzureSpeechRepository',
          error: error.message,
        });

        return {
          success: false,
          error: {
            type: 'INVALID_KEY',
            message: error.message,
          },
        };
      }

      if (error.message.includes('region') || error.message.includes('endpoint')) {
        logger.error('Region error', {
          component: 'AzureSpeechRepository',
          error: error.message,
        });

        return {
          success: false,
          error: {
            type: 'INVALID_REGION',
            region: error.message,
          },
        };
      }

      if (error.message.includes('network') || error.message.includes('connection')) {
        logger.error('Network error', {
          component: 'AzureSpeechRepository',
          error: error.message,
        });

        return {
          success: false,
          error: {
            type: 'NETWORK_ERROR',
            message: error.message,
          },
        };
      }

      // Generic error
      logger.error('Speech synthesis error', {
        component: 'AzureSpeechRepository',
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        error: {
          type: 'SYNTHESIS_FAILED',
          reason: error.message,
        },
      };
    }

    // Unknown error type
    logger.error('Unknown error during speech synthesis', {
      component: 'AzureSpeechRepository',
      error: String(error),
    });

    return {
      success: false,
      error: {
        type: 'SYNTHESIS_FAILED',
        reason: 'Unknown error occurred',
      },
    };
  }
}
