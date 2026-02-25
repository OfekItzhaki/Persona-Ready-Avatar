import { logger } from '../logger';

/**
 * Language-to-Voice Mapping
 * 
 * Maps language codes to Azure Neural TTS voice identifiers.
 * Supports multi-language voice selection for the avatar TTS system.
 */
const LANGUAGE_VOICE_MAP: Record<string, string> = {
  'en-US': 'en-US-JennyNeural',
  'es-ES': 'es-ES-ElviraNeural',
  'fr-FR': 'fr-FR-DeniseNeural',
  'de-DE': 'de-DE-KatjaNeural',
  'ja-JP': 'ja-JP-NanamiNeural',
  'zh-CN': 'zh-CN-XiaoxiaoNeural',
};

/**
 * Default voice identifier used when language is not provided or unsupported
 */
const DEFAULT_VOICE = 'en-US-JennyNeural';

/**
 * LanguageVoiceMapper
 * 
 * Utility class for mapping language codes to Azure Neural TTS voice identifiers.
 * Provides fallback to default English voice when language is not supported.
 */
export class LanguageVoiceMapper {
  /**
   * Get the Azure Neural TTS voice identifier for a given language code
   * 
   * @param language - Language code (e.g., 'en-US', 'es-ES', 'fr-FR')
   * @returns Azure Neural TTS voice identifier
   * 
   * @example
   * ```typescript
   * const mapper = new LanguageVoiceMapper();
   * const voice = mapper.getVoiceForLanguage('es-ES'); // Returns 'es-ES-ElviraNeural'
   * const defaultVoice = mapper.getVoiceForLanguage('pt-BR'); // Returns 'en-US-JennyNeural' with warning
   * const fallback = mapper.getVoiceForLanguage(undefined); // Returns 'en-US-JennyNeural'
   * ```
   */
  getVoiceForLanguage(language?: string): string {
    // Handle missing or empty language parameter
    if (!language || language.trim() === '') {
      // Only log debug for truly missing (undefined/null), warn for empty string
      if (language === undefined || language === null) {
        logger.debug('No language provided, using default voice', {
          component: 'LanguageVoiceMapper',
          defaultVoice: DEFAULT_VOICE,
        });
      } else {
        logger.warn('Empty language code received, falling back to default voice', {
          component: 'LanguageVoiceMapper',
          requestedLanguage: language,
          defaultVoice: DEFAULT_VOICE,
          supportedLanguages: Object.keys(LANGUAGE_VOICE_MAP),
        });
      }
      return DEFAULT_VOICE;
    }

    // Check if language is supported
    const voice = LANGUAGE_VOICE_MAP[language];
    
    if (!voice) {
      logger.warn('Unsupported language code received, falling back to default voice', {
        component: 'LanguageVoiceMapper',
        requestedLanguage: language,
        defaultVoice: DEFAULT_VOICE,
        supportedLanguages: Object.keys(LANGUAGE_VOICE_MAP),
      });
      return DEFAULT_VOICE;
    }

    logger.debug('Voice selected for language', {
      component: 'LanguageVoiceMapper',
      language,
      voice,
    });

    return voice;
  }

  /**
   * Get the list of supported language codes
   * 
   * @returns Array of supported language codes
   */
  getSupportedLanguages(): string[] {
    return Object.keys(LANGUAGE_VOICE_MAP);
  }

  /**
   * Check if a language code is supported
   * 
   * @param language - Language code to check
   * @returns True if the language is supported, false otherwise
   */
  isLanguageSupported(language: string): boolean {
    return language in LANGUAGE_VOICE_MAP;
  }
}

// Export singleton instance for convenience
export const languageVoiceMapper = new LanguageVoiceMapper();
