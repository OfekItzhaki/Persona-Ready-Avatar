import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LanguageVoiceMapper, languageVoiceMapper } from '../services/LanguageVoiceMapper';
import { logger } from '../logger';

describe('LanguageVoiceMapper', () => {
  let mapper: LanguageVoiceMapper;
  let loggerWarnSpy: ReturnType<typeof vi.spyOn>;
  let loggerDebugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mapper = new LanguageVoiceMapper();
    loggerWarnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    loggerDebugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    loggerWarnSpy.mockRestore();
    loggerDebugSpy.mockRestore();
  });

  describe('getVoiceForLanguage', () => {
    describe('supported languages', () => {
      it('should return correct voice for en-US', () => {
        const voice = mapper.getVoiceForLanguage('en-US');
        expect(voice).toBe('en-US-JennyNeural');
      });

      it('should return correct voice for es-ES', () => {
        const voice = mapper.getVoiceForLanguage('es-ES');
        expect(voice).toBe('es-ES-ElviraNeural');
      });

      it('should return correct voice for fr-FR', () => {
        const voice = mapper.getVoiceForLanguage('fr-FR');
        expect(voice).toBe('fr-FR-DeniseNeural');
      });

      it('should return correct voice for de-DE', () => {
        const voice = mapper.getVoiceForLanguage('de-DE');
        expect(voice).toBe('de-DE-KatjaNeural');
      });

      it('should return correct voice for ja-JP', () => {
        const voice = mapper.getVoiceForLanguage('ja-JP');
        expect(voice).toBe('ja-JP-NanamiNeural');
      });

      it('should return correct voice for zh-CN', () => {
        const voice = mapper.getVoiceForLanguage('zh-CN');
        expect(voice).toBe('zh-CN-XiaoxiaoNeural');
      });

      it('should log debug message for supported language', () => {
        mapper.getVoiceForLanguage('es-ES');
        
        expect(loggerDebugSpy).toHaveBeenCalledWith(
          'Voice selected for language',
          expect.objectContaining({
            component: 'LanguageVoiceMapper',
            language: 'es-ES',
            voice: 'es-ES-ElviraNeural',
          })
        );
      });
    });

    describe('unsupported languages', () => {
      it('should return default English voice for unsupported language', () => {
        const voice = mapper.getVoiceForLanguage('pt-BR');
        expect(voice).toBe('en-US-JennyNeural');
      });

      it('should log warning for unsupported language', () => {
        mapper.getVoiceForLanguage('pt-BR');
        
        expect(loggerWarnSpy).toHaveBeenCalledWith(
          'Unsupported language code received, falling back to default voice',
          expect.objectContaining({
            component: 'LanguageVoiceMapper',
            requestedLanguage: 'pt-BR',
            defaultVoice: 'en-US-JennyNeural',
            supportedLanguages: expect.arrayContaining(['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN']),
          })
        );
      });

      it('should handle various unsupported language codes', () => {
        const unsupportedLanguages = ['it-IT', 'ru-RU', 'ko-KR', 'ar-SA'];
        
        unsupportedLanguages.forEach(lang => {
          const voice = mapper.getVoiceForLanguage(lang);
          expect(voice).toBe('en-US-JennyNeural');
        });

        expect(loggerWarnSpy).toHaveBeenCalledTimes(unsupportedLanguages.length);
      });
    });

    describe('missing language parameter', () => {
      it('should return default English voice when language is undefined', () => {
        const voice = mapper.getVoiceForLanguage(undefined);
        expect(voice).toBe('en-US-JennyNeural');
      });

      it('should log debug message when language is not provided', () => {
        mapper.getVoiceForLanguage(undefined);
        
        expect(loggerDebugSpy).toHaveBeenCalledWith(
          'No language provided, using default voice',
          expect.objectContaining({
            component: 'LanguageVoiceMapper',
            defaultVoice: 'en-US-JennyNeural',
          })
        );
      });

      it('should not log warning when language is not provided', () => {
        mapper.getVoiceForLanguage(undefined);
        expect(loggerWarnSpy).not.toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      it('should handle empty string as unsupported language', () => {
        const voice = mapper.getVoiceForLanguage('');
        expect(voice).toBe('en-US-JennyNeural');
        expect(loggerWarnSpy).toHaveBeenCalled();
      });

      it('should be case-sensitive for language codes', () => {
        const voice = mapper.getVoiceForLanguage('EN-US'); // Wrong case
        expect(voice).toBe('en-US-JennyNeural');
        expect(loggerWarnSpy).toHaveBeenCalled();
      });
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return array of all supported language codes', () => {
      const languages = mapper.getSupportedLanguages();
      
      expect(languages).toEqual(
        expect.arrayContaining(['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'])
      );
      expect(languages).toHaveLength(6);
    });

    it('should return a new array each time (not mutate internal state)', () => {
      const languages1 = mapper.getSupportedLanguages();
      const languages2 = mapper.getSupportedLanguages();
      
      expect(languages1).toEqual(languages2);
      expect(languages1).not.toBe(languages2); // Different array instances
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for supported languages', () => {
      expect(mapper.isLanguageSupported('en-US')).toBe(true);
      expect(mapper.isLanguageSupported('es-ES')).toBe(true);
      expect(mapper.isLanguageSupported('fr-FR')).toBe(true);
      expect(mapper.isLanguageSupported('de-DE')).toBe(true);
      expect(mapper.isLanguageSupported('ja-JP')).toBe(true);
      expect(mapper.isLanguageSupported('zh-CN')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(mapper.isLanguageSupported('pt-BR')).toBe(false);
      expect(mapper.isLanguageSupported('it-IT')).toBe(false);
      expect(mapper.isLanguageSupported('ru-RU')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(mapper.isLanguageSupported('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(mapper.isLanguageSupported('EN-US')).toBe(false);
      expect(mapper.isLanguageSupported('en-us')).toBe(false);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(languageVoiceMapper).toBeInstanceOf(LanguageVoiceMapper);
    });

    it('should work with singleton instance', () => {
      const voice = languageVoiceMapper.getVoiceForLanguage('fr-FR');
      expect(voice).toBe('fr-FR-DeniseNeural');
    });
  });
});
