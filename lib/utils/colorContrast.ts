/**
 * Color Contrast Utilities
 * 
 * Utilities for calculating and verifying WCAG color contrast ratios.
 * Used to ensure accessibility compliance (Requirement 37).
 * 
 * WCAG AA Requirements:
 * - Normal text: 4.5:1 minimum contrast ratio
 * - Large text (18pt+ or 14pt+ bold): 3:1 minimum contrast ratio
 * - UI components and graphics: 3:1 minimum contrast ratio
 * 
 * Requirements: 37
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance of a color
 * Formula from WCAG 2.1: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * Formula from WCAG 2.1: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 * 
 * @param color1 - First color (hex format)
 * @param color2 - Second color (hex format)
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    throw new Error('Invalid hex color format');
  }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA for normal text (4.5:1)
 */
export function meetsWCAGAANormalText(color1: string, color2: string): boolean {
  return getContrastRatio(color1, color2) >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AA for large text (3:1)
 */
export function meetsWCAGAALargeText(color1: string, color2: string): boolean {
  return getContrastRatio(color1, color2) >= 3.0;
}

/**
 * Check if contrast ratio meets WCAG AA for UI components (3:1)
 */
export function meetsWCAGAAUIComponents(color1: string, color2: string): boolean {
  return getContrastRatio(color1, color2) >= 3.0;
}

/**
 * Format contrast ratio for display
 */
export function formatContrastRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

/**
 * Get WCAG compliance level for a contrast ratio
 */
export function getWCAGLevel(
  ratio: number,
  textSize: 'normal' | 'large' | 'ui'
): 'AAA' | 'AA' | 'Fail' {
  if (textSize === 'normal') {
    if (ratio >= 7.0) return 'AAA';
    if (ratio >= 4.5) return 'AA';
    return 'Fail';
  } else {
    // Large text and UI components
    if (ratio >= 4.5) return 'AAA';
    if (ratio >= 3.0) return 'AA';
    return 'Fail';
  }
}
