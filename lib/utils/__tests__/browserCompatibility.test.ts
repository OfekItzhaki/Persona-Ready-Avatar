/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkBrowserCompatibility } from '../browserCompatibility';

describe('browserCompatibility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkBrowserCompatibility', () => {
    it('should return compatible result when all features are supported', () => {
      // Mock all required APIs as available
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi.fn(),
        },
        configurable: true,
      });

      Object.defineProperty(global.window, 'AudioContext', {
        value: vi.fn(),
        configurable: true,
      });

      Object.defineProperty(global.window, 'MediaRecorder', {
        value: vi.fn(),
        configurable: true,
      });

      const result = checkBrowserCompatibility();

      expect(result.isCompatible).toBe(true);
      expect(result.checks.mediaDevices).toBe(true);
      expect(result.checks.getUserMedia).toBe(true);
      expect(result.checks.audioContext).toBe(true);
      expect(result.checks.mediaRecorder).toBe(true);
      expect(result.message).toBe('Browser supports voice input');
    });

    it('should return incompatible result when mediaDevices is missing', () => {
      // Remove mediaDevices
      const originalNavigator = global.navigator;
      Object.defineProperty(global, 'navigator', {
        value: {},
        configurable: true,
      });

      const result = checkBrowserCompatibility();

      expect(result.isCompatible).toBe(false);
      expect(result.checks.mediaDevices).toBe(false);
      expect(result.message).toContain('does not support required audio APIs');

      // Restore navigator
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
    });

    it('should return incompatible result when getUserMedia is missing', () => {
      // Mock mediaDevices without getUserMedia
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {},
        configurable: true,
      });

      const result = checkBrowserCompatibility();

      expect(result.isCompatible).toBe(false);
      expect(result.checks.mediaDevices).toBe(true);
      expect(result.checks.getUserMedia).toBe(false);
      expect(result.message).toContain('does not support required audio APIs');
    });

    it('should return incompatible result when AudioContext is missing', () => {
      // Mock all except AudioContext
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi.fn(),
        },
        configurable: true,
      });

      Object.defineProperty(global.window, 'MediaRecorder', {
        value: vi.fn(),
        configurable: true,
      });

      // Remove AudioContext
      const originalAudioContext = (global.window as any).AudioContext;
      const originalWebkitAudioContext = (global.window as any).webkitAudioContext;
      delete (global.window as any).AudioContext;
      delete (global.window as any).webkitAudioContext;

      const result = checkBrowserCompatibility();

      expect(result.isCompatible).toBe(false);
      expect(result.checks.audioContext).toBe(false);
      expect(result.message).toContain('does not support required audio APIs');

      // Restore AudioContext
      if (originalAudioContext) {
        (global.window as any).AudioContext = originalAudioContext;
      }
      if (originalWebkitAudioContext) {
        (global.window as any).webkitAudioContext = originalWebkitAudioContext;
      }
    });

    it('should return incompatible result when MediaRecorder is missing', () => {
      // Mock all except MediaRecorder
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi.fn(),
        },
        configurable: true,
      });

      Object.defineProperty(global.window, 'AudioContext', {
        value: vi.fn(),
        configurable: true,
      });

      // Remove MediaRecorder
      const originalMediaRecorder = (global.window as any).MediaRecorder;
      delete (global.window as any).MediaRecorder;

      const result = checkBrowserCompatibility();

      expect(result.isCompatible).toBe(false);
      expect(result.checks.mediaRecorder).toBe(false);
      expect(result.message).toContain('does not support required audio APIs');

      // Restore MediaRecorder
      if (originalMediaRecorder) {
        (global.window as any).MediaRecorder = originalMediaRecorder;
      }
    });

    it('should support webkit-prefixed AudioContext for Safari', () => {
      // Mock all required APIs with webkit prefix
      Object.defineProperty(global.navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi.fn(),
        },
        configurable: true,
      });

      // Remove standard AudioContext, add webkit version
      const originalAudioContext = (global.window as any).AudioContext;
      delete (global.window as any).AudioContext;
      Object.defineProperty(global.window, 'webkitAudioContext', {
        value: vi.fn(),
        configurable: true,
      });

      Object.defineProperty(global.window, 'MediaRecorder', {
        value: vi.fn(),
        configurable: true,
      });

      const result = checkBrowserCompatibility();

      expect(result.isCompatible).toBe(true);
      expect(result.checks.audioContext).toBe(true);

      // Restore AudioContext
      if (originalAudioContext) {
        (global.window as any).AudioContext = originalAudioContext;
      }
      delete (global.window as any).webkitAudioContext;
    });

    it('should return detailed checks object', () => {
      const result = checkBrowserCompatibility();

      expect(result.checks).toHaveProperty('mediaDevices');
      expect(result.checks).toHaveProperty('getUserMedia');
      expect(result.checks).toHaveProperty('audioContext');
      expect(result.checks).toHaveProperty('mediaRecorder');
      expect(typeof result.checks.mediaDevices).toBe('boolean');
      expect(typeof result.checks.getUserMedia).toBe('boolean');
      expect(typeof result.checks.audioContext).toBe('boolean');
      expect(typeof result.checks.mediaRecorder).toBe('boolean');
    });

    it('should include browser recommendations in error message', () => {
      // Force incompatible state
      const originalNavigator = global.navigator;
      Object.defineProperty(global, 'navigator', {
        value: {},
        configurable: true,
      });

      const result = checkBrowserCompatibility();

      expect(result.message).toContain('Chrome 90+');
      expect(result.message).toContain('Edge 90+');
      expect(result.message).toContain('Safari 14+');

      // Restore navigator
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
    });
  });
});
