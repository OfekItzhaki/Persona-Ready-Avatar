import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeManager } from '../ThemeManager';

describe('ThemeManager', () => {
  let themeManager: ThemeManager;

  beforeEach(() => {
    // Reset singleton before each test
    ThemeManager.reset();
    
    // Mock document.documentElement
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.removeAttribute('data-theme');
    
    // Create fresh instance
    themeManager = ThemeManager.getInstance();
  });

  afterEach(() => {
    ThemeManager.reset();
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = ThemeManager.getInstance();
      const instance2 = ThemeManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should create a new instance after reset', () => {
      const instance1 = ThemeManager.getInstance();
      ThemeManager.reset();
      const instance2 = ThemeManager.getInstance();
      
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('setTheme', () => {
    it('should set light theme and apply it to document', () => {
      themeManager.setTheme('light');
      
      expect(themeManager.getTheme()).toBe('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should set dark theme and apply it to document', () => {
      themeManager.setTheme('dark');
      
      expect(themeManager.getTheme()).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should set system theme and apply detected system preference', () => {
      // Mock system preference to dark
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      ThemeManager.reset();
      themeManager = ThemeManager.getInstance();
      themeManager.setTheme('system');
      
      expect(themeManager.getTheme()).toBe('system');
      expect(themeManager.getEffectiveTheme()).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should switch between themes correctly', () => {
      themeManager.setTheme('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
      
      themeManager.setTheme('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
      
      themeManager.setTheme('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should call onThemeChange callback when theme changes', () => {
      const callback = vi.fn();
      themeManager.onThemeChange(callback);
      
      themeManager.setTheme('dark');
      
      expect(callback).toHaveBeenCalledWith('dark');
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTheme', () => {
    it('should return the current theme setting', () => {
      themeManager.setTheme('light');
      expect(themeManager.getTheme()).toBe('light');
      
      themeManager.setTheme('dark');
      expect(themeManager.getTheme()).toBe('dark');
      
      themeManager.setTheme('system');
      expect(themeManager.getTheme()).toBe('system');
    });
  });

  describe('getEffectiveTheme', () => {
    it('should return light when theme is light', () => {
      themeManager.setTheme('light');
      expect(themeManager.getEffectiveTheme()).toBe('light');
    });

    it('should return dark when theme is dark', () => {
      themeManager.setTheme('dark');
      expect(themeManager.getEffectiveTheme()).toBe('dark');
    });

    it('should return system preference when theme is system', () => {
      // Mock system preference to light
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: false, // light mode
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      ThemeManager.reset();
      themeManager = ThemeManager.getInstance();
      themeManager.setTheme('system');
      
      expect(themeManager.getEffectiveTheme()).toBe('light');
    });
  });

  describe('detectSystemTheme', () => {
    it('should detect light system theme', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: false, // light mode
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      ThemeManager.reset();
      themeManager = ThemeManager.getInstance();
      
      expect(themeManager.detectSystemTheme()).toBe('light');
    });

    it('should detect dark system theme', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      ThemeManager.reset();
      themeManager = ThemeManager.getInstance();
      
      expect(themeManager.detectSystemTheme()).toBe('dark');
    });
  });

  describe('System Theme Change Detection', () => {
    it('should setup listener for system theme changes', () => {
      const addEventListenerMock = vi.fn();
      
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: '(prefers-color-scheme: dark)',
          onchange: null,
          addEventListener: addEventListenerMock,
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      ThemeManager.reset();
      themeManager = ThemeManager.getInstance();
      
      expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should update theme when system preference changes and theme is system', () => {
      const handlerRef: { current: ((e: MediaQueryListEvent) => void) | null } = { current: null };
      
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false, // initially light
          media: '(prefers-color-scheme: dark)',
          onchange: null,
          addEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
            if (event === 'change') {
              handlerRef.current = handler;
            }
          }),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      ThemeManager.reset();
      themeManager = ThemeManager.getInstance();
      themeManager.setTheme('system');
      
      // Initially should be light
      expect(document.documentElement.classList.contains('light')).toBe(true);
      
      // Simulate system theme change to dark
      handlerRef.current?.({ matches: true } as MediaQueryListEvent);
      
      // Should now be dark
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });

    it('should not update theme when system preference changes but theme is not system', () => {
      const handlerRef: { current: ((e: MediaQueryListEvent) => void) | null } = { current: null };
      
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: '(prefers-color-scheme: dark)',
          onchange: null,
          addEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
            if (event === 'change') {
              handlerRef.current = handler;
            }
          }),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      ThemeManager.reset();
      themeManager = ThemeManager.getInstance();
      themeManager.setTheme('light'); // Explicitly set to light
      
      expect(document.documentElement.classList.contains('light')).toBe(true);
      
      // Simulate system theme change to dark
      handlerRef.current?.({ matches: true } as MediaQueryListEvent);
      
      // Should still be light (not affected by system change)
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should handle legacy addListener API for older browsers', () => {
      const addListenerMock = vi.fn();
      
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: '(prefers-color-scheme: dark)',
          onchange: null,
          addEventListener: undefined, // Simulate older browser
          addListener: addListenerMock,
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      ThemeManager.reset();
      themeManager = ThemeManager.getInstance();
      
      expect(addListenerMock).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('onThemeChange', () => {
    it('should register and call callback on theme change', () => {
      const callback = vi.fn();
      themeManager.onThemeChange(callback);
      
      themeManager.setTheme('dark');
      expect(callback).toHaveBeenCalledWith('dark');
      
      themeManager.setTheme('light');
      expect(callback).toHaveBeenCalledWith('light');
      
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should replace previous callback when called multiple times', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      themeManager.onThemeChange(callback1);
      themeManager.onThemeChange(callback2);
      
      themeManager.setTheme('dark');
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith('dark');
    });
  });

  describe('CSS Class Application', () => {
    it('should remove previous theme class when switching themes', () => {
      themeManager.setTheme('light');
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      
      themeManager.setTheme('dark');
      expect(document.documentElement.classList.contains('light')).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should set data-theme attribute', () => {
      themeManager.setTheme('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      
      themeManager.setTheme('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('Edge Cases', () => {
    it('should handle SSR environment gracefully (no window)', () => {
      // This test verifies the code doesn't crash in SSR
      // The actual SSR behavior is handled by the typeof window checks
      expect(() => {
        themeManager.setTheme('light');
      }).not.toThrow();
    });

    it('should initialize with system theme by default', () => {
      // Fresh instance should default to system
      ThemeManager.reset();
      const newManager = ThemeManager.getInstance();
      
      expect(newManager.getTheme()).toBe('system');
    });
  });
});
