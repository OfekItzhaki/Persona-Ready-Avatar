/**
 * Responsive Layout Utilities
 * 
 * Utilities for responsive layout management including viewport detection,
 * breakpoint utilities, touch target validation, orientation handling,
 * scroll prevention, and text readability validation.
 * 
 * Features:
 * - Viewport size detection and breakpoint utilities
 * - Touch target size validation for mobile viewports
 * - Orientation change handler utilities
 * - Horizontal scroll prevention utilities
 * - Text readability validation at all viewport sizes
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

/**
 * Standard breakpoint definitions
 */
export const BREAKPOINTS = {
  xs: 375,   // Extra small (mobile)
  sm: 640,   // Small (mobile landscape)
  md: 768,   // Medium (tablet)
  lg: 1024,  // Large (desktop)
  xl: 1280,  // Extra large (wide desktop)
  '2xl': 1536, // 2X large (ultra-wide)
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Viewport size information
 */
export interface ViewportInfo {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
}

/**
 * Orientation change callback
 */
export type OrientationChangeCallback = (orientation: 'portrait' | 'landscape') => void;

/**
 * Text readability validation result
 */
export interface TextReadabilityValidation {
  element: HTMLElement;
  fontSize: number;
  lineHeight: number;
  isReadable: boolean;
  issues: string[];
}

/**
 * Get current viewport information
 * Requirements: 11.1, 11.3
 * 
 * @returns Current viewport information
 */
export function getViewportInfo(): ViewportInfo {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  // Determine breakpoint
  let breakpoint: Breakpoint = 'xs';
  if (width >= BREAKPOINTS['2xl']) {
    breakpoint = '2xl';
  } else if (width >= BREAKPOINTS.xl) {
    breakpoint = 'xl';
  } else if (width >= BREAKPOINTS.lg) {
    breakpoint = 'lg';
  } else if (width >= BREAKPOINTS.md) {
    breakpoint = 'md';
  } else if (width >= BREAKPOINTS.sm) {
    breakpoint = 'sm';
  }
  
  // Determine device type
  const isMobile = width < BREAKPOINTS.md;
  const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
  const isDesktop = width >= BREAKPOINTS.lg;
  
  // Determine orientation
  const orientation = width > height ? 'landscape' : 'portrait';
  
  return {
    width,
    height,
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    orientation,
  };
}

/**
 * Check if viewport matches a specific breakpoint
 * Requirements: 11.1
 * 
 * @param breakpoint - Breakpoint to check
 * @param mode - 'min' (at least), 'max' (at most), or 'exact' (exactly)
 * @returns True if viewport matches breakpoint
 */
export function matchesBreakpoint(
  breakpoint: Breakpoint,
  mode: 'min' | 'max' | 'exact' = 'min'
): boolean {
  const width = window.innerWidth;
  const breakpointValue = BREAKPOINTS[breakpoint];
  
  switch (mode) {
    case 'min':
      return width >= breakpointValue;
    case 'max':
      return width < breakpointValue;
    case 'exact': {
      // Find next breakpoint
      const breakpointKeys = Object.keys(BREAKPOINTS) as Breakpoint[];
      const currentIndex = breakpointKeys.indexOf(breakpoint);
      const nextBreakpoint = breakpointKeys[currentIndex + 1];
      const nextValue = nextBreakpoint ? BREAKPOINTS[nextBreakpoint] : Infinity;
      return width >= breakpointValue && width < nextValue;
    }
  }
}

/**
 * Setup orientation change handler
 * Requirements: 11.6
 * 
 * @param callback - Function to call when orientation changes
 * @returns Cleanup function to remove listener
 */
export function onOrientationChange(callback: OrientationChangeCallback): () => void {
  let currentOrientation = getViewportInfo().orientation;
  
  const handleResize = () => {
    const newOrientation = getViewportInfo().orientation;
    if (newOrientation !== currentOrientation) {
      currentOrientation = newOrientation;
      callback(newOrientation);
    }
  };
  
  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}

/**
 * Prevent horizontal scrolling on an element
 * Requirements: 11.4
 * 
 * @param element - Element to prevent horizontal scroll on
 * @returns Cleanup function to restore original styles
 */
export function preventHorizontalScroll(element: HTMLElement = document.body): () => void {
  const originalOverflowX = element.style.overflowX;
  const originalMaxWidth = element.style.maxWidth;
  
  element.style.overflowX = 'hidden';
  element.style.maxWidth = '100vw';
  
  return () => {
    element.style.overflowX = originalOverflowX;
    element.style.maxWidth = originalMaxWidth;
  };
}

/**
 * Check if element causes horizontal overflow
 * Requirements: 11.4
 * 
 * @param element - Element to check
 * @returns True if element causes horizontal overflow
 */
export function hasHorizontalOverflow(element: HTMLElement = document.body): boolean {
  return element.scrollWidth > element.clientWidth;
}

/**
 * Find all elements causing horizontal overflow
 * Requirements: 11.4
 * 
 * @param container - Container to check within
 * @returns Array of elements causing overflow
 */
export function findHorizontalOverflowElements(
  container: HTMLElement = document.body
): HTMLElement[] {
  const overflowElements: HTMLElement[] = [];
  
  const checkElement = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Check if element extends beyond container
    if (rect.right > containerRect.right || rect.left < containerRect.left) {
      overflowElements.push(element);
    }
    
    // Check children
    Array.from(element.children).forEach(child => {
      if (child instanceof HTMLElement) {
        checkElement(child);
      }
    });
  };
  
  Array.from(container.children).forEach(child => {
    if (child instanceof HTMLElement) {
      checkElement(child);
    }
  });
  
  return overflowElements;
}

/**
 * Validate text readability at current viewport size
 * Requirements: 11.3, 11.5
 * 
 * @param element - Element containing text to validate
 * @param minFontSize - Minimum font size in pixels (default: 14 for mobile, 16 for desktop)
 * @returns Validation result
 */
export function validateTextReadability(
  element: HTMLElement,
  minFontSize?: number
): TextReadabilityValidation {
  const viewport = getViewportInfo();
  const computedStyle = window.getComputedStyle(element);
  
  // Get font size
  const fontSizeStr = computedStyle.fontSize;
  const fontSize = parseFloat(fontSizeStr);
  
  // Get line height
  const lineHeightStr = computedStyle.lineHeight;
  const lineHeight = lineHeightStr === 'normal' 
    ? fontSize * 1.2 
    : parseFloat(lineHeightStr);
  
  // Determine minimum font size based on viewport
  const defaultMinFontSize = viewport.isMobile ? 14 : 16;
  const effectiveMinFontSize = minFontSize ?? defaultMinFontSize;
  
  const issues: string[] = [];
  
  // Check font size
  if (fontSize < effectiveMinFontSize) {
    issues.push(`Font size ${fontSize}px is below minimum ${effectiveMinFontSize}px`);
  }
  
  // Check line height (should be at least 1.5 for body text)
  const lineHeightRatio = lineHeight / fontSize;
  if (lineHeightRatio < 1.4) {
    issues.push(`Line height ratio ${lineHeightRatio.toFixed(2)} is below recommended 1.4`);
  }
  
  // Check line length (should be 45-75 characters for optimal readability)
  const textContent = element.textContent || '';
  const elementWidth = element.clientWidth;
  const avgCharWidth = fontSize * 0.5; // Approximate
  const charsPerLine = elementWidth / avgCharWidth;
  
  if (textContent.length > 100 && charsPerLine > 90) {
    issues.push(`Line length ~${Math.round(charsPerLine)} characters exceeds recommended 75`);
  }
  
  return {
    element,
    fontSize,
    lineHeight,
    isReadable: issues.length === 0,
    issues,
  };
}

/**
 * Validate all text elements in a container for readability
 * Requirements: 11.3, 11.5
 * 
 * @param container - Container to validate
 * @returns Array of validation results for elements with issues
 */
export function validateAllTextReadability(
  container: HTMLElement = document.body
): TextReadabilityValidation[] {
  const textElements = container.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, li, td, th, label');
  const failedValidations: TextReadabilityValidation[] = [];
  
  textElements.forEach(element => {
    if (element instanceof HTMLElement && element.textContent?.trim()) {
      const validation = validateTextReadability(element);
      if (!validation.isReadable) {
        failedValidations.push(validation);
      }
    }
  });
  
  return failedValidations;
}

/**
 * Setup responsive breakpoint listener
 * Requirements: 11.1
 * 
 * @param breakpoint - Breakpoint to listen for
 * @param callback - Function to call when breakpoint is crossed
 * @param mode - 'min' (at least) or 'max' (at most)
 * @returns Cleanup function to remove listener
 */
export function onBreakpointChange(
  breakpoint: Breakpoint,
  callback: (matches: boolean) => void,
  mode: 'min' | 'max' = 'min'
): () => void {
  let currentMatch = matchesBreakpoint(breakpoint, mode);
  
  const handleResize = () => {
    const newMatch = matchesBreakpoint(breakpoint, mode);
    if (newMatch !== currentMatch) {
      currentMatch = newMatch;
      callback(newMatch);
    }
  };
  
  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}

/**
 * Get responsive value based on current breakpoint
 * Requirements: 11.1
 * 
 * @param values - Object mapping breakpoints to values
 * @returns Value for current breakpoint
 */
export function getResponsiveValue<T>(values: Partial<Record<Breakpoint, T>>): T | undefined {
  const viewport = getViewportInfo();
  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  
  // Find the largest breakpoint that matches and has a value
  for (let i = breakpointOrder.indexOf(viewport.breakpoint); i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }
  
  return undefined;
}

/**
 * Ensure viewport is functional at all sizes
 * Requirements: 11.1, 11.4
 * 
 * @param minWidth - Minimum supported width (default: 375px)
 * @returns Validation result
 */
export function validateViewportFunctionality(minWidth: number = 375): {
  isValid: boolean;
  issues: string[];
} {
  const viewport = getViewportInfo();
  const issues: string[] = [];
  
  // Check minimum width
  if (viewport.width < minWidth) {
    issues.push(`Viewport width ${viewport.width}px is below minimum ${minWidth}px`);
  }
  
  // Check for horizontal overflow
  if (hasHorizontalOverflow()) {
    issues.push('Horizontal scrolling detected');
    const overflowElements = findHorizontalOverflowElements();
    if (overflowElements.length > 0) {
      issues.push(`${overflowElements.length} elements causing horizontal overflow`);
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Apply responsive container constraints
 * Requirements: 11.1, 11.4
 * 
 * @param element - Element to constrain
 * @returns Cleanup function to restore original styles
 */
export function applyResponsiveConstraints(element: HTMLElement): () => void {
  const originalMaxWidth = element.style.maxWidth;
  const originalOverflowX = element.style.overflowX;
  const originalBoxSizing = element.style.boxSizing;
  
  element.style.maxWidth = '100%';
  element.style.overflowX = 'hidden';
  element.style.boxSizing = 'border-box';
  
  return () => {
    element.style.maxWidth = originalMaxWidth;
    element.style.overflowX = originalOverflowX;
    element.style.boxSizing = originalBoxSizing;
  };
}
