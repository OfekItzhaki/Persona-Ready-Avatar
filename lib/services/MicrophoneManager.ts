/* eslint-disable no-undef */
import { IMicrophoneManager, PermissionResult, PermissionState } from '@/types';
import { logger } from '@/lib/logger';

/**
 * MicrophoneManager
 *
 * Handles microphone access, permissions, and audio capture for voice input.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.5, 12.2
 */
export class MicrophoneManager implements IMicrophoneManager {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private audioLevelCallbacks: Set<(level: number) => void> = new Set();
  private animationFrameId: number | null = null;

  // Cache for permission state to avoid repeated checks
  private permissionCache: { state: PermissionState; timestamp: number } | null = null;
  private readonly PERMISSION_CACHE_TTL = 5000; // 5 seconds

  /**
   * Request microphone permission from the browser
   *
   * Requirements: 1.1, 1.2
   */
  async requestPermission(): Promise<PermissionResult> {
    try {
      logger.info('Requesting microphone permission', {
        component: 'MicrophoneManager',
        operation: 'requestPermission',
      });

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Immediately stop the stream - we just wanted to check permission
      stream.getTracks().forEach((track) => track.stop());

      logger.info('Microphone permission granted', {
        component: 'MicrophoneManager',
        operation: 'requestPermission',
      });

      return { granted: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Microphone permission denied', {
        component: 'MicrophoneManager',
        operation: 'requestPermission',
        error: errorMessage,
      });

      return {
        granted: false,
        error: `Microphone access denied. Please grant permission in your browser settings to use voice input. Error: ${errorMessage}`,
      };
    }
  }

  /**
   * Check current microphone permission status
   *
   * Requirements: 1.1, 14.1 - Optimized with caching to reduce latency
   */
  async checkPermission(): Promise<PermissionState> {
    try {
      // Return cached result if still valid
      if (
        this.permissionCache &&
        Date.now() - this.permissionCache.timestamp < this.PERMISSION_CACHE_TTL
      ) {
        logger.debug('Using cached permission state', {
          component: 'MicrophoneManager',
          operation: 'checkPermission',
          state: this.permissionCache.state,
        });
        return this.permissionCache.state;
      }

      // Check if Permissions API is available
      if (!navigator.permissions || !navigator.permissions.query) {
        logger.warn('Permissions API not available', {
          component: 'MicrophoneManager',
          operation: 'checkPermission',
        });
        return 'prompt';
      }

      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });

      // Cache the result
      this.permissionCache = {
        state: result.state as PermissionState,
        timestamp: Date.now(),
      };

      logger.info('Microphone permission status checked', {
        component: 'MicrophoneManager',
        operation: 'checkPermission',
        status: result.state,
      });

      return result.state as PermissionState;
    } catch (error) {
      logger.warn('Failed to check microphone permission', {
        component: 'MicrophoneManager',
        operation: 'checkPermission',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return 'prompt' as fallback
      return 'prompt';
    }
  }

  /**
   * Start audio capture from the microphone
   *
   * Requirements: 1.3, 12.2
   */
  async startCapture(): Promise<MediaStream> {
    if (this.mediaStream) {
      logger.warn('Audio capture already active', {
        component: 'MicrophoneManager',
        operation: 'startCapture',
      });
      return this.mediaStream;
    }

    try {
      logger.info('Starting audio capture', {
        component: 'MicrophoneManager',
        operation: 'startCapture',
      });

      // Configure audio constraints for optimal speech recognition
      // Requirements: 2.5 - Audio format settings for browser microphone input
      const constraints: MediaStreamConstraints = {
        audio: {
          channelCount: 1, // Mono
          sampleRate: 16000, // 16kHz for Azure Speech Service
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Initialize audio level monitoring
      this.initializeAudioLevelMonitoring();

      logger.info('Audio capture started successfully', {
        component: 'MicrophoneManager',
        operation: 'startCapture',
        trackCount: this.mediaStream.getTracks().length,
      });

      return this.mediaStream;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Failed to start audio capture', {
        component: 'MicrophoneManager',
        operation: 'startCapture',
        error: errorMessage,
      });

      throw new Error(`Failed to start audio capture: ${errorMessage}`);
    }
  }

  /**
   * Stop audio capture and release microphone
   *
   * Requirements: 12.2 - Release MediaStream tracks immediately on session end
   */
  stopCapture(): void {
    if (!this.mediaStream) {
      return;
    }

    logger.info('Stopping audio capture', {
      component: 'MicrophoneManager',
      operation: 'stopCapture',
    });

    // Stop animation frame immediately
    // Requirements: 13.2 - Prevent memory leaks
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Stop all tracks immediately
    // Requirements: 12.2 - Release MediaStream tracks immediately
    this.mediaStream.getTracks().forEach((track) => {
      track.stop();
      logger.debug('Stopped audio track', {
        component: 'MicrophoneManager',
        operation: 'stopCapture',
        trackId: track.id,
        trackState: track.readyState,
      });
    });

    this.mediaStream = null;

    // Close audio context
    // Requirements: 13.2 - Proper resource cleanup
    if (this.audioContext) {
      this.audioContext.close().catch((error) => {
        logger.warn('Error closing audio context', {
          component: 'MicrophoneManager',
          operation: 'stopCapture',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
      this.audioContext = null;
      this.analyserNode = null;
    }

    logger.info('Audio capture stopped and microphone released', {
      component: 'MicrophoneManager',
      operation: 'stopCapture',
    });
  }

  /**
   * Check if microphone is available
   *
   * Requirements: 1.5
   */
  isAvailable(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Check if audio capture is currently active
   */
  isCapturing(): boolean {
    return this.mediaStream !== null && this.mediaStream.active;
  }

  /**
   * Get current audio input level (0-100)
   *
   * Requirements: 5.5
   */
  getAudioLevel(): number {
    if (!this.analyserNode) {
      return 0;
    }

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);

    // Calculate average level
    const sum = dataArray.reduce((acc, val) => acc + val, 0);
    const average = sum / dataArray.length;

    // Normalize to 0-100 range
    return Math.round((average / 255) * 100);
  }

  /**
   * Subscribe to real-time audio level updates
   *
   * Requirements: 5.5
   */
  subscribeToAudioLevels(callback: (level: number) => void): () => void {
    this.audioLevelCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.audioLevelCallbacks.delete(callback);
    };
  }

  /**
   * Initialize audio level monitoring using Web Audio API
   *
   * Requirements: 5.5
   */
  private initializeAudioLevelMonitoring(): void {
    if (!this.mediaStream) {
      return;
    }

    try {
      // Create audio context
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      // Create analyser node
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Connect media stream to analyser
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyserNode);

      // Start monitoring loop
      this.startAudioLevelMonitoring();

      logger.info('Audio level monitoring initialized', {
        component: 'MicrophoneManager',
        operation: 'initializeAudioLevelMonitoring',
      });
    } catch (error) {
      logger.error('Failed to initialize audio level monitoring', {
        component: 'MicrophoneManager',
        operation: 'initializeAudioLevelMonitoring',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Start audio level monitoring loop
   * Updates at 30 FPS to reduce CPU load
   *
   * Requirements: 5.5, 14.2 - Throttle visualization updates to 30 FPS
   */
  private startAudioLevelMonitoring(): void {
    const updateInterval = 1000 / 30; // 30 FPS
    let lastUpdateTime = 0;

    const monitor = (timestamp: number) => {
      if (!this.analyserNode || !this.isCapturing()) {
        return;
      }

      // Throttle updates to 30 FPS
      // Requirements: 5.5 - Use requestAnimationFrame for smooth rendering
      if (timestamp - lastUpdateTime >= updateInterval) {
        const level = this.getAudioLevel();

        // Notify all subscribers using for-of for better performance
        for (const callback of this.audioLevelCallbacks) {
          try {
            callback(level);
          } catch (error) {
            logger.error('Error in audio level callback', {
              component: 'MicrophoneManager',
              operation: 'startAudioLevelMonitoring',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        lastUpdateTime = timestamp;
      }

      this.animationFrameId = requestAnimationFrame(monitor);
    };

    this.animationFrameId = requestAnimationFrame(monitor);
  }
}
