import { IVisemeCoordinator, VisemeData, VisemeEvent, VISEME_BLENDSHAPE_MAP } from '@/types';
import { logger } from '@/lib/logger';
import * as THREE from 'three';

/**
 * VisemeCoordinator
 *
 * Synchronizes viseme animations with audio playback. Schedules viseme changes
 * based on audio timing and provides real-time viseme data for avatar animation.
 *
 * Key Features:
 * - Schedules viseme animations based on audio timing
 * - Uses requestAnimationFrame for smooth 60 FPS updates
 * - Synchronizes with AudioContext.currentTime for accuracy
 * - Maintains synchronization within 50 milliseconds
 * - Emits viseme change events to subscribers
 * - Cleans up timers and resets state on stop
 */
export class VisemeCoordinator implements IVisemeCoordinator {
  private visemes: VisemeEvent[] = [];
  private audioContext: AudioContext | null = null;
  private startTime: number = 0;
  private animationFrameId: number | null = null;
  private currentViseme: VisemeData | null = null;
  private isRunning: boolean = false;
  private visemeSubscribers: Set<(viseme: VisemeData) => void> = new Set();
  private avatarMesh: THREE.Mesh | null = null;

  constructor(audioContext?: AudioContext) {
    // Use provided AudioContext or create a new one
    this.audioContext =
      audioContext ||
      new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();

    logger.info('VisemeCoordinator initialized', {
      hasAudioContext: !!this.audioContext,
    });
  }

  /**
   * Set the avatar mesh for blendshape morph target application.
   * Pass null to clear the stored mesh reference.
   *
   * @param mesh - THREE.Mesh with morphTargetDictionary/morphTargetInfluences, or null
   */
  setModel(mesh: THREE.Mesh | null): void {
    this.avatarMesh = mesh;
    logger.info('VisemeCoordinator: avatar mesh updated', { hasMesh: !!mesh });
  }

  /**
   * Start viseme coordination
   * Schedules viseme animations based on audio timing
   *
   * @param audioBuffer - The audio buffer being played (used for duration reference)
   * @param visemes - Array of viseme events with timing information
   */
  start(audioBuffer: AudioBuffer, visemes: VisemeEvent[]): void {
    if (!this.audioContext) {
      logger.error('Cannot start VisemeCoordinator: AudioContext not available');
      throw new Error('AudioContext not initialized');
    }

    // Stop any existing coordination
    this.stop();

    // Store visemes sorted by audioOffset for efficient lookup
    this.visemes = [...visemes].sort((a, b) => a.audioOffset - b.audioOffset);
    this.startTime = this.audioContext.currentTime;
    this.isRunning = true;

    logger.info('VisemeCoordinator started', {
      visemeCount: this.visemes.length,
      audioDuration: audioBuffer.duration,
      startTime: this.startTime,
    });

    // Start animation loop
    this.scheduleNextFrame();
  }

  /**
   * Stop viseme coordination
   * Cleans up timers and resets state
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Cancel animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Reset to neutral viseme (silence)
    this.updateCurrentViseme({
      visemeId: 0,
      timestamp: Date.now(),
      duration: 0,
    });

    // Zero out all morph target influences on the stored mesh
    if (this.avatarMesh?.morphTargetDictionary && this.avatarMesh.morphTargetInfluences) {
      const dict = this.avatarMesh.morphTargetDictionary;
      for (const key of Object.keys(dict)) {
        const index = dict[key];
        if (index !== undefined) {
          this.avatarMesh.morphTargetInfluences[index] = 0;
        }
      }
    }

    // Clear state
    this.visemes = [];
    this.startTime = 0;

    logger.info('VisemeCoordinator stopped');
  }

  /**
   * Get current viseme based on playback position
   * Returns null if no viseme is active
   */
  getCurrentViseme(): VisemeData | null {
    return this.currentViseme;
  }

  /**
   * Subscribe to viseme change events
   * Returns unsubscribe function
   *
   * @param callback - Function to call when viseme changes
   * @returns Unsubscribe function
   */
  subscribeToVisemeChanges(callback: (viseme: VisemeData) => void): () => void {
    this.visemeSubscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.visemeSubscribers.delete(callback);
    };
  }

  /**
   * Schedule next animation frame
   * Uses requestAnimationFrame for smooth 60 FPS updates
   */
  private scheduleNextFrame(): void {
    if (!this.isRunning) {
      return;
    }

    this.animationFrameId = requestAnimationFrame(() => {
      this.updateViseme();
      this.scheduleNextFrame();
    });
  }

  /**
   * Update current viseme based on audio playback position
   * Synchronizes with AudioContext.currentTime for accuracy
   */
  private updateViseme(): void {
    if (!this.audioContext || !this.isRunning) {
      return;
    }

    // Calculate current playback position in milliseconds
    const currentTime = this.audioContext.currentTime;
    const elapsedTime = (currentTime - this.startTime) * 1000; // Convert to milliseconds

    // Find the appropriate viseme for current playback position
    const viseme = this.findVisemeAtTime(elapsedTime);

    if (viseme) {
      // Check if viseme has changed
      if (!this.currentViseme || this.currentViseme.visemeId !== viseme.visemeId) {
        const visemeData: VisemeData = {
          visemeId: viseme.visemeId,
          timestamp: Date.now(),
          duration: viseme.duration,
        };

        this.updateCurrentViseme(visemeData);

        logger.debug('Viseme changed', {
          visemeId: viseme.visemeId,
          audioOffset: viseme.audioOffset,
          elapsedTime,
          syncDelta: Math.abs(elapsedTime - viseme.audioOffset),
        });
      }
    } else if (this.currentViseme && this.currentViseme.visemeId !== 0) {
      // No active viseme, return to neutral (silence)
      this.updateCurrentViseme({
        visemeId: 0,
        timestamp: Date.now(),
        duration: 0,
      });

      logger.debug('Returned to neutral viseme');
    }
  }

  /**
   * Find the appropriate viseme for the given playback time
   * Uses binary search for efficient lookup
   *
   * @param timeMs - Current playback time in milliseconds
   * @returns The viseme event at the given time, or null if none found
   */
  private findVisemeAtTime(timeMs: number): VisemeEvent | null {
    if (this.visemes.length === 0) {
      return null;
    }

    // Find the viseme that should be active at the current time
    // A viseme is active if: audioOffset <= timeMs < (audioOffset + duration)
    // If no duration is specified, use the next viseme's offset as the end time

    let activeViseme: VisemeEvent | null = null;

    for (let i = 0; i < this.visemes.length; i++) {
      const viseme = this.visemes[i];
      const nextViseme = i < this.visemes.length - 1 ? this.visemes[i + 1] : null;

      // Calculate end time for this viseme
      const endTime = nextViseme
        ? nextViseme.audioOffset
        : viseme.audioOffset + (viseme.duration || 100); // Default 100ms if no next viseme

      // Check if current time falls within this viseme's range
      if (timeMs >= viseme.audioOffset && timeMs < endTime) {
        activeViseme = viseme;
        break;
      }

      // If we've passed the current time, use the previous viseme
      if (viseme.audioOffset > timeMs) {
        break;
      }

      // Keep track of the most recent viseme we've passed
      activeViseme = viseme;
    }

    return activeViseme;
  }

  /**
   * Update current viseme and notify subscribers.
   * Also applies the corresponding blendshape to the stored avatar mesh.
   *
   * @param viseme - The new viseme data
   */
  private updateCurrentViseme(viseme: VisemeData): void {
    this.currentViseme = viseme;

    // Apply blendshape to the avatar mesh if one is set
    if (this.avatarMesh?.morphTargetDictionary && this.avatarMesh.morphTargetInfluences) {
      const dict = this.avatarMesh.morphTargetDictionary;
      const influences = this.avatarMesh.morphTargetInfluences;

      // Zero out all mouth blendshapes first
      for (const blendshapeName of Object.values(VISEME_BLENDSHAPE_MAP)) {
        const index = dict[blendshapeName];
        if (index !== undefined) {
          influences[index] = 0;
        }
      }

      // Activate the target blendshape (skip silence / viseme 0)
      const targetBlendshape = VISEME_BLENDSHAPE_MAP[viseme.visemeId];
      if (targetBlendshape && viseme.visemeId !== 0) {
        const index = dict[targetBlendshape];
        if (index !== undefined) {
          influences[index] = 1;
        }
      }
    }

    // Notify all subscribers
    this.visemeSubscribers.forEach((callback) => {
      try {
        callback(viseme);
      } catch (error) {
        logger.error('Error in viseme change subscriber', { error });
      }
    });
  }

  /**
   * Dispose of VisemeCoordinator and clean up all resources
   * Should be called when the component unmounts
   */
  dispose(): void {
    this.stop();
    this.visemeSubscribers.clear();
    this.audioContext = null;

    logger.info('VisemeCoordinator disposed');
  }
}
