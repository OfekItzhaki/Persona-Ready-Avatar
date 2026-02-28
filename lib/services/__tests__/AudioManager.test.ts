import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioManager } from '../AudioManager';
import type { PlaybackState } from '@/types';

/**
 * Unit Tests for AudioManager
 * 
 * Tests cover:
 * - Play, pause, resume, and stop functionality
 * - Playback state transitions
 * - Timing accuracy (getCurrentTime, getDuration)
 * - Subscription management
 * - Error handling
 * - Resource cleanup
 * 
 * Validates: Requirements 3.5
 */
describe('AudioManager', () => {
  let audioManager: AudioManager;
  let mockAudioContext: any;
  let mockSourceNode: any;

  // Mock AudioBuffer
  const createMockAudioBuffer = (duration: number = 5.0): AudioBuffer => {
    return {
      duration,
      length: Math.floor(duration * 44100),
      numberOfChannels: 1,
      sampleRate: 44100,
      getChannelData: vi.fn(),
      copyFromChannel: vi.fn(),
      copyToChannel: vi.fn(),
    } as unknown as AudioBuffer;
  };

  beforeEach(() => {
    // Mock AudioBufferSourceNode
    mockSourceNode = {
      buffer: null,
      playbackRate: { value: 1.0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };

    // Mock GainNode
    const mockGainNode = {
      gain: { value: 1.0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    // Mock AnalyserNode
    const mockAnalyserNode = {
      fftSize: 256,
      frequencyBinCount: 128,
      connect: vi.fn(),
      disconnect: vi.fn(),
      getByteFrequencyData: vi.fn(),
    };

    // Mock AudioContext
    mockAudioContext = {
      state: 'running',
      sampleRate: 44100,
      currentTime: 0,
      destination: {},
      createBufferSource: vi.fn(() => mockSourceNode),
      createGain: vi.fn(() => mockGainNode),
      createAnalyser: vi.fn(() => mockAnalyserNode),
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // Mock global AudioContext as a constructor function
    global.AudioContext = function() {
      return mockAudioContext;
    } as any;
    (global as any).webkitAudioContext = function() {
      return mockAudioContext;
    } as any;

    // Create AudioManager instance
    audioManager = new AudioManager();
  });

  afterEach(() => {
    if (audioManager) {
      audioManager.dispose();
    }
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize AudioContext on construction', () => {
      expect(audioManager).toBeDefined();
    });

    it('should handle suspended AudioContext due to autoplay policy', () => {
      // Create a new AudioManager with suspended context
      mockAudioContext.state = 'suspended';
      const manager = new AudioManager();
      
      // Should not throw
      expect(manager).toBeDefined();
      
      manager.dispose();
    });

    it('should throw error if Web Audio API is not supported', () => {
      // Remove AudioContext from global
      const originalAudioContext = global.AudioContext;
      const originalWebkitAudioContext = (global as any).webkitAudioContext;
      
      delete (global as any).AudioContext;
      delete (global as any).webkitAudioContext;

      expect(() => new AudioManager()).toThrow('Web Audio API not supported in this browser');

      // Restore
      global.AudioContext = originalAudioContext;
      (global as any).webkitAudioContext = originalWebkitAudioContext;
    });
  });

  describe('play functionality', () => {
    it('should play audio buffer successfully', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      mockAudioContext.currentTime = 1.0;
      const mockAnalyserNode = mockAudioContext.createAnalyser();

      // Act
      await audioManager.play(buffer);

      // Assert
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockSourceNode.buffer).toBe(buffer);
      expect(mockSourceNode.connect).toHaveBeenCalledWith(mockAnalyserNode);
      expect(mockSourceNode.start).toHaveBeenCalledWith(0);
    });

    it('should resume suspended AudioContext before playing', async () => {
      // Arrange
      mockAudioContext.state = 'suspended';
      const buffer = createMockAudioBuffer(5.0);

      // Act
      await audioManager.play(buffer);

      // Assert
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should emit playing state when playback starts', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      const stateCallback = vi.fn();
      audioManager.subscribeToPlaybackState(stateCallback);

      // Act
      await audioManager.play(buffer);

      // Assert
      expect(stateCallback).toHaveBeenCalledWith('playing');
    });

    it('should stop existing playback before starting new one', async () => {
      // Arrange
      const buffer1 = createMockAudioBuffer(3.0);
      const buffer2 = createMockAudioBuffer(5.0);

      await audioManager.play(buffer1);
      const firstSourceNode = mockSourceNode;

      // Create new mock for second playback
      const secondSourceNode = {
        buffer: null,
        playbackRate: { value: 1.0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      mockAudioContext.createBufferSource.mockReturnValue(secondSourceNode);

      // Act
      await audioManager.play(buffer2);

      // Assert
      expect(firstSourceNode.stop).toHaveBeenCalled();
      expect(firstSourceNode.disconnect).toHaveBeenCalled();
    });

    it('should set up onended handler', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);

      // Act
      await audioManager.play(buffer);

      // Assert
      expect(mockSourceNode.onended).toBeTypeOf('function');
    });

    it('should transition to stopped state when audio ends naturally', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      const stateCallback = vi.fn();
      audioManager.subscribeToPlaybackState(stateCallback);

      await audioManager.play(buffer);
      stateCallback.mockClear();

      // Act - simulate audio ending
      mockSourceNode.onended();

      // Assert
      expect(stateCallback).toHaveBeenCalledWith('stopped');
    });

    it('should handle errors during playback', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      mockSourceNode.start.mockImplementation(() => {
        throw new Error('Playback failed');
      });

      // Act & Assert
      await expect(audioManager.play(buffer)).rejects.toThrow('Playback failed');
    });

    it('should throw error if AudioContext is not initialized', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      audioManager.dispose(); // This closes the AudioContext

      // Act & Assert
      await expect(audioManager.play(buffer)).rejects.toThrow('AudioContext not initialized');
    });
  });

  describe('pause functionality', () => {
    it('should pause playing audio', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      await audioManager.play(buffer);
      mockAudioContext.currentTime = 2.5; // Simulate 2.5 seconds of playback

      // Act
      audioManager.pause();

      // Assert
      expect(mockSourceNode.stop).toHaveBeenCalled();
      expect(mockSourceNode.disconnect).toHaveBeenCalled();
    });

    it('should emit paused state when pausing', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      const stateCallback = vi.fn();
      audioManager.subscribeToPlaybackState(stateCallback);

      await audioManager.play(buffer);
      stateCallback.mockClear();

      // Act
      audioManager.pause();

      // Assert
      expect(stateCallback).toHaveBeenCalledWith('paused');
    });

    it('should not pause if audio is not playing', async () => {
      // Arrange
      const stateCallback = vi.fn();
      audioManager.subscribeToPlaybackState(stateCallback);

      // Act
      audioManager.pause();

      // Assert
      expect(stateCallback).not.toHaveBeenCalled();
      expect(mockSourceNode.stop).not.toHaveBeenCalled();
    });

    it('should store pause position for resume', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      await audioManager.play(buffer);
      
      mockAudioContext.currentTime = 3.0; // Start time was 0, now at 3.0
      
      // Act
      audioManager.pause();

      // Assert - getCurrentTime should return pause position
      expect(audioManager.getCurrentTime()).toBe(3.0);
    });

    it('should handle errors during pause gracefully', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      await audioManager.play(buffer);
      
      mockSourceNode.stop.mockImplementation(() => {
        throw new Error('Stop failed');
      });

      // Act & Assert - should not throw
      expect(() => audioManager.pause()).not.toThrow();
    });
  });

  describe('resume functionality', () => {
    it('should resume paused audio from pause position', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      await audioManager.play(buffer);
      
      mockAudioContext.currentTime = 2.0;
      audioManager.pause();
      
      const pauseTime = audioManager.getCurrentTime();

      // Create new mock source for resume
      const resumeSourceNode = {
        buffer: null,
        playbackRate: { value: 1.0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      mockAudioContext.createBufferSource.mockReturnValue(resumeSourceNode);
      mockAudioContext.currentTime = 2.0;
      const mockAnalyserNode = mockAudioContext.createAnalyser();

      // Act
      audioManager.resume();

      // Assert
      expect(resumeSourceNode.start).toHaveBeenCalledWith(0, pauseTime);
      expect(resumeSourceNode.buffer).toBe(buffer);
      expect(resumeSourceNode.connect).toHaveBeenCalledWith(mockAnalyserNode);
    });

    it('should emit playing state when resuming', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      const stateCallback = vi.fn();
      audioManager.subscribeToPlaybackState(stateCallback);

      await audioManager.play(buffer);
      mockAudioContext.currentTime = 2.0;
      audioManager.pause();
      stateCallback.mockClear();

      // Create new mock source for resume
      const resumeSourceNode = {
        buffer: null,
        playbackRate: { value: 1.0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      mockAudioContext.createBufferSource.mockReturnValue(resumeSourceNode);

      // Act
      audioManager.resume();

      // Assert
      expect(stateCallback).toHaveBeenCalledWith('playing');
    });

    it('should not resume if audio is not paused', () => {
      // Arrange
      const stateCallback = vi.fn();
      audioManager.subscribeToPlaybackState(stateCallback);

      // Act
      audioManager.resume();

      // Assert
      expect(stateCallback).not.toHaveBeenCalled();
      expect(mockAudioContext.createBufferSource).not.toHaveBeenCalled();
    });

    it('should handle errors during resume gracefully', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      await audioManager.play(buffer);
      mockAudioContext.currentTime = 2.0;
      audioManager.pause();

      const resumeSourceNode = {
        buffer: null,
        playbackRate: { value: 1.0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn().mockImplementation(() => {
          throw new Error('Resume failed');
        }),
        stop: vi.fn(),
        onended: null,
      };
      mockAudioContext.createBufferSource.mockReturnValue(resumeSourceNode);

      // Act & Assert - should not throw
      expect(() => audioManager.resume()).not.toThrow();
    });
  });

  describe('stop functionality', () => {
    it('should stop playing audio', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      await audioManager.play(buffer);

      // Act
      audioManager.stop();

      // Assert
      expect(mockSourceNode.stop).toHaveBeenCalled();
      expect(mockSourceNode.disconnect).toHaveBeenCalled();
    });

    it('should emit stopped state when stopping', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      const stateCallback = vi.fn();
      audioManager.subscribeToPlaybackState(stateCallback);

      await audioManager.play(buffer);
      stateCallback.mockClear();

      // Act
      audioManager.stop();

      // Assert
      expect(stateCallback).toHaveBeenCalledWith('stopped');
    });

    it('should not call stop on source node if already idle', () => {
      // Act
      audioManager.stop();

      // Assert
      expect(mockSourceNode.stop).not.toHaveBeenCalled();
    });

    it('should clean up resources when stopping', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      await audioManager.play(buffer);

      // Act
      audioManager.stop();

      // Assert
      expect(audioManager.getCurrentTime()).toBe(0);
      expect(audioManager.getDuration()).toBe(0);
    });

    it('should handle errors during stop gracefully', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      await audioManager.play(buffer);
      
      mockSourceNode.stop.mockImplementation(() => {
        throw new Error('Stop failed');
      });

      // Act & Assert - should not throw
      expect(() => audioManager.stop()).not.toThrow();
    });

    it('should not call stop on source node if already paused', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      await audioManager.play(buffer);
      audioManager.pause();
      
      vi.clearAllMocks();

      // Act
      audioManager.stop();

      // Assert - stop should not be called on source node (already stopped during pause)
      expect(mockSourceNode.stop).not.toHaveBeenCalled();
    });
  });

  describe('playback state transitions', () => {
    it('should transition from idle to playing', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      const states: PlaybackState[] = [];
      audioManager.subscribeToPlaybackState((state) => states.push(state));

      // Act
      await audioManager.play(buffer);

      // Assert
      expect(states).toEqual(['playing']);
    });

    it('should transition from playing to paused', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      const states: PlaybackState[] = [];
      
      await audioManager.play(buffer);
      audioManager.subscribeToPlaybackState((state) => states.push(state));

      // Act
      audioManager.pause();

      // Assert
      expect(states).toEqual(['paused']);
    });

    it('should transition from paused to playing on resume', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      const states: PlaybackState[] = [];
      
      await audioManager.play(buffer);
      mockAudioContext.currentTime = 2.0;
      audioManager.pause();

      const resumeSourceNode = {
        buffer: null,
        playbackRate: { value: 1.0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      mockAudioContext.createBufferSource.mockReturnValue(resumeSourceNode);
      
      audioManager.subscribeToPlaybackState((state) => states.push(state));

      // Act
      audioManager.resume();

      // Assert
      expect(states).toEqual(['playing']);
    });

    it('should transition from playing to stopped', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      const states: PlaybackState[] = [];
      
      await audioManager.play(buffer);
      audioManager.subscribeToPlaybackState((state) => states.push(state));

      // Act
      audioManager.stop();

      // Assert
      expect(states).toEqual(['stopped']);
    });

    it('should transition from playing to stopped when audio ends naturally', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      const states: PlaybackState[] = [];
      
      await audioManager.play(buffer);
      audioManager.subscribeToPlaybackState((state) => states.push(state));

      // Act - simulate natural end
      mockSourceNode.onended();

      // Assert
      expect(states).toEqual(['stopped']);
    });

    it('should handle rapid state transitions', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      const states: PlaybackState[] = [];
      audioManager.subscribeToPlaybackState((state) => states.push(state));

      // Act - rapid transitions
      await audioManager.play(buffer);
      mockAudioContext.currentTime = 1.0;
      audioManager.pause();
      
      const resumeSourceNode = {
        buffer: null,
        playbackRate: { value: 1.0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      mockAudioContext.createBufferSource.mockReturnValue(resumeSourceNode);
      
      audioManager.resume();
      audioManager.stop();

      // Assert
      expect(states).toEqual(['playing', 'paused', 'playing', 'stopped']);
    });
  });

  describe('timing accuracy', () => {
    it('should return correct current time during playback', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      await audioManager.play(buffer);

      // Simulate time progression
      mockAudioContext.currentTime = 2.5;

      // Act
      const currentTime = audioManager.getCurrentTime();

      // Assert
      expect(currentTime).toBe(2.5);
    });

    it('should return pause time when paused', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      await audioManager.play(buffer);
      
      mockAudioContext.currentTime = 3.0;
      audioManager.pause();

      // Act
      const currentTime = audioManager.getCurrentTime();

      // Assert
      expect(currentTime).toBe(3.0);
    });

    it('should return 0 when idle', () => {
      // Act
      const currentTime = audioManager.getCurrentTime();

      // Assert
      expect(currentTime).toBe(0);
    });

    it('should return 0 when stopped', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      await audioManager.play(buffer);
      audioManager.stop();

      // Act
      const currentTime = audioManager.getCurrentTime();

      // Assert
      expect(currentTime).toBe(0);
    });

    it('should return correct duration of loaded buffer', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(7.5);
      await audioManager.play(buffer);

      // Act
      const duration = audioManager.getDuration();

      // Assert
      expect(duration).toBe(7.5);
    });

    it('should return 0 duration when no buffer is loaded', () => {
      // Act
      const duration = audioManager.getDuration();

      // Assert
      expect(duration).toBe(0);
    });

    it('should return 0 duration after stop', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      await audioManager.play(buffer);
      audioManager.stop();

      // Act
      const duration = audioManager.getDuration();

      // Assert
      expect(duration).toBe(0);
    });

    it('should maintain accurate timing after pause and resume', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(10.0);
      await audioManager.play(buffer);
      
      // Pause at 3 seconds
      mockAudioContext.currentTime = 3.0;
      audioManager.pause();
      
      expect(audioManager.getCurrentTime()).toBe(3.0);

      // Resume
      const resumeSourceNode = {
        buffer: null,
        playbackRate: { value: 1.0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      mockAudioContext.createBufferSource.mockReturnValue(resumeSourceNode);
      mockAudioContext.currentTime = 3.0;
      
      audioManager.resume();

      // Simulate 2 more seconds of playback
      mockAudioContext.currentTime = 5.0;

      // Act
      const currentTime = audioManager.getCurrentTime();

      // Assert
      expect(currentTime).toBe(5.0);
    });
  });

  describe('subscription management', () => {
    it('should allow subscribing to playback state changes', () => {
      // Arrange
      const callback = vi.fn();

      // Act
      const unsubscribe = audioManager.subscribeToPlaybackState(callback);

      // Assert
      expect(typeof unsubscribe).toBe('function');
    });

    it('should notify subscribers of state changes', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      const callback = vi.fn();
      audioManager.subscribeToPlaybackState(callback);

      // Act
      await audioManager.play(buffer);

      // Assert
      expect(callback).toHaveBeenCalledWith('playing');
    });

    it('should support multiple subscribers', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      audioManager.subscribeToPlaybackState(callback1);
      audioManager.subscribeToPlaybackState(callback2);
      audioManager.subscribeToPlaybackState(callback3);

      // Act
      await audioManager.play(buffer);

      // Assert
      expect(callback1).toHaveBeenCalledWith('playing');
      expect(callback2).toHaveBeenCalledWith('playing');
      expect(callback3).toHaveBeenCalledWith('playing');
    });

    it('should allow unsubscribing from state changes', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      const callback = vi.fn();
      const unsubscribe = audioManager.subscribeToPlaybackState(callback);

      // Unsubscribe before playing
      unsubscribe();

      // Act
      await audioManager.play(buffer);

      // Assert
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle errors in subscriber callbacks gracefully', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const successCallback = vi.fn();

      audioManager.subscribeToPlaybackState(errorCallback);
      audioManager.subscribeToPlaybackState(successCallback);

      // Act & Assert - should not throw
      await expect(audioManager.play(buffer)).resolves.not.toThrow();
      expect(successCallback).toHaveBeenCalledWith('playing');
    });

    it('should handle multiple unsubscribe calls safely', async () => {
      // Arrange
      const callback = vi.fn();
      const unsubscribe = audioManager.subscribeToPlaybackState(callback);

      // Act - unsubscribe multiple times
      unsubscribe();
      unsubscribe();
      unsubscribe();

      // Assert - should not throw
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('dispose functionality', () => {
    it('should stop playback when disposed', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      await audioManager.play(buffer);

      // Act
      audioManager.dispose();

      // Assert
      expect(mockSourceNode.stop).toHaveBeenCalled();
    });

    it('should close AudioContext when disposed', () => {
      // Act
      audioManager.dispose();

      // Assert
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should clear all subscribers when disposed', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      const callback = vi.fn();
      audioManager.subscribeToPlaybackState(callback);

      // Dispose
      audioManager.dispose();

      // Create new AudioManager for testing
      const newManager = new AudioManager();
      
      // Act - play on new manager
      await newManager.play(buffer);

      // Assert - old callback should not be called
      expect(callback).not.toHaveBeenCalled();
      
      newManager.dispose();
    });

    it('should handle dispose when already idle', () => {
      // Act & Assert - should not throw
      expect(() => audioManager.dispose()).not.toThrow();
    });

    it('should handle multiple dispose calls safely', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      await audioManager.play(buffer);

      // Act - dispose multiple times
      audioManager.dispose();
      audioManager.dispose();
      audioManager.dispose();

      // Assert - should not throw
      expect(() => audioManager.dispose()).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle very short audio buffers', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(0.1); // 100ms

      // Act
      await audioManager.play(buffer);

      // Assert
      expect(audioManager.getDuration()).toBe(0.1);
    });

    it('should handle very long audio buffers', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(3600); // 1 hour

      // Act
      await audioManager.play(buffer);

      // Assert
      expect(audioManager.getDuration()).toBe(3600);
    });

    it('should handle pause at the very start of playback', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      await audioManager.play(buffer);
      mockAudioContext.currentTime = 0;

      // Act
      audioManager.pause();

      // Assert
      expect(audioManager.getCurrentTime()).toBe(0);
    });

    it('should handle resume immediately after pause', async () => {
      // Arrange
      const buffer = createMockAudioBuffer(5.0);
      await audioManager.play(buffer);
      mockAudioContext.currentTime = 2.0;
      audioManager.pause();

      const resumeSourceNode = {
        buffer: null,
        playbackRate: { value: 1.0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      mockAudioContext.createBufferSource.mockReturnValue(resumeSourceNode);

      // Act
      audioManager.resume();

      // Assert
      expect(resumeSourceNode.start).toHaveBeenCalled();
    });

    it('should handle getCurrentTime when AudioContext is null', () => {
      // Arrange
      audioManager.dispose();

      // Act
      const currentTime = audioManager.getCurrentTime();

      // Assert
      expect(currentTime).toBe(0);
    });
  });
});
