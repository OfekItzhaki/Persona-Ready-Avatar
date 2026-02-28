import { logger } from '../logger';
import { stripSSML as stripSSMLUtil, detectSSML as detectSSMLUtil } from '../utils/ssml';
import type {
  ITTSService,
  IAzureSpeechRepository,
  IAudioManager,
  IVisemeCoordinator,
  Result,
  TTSError,
  VisemeEvent,
  SpeechConfig,
} from '@/types';
import { LanguageVoiceMapper } from './LanguageVoiceMapper';
import { PreferencesService } from './PreferencesService';

/**
 * TTSService
 * 
 * Orchestrates text-to-speech synthesis with audio playback and viseme coordination.
 * 
 * Responsibilities:
 * - Coordinate between AzureSpeechRepository, AudioManager, and VisemeCoordinator
 * - Use LanguageVoiceMapper to select appropriate voice based on language
 * - Forward viseme events from Azure Speech SDK to VisemeCoordinator
 * - Start audio playback via AudioManager
 * - Handle synthesis errors and emit notifications
 * - Provide stop functionality to halt synthesis and playback
 * 
 * Key Features:
 * - Dependency injection for testability
 * - Event-driven architecture for viseme synchronization
 * - Comprehensive error handling with domain error types
 * - Structured logging for observability
 */
export class TTSService implements ITTSService {
  private azureSpeechRepository: IAzureSpeechRepository;
  private audioManager: IAudioManager;
  private visemeCoordinator: IVisemeCoordinator;
  private languageVoiceMapper: LanguageVoiceMapper;
  private preferencesService: PreferencesService;
  private visemeSubscribers: Set<(viseme: VisemeEvent) => void> = new Set();
  private isActive: boolean = false;

  constructor(
    azureSpeechRepository: IAzureSpeechRepository,
    audioManager: IAudioManager,
    visemeCoordinator: IVisemeCoordinator,
    languageVoiceMapper: LanguageVoiceMapper,
    preferencesService: PreferencesService
  ) {
    this.azureSpeechRepository = azureSpeechRepository;
    this.audioManager = audioManager;
    this.visemeCoordinator = visemeCoordinator;
    this.languageVoiceMapper = languageVoiceMapper;
    this.preferencesService = preferencesService;

    logger.info('TTSService initialized', {
      component: 'TTSService',
    });
  }

  /**
   * Synthesize speech from text and start playback with viseme coordination
   * 
   * @param text - The text to synthesize (can contain SSML markup)
   * @param voice - The voice identifier (can be overridden by language-based selection)
   * @param language - The language code for voice selection
   * @returns Result containing AudioBuffer or TTSError
   */
  async synthesizeSpeech(
    text: string,
    voice: string,
    language: string
  ): Promise<Result<AudioBuffer, TTSError>> {
    logger.info('Starting speech synthesis', {
      component: 'TTSService',
      textLength: text.length,
      voice,
      language,
    });

    try {
      // Stop any existing playback
      this.stop();

      // Select appropriate voice based on language
      const selectedVoice = this.languageVoiceMapper.getVoiceForLanguage(language) || voice;

      // Load speech rate and pitch from preferences
      const audioPreferences = this.preferencesService['store'].audioPreferences;
      const speechRate = audioPreferences.speechRate;
      const speechPitch = audioPreferences.speechPitch;

      // Detect and validate SSML markup
      const hasSSML = detectSSMLUtil(text);
      let processedText = text;
      let isValidSSML = false;

      if (hasSSML) {
        logger.debug('SSML markup detected in text', {
          component: 'TTSService',
        });

        // Validate SSML structure
        const validationResult = this.validateSSML(text);
        
        if (validationResult.isValid) {
          isValidSSML = true;
          processedText = text;
          
          logger.debug('SSML validation passed', {
            component: 'TTSService',
          });
        } else {
          // SSML validation failed - fall back to plain text
          logger.warn('SSML validation failed, falling back to plain text', {
            component: 'TTSService',
            error: validationResult.error,
          });

          // Strip SSML tags and use plain text
          processedText = stripSSMLUtil(text);
        }
      }

      logger.debug('Voice selected', {
        component: 'TTSService',
        requestedVoice: voice,
        selectedVoice,
        language,
        speechRate,
        speechPitch,
        hasSSML,
        isValidSSML,
      });

      // Configure speech synthesis
      const config: SpeechConfig = {
        voice: selectedVoice,
        language,
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
        rate: speechRate,
        pitch: speechPitch,
      };

      // Call Azure Speech Repository to synthesize speech
      // Pass isValidSSML flag to indicate whether to use SSML or plain text
      const result = await this.azureSpeechRepository.synthesize(
        processedText, 
        config, 
        isValidSSML
      );

      if (!result.success) {
        // Transform SpeechError to TTSError
        const ttsError = this.transformSpeechError(result.error);
        
        logger.error('Speech synthesis failed', {
          component: 'TTSService',
          error: ttsError,
        });

        return {
          success: false,
          error: ttsError,
        };
      }

      const { audioBuffer, visemes } = result.data;

      logger.info('Speech synthesis completed', {
        component: 'TTSService',
        audioDuration: audioBuffer.duration,
        visemeCount: visemes.length,
      });

      // Mark service as active
      this.isActive = true;

      // Forward viseme events to subscribers
      this.emitVisemeEvents(visemes);

      // Start viseme coordination
      this.visemeCoordinator.start(audioBuffer, visemes);

      // Start audio playback
      await this.audioManager.play(audioBuffer);

      logger.info('Audio playback started', {
        component: 'TTSService',
        duration: audioBuffer.duration,
      });

      return {
        success: true,
        data: audioBuffer,
      };
    } catch (error) {
      const ttsError = this.handleError(error);
      
      logger.error('Unexpected error during speech synthesis', {
        component: 'TTSService',
        error: ttsError,
      });

      // Clean up on error
      this.stop();

      return {
        success: false,
        error: ttsError,
      };
    }
  }

  /**
   * Subscribe to viseme events
   * Returns unsubscribe function
   * 
   * @param callback - Function to call when viseme events are emitted
   * @returns Unsubscribe function
   */
  subscribeToVisemes(callback: (viseme: VisemeEvent) => void): () => void {
    this.visemeSubscribers.add(callback);

    logger.debug('Viseme subscriber added', {
      component: 'TTSService',
      subscriberCount: this.visemeSubscribers.size,
    });

    // Return unsubscribe function
    return () => {
      this.visemeSubscribers.delete(callback);
      
      logger.debug('Viseme subscriber removed', {
        component: 'TTSService',
        subscriberCount: this.visemeSubscribers.size,
      });
    };
  }

  /**
   * Stop synthesis and playback
   * Halts audio playback and viseme coordination
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    logger.info('Stopping TTS playback', {
      component: 'TTSService',
    });

    try {
      // Stop audio playback
      this.audioManager.stop();

      // Stop viseme coordination
      this.visemeCoordinator.stop();

      // Mark service as inactive
      this.isActive = false;

      logger.info('TTS playback stopped', {
        component: 'TTSService',
      });
    } catch (error) {
      logger.error('Error stopping TTS playback', {
        component: 'TTSService',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Force inactive state even if stop fails
      this.isActive = false;
    }
  }

  /**
   * Emit viseme events to all subscribers
   * 
   * @param visemes - Array of viseme events to emit
   */
  private emitVisemeEvents(visemes: VisemeEvent[]): void {
    logger.debug('Emitting viseme events to subscribers', {
      component: 'TTSService',
      visemeCount: visemes.length,
      subscriberCount: this.visemeSubscribers.size,
    });

    visemes.forEach((viseme) => {
      this.visemeSubscribers.forEach((callback) => {
        try {
          callback(viseme);
        } catch (error) {
          logger.error('Error in viseme subscriber callback', {
            component: 'TTSService',
            error: error instanceof Error ? error.message : 'Unknown error',
            viseme,
          });
        }
      });
    });
  }

  /**
   * Transform SpeechError to TTSError
   * 
   * @param error - The SpeechError from AzureSpeechRepository
   * @returns Corresponding TTSError
   */
  private transformSpeechError(error: any): TTSError {
    switch (error.type) {
      case 'NETWORK_ERROR':
        return {
          type: 'NETWORK_ERROR',
          message: error.message,
        };
      
      case 'INVALID_KEY':
      case 'INVALID_REGION':
      case 'SYNTHESIS_FAILED':
        return {
          type: 'SYNTHESIS_FAILED',
          details: error.message || error.reason || 'Speech synthesis failed',
        };
      
      default:
        return {
          type: 'SYNTHESIS_FAILED',
          details: 'Unknown error occurred during speech synthesis',
        };
    }
  }

  /**
   * Handle unexpected errors and transform to TTSError
   * 
   * @param error - The caught error
   * @returns TTSError
   */
  private handleError(error: unknown): TTSError {
    if (error instanceof Error) {
      // Check for network-related errors
      if (
        error.message.includes('network') ||
        error.message.includes('connection') ||
        error.message.includes('timeout')
      ) {
        return {
          type: 'NETWORK_ERROR',
          message: error.message,
        };
      }

      // Generic synthesis failure
      return {
        type: 'SYNTHESIS_FAILED',
        details: error.message,
      };
    }

    // Unknown error type
    return {
      type: 'SYNTHESIS_FAILED',
      details: 'Unknown error occurred',
    };
  }

  /**
   * Check if TTS service is currently active
   * 
   * @returns True if synthesis/playback is active, false otherwise
   */
  isPlaying(): boolean {
    return this.isActive;
  }

  /**
   * Validate SSML structure
   * 
   * @param text - The SSML text to validate
   * @returns Validation result with isValid flag and optional error message
   */
  private validateSSML(text: string): { isValid: boolean; error?: string } {
    try {
      // Basic validation: check for balanced tags
      // Check if text starts with <speak> and ends with </speak>
      const trimmedText = text.trim();
      
      if (!trimmedText.startsWith('<speak')) {
        return {
          isValid: false,
          error: 'SSML must start with <speak> tag',
        };
      }

      if (!trimmedText.endsWith('</speak>')) {
        return {
          isValid: false,
          error: 'SSML must end with </speak> tag',
        };
      }

      // Check for balanced tags using a simple stack-based approach
      const tagStack: string[] = [];
      const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9-]*)[^>]*>/g;
      let match;

      while ((match = tagPattern.exec(text)) !== null) {
        const fullTag = match[0];
        const tagName = match[1];

        // Self-closing tag (e.g., <break />)
        if (fullTag.endsWith('/>')) {
          continue;
        }

        // Closing tag
        if (fullTag.startsWith('</')) {
          if (tagStack.length === 0) {
            return {
              isValid: false,
              error: `Unexpected closing tag: ${fullTag}`,
            };
          }

          const lastOpenTag = tagStack.pop();
          if (lastOpenTag !== tagName) {
            return {
              isValid: false,
              error: `Mismatched tags: expected </${lastOpenTag}>, found ${fullTag}`,
            };
          }
        } else {
          // Opening tag
          tagStack.push(tagName);
        }
      }

      // Check if all tags are closed
      if (tagStack.length > 0) {
        return {
          isValid: false,
          error: `Unclosed tags: ${tagStack.join(', ')}`,
        };
      }

      // Validation passed
      return { isValid: true };
    } catch (error) {
      logger.error('Error during SSML validation', {
        component: 'TTSService',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error',
      };
    }
  }

  /**
   * Dispose of TTSService and clean up all resources
   * Should be called when the component unmounts
   */
  dispose(): void {
    this.stop();
    this.visemeSubscribers.clear();

    logger.info('TTSService disposed', {
      component: 'TTSService',
    });
  }
}
