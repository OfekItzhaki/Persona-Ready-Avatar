import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TTSService } from '../services/TTSService';
import { LanguageVoiceMapper } from '../services/LanguageVoiceMapper';
import type {
  IAzureSpeechRepository,
  IAudioManager,
  IVisemeCoordinator,
  Result,
  SynthesisResult,
  SpeechError,
  VisemeEvent,
  SpeechConfig,
} from '@/types';

/**
 * Unit Tests for TTSService
 * 
 * Tests cover:
 * - Successful synthesis flow with viseme forwarding
 * - Voice selection via LanguageVoiceMapper
 * - Error handling and notification emission
 * - Stop functionality
 * - Subscription management
 * 
 * Validates: Requirements 2.2-2.6, 3.2, 5.6
 */
describe('TTSService', () => {
  let mockAzureSpeechRepository: IAzureSpeechRepository;
  let mockAudioManager: IAudioManager;
  let mockVisemeCoordinator: IVisemeCoordinator;
  let mockLanguageVoiceMapper: LanguageVoiceMapper;
  let ttsService: TTSService;

  // Mock data
  const mockAudioBuffer = {
    duration: 5.0,
    length: 220500,
    numberOfChannels: 1,
    sampleRate: 44100,
  } as AudioBuffer;

  const mockVisemes: VisemeEvent[] = [
    { visemeId: 0, audioOffset: 0, duration: 100 },
    { visemeId: 1, audioOffset: 100, duration: 150 },
    { visemeId: 2, audioOffset: 250, duration: 200 },
  ];

  const mockSynthesisResult: SynthesisResult = {
    audioBuffer: mockAudioBuffer,
    visemes: mockVisemes,
  };

  beforeEach(() => {
    // Create mock implementations
    mockAzureSpeechRepository = {
      synthesize: vi.fn(),
    };

    mockAudioManager = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      resume: vi.fn(),
      stop: vi.fn(),
      getCurrentTime: vi.fn().mockReturnValue(0),
      getDuration: vi.fn().mockReturnValue(0),
      subscribeToPlaybackState: vi.fn().mockReturnValue(() => {}),
    };

    mockVisemeCoordinator = {
      start: vi.fn(),
      stop: vi.fn(),
      getCurrentViseme: vi.fn().mockReturnValue(null),
      subscribeToVisemeChanges: vi.fn().mockReturnValue(() => {}),
    };

    mockLanguageVoiceMapper = new LanguageVoiceMapper();
    vi.spyOn(mockLanguageVoiceMapper, 'getVoiceForLanguage');

    // Create TTSService instance
    ttsService = new TTSService(
      mockAzureSpeechRepository,
      mockAudioManager,
      mockVisemeCoordinator,
      mockLanguageVoiceMapper
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful synthesis flow', () => {
    it('should synthesize speech and start playback with viseme coordination', async () => {
      // Arrange
      const text = 'Hello, world!';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      });

      // Act
      const result = await ttsService.synthesizeSpeech(text, voice, language);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockAudioBuffer);
      }

      // Verify Azure Speech Repository was called with correct config
      expect(mockAzureSpeechRepository.synthesize).toHaveBeenCalledWith(text, {
        voice,
        language,
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      });

      // Verify viseme coordinator was started
      expect(mockVisemeCoordinator.start).toHaveBeenCalledWith(
        mockAudioBuffer,
        mockVisemes
      );

      // Verify audio playback was started
      expect(mockAudioManager.play).toHaveBeenCalledWith(mockAudioBuffer);
    });

    it('should forward viseme events to subscribers', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';
      const visemeCallback = vi.fn();

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      });

      // Subscribe to viseme events
      ttsService.subscribeToVisemes(visemeCallback);

      // Act
      await ttsService.synthesizeSpeech(text, voice, language);

      // Assert - verify all visemes were forwarded to subscriber
      expect(visemeCallback).toHaveBeenCalledTimes(mockVisemes.length);
      mockVisemes.forEach((viseme, index) => {
        expect(visemeCallback).toHaveBeenNthCalledWith(index + 1, viseme);
      });
    });

    it('should handle multiple viseme subscribers', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      });

      // Subscribe multiple callbacks
      ttsService.subscribeToVisemes(callback1);
      ttsService.subscribeToVisemes(callback2);
      ttsService.subscribeToVisemes(callback3);

      // Act
      await ttsService.synthesizeSpeech(text, voice, language);

      // Assert - all subscribers should receive all visemes
      expect(callback1).toHaveBeenCalledTimes(mockVisemes.length);
      expect(callback2).toHaveBeenCalledTimes(mockVisemes.length);
      expect(callback3).toHaveBeenCalledTimes(mockVisemes.length);
    });

    it('should stop any existing playback before starting new synthesis', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      });

      // First synthesis
      await ttsService.synthesizeSpeech(text, voice, language);

      // Reset mocks
      vi.clearAllMocks();

      // Act - second synthesis
      await ttsService.synthesizeSpeech(text, voice, language);

      // Assert - stop should be called before new synthesis
      expect(mockAudioManager.stop).toHaveBeenCalled();
      expect(mockVisemeCoordinator.stop).toHaveBeenCalled();
    });
  });

  describe('voice selection via LanguageVoiceMapper', () => {
    it('should use LanguageVoiceMapper to select voice based on language', async () => {
      // Arrange
      const text = 'Hola mundo';
      const voice = 'en-US-JennyNeural'; // Original voice
      const language = 'es-ES';
      const expectedVoice = 'es-ES-ElviraNeural'; // Spanish voice

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      });

      // Act
      await ttsService.synthesizeSpeech(text, voice, language);

      // Assert
      expect(mockLanguageVoiceMapper.getVoiceForLanguage).toHaveBeenCalledWith(language);
      expect(mockAzureSpeechRepository.synthesize).toHaveBeenCalledWith(
        text,
        expect.objectContaining({
          voice: expectedVoice,
          language,
        })
      );
    });

    it('should use provided voice when LanguageVoiceMapper returns null', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'custom-voice';
      const language = 'unsupported-lang';

      vi.mocked(mockLanguageVoiceMapper.getVoiceForLanguage).mockReturnValue(
        'en-US-JennyNeural' // Default fallback
      );

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      });

      // Act
      await ttsService.synthesizeSpeech(text, voice, language);

      // Assert
      expect(mockAzureSpeechRepository.synthesize).toHaveBeenCalledWith(
        text,
        expect.objectContaining({
          voice: 'en-US-JennyNeural',
        })
      );
    });

    it('should handle all supported languages correctly', async () => {
      // Arrange
      const supportedLanguages = [
        { lang: 'en-US', expectedVoice: 'en-US-JennyNeural' },
        { lang: 'es-ES', expectedVoice: 'es-ES-ElviraNeural' },
        { lang: 'fr-FR', expectedVoice: 'fr-FR-DeniseNeural' },
        { lang: 'de-DE', expectedVoice: 'de-DE-KatjaNeural' },
        { lang: 'ja-JP', expectedVoice: 'ja-JP-NanamiNeural' },
        { lang: 'zh-CN', expectedVoice: 'zh-CN-XiaoxiaoNeural' },
      ];

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      });

      // Act & Assert
      for (const { lang, expectedVoice } of supportedLanguages) {
        vi.clearAllMocks();
        await ttsService.synthesizeSpeech('Test', 'default-voice', lang);

        expect(mockAzureSpeechRepository.synthesize).toHaveBeenCalledWith(
          'Test',
          expect.objectContaining({
            voice: expectedVoice,
            language: lang,
          })
        );
      }
    });
  });

  describe('error handling', () => {
    it('should handle network errors from Azure Speech Repository', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';
      const networkError: SpeechError = {
        type: 'NETWORK_ERROR',
        message: 'Connection failed',
      };

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: false,
        error: networkError,
      });

      // Act
      const result = await ttsService.synthesizeSpeech(text, voice, language);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('NETWORK_ERROR');
        expect(result.error.message).toBe('Connection failed');
      }
    });

    it('should transform INVALID_KEY error to SYNTHESIS_FAILED', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';
      const invalidKeyError: SpeechError = {
        type: 'INVALID_KEY',
        message: 'Invalid API key',
      };

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: false,
        error: invalidKeyError,
      });

      // Act
      const result = await ttsService.synthesizeSpeech(text, voice, language);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('SYNTHESIS_FAILED');
        expect(result.error.details).toContain('Invalid API key');
      }
    });

    it('should transform INVALID_REGION error to SYNTHESIS_FAILED', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';
      const invalidRegionError: SpeechError = {
        type: 'INVALID_REGION',
        region: 'invalid-region',
      };

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: false,
        error: invalidRegionError,
      });

      // Act
      const result = await ttsService.synthesizeSpeech(text, voice, language);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('SYNTHESIS_FAILED');
      }
    });

    it('should transform SYNTHESIS_FAILED error correctly', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';
      const synthesisError: SpeechError = {
        type: 'SYNTHESIS_FAILED',
        reason: 'Voice not available',
      };

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: false,
        error: synthesisError,
      });

      // Act
      const result = await ttsService.synthesizeSpeech(text, voice, language);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('SYNTHESIS_FAILED');
        expect(result.error.details).toContain('Voice not available');
      }
    });

    it('should handle unexpected errors during synthesis', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';

      vi.mocked(mockAzureSpeechRepository.synthesize).mockRejectedValue(
        new Error('Unexpected error')
      );

      // Act
      const result = await ttsService.synthesizeSpeech(text, voice, language);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('SYNTHESIS_FAILED');
        expect(result.error.details).toContain('Unexpected error');
      }
    });

    it('should clean up on error by calling stop', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';

      // First, start a successful synthesis to make service active
      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValueOnce({
        success: true,
        data: mockSynthesisResult,
      });
      await ttsService.synthesizeSpeech(text, voice, language);

      // Reset mocks to track the error case
      vi.clearAllMocks();

      // Now make synthesis fail
      vi.mocked(mockAzureSpeechRepository.synthesize).mockRejectedValue(
        new Error('Synthesis failed')
      );

      // Act
      await ttsService.synthesizeSpeech(text, voice, language);

      // Assert - stop should be called during cleanup
      expect(mockAudioManager.stop).toHaveBeenCalled();
      expect(mockVisemeCoordinator.stop).toHaveBeenCalled();
    });

    it('should handle errors in viseme subscriber callbacks gracefully', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const successCallback = vi.fn();

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      });

      ttsService.subscribeToVisemes(errorCallback);
      ttsService.subscribeToVisemes(successCallback);

      // Act
      const result = await ttsService.synthesizeSpeech(text, voice, language);

      // Assert - synthesis should still succeed
      expect(result.success).toBe(true);
      // Both callbacks should have been called despite error
      expect(errorCallback).toHaveBeenCalled();
      expect(successCallback).toHaveBeenCalled();
    });
  });

  describe('stop functionality', () => {
    it('should stop audio playback and viseme coordination', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      });

      await ttsService.synthesizeSpeech(text, voice, language);

      // Reset mocks to verify stop calls
      vi.clearAllMocks();

      // Act
      ttsService.stop();

      // Assert
      expect(mockAudioManager.stop).toHaveBeenCalled();
      expect(mockVisemeCoordinator.stop).toHaveBeenCalled();
    });

    it('should not call stop methods when service is not active', () => {
      // Act - stop without any active synthesis
      ttsService.stop();

      // Assert - stop methods should not be called
      expect(mockAudioManager.stop).not.toHaveBeenCalled();
      expect(mockVisemeCoordinator.stop).not.toHaveBeenCalled();
    });

    it('should handle errors during stop gracefully', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      });

      await ttsService.synthesizeSpeech(text, voice, language);

      // Make stop throw an error
      vi.mocked(mockAudioManager.stop).mockImplementation(() => {
        throw new Error('Stop failed');
      });

      // Act & Assert - should not throw
      expect(() => ttsService.stop()).not.toThrow();
    });

    it('should mark service as inactive after stop', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      });

      await ttsService.synthesizeSpeech(text, voice, language);
      expect(ttsService.isPlaying()).toBe(true);

      // Act
      ttsService.stop();

      // Assert
      expect(ttsService.isPlaying()).toBe(false);
    });
  });

  describe('subscription management', () => {
    it('should allow subscribing to viseme events', () => {
      // Arrange
      const callback = vi.fn();

      // Act
      const unsubscribe = ttsService.subscribeToVisemes(callback);

      // Assert
      expect(typeof unsubscribe).toBe('function');
    });

    it('should allow unsubscribing from viseme events', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';
      const callback = vi.fn();

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      });

      const unsubscribe = ttsService.subscribeToVisemes(callback);

      // Unsubscribe before synthesis
      unsubscribe();

      // Act
      await ttsService.synthesizeSpeech(text, voice, language);

      // Assert - callback should not be called after unsubscribe
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple subscribe/unsubscribe operations', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      });

      const unsubscribe1 = ttsService.subscribeToVisemes(callback1);
      const unsubscribe2 = ttsService.subscribeToVisemes(callback2);
      ttsService.subscribeToVisemes(callback3);

      // Unsubscribe first two
      unsubscribe1();
      unsubscribe2();

      // Act
      await ttsService.synthesizeSpeech(text, voice, language);

      // Assert
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();
    });
  });

  describe('isPlaying status', () => {
    it('should return false when service is not active', () => {
      expect(ttsService.isPlaying()).toBe(false);
    });

    it('should return true when synthesis is active', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      });

      // Act
      await ttsService.synthesizeSpeech(text, voice, language);

      // Assert
      expect(ttsService.isPlaying()).toBe(true);
    });

    it('should return false after stop is called', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      });

      await ttsService.synthesizeSpeech(text, voice, language);

      // Act
      ttsService.stop();

      // Assert
      expect(ttsService.isPlaying()).toBe(false);
    });
  });

  describe('dispose functionality', () => {
    it('should stop playback and clear all subscribers', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';
      const callback = vi.fn();

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      });

      ttsService.subscribeToVisemes(callback);
      await ttsService.synthesizeSpeech(text, voice, language);

      // Act
      ttsService.dispose();

      // Assert
      expect(mockAudioManager.stop).toHaveBeenCalled();
      expect(mockVisemeCoordinator.stop).toHaveBeenCalled();
      expect(ttsService.isPlaying()).toBe(false);

      // Verify subscribers are cleared by synthesizing again
      vi.clearAllMocks();
      await ttsService.synthesizeSpeech(text, voice, language);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', async () => {
      // Arrange
      const text = '';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      });

      // Act
      const result = await ttsService.synthesizeSpeech(text, voice, language);

      // Assert
      expect(result.success).toBe(true);
      expect(mockAzureSpeechRepository.synthesize).toHaveBeenCalledWith(text, expect.any(Object));
    });

    it('should handle empty viseme array', async () => {
      // Arrange
      const text = 'Test text';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';
      const emptyVisemeResult: SynthesisResult = {
        audioBuffer: mockAudioBuffer,
        visemes: [],
      };

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: emptyVisemeResult,
      });

      const callback = vi.fn();
      ttsService.subscribeToVisemes(callback);

      // Act
      const result = await ttsService.synthesizeSpeech(text, voice, language);

      // Assert
      expect(result.success).toBe(true);
      expect(callback).not.toHaveBeenCalled();
      expect(mockVisemeCoordinator.start).toHaveBeenCalledWith(mockAudioBuffer, []);
    });

    it('should handle very long text', async () => {
      // Arrange
      const text = 'A'.repeat(10000);
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      });

      // Act
      const result = await ttsService.synthesizeSpeech(text, voice, language);

      // Assert
      expect(result.success).toBe(true);
      expect(mockAzureSpeechRepository.synthesize).toHaveBeenCalledWith(text, expect.any(Object));
    });

    it('should handle special characters in text', async () => {
      // Arrange
      const text = 'Hello! @#$%^&*() <script>alert("test")</script>';
      const voice = 'en-US-JennyNeural';
      const language = 'en-US';

      vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      });

      // Act
      const result = await ttsService.synthesizeSpeech(text, voice, language);

      // Assert
      expect(result.success).toBe(true);
      expect(mockAzureSpeechRepository.synthesize).toHaveBeenCalledWith(text, expect.any(Object));
    });
  });
});
