/* eslint-disable no-undef */
/**
 * PerformanceMonitor Class
 *
 * Monitors rendering performance metrics and provides quality recommendations.
 * Tracks FPS, frame time, draw calls, and triangles.
 *
 * Requirements: 7.1, 7.3
 */

import * as THREE from 'three';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private targetFPS: number;
  private fpsHistory: number[];
  private maxHistoryLength: number;
  private lastTime: number;
  private frameCount: number;

  constructor(targetFPS: number = 30) {
    this.targetFPS = targetFPS;
    this.metrics = {
      fps: 60,
      frameTime: 16.67,
      drawCalls: 0,
      triangles: 0,
    };
    this.fpsHistory = [];
    this.maxHistoryLength = 120; // 2 seconds at 60 FPS
    this.lastTime = performance.now();
    this.frameCount = 0;
  }

  /**
   * Update performance metrics
   *
   * Should be called once per frame to track performance.
   *
   * @param renderer - Three.js WebGLRenderer instance
   */
  update(renderer: THREE.WebGLRenderer): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;

    // Update frame time
    this.metrics.frameTime = deltaTime;

    // Calculate FPS
    this.frameCount++;
    if (deltaTime > 0) {
      const currentFPS = 1000 / deltaTime;
      this.metrics.fps = currentFPS;

      // Add to history
      this.fpsHistory.push(currentFPS);
      if (this.fpsHistory.length > this.maxHistoryLength) {
        this.fpsHistory.shift();
      }
    }

    // Get renderer info
    const info = renderer.info;
    this.metrics.drawCalls = info.render.calls;
    this.metrics.triangles = info.render.triangles;

    this.lastTime = currentTime;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if quality should be reduced
   *
   * Returns true if FPS has been below target for sustained period (2 seconds).
   */
  shouldReduceQuality(): boolean {
    if (this.fpsHistory.length < this.maxHistoryLength) {
      // Not enough data yet
      return false;
    }

    // Check if average FPS over last 2 seconds is below target
    const averageFPS = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
    return averageFPS < this.targetFPS;
  }

  /**
   * Get recommended quality level based on current performance
   */
  getRecommendedQuality(): 'low' | 'medium' | 'high' {
    if (this.fpsHistory.length < 60) {
      // Not enough data, return medium as default
      return 'medium';
    }

    const averageFPS = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;

    if (averageFPS >= 55) {
      return 'high';
    } else if (averageFPS >= 40) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Reset performance history
   */
  reset(): void {
    this.fpsHistory = [];
    this.frameCount = 0;
    this.lastTime = performance.now();
  }

  /**
   * Set target FPS
   */
  setTargetFPS(fps: number): void {
    this.targetFPS = fps;
  }

  /**
   * Get average FPS over the history window
   */
  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 60;
    return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
  }
}
