import { IAudioManager, PlaybackState } from '@/types';
import { logger } from '@/lib/logger';

/**
 * AudioManager
 * 
 * Manages audio playback using the Web Audio API. Provides precise timing
 * information and playback state management for audio-viseme synchronization.
 * 
 * Key Features:
 * - Uses Web Audio API (AudioContext) for precise timing
 * - Manages AudioBufferSourceNode lifecycle
 * - Emits playback state changes via event emitter pattern
 * - Handles browser autoplay policies gracefully
 * - Provides accurate timing information for synchronization
 */
export class AudioManager implements IAudioManager {
  private audioContext: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private playbackState: PlaybackState = 'idle';
  private startTime: number = 0;
  private pauseTime: number = 0;
  private stateSubscribers: Set<(state: PlaybackState) => void> = new Set();

  constructor() {
    // Initialize AudioContext lazily to handle autoplay policies
    this.initializeAudioContext();
  }

  /**
   * Initialize AudioContext
   * Handles browser autoplay policies by creating context on user interaction
   */
  private initializeAudioContext(): void {
    try {
      // Create AudioContext (will be in 'suspended' state if autoplay is blocked)
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      logger.info('AudioContext initialized', {
        state: this.audioContext.state,
        sampleRate: this.audioContext.sampleRate,
      });

      // Resume context if suspended (handles autoplay policy)
      if (this.audioContext.state === 'suspended') {
        logger.warn('AudioContext is suspended due to autoplay policy');
      }
    } catch (error) {
      logger.error('Failed to initialize AudioContext', { error });
      throw new Error('Web Audio API not supported in this browser');
    }
  }

  /**
   * Resume AudioContext if suspended
   * Must be called after user interaction to comply with autoplay policies
   */
  private async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        logger.info('AudioContext resumed after user interaction');
      } catch (error) {
        logger.error('Failed to resume AudioContext', { error });
        throw new Error('Failed to resume audio playback');
      }
    }
  }

  /**
   * Play audio buffer
   * Creates a new AudioBufferSourceNode and starts playback
   */
  async play(buffer: AudioBuffer): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    try {
      // Resume AudioContext if suspended (autoplay policy)
      await this.resumeAudioContext();

      // Stop any existing playback
      this.stop();

      // Store buffer reference
      this.currentBuffer = buffer;

      // Create new source node
      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = buffer;
      this.sourceNode.connect(this.audioContext.destination);

      // Set up ended event handler
      this.sourceNode.onended = () => {
        if (this.playbackState === 'playing') {
          this.updatePlaybackState('stopped');
          this.cleanup();
        }
      };

      // Start playback
      this.sourceNode.start(0);
      this.startTime = this.audioContext.currentTime;
      this.pauseTime = 0;

      this.updatePlaybackState('playing');

      logger.info('Audio playback started', {
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
      });
    } catch (error) {
      logger.error('Failed to play audio', { error });
      this.updatePlaybackState('idle');
      throw error;
    }
  }

  /**
   * Pause audio playback
   * Note: Web Audio API doesn't support pause/resume on AudioBufferSourceNode
   * This implementation stops playback and tracks the pause position
   */
  pause(): void {
    if (this.playbackState !== 'playing' || !this.audioContext) {
      logger.warn('Cannot pause: audio is not playing');
      return;
    }

    try {
      // Store current playback position
      this.pauseTime = this.audioContext.currentTime - this.startTime;

      // Stop the source node
      if (this.sourceNode) {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }

      this.updatePlaybackState('paused');

      logger.info('Audio playback paused', {
        pauseTime: this.pauseTime,
      });
    } catch (error) {
      logger.error('Failed to pause audio', { error });
    }
  }

  /**
   * Resume audio playback from paused position
   * Creates a new AudioBufferSourceNode and starts from the pause position
   */
  resume(): void {
    if (this.playbackState !== 'paused' || !this.audioContext || !this.currentBuffer) {
      logger.warn('Cannot resume: audio is not paused or buffer is missing');
      return;
    }

    try {
      // Create new source node
      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = this.currentBuffer;
      this.sourceNode.connect(this.audioContext.destination);

      // Set up ended event handler
      this.sourceNode.onended = () => {
        if (this.playbackState === 'playing') {
          this.updatePlaybackState('stopped');
          this.cleanup();
        }
      };

      // Start playback from pause position
      const offset = this.pauseTime;
      this.sourceNode.start(0, offset);
      this.startTime = this.audioContext.currentTime - offset;
      this.pauseTime = 0;

      this.updatePlaybackState('playing');

      logger.info('Audio playback resumed', {
        offset,
      });
    } catch (error) {
      logger.error('Failed to resume audio', { error });
      this.updatePlaybackState('idle');
    }
  }

  /**
   * Stop audio playback
   * Stops the source node and cleans up resources
   */
  stop(): void {
    if (this.playbackState === 'idle') {
      return;
    }

    try {
      if (this.sourceNode) {
        // Only call stop if the source is still playing
        if (this.playbackState === 'playing') {
          this.sourceNode.stop();
        }
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }

      this.cleanup();
      this.updatePlaybackState('stopped');

      logger.info('Audio playback stopped');
    } catch (error) {
      logger.error('Failed to stop audio', { error });
      // Force cleanup even if stop fails
      this.cleanup();
      this.updatePlaybackState('idle');
    }
  }

  /**
   * Get current playback time in seconds
   * Returns accurate timing information for audio-viseme synchronization
   */
  getCurrentTime(): number {
    if (!this.audioContext) {
      return 0;
    }

    if (this.playbackState === 'playing') {
      return this.audioContext.currentTime - this.startTime;
    } else if (this.playbackState === 'paused') {
      return this.pauseTime;
    }

    return 0;
  }

  /**
   * Get total duration of current audio buffer in seconds
   */
  getDuration(): number {
    return this.currentBuffer?.duration ?? 0;
  }

  /**
   * Subscribe to playback state changes
   * Returns unsubscribe function
   */
  subscribeToPlaybackState(callback: (state: PlaybackState) => void): () => void {
    this.stateSubscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.stateSubscribers.delete(callback);
    };
  }

  /**
   * Update playback state and notify subscribers
   */
  private updatePlaybackState(state: PlaybackState): void {
    const previousState = this.playbackState;
    this.playbackState = state;

    logger.debug('Playback state changed', {
      from: previousState,
      to: state,
    });

    // Notify all subscribers
    this.stateSubscribers.forEach((callback) => {
      try {
        callback(state);
      } catch (error) {
        logger.error('Error in playback state subscriber', { error });
      }
    });
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.currentBuffer = null;
    this.startTime = 0;
    this.pauseTime = 0;
  }

  /**
   * Dispose of AudioManager and clean up all resources
   * Should be called when the component unmounts
   */
  dispose(): void {
    this.stop();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.stateSubscribers.clear();

    logger.info('AudioManager disposed');
  }
}
