/**
 * ThemeManager High Contrast Mode Tests
 * 
 * Tests for high contrast mode functionality in ThemeManager.
 * Validates Requirement 37 (Color Contrast Compliance).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeManager } from '../ThemeManager';

describe('ThemeManager - High Contrast Mode', () => {
  let themeManager: ThemeManager;
  let mockDocumentElement: HTMLElement;

  beforeEach(() => {
    // Reset singleton
    ThemeManager.reset();

    // Mock document.documentElement
    mockDocumentElement = {
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
      setAttribute: vi.fn(),
    } as unknown as HTMLElement;

    Object.defineProperty(document, 'documentElement', {
      value: mockDocumentElement,
      writable: true,
      configurable: true,
    });

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    themeManager = ThemeManager.getInstance();
  });

  afterEach(() => {
    ThemeManager.reset();
  });

  describe('setHighContrastMode', () => {
    it('should enable high contrast mode', () => {
      // Act
      themeManager.setHighContrastMode(true);

      // Assert
      expect(themeManager.getHighContrastMode()).toBe(true);
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('high-contrast');
    });

    it('should disable high contrast mode', () => {
      // Arrange
      themeManager.setHighContrastMode(true);

      // Act
      themeManager.setHighContrastMode(false);

      // Assert
      expect(themeManager.getHighContrastMode()).toBe(false);
      // The remove method is called with all classes, including 'high-contrast'
      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith(
        'light',
        'dark',
        'high-contrast'
      );
    });

    it('should apply high contrast class to document', () => {
      // Act
      themeManager.setHighContrastMode(true);

      // Assert
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('high-contrast');
      expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-high-contrast', 'true');
    });

    it('should remove high contrast class from document when disabled', () => {
      // Arrange
      themeManager.setHighContrastMode(true);
      vi.clearAllMocks();

      // Act
      themeManager.setHighContrastMode(false);

      // Assert
      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith(
        'light',
        'dark',
        'high-contrast'
      );
      expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-high-contrast', 'false');
    });
  });

  describe('getHighContrastMode', () => {
    it('should return false by default', () => {
      // Assert
      expect(themeManager.getHighContrastMode()).toBe(false);
    });

    it('should return true when enabled', () => {
      // Arrange
      themeManager.setHighContrastMode(true);

      // Assert
      expect(themeManager.getHighContrastMode()).toBe(true);
    });

    it('should return false when disabled', () => {
      // Arrange
      themeManager.setHighContrastMode(true);
      themeManager.setHighContrastMode(false);

      // Assert
      expect(themeManager.getHighContrastMode()).toBe(false);
    });
  });

  describe('onHighContrastChange', () => {
    it('should call callback when high contrast mode is enabled', () => {
      // Arrange
      const callback = vi.fn();
      themeManager.onHighContrastChange(callback);

      // Act
      themeManager.setHighContrastMode(true);

      // Assert
      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should call callback when high contrast mode is disabled', () => {
      // Arrange
      const callback = vi.fn();
      themeManager.onHighContrastChange(callback);
      themeManager.setHighContrastMode(true);
      vi.clearAllMocks();

      // Act
      themeManager.setHighContrastMode(false);

      // Assert
      expect(callback).toHaveBeenCalledWith(false);
    });

    it('should not call callback if not registered', () => {
      // Act
      themeManager.setHighContrastMode(true);

      // Assert - no error thrown
      expect(themeManager.getHighContrastMode()).toBe(true);
    });
  });

  describe('Integration with theme switching', () => {
    it('should maintain high contrast mode when switching themes', () => {
      // Arrange
      themeManager.setHighContrastMode(true);
      vi.clearAllMocks();

      // Act
      themeManager.setTheme('dark');

      // Assert
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('high-contrast');
    });

    it('should apply both theme and high contrast classes', () => {
      // Arrange
      themeManager.setTheme('light');
      vi.clearAllMocks();

      // Act
      themeManager.setHighContrastMode(true);

      // Assert
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('light');
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('high-contrast');
    });

    it('should remove high contrast class but keep theme class', () => {
      // Arrange
      themeManager.setTheme('dark');
      themeManager.setHighContrastMode(true);
      vi.clearAllMocks();

      // Act
      themeManager.setHighContrastMode(false);

      // Assert
      expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith(
        'light',
        'dark',
        'high-contrast'
      );
      expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
    });
  });

  describe('Data attributes', () => {
    it('should set data-high-contrast attribute to true when enabled', () => {
      // Act
      themeManager.setHighContrastMode(true);

      // Assert
      expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-high-contrast', 'true');
    });

    it('should set data-high-contrast attribute to false when disabled', () => {
      // Arrange
      themeManager.setHighContrastMode(true);
      vi.clearAllMocks();

      // Act
      themeManager.setHighContrastMode(false);

      // Assert
      expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-high-contrast', 'false');
    });

    it('should maintain data-theme attribute when toggling high contrast', () => {
      // Arrange
      themeManager.setTheme('dark');
      vi.clearAllMocks();

      // Act
      themeManager.setHighContrastMode(true);

      // Assert
      expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
      expect(mockDocumentElement.setAttribute).toHaveBeenCalledWith('data-high-contrast', 'true');
    });
  });
});
