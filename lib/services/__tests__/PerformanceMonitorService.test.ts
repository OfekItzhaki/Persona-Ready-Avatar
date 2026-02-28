import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitorService } from '../PerformanceMonitorService';

describe('PerformanceMonitorService', () => {
  let service: PerformanceMonitorService;

  beforeEach(() => {
    // Reset singleton before each test
    PerformanceMonitorService.reset();
    service = PerformanceMonitorService.getInstance();
  });

  afterEach(() => {
    // Clean up
    PerformanceMonitorService.reset();
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when getInstance is called', () => {
      const instance1 = PerformanceMonitorService.getInstance();
      const instance2 = PerformanceMonitorService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create a new instance after reset', () => {
      const instance1 = PerformanceMonitorService.getInstance();
      PerformanceMonitorService.reset();
      const instance2 = PerformanceMonitorService.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('FPS Tracking', () => {
    it('should initialize with zero FPS', () => {
      const metrics = service.getMetrics();

      expect(metrics.fps).toBe(0);
      expect(metrics.averageFps).toBe(0);
      expect(metrics.frameTime).toBe(0);
    });

    it('should calculate FPS from frame times', () => {
      // Simulate 60 FPS (16.67ms per frame)
      const frameInterval = 1000 / 60;
      let timestamp = 0;

      service.recordFrame(timestamp);
      timestamp += frameInterval;
      service.recordFrame(timestamp);
      timestamp += frameInterval;
      service.recordFrame(timestamp);

      const metrics = service.getMetrics();

      // FPS should be approximately 60
      expect(metrics.fps).toBeGreaterThan(55);
      expect(metrics.fps).toBeLessThan(65);
    });

    it('should calculate average FPS over multiple frames', () => {
      // Simulate varying frame rates
      const timestamps = [0, 16, 32, 50, 66, 82]; // Varying intervals

      timestamps.forEach((timestamp) => {
        service.recordFrame(timestamp);
      });

      const metrics = service.getMetrics();

      // Average FPS should be calculated
      expect(metrics.averageFps).toBeGreaterThan(0);
      expect(metrics.fps).toBeGreaterThan(0);
    });

    it('should keep only last 60 frame samples', () => {
      // Record 100 frames
      for (let i = 0; i < 100; i++) {
        service.recordFrame(i * 16.67);
      }

      const metrics = service.getMetrics();

      // Should still calculate FPS correctly
      expect(metrics.fps).toBeGreaterThan(0);
      expect(metrics.averageFps).toBeGreaterThan(0);
    });

    it('should handle first frame correctly', () => {
      service.recordFrame(1000);

      const metrics = service.getMetrics();

      // First frame should not calculate FPS yet
      expect(metrics.fps).toBe(0);
      expect(metrics.averageFps).toBe(0);
    });

    it('should calculate frame time correctly', () => {
      service.recordFrame(0);
      service.recordFrame(16.67);
      service.recordFrame(33.34);

      const metrics = service.getMetrics();

      // Frame time should be approximately 16.67ms
      expect(metrics.frameTime).toBeGreaterThan(16);
      expect(metrics.frameTime).toBeLessThan(17);
    });

    it('should handle 30 FPS correctly', () => {
      // Simulate 30 FPS (33.33ms per frame)
      const frameInterval = 1000 / 30;
      let timestamp = 0;

      service.recordFrame(timestamp);
      timestamp += frameInterval;
      service.recordFrame(timestamp);
      timestamp += frameInterval;
      service.recordFrame(timestamp);

      const metrics = service.getMetrics();

      // FPS should be approximately 30
      expect(metrics.fps).toBeGreaterThan(28);
      expect(metrics.fps).toBeLessThan(32);
    });

    it('should round FPS to nearest integer', () => {
      service.recordFrame(0);
      service.recordFrame(16.67);

      const metrics = service.getMetrics();

      // FPS should be rounded
      expect(Number.isInteger(metrics.fps)).toBe(true);
      expect(Number.isInteger(metrics.averageFps)).toBe(true);
    });
  });

  describe('Memory Tracking', () => {
    it('should initialize with null memory usage', () => {
      const metrics = service.getMetrics();

      expect(metrics.memoryUsage).toBeNull();
    });

    it('should update memory usage when Performance API is available', () => {
      // Mock Performance API with memory
      const mockMemory = {
        usedJSHeapSize: 50 * 1024 * 1024, // 50 MB in bytes
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 200 * 1024 * 1024,
      };

      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        configurable: true,
      });

      service.updateMemoryUsage();

      const metrics = service.getMetrics();

      // Memory should be in MB
      expect(metrics.memoryUsage).toBe(50);
    });

    it('should handle missing Performance API gracefully', () => {
      // Ensure memory API is not available
      Object.defineProperty(performance, 'memory', {
        value: undefined,
        configurable: true,
      });

      service.updateMemoryUsage();

      const metrics = service.getMetrics();

      expect(metrics.memoryUsage).toBeNull();
    });

    it('should handle errors during memory update', () => {
      // Mock Performance API to throw error
      Object.defineProperty(performance, 'memory', {
        get: () => {
          throw new Error('Memory API error');
        },
        configurable: true,
      });

      service.updateMemoryUsage();

      const metrics = service.getMetrics();

      expect(metrics.memoryUsage).toBeNull();
    });
  });

  describe('Render Metrics', () => {
    it('should initialize with zero render metrics', () => {
      const metrics = service.getMetrics();

      expect(metrics.drawCalls).toBe(0);
      expect(metrics.triangles).toBe(0);
    });

    it('should update render metrics from Three.js renderer', () => {
      const mockRenderer = {
        info: {
          render: {
            calls: 42,
            triangles: 15000,
          },
        },
      };

      service.updateRenderMetrics(mockRenderer);

      const metrics = service.getMetrics();

      expect(metrics.drawCalls).toBe(42);
      expect(metrics.triangles).toBe(15000);
    });

    it('should handle missing renderer info gracefully', () => {
      const mockRenderer = {};

      service.updateRenderMetrics(mockRenderer);

      const metrics = service.getMetrics();

      expect(metrics.drawCalls).toBe(0);
      expect(metrics.triangles).toBe(0);
    });

    it('should handle null renderer gracefully', () => {
      service.updateRenderMetrics(null);

      const metrics = service.getMetrics();

      expect(metrics.drawCalls).toBe(0);
      expect(metrics.triangles).toBe(0);
    });

    it('should handle errors during render metrics update', () => {
      const mockRenderer = {
        get info() {
          throw new Error('Renderer error');
        },
      };

      service.updateRenderMetrics(mockRenderer);

      const metrics = service.getMetrics();

      expect(metrics.drawCalls).toBe(0);
      expect(metrics.triangles).toBe(0);
    });
  });

  describe('API Latency Tracking', () => {
    it('should initialize with empty latency arrays', () => {
      const metrics = service.getMetrics();

      expect(metrics.brainApiLatency).toEqual([]);
      expect(metrics.ttsLatency).toEqual([]);
    });

    it('should record Brain API latency', () => {
      service.recordBrainApiLatency(150);
      service.recordBrainApiLatency(200);

      const metrics = service.getMetrics();

      expect(metrics.brainApiLatency).toEqual([150, 200]);
    });

    it('should record TTS latency', () => {
      service.recordTtsLatency(100);
      service.recordTtsLatency(120);

      const metrics = service.getMetrics();

      expect(metrics.ttsLatency).toEqual([100, 120]);
    });

    it('should keep only last 10 Brain API latency samples', () => {
      // Record 15 samples
      for (let i = 1; i <= 15; i++) {
        service.recordBrainApiLatency(i * 10);
      }

      const metrics = service.getMetrics();

      // Should only have last 10
      expect(metrics.brainApiLatency).toHaveLength(10);
      expect(metrics.brainApiLatency[0]).toBe(60); // 6th sample
      expect(metrics.brainApiLatency[9]).toBe(150); // 15th sample
    });

    it('should keep only last 10 TTS latency samples', () => {
      // Record 15 samples
      for (let i = 1; i <= 15; i++) {
        service.recordTtsLatency(i * 10);
      }

      const metrics = service.getMetrics();

      // Should only have last 10
      expect(metrics.ttsLatency).toHaveLength(10);
      expect(metrics.ttsLatency[0]).toBe(60); // 6th sample
      expect(metrics.ttsLatency[9]).toBe(150); // 15th sample
    });

    it('should calculate average Brain API latency', () => {
      service.recordBrainApiLatency(100);
      service.recordBrainApiLatency(200);
      service.recordBrainApiLatency(300);

      const average = service.getAverageBrainApiLatency();

      expect(average).toBe(200);
    });

    it('should calculate average TTS latency', () => {
      service.recordTtsLatency(50);
      service.recordTtsLatency(100);
      service.recordTtsLatency(150);

      const average = service.getAverageTtsLatency();

      expect(average).toBe(100);
    });

    it('should return null for average Brain API latency when no data', () => {
      const average = service.getAverageBrainApiLatency();

      expect(average).toBeNull();
    });

    it('should return null for average TTS latency when no data', () => {
      const average = service.getAverageTtsLatency();

      expect(average).toBeNull();
    });

    it('should round average latency to nearest integer', () => {
      service.recordBrainApiLatency(100);
      service.recordBrainApiLatency(101);
      service.recordBrainApiLatency(102);

      const average = service.getAverageBrainApiLatency();

      expect(Number.isInteger(average)).toBe(true);
      expect(average).toBe(101);
    });
  });

  describe('getMetrics', () => {
    it('should return complete metrics object', () => {
      // Setup some metrics
      service.recordFrame(0);
      service.recordFrame(16.67);
      service.recordBrainApiLatency(150);
      service.recordTtsLatency(100);

      const mockRenderer = {
        info: {
          render: {
            calls: 10,
            triangles: 5000,
          },
        },
      };
      service.updateRenderMetrics(mockRenderer);

      const metrics = service.getMetrics();

      expect(metrics).toHaveProperty('fps');
      expect(metrics).toHaveProperty('averageFps');
      expect(metrics).toHaveProperty('frameTime');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('drawCalls');
      expect(metrics).toHaveProperty('triangles');
      expect(metrics).toHaveProperty('brainApiLatency');
      expect(metrics).toHaveProperty('ttsLatency');
    });

    it('should return a copy of latency arrays', () => {
      service.recordBrainApiLatency(100);
      service.recordTtsLatency(200);

      const metrics1 = service.getMetrics();
      const metrics2 = service.getMetrics();

      // Arrays should be different instances
      expect(metrics1.brainApiLatency).not.toBe(metrics2.brainApiLatency);
      expect(metrics1.ttsLatency).not.toBe(metrics2.ttsLatency);

      // But have same values
      expect(metrics1.brainApiLatency).toEqual(metrics2.brainApiLatency);
      expect(metrics1.ttsLatency).toEqual(metrics2.ttsLatency);
    });
  });

  describe('reset', () => {
    it('should reset all metrics to initial state', () => {
      // Setup some metrics
      service.recordFrame(0);
      service.recordFrame(16.67);
      service.recordBrainApiLatency(150);
      service.recordTtsLatency(100);

      const mockRenderer = {
        info: {
          render: {
            calls: 10,
            triangles: 5000,
          },
        },
      };
      service.updateRenderMetrics(mockRenderer);

      // Reset
      service.reset();

      const metrics = service.getMetrics();

      expect(metrics.fps).toBe(0);
      expect(metrics.averageFps).toBe(0);
      expect(metrics.frameTime).toBe(0);
      expect(metrics.memoryUsage).toBeNull();
      expect(metrics.drawCalls).toBe(0);
      expect(metrics.triangles).toBe(0);
      expect(metrics.brainApiLatency).toEqual([]);
      expect(metrics.ttsLatency).toEqual([]);
    });

    it('should allow recording new metrics after reset', () => {
      // Record some metrics
      service.recordFrame(0);
      service.recordFrame(16.67);

      // Reset
      service.reset();

      // Record new metrics
      service.recordFrame(0);
      service.recordFrame(16.67);
      service.recordFrame(33.34);

      const metrics = service.getMetrics();

      expect(metrics.fps).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero frame time', () => {
      service.recordFrame(0);
      service.recordFrame(0); // Same timestamp

      const metrics = service.getMetrics();

      // Should handle gracefully without division by zero
      expect(metrics.fps).toBe(0);
    });

    it('should handle very high FPS', () => {
      service.recordFrame(0);
      service.recordFrame(1); // 1ms frame time = 1000 FPS
      service.recordFrame(2);

      const metrics = service.getMetrics();

      expect(metrics.fps).toBeGreaterThan(500);
    });

    it('should handle very low FPS', () => {
      service.recordFrame(0);
      service.recordFrame(1000); // 1000ms frame time = 1 FPS
      service.recordFrame(2000);

      const metrics = service.getMetrics();

      expect(metrics.fps).toBe(1);
    });

    it('should handle negative latency values', () => {
      service.recordBrainApiLatency(-10);

      const metrics = service.getMetrics();

      expect(metrics.brainApiLatency).toEqual([-10]);
    });

    it('should handle very large latency values', () => {
      service.recordBrainApiLatency(999999);

      const metrics = service.getMetrics();

      expect(metrics.brainApiLatency).toEqual([999999]);
    });

    it('should handle rapid consecutive updates', () => {
      for (let i = 0; i < 100; i++) {
        service.recordFrame(i * 16.67);
      }

      const metrics = service.getMetrics();

      expect(metrics.fps).toBeGreaterThan(0);
      expect(metrics.averageFps).toBeGreaterThan(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should track metrics for a typical 60 FPS session', () => {
      // Simulate 60 frames at 60 FPS
      for (let i = 0; i < 60; i++) {
        service.recordFrame(i * (1000 / 60));
      }

      const metrics = service.getMetrics();

      expect(metrics.fps).toBeGreaterThan(55);
      expect(metrics.fps).toBeLessThan(65);
      expect(metrics.averageFps).toBeGreaterThan(55);
      expect(metrics.averageFps).toBeLessThan(65);
    });

    it('should track metrics for a session with API calls', () => {
      // Simulate some API calls
      service.recordBrainApiLatency(150);
      service.recordBrainApiLatency(200);
      service.recordBrainApiLatency(180);

      service.recordTtsLatency(100);
      service.recordTtsLatency(120);
      service.recordTtsLatency(110);

      const brainAvg = service.getAverageBrainApiLatency();
      const ttsAvg = service.getAverageTtsLatency();

      expect(brainAvg).toBe(177); // (150 + 200 + 180) / 3 = 176.67 rounded to 177
      expect(ttsAvg).toBe(110); // (100 + 120 + 110) / 3 = 110
    });

    it('should handle mixed performance scenarios', () => {
      // Good FPS
      for (let i = 0; i < 30; i++) {
        service.recordFrame(i * 16.67);
      }

      // Then poor FPS
      for (let i = 30; i < 60; i++) {
        service.recordFrame(30 * 16.67 + (i - 30) * 33.33);
      }

      const metrics = service.getMetrics();

      // Average should reflect mixed performance
      expect(metrics.averageFps).toBeGreaterThan(30);
      expect(metrics.averageFps).toBeLessThan(60);
    });
  });
});
