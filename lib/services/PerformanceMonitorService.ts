import { logger } from '../logger';
import type { PerformanceMetrics } from '@/types';

/**
 * PerformanceMonitorService
 * 
 * Tracks and calculates performance metrics for the Avatar Client application.
 * Provides real-time FPS calculation, memory usage tracking, render metrics,
 * and API latency monitoring.
 * 
 * Features:
 * - FPS calculation based on frame render times
 * - Average FPS over last 60 frames
 * - Memory usage tracking via Performance API
 * - Render time per frame tracking
 * - Draw calls and triangle count from Three.js renderer
 * - API latency tracking for Brain API and Azure TTS (last 10 requests)
 * 
 * Requirements: 19, 20, 21
 */
export class PerformanceMonitorService {
  private static instance: PerformanceMonitorService | null = null;

  // FPS tracking
  private frameTimes: number[] = [];
  private lastFrameTime: number = 0;
  private currentFps: number = 0;
  private averageFps: number = 0;
  private frameTime: number = 0;

  // Memory tracking
  private memoryUsage: number | null = null;

  // Render metrics
  private drawCalls: number = 0;
  private triangles: number = 0;

  // API latency tracking (last 10 requests)
  private brainApiLatency: number[] = [];
  private ttsLatency: number[] = [];
  private readonly MAX_LATENCY_SAMPLES = 10;

  // Frame tracking constants
  private readonly MAX_FRAME_SAMPLES = 60;

  private constructor() {
    logger.info('PerformanceMonitorService initialized', {
      component: 'PerformanceMonitorService',
      operation: 'constructor',
    });
  }

  /**
   * Get the singleton instance of PerformanceMonitorService
   */
  static getInstance(): PerformanceMonitorService {
    if (!PerformanceMonitorService.instance) {
      PerformanceMonitorService.instance = new PerformanceMonitorService();
    }
    return PerformanceMonitorService.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static reset(): void {
    PerformanceMonitorService.instance = null;
  }

  /**
   * Record a frame render time and update FPS calculations
   * Should be called on every frame (typically via requestAnimationFrame)
   * 
   * @param timestamp - Current timestamp from requestAnimationFrame
   */
  recordFrame(timestamp: number): void {
    // Calculate frame time
    if (this.lastFrameTime > 0) {
      const deltaTime = timestamp - this.lastFrameTime;
      this.frameTime = deltaTime;

      // Add to frame times array
      this.frameTimes.push(deltaTime);

      // Keep only last 60 frames
      if (this.frameTimes.length > this.MAX_FRAME_SAMPLES) {
        this.frameTimes.shift();
      }

      // Calculate current FPS (based on this frame)
      this.currentFps = deltaTime > 0 ? 1000 / deltaTime : 0;

      // Calculate average FPS (based on last 60 frames)
      if (this.frameTimes.length > 0) {
        const avgFrameTime =
          this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
        this.averageFps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
      }
    }

    this.lastFrameTime = timestamp;
  }

  /**
   * Update memory usage from Performance API
   * Should be called periodically (e.g., every second)
   */
  updateMemoryUsage(): void {
    try {
      // Check if Performance API with memory is available
      if ('memory' in performance && (performance as any).memory) {
        const memory = (performance as any).memory;
        // Convert bytes to megabytes
        this.memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      } else {
        this.memoryUsage = null;
      }
    } catch (error) {
      logger.error('Failed to update memory usage', {
        component: 'PerformanceMonitorService',
        operation: 'updateMemoryUsage',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.memoryUsage = null;
    }
  }

  /**
   * Update render metrics from Three.js renderer
   * 
   * @param renderer - Three.js WebGLRenderer instance
   */
  updateRenderMetrics(renderer: any): void {
    try {
      if (renderer && renderer.info) {
        this.drawCalls = renderer.info.render.calls || 0;
        this.triangles = renderer.info.render.triangles || 0;
      }
    } catch (error) {
      logger.error('Failed to update render metrics', {
        component: 'PerformanceMonitorService',
        operation: 'updateRenderMetrics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Record Brain API request latency
   * 
   * @param latencyMs - Request latency in milliseconds
   */
  recordBrainApiLatency(latencyMs: number): void {
    this.brainApiLatency.push(latencyMs);

    // Keep only last 10 samples
    if (this.brainApiLatency.length > this.MAX_LATENCY_SAMPLES) {
      this.brainApiLatency.shift();
    }

    logger.debug('Brain API latency recorded', {
      component: 'PerformanceMonitorService',
      operation: 'recordBrainApiLatency',
      latency: latencyMs,
      averageLatency: this.getAverageBrainApiLatency(),
    });
  }

  /**
   * Record Azure TTS request latency
   * 
   * @param latencyMs - Request latency in milliseconds
   */
  recordTtsLatency(latencyMs: number): void {
    this.ttsLatency.push(latencyMs);

    // Keep only last 10 samples
    if (this.ttsLatency.length > this.MAX_LATENCY_SAMPLES) {
      this.ttsLatency.shift();
    }

    logger.debug('TTS latency recorded', {
      component: 'PerformanceMonitorService',
      operation: 'recordTtsLatency',
      latency: latencyMs,
      averageLatency: this.getAverageTtsLatency(),
    });
  }

  /**
   * Get average Brain API latency from last 10 requests
   * 
   * @returns Average latency in milliseconds, or null if no data
   */
  getAverageBrainApiLatency(): number | null {
    if (this.brainApiLatency.length === 0) {
      return null;
    }
    const sum = this.brainApiLatency.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / this.brainApiLatency.length);
  }

  /**
   * Get average TTS latency from last 10 requests
   * 
   * @returns Average latency in milliseconds, or null if no data
   */
  getAverageTtsLatency(): number | null {
    if (this.ttsLatency.length === 0) {
      return null;
    }
    const sum = this.ttsLatency.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / this.ttsLatency.length);
  }

  /**
   * Get current performance metrics
   * 
   * @returns Current performance metrics object
   */
  getMetrics(): PerformanceMetrics {
    return {
      fps: Math.round(this.currentFps),
      averageFps: Math.round(this.averageFps),
      frameTime: Math.round(this.frameTime * 100) / 100, // Round to 2 decimal places
      memoryUsage: this.memoryUsage,
      drawCalls: this.drawCalls,
      triangles: this.triangles,
      brainApiLatency: [...this.brainApiLatency],
      ttsLatency: [...this.ttsLatency],
    };
  }

  /**
   * Reset all metrics to initial state
   */
  reset(): void {
    this.frameTimes = [];
    this.lastFrameTime = 0;
    this.currentFps = 0;
    this.averageFps = 0;
    this.frameTime = 0;
    this.memoryUsage = null;
    this.drawCalls = 0;
    this.triangles = 0;
    this.brainApiLatency = [];
    this.ttsLatency = [];

    logger.info('Performance metrics reset', {
      component: 'PerformanceMonitorService',
      operation: 'reset',
    });
  }
}
