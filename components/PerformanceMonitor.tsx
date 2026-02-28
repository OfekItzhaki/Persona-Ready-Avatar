'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PerformanceMonitorService } from '@/lib/services/PerformanceMonitorService';
import { PreferencesService } from '@/lib/services/PreferencesService';
import { useAppStore } from '@/lib/store/useAppStore';
import type { PerformanceMetrics } from '@/types';

/**
 * PerformanceMonitor Component
 *
 * A real-time performance monitoring overlay that displays FPS, memory usage, render metrics,
 * and API latency indicators. Provides expand/collapse functionality for detailed metrics.
 *
 * @component
 * @example
 * ```tsx
 * import { PerformanceMonitor } from '@/components/PerformanceMonitor';
 * 
 * function App() {
 *   return (
 *     <div className="app">
 *       {/* Your app content *\/}
 *       <PerformanceMonitor />
 *     </div>
 *   );
 * }
 * ```
 *
 * @features
 * - **FPS Display**: Real-time frames per second with color coding (green ≥60, yellow 30-59, red <30)
 * - **Average FPS**: Rolling average over last 60 frames
 * - **Frame Time**: Milliseconds per frame
 * - **Memory Usage**: Heap memory usage (when available via Performance API)
 * - **Draw Calls**: Number of draw calls per frame from Three.js renderer
 * - **Triangle Count**: Total triangles being rendered
 * - **API Latency**: Average latency for Brain API and TTS API (last 10 requests)
 * - **Expand/Collapse**: Toggle between compact and detailed views
 * - **Keyboard Shortcut**: Ctrl+Shift+P to toggle visibility
 * - **Persistent State**: Visibility and expanded state saved to localStorage
 *
 * @accessibility
 * - Positioned as non-intrusive corner overlay
 * - ARIA labels for region and interactive elements
 * - Keyboard shortcut documented and accessible
 * - Focus indicators on expand/collapse button
 * - aria-expanded state for screen readers
 *
 * @performance
 * - Updates metrics every second to reduce overhead
 * - Efficient metric calculation and storage
 * - Minimal impact on application performance
 * - Only renders when visible
 *
 * @keyboard-shortcuts
 * - **Ctrl+Shift+P**: Toggle performance monitor visibility
 *
 * @color-coding
 * - **FPS**: Green (≥60), Yellow (30-59), Red (<30)
 * - **Latency**: Green (<200ms), Yellow (200-500ms), Red (>500ms)
 *
 * @requirements 19, 20, 21
 */
export const PerformanceMonitor: React.FC = () => {
  const { uiPreferences, updateUIPreferences } = useAppStore();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    averageFps: 0,
    frameTime: 0,
    memoryUsage: null,
    drawCalls: 0,
    triangles: 0,
    brainApiLatency: [],
    ttsLatency: [],
  });

  const performanceService = PerformanceMonitorService.getInstance();

  // Toggle visibility
  const toggleVisibility = useCallback(() => {
    const newVisible = !uiPreferences.performanceMonitorVisible;
    updateUIPreferences({ performanceMonitorVisible: newVisible });
    
    // Persist to localStorage
    try {
      const preferencesService = PreferencesService.getInstance();
      preferencesService.updateUIPreferences({ performanceMonitorVisible: newVisible });
    } catch (error) {
      console.error('Failed to persist performance monitor visibility:', error);
    }
  }, [uiPreferences.performanceMonitorVisible, updateUIPreferences]);

  // Toggle expanded state
  const toggleExpanded = useCallback(() => {
    const newExpanded = !uiPreferences.performanceMonitorExpanded;
    updateUIPreferences({ performanceMonitorExpanded: newExpanded });
    
    // Persist to localStorage
    try {
      const preferencesService = PreferencesService.getInstance();
      preferencesService.updateUIPreferences({ performanceMonitorExpanded: newExpanded });
    } catch (error) {
      console.error('Failed to persist performance monitor expanded state:', error);
    }
  }, [uiPreferences.performanceMonitorExpanded, updateUIPreferences]);

  // Keyboard shortcut handler (Ctrl+Shift+P)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        toggleVisibility();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleVisibility]);

  // Update metrics periodically
  useEffect(() => {
    if (!uiPreferences.performanceMonitorVisible) {
      return;
    }

    // Update metrics every second
    const intervalId = setInterval(() => {
      const currentMetrics = performanceService.getMetrics();
      setMetrics(currentMetrics);
      
      // Update memory usage
      performanceService.updateMemoryUsage();
    }, 1000);

    return () => clearInterval(intervalId);
  }, [uiPreferences.performanceMonitorVisible, performanceService]);

  // Don't render if not visible
  if (!uiPreferences.performanceMonitorVisible) {
    return null;
  }

  // Helper function to get FPS color
  const getFpsColor = (fps: number): string => {
    if (fps >= 60) return 'text-green-500';
    if (fps >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Helper function to get latency color
  const getLatencyColor = (latency: number): string => {
    if (latency < 200) return 'text-green-500';
    if (latency <= 500) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Calculate average latency
  const getAverageLatency = (latencies: number[]): string => {
    if (latencies.length === 0) return 'N/A';
    const sum = latencies.reduce((acc, val) => acc + val, 0);
    const avg = Math.round(sum / latencies.length);
    return `${avg}ms`;
  };

  const { performanceMonitorExpanded } = uiPreferences;

  return (
    <div
      className={`performance-monitor fixed bottom-4 right-4 bg-gray-900 bg-opacity-90 text-white rounded-lg shadow-lg p-3 font-mono text-sm z-50 ${
        performanceMonitorExpanded ? 'expanded' : 'collapsed'
      }`}
      role="region"
      aria-label="Performance Monitor"
    >
      {/* Header with FPS and expand/collapse button */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="fps-display flex items-center gap-2">
          <span className="text-gray-400">FPS:</span>
          <span className={`font-bold text-lg ${getFpsColor(metrics.fps)}`}>
            {metrics.fps}
          </span>
          <span className="text-gray-500 text-xs">
            (avg: {metrics.averageFps})
          </span>
        </div>
        <button
          onClick={toggleExpanded}
          className="toggle-button text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
          aria-label={performanceMonitorExpanded ? 'Collapse metrics' : 'Expand metrics'}
          aria-expanded={performanceMonitorExpanded}
        >
          {performanceMonitorExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Expanded metrics */}
      {performanceMonitorExpanded && (
        <div className="expanded-metrics space-y-1 border-t border-gray-700 pt-2">
          {/* Frame time */}
          <div className="metric-row flex justify-between">
            <span className="text-gray-400">Frame Time:</span>
            <span className="text-white">{metrics.frameTime.toFixed(2)}ms</span>
          </div>

          {/* Memory usage */}
          {metrics.memoryUsage !== null && (
            <div className="flex justify-between">
              <span className="text-gray-400">Memory:</span>
              <span className="text-white">{metrics.memoryUsage}MB</span>
            </div>
          )}

          {/* Draw calls */}
          <div className="flex justify-between">
            <span className="text-gray-400">Draw Calls:</span>
            <span className="text-white">{metrics.drawCalls}</span>
          </div>

          {/* Triangles */}
          <div className="flex justify-between">
            <span className="text-gray-400">Triangles:</span>
            <span className="text-white">{metrics.triangles.toLocaleString()}</span>
          </div>

          {/* API Latency section */}
          <div className="border-t border-gray-700 pt-2 mt-2">
            <div className="text-gray-400 text-xs mb-1">API Latency (avg):</div>
            
            {/* Brain API latency */}
            <div className="flex justify-between">
              <span className="text-gray-400">Brain API:</span>
              <span className={getLatencyColor(
                metrics.brainApiLatency.length > 0
                  ? metrics.brainApiLatency.reduce((a, b) => a + b, 0) / metrics.brainApiLatency.length
                  : 0
              )}>
                {getAverageLatency(metrics.brainApiLatency)}
              </span>
            </div>

            {/* TTS latency */}
            <div className="flex justify-between">
              <span className="text-gray-400">TTS API:</span>
              <span className={getLatencyColor(
                metrics.ttsLatency.length > 0
                  ? metrics.ttsLatency.reduce((a, b) => a + b, 0) / metrics.ttsLatency.length
                  : 0
              )}>
                {getAverageLatency(metrics.ttsLatency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcut hint */}
      <div className="text-gray-500 text-xs mt-2 border-t border-gray-700 pt-2">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  );
};
