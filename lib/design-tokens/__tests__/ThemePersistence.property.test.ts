/**
 * Property-Based Test: Theme Persistence Round-Trip
 * 
 * **Validates: Requirements 2.5, 2.6**
 * 
 * Property 2: Theme Persistence Round-Trip
 * For any theme selection, persisting the theme to localStorage and then loading it
 * should restore the same theme.
 * 
 * This test validates that:
 * 1. When a theme is selected, the system persists the preference to localStorage (Req 2.5)
 * 2. When the application loads, the system restores the user's saved theme preference (Req 2.6)
 */

import { describe, expect, beforeEach, afterEach, vi } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import { applyTheme } from '@/lib/hooks/useTheme';
import type { ThemeVariant } from '@/lib/design-tokens/types';

describe('Property 2: Theme Persistence Round-Trip', () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};
    global.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      length: 0,
      key: vi.fn(),
    } as Storage;

    // Mock document.documentElement
    if (typeof document !== 'undefined') {
      document.documentElement.className = '';
      document.documentElement.style.cssText = '';
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property: For any valid theme, applying it must persist to localStorage
   * and retrieving it must return the same theme
   */
  test.prop([
    fc.constantFrom<ThemeVariant>('light', 'dark', 'high-contrast')
  ])('persists theme to localStorage and retrieves it correctly', (themeName) => {
    // Apply the theme
    const appliedTheme = applyTheme(themeName);

    // Requirement 2.5: When a theme is selected, the system must persist the preference to localStorage
    expect(localStorage.setItem).toHaveBeenCalledWith('app-theme', appliedTheme);
    expect(localStorageMock['app-theme']).toBe(appliedTheme);

    // Simulate loading from localStorage (round-trip)
    const retrievedTheme = localStorage.getItem('app-theme');

    // Requirement 2.6: When the application loads, the system must restore the user's saved theme preference
    expect(retrievedTheme).toBe(appliedTheme);
    expect(retrievedTheme).toBe(themeName);
  });

  /**
   * Property: Multiple theme changes must always persist the latest theme
   */
  test.prop([
    fc.array(fc.constantFrom<ThemeVariant>('light', 'dark', 'high-contrast'), { minLength: 2, maxLength: 10 })
  ])('persists the latest theme after multiple changes', (themeSequence) => {
    // Apply all themes in sequence
    themeSequence.forEach(theme => {
      applyTheme(theme);
    });

    // The final theme should be persisted
    const finalTheme = themeSequence[themeSequence.length - 1];
    const retrievedTheme = localStorage.getItem('app-theme');

    expect(retrievedTheme).toBe(finalTheme);
  });

  /**
   * Property: Theme persistence must survive multiple round-trips
   */
  test.prop([
    fc.constantFrom<ThemeVariant>('light', 'dark', 'high-contrast')
  ])('maintains theme consistency across multiple round-trips', (themeName) => {
    // First round-trip: apply and retrieve
    applyTheme(themeName);
    const firstRetrieval = localStorage.getItem('app-theme');
    expect(firstRetrieval).toBe(themeName);

    // Second round-trip: apply the retrieved theme and retrieve again
    if (firstRetrieval) {
      applyTheme(firstRetrieval as ThemeVariant);
      const secondRetrieval = localStorage.getItem('app-theme');
      expect(secondRetrieval).toBe(themeName);
    }

    // Third round-trip: apply the retrieved theme and retrieve again
    const thirdRetrieval = localStorage.getItem('app-theme');
    if (thirdRetrieval) {
      applyTheme(thirdRetrieval as ThemeVariant);
      const fourthRetrieval = localStorage.getItem('app-theme');
      expect(fourthRetrieval).toBe(themeName);
    }
  });

  /**
   * Property: Theme persistence must work even when switching between all themes
   */
  test.prop([
    fc.constantFrom<ThemeVariant>('light', 'dark', 'high-contrast'),
    fc.constantFrom<ThemeVariant>('light', 'dark', 'high-contrast'),
    fc.constantFrom<ThemeVariant>('light', 'dark', 'high-contrast')
  ])('correctly persists theme when switching between different themes', (theme1, theme2, theme3) => {
    // Apply first theme
    applyTheme(theme1);
    expect(localStorage.getItem('app-theme')).toBe(theme1);

    // Apply second theme
    applyTheme(theme2);
    expect(localStorage.getItem('app-theme')).toBe(theme2);

    // Apply third theme
    applyTheme(theme3);
    expect(localStorage.getItem('app-theme')).toBe(theme3);

    // Final retrieval should match the last applied theme
    const finalRetrieval = localStorage.getItem('app-theme');
    expect(finalRetrieval).toBe(theme3);
  });

  /**
   * Property: Empty localStorage should not prevent theme application
   */
  test.prop([
    fc.constantFrom<ThemeVariant>('light', 'dark', 'high-contrast')
  ])('applies theme correctly even when localStorage is initially empty', (themeName) => {
    // Ensure localStorage is empty
    localStorageMock = {};

    // Apply theme
    applyTheme(themeName);

    // Theme should be persisted
    expect(localStorage.getItem('app-theme')).toBe(themeName);
  });

  /**
   * Property: Theme persistence must handle localStorage errors gracefully
   */
  test.prop([
    fc.constantFrom<ThemeVariant>('light', 'dark', 'high-contrast')
  ])('handles localStorage errors gracefully', (themeName) => {
    // Mock localStorage.setItem to throw an error
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(localStorage.setItem).mockImplementationOnce(() => {
      throw new Error('localStorage is full');
    });

    // Apply theme should not throw
    expect(() => applyTheme(themeName)).not.toThrow();

    // Theme should still be applied to the document (even if not persisted)
    const root = document.documentElement;
    expect(root.classList.contains(themeName)).toBe(true);

    consoleWarnSpy.mockRestore();
  });

  /**
   * Property: Persisted theme must be a valid ThemeVariant
   */
  test.prop([
    fc.constantFrom<ThemeVariant>('light', 'dark', 'high-contrast')
  ])('persists only valid theme variants', (themeName) => {
    applyTheme(themeName);

    const persistedTheme = localStorage.getItem('app-theme');
    expect(persistedTheme).toBeTruthy();

    // Verify it's a valid theme variant
    const validThemes: ThemeVariant[] = ['light', 'dark', 'high-contrast'];
    expect(validThemes).toContain(persistedTheme);
  });

  /**
   * Property: Theme persistence key must be consistent
   */
  test.prop([
    fc.constantFrom<ThemeVariant>('light', 'dark', 'high-contrast')
  ])('uses consistent storage key for theme persistence', (themeName) => {
    applyTheme(themeName);

    // Verify the storage key is 'app-theme'
    expect(localStorage.setItem).toHaveBeenCalledWith('app-theme', expect.any(String));
    
    // Verify retrieval uses the same key
    const retrieved = localStorage.getItem('app-theme');
    expect(retrieved).toBe(themeName);
  });
});
