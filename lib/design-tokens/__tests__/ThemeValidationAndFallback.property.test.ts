/**
 * Property-Based Test: Theme Validation and Fallback
 * 
 * **Validates: Requirements 2.8, 2.9, 13.1**
 * 
 * Property 3: Theme Validation and Fallback
 * For any theme configuration, if it is invalid, the system must fall back to the
 * default light theme without crashing.
 * 
 * This test validates that:
 * 1. The system validates theme configurations before applying them (Req 2.8)
 * 2. If a theme configuration is invalid, the system falls back to the default light theme (Req 2.9)
 * 3. If theme loading fails, the application falls back to default light theme (Req 13.1)
 */

import { describe, expect, beforeEach, afterEach, vi } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import { validateThemeConfig, isValidCSSColor, isValidCSSGradient, isValidCSSShadow } from '@/lib/design-tokens/validator';
import { getThemeConfigWithFallback, loadThemeConfig } from '@/lib/design-tokens/loader';
import { lightTheme } from '@/lib/design-tokens/themes';
import type { ThemeConfig, ThemeVariant } from '@/lib/design-tokens/types';

describe('Property 3: Theme Validation and Fallback', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on console methods to suppress error/warning output during tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock document.documentElement
    if (typeof document !== 'undefined') {
      document.documentElement.className = '';
      document.documentElement.style.cssText = '';
    }
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    vi.clearAllMocks();
  });

  /**
   * Property: For any invalid theme configuration, validation must return false
   */
  test.prop([
    fc.oneof(
      // Invalid types
      fc.constant(null),
      fc.constant(undefined),
      fc.constant('not an object'),
      fc.constant(123),
      fc.constant(true),
      fc.constant([]),
      // Missing required properties
      fc.constant({}),
      fc.constant({ name: 'test' }),
      fc.constant({ name: 'test', colors: {} }),
      // Invalid color values
      fc.record({
        name: fc.constant('invalid-colors'),
        colors: fc.record({
          background: fc.record({
            primary: fc.constant('not-a-color'),
            secondary: fc.constant('#fff'),
            tertiary: fc.constant('#fff'),
            glass: fc.constant('rgba(255,255,255,0.8)'),
          }),
          foreground: fc.record({
            primary: fc.constant('#000'),
            secondary: fc.constant('#000'),
            tertiary: fc.constant('#000'),
          }),
          border: fc.record({
            primary: fc.constant('#000'),
            secondary: fc.constant('#000'),
            focus: fc.constant('#000'),
          }),
          interactive: fc.record({
            primary: fc.constant('#000'),
            primaryHover: fc.constant('#000'),
            primaryActive: fc.constant('#000'),
            secondary: fc.constant('#000'),
            secondaryHover: fc.constant('#000'),
          }),
        }),
        gradients: fc.record({
          primary: fc.constant('linear-gradient(#fff, #000)'),
          secondary: fc.constant('linear-gradient(#fff, #000)'),
          mesh: fc.constant('none'),
        }),
        shadows: fc.record({
          sm: fc.constant('0 1px 2px rgba(0,0,0,0.1)'),
          md: fc.constant('0 1px 2px rgba(0,0,0,0.1)'),
          lg: fc.constant('0 1px 2px rgba(0,0,0,0.1)'),
          glow: fc.constant('0 0 10px rgba(0,0,0,0.1)'),
        }),
      }),
    )
  ])('rejects invalid theme configurations', (invalidConfig) => {
    // Requirement 2.8: The system must validate theme configurations before applying them
    const isValid = validateThemeConfig(invalidConfig);
    
    expect(isValid).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  /**
   * Property: When loadThemeConfig returns null (theme not found or invalid),
   * getThemeConfigWithFallback must return the light theme without crashing
   */
  test.prop([
    fc.string().filter(s => !['light', 'dark', 'high-contrast'].includes(s))
  ])('falls back to light theme when theme is not found', (invalidThemeName) => {
    // Requirement 2.9: If a theme configuration is invalid, the system must fall back to the default light theme
    // Requirement 13.1: If theme loading fails, the application must fall back to default light theme
    
    // Cast to ThemeVariant to test the fallback behavior
    const fallbackTheme = getThemeConfigWithFallback(invalidThemeName as ThemeVariant);

    // Should return light theme
    expect(fallbackTheme).toBeDefined();
    expect(fallbackTheme.name).toBe('light');
    expect(fallbackTheme).toEqual(lightTheme);

    // Should log an error and a warning
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith('Falling back to light theme');
  });

  /**
   * Property: Valid theme configurations must pass validation
   */
  test.prop([
    fc.constantFrom<ThemeVariant>('light', 'dark', 'high-contrast')
  ])('accepts valid theme configurations', (themeName) => {
    const themeConfig = loadThemeConfig(themeName);
    
    expect(themeConfig).not.toBeNull();
    
    if (themeConfig) {
      const isValid = validateThemeConfig(themeConfig);
      expect(isValid).toBe(true);
    }
  });

  /**
   * Property: Color validation must correctly identify valid and invalid CSS colors
   */
  test.prop([
    fc.oneof(
      // Valid colors
      fc.constantFrom('#fff', '#000000', '#abc', '#123456'),
      fc.constantFrom('rgb(255, 255, 255)', 'rgba(0, 0, 0, 0.5)'),
      fc.constantFrom('hsl(0, 100%, 50%)', 'hsla(120, 50%, 50%, 0.8)'),
      fc.constantFrom('transparent', 'currentColor', 'black', 'white'),
      // Invalid colors
      fc.constantFrom('not-a-color', '#gggggg', 'rgb(300, 300, 300)', ''),
    )
  ])('validates CSS colors correctly', (color) => {
    const isValid = isValidCSSColor(color);
    
    // Check if the color matches valid patterns
    const shouldBeValid = 
      /^#([0-9A-Fa-f]{3}){1,2}$/.test(color) ||
      /^rgba?\([\d\s,./]+\)$/.test(color) ||
      /^hsla?\([\d\s,%./]+\)$/.test(color) ||
      ['transparent', 'currentColor', 'inherit', 'initial', 'unset', 'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta'].includes(color.toLowerCase());
    
    expect(isValid).toBe(shouldBeValid);
  });

  /**
   * Property: Gradient validation must correctly identify valid and invalid CSS gradients
   */
  test.prop([
    fc.oneof(
      // Valid gradients
      fc.constantFrom(
        'linear-gradient(to right, #fff, #000)',
        'radial-gradient(circle, #fff, #000)',
        'conic-gradient(#fff, #000)',
        'none'
      ),
      // Invalid gradients
      fc.constantFrom(
        'not-a-gradient',
        'gradient(#fff, #000)',
        '',
      ),
    )
  ])('validates CSS gradients correctly', (gradient) => {
    const isValid = isValidCSSGradient(gradient);
    
    const shouldBeValid = 
      gradient === 'none' ||
      /^linear-gradient\(.+\)$/.test(gradient) ||
      /^radial-gradient\(.+\)$/.test(gradient) ||
      /^conic-gradient\(.+\)$/.test(gradient);
    
    expect(isValid).toBe(shouldBeValid);
  });

  /**
   * Property: Shadow validation must correctly identify valid and invalid CSS shadows
   */
  test.prop([
    fc.oneof(
      // Valid shadows
      fc.constantFrom(
        '0 1px 2px rgba(0,0,0,0.1)',
        '0 0 10px #000',
        'none',
        '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      ),
      // Invalid shadows
      fc.constantFrom(
        'not-a-shadow',
        '',
      ),
    )
  ])('validates CSS shadows correctly', (shadow) => {
    const isValid = isValidCSSShadow(shadow);
    
    const shouldBeValid = 
      shadow === 'none' ||
      /[\d.]+px/.test(shadow) ||
      /rgba?\(/.test(shadow);
    
    expect(isValid).toBe(shouldBeValid);
  });

  /**
   * Property: Theme configuration with missing properties must fail validation
   */
  test.prop([
    fc.record({
      name: fc.string(),
      // Missing colors, gradients, or shadows
    })
  ])('rejects theme configurations with missing required properties', (incompleteConfig) => {
    const isValid = validateThemeConfig(incompleteConfig);
    
    expect(isValid).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  /**
   * Property: Theme configuration with incomplete color structure must fail validation
   */
  test.prop([
    fc.record({
      name: fc.constant('incomplete'),
      colors: fc.record({
        background: fc.record({
          primary: fc.constant('#fff'),
          // Missing secondary, tertiary, glass
        }),
        foreground: fc.record({
          primary: fc.constant('#000'),
          secondary: fc.constant('#000'),
          tertiary: fc.constant('#000'),
        }),
        border: fc.record({
          primary: fc.constant('#000'),
          secondary: fc.constant('#000'),
          focus: fc.constant('#000'),
        }),
        interactive: fc.record({
          primary: fc.constant('#000'),
          primaryHover: fc.constant('#000'),
          primaryActive: fc.constant('#000'),
          secondary: fc.constant('#000'),
          secondaryHover: fc.constant('#000'),
        }),
      }),
      gradients: fc.record({
        primary: fc.constant('linear-gradient(#fff, #000)'),
        secondary: fc.constant('linear-gradient(#fff, #000)'),
        mesh: fc.constant('none'),
      }),
      shadows: fc.record({
        sm: fc.constant('0 1px 2px rgba(0,0,0,0.1)'),
        md: fc.constant('0 1px 2px rgba(0,0,0,0.1)'),
        lg: fc.constant('0 1px 2px rgba(0,0,0,0.1)'),
        glow: fc.constant('0 0 10px rgba(0,0,0,0.1)'),
      }),
    })
  ])('rejects theme configurations with incomplete color structure', (incompleteConfig) => {
    const isValid = validateThemeConfig(incompleteConfig);
    
    expect(isValid).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  /**
   * Property: Fallback theme must always be valid and usable
   */
  test.prop([
    fc.constantFrom<ThemeVariant>('light', 'dark', 'high-contrast')
  ])('ensures fallback theme is always valid', (themeName) => {
    const fallbackTheme = getThemeConfigWithFallback(themeName);
    
    // Fallback theme must be valid
    expect(validateThemeConfig(fallbackTheme)).toBe(true);
    
    // Fallback theme must have all required properties
    expect(fallbackTheme.name).toBeDefined();
    expect(fallbackTheme.colors).toBeDefined();
    expect(fallbackTheme.colors.background).toBeDefined();
    expect(fallbackTheme.colors.foreground).toBeDefined();
    expect(fallbackTheme.colors.border).toBeDefined();
    expect(fallbackTheme.colors.interactive).toBeDefined();
    expect(fallbackTheme.gradients).toBeDefined();
    expect(fallbackTheme.shadows).toBeDefined();
  });

  /**
   * Property: System must not crash when given arbitrary invalid input
   */
  test.prop([
    fc.anything()
  ])('handles arbitrary invalid input without crashing', (arbitraryInput) => {
    // Should not throw
    expect(() => {
      validateThemeConfig(arbitraryInput);
    }).not.toThrow();
    
    // Should return false for invalid input
    const isValid = validateThemeConfig(arbitraryInput);
    expect(typeof isValid).toBe('boolean');
  });

  /**
   * Property: getThemeConfigWithFallback must never return null
   */
  test.prop([
    fc.constantFrom<ThemeVariant>('light', 'dark', 'high-contrast')
  ])('never returns null from getThemeConfigWithFallback', (themeName) => {
    const result = getThemeConfigWithFallback(themeName);
    
    expect(result).not.toBeNull();
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  /**
   * Property: Empty or whitespace theme name must result in fallback
   */
  test.prop([
    fc.record({
      name: fc.constantFrom('', '   ', '\t', '\n'),
      colors: fc.record({
        background: fc.record({
          primary: fc.constant('#fff'),
          secondary: fc.constant('#fff'),
          tertiary: fc.constant('#fff'),
          glass: fc.constant('rgba(255,255,255,0.8)'),
        }),
        foreground: fc.record({
          primary: fc.constant('#000'),
          secondary: fc.constant('#000'),
          tertiary: fc.constant('#000'),
        }),
        border: fc.record({
          primary: fc.constant('#000'),
          secondary: fc.constant('#000'),
          focus: fc.constant('#000'),
        }),
        interactive: fc.record({
          primary: fc.constant('#000'),
          primaryHover: fc.constant('#000'),
          primaryActive: fc.constant('#000'),
          secondary: fc.constant('#000'),
          secondaryHover: fc.constant('#000'),
        }),
      }),
      gradients: fc.record({
        primary: fc.constant('linear-gradient(#fff, #000)'),
        secondary: fc.constant('linear-gradient(#fff, #000)'),
        mesh: fc.constant('none'),
      }),
      shadows: fc.record({
        sm: fc.constant('0 1px 2px rgba(0,0,0,0.1)'),
        md: fc.constant('0 1px 2px rgba(0,0,0,0.1)'),
        lg: fc.constant('0 1px 2px rgba(0,0,0,0.1)'),
        glow: fc.constant('0 0 10px rgba(0,0,0,0.1)'),
      }),
    })
  ])('rejects theme configurations with empty or whitespace names', (configWithEmptyName) => {
    const isValid = validateThemeConfig(configWithEmptyName);
    
    expect(isValid).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Theme config must have a valid name');
  });
});
