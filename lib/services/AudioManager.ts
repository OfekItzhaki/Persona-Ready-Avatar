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
 * - Volume control (0-100%)
 * - Mute/unmute functionality
 * - Playback speed control (0.5x-2.0x)
 * - Audio queue management
 * - Real-time audio level analysis
 */
export class AudioManager implements IAudioManager {
  private audioContext: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private playbackState: PlaybackState = 'idle';
  private startTime: number = 0;
  private pauseTime: number = 0;
  private stateSubscribers: Set<(state: PlaybackState) => void> = new Set();
  
  // Audio control properties
  private volume: number = 100; // 0-100
  private muted: boolean = false;
  private previousVolume: number = 100;
  private playbackSpeed: number = 1.0; // 0.5-2.0
  
  // Audio queue
  private audioQueue: AudioBuffer[] = [];
  private isProcessingQueue: boolean = false;

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
      
      // Create GainNode for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.volume / 100;
      
      // Create AnalyserNode for audio level visualization
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.connect(this.gainNode);
      
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
    if (!this.audioContext || !this.gainNode || !this.analyserNode) {
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
      this.sourceNode.playbackRate.value = this.playbackSpeed;
      this.sourceNode.connect(this.analyserNode);

      // Set up ended event handler
      this.sourceNode.onended = () => {
        if (this.playbackState === 'playing') {
          this.updatePlaybackState('stopped');
          this.cleanup();
          // Process next item in queue if available
          this.processQueue();
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
        playbackSpeed: this.playbackSpeed,
        volume: this.volume,
        muted: this.muted,
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
    if (this.playbackState !== 'paused' || !this.audioContext || !this.currentBuffer || !this.analyserNode) {
      logger.warn('Cannot resume: audio is not paused or buffer is missing');
      return;
    }

    try {
      // Create new source node
      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = this.currentBuffer;
      this.sourceNode.playbackRate.value = this.playbackSpeed;
      this.sourceNode.connect(this.analyserNode);

      // Set up ended event handler
      this.sourceNode.onended = () => {
        if (this.playbackState === 'playing') {
          this.updatePlaybackState('stopped');
          this.cleanup();
          // Process next item in queue if available
          this.processQueue();
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
   * Skip current audio and play next in queue
   * Stops current playback and immediately starts next queued audio
   */
  skip(): void {
    if (this.audioQueue.length === 0) {
      logger.warn('Cannot skip: no audio in queue');
      this.stop();
      return;
    }

    logger.info('Skipping current audio', {
      queueLength: this.audioQueue.length,
    });

    // Stop current playback
    this.stop();

    // Process next item in queue
    this.processQueue();
  }

  /**
   * Set volume (0-100%)
   * Updates the gain node value
   */
  setVolume(volume: number): void {
    // Validate volume range
    if (volume < 0 || volume > 100) {
      logger.warn('Invalid volume value, clamping to 0-100', { volume });
      volume = Math.max(0, Math.min(100, volume));
    }

    this.volume = volume;

    // Update gain node if not muted
    if (this.gainNode && !this.muted) {
      this.gainNode.gain.value = volume / 100;
    }

    logger.debug('Volume set', { volume, muted: this.muted });
  }

  /**
   * Get current volume (0-100%)
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Mute audio output
   * Stores current volume and sets gain to 0
   */
  mute(): void {
    if (this.muted) {
      return;
    }

    this.muted = true;
    this.previousVolume = this.volume;

    if (this.gainNode) {
      this.gainNode.gain.value = 0;
    }

    logger.info('Audio muted', { previousVolume: this.previousVolume });
  }

  /**
   * Unmute audio output
   * Restores previous volume level
   */
  unmute(): void {
    if (!this.muted) {
      return;
    }

    this.muted = false;

    if (this.gainNode) {
      this.gainNode.gain.value = this.volume / 100;
    }

    logger.info('Audio unmuted', { volume: this.volume });
  }

  /**
   * Check if audio is muted
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Set playback speed (0.5x-2.0x)
   * Updates the playback rate of current and future audio
   */
  setPlaybackSpeed(speed: number): void {
    // Validate speed range
    if (speed < 0.5 || speed > 2.0) {
      logger.warn('Invalid playback speed, clamping to 0.5-2.0', { speed });
      speed = Math.max(0.5, Math.min(2.0, speed));
    }

    this.playbackSpeed = speed;

    // Update current source node if playing
    if (this.sourceNode && this.playbackState === 'playing') {
      this.sourceNode.playbackRate.value = speed;
    }

    logger.info('Playback speed set', { speed });
  }

  /**
   * Get current playback speed
   */
  getPlaybackSpeed(): number {
    return this.playbackSpeed;
  }

  /**
   * Add audio buffer to queue
   * Queued audio will play after current audio finishes
   */
  enqueue(buffer: AudioBuffer): void {
    this.audioQueue.push(buffer);

    logger.debug('Audio enqueued', {
      queueLength: this.audioQueue.length,
      duration: buffer.duration,
    });

    // If nothing is playing, start processing queue
    if (this.playbackState === 'idle' || this.playbackState === 'stopped') {
      this.processQueue();
    }
  }

  /**
   * Clear all queued audio
   */
  clearQueue(): void {
    const previousLength = this.audioQueue.length;
    this.audioQueue = [];

    logger.info('Audio queue cleared', { previousLength });
  }

  /**
   * Get number of items in queue
   */
  getQueueLength(): number {
    return this.audioQueue.length;
  }

  /**
   * Get real-time audio level data for visualization
   * Returns frequency data from the analyser node
   */
  getAudioLevelData(): Uint8Array | null {
    if (!this.analyserNode || this.playbackState !== 'playing') {
      return null;
    }

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);

    return dataArray;
  }

  /**
   * Process next item in audio queue
   * Called automatically when current audio finishes
   */
  private async processQueue(): Promise<void> {
    // Prevent concurrent queue processing
    if (this.isProcessingQueue) {
      return;
    }

    // Check if queue has items
    if (this.audioQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }

    this.isProcessingQueue = true;

    try {
      const nextBuffer = this.audioQueue.shift();
      if (nextBuffer) {
        await this.play(nextBuffer);
      }
    } catch (error) {
      logger.error('Failed to process queue item', { error });
    } finally {
      this.isProcessingQueue = false;
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
   * Releases audio buffer reference to allow garbage collection (Requirement 42.2)
   */
  private cleanup(): void {
    // Release audio buffer reference to free memory
    if (this.currentBuffer) {
      this.currentBuffer = null;
      logger.debug('Audio buffer released for garbage collection');
    }
    this.startTime = 0;
    this.pauseTime = 0;
  }

  /**
   * Dispose of AudioManager and clean up all resources
   * Should be called when the component unmounts
   */
  dispose(): void {
    this.stop();
    this.clearQueue();
    
    // Disconnect and clean up audio nodes
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.stateSubscribers.clear();

    logger.info('AudioManager disposed');
  }
}
