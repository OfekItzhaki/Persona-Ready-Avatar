import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { useAppStore } from '@/lib/store/useAppStore';
import { PerformanceMonitorService } from '@/lib/services/PerformanceMonitorService';
import { PreferencesService } from '@/lib/services/PreferencesService';

// Mock the services
vi.mock('@/lib/services/PerformanceMonitorService');
vi.mock('@/lib/services/PreferencesService');

describe('PerformanceMonitor', () => {
  let mockPerformanceService: any;
  let mockPreferencesService: any;

  beforeEach(() => {
    // Reset store to default state
    useAppStore.setState({
      uiPreferences: {
        theme: 'system',
        graphicsQuality: 'high',
        performanceMonitorVisible: true,
        performanceMonitorExpanded: false,
        highContrastMode: false,
      },
    });

    // Mock PerformanceMonitorService
    mockPerformanceService = {
      getMetrics: vi.fn().mockReturnValue({
        fps: 60,
        averageFps: 58,
        frameTime: 16.67,
        memoryUsage: 150,
        drawCalls: 25,
        triangles: 50000,
        brainApiLatency: [100, 120, 110],
        ttsLatency: [200, 180, 190],
      }),
      updateMemoryUsage: vi.fn(),
    };
    vi.mocked(PerformanceMonitorService.getInstance).mockReturnValue(mockPerformanceService);

    // Mock PreferencesService
    mockPreferencesService = {
      updateUIPreferences: vi.fn().mockReturnValue(true),
    };
    vi.mocked(PreferencesService.getInstance).mockReturnValue(mockPreferencesService);

    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Visibility', () => {
    it('should render when performanceMonitorVisible is true', () => {
      render(<PerformanceMonitor />);
      expect(screen.getByRole('region', { name: 'Performance Monitor' })).toBeInTheDocument();
    });

    it('should not render when performanceMonitorVisible is false', () => {
      useAppStore.setState({
        uiPreferences: {
          theme: 'system',
          graphicsQuality: 'high',
          performanceMonitorVisible: false,
          performanceMonitorExpanded: false,
          highContrastMode: false,
        },
      });

      render(<PerformanceMonitor />);
      expect(screen.queryByRole('region', { name: 'Performance Monitor' })).not.toBeInTheDocument();
    });

    it('should toggle visibility with Ctrl+Shift+P', () => {
      render(<PerformanceMonitor />);

      // Press Ctrl+Shift+P
      fireEvent.keyDown(window, { key: 'P', ctrlKey: true, shiftKey: true });

      // Check that updateUIPreferences was called
      const state = useAppStore.getState();
      expect(state.uiPreferences.performanceMonitorVisible).toBe(false);
    });
  });

  describe('FPS Display', () => {
    it('should display FPS label', () => {
      render(<PerformanceMonitor />);
      expect(screen.getByText('FPS:')).toBeInTheDocument();
    });

    it('should display average FPS label', () => {
      render(<PerformanceMonitor />);
      expect(screen.getByText(/avg:/)).toBeInTheDocument();
    });

    it('should apply color coding based on FPS value', () => {
      render(<PerformanceMonitor />);
      // Component starts with 0 FPS which should be red
      const fpsElement = screen.getByText('0');
      expect(fpsElement).toHaveClass('text-red-500');
    });
  });

  describe('Expand/Collapse', () => {
    it('should not show detailed metrics when collapsed', () => {
      render(<PerformanceMonitor />);
      expect(screen.queryByText('Frame Time:')).not.toBeInTheDocument();
      expect(screen.queryByText('Memory:')).not.toBeInTheDocument();
    });

    it('should show detailed metrics when expanded', () => {
      useAppStore.setState({
        uiPreferences: {
          theme: 'system',
          graphicsQuality: 'high',
          performanceMonitorVisible: true,
          performanceMonitorExpanded: true,
          highContrastMode: false,
        },
      });

      render(<PerformanceMonitor />);
      expect(screen.getByText('Frame Time:')).toBeInTheDocument();
      // Memory is only shown when memoryUsage is not null, which it is initially
      expect(screen.getByText('Draw Calls:')).toBeInTheDocument();
      expect(screen.getByText('Triangles:')).toBeInTheDocument();
    });

    it('should toggle expanded state when clicking expand button', () => {
      render(<PerformanceMonitor />);

      const expandButton = screen.getByRole('button', { name: 'Expand metrics' });
      fireEvent.click(expandButton);

      const state = useAppStore.getState();
      expect(state.uiPreferences.performanceMonitorExpanded).toBe(true);
    });

    it('should persist expanded state to preferences', () => {
      render(<PerformanceMonitor />);

      const expandButton = screen.getByRole('button', { name: 'Expand metrics' });
      fireEvent.click(expandButton);

      expect(mockPreferencesService.updateUIPreferences).toHaveBeenCalledWith({
        performanceMonitorExpanded: true,
      });
    });
  });

  describe('Detailed Metrics', () => {
    beforeEach(() => {
      useAppStore.setState({
        uiPreferences: {
          theme: 'system',
          graphicsQuality: 'high',
          performanceMonitorVisible: true,
          performanceMonitorExpanded: true,
          highContrastMode: false,
        },
      });
    });

    it('should display frame time label', () => {
      render(<PerformanceMonitor />);
      expect(screen.getByText('Frame Time:')).toBeInTheDocument();
    });

    it('should display draw calls label', () => {
      render(<PerformanceMonitor />);
      expect(screen.getByText('Draw Calls:')).toBeInTheDocument();
    });

    it('should display triangles label', () => {
      render(<PerformanceMonitor />);
      expect(screen.getByText('Triangles:')).toBeInTheDocument();
    });
  });

  describe('API Latency', () => {
    beforeEach(() => {
      useAppStore.setState({
        uiPreferences: {
          theme: 'system',
          graphicsQuality: 'high',
          performanceMonitorVisible: true,
          performanceMonitorExpanded: true,
          highContrastMode: false,
        },
      });
    });

    it('should display API latency section', () => {
      render(<PerformanceMonitor />);
      expect(screen.getByText('API Latency (avg):')).toBeInTheDocument();
    });

    it('should display Brain API label', () => {
      render(<PerformanceMonitor />);
      expect(screen.getByText('Brain API:')).toBeInTheDocument();
    });

    it('should display TTS API label', () => {
      render(<PerformanceMonitor />);
      expect(screen.getByText('TTS API:')).toBeInTheDocument();
    });
  });

  describe('Metrics Update', () => {
    it('should update metrics every second', async () => {
      render(<PerformanceMonitor />);

      // Advance timer by 1 second to trigger first update
      vi.advanceTimersByTime(1000);

      // Should have been called once
      expect(mockPerformanceService.getMetrics).toHaveBeenCalledTimes(1);
      expect(mockPerformanceService.updateMemoryUsage).toHaveBeenCalledTimes(1);

      // Advance timer by another second
      vi.advanceTimersByTime(1000);

      // Should have been called again
      expect(mockPerformanceService.getMetrics).toHaveBeenCalledTimes(2);
      expect(mockPerformanceService.updateMemoryUsage).toHaveBeenCalledTimes(2);
    });

    it('should not update metrics when not visible', () => {
      useAppStore.setState({
        uiPreferences: {
          theme: 'system',
          graphicsQuality: 'high',
          performanceMonitorVisible: false,
          performanceMonitorExpanded: false,
          highContrastMode: false,
        },
      });

      render(<PerformanceMonitor />);

      // Advance timer by 1 second
      vi.advanceTimersByTime(1000);

      // Should not have been called
      expect(mockPerformanceService.getMetrics).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PerformanceMonitor />);
      expect(screen.getByRole('region', { name: 'Performance Monitor' })).toBeInTheDocument();
    });

    it('should have aria-expanded attribute on expand button', () => {
      render(<PerformanceMonitor />);
      const expandButton = screen.getByRole('button', { name: 'Expand metrics' });
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should update aria-expanded when expanded', () => {
      useAppStore.setState({
        uiPreferences: {
          theme: 'system',
          graphicsQuality: 'high',
          performanceMonitorVisible: true,
          performanceMonitorExpanded: true,
          highContrastMode: false,
        },
      });

      render(<PerformanceMonitor />);
      const collapseButton = screen.getByRole('button', { name: 'Collapse metrics' });
      expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should display keyboard shortcut hint', () => {
      render(<PerformanceMonitor />);
      expect(screen.getByText('Press Ctrl+Shift+P to toggle')).toBeInTheDocument();
    });
  });
});
