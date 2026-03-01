/**
 * Property Test: Responsive Layout Functionality
 * 
 * **Validates: Requirements 11.1, 11.3, 11.4**
 * 
 * Property 19: Responsive Layout Functionality
 * For any viewport width from 375px to infinity, the layout must be functional
 * with no horizontal scrolling and readable text.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import {
  getViewportInfo,
  matchesBreakpoint,
  hasHorizontalOverflow,
  validateTextReadability,
  validateViewportFunctionality,
  preventHorizontalScroll,
  onOrientationChange,
  onBreakpointChange,
  getResponsiveValue,
  BREAKPOINTS,
  type Breakpoint,
} from '../responsive';

describe('Property 19: Responsive Layout Functionality', () => {
  let originalInnerWidth: number;
  let originalInnerHeight: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
  });

  afterEach(() => {
    // Restore original window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
  });

  /**
   * Helper to set viewport dimensions for testing
   */
  function setViewportSize(width: number, height: number) {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
  }

  /**
   * Helper to mock element dimensions
   */
  function mockElementDimensions(
    element: HTMLElement,
    clientWidth: number,
    scrollWidth: number
  ) {
    Object.defineProperty(element, 'clientWidth', {
      writable: true,
      configurable: true,
      value: clientWidth,
    });
    Object.defineProperty(element, 'scrollWidth', {
      writable: true,
      configurable: true,
      value: scrollWidth,
    });
  }

  it('should function correctly at all viewport widths from 375px and up', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 375, max: 2560 }), // viewport width
        fc.integer({ min: 600, max: 1440 }), // viewport height
        (width, height) => {
          // Setup: Set viewport size
          setViewportSize(width, height);

          // Test: Get viewport info
          const viewport = getViewportInfo();

          // Verify: Viewport info is correct
          expect(viewport.width).toBe(width);
          expect(viewport.height).toBe(height);
          expect(viewport.width).toBeGreaterThanOrEqual(375);

          // Verify: Device type classification is consistent
          if (width < BREAKPOINTS.md) {
            expect(viewport.isMobile).toBe(true);
            expect(viewport.isTablet).toBe(false);
            expect(viewport.isDesktop).toBe(false);
          } else if (width < BREAKPOINTS.lg) {
            expect(viewport.isMobile).toBe(false);
            expect(viewport.isTablet).toBe(true);
            expect(viewport.isDesktop).toBe(false);
          } else {
            expect(viewport.isMobile).toBe(false);
            expect(viewport.isTablet).toBe(false);
            expect(viewport.isDesktop).toBe(true);
          }

          // Verify: Orientation is correct
          const expectedOrientation = width > height ? 'landscape' : 'portrait';
          expect(viewport.orientation).toBe(expectedOrientation);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly identify breakpoints at all viewport widths', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 375, max: 2560 }), // viewport width
        (width) => {
          // Setup: Set viewport width
          setViewportSize(width, 800);

          // Test: Get viewport info
          const viewport = getViewportInfo();

          // Verify: Breakpoint is correctly identified
          if (width >= BREAKPOINTS['2xl']) {
            expect(viewport.breakpoint).toBe('2xl');
          } else if (width >= BREAKPOINTS.xl) {
            expect(viewport.breakpoint).toBe('xl');
          } else if (width >= BREAKPOINTS.lg) {
            expect(viewport.breakpoint).toBe('lg');
          } else if (width >= BREAKPOINTS.md) {
            expect(viewport.breakpoint).toBe('md');
          } else if (width >= BREAKPOINTS.sm) {
            expect(viewport.breakpoint).toBe('sm');
          } else {
            expect(viewport.breakpoint).toBe('xs');
          }

          // Verify: matchesBreakpoint is consistent
          const breakpoint = viewport.breakpoint;
          expect(matchesBreakpoint(breakpoint, 'min')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should detect horizontal overflow correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 375, max: 1920 }), // viewport width
        fc.integer({ min: 0, max: 500 }),    // extra scroll width
        (viewportWidth, extraWidth) => {
          // Setup: Create container
          const container = document.createElement('div');
          document.body.appendChild(container);

          // Mock dimensions
          const scrollWidth = viewportWidth + extraWidth;
          mockElementDimensions(container, viewportWidth, scrollWidth);

          // Test: Check for horizontal overflow
          const hasOverflow = hasHorizontalOverflow(container);

          // Verify: Overflow detection is correct
          const expectedOverflow = scrollWidth > viewportWidth;
          expect(hasOverflow).toBe(expectedOverflow);

          // Cleanup
          document.body.removeChild(container);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should validate text readability at all viewport sizes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 375, max: 1920 }), // viewport width
        fc.integer({ min: 12, max: 24 }),    // font size
        (viewportWidth, fontSize) => {
          // Setup: Set viewport
          setViewportSize(viewportWidth, 800);

          // Create text element
          const element = document.createElement('p');
          element.textContent = 'Sample text for readability testing';
          document.body.appendChild(element);

          // Mock computed style
          const mockGetComputedStyle = vi.spyOn(window, 'getComputedStyle');
          mockGetComputedStyle.mockReturnValue({
            fontSize: `${fontSize}px`,
            lineHeight: `${fontSize * 1.5}px`,
          } as CSSStyleDeclaration);

          // Mock clientWidth
          Object.defineProperty(element, 'clientWidth', {
            writable: true,
            configurable: true,
            value: viewportWidth * 0.8, // 80% of viewport
          });

          // Test: Validate text readability
          const validation = validateTextReadability(element);

          // Verify: Validation result is consistent
          expect(validation.element).toBe(element);
          expect(validation.fontSize).toBe(fontSize);
          expect(validation.lineHeight).toBeCloseTo(fontSize * 1.5, 1);

          // Verify: Readability rules are applied correctly
          const viewport = getViewportInfo();
          const minFontSize = viewport.isMobile ? 14 : 16;
          
          if (fontSize >= minFontSize) {
            // Font size is acceptable
            expect(validation.issues.some(issue => issue.includes('Font size'))).toBe(false);
          } else {
            // Font size is too small
            expect(validation.issues.some(issue => issue.includes('Font size'))).toBe(true);
          }

          // Cleanup
          mockGetComputedStyle.mockRestore();
          document.body.removeChild(element);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should prevent horizontal scrolling when applied', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 375, max: 1920 }), // viewport width
        () => {
          // Setup: Create container
          const container = document.createElement('div');
          document.body.appendChild(container);

          // Set initial overflow style
          container.style.overflowX = 'auto';
          container.style.maxWidth = 'none';

          // Test: Apply horizontal scroll prevention
          const cleanup = preventHorizontalScroll(container);

          // Verify: Styles are applied
          expect(container.style.overflowX).toBe('hidden');
          expect(container.style.maxWidth).toBe('100vw');

          // Test: Cleanup restores original styles
          cleanup();

          // Verify: Original styles are restored
          expect(container.style.overflowX).toBe('auto');
          expect(container.style.maxWidth).toBe('none');

          // Cleanup
          document.body.removeChild(container);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should validate viewport functionality at minimum width', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 375, max: 2560 }), // viewport width
        (width) => {
          // Setup: Set viewport
          setViewportSize(width, 800);

          // Mock body dimensions (no overflow)
          mockElementDimensions(document.body, width, width);

          // Test: Validate viewport functionality
          const validation = validateViewportFunctionality(375);

          // Verify: Validation is correct
          if (width >= 375) {
            expect(validation.isValid).toBe(true);
            expect(validation.issues.length).toBe(0);
          } else {
            expect(validation.isValid).toBe(false);
            expect(validation.issues.some(issue => issue.includes('below minimum'))).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle orientation changes correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 375, max: 1920 }), // initial width
        fc.integer({ min: 600, max: 1080 }), // initial height
        (initialWidth, initialHeight) => {
          // Setup: Set initial viewport
          setViewportSize(initialWidth, initialHeight);
          const initialOrientation = getViewportInfo().orientation;

          let callbackCalled = false;
          let newOrientation: 'portrait' | 'landscape' | null = null;

          // Test: Setup orientation change handler
          const cleanup = onOrientationChange((orientation) => {
            callbackCalled = true;
            newOrientation = orientation;
          });

          // Simulate orientation change by swapping dimensions
          setViewportSize(initialHeight, initialWidth);
          
          // Trigger resize event
          window.dispatchEvent(new Event('resize'));

          // Verify: Callback is called if orientation changed
          const expectedOrientation = initialHeight > initialWidth ? 'landscape' : 'portrait';
          
          if (expectedOrientation !== initialOrientation) {
            expect(callbackCalled).toBe(true);
            expect(newOrientation).toBe(expectedOrientation);
          }

          // Cleanup
          cleanup();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should handle breakpoint changes correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Breakpoint>('xs', 'sm', 'md', 'lg', 'xl', '2xl'),
        fc.integer({ min: -200, max: 200 }), // offset from breakpoint
        (breakpoint, offset) => {
          // Setup: Set viewport just below breakpoint
          const breakpointValue = BREAKPOINTS[breakpoint];
          const initialWidth = breakpointValue - 50;
          setViewportSize(initialWidth, 800);

          let callbackCalled = false;
          let matchResult: boolean | null = null;

          // Test: Setup breakpoint change handler
          const cleanup = onBreakpointChange(breakpoint, (matches) => {
            callbackCalled = true;
            matchResult = matches;
          }, 'min');

          // Change viewport to cross breakpoint
          const newWidth = breakpointValue + offset;
          setViewportSize(newWidth, 800);

          // Trigger resize event
          window.dispatchEvent(new Event('resize'));

          // Verify: Callback is called if breakpoint was crossed
          const initialMatch = initialWidth >= breakpointValue;
          const newMatch = newWidth >= breakpointValue;

          if (initialMatch !== newMatch) {
            expect(callbackCalled).toBe(true);
            expect(matchResult).toBe(newMatch);
          }

          // Cleanup
          cleanup();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should return correct responsive values based on breakpoint', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 375, max: 2560 }), // viewport width
        (width) => {
          // Setup: Set viewport
          setViewportSize(width, 800);

          // Define responsive values
          const values = {
            xs: 'extra-small',
            sm: 'small',
            md: 'medium',
            lg: 'large',
            xl: 'extra-large',
            '2xl': 'extra-extra-large',
          };

          // Test: Get responsive value
          const value = getResponsiveValue(values);

          // Verify: Correct value is returned
          const viewport = getViewportInfo();
          expect(value).toBe(values[viewport.breakpoint]);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle partial responsive value maps', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 375, max: 2560 }), // viewport width
        (width) => {
          // Setup: Set viewport
          setViewportSize(width, 800);

          // Define partial responsive values (only some breakpoints)
          const values = {
            xs: 'mobile',
            lg: 'desktop',
          };

          // Test: Get responsive value
          const value = getResponsiveValue(values);

          // Verify: Falls back to nearest smaller breakpoint
          const viewport = getViewportInfo();
          if (viewport.breakpoint === 'xs' || viewport.breakpoint === 'sm' || viewport.breakpoint === 'md') {
            expect(value).toBe('mobile');
          } else {
            expect(value).toBe('desktop');
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should maintain consistent breakpoint matching across modes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 375, max: 2560 }), // viewport width
        fc.constantFrom<Breakpoint>('xs', 'sm', 'md', 'lg', 'xl', '2xl'),
        (width, breakpoint) => {
          // Setup: Set viewport
          setViewportSize(width, 800);

          // Test: Check breakpoint matching in different modes
          const matchesMin = matchesBreakpoint(breakpoint, 'min');
          const matchesMax = matchesBreakpoint(breakpoint, 'max');

          // Verify: min and max are mutually exclusive
          expect(matchesMin).not.toBe(matchesMax);

          // Verify: Matches are consistent with viewport width
          const breakpointValue = BREAKPOINTS[breakpoint];
          expect(matchesMin).toBe(width >= breakpointValue);
          expect(matchesMax).toBe(width < breakpointValue);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle edge cases at exact breakpoint values', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Breakpoint>('xs', 'sm', 'md', 'lg', 'xl', '2xl'),
        (breakpoint) => {
          // Setup: Set viewport to exact breakpoint value
          const breakpointValue = BREAKPOINTS[breakpoint];
          setViewportSize(breakpointValue, 800);

          // Test: Check breakpoint matching
          const matchesMin = matchesBreakpoint(breakpoint, 'min');
          const matchesMax = matchesBreakpoint(breakpoint, 'max');

          // Verify: At exact breakpoint, min matches but max doesn't
          expect(matchesMin).toBe(true);
          expect(matchesMax).toBe(false);

          // Verify: Viewport info is correct
          const viewport = getViewportInfo();
          expect(viewport.width).toBe(breakpointValue);
          
          // Breakpoint should be this one or higher
          const breakpointKeys = Object.keys(BREAKPOINTS) as Breakpoint[];
          const currentIndex = breakpointKeys.indexOf(viewport.breakpoint);
          const targetIndex = breakpointKeys.indexOf(breakpoint);
          expect(currentIndex).toBeGreaterThanOrEqual(targetIndex);
        }
      ),
      { numRuns: 30 }
    );
  });
});
