/**
 * Property-Based Test: Theme Consistency
 * 
 * **Validates: Requirements 1.8, 2.2, 2.3, 2.4, 2.7**
 * 
 * Property 1: Theme Consistency
 * For all components in the application, when a theme is applied, the component
 * must use the current theme's design tokens and reflect theme changes immediately.
 * 
 * This test validates that:
 * 1. When a design token is updated, all components using that token reflect the change immediately (Req 1.8)
 * 2. When a user selects a theme, the system applies all theme-specific CSS variables to the document root (Req 2.2)
 * 3. When a theme is applied, the system updates color, gradient, and shadow variables (Req 2.3)
 * 4. When a theme is applied, the system adds the appropriate theme class to the root element (Req 2.4)
 * 5. When a theme changes, the system emits a themeChanged event (Req 2.7)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import { applyTheme } from '@/lib/hooks/useTheme';
import { getThemeConfigWithFallback } from '@/lib/design-tokens/loader';
import type { ThemeVariant } from '@/lib/design-tokens/types';

describe('Property 1: Theme Consistency', () => {
  let localStorageMock: Record<string, string>;
  let themeChangeEvents: CustomEvent[];

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

    // Track theme change events
    themeChangeEvents = [];
    const eventListener = (event: Event) => {
      themeChangeEvents.push(event as CustomEvent);
    };
    window.addEventListener('themeChanged', eventListener);
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.removeEventListener('themeChanged', () => {});
  });

  /**
   * Property: For any valid theme, applying it must set all CSS variables
   * and add the correct theme class to the document root
   */
  test.prop([
    fc.constantFrom<ThemeVariant>('light', 'dark', 'high-contrast')
  ])('applies all theme CSS variables and classes for any theme', (themeName) => {
    // Apply the theme
    const appliedTheme = applyTheme(themeName);

    // Verify the theme was applied (may be fallback)
    expect(appliedTheme).toBe(themeName);

    // Get the theme configuration
    const themeConfig = getThemeConfigWithFallback(themeName);

    // Requirement 2.2: All theme-specific CSS variables must be applied to document root
    const root = document.documentElement;

    // Verify background colors
    expect(root.style.getPropertyValue('--bg-primary')).toBe(themeConfig.colors.background.primary);
    expect(root.style.getPropertyValue('--bg-secondary')).toBe(themeConfig.colors.background.secondary);
    expect(root.style.getPropertyValue('--bg-tertiary')).toBe(themeConfig.colors.background.tertiary);
    expect(root.style.getPropertyValue('--bg-glass')).toBe(themeConfig.colors.background.glass);

    // Verify foreground colors
    expect(root.style.getPropertyValue('--fg-primary')).toBe(themeConfig.colors.foreground.primary);
    expect(root.style.getPropertyValue('--fg-secondary')).toBe(themeConfig.colors.foreground.secondary);
    expect(root.style.getPropertyValue('--fg-tertiary')).toBe(themeConfig.colors.foreground.tertiary);

    // Verify border colors
    expect(root.style.getPropertyValue('--border-primary')).toBe(themeConfig.colors.border.primary);
    expect(root.style.getPropertyValue('--border-secondary')).toBe(themeConfig.colors.border.secondary);
    expect(root.style.getPropertyValue('--border-focus')).toBe(themeConfig.colors.border.focus);

    // Verify interactive colors
    expect(root.style.getPropertyValue('--interactive-primary')).toBe(themeConfig.colors.interactive.primary);
    expect(root.style.getPropertyValue('--interactive-primary-hover')).toBe(themeConfig.colors.interactive.primaryHover);
    expect(root.style.getPropertyValue('--interactive-primary-active')).toBe(themeConfig.colors.interactive.primaryActive);
    expect(root.style.getPropertyValue('--interactive-secondary')).toBe(themeConfig.colors.interactive.secondary);
    expect(root.style.getPropertyValue('--interactive-secondary-hover')).toBe(themeConfig.colors.interactive.secondaryHover);

    // Requirement 2.3: Color, gradient, and shadow variables must be updated
    // Verify gradients
    expect(root.style.getPropertyValue('--gradient-primary')).toBe(themeConfig.gradients.primary);
    expect(root.style.getPropertyValue('--gradient-secondary')).toBe(themeConfig.gradients.secondary);
    expect(root.style.getPropertyValue('--gradient-mesh')).toBe(themeConfig.gradients.mesh);

    // Verify shadows
    expect(root.style.getPropertyValue('--shadow-sm')).toBe(themeConfig.shadows.sm);
    expect(root.style.getPropertyValue('--shadow-md')).toBe(themeConfig.shadows.md);
    expect(root.style.getPropertyValue('--shadow-lg')).toBe(themeConfig.shadows.lg);
    expect(root.style.getPropertyValue('--shadow-glow')).toBe(themeConfig.shadows.glow);

    // Requirement 2.4: Appropriate theme class must be added to root element
    expect(root.classList.contains(themeName)).toBe(true);
    
    // Verify no other theme classes are present
    const allThemes: ThemeVariant[] = ['light', 'dark', 'high-contrast'];
    const otherThemes = allThemes.filter(t => t !== themeName);
    otherThemes.forEach(otherTheme => {
      expect(root.classList.contains(otherTheme)).toBe(false);
    });
  });

  /**
   * Property: When a theme changes, a themeChanged event must be emitted
   */
  test.prop([
    fc.constantFrom<ThemeVariant>('light', 'dark', 'high-contrast')
  ])('emits themeChanged event when theme is applied', (themeName) => {
    // Clear previous events
    themeChangeEvents = [];

    // Apply the theme
    applyTheme(themeName);

    // Requirement 2.7: Theme system must emit a themeChanged event
    expect(themeChangeEvents.length).toBeGreaterThan(0);
    
    const lastEvent = themeChangeEvents[themeChangeEvents.length - 1];
    expect(lastEvent.detail).toBeDefined();
    expect(lastEvent.detail.theme).toBe(themeName);
  });

  /**
   * Property: Switching between any two themes must update all CSS variables
   * and reflect changes immediately
   */
  test.prop([
    fc.constantFrom<ThemeVariant>('light', 'dark', 'high-contrast'),
    fc.constantFrom<ThemeVariant>('light', 'dark', 'high-contrast')
  ])('reflects theme changes immediately when switching themes', (theme1, theme2) => {
    // Apply first theme
    applyTheme(theme1);
    const config1 = getThemeConfigWithFallback(theme1);
    const root = document.documentElement;

    // Verify first theme is applied
    expect(root.style.getPropertyValue('--bg-primary')).toBe(config1.colors.background.primary);
    expect(root.classList.contains(theme1)).toBe(true);

    // Apply second theme
    applyTheme(theme2);
    const config2 = getThemeConfigWithFallback(theme2);

    // Requirement 1.8: When a design token is updated, all components using that token
    // must reflect the change immediately
    // Verify all CSS variables are updated to the new theme
    expect(root.style.getPropertyValue('--bg-primary')).toBe(config2.colors.background.primary);
    expect(root.style.getPropertyValue('--bg-secondary')).toBe(config2.colors.background.secondary);
    expect(root.style.getPropertyValue('--fg-primary')).toBe(config2.colors.foreground.primary);
    expect(root.style.getPropertyValue('--border-primary')).toBe(config2.colors.border.primary);
    expect(root.style.getPropertyValue('--interactive-primary')).toBe(config2.colors.interactive.primary);
    expect(root.style.getPropertyValue('--gradient-primary')).toBe(config2.gradients.primary);
    expect(root.style.getPropertyValue('--shadow-sm')).toBe(config2.shadows.sm);

    // Verify theme class is updated
    expect(root.classList.contains(theme2)).toBe(true);
    if (theme1 !== theme2) {
      expect(root.classList.contains(theme1)).toBe(false);
    }
  });

  /**
   * Property: Multiple rapid theme changes must result in the final theme being applied
   * with all correct CSS variables
   */
  test.prop([
    fc.array(fc.constantFrom<ThemeVariant>('light', 'dark', 'high-contrast'), { minLength: 2, maxLength: 10 })
  ])('handles multiple rapid theme changes correctly', (themeSequence) => {
    // Apply all themes in sequence
    themeSequence.forEach(theme => {
      applyTheme(theme);
    });

    // The final theme should be applied
    const finalTheme = themeSequence[themeSequence.length - 1];
    const finalConfig = getThemeConfigWithFallback(finalTheme);
    const root = document.documentElement;

    // Verify final theme is correctly applied
    expect(root.style.getPropertyValue('--bg-primary')).toBe(finalConfig.colors.background.primary);
    expect(root.style.getPropertyValue('--fg-primary')).toBe(finalConfig.colors.foreground.primary);
    expect(root.classList.contains(finalTheme)).toBe(true);

    // Verify only the final theme class is present
    const allThemes: ThemeVariant[] = ['light', 'dark', 'high-contrast'];
    const otherThemes = allThemes.filter(t => t !== finalTheme);
    otherThemes.forEach(otherTheme => {
      expect(root.classList.contains(otherTheme)).toBe(false);
    });
  });

  /**
   * Property: All CSS variables must be valid CSS values after theme application
   */
  test.prop([
    fc.constantFrom<ThemeVariant>('light', 'dark', 'high-contrast')
  ])('applies valid CSS values for all variables', (themeName) => {
    applyTheme(themeName);
    const root = document.documentElement;

    // Get all CSS variables
    const cssVariables = [
      '--bg-primary', '--bg-secondary', '--bg-tertiary', '--bg-glass',
      '--fg-primary', '--fg-secondary', '--fg-tertiary',
      '--border-primary', '--border-secondary', '--border-focus',
      '--interactive-primary', '--interactive-primary-hover', '--interactive-primary-active',
      '--interactive-secondary', '--interactive-secondary-hover',
      '--gradient-primary', '--gradient-secondary', '--gradient-mesh',
      '--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-glow'
    ];

    // Verify all variables are set and non-empty
    cssVariables.forEach(varName => {
      const value = root.style.getPropertyValue(varName);
      expect(value).toBeTruthy();
      expect(value.length).toBeGreaterThan(0);
    });
  });
});
