/**
 * Animation Performance Monitor
 * 
 * Monitors animation performance and automatically reduces complexity
 * when frame rate drops below acceptable thresholds.
 */

import type { AnimationPerformanceMetrics } from './types';

const TARGET_FPS = 60;
const MIN_ACCEPTABLE_FPS = 30;
const FRAME_TIME_THRESHOLD = 1000 / MIN_ACCEPTABLE_FPS; // ~33ms

/**
 * Performance monitor for tracking animation frame rates
 */
export class AnimationPerformanceMonitor {
  private frameTimestamps: number[] = [];
  private startTime: number = 0;
  private animationFrameId: number | null = null;
  private isMonitoring: boolean = false;

  /**
   * Starts monitoring animation performance
   */
  start(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.startTime = performance.now();
    this.frameTimestamps = [];
    this.monitorFrame();
  }

  /**
   * Stops monitoring and returns performance metrics
   */
  stop(): AnimationPerformanceMetrics {
    this.isMonitoring = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    return this.calculateMetrics();
  }

  /**
   * Monitors a single frame
   */
  private monitorFrame = (): void => {
    if (!this.isMonitoring) return;

    const now = performance.now();
    this.frameTimestamps.push(now);

    // Keep only last 60 frames for rolling average
    if (this.frameTimestamps.length > 60) {
      this.frameTimestamps.shift();
    }

    this.animationFrameId = requestAnimationFrame(this.monitorFrame);
  };

  /**
   * Calculates performance metrics from collected frame data
   */
  private calculateMetrics(): AnimationPerformanceMetrics {
    if (this.frameTimestamps.length < 2) {
      return {
        averageFps: 0,
        minFps: 0,
        maxFps: 0,
        droppedFrames: 0,
        duration: 0,
      };
    }

    const frameTimes: number[] = [];
    for (let i = 1; i < this.frameTimestamps.length; i++) {
      frameTimes.push(this.frameTimestamps[i] - this.frameTimestamps[i - 1]);
    }

    const averageFrameTime =
      frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
    const minFrameTime = Math.min(...frameTimes);
    const maxFrameTime = Math.max(...frameTimes);

    const averageFps = 1000 / averageFrameTime;
    const minFps = 1000 / maxFrameTime;
    const maxFps = 1000 / minFrameTime;

    const droppedFrames = frameTimes.filter(
      (time) => time > FRAME_TIME_THRESHOLD
    ).length;

    const duration =
      this.frameTimestamps[this.frameTimestamps.length - 1] - this.startTime;

    return {
      averageFps: Math.round(averageFps),
      minFps: Math.round(minFps),
      maxFps: Math.round(maxFps),
      droppedFrames,
      duration: Math.round(duration),
    };
  }

  /**
   * Checks if current performance is acceptable
   */
  isPerformanceAcceptable(): boolean {
    const metrics = this.calculateMetrics();
    return metrics.averageFps >= MIN_ACCEPTABLE_FPS;
  }
}

/**
 * Global performance monitor instance
 */
let globalMonitor: AnimationPerformanceMonitor | null = null;

/**
 * Gets or creates the global performance monitor
 */
export function getPerformanceMonitor(): AnimationPerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new AnimationPerformanceMonitor();
  }
  return globalMonitor;
}

/**
 * Measures the performance of an animation
 * 
 * @param callback - Animation function to measure
 * @returns Performance metrics
 */
export async function measureAnimationPerformance(
  callback: () => Promise<void>
): Promise<AnimationPerformanceMetrics> {
  const monitor = new AnimationPerformanceMonitor();
  monitor.start();

  try {
    await callback();
  } finally {
    return monitor.stop();
  }
}
