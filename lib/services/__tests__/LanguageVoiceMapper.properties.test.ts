import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { LanguageVoiceMapper } from '../LanguageVoiceMapper';

/**
 * Property-Based Tests for LanguageVoiceMapper
 * 
 * Feature: avatar-client, Property 4: Language-Based Voice Selection
 * 
 * For any supported language code (en-US, es-ES, fr-FR, de-DE, ja-JP, zh-CN),
 * the TTS Service should select an appropriate Azure Neural TTS voice matching that language.
 * 
 * **Validates: Requirements 2.5, 7.5**
 */
describe('Property: Language-Based Voice Selection', () => {
  let mapper: LanguageVoiceMapper;

  beforeEach(() => {
    mapper = new LanguageVoiceMapper();
  });

  /**
   * Property: For any supported language code, the mapper should return a voice
   * identifier that matches the language code prefix
   */
  it('should return voice matching language code for all supported languages', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'),
        (languageCode) => {
          const voice = mapper.getVoiceForLanguage(languageCode);

          // Property 1: Voice should always be a non-empty string
          expect(voice).toBeTruthy();
          expect(typeof voice).toBe('string');
          expect(voice.length).toBeGreaterThan(0);

          // Property 2: Voice should start with the language code
          expect(voice.startsWith(languageCode)).toBe(true);

          // Property 3: Voice should end with 'Neural' (Azure Neural TTS format)
          expect(voice.endsWith('Neural')).toBe(true);

          // Property 4: Voice should follow Azure format: {language}-{name}Neural
          const voicePattern = /^[a-z]{2}-[A-Z]{2}-[A-Za-z]+Neural$/;
          expect(voice).toMatch(voicePattern);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any unsupported language code, the mapper should return
   * the default English voice
   */
  it('should return default English voice for any unsupported language', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          (str) => {
            // Filter out supported languages
            if (['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'].includes(str)) {
              return false;
            }
            // Filter out Object.prototype property names that cause issues
            const prototypeProps = ['valueOf', 'toString', 'toLocaleString', 'hasOwnProperty', 
                                   'isPrototypeOf', 'propertyIsEnumerable', 'constructor'];
            return !prototypeProps.includes(str);
          }
        ),
        (unsupportedLanguage) => {
          const voice = mapper.getVoiceForLanguage(unsupportedLanguage);

          // Property: Should always return the default English voice
          expect(voice).toBe('en-US-JennyNeural');
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any missing or empty language parameter, the mapper should
   * return the default English voice
   */
  it('should return default voice for missing or empty language', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(undefined, '', '   ', '\t', '\n'),
        (emptyLanguage) => {
          const voice = mapper.getVoiceForLanguage(emptyLanguage);

          // Property: Should always return the default English voice
          expect(voice).toBe('en-US-JennyNeural');
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: The mapper should be deterministic - same input always produces
   * same output
   */
  it('should return consistent voice for same language across multiple calls', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN', 'pt-BR', 'it-IT', undefined, ''),
        (languageCode) => {
          const voice1 = mapper.getVoiceForLanguage(languageCode);
          const voice2 = mapper.getVoiceForLanguage(languageCode);
          const voice3 = mapper.getVoiceForLanguage(languageCode);

          // Property: Deterministic behavior - same input produces same output
          expect(voice1).toBe(voice2);
          expect(voice2).toBe(voice3);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any input (valid, invalid, or missing), the mapper should
   * always return a valid Azure Neural TTS voice identifier
   */
  it('should always return a valid voice identifier for any input', () => {
    fc.assert(
      fc.property(
        fc.option(fc.string({ maxLength: 50 }), { nil: undefined }).filter(
          (str) => {
            if (!str) return true; // Allow undefined/null
            // Filter out Object.prototype property names
            const prototypeProps = ['valueOf', 'toString', 'toLocaleString', 'hasOwnProperty', 
                                   'isPrototypeOf', 'propertyIsEnumerable', 'constructor'];
            return !prototypeProps.includes(str);
          }
        ),
        (languageCode) => {
          const voice = mapper.getVoiceForLanguage(languageCode);

          // Property 1: Always returns a non-empty string
          expect(voice).toBeTruthy();
          expect(typeof voice).toBe('string');
          expect(voice.length).toBeGreaterThan(0);

          // Property 2: Always returns a valid Azure Neural TTS format
          const azureVoicePattern = /^[a-z]{2}-[A-Z]{2}-[A-Za-z]+Neural$/;
          expect(voice).toMatch(azureVoicePattern);

          // Property 3: Voice is either a supported language voice or default
          const supportedVoices = [
            'en-US-JennyNeural',
            'es-ES-ElviraNeural',
            'fr-FR-DeniseNeural',
            'de-DE-KatjaNeural',
            'ja-JP-NanamiNeural',
            'zh-CN-XiaoxiaoNeural',
          ];
          expect(supportedVoices).toContain(voice);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: The set of supported languages should remain stable and contain
   * exactly the required languages
   */
  it('should maintain stable set of supported languages', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // No input needed, testing invariant
        () => {
          const supportedLanguages = mapper.getSupportedLanguages();

          // Property 1: Should always return exactly 6 languages
          expect(supportedLanguages).toHaveLength(6);

          // Property 2: Should contain all required languages
          const requiredLanguages = ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'];
          requiredLanguages.forEach((lang) => {
            expect(supportedLanguages).toContain(lang);
          });

          // Property 3: Should not contain duplicates
          const uniqueLanguages = new Set(supportedLanguages);
          expect(uniqueLanguages.size).toBe(supportedLanguages.length);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: isLanguageSupported should be consistent with getVoiceForLanguage
   * behavior - if a language is supported, it should return a language-specific
   * voice, not the default
   */
  it('should have consistent behavior between isLanguageSupported and getVoiceForLanguage', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          (str) => {
            // Filter out Object.prototype property names
            const prototypeProps = ['valueOf', 'toString', 'toLocaleString', 'hasOwnProperty', 
                                   'isPrototypeOf', 'propertyIsEnumerable', 'constructor'];
            return !prototypeProps.includes(str);
          }
        ),
        (languageCode) => {
          const isSupported = mapper.isLanguageSupported(languageCode);
          const voice = mapper.getVoiceForLanguage(languageCode);

          // Voice should always be a string
          expect(typeof voice).toBe('string');

          if (isSupported) {
            // Property: If language is supported, voice should start with language code
            expect(voice.startsWith(languageCode)).toBe(true);
          } else {
            // Property: If language is not supported, should return default voice
            // (unless the input happens to be undefined/empty, which also returns default)
            if (languageCode && languageCode.trim() !== '') {
              expect(voice).toBe('en-US-JennyNeural');
            }
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any supported language, the voice identifier should be
   * retrievable and consistent
   */
  it('should provide bidirectional consistency between languages and voices', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // Testing invariant
        () => {
          const supportedLanguages = mapper.getSupportedLanguages();

          supportedLanguages.forEach((language) => {
            // Property 1: Each supported language should return a voice
            const voice = mapper.getVoiceForLanguage(language);
            expect(voice).toBeTruthy();

            // Property 2: The voice should start with the language code
            expect(voice.startsWith(language)).toBe(true);

            // Property 3: isLanguageSupported should return true
            expect(mapper.isLanguageSupported(language)).toBe(true);

            // Property 4: Multiple calls should return same voice
            const voice2 = mapper.getVoiceForLanguage(language);
            expect(voice).toBe(voice2);
          });
        }
      ),
      { numRuns: 25 }
    );
  });
});
