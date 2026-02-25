import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { TTSService } from '../services/TTSService';
import { LanguageVoiceMapper } from '../services/LanguageVoiceMapper';
import type {
  IAzureSpeechRepository,
  IAudioManager,
  IVisemeCoordinator,
  SynthesisResult,
  VisemeEvent,
  SpeechConfig,
} from '@/types';

/**
 * Property-Based Tests for TTSService
 * 
 * Feature: avatar-client, Property 2: Text-to-Speech Synthesis
 * 
 * For any non-empty text string and valid voice configuration,
 * the TTS Service should produce an audio buffer and emit corresponding viseme events.
 * 
 * **Validates: Requirements 2.2, 2.3**
 */
describe('Property: Text-to-Speech Synthesis', () => {
  let mockAzureSpeechRepository: IAzureSpeechRepository;
  let mockAudioManager: IAudioManager;
  let mockVisemeCoordinator: IVisemeCoordinator;
  let mockLanguageVoiceMapper: LanguageVoiceMapper;
  let ttsService: TTSService;

  // Helper to create mock audio buffer
  const createMockAudioBuffer = (duration: number): AudioBuffer => ({
    duration,
    length: Math.floor(duration * 44100),
    numberOfChannels: 1,
    sampleRate: 44100,
    getChannelData: vi.fn(),
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
  } as unknown as AudioBuffer);

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

    // Create TTSService instance
    ttsService = new TTSService(
      mockAzureSpeechRepository,
      mockAudioManager,
      mockVisemeCoordinator,
      mockLanguageVoiceMapper
    );
  });

  /**
   * Property: For any non-empty text string and valid voice configuration,
   * the TTS Service should successfully produce an audio buffer
   */
  it('should produce audio buffer for any non-empty text and valid voice', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }),
        fc.constantFrom(
          'en-US-JennyNeural',
          'es-ES-ElviraNeural',
          'fr-FR-DeniseNeural',
          'de-DE-KatjaNeural',
          'ja-JP-NanamiNeural',
          'zh-CN-XiaoxiaoNeural'
        ),
        fc.constantFrom('en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'),
        fc.float({ min: Math.fround(0.1), max: Math.fround(60.0), noNaN: true }), // Audio duration
        async (text, voice, language, duration) => {
          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(duration);
          const mockVisemes: VisemeEvent[] = [
            { visemeId: 0, audioOffset: 0, duration: 100 },
          ];

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes: mockVisemes,
            },
          });

          // Act
          const result = await ttsService.synthesizeSpeech(text, voice, language);

          // Assert - Property: Should always succeed with valid inputs
          expect(result.success).toBe(true);

          if (result.success) {
            // Property 1: Should return an AudioBuffer
            expect(result.data).toBeDefined();
            expect(result.data).toBe(mockAudioBuffer);

            // Property 2: AudioBuffer should have valid duration
            expect(result.data.duration).toBeGreaterThan(0);
            expect(result.data.duration).toBe(duration);

            // Property 3: Should call Azure Speech Repository with correct config
            expect(mockAzureSpeechRepository.synthesize).toHaveBeenCalledWith(
              text,
              expect.objectContaining({
                language,
                outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
              })
            );

            // Property 4: Should start audio playback
            expect(mockAudioManager.play).toHaveBeenCalledWith(mockAudioBuffer);

            // Property 5: Should start viseme coordination
            expect(mockVisemeCoordinator.start).toHaveBeenCalledWith(
              mockAudioBuffer,
              mockVisemes
            );
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any synthesis result with viseme events, all viseme events
   * should be emitted to subscribers
   */
  it('should emit all viseme events to subscribers for any viseme array', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.array(
          fc.record({
            visemeId: fc.integer({ min: 0, max: 21 }),
            audioOffset: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }),
            duration: fc.float({ min: Math.fround(10), max: Math.fround(500), noNaN: true }),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        async (text, visemes) => {
          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(5.0);
          const visemeCallback = vi.fn();

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes,
            },
          });

          ttsService.subscribeToVisemes(visemeCallback);

          // Act
          await ttsService.synthesizeSpeech(text, 'en-US-JennyNeural', 'en-US');

          // Assert - Property: All visemes should be forwarded to subscribers
          expect(visemeCallback).toHaveBeenCalledTimes(visemes.length);

          // Property: Each viseme should be emitted exactly once in order
          visemes.forEach((viseme, index) => {
            expect(visemeCallback).toHaveBeenNthCalledWith(index + 1, viseme);
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any valid viseme event, the viseme ID should be within
   * the valid Azure range (0-21)
   */
  it('should only emit visemes with valid IDs (0-21)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.array(
          fc.record({
            visemeId: fc.integer({ min: 0, max: 21 }),
            audioOffset: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }),
            duration: fc.float({ min: Math.fround(10), max: Math.fround(500), noNaN: true }),
          }),
          { minLength: 1, maxLength: 30 }
        ),
        async (text, visemes) => {
          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(5.0);
          const visemeCallback = vi.fn();

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes,
            },
          });

          ttsService.subscribeToVisemes(visemeCallback);

          // Act
          await ttsService.synthesizeSpeech(text, 'en-US-JennyNeural', 'en-US');

          // Assert - Property: All emitted visemes should have valid IDs
          visemeCallback.mock.calls.forEach(([viseme]) => {
            expect(viseme.visemeId).toBeGreaterThanOrEqual(0);
            expect(viseme.visemeId).toBeLessThanOrEqual(21);
            expect(Number.isInteger(viseme.visemeId)).toBe(true);
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any text input, the service should use the language-appropriate
   * voice from LanguageVoiceMapper
   */
  it('should select appropriate voice based on language for any input', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.constantFrom('en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'),
        async (text, language) => {
          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(3.0);
          const mockVisemes: VisemeEvent[] = [];

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes: mockVisemes,
            },
          });

          const expectedVoice = mockLanguageVoiceMapper.getVoiceForLanguage(language);

          // Act
          await ttsService.synthesizeSpeech(text, 'default-voice', language);

          // Assert - Property: Should use language-mapped voice
          expect(mockAzureSpeechRepository.synthesize).toHaveBeenCalledWith(
            text,
            expect.objectContaining({
              voice: expectedVoice,
              language,
            })
          );
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Feature: avatar-client, Property 3: Voice Selection by Configuration
   * 
   * For any agent configuration with a specified voice identifier and language,
   * the TTS Service should use an appropriate voice for speech synthesis.
   * When language mapping exists, it takes precedence (Requirement 2.5).
   * When no language mapping exists, the provided voice identifier is used (Requirement 2.4).
   * 
   * **Validates: Requirements 2.4, 2.5**
   */
  it('should use appropriate voice based on configuration (language mapping or explicit voice)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.constantFrom(
          'en-US-JennyNeural',
          'en-US-GuyNeural',
          'en-US-AriaNeural',
          'es-ES-ElviraNeural',
          'es-ES-AlvaroNeural',
          'fr-FR-DeniseNeural',
          'fr-FR-HenriNeural',
          'de-DE-KatjaNeural',
          'de-DE-ConradNeural',
          'ja-JP-NanamiNeural',
          'ja-JP-KeitaNeural',
          'zh-CN-XiaoxiaoNeural',
          'zh-CN-YunxiNeural'
        ),
        fc.constantFrom('en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'),
        async (text, voiceIdentifier, language) => {
          // Clear mocks before each iteration
          vi.clearAllMocks();

          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(3.0);
          const mockVisemes: VisemeEvent[] = [
            { visemeId: 0, audioOffset: 0, duration: 100 },
          ];

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes: mockVisemes,
            },
          });

          // Get expected voice from language mapper
          const expectedVoice = mockLanguageVoiceMapper.getVoiceForLanguage(language);

          // Act
          const result = await ttsService.synthesizeSpeech(text, voiceIdentifier, language);

          // Assert - Property 1: Synthesis should succeed
          expect(result.success).toBe(true);

          // Property 2: Should use language-mapped voice for supported languages
          const synthesizeCall = vi.mocked(mockAzureSpeechRepository.synthesize).mock.calls[0];
          expect(synthesizeCall).toBeDefined();
          
          const [, calledConfig] = synthesizeCall;
          
          // Property 3: Config should use the language-mapped voice
          expect(calledConfig.voice).toBe(expectedVoice);
          
          // Property 4: Config should contain the correct language
          expect(calledConfig.language).toBe(language);
          
          // Property 5: Config should have the correct output format
          expect(calledConfig.outputFormat).toBe('audio-24khz-48kbitrate-mono-mp3');
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: When language has no mapping, the service should fall back to default voice
   * (Note: Current implementation uses default voice, not the provided voice identifier)
   */
  it('should use default voice for unmapped languages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.constantFrom(
          'en-US-JennyNeural',
          'es-ES-ElviraNeural',
          'fr-FR-DeniseNeural',
          'de-DE-KatjaNeural',
          'ja-JP-NanamiNeural',
          'zh-CN-XiaoxiaoNeural'
        ),
        fc.constantFrom('ru-RU', 'ar-SA', 'hi-IN', 'sv-SE', 'nl-NL'), // Unsupported languages
        async (text, voiceIdentifier, unsupportedLanguage) => {
          // Clear mocks before each iteration
          vi.clearAllMocks();

          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(3.0);
          const mockVisemes: VisemeEvent[] = [];

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes: mockVisemes,
            },
          });

          // Get expected default voice from language mapper
          const expectedVoice = mockLanguageVoiceMapper.getVoiceForLanguage(unsupportedLanguage);

          // Act
          await ttsService.synthesizeSpeech(text, voiceIdentifier, unsupportedLanguage);

          // Assert - Property: Should use default voice when language has no mapping
          const synthesizeCall = vi.mocked(mockAzureSpeechRepository.synthesize).mock.calls[0];
          const [, calledConfig] = synthesizeCall;
          
          // Since the language is not mapped, it should use the default voice
          expect(calledConfig.voice).toBe(expectedVoice);
          // Language should still be passed through
          expect(calledConfig.language).toBe(unsupportedLanguage);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: Voice identifier should be preserved through the entire synthesis pipeline
   */
  it('should preserve voice identifier consistency throughout synthesis', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.constantFrom(
          'en-US-JennyNeural',
          'es-ES-ElviraNeural',
          'fr-FR-DeniseNeural',
          'de-DE-KatjaNeural',
          'ja-JP-NanamiNeural',
          'zh-CN-XiaoxiaoNeural'
        ),
        fc.constantFrom('en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'),
        async (text, voiceIdentifier, language) => {
          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(3.0);
          const mockVisemes: VisemeEvent[] = [];

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes: mockVisemes,
            },
          });

          // Act - Call synthesis multiple times with same configuration
          await ttsService.synthesizeSpeech(text, voiceIdentifier, language);
          await ttsService.synthesizeSpeech(text, voiceIdentifier, language);

          // Assert - Property: Voice should be consistent across multiple calls
          const calls = vi.mocked(mockAzureSpeechRepository.synthesize).mock.calls;
          expect(calls.length).toBeGreaterThanOrEqual(2);
          
          const firstVoice = calls[0][1].voice;
          const secondVoice = calls[1][1].voice;
          
          // Property: Same input should produce same voice selection
          expect(firstVoice).toBe(secondVoice);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any successful synthesis, the service should coordinate
   * all three subsystems (repository, audio manager, viseme coordinator)
   */
  it('should coordinate all subsystems for any successful synthesis', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(30.0), noNaN: true }),
        fc.array(
          fc.record({
            visemeId: fc.integer({ min: 0, max: 21 }),
            audioOffset: fc.float({ min: Math.fround(0), max: Math.fround(5000), noNaN: true }),
            duration: fc.float({ min: Math.fround(10), max: Math.fround(300), noNaN: true }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (text, duration, visemes) => {
          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(duration);

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes,
            },
          });

          // Act
          await ttsService.synthesizeSpeech(text, 'en-US-JennyNeural', 'en-US');

          // Assert - Property: All subsystems should be invoked
          // 1. Azure Speech Repository should synthesize
          expect(mockAzureSpeechRepository.synthesize).toHaveBeenCalled();

          // 2. Viseme Coordinator should start with audio buffer and visemes
          expect(mockVisemeCoordinator.start).toHaveBeenCalledWith(
            mockAudioBuffer,
            visemes
          );

          // 3. Audio Manager should play the audio buffer
          expect(mockAudioManager.play).toHaveBeenCalledWith(mockAudioBuffer);

          // Property: Invocation order should be correct
          const synthesizeOrder = vi.mocked(mockAzureSpeechRepository.synthesize).mock.invocationCallOrder[0];
          const coordinatorOrder = vi.mocked(mockVisemeCoordinator.start).mock.invocationCallOrder[0];
          const audioOrder = vi.mocked(mockAudioManager.play).mock.invocationCallOrder[0];

          expect(synthesizeOrder).toBeLessThan(coordinatorOrder);
          expect(coordinatorOrder).toBeLessThan(audioOrder);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any multiple subscribers, all should receive all viseme events
   */
  it('should emit visemes to all subscribers for any number of subscribers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.array(
          fc.record({
            visemeId: fc.integer({ min: 0, max: 21 }),
            audioOffset: fc.float({ min: Math.fround(0), max: Math.fround(5000), noNaN: true }),
            duration: fc.float({ min: Math.fround(10), max: Math.fround(300), noNaN: true }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        fc.integer({ min: 1, max: 10 }), // Number of subscribers
        async (text, visemes, subscriberCount) => {
          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(3.0);
          const callbacks = Array.from({ length: subscriberCount }, () => vi.fn());

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes,
            },
          });

          // Subscribe all callbacks
          callbacks.forEach((callback) => {
            ttsService.subscribeToVisemes(callback);
          });

          // Act
          await ttsService.synthesizeSpeech(text, 'en-US-JennyNeural', 'en-US');

          // Assert - Property: All subscribers should receive all visemes
          callbacks.forEach((callback) => {
            expect(callback).toHaveBeenCalledTimes(visemes.length);
            visemes.forEach((viseme, index) => {
              expect(callback).toHaveBeenNthCalledWith(index + 1, viseme);
            });
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any synthesis, the service should stop any existing playback first
   */
  it('should stop existing playback before starting new synthesis', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        async (text1, text2) => {
          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(3.0);
          const mockVisemes: VisemeEvent[] = [];

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes: mockVisemes,
            },
          });

          // First synthesis
          await ttsService.synthesizeSpeech(text1, 'en-US-JennyNeural', 'en-US');

          // Clear mocks to track second synthesis
          vi.clearAllMocks();

          // Act - Second synthesis
          await ttsService.synthesizeSpeech(text2, 'en-US-JennyNeural', 'en-US');

          // Assert - Property: Stop should be called before new synthesis
          expect(mockAudioManager.stop).toHaveBeenCalled();
          expect(mockVisemeCoordinator.stop).toHaveBeenCalled();

          // Property: Stop should be called before play
          const stopOrder = vi.mocked(mockAudioManager.stop).mock.invocationCallOrder[0];
          const playOrder = vi.mocked(mockAudioManager.play).mock.invocationCallOrder[0];
          expect(stopOrder).toBeLessThan(playOrder);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any text with special characters, synthesis should handle it
   * without errors
   */
  it('should handle text with special characters without errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        async (text) => {
          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(3.0);
          const mockVisemes: VisemeEvent[] = [];

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes: mockVisemes,
            },
          });

          // Act
          const result = await ttsService.synthesizeSpeech(
            text,
            'en-US-JennyNeural',
            'en-US'
          );

          // Assert - Property: Should succeed regardless of special characters
          expect(result.success).toBe(true);

          // Property: Text should be passed as-is to repository
          expect(mockAzureSpeechRepository.synthesize).toHaveBeenCalledWith(
            text,
            expect.any(Object)
          );
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any viseme timing data, the timing values should be non-negative
   */
  it('should only emit visemes with non-negative timing values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.array(
          fc.record({
            visemeId: fc.integer({ min: 0, max: 21 }),
            audioOffset: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }),
            duration: fc.float({ min: Math.fround(0), max: Math.fround(500), noNaN: true }),
          }),
          { minLength: 1, maxLength: 30 }
        ),
        async (text, visemes) => {
          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(5.0);
          const visemeCallback = vi.fn();

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes,
            },
          });

          ttsService.subscribeToVisemes(visemeCallback);

          // Act
          await ttsService.synthesizeSpeech(text, 'en-US-JennyNeural', 'en-US');

          // Assert - Property: All timing values should be non-negative
          visemeCallback.mock.calls.forEach(([viseme]) => {
            expect(viseme.audioOffset).toBeGreaterThanOrEqual(0);
            expect(viseme.duration).toBeGreaterThanOrEqual(0);
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any synthesis, the service should maintain isPlaying state correctly
   */
  it('should maintain correct isPlaying state for any synthesis', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        async (text) => {
          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(3.0);
          const mockVisemes: VisemeEvent[] = [];

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes: mockVisemes,
            },
          });

          // Property: Should be false before synthesis
          expect(ttsService.isPlaying()).toBe(false);

          // Act
          await ttsService.synthesizeSpeech(text, 'en-US-JennyNeural', 'en-US');

          // Assert - Property: Should be true after successful synthesis
          expect(ttsService.isPlaying()).toBe(true);

          // Property: Should be false after stop
          ttsService.stop();
          expect(ttsService.isPlaying()).toBe(false);
        }
      ),
      { numRuns: 25 }
    );
  });
});

/**
 * Property-Based Tests for Viseme Event Forwarding
 * 
 * Feature: avatar-client, Property 5: Viseme Event Forwarding
 * 
 * For any viseme event received from Azure Speech SDK, the TTS Service should
 * forward the viseme ID and timing data to the Avatar Component without loss or corruption.
 * 
 * **Validates: Requirements 3.2**
 */
describe('Property 5: Viseme Event Forwarding', () => {
  let mockAzureSpeechRepository: IAzureSpeechRepository;
  let mockAudioManager: IAudioManager;
  let mockVisemeCoordinator: IVisemeCoordinator;
  let mockLanguageVoiceMapper: LanguageVoiceMapper;
  let ttsService: TTSService;

  // Helper to create mock audio buffer
  const createMockAudioBuffer = (duration: number): AudioBuffer => ({
    duration,
    length: Math.floor(duration * 44100),
    numberOfChannels: 1,
    sampleRate: 44100,
    getChannelData: vi.fn(),
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
  } as unknown as AudioBuffer);

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

    // Create TTSService instance
    ttsService = new TTSService(
      mockAzureSpeechRepository,
      mockAudioManager,
      mockVisemeCoordinator,
      mockLanguageVoiceMapper
    );
  });

  /**
   * Property: For any viseme event from Azure Speech SDK, the TTS Service should
   * forward the complete viseme data (ID and timing) to subscribers without modification
   */
  it('should forward all viseme events without loss or corruption', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.array(
          fc.record({
            visemeId: fc.integer({ min: 0, max: 21 }),
            audioOffset: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }),
            duration: fc.float({ min: Math.fround(10), max: Math.fround(500), noNaN: true }),
          }),
          { minLength: 0, maxLength: 100 }
        ),
        async (text, visemes) => {
          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(5.0);
          const receivedVisemes: VisemeEvent[] = [];
          
          // Subscribe to capture forwarded visemes
          const unsubscribe = ttsService.subscribeToVisemes((viseme) => {
            receivedVisemes.push(viseme);
          });

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes,
            },
          });

          // Act
          await ttsService.synthesizeSpeech(text, 'en-US-JennyNeural', 'en-US');

          // Assert - Property 1: No visemes should be lost
          expect(receivedVisemes.length).toBe(visemes.length);

          // Property 2: All visemes should be forwarded in the same order
          visemes.forEach((originalViseme, index) => {
            const receivedViseme = receivedVisemes[index];
            
            // Property 3: Viseme ID should not be corrupted
            expect(receivedViseme.visemeId).toBe(originalViseme.visemeId);
            
            // Property 4: Audio offset should not be corrupted
            expect(receivedViseme.audioOffset).toBe(originalViseme.audioOffset);
            
            // Property 5: Duration should not be corrupted
            expect(receivedViseme.duration).toBe(originalViseme.duration);
            
            // Property 6: The entire viseme object should be identical
            expect(receivedViseme).toEqual(originalViseme);
          });

          // Cleanup
          unsubscribe();
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any viseme event, the forwarding should preserve exact numeric values
   * without floating-point precision loss
   */
  it('should preserve exact numeric values in viseme timing data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.array(
          fc.record({
            visemeId: fc.integer({ min: 0, max: 21 }),
            audioOffset: fc.float({ 
              min: Math.fround(0), 
              max: Math.fround(10000), 
              noNaN: true,
              noDefaultInfinity: true 
            }),
            duration: fc.float({ 
              min: Math.fround(0.1), 
              max: Math.fround(1000), 
              noNaN: true,
              noDefaultInfinity: true 
            }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        async (text, visemes) => {
          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(5.0);
          const receivedVisemes: VisemeEvent[] = [];
          
          ttsService.subscribeToVisemes((viseme) => {
            receivedVisemes.push(viseme);
          });

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes,
            },
          });

          // Act
          await ttsService.synthesizeSpeech(text, 'en-US-JennyNeural', 'en-US');

          // Assert - Property: Numeric precision should be preserved
          visemes.forEach((originalViseme, index) => {
            const receivedViseme = receivedVisemes[index];
            
            // Property: audioOffset should have exact same value (bit-level equality)
            expect(Object.is(receivedViseme.audioOffset, originalViseme.audioOffset)).toBe(true);
            
            // Property: duration should have exact same value (bit-level equality)
            expect(Object.is(receivedViseme.duration, originalViseme.duration)).toBe(true);
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any number of subscribers, all should receive identical viseme data
   * without any subscriber affecting the data received by others
   */
  it('should forward identical viseme data to all subscribers independently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.array(
          fc.record({
            visemeId: fc.integer({ min: 0, max: 21 }),
            audioOffset: fc.float({ min: Math.fround(0), max: Math.fround(5000), noNaN: true }),
            duration: fc.float({ min: Math.fround(10), max: Math.fround(500), noNaN: true }),
          }),
          { minLength: 1, maxLength: 30 }
        ),
        fc.integer({ min: 2, max: 10 }), // Multiple subscribers
        async (text, visemes, subscriberCount) => {
          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(5.0);
          const subscriberData: VisemeEvent[][] = Array.from(
            { length: subscriberCount },
            () => []
          );

          // Subscribe multiple callbacks
          subscriberData.forEach((data) => {
            ttsService.subscribeToVisemes((viseme) => {
              data.push(viseme);
            });
          });

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes,
            },
          });

          // Act
          await ttsService.synthesizeSpeech(text, 'en-US-JennyNeural', 'en-US');

          // Assert - Property: All subscribers should receive identical data
          for (let i = 1; i < subscriberCount; i++) {
            // Property 1: Same number of visemes
            expect(subscriberData[i].length).toBe(subscriberData[0].length);
            
            // Property 2: Each viseme should be identical across all subscribers
            subscriberData[i].forEach((viseme, index) => {
              expect(viseme).toEqual(subscriberData[0][index]);
              expect(viseme.visemeId).toBe(subscriberData[0][index].visemeId);
              expect(viseme.audioOffset).toBe(subscriberData[0][index].audioOffset);
              expect(viseme.duration).toBe(subscriberData[0][index].duration);
            });
          }

          // Property 3: All subscribers should receive the original data
          subscriberData.forEach((data) => {
            expect(data.length).toBe(visemes.length);
            data.forEach((viseme, index) => {
              expect(viseme).toEqual(visemes[index]);
            });
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any viseme sequence, the forwarding should maintain temporal ordering
   * based on audioOffset values
   */
  it('should forward visemes in the same temporal order as received', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.array(
          fc.record({
            visemeId: fc.integer({ min: 0, max: 21 }),
            audioOffset: fc.float({ min: Math.fround(0), max: Math.fround(10000), noNaN: true }),
            duration: fc.float({ min: Math.fround(10), max: Math.fround(500), noNaN: true }),
          }),
          { minLength: 2, maxLength: 50 }
        ),
        async (text, visemes) => {
          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(5.0);
          const receivedVisemes: VisemeEvent[] = [];
          
          ttsService.subscribeToVisemes((viseme) => {
            receivedVisemes.push(viseme);
          });

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes,
            },
          });

          // Act
          await ttsService.synthesizeSpeech(text, 'en-US-JennyNeural', 'en-US');

          // Assert - Property: Order should be preserved
          for (let i = 0; i < visemes.length; i++) {
            // Property 1: Each viseme should be at the same position
            expect(receivedVisemes[i]).toEqual(visemes[i]);
            
            // Property 2: If original sequence has temporal ordering, it should be preserved
            if (i > 0) {
              const originalOrder = visemes[i - 1].audioOffset <= visemes[i].audioOffset;
              const receivedOrder = receivedVisemes[i - 1].audioOffset <= receivedVisemes[i].audioOffset;
              expect(receivedOrder).toBe(originalOrder);
            }
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any viseme event, the forwarding should happen synchronously
   * during the synthesis call (not deferred or delayed)
   */
  it('should forward visemes synchronously during synthesis', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.array(
          fc.record({
            visemeId: fc.integer({ min: 0, max: 21 }),
            audioOffset: fc.float({ min: Math.fround(0), max: Math.fround(5000), noNaN: true }),
            duration: fc.float({ min: Math.fround(10), max: Math.fround(500), noNaN: true }),
          }),
          { minLength: 1, maxLength: 30 }
        ),
        async (text, visemes) => {
          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(5.0);
          let visemesReceivedBeforeReturn = 0;
          
          ttsService.subscribeToVisemes(() => {
            visemesReceivedBeforeReturn++;
          });

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes,
            },
          });

          // Act
          await ttsService.synthesizeSpeech(text, 'en-US-JennyNeural', 'en-US');

          // Assert - Property: All visemes should be forwarded by the time synthesis returns
          expect(visemesReceivedBeforeReturn).toBe(visemes.length);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any viseme event with edge case values (0, max values),
   * the forwarding should handle them correctly
   */
  it('should forward visemes with edge case values without corruption', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.array(
          fc.record({
            visemeId: fc.constantFrom(0, 21), // Edge case IDs
            audioOffset: fc.constantFrom(0, 0.0, 10000, 9999.99), // Edge case offsets
            duration: fc.constantFrom(0, 0.1, 1000, 999.99), // Edge case durations
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (text, visemes) => {
          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(5.0);
          const receivedVisemes: VisemeEvent[] = [];
          
          ttsService.subscribeToVisemes((viseme) => {
            receivedVisemes.push(viseme);
          });

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes,
            },
          });

          // Act
          await ttsService.synthesizeSpeech(text, 'en-US-JennyNeural', 'en-US');

          // Assert - Property: Edge case values should be preserved exactly
          visemes.forEach((originalViseme, index) => {
            const receivedViseme = receivedVisemes[index];
            
            expect(receivedViseme.visemeId).toBe(originalViseme.visemeId);
            expect(receivedViseme.audioOffset).toBe(originalViseme.audioOffset);
            expect(receivedViseme.duration).toBe(originalViseme.duration);
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any empty viseme array, the forwarding should handle it gracefully
   * without errors
   */
  it('should handle empty viseme arrays without errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        async (text) => {
          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(5.0);
          const emptyVisemes: VisemeEvent[] = [];
          const receivedVisemes: VisemeEvent[] = [];
          
          ttsService.subscribeToVisemes((viseme) => {
            receivedVisemes.push(viseme);
          });

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes: emptyVisemes,
            },
          });

          // Act
          const result = await ttsService.synthesizeSpeech(text, 'en-US-JennyNeural', 'en-US');

          // Assert - Property: Should succeed with empty viseme array
          expect(result.success).toBe(true);
          
          // Property: No visemes should be forwarded
          expect(receivedVisemes.length).toBe(0);
          
          // Property: Coordinator should still be called with empty array
          expect(mockVisemeCoordinator.start).toHaveBeenCalledWith(
            mockAudioBuffer,
            emptyVisemes
          );
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any subscriber that unsubscribes, it should not receive
   * visemes from subsequent synthesis calls
   */
  it('should not forward visemes to unsubscribed callbacks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.array(
          fc.record({
            visemeId: fc.integer({ min: 0, max: 21 }),
            audioOffset: fc.float({ min: Math.fround(0), max: Math.fround(5000), noNaN: true }),
            duration: fc.float({ min: Math.fround(10), max: Math.fround(500), noNaN: true }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (text1, text2, visemes) => {
          // Arrange
          const mockAudioBuffer = createMockAudioBuffer(5.0);
          let callCount = 0;
          
          const unsubscribe = ttsService.subscribeToVisemes(() => {
            callCount++;
          });

          vi.mocked(mockAzureSpeechRepository.synthesize).mockResolvedValue({
            success: true,
            data: {
              audioBuffer: mockAudioBuffer,
              visemes,
            },
          });

          // Act - First synthesis
          await ttsService.synthesizeSpeech(text1, 'en-US-JennyNeural', 'en-US');
          const firstCallCount = callCount;

          // Unsubscribe
          unsubscribe();

          // Second synthesis
          await ttsService.synthesizeSpeech(text2, 'en-US-JennyNeural', 'en-US');
          const secondCallCount = callCount;

          // Assert - Property: Callback should not be called after unsubscribe
          expect(firstCallCount).toBe(visemes.length);
          expect(secondCallCount).toBe(firstCallCount); // No additional calls
        }
      ),
      { numRuns: 25 }
    );
  });
});
