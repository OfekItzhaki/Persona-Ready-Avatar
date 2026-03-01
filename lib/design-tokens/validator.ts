/**
 * Theme Configuration Validator
 * 
 * This module provides validation functions for theme configurations
 * to ensure they meet requirements and prevent invalid themes from being applied.
 * 
 * Requirements: 2.8, 2.9
 */

import type { ThemeConfig } from './types';

/**
 * Validates if a string is a valid CSS color value
 */
export function isValidCSSColor(color: string): boolean {
  // Check for hex colors
  if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(color)) {
    return true;
  }
  
  // Check for rgb/rgba
  if (/^rgba?\([\d\s,./]+\)$/.test(color)) {
    return true;
  }
  
  // Check for hsl/hsla
  if (/^hsla?\([\d\s,%./]+\)$/.test(color)) {
    return true;
  }
  
  // Check for named colors (basic set)
  const namedColors = [
    'transparent', 'currentColor', 'inherit', 'initial', 'unset',
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
  ];
  if (namedColors.includes(color.toLowerCase())) {
    return true;
  }
  
  return false;
}

/**
 * Validates if a string is a valid CSS gradient
 */
export function isValidCSSGradient(gradient: string): boolean {
  if (gradient === 'none') {
    return true;
  }
  
  // Check for linear-gradient
  if (/^linear-gradient\(.+\)$/.test(gradient)) {
    return true;
  }
  
  // Check for radial-gradient
  if (/^radial-gradient\(.+\)$/.test(gradient)) {
    return true;
  }
  
  // Check for conic-gradient
  if (/^conic-gradient\(.+\)$/.test(gradient)) {
    return true;
  }
  
  return false;
}

/**
 * Validates if a string is a valid CSS shadow
 */
export function isValidCSSShadow(shadow: string): boolean {
  if (shadow === 'none') {
    return true;
  }
  
  // Basic validation for box-shadow syntax
  // Should contain numbers and color values
  return /[\d.]+px/.test(shadow) || /rgba?\(/.test(shadow);
}

/**
 * Checks if an object has all required properties
 */
function hasRequiredProperties<T extends object>(
  obj: unknown,
  properties: (keyof T)[]
): obj is T {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  return properties.every(prop => prop in obj);
}

/**
 * Validates a theme configuration
 * 
 * @param config - The theme configuration to validate
 * @returns true if valid, false otherwise
 */
export function validateThemeConfig(config: unknown): config is ThemeConfig {
  // Check if config is an object
  if (typeof config !== 'object' || config === null) {
    console.error('Theme config must be an object');
    return false;
  }
  
  const themeConfig = config as Partial<ThemeConfig>;
  
  // Validate name
  if (typeof themeConfig.name !== 'string' || themeConfig.name.trim().length === 0) {
    console.error('Theme config must have a valid name');
    return false;
  }
  
  // Validate colors structure
  if (!hasRequiredProperties<ThemeConfig['colors']>(themeConfig.colors, [
    'background',
    'foreground',
    'border',
    'interactive',
  ])) {
    console.error('Theme config colors structure is invalid');
    return false;
  }
  
  // Validate background colors
  const bgColors = themeConfig.colors.background;
  if (!hasRequiredProperties<ThemeConfig['colors']['background']>(bgColors, [
    'primary',
    'secondary',
    'tertiary',
    'glass',
  ])) {
    console.error('Theme config background colors are incomplete');
    return false;
  }
  
  // Validate all background colors are valid CSS colors
  for (const [key, value] of Object.entries(bgColors)) {
    if (!isValidCSSColor(value)) {
      console.error(`Invalid background color for ${key}: ${value}`);
      return false;
    }
  }
  
  // Validate foreground colors
  const fgColors = themeConfig.colors.foreground;
  if (!hasRequiredProperties<ThemeConfig['colors']['foreground']>(fgColors, [
    'primary',
    'secondary',
    'tertiary',
  ])) {
    console.error('Theme config foreground colors are incomplete');
    return false;
  }
  
  for (const [key, value] of Object.entries(fgColors)) {
    if (!isValidCSSColor(value)) {
      console.error(`Invalid foreground color for ${key}: ${value}`);
      return false;
    }
  }
  
  // Validate border colors
  const borderColors = themeConfig.colors.border;
  if (!hasRequiredProperties<ThemeConfig['colors']['border']>(borderColors, [
    'primary',
    'secondary',
    'focus',
  ])) {
    console.error('Theme config border colors are incomplete');
    return false;
  }
  
  for (const [key, value] of Object.entries(borderColors)) {
    if (!isValidCSSColor(value)) {
      console.error(`Invalid border color for ${key}: ${value}`);
      return false;
    }
  }
  
  // Validate interactive colors
  const interactiveColors = themeConfig.colors.interactive;
  if (!hasRequiredProperties<ThemeConfig['colors']['interactive']>(interactiveColors, [
    'primary',
    'primaryHover',
    'primaryActive',
    'secondary',
    'secondaryHover',
  ])) {
    console.error('Theme config interactive colors are incomplete');
    return false;
  }
  
  for (const [key, value] of Object.entries(interactiveColors)) {
    if (!isValidCSSColor(value)) {
      console.error(`Invalid interactive color for ${key}: ${value}`);
      return false;
    }
  }
  
  // Validate gradients
  if (!hasRequiredProperties<ThemeConfig['gradients']>(themeConfig.gradients, [
    'primary',
    'secondary',
    'mesh',
  ])) {
    console.error('Theme config gradients are incomplete');
    return false;
  }
  
  for (const [key, value] of Object.entries(themeConfig.gradients)) {
    if (!isValidCSSGradient(value)) {
      console.error(`Invalid gradient for ${key}: ${value}`);
      return false;
    }
  }
  
  // Validate shadows
  if (!hasRequiredProperties<ThemeConfig['shadows']>(themeConfig.shadows, [
    'sm',
    'md',
    'lg',
    'glow',
  ])) {
    console.error('Theme config shadows are incomplete');
    return false;
  }
  
  for (const [key, value] of Object.entries(themeConfig.shadows)) {
    if (!isValidCSSShadow(value)) {
      console.error(`Invalid shadow for ${key}: ${value}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Validates and sanitizes a theme configuration
 * Returns the validated config or null if invalid
 */
export function sanitizeThemeConfig(config: unknown): ThemeConfig | null {
  if (!validateThemeConfig(config)) {
    return null;
  }
  
  return config;
}
