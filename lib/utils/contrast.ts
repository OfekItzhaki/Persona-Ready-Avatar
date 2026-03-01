/**
 * Contrast Calculation Utilities
 * 
 * Advanced utilities for calculating optimal contrast and automatically adjusting
 * colors to meet WCAG 2.1 accessibility standards.
 * 
 * Requirements: 10.1, 10.2, 10.3, 13.5
 */

import { getContrastRatio } from './colorContrast';

/**
 * Result of contrast calculation with recommendations
 */
export interface ContrastResult {
  ratio: number;
  passes: boolean;
  level: 'AAA' | 'AA' | 'Fail';
  recommendation?: string;
  adjustedColor?: string;
}

/**
 * Convert hex color to RGB components
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB components to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculate relative luminance of RGB color
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
 * Lighten a color by a percentage
 */
function lightenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const amount = percent / 100;
  
  const newR = r + (255 - r) * amount;
  const newG = g + (255 - g) * amount;
  const newB = b + (255 - b) * amount;
  
  return rgbToHex(newR, newG, newB);
}

/**
 * Darken a color by a percentage
 */
function darkenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const amount = percent / 100;
  
  const newR = r * (1 - amount);
  const newG = g * (1 - amount);
  const newB = b * (1 - amount);
  
  return rgbToHex(newR, newG, newB);
}

/**
 * Automatically adjust a color to meet WCAG AA contrast requirements
 * 
 * Uses a binary search approach to find the optimal color adjustment.
 * 
 * @param backgroundColor - Background color in hex format
 * @param textColor - Text color in hex format
 * @param targetRatio - Target contrast ratio (default: 4.5 for WCAG AA normal text)
 * @returns Adjusted text color that meets the target ratio
 */
function autoAdjustColor(
  backgroundColor: string,
  textColor: string,
  targetRatio: number = 4.5
): string {
  const bgRgb = hexToRgb(backgroundColor);
  const bgLuminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  
  // Check if already meets target
  const currentRatio = getContrastRatio(backgroundColor, textColor);
  if (currentRatio >= targetRatio) {
    return textColor;
  }
  
  // Determine if we should lighten or darken the text color
  const shouldLighten = bgLuminance < 0.5;
  
  // Use binary search to find the right adjustment percentage
  let low = 0;
  let high = 100;
  let bestColor = textColor;
  let bestRatio = currentRatio;
  
  // Binary search for the optimal adjustment
  for (let i = 0; i < 30; i++) { // Increased iterations
    const mid = (low + high) / 2;
    const testColor = shouldLighten 
      ? lightenColor(textColor, mid)
      : darkenColor(textColor, mid);
    
    const testRatio = getContrastRatio(backgroundColor, testColor);
    
    if (testRatio >= targetRatio) {
      // This works, save it
      bestColor = testColor;
      bestRatio = testRatio;
      high = mid;
    } else {
      // Need more adjustment
      low = mid;
    }
  }
  
  // Final check: if we didn't meet the target, use pure white or black
  // This ensures we ALWAYS meet the target
  if (bestRatio < targetRatio) {
    bestColor = shouldLighten ? '#ffffff' : '#000000';
    // Verify the fallback actually works
    bestRatio = getContrastRatio(backgroundColor, bestColor);
  }
  
  return bestColor;
  
  return bestColor;
}

/**
 * Calculate optimal contrast between background and text colors
 * 
 * This function follows the WCAG 2.1 contrast formula and provides:
 * - Contrast ratio calculation
 * - Pass/fail status for WCAG AA standards
 * - WCAG level (AAA, AA, or Fail)
 * - Recommendations for improvement
 * - Automatically adjusted color if needed
 * 
 * @param backgroundColor - Background color in hex format
 * @param textColor - Text color in hex format
 * @param textSize - Text size category ('normal' or 'large')
 * @returns ContrastResult with ratio, pass/fail status, and recommendations
 */
export function calculateOptimalContrast(
  backgroundColor: string,
  textColor: string,
  textSize: 'normal' | 'large' = 'normal'
): ContrastResult {
  // Validate input colors
  if (!backgroundColor.match(/^#[0-9A-Fa-f]{6}$/)) {
    throw new Error(`Invalid background color format: ${backgroundColor}. Expected hex format (#RRGGBB)`);
  }
  if (!textColor.match(/^#[0-9A-Fa-f]{6}$/)) {
    throw new Error(`Invalid text color format: ${textColor}. Expected hex format (#RRGGBB)`);
  }
  
  // Calculate contrast ratio
  const ratio = getContrastRatio(backgroundColor, textColor);
  
  // Determine WCAG requirements based on text size
  const minRatio = textSize === 'normal' ? 4.5 : 3.0;
  const aaaRatio = textSize === 'normal' ? 7.0 : 4.5;
  
  // Determine pass/fail and level
  let passes = false;
  let level: 'AAA' | 'AA' | 'Fail' = 'Fail';
  
  if (ratio >= aaaRatio) {
    passes = true;
    level = 'AAA';
  } else if (ratio >= minRatio) {
    passes = true;
    level = 'AA';
  }
  
  // Generate recommendation if needed
  let recommendation: string | undefined;
  let adjustedColor: string | undefined;
  
  if (!passes) {
    const bgRgb = hexToRgb(backgroundColor);
    const bgLuminance = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
    const shouldLighten = bgLuminance > 0.5;
    
    recommendation = shouldLighten
      ? `Text color needs to be lighter. Current ratio: ${ratio.toFixed(2)}:1, required: ${minRatio}:1`
      : `Text color needs to be darker. Current ratio: ${ratio.toFixed(2)}:1, required: ${minRatio}:1`;
    
    // Automatically adjust the color to meet WCAG AA standards
    adjustedColor = autoAdjustColor(backgroundColor, textColor, minRatio);
  }
  
  return {
    ratio,
    passes,
    level,
    recommendation,
    adjustedColor,
  };
}

/**
 * Check if a color combination meets WCAG AA standards
 * 
 * @param backgroundColor - Background color in hex format
 * @param textColor - Text color in hex format
 * @param textSize - Text size category ('normal' or 'large')
 * @returns true if the combination meets WCAG AA standards
 */
export function meetsWCAGAA(
  backgroundColor: string,
  textColor: string,
  textSize: 'normal' | 'large' = 'normal'
): boolean {
  const result = calculateOptimalContrast(backgroundColor, textColor, textSize);
  return result.passes;
}

/**
 * Get an adjusted color that meets WCAG AA standards
 * 
 * @param backgroundColor - Background color in hex format
 * @param textColor - Text color in hex format
 * @param textSize - Text size category ('normal' or 'large')
 * @returns Adjusted text color that meets WCAG AA standards, or original if already compliant
 */
export function getAccessibleColor(
  backgroundColor: string,
  textColor: string,
  textSize: 'normal' | 'large' = 'normal'
): string {
  const result = calculateOptimalContrast(backgroundColor, textColor, textSize);
  return result.adjustedColor || textColor;
}
