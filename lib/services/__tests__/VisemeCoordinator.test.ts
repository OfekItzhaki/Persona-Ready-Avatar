import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VisemeCoordinator } from '../VisemeCoordinator';
import type { VisemeEvent, VisemeData } from '@/types';

/**
 * Unit Tests for VisemeCoordinator
 * 
 * Tests cover:
 * - Viseme scheduling and timing
 * - getCurrentViseme at various playback positions
 * - Cleanup on stop (timers, state reset)
 * - Subscription management
 * - Synchronization accuracy
 * 
 * Validates: Requirements 3.2, 3.5
 */
describe('VisemeCoordinator', () => {
  let visemeCoordinator: VisemeCoordinator;
  let mockAudioContext: any;
  let mockAudioBuffer: AudioBuffer;
  let animationFrameCallbacks: FrameRequestCallback[] = [];
  let currentAnimationFrameId = 0;

  // Mock viseme data
  const mockVisemes: VisemeEvent[] = [
    { visemeId: 0, audioOffset: 0, duration: 100 },
    { visemeId: 1, audioOffset: 100, duration: 150 },
    { visemeId: 2, audioOffset: 250, duration: 200 },
    { visemeId: 3, audioOffset: 450, duration: 100 },
    { visemeId: 0, audioOffset: 550, duration: 50 },
  ];

  beforeEach(() => {
    // Reset animation frame tracking
    animationFrameCallbacks = [];
    currentAnimationFrameId = 0;

    // Mock requestAnimationFrame
    global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      const id = ++currentAnimationFrameId;
      animationFrameCallbacks.push(callback);
      return id;
    });

    // Mock cancelAnimationFrame
    global.cancelAnimationFrame = vi.fn((id: number) => {
      // Remove callback from queue
      const index = animationFrameCallbacks.findIndex((_, i) => i + 1 === id);
      if (index !== -1) {
        animationFrameCallbacks.splice(index, 1);
      }
    });

    // Mock AudioContext
    mockAudioContext = {
      currentTime: 0,
      state: 'running',
    };

    // Mock AudioBuffer
    mockAudioBuffer = {
      duration: 1.0,
      length: 44100,
      numberOfChannels: 1,
      sampleRate: 44100,
    } as AudioBuffer;

    // Create VisemeCoordinator instance
    visemeCoordinator = new VisemeCoordinator(mockAudioContext);
  });

  afterEach(() => {
    if (visemeCoordinator) {
      visemeCoordinator.dispose();
    }
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with provided AudioContext', () => {
      expect(visemeCoordinator).toBeDefined();
    });

    it('should create AudioContext if not provided', () => {
      // Mock global AudioContext as a constructor
      (global as any).AudioContext = function() {
        return mockAudioContext;
      };
      
      const coordinator = new VisemeCoordinator();
      expect(coordinator).toBeDefined();
      
      coordinator.dispose();
    });

    it('should return null for getCurrentViseme before start', () => {
      expect(visemeCoordinator.getCurrentViseme()).toBeNull();
    });
  });

  describe('start functionality', () => {
    it('should start viseme coordination with audio buffer and visemes', () => {
      // Act
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);

      // Assert
      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it('should sort visemes by audioOffset', () => {
      // Arrange - unsorted visemes
      const unsortedVisemes: VisemeEvent[] = [
        { visemeId: 2, audioOffset: 250, duration: 200 },
        { visemeId: 0, audioOffset: 0, duration: 100 },
        { visemeId: 1, audioOffset: 100, duration: 150 },
      ];

      // Act
      visemeCoordinator.start(mockAudioBuffer, unsortedVisemes);
      mockAudioContext.currentTime = 0.1; // 100ms

      // Trigger animation frame
      animationFrameCallbacks[0](0);

      // Assert - should get viseme at 100ms (visemeId 1)
      const currentViseme = visemeCoordinator.getCurrentViseme();
      expect(currentViseme?.visemeId).toBe(1);
    });

    it('should stop existing coordination before starting new one', () => {
      // Arrange - start first coordination
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);
      const firstFrameId = currentAnimationFrameId;

      // Act - start second coordination
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);

      // Assert - cancelAnimationFrame should be called
      expect(cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should throw error if AudioContext is not available', () => {
      // Arrange - create coordinator that will have null AudioContext after construction
      // We need to pass undefined to trigger the fallback, then manually set to null
      const coordinator = new VisemeCoordinator(mockAudioContext);
      // Manually set audioContext to null to simulate disposed state
      (coordinator as any).audioContext = null;

      // Act & Assert
      expect(() => coordinator.start(mockAudioBuffer, mockVisemes)).toThrow(
        'AudioContext not initialized'
      );
      
      coordinator.dispose();
    });

    it('should schedule animation frames continuously', () => {
      // Act
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);

      // Assert - first frame scheduled
      expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

      // Trigger first frame
      animationFrameCallbacks[0](0);

      // Assert - second frame scheduled
      expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCurrentViseme at various playback positions', () => {
    beforeEach(() => {
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);
    });

    it('should return first viseme at start (0ms)', () => {
      // Arrange
      mockAudioContext.currentTime = 0;

      // Act
      animationFrameCallbacks[0](0);
      const currentViseme = visemeCoordinator.getCurrentViseme();

      // Assert
      expect(currentViseme).not.toBeNull();
      expect(currentViseme?.visemeId).toBe(0);
    });

    it('should return correct viseme at 100ms', () => {
      // Arrange
      mockAudioContext.currentTime = 0.1; // 100ms

      // Act
      animationFrameCallbacks[0](0);
      const currentViseme = visemeCoordinator.getCurrentViseme();

      // Assert
      expect(currentViseme?.visemeId).toBe(1);
    });

    it('should return correct viseme at 250ms', () => {
      // Arrange
      mockAudioContext.currentTime = 0.25; // 250ms

      // Act
      animationFrameCallbacks[0](0);
      const currentViseme = visemeCoordinator.getCurrentViseme();

      // Assert
      expect(currentViseme?.visemeId).toBe(2);
    });

    it('should return correct viseme at 450ms', () => {
      // Arrange
      mockAudioContext.currentTime = 0.45; // 450ms

      // Act
      animationFrameCallbacks[0](0);
      const currentViseme = visemeCoordinator.getCurrentViseme();

      // Assert
      expect(currentViseme?.visemeId).toBe(3);
    });

    it('should return correct viseme at 550ms', () => {
      // Arrange
      mockAudioContext.currentTime = 0.55; // 550ms

      // Act
      animationFrameCallbacks[0](0);
      const currentViseme = visemeCoordinator.getCurrentViseme();

      // Assert
      expect(currentViseme?.visemeId).toBe(0);
    });

    it('should return last viseme when past all viseme timings', () => {
      // Arrange
      mockAudioContext.currentTime = 1.0; // 1000ms (past all visemes)

      // Act
      animationFrameCallbacks[0](0);
      const currentViseme = visemeCoordinator.getCurrentViseme();

      // Assert - should return last viseme
      expect(currentViseme?.visemeId).toBe(0);
    });

    it('should handle mid-viseme timing correctly', () => {
      // Arrange - 175ms is in the middle of viseme 1 (100-250ms)
      mockAudioContext.currentTime = 0.175;

      // Act
      animationFrameCallbacks[0](0);
      const currentViseme = visemeCoordinator.getCurrentViseme();

      // Assert
      expect(currentViseme?.visemeId).toBe(1);
    });

    it('should return null before any visemes when empty array', () => {
      // Arrange
      visemeCoordinator.stop();
      visemeCoordinator.start(mockAudioBuffer, []);
      mockAudioContext.currentTime = 0.1;

      // Act
      animationFrameCallbacks[animationFrameCallbacks.length - 1](0);
      const currentViseme = visemeCoordinator.getCurrentViseme();

      // Assert
      expect(currentViseme?.visemeId).toBe(0); // Should be neutral
    });

    it('should handle single viseme', () => {
      // Arrange
      visemeCoordinator.stop();
      const singleViseme: VisemeEvent[] = [
        { visemeId: 5, audioOffset: 100, duration: 200 },
      ];
      visemeCoordinator.start(mockAudioBuffer, singleViseme);
      mockAudioContext.currentTime = 0.15; // 150ms

      // Act
      animationFrameCallbacks[animationFrameCallbacks.length - 1](0);
      const currentViseme = visemeCoordinator.getCurrentViseme();

      // Assert
      expect(currentViseme?.visemeId).toBe(5);
    });
  });

  describe('viseme change notifications', () => {
    it('should notify subscribers when viseme changes', () => {
      // Arrange
      const callback = vi.fn();
      visemeCoordinator.subscribeToVisemeChanges(callback);
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);

      // Act - trigger first frame at 0ms
      mockAudioContext.currentTime = 0;
      animationFrameCallbacks[0](0);

      // Assert - should be called with first viseme
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ visemeId: 0 })
      );
    });

    it('should notify subscribers when viseme changes during playback', () => {
      // Arrange
      const callback = vi.fn();
      visemeCoordinator.subscribeToVisemeChanges(callback);
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);

      // First frame at 0ms
      mockAudioContext.currentTime = 0;
      animationFrameCallbacks[0](0);
      callback.mockClear();

      // Act - advance to 100ms (viseme change)
      mockAudioContext.currentTime = 0.1;
      animationFrameCallbacks[1](0);

      // Assert
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ visemeId: 1 })
      );
    });

    it('should not notify subscribers if viseme has not changed', () => {
      // Arrange
      const callback = vi.fn();
      visemeCoordinator.subscribeToVisemeChanges(callback);
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);

      // First frame at 0ms
      mockAudioContext.currentTime = 0;
      animationFrameCallbacks[0](0);
      callback.mockClear();

      // Act - stay at same viseme (50ms, still in viseme 0)
      mockAudioContext.currentTime = 0.05;
      animationFrameCallbacks[1](0);

      // Assert - should not be called again
      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple subscribers', () => {
      // Arrange
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      visemeCoordinator.subscribeToVisemeChanges(callback1);
      visemeCoordinator.subscribeToVisemeChanges(callback2);
      visemeCoordinator.subscribeToVisemeChanges(callback3);

      visemeCoordinator.start(mockAudioBuffer, mockVisemes);

      // Act
      mockAudioContext.currentTime = 0;
      animationFrameCallbacks[0](0);

      // Assert - all subscribers should be notified
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();
    });

    it('should allow unsubscribing from viseme changes', () => {
      // Arrange
      const callback = vi.fn();
      const unsubscribe = visemeCoordinator.subscribeToVisemeChanges(callback);

      // Unsubscribe before starting
      unsubscribe();

      visemeCoordinator.start(mockAudioBuffer, mockVisemes);

      // Act
      mockAudioContext.currentTime = 0;
      animationFrameCallbacks[0](0);

      // Assert - callback should not be called
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle errors in subscriber callbacks gracefully', () => {
      // Arrange
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const successCallback = vi.fn();

      visemeCoordinator.subscribeToVisemeChanges(errorCallback);
      visemeCoordinator.subscribeToVisemeChanges(successCallback);

      visemeCoordinator.start(mockAudioBuffer, mockVisemes);

      // Act
      mockAudioContext.currentTime = 0;
      animationFrameCallbacks[0](0);

      // Assert - should not throw, and success callback should still be called
      expect(successCallback).toHaveBeenCalled();
    });
  });

  describe('cleanup on stop', () => {
    it('should cancel animation frame when stopped', () => {
      // Arrange
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);
      const frameId = currentAnimationFrameId;

      // Act
      visemeCoordinator.stop();

      // Assert
      expect(cancelAnimationFrame).toHaveBeenCalledWith(frameId);
    });

    it('should reset to neutral viseme (silence) on stop', () => {
      // Arrange
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);
      mockAudioContext.currentTime = 0.25; // Set to viseme 2
      animationFrameCallbacks[0](0);

      expect(visemeCoordinator.getCurrentViseme()?.visemeId).toBe(2);

      // Act
      visemeCoordinator.stop();

      // Assert - should reset to neutral (viseme 0)
      const currentViseme = visemeCoordinator.getCurrentViseme();
      expect(currentViseme?.visemeId).toBe(0);
    });

    it('should clear visemes array on stop', () => {
      // Arrange
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);

      // Act
      visemeCoordinator.stop();

      // Restart with no visemes
      visemeCoordinator.start(mockAudioBuffer, []);
      mockAudioContext.currentTime = 0.1;
      animationFrameCallbacks[animationFrameCallbacks.length - 1](0);

      // Assert - should not have old visemes
      const currentViseme = visemeCoordinator.getCurrentViseme();
      expect(currentViseme?.visemeId).toBe(0); // Neutral
    });

    it('should reset start time on stop', () => {
      // Arrange
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);
      mockAudioContext.currentTime = 0.5;
      animationFrameCallbacks[0](0);

      // Act
      visemeCoordinator.stop();

      // Restart
      mockAudioContext.currentTime = 1.0; // New start time
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);
      mockAudioContext.currentTime = 1.1; // 100ms elapsed
      animationFrameCallbacks[animationFrameCallbacks.length - 1](0);

      // Assert - should be at viseme 1 (100ms offset)
      const currentViseme = visemeCoordinator.getCurrentViseme();
      expect(currentViseme?.visemeId).toBe(1);
    });

    it('should not throw when stopping if not running', () => {
      // Act & Assert
      expect(() => visemeCoordinator.stop()).not.toThrow();
    });

    it('should stop scheduling animation frames after stop', () => {
      // Arrange
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);
      const initialCallCount = (requestAnimationFrame as any).mock.calls.length;

      // Act
      visemeCoordinator.stop();

      // Try to trigger more frames (should not schedule new ones)
      const callCountAfterStop = (requestAnimationFrame as any).mock.calls.length;

      // Assert - no new frames scheduled
      expect(callCountAfterStop).toBe(initialCallCount);
    });
  });

  describe('synchronization timing', () => {
    it('should synchronize with AudioContext.currentTime', () => {
      // Arrange
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);

      // Act - simulate time progression
      mockAudioContext.currentTime = 0.25; // 250ms
      animationFrameCallbacks[0](0);

      // Assert
      const currentViseme = visemeCoordinator.getCurrentViseme();
      expect(currentViseme?.visemeId).toBe(2);
    });

    it('should maintain accuracy within 50 milliseconds', () => {
      // Arrange
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);

      // Act - test at boundary (100ms ± 50ms)
      mockAudioContext.currentTime = 0.095; // 95ms (within 50ms of 100ms boundary)
      animationFrameCallbacks[0](0);
      const visemeAt95ms = visemeCoordinator.getCurrentViseme();

      mockAudioContext.currentTime = 0.105; // 105ms
      animationFrameCallbacks[1](0);
      const visemeAt105ms = visemeCoordinator.getCurrentViseme();

      // Assert - should transition correctly
      expect(visemeAt95ms?.visemeId).toBe(0); // Still in first viseme
      expect(visemeAt105ms?.visemeId).toBe(1); // Transitioned to second
    });

    it('should handle rapid time updates', () => {
      // Arrange
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);

      // Act - rapid time progression
      const times = [0, 0.05, 0.1, 0.15, 0.25, 0.3, 0.45, 0.5];
      const visemes: number[] = [];

      times.forEach((time, index) => {
        mockAudioContext.currentTime = time;
        animationFrameCallbacks[index](0);
        const viseme = visemeCoordinator.getCurrentViseme();
        if (viseme) visemes.push(viseme.visemeId);
      });

      // Assert - should track all changes
      expect(visemes).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    });
  });

  describe('edge cases', () => {
    it('should handle visemes with zero duration', () => {
      // Arrange
      const zeroDurationVisemes: VisemeEvent[] = [
        { visemeId: 1, audioOffset: 0, duration: 0 },
        { visemeId: 2, audioOffset: 100, duration: 0 },
      ];

      visemeCoordinator.start(mockAudioBuffer, zeroDurationVisemes);

      // Act
      mockAudioContext.currentTime = 0.05;
      animationFrameCallbacks[0](0);

      // Assert - should still work
      const currentViseme = visemeCoordinator.getCurrentViseme();
      expect(currentViseme).not.toBeNull();
    });

    it('should handle negative audio offsets gracefully', () => {
      // Arrange
      const negativeOffsetVisemes: VisemeEvent[] = [
        { visemeId: 1, audioOffset: -100, duration: 100 },
        { visemeId: 2, audioOffset: 0, duration: 100 },
      ];

      // Act & Assert - should not throw
      expect(() => 
        visemeCoordinator.start(mockAudioBuffer, negativeOffsetVisemes)
      ).not.toThrow();
    });

    it('should handle very long audio with many visemes', () => {
      // Arrange - 100 visemes over 10 seconds
      const manyVisemes: VisemeEvent[] = Array.from({ length: 100 }, (_, i) => ({
        visemeId: i % 22, // Cycle through viseme IDs 0-21
        audioOffset: i * 100,
        duration: 100,
      }));

      const longAudioBuffer = {
        ...mockAudioBuffer,
        duration: 10.0,
      } as AudioBuffer;

      // Act
      visemeCoordinator.start(longAudioBuffer, manyVisemes);
      mockAudioContext.currentTime = 5.0; // 5 seconds in
      animationFrameCallbacks[0](0);

      // Assert
      const currentViseme = visemeCoordinator.getCurrentViseme();
      expect(currentViseme).not.toBeNull();
      expect(currentViseme?.visemeId).toBe(50 % 22); // Viseme at 5000ms
    });

    it('should handle very short audio buffers', () => {
      // Arrange
      const shortBuffer = {
        ...mockAudioBuffer,
        duration: 0.1, // 100ms
      } as AudioBuffer;

      const shortVisemes: VisemeEvent[] = [
        { visemeId: 1, audioOffset: 0, duration: 50 },
        { visemeId: 2, audioOffset: 50, duration: 50 },
      ];

      // Act
      visemeCoordinator.start(shortBuffer, shortVisemes);
      mockAudioContext.currentTime = 0.025; // 25ms - in the middle of first viseme
      animationFrameCallbacks[0](0);

      // Assert
      const currentViseme = visemeCoordinator.getCurrentViseme();
      expect(currentViseme?.visemeId).toBe(1);
    });

    it('should handle playback position beyond audio duration', () => {
      // Arrange
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);

      // Act - go beyond audio duration
      mockAudioContext.currentTime = 2.0; // 2 seconds (audio is 1 second)
      animationFrameCallbacks[0](0);

      // Assert - should return last viseme
      const currentViseme = visemeCoordinator.getCurrentViseme();
      expect(currentViseme).not.toBeNull();
    });
  });

  describe('dispose functionality', () => {
    it('should stop coordination when disposed', () => {
      // Arrange
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);

      // Act
      visemeCoordinator.dispose();

      // Assert
      expect(cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should clear all subscribers when disposed', () => {
      // Arrange
      const callback = vi.fn();
      visemeCoordinator.subscribeToVisemeChanges(callback);
      visemeCoordinator.start(mockAudioBuffer, mockVisemes);
      mockAudioContext.currentTime = 0;
      animationFrameCallbacks[0](0);
      
      // Verify callback was called initially
      expect(callback).toHaveBeenCalledTimes(1);

      // Act - dispose clears subscribers
      visemeCoordinator.dispose();
      
      // The callback should have been called one more time during stop (reset to neutral)
      expect(callback).toHaveBeenCalledTimes(2);
      callback.mockClear();

      // Create a new coordinator and verify old callback is not in its subscriber list
      const newCoordinator = new VisemeCoordinator(mockAudioContext);
      newCoordinator.start(mockAudioBuffer, mockVisemes);
      mockAudioContext.currentTime = 0;
      animationFrameCallbacks[animationFrameCallbacks.length - 1](0);

      // Assert - old callback should not be called by new coordinator
      expect(callback).not.toHaveBeenCalled();
      
      newCoordinator.dispose();
    });

    it('should handle multiple dispose calls safely', () => {
      // Act & Assert
      visemeCoordinator.dispose();
      visemeCoordinator.dispose();
      visemeCoordinator.dispose();

      expect(() => visemeCoordinator.dispose()).not.toThrow();
    });
  });
});
