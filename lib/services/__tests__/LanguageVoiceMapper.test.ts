import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LanguageVoiceMapper, languageVoiceMapper } from '../LanguageVoiceMapper';
import { logger } from '../../logger';

/**
 * Unit Tests for LanguageVoiceMapper
 * 
 * Tests cover:
 * - Voice selection for all supported languages
 * - Default fallback for unsupported languages
 * - Warning logging for unsupported languages
 * - Edge cases (empty strings, null, undefined)
 * 
 * **Validates: Requirements 2.5, 7.1-7.5**
 */
describe('LanguageVoiceMapper', () => {
  let mapper: LanguageVoiceMapper;

  beforeEach(() => {
    mapper = new LanguageVoiceMapper();
    // Spy on logger methods
    vi.spyOn(logger, 'debug');
    vi.spyOn(logger, 'warn');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getVoiceForLanguage - supported languages', () => {
    it('should return correct voice for English (en-US)', () => {
      const voice = mapper.getVoiceForLanguage('en-US');
      expect(voice).toBe('en-US-JennyNeural');
      expect(logger.debug).toHaveBeenCalledWith(
        'Voice selected for language',
        expect.objectContaining({
          component: 'LanguageVoiceMapper',
          language: 'en-US',
          voice: 'en-US-JennyNeural',
        })
      );
    });

    it('should return correct voice for Spanish (es-ES)', () => {
      const voice = mapper.getVoiceForLanguage('es-ES');
      expect(voice).toBe('es-ES-ElviraNeural');
      expect(logger.debug).toHaveBeenCalledWith(
        'Voice selected for language',
        expect.objectContaining({
          component: 'LanguageVoiceMapper',
          language: 'es-ES',
          voice: 'es-ES-ElviraNeural',
        })
      );
    });

    it('should return correct voice for French (fr-FR)', () => {
      const voice = mapper.getVoiceForLanguage('fr-FR');
      expect(voice).toBe('fr-FR-DeniseNeural');
      expect(logger.debug).toHaveBeenCalledWith(
        'Voice selected for language',
        expect.objectContaining({
          component: 'LanguageVoiceMapper',
          language: 'fr-FR',
          voice: 'fr-FR-DeniseNeural',
        })
      );
    });

    it('should return correct voice for German (de-DE)', () => {
      const voice = mapper.getVoiceForLanguage('de-DE');
      expect(voice).toBe('de-DE-KatjaNeural');
      expect(logger.debug).toHaveBeenCalledWith(
        'Voice selected for language',
        expect.objectContaining({
          component: 'LanguageVoiceMapper',
          language: 'de-DE',
          voice: 'de-DE-KatjaNeural',
        })
      );
    });

    it('should return correct voice for Japanese (ja-JP)', () => {
      const voice = mapper.getVoiceForLanguage('ja-JP');
      expect(voice).toBe('ja-JP-NanamiNeural');
      expect(logger.debug).toHaveBeenCalledWith(
        'Voice selected for language',
        expect.objectContaining({
          component: 'LanguageVoiceMapper',
          language: 'ja-JP',
          voice: 'ja-JP-NanamiNeural',
        })
      );
    });

    it('should return correct voice for Chinese (zh-CN)', () => {
      const voice = mapper.getVoiceForLanguage('zh-CN');
      expect(voice).toBe('zh-CN-XiaoxiaoNeural');
      expect(logger.debug).toHaveBeenCalledWith(
        'Voice selected for language',
        expect.objectContaining({
          component: 'LanguageVoiceMapper',
          language: 'zh-CN',
          voice: 'zh-CN-XiaoxiaoNeural',
        })
      );
    });

    it('should handle all supported languages correctly', () => {
      const supportedLanguages = [
        { lang: 'en-US', expectedVoice: 'en-US-JennyNeural' },
        { lang: 'es-ES', expectedVoice: 'es-ES-ElviraNeural' },
        { lang: 'fr-FR', expectedVoice: 'fr-FR-DeniseNeural' },
        { lang: 'de-DE', expectedVoice: 'de-DE-KatjaNeural' },
        { lang: 'ja-JP', expectedVoice: 'ja-JP-NanamiNeural' },
        { lang: 'zh-CN', expectedVoice: 'zh-CN-XiaoxiaoNeural' },
      ];

      supportedLanguages.forEach(({ lang, expectedVoice }) => {
        const voice = mapper.getVoiceForLanguage(lang);
        expect(voice).toBe(expectedVoice);
      });
    });
  });

  describe('getVoiceForLanguage - unsupported languages', () => {
    it('should return default voice for unsupported language code', () => {
      const voice = mapper.getVoiceForLanguage('pt-BR');
      expect(voice).toBe('en-US-JennyNeural');
    });

    it('should log warning for unsupported language code', () => {
      mapper.getVoiceForLanguage('pt-BR');
      expect(logger.warn).toHaveBeenCalledWith(
        'Unsupported language code received, falling back to default voice',
        expect.objectContaining({
          component: 'LanguageVoiceMapper',
          requestedLanguage: 'pt-BR',
          defaultVoice: 'en-US-JennyNeural',
          supportedLanguages: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'],
        })
      );
    });

    it('should return default voice for Italian (it-IT)', () => {
      const voice = mapper.getVoiceForLanguage('it-IT');
      expect(voice).toBe('en-US-JennyNeural');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should return default voice for Korean (ko-KR)', () => {
      const voice = mapper.getVoiceForLanguage('ko-KR');
      expect(voice).toBe('en-US-JennyNeural');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should return default voice for Russian (ru-RU)', () => {
      const voice = mapper.getVoiceForLanguage('ru-RU');
      expect(voice).toBe('en-US-JennyNeural');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should return default voice for invalid language code format', () => {
      const voice = mapper.getVoiceForLanguage('invalid-lang');
      expect(voice).toBe('en-US-JennyNeural');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should return default voice for random string', () => {
      const voice = mapper.getVoiceForLanguage('xyz123');
      expect(voice).toBe('en-US-JennyNeural');
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('getVoiceForLanguage - missing or empty language', () => {
    it('should return default voice when language is undefined', () => {
      const voice = mapper.getVoiceForLanguage(undefined);
      expect(voice).toBe('en-US-JennyNeural');
    });

    it('should log debug message when language is undefined', () => {
      mapper.getVoiceForLanguage(undefined);
      expect(logger.debug).toHaveBeenCalledWith(
        'No language provided, using default voice',
        expect.objectContaining({
          component: 'LanguageVoiceMapper',
          defaultVoice: 'en-US-JennyNeural',
        })
      );
    });

    it('should return default voice when language is empty string', () => {
      const voice = mapper.getVoiceForLanguage('');
      expect(voice).toBe('en-US-JennyNeural');
    });

    it('should log warning when language is empty string', () => {
      mapper.getVoiceForLanguage('');
      expect(logger.warn).toHaveBeenCalledWith(
        'Empty language code received, falling back to default voice',
        expect.objectContaining({
          component: 'LanguageVoiceMapper',
          requestedLanguage: '',
          defaultVoice: 'en-US-JennyNeural',
          supportedLanguages: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'],
        })
      );
    });

    it('should return default voice when language is whitespace only', () => {
      const voice = mapper.getVoiceForLanguage('   ');
      expect(voice).toBe('en-US-JennyNeural');
    });

    it('should log warning when language is whitespace only', () => {
      mapper.getVoiceForLanguage('   ');
      expect(logger.warn).toHaveBeenCalledWith(
        'Empty language code received, falling back to default voice',
        expect.objectContaining({
          component: 'LanguageVoiceMapper',
          requestedLanguage: '   ',
          defaultVoice: 'en-US-JennyNeural',
        })
      );
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return array of all supported language codes', () => {
      const languages = mapper.getSupportedLanguages();
      expect(languages).toEqual(['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN']);
    });

    it('should return array with 6 languages', () => {
      const languages = mapper.getSupportedLanguages();
      expect(languages).toHaveLength(6);
    });

    it('should include all required languages from requirements', () => {
      const languages = mapper.getSupportedLanguages();
      expect(languages).toContain('en-US');
      expect(languages).toContain('es-ES');
      expect(languages).toContain('fr-FR');
      expect(languages).toContain('de-DE');
      expect(languages).toContain('ja-JP');
      expect(languages).toContain('zh-CN');
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for supported language en-US', () => {
      expect(mapper.isLanguageSupported('en-US')).toBe(true);
    });

    it('should return true for supported language es-ES', () => {
      expect(mapper.isLanguageSupported('es-ES')).toBe(true);
    });

    it('should return true for supported language fr-FR', () => {
      expect(mapper.isLanguageSupported('fr-FR')).toBe(true);
    });

    it('should return true for supported language de-DE', () => {
      expect(mapper.isLanguageSupported('de-DE')).toBe(true);
    });

    it('should return true for supported language ja-JP', () => {
      expect(mapper.isLanguageSupported('ja-JP')).toBe(true);
    });

    it('should return true for supported language zh-CN', () => {
      expect(mapper.isLanguageSupported('zh-CN')).toBe(true);
    });

    it('should return false for unsupported language pt-BR', () => {
      expect(mapper.isLanguageSupported('pt-BR')).toBe(false);
    });

    it('should return false for unsupported language it-IT', () => {
      expect(mapper.isLanguageSupported('it-IT')).toBe(false);
    });

    it('should return false for invalid language code', () => {
      expect(mapper.isLanguageSupported('invalid')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(mapper.isLanguageSupported('')).toBe(false);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(languageVoiceMapper).toBeInstanceOf(LanguageVoiceMapper);
    });

    it('should work correctly with singleton instance', () => {
      const voice = languageVoiceMapper.getVoiceForLanguage('es-ES');
      expect(voice).toBe('es-ES-ElviraNeural');
    });

    it('should have same behavior as new instance', () => {
      const newInstance = new LanguageVoiceMapper();
      const singletonVoice = languageVoiceMapper.getVoiceForLanguage('fr-FR');
      const newInstanceVoice = newInstance.getVoiceForLanguage('fr-FR');
      expect(singletonVoice).toBe(newInstanceVoice);
    });
  });

  describe('edge cases', () => {
    it('should handle language code with different casing (lowercase)', () => {
      const voice = mapper.getVoiceForLanguage('en-us');
      // Should not match due to case sensitivity, falls back to default
      expect(voice).toBe('en-US-JennyNeural');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle language code with different casing (uppercase)', () => {
      const voice = mapper.getVoiceForLanguage('EN-US');
      // Should not match due to case sensitivity, falls back to default
      expect(voice).toBe('en-US-JennyNeural');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle language code with extra whitespace', () => {
      const voice = mapper.getVoiceForLanguage(' en-US ');
      // Should not match due to whitespace, falls back to default
      expect(voice).toBe('en-US-JennyNeural');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle very long string', () => {
      const voice = mapper.getVoiceForLanguage('a'.repeat(1000));
      expect(voice).toBe('en-US-JennyNeural');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle special characters in language code', () => {
      const voice = mapper.getVoiceForLanguage('en@US');
      expect(voice).toBe('en-US-JennyNeural');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should handle numeric string', () => {
      const voice = mapper.getVoiceForLanguage('12345');
      expect(voice).toBe('en-US-JennyNeural');
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('logging behavior', () => {
    it('should not log warning for supported languages', () => {
      mapper.getVoiceForLanguage('en-US');
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should log debug for supported languages', () => {
      mapper.getVoiceForLanguage('es-ES');
      expect(logger.debug).toHaveBeenCalledWith(
        'Voice selected for language',
        expect.any(Object)
      );
    });

    it('should include supported languages list in warning', () => {
      mapper.getVoiceForLanguage('unsupported');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          supportedLanguages: expect.arrayContaining(['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN']),
        })
      );
    });

    it('should include requested language in warning', () => {
      mapper.getVoiceForLanguage('pt-BR');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          requestedLanguage: 'pt-BR',
        })
      );
    });

    it('should include component name in all logs', () => {
      mapper.getVoiceForLanguage('en-US');
      expect(logger.debug).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          component: 'LanguageVoiceMapper',
        })
      );
    });
  });

  describe('consistency', () => {
    it('should return same voice for same language on multiple calls', () => {
      const voice1 = mapper.getVoiceForLanguage('ja-JP');
      const voice2 = mapper.getVoiceForLanguage('ja-JP');
      const voice3 = mapper.getVoiceForLanguage('ja-JP');
      expect(voice1).toBe(voice2);
      expect(voice2).toBe(voice3);
    });

    it('should return same default voice for different unsupported languages', () => {
      const voice1 = mapper.getVoiceForLanguage('pt-BR');
      const voice2 = mapper.getVoiceForLanguage('it-IT');
      const voice3 = mapper.getVoiceForLanguage('ko-KR');
      expect(voice1).toBe('en-US-JennyNeural');
      expect(voice2).toBe('en-US-JennyNeural');
      expect(voice3).toBe('en-US-JennyNeural');
    });

    it('should always return a non-empty string', () => {
      const testCases = ['en-US', 'unsupported', '', undefined, 'xyz'];
      testCases.forEach((testCase) => {
        const voice = mapper.getVoiceForLanguage(testCase);
        expect(voice).toBeTruthy();
        expect(typeof voice).toBe('string');
        expect(voice.length).toBeGreaterThan(0);
      });
    });
  });
});
