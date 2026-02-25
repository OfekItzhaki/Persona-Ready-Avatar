import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AzureSpeechRepository } from '../repositories/AzureSpeechRepository';
import { logger } from '../logger';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import type { SpeechConfig, SynthesisResult, SpeechError } from '@/types';

// Mock the logger
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the env module
vi.mock('../env', () => ({
  getEnvConfig: vi.fn(() => ({
    brainApiUrl: 'https://api.example.com',
    azureSpeechKey: 'test-speech-key',
    azureSpeechRegion: 'test-region',
  })),
}));

// Create mock synthesizer instance that will be reused
const mockSynthesizer = {
  visemeReceived: null as any,
  speakTextAsync: vi.fn(),
  close: vi.fn(),
};

// Mock Azure Speech SDK
vi.mock('microsoft-cognitiveservices-speech-sdk', () => {
  const mockSpeechConfig = {
    speechSynthesisVoiceName: '',
    speechSynthesisOutputFormat: 0,
  };

  return {
    SpeechConfig: {
      fromSubscription: vi.fn(() => mockSpeechConfig),
    },
    SpeechSynthesizer: vi.fn(function() {
      return mockSynthesizer;
    }),
    ResultReason: {
      SynthesizingAudioCompleted: 0,
      Canceled: 1,
    },
    CancellationReason: {
      Error: 1,
    },
    CancellationErrorCode: {
      ConnectionFailure: 1,
      AuthenticationFailure: 2,
    },
    CancellationDetails: {
      fromResult: vi.fn(),
    },
    SpeechSynthesisOutputFormat: {
      Audio16Khz32KBitRateMonoMp3: 0,
      Audio24Khz48KBitRateMonoMp3: 1,
      Raw16Khz16BitMonoPcm: 2,
    },
  };
});

// Mock AudioContext
const mockDecodeAudioData = vi.fn();

class MockAudioContext {
  decodeAudioData = mockDecodeAudioData;
}

global.AudioContext = MockAudioContext as any;
(global as any).webkitAudioContext = MockAudioContext;

describe('AzureSpeechRepository', () => {
  let repository: AzureSpeechRepository;

  beforeEach(() => {
    repository = new AzureSpeechRepository();
    
    // Reset mock synthesizer state
    mockSynthesizer.visemeReceived = null;
    mockSynthesizer.speakTextAsync.mockReset();
    mockSynthesizer.close.mockReset();
    
    // Reset AudioContext mock
    mockDecodeAudioData.mockReset();
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('synthesize', () => {
    const config: SpeechConfig = {
      voice: 'en-US-JennyNeural',
      language: 'en-US',
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
    };

    const text = 'Hello, world!';

    it('should successfully synthesize speech with viseme collection', async () => {
      // Mock audio data
      const mockAudioData = new ArrayBuffer(1024);
      
      // Mock AudioBuffer
      const mockAudioBuffer = {
        duration: 2.5,
        sampleRate: 24000,
        numberOfChannels: 1,
      };

      // Mock successful synthesis
      mockSynthesizer.speakTextAsync.mockImplementation((text: string, onSuccess: Function) => {
        // Simulate viseme events
        if (mockSynthesizer.visemeReceived) {
          mockSynthesizer.visemeReceived(null, {
            visemeId: 0,
            audioOffset: 0,
          });
          mockSynthesizer.visemeReceived(null, {
            visemeId: 1,
            audioOffset: 1000000, // 100ms in 100-nanosecond units
          });
          mockSynthesizer.visemeReceived(null, {
            visemeId: 2,
            audioOffset: 2000000, // 200ms
          });
        }

        onSuccess({
          reason: sdk.ResultReason.SynthesizingAudioCompleted,
          audioData: mockAudioData,
        });
      });

      mockDecodeAudioData.mockResolvedValue(mockAudioBuffer);

      const result = await repository.synthesize(text, config);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.audioBuffer).toEqual(mockAudioBuffer);
        expect(result.data.visemes).toHaveLength(3);
        
        // Check viseme data
        expect(result.data.visemes[0]).toEqual({
          visemeId: 0,
          audioOffset: 0,
          duration: 100, // 100ms until next viseme
        });
        expect(result.data.visemes[1]).toEqual({
          visemeId: 1,
          audioOffset: 100,
          duration: 100,
        });
        expect(result.data.visemes[2]).toEqual({
          visemeId: 2,
          audioOffset: 200,
          duration: 100, // Average of previous durations
        });
      }

      expect(mockSynthesizer.close).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Starting speech synthesis',
        expect.objectContaining({
          component: 'AzureSpeechRepository',
          textLength: text.length,
          voice: config.voice,
          language: config.language,
        })
      );
    });

    it('should configure Azure SDK with correct parameters', async () => {
      const mockAudioData = new ArrayBuffer(1024);
      const mockAudioBuffer = { duration: 1.0, sampleRate: 24000, numberOfChannels: 1 };

      mockSynthesizer.speakTextAsync.mockImplementation((_text: string, onSuccess: Function) => {
        onSuccess({
          reason: sdk.ResultReason.SynthesizingAudioCompleted,
          audioData: mockAudioData,
        });
      });

      mockDecodeAudioData.mockResolvedValue(mockAudioBuffer);

      await repository.synthesize(text, config);

      expect(sdk.SpeechConfig.fromSubscription).toHaveBeenCalledWith(
        'test-speech-key',
        'test-region'
      );
    });

    it('should handle synthesis cancellation with authentication error', async () => {
      const mockCancellationDetails = {
        reason: sdk.CancellationReason.Error,
        ErrorCode: sdk.CancellationErrorCode.AuthenticationFailure,
        errorDetails: 'Invalid subscription key',
      };

      (sdk.CancellationDetails.fromResult as any).mockReturnValue(mockCancellationDetails);

      mockSynthesizer.speakTextAsync.mockImplementation((_text: string, onSuccess: Function) => {
        onSuccess({
          reason: sdk.ResultReason.Canceled,
        });
      });

      const result = await repository.synthesize(text, config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('INVALID_KEY');
        if (result.error.type === 'INVALID_KEY') {
          expect(result.error.message).toBe('Invalid subscription key');
        }
      }

      expect(mockSynthesizer.close).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Speech synthesis canceled',
        expect.objectContaining({
          component: 'AzureSpeechRepository',
          reason: sdk.CancellationReason.Error,
        })
      );
    });

    it('should handle synthesis cancellation with network error', async () => {
      const mockCancellationDetails = {
        reason: sdk.CancellationReason.Error,
        ErrorCode: sdk.CancellationErrorCode.ConnectionFailure,
        errorDetails: 'Network connection failed',
      };

      (sdk.CancellationDetails.fromResult as any).mockReturnValue(mockCancellationDetails);

      mockSynthesizer.speakTextAsync.mockImplementation((_text: string, onSuccess: Function) => {
        onSuccess({
          reason: sdk.ResultReason.Canceled,
        });
      });

      const result = await repository.synthesize(text, config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('NETWORK_ERROR');
        if (result.error.type === 'NETWORK_ERROR') {
          expect(result.error.message).toBe('Network connection failed');
        }
      }

      expect(mockSynthesizer.close).toHaveBeenCalled();
    });

    it('should handle synthesis cancellation with invalid region error', async () => {
      const mockCancellationDetails = {
        reason: sdk.CancellationReason.Error,
        ErrorCode: 999, // Generic error code
        errorDetails: 'Invalid region specified',
      };

      (sdk.CancellationDetails.fromResult as any).mockReturnValue(mockCancellationDetails);

      mockSynthesizer.speakTextAsync.mockImplementation((_text: string, onSuccess: Function) => {
        onSuccess({
          reason: sdk.ResultReason.Canceled,
        });
      });

      const result = await repository.synthesize(text, config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('INVALID_REGION');
        if (result.error.type === 'INVALID_REGION') {
          expect(result.error.region).toBe('Invalid region specified');
        }
      }
    });

    it('should handle synthesis failure in error callback', async () => {
      const errorMessage = 'Synthesis failed unexpectedly';

      mockSynthesizer.speakTextAsync.mockImplementation(
        (_text: string, _onSuccess: Function, onError: Function) => {
          onError(errorMessage);
        }
      );

      const result = await repository.synthesize(text, config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('SYNTHESIS_FAILED');
        if (result.error.type === 'SYNTHESIS_FAILED') {
          expect(result.error.reason).toBe(errorMessage);
        }
      }

      expect(mockSynthesizer.close).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Speech synthesis error',
        expect.objectContaining({
          component: 'AzureSpeechRepository',
          error: errorMessage,
        })
      );
    });

    it('should handle unexpected result reason', async () => {
      mockSynthesizer.speakTextAsync.mockImplementation((_text: string, onSuccess: Function) => {
        onSuccess({
          reason: 999, // Unexpected reason
        });
      });

      const result = await repository.synthesize(text, config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('SYNTHESIS_FAILED');
        if (result.error.type === 'SYNTHESIS_FAILED') {
          expect(result.error.reason).toContain('Unexpected result reason');
        }
      }

      expect(mockSynthesizer.close).toHaveBeenCalled();
    });

    it('should handle audio decoding failure', async () => {
      const mockAudioData = new ArrayBuffer(1024);

      mockSynthesizer.speakTextAsync.mockImplementation((_text: string, onSuccess: Function) => {
        onSuccess({
          reason: sdk.ResultReason.SynthesizingAudioCompleted,
          audioData: mockAudioData,
        });
      });

      mockDecodeAudioData.mockRejectedValue(new Error('Failed to decode audio'));

      const result = await repository.synthesize(text, config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('SYNTHESIS_FAILED');
        if (result.error.type === 'SYNTHESIS_FAILED') {
          expect(result.error.reason).toContain('Failed to decode audio');
        }
      }

      expect(mockSynthesizer.close).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to decode audio data',
        expect.objectContaining({
          component: 'AzureSpeechRepository',
          error: 'Failed to decode audio',
        })
      );
    });

    it('should handle generic errors during synthesis', async () => {
      const genericError = new Error('Unexpected error');

      mockSynthesizer.speakTextAsync.mockImplementation(() => {
        throw genericError;
      });

      const result = await repository.synthesize(text, config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('SYNTHESIS_FAILED');
      }

      expect(mockSynthesizer.close).toHaveBeenCalled();
    });

    it('should calculate viseme durations correctly for single viseme', async () => {
      const mockAudioData = new ArrayBuffer(1024);
      const mockAudioBuffer = { duration: 1.0, sampleRate: 24000, numberOfChannels: 1 };

      mockSynthesizer.speakTextAsync.mockImplementation((_text: string, onSuccess: Function) => {
        // Single viseme
        if (mockSynthesizer.visemeReceived) {
          mockSynthesizer.visemeReceived(null, {
            visemeId: 0,
            audioOffset: 0,
          });
        }

        onSuccess({
          reason: sdk.ResultReason.SynthesizingAudioCompleted,
          audioData: mockAudioData,
        });
      });

      mockDecodeAudioData.mockResolvedValue(mockAudioBuffer);

      const result = await repository.synthesize(text, config);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.visemes).toHaveLength(1);
        expect(result.data.visemes[0].duration).toBe(100); // Default 100ms for single viseme
      }
    });

    it('should close synthesizer even when synthesis fails', async () => {
      mockSynthesizer.speakTextAsync.mockImplementation(
        (_text: string, _onSuccess: Function, onError: Function) => {
          onError('Synthesis failed');
        }
      );

      await repository.synthesize(text, config);

      expect(mockSynthesizer.close).toHaveBeenCalled();
    });

    it('should map output format correctly', async () => {
      const mockAudioData = new ArrayBuffer(1024);
      const mockAudioBuffer = { duration: 1.0, sampleRate: 24000, numberOfChannels: 1 };

      mockSynthesizer.speakTextAsync.mockImplementation((_text: string, onSuccess: Function) => {
        onSuccess({
          reason: sdk.ResultReason.SynthesizingAudioCompleted,
          audioData: mockAudioData,
        });
      });

      mockDecodeAudioData.mockResolvedValue(mockAudioBuffer);

      // Test different formats
      const formats = [
        'audio-16khz-32kbitrate-mono-mp3',
        'audio-24khz-48kbitrate-mono-mp3',
        'raw-16khz-16bit-mono-pcm',
        'unknown-format', // Should default to 24khz MP3
      ];

      for (const format of formats) {
        await repository.synthesize(text, { ...config, outputFormat: format });
      }

      // Verify SDK was called for each format
      expect(mockSynthesizer.speakTextAsync).toHaveBeenCalledTimes(formats.length);
    });

    it('should log viseme events during synthesis', async () => {
      const mockAudioData = new ArrayBuffer(1024);
      const mockAudioBuffer = { duration: 1.0, sampleRate: 24000, numberOfChannels: 1 };

      mockSynthesizer.speakTextAsync.mockImplementation((_text: string, onSuccess: Function) => {
        if (mockSynthesizer.visemeReceived) {
          mockSynthesizer.visemeReceived(null, {
            visemeId: 5,
            audioOffset: 5000000, // 500ms
          });
        }

        onSuccess({
          reason: sdk.ResultReason.SynthesizingAudioCompleted,
          audioData: mockAudioData,
        });
      });

      mockDecodeAudioData.mockResolvedValue(mockAudioBuffer);

      await repository.synthesize(text, config);

      expect(logger.debug).toHaveBeenCalledWith(
        'Viseme received',
        expect.objectContaining({
          component: 'AzureSpeechRepository',
          visemeId: 5,
          audioOffset: 500, // Converted to milliseconds
        })
      );
    });

    it('should log successful synthesis completion', async () => {
      const mockAudioData = new ArrayBuffer(1024);
      const mockAudioBuffer = { duration: 2.5, sampleRate: 24000, numberOfChannels: 1 };

      mockSynthesizer.speakTextAsync.mockImplementation((_text: string, onSuccess: Function) => {
        if (mockSynthesizer.visemeReceived) {
          mockSynthesizer.visemeReceived(null, { visemeId: 0, audioOffset: 0 });
          mockSynthesizer.visemeReceived(null, { visemeId: 1, audioOffset: 1000000 });
        }

        onSuccess({
          reason: sdk.ResultReason.SynthesizingAudioCompleted,
          audioData: mockAudioData,
        });
      });

      mockDecodeAudioData.mockResolvedValue(mockAudioBuffer);

      await repository.synthesize(text, config);

      expect(logger.info).toHaveBeenCalledWith(
        'Speech synthesis completed successfully',
        expect.objectContaining({
          component: 'AzureSpeechRepository',
          visemeCount: 2,
          audioDuration: 2.5,
        })
      );
    });

    it('should handle authentication error in error message', async () => {
      const authError = new Error('authentication failed');

      mockSynthesizer.speakTextAsync.mockImplementation(() => {
        throw authError;
      });

      const result = await repository.synthesize(text, config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('INVALID_KEY');
      }
    });

    it('should handle region error in error message', async () => {
      const regionError = new Error('Invalid region endpoint');

      mockSynthesizer.speakTextAsync.mockImplementation(() => {
        throw regionError;
      });

      const result = await repository.synthesize(text, config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('INVALID_REGION');
      }
    });

    it('should handle network error in error message', async () => {
      const networkError = new Error('network connection failed');

      mockSynthesizer.speakTextAsync.mockImplementation(() => {
        throw networkError;
      });

      const result = await repository.synthesize(text, config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('NETWORK_ERROR');
      }
    });

    it('should handle unknown error types', async () => {
      mockSynthesizer.speakTextAsync.mockImplementation(() => {
        throw 'string error'; // Non-Error object
      });

      const result = await repository.synthesize(text, config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('SYNTHESIS_FAILED');
        if (result.error.type === 'SYNTHESIS_FAILED') {
          expect(result.error.reason).toBe('Unknown error occurred');
        }
      }

      expect(logger.error).toHaveBeenCalledWith(
        'Unknown error during speech synthesis',
        expect.objectContaining({
          component: 'AzureSpeechRepository',
        })
      );
    });
  });

  describe('SDK lifecycle management', () => {
    it('should create synthesizer with correct configuration', async () => {
      const config: SpeechConfig = {
        voice: 'en-US-AriaNeural',
        language: 'en-US',
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      };

      const mockAudioData = new ArrayBuffer(1024);
      const mockAudioBuffer = { duration: 1.0, sampleRate: 24000, numberOfChannels: 1 };

      mockSynthesizer.speakTextAsync.mockImplementation((_text: string, onSuccess: Function) => {
        onSuccess({
          reason: sdk.ResultReason.SynthesizingAudioCompleted,
          audioData: mockAudioData,
        });
      });

      mockDecodeAudioData.mockResolvedValue(mockAudioBuffer);

      await repository.synthesize('test', config);

      expect(sdk.SpeechSynthesizer).toHaveBeenCalled();
      expect(mockSynthesizer.close).toHaveBeenCalled();
    });

    it('should dispose synthesizer after successful synthesis', async () => {
      const mockAudioData = new ArrayBuffer(1024);
      const mockAudioBuffer = { duration: 1.0, sampleRate: 24000, numberOfChannels: 1 };

      mockSynthesizer.speakTextAsync.mockImplementation((_text: string, onSuccess: Function) => {
        onSuccess({
          reason: sdk.ResultReason.SynthesizingAudioCompleted,
          audioData: mockAudioData,
        });
      });

      mockDecodeAudioData.mockResolvedValue(mockAudioBuffer);

      await repository.synthesize('test', {
        voice: 'en-US-JennyNeural',
        language: 'en-US',
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      });

      expect(mockSynthesizer.close).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        'Synthesizer disposed',
        expect.objectContaining({
          component: 'AzureSpeechRepository',
        })
      );
    });

    it('should dispose synthesizer after failed synthesis', async () => {
      mockSynthesizer.speakTextAsync.mockImplementation(
        (_text: string, _onSuccess: Function, onError: Function) => {
          onError('Synthesis failed');
        }
      );

      await repository.synthesize('test', {
        voice: 'en-US-JennyNeural',
        language: 'en-US',
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      });

      expect(mockSynthesizer.close).toHaveBeenCalledTimes(1);
    });

    it('should dispose synthesizer even when exception is thrown', async () => {
      mockSynthesizer.speakTextAsync.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await repository.synthesize('test', {
        voice: 'en-US-JennyNeural',
        language: 'en-US',
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      });

      expect(mockSynthesizer.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('viseme duration calculation', () => {
    it('should calculate durations based on time between visemes', async () => {
      const mockAudioData = new ArrayBuffer(1024);
      const mockAudioBuffer = { duration: 1.0, sampleRate: 24000, numberOfChannels: 1 };

      mockSynthesizer.speakTextAsync.mockImplementation((_text: string, onSuccess: Function) => {
        if (mockSynthesizer.visemeReceived) {
          mockSynthesizer.visemeReceived(null, { visemeId: 0, audioOffset: 0 });
          mockSynthesizer.visemeReceived(null, { visemeId: 1, audioOffset: 1500000 }); // 150ms
          mockSynthesizer.visemeReceived(null, { visemeId: 2, audioOffset: 3000000 }); // 300ms
          mockSynthesizer.visemeReceived(null, { visemeId: 3, audioOffset: 4000000 }); // 400ms
        }

        onSuccess({
          reason: sdk.ResultReason.SynthesizingAudioCompleted,
          audioData: mockAudioData,
        });
      });

      mockDecodeAudioData.mockResolvedValue(mockAudioBuffer);

      const result = await repository.synthesize('test', {
        voice: 'en-US-JennyNeural',
        language: 'en-US',
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.visemes[0].duration).toBe(150); // 150ms until next
        expect(result.data.visemes[1].duration).toBe(150); // 150ms until next
        expect(result.data.visemes[2].duration).toBe(100); // 100ms until next
        // Last viseme gets average: (150 + 150 + 100) / 3 = 133.33...
        expect(result.data.visemes[3].duration).toBeCloseTo(133.33, 1);
      }
    });

    it('should handle empty viseme array', async () => {
      const mockAudioData = new ArrayBuffer(1024);
      const mockAudioBuffer = { duration: 1.0, sampleRate: 24000, numberOfChannels: 1 };

      mockSynthesizer.speakTextAsync.mockImplementation((_text: string, onSuccess: Function) => {
        // No viseme events
        onSuccess({
          reason: sdk.ResultReason.SynthesizingAudioCompleted,
          audioData: mockAudioData,
        });
      });

      mockDecodeAudioData.mockResolvedValue(mockAudioBuffer);

      const result = await repository.synthesize('test', {
        voice: 'en-US-JennyNeural',
        language: 'en-US',
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.visemes).toHaveLength(0);
      }
    });
  });
});

