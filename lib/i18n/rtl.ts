/**
 * RTL (Right-to-Left) Language Support Utilities
 * 
 * This file provides utilities for supporting RTL languages in the application.
 * It includes helpers for conditional styling, layout adjustments, and text direction.
 * 
 * Requirements: 56.4
 */

import { getTextDirection, getUserLocale } from './formatting';

/**
 * RTL-aware CSS class helper
 * Returns different class names based on text direction
 * 
 * @param ltrClass - Class name for LTR layout
 * @param rtlClass - Class name for RTL layout
 * @param locale - Locale to check (defaults to user locale)
 * @returns Appropriate class name based on text direction
 * 
 * @example
 * <div className={rtlClass('ml-4', 'mr-4')}>
 *   // Margin-left in LTR, margin-right in RTL
 * </div>
 */
export function rtlClass(
  ltrClass: string,
  rtlClass: string,
  locale?: string
): string {
  const direction = getTextDirection(locale);
  return direction === 'rtl' ? rtlClass : ltrClass;
}

/**
 * RTL-aware value helper
 * Returns different values based on text direction
 * 
 * @param ltrValue - Value for LTR layout
 * @param rtlValue - Value for RTL layout
 * @param locale - Locale to check (defaults to user locale)
 * @returns Appropriate value based on text direction
 * 
 * @example
 * const padding = rtlValue('0 0 0 16px', '0 16px 0 0');
 */
export function rtlValue<T>(
  ltrValue: T,
  rtlValue: T,
  locale?: string
): T {
  const direction = getTextDirection(locale);
  return direction === 'rtl' ? rtlValue : ltrValue;
}

/**
 * RTL-aware flex direction helper
 * Reverses flex direction for RTL layouts
 * 
 * @param direction - Flex direction ('row' or 'row-reverse')
 * @param locale - Locale to check (defaults to user locale)
 * @returns Appropriate flex direction based on text direction
 * 
 * @example
 * <div style={{ flexDirection: rtlFlexDirection('row') }}>
 */
export function rtlFlexDirection(
  direction: 'row' | 'row-reverse' | 'column' | 'column-reverse',
  locale?: string
): 'row' | 'row-reverse' | 'column' | 'column-reverse' {
  const textDirection = getTextDirection(locale);
  
  if (textDirection === 'ltr') {
    return direction;
  }
  
  // Reverse row directions for RTL
  if (direction === 'row') return 'row-reverse';
  if (direction === 'row-reverse') return 'row';
  
  // Keep column directions unchanged
  return direction;
}

/**
 * RTL-aware text alignment helper
 * Mirrors text alignment for RTL layouts
 * 
 * @param alignment - Text alignment ('left', 'right', 'center', 'justify')
 * @param locale - Locale to check (defaults to user locale)
 * @returns Appropriate text alignment based on text direction
 * 
 * @example
 * <div style={{ textAlign: rtlTextAlign('left') }}>
 */
export function rtlTextAlign(
  alignment: 'left' | 'right' | 'center' | 'justify' | 'start' | 'end',
  locale?: string
): 'left' | 'right' | 'center' | 'justify' | 'start' | 'end' {
  const direction = getTextDirection(locale);
  
  if (direction === 'ltr') {
    return alignment;
  }
  
  // Mirror left/right for RTL
  if (alignment === 'left') return 'right';
  if (alignment === 'right') return 'left';
  
  // Keep other alignments unchanged
  return alignment;
}

/**
 * RTL-aware transform helper
 * Mirrors horizontal transforms for RTL layouts
 * 
 * @param transform - CSS transform value
 * @param locale - Locale to check (defaults to user locale)
 * @returns Appropriate transform based on text direction
 * 
 * @example
 * <div style={{ transform: rtlTransform('translateX(10px)') }}>
 */
export function rtlTransform(
  transform: string,
  locale?: string
): string {
  const direction = getTextDirection(locale);
  
  if (direction === 'ltr') {
    return transform;
  }
  
  // Mirror translateX values for RTL
  return transform.replace(
    /translateX\((-?\d+(?:\.\d+)?)(px|%|em|rem)\)/g,
    (match, value, unit) => {
      const numValue = parseFloat(value);
      return `translateX(${-numValue}${unit})`;
    }
  );
}

/**
 * Get CSS custom properties for RTL support
 * Returns an object with CSS variables that can be used for RTL-aware styling
 * 
 * @param locale - Locale to check (defaults to user locale)
 * @returns Object with CSS custom properties
 * 
 * @example
 * const rtlVars = getRTLCSSVars();
 * <div style={rtlVars}>
 *   // Use var(--text-align-start) in CSS
 * </div>
 */
export function getRTLCSSVars(locale?: string): Record<string, string> {
  const direction = getTextDirection(locale);
  const isRTL = direction === 'rtl';
  
  return {
    '--text-direction': direction,
    '--text-align-start': isRTL ? 'right' : 'left',
    '--text-align-end': isRTL ? 'left' : 'right',
    '--margin-start': isRTL ? 'margin-right' : 'margin-left',
    '--margin-end': isRTL ? 'margin-left' : 'margin-right',
    '--padding-start': isRTL ? 'padding-right' : 'padding-left',
    '--padding-end': isRTL ? 'padding-left' : 'padding-right',
    '--border-start': isRTL ? 'border-right' : 'border-left',
    '--border-end': isRTL ? 'border-left' : 'border-right',
    '--inset-start': isRTL ? 'right' : 'left',
    '--inset-end': isRTL ? 'left' : 'right',
  };
}

/**
 * Apply RTL direction to document
 * Sets the dir attribute on the document root element
 * 
 * @param locale - Locale to use (defaults to user locale)
 * 
 * @example
 * applyRTLDirection(); // Sets dir="rtl" or dir="ltr" on <html>
 */
export function applyRTLDirection(locale?: string): void {
  if (typeof document === 'undefined') return;
  
  const direction = getTextDirection(locale);
  document.documentElement.setAttribute('dir', direction);
  document.documentElement.setAttribute('lang', locale || getUserLocale());
}

/**
 * React hook for RTL support
 * Returns RTL state and helper functions
 * 
 * @returns Object with RTL state and helpers
 * 
 * @example
 * const { isRTL, direction, rtlClass } = useRTL();
 */
export function useRTL(locale?: string) {
  const direction = getTextDirection(locale);
  const isRTLLayout = direction === 'rtl';
  
  return {
    isRTL: isRTLLayout,
    direction,
    rtlClass: (ltr: string, rtl: string) => rtlClass(ltr, rtl, locale),
    rtlValue: <T,>(ltr: T, rtl: T) => rtlValue(ltr, rtl, locale),
    rtlFlexDirection: (dir: 'row' | 'row-reverse' | 'column' | 'column-reverse') =>
      rtlFlexDirection(dir, locale),
    rtlTextAlign: (align: 'left' | 'right' | 'center' | 'justify' | 'start' | 'end') =>
      rtlTextAlign(align, locale),
    rtlTransform: (transform: string) => rtlTransform(transform, locale),
    cssVars: getRTLCSSVars(locale),
  };
}

/**
 * Tailwind CSS RTL utility classes
 * These can be used with Tailwind's arbitrary values
 * 
 * @example
 * <div className={cn('ml-4', isRTL && 'mr-4 ml-0')}>
 */
export const RTL_TAILWIND_CLASSES = {
  // Margin
  'ms-auto': 'ml-auto rtl:mr-auto rtl:ml-0',
  'me-auto': 'mr-auto rtl:ml-auto rtl:mr-0',
  'ms-0': 'ml-0 rtl:mr-0',
  'me-0': 'mr-0 rtl:ml-0',
  'ms-1': 'ml-1 rtl:mr-1 rtl:ml-0',
  'me-1': 'mr-1 rtl:ml-1 rtl:mr-0',
  'ms-2': 'ml-2 rtl:mr-2 rtl:ml-0',
  'me-2': 'mr-2 rtl:ml-2 rtl:mr-0',
  'ms-4': 'ml-4 rtl:mr-4 rtl:ml-0',
  'me-4': 'mr-4 rtl:ml-4 rtl:mr-0',
  
  // Padding
  'ps-0': 'pl-0 rtl:pr-0',
  'pe-0': 'pr-0 rtl:pl-0',
  'ps-1': 'pl-1 rtl:pr-1 rtl:pl-0',
  'pe-1': 'pr-1 rtl:pl-1 rtl:pr-0',
  'ps-2': 'pl-2 rtl:pr-2 rtl:pl-0',
  'pe-2': 'pr-2 rtl:pl-2 rtl:pr-0',
  'ps-4': 'pl-4 rtl:pr-4 rtl:pl-0',
  'pe-4': 'pr-4 rtl:pl-4 rtl:pr-0',
  
  // Text alignment
  'text-start': 'text-left rtl:text-right',
  'text-end': 'text-right rtl:text-left',
  
  // Border
  'border-s': 'border-l rtl:border-r rtl:border-l-0',
  'border-e': 'border-r rtl:border-l rtl:border-r-0',
  
  // Rounded corners
  'rounded-s': 'rounded-l rtl:rounded-r rtl:rounded-l-none',
  'rounded-e': 'rounded-r rtl:rounded-l rtl:rounded-r-none',
} as const;
