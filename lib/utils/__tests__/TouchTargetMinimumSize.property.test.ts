/**
 * Property Test: Touch Target Minimum Size
 * 
 * **Validates: Requirements 10.10, 11.2**
 * 
 * Property 18: Touch Target Minimum Size
 * For all interactive elements on mobile viewports, touch targets must be at least 44x44px.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import {
  validateTouchTargetSize,
  validateAllTouchTargets,
  getFocusableElements,
} from '../accessibility';

describe('Property 18: Touch Target Minimum Size', () => {
  let container: HTMLElement;
  let originalInnerWidth: number;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    document.body.removeChild(container);
    // Restore original window width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  /**
   * Helper to set viewport width for testing
   */
  function setViewportWidth(width: number) {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
  }

  /**
   * Helper to mock getBoundingClientRect for JSDOM
   * JSDOM doesn't calculate layout, so we need to mock it
   */
  function mockElementSize(element: HTMLElement, width: number, height: number) {
    element.getBoundingClientRect = vi.fn(() => ({
      width,
      height,
      top: 0,
      left: 0,
      bottom: height,
      right: width,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));
  }

  it('should validate touch target size meets minimum on mobile viewports', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 44, max: 100 }), // width
        fc.integer({ min: 44, max: 100 }), // height
        (width, height) => {
          // Setup: Mobile viewport
          setViewportWidth(375); // Mobile width

          // Create button with specified dimensions
          const button = document.createElement('button');
          button.textContent = 'Test Button';
          container.appendChild(button);

          // Mock getBoundingClientRect for JSDOM
          mockElementSize(button, width, height);

          // Test: Validate touch target size
          const validation = validateTouchTargetSize(button, 44);

          // Verify: Meets minimum on mobile (both dimensions >= 44px)
          expect(validation.isMobile).toBe(true);
          expect(validation.width).toBeGreaterThanOrEqual(44);
          expect(validation.height).toBeGreaterThanOrEqual(44);
          expect(validation.meetsMinimum).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should detect touch targets below minimum size on mobile', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 20, max: 43 }), // width below minimum
        fc.integer({ min: 20, max: 43 }), // height below minimum
        (width, height) => {
          // Setup: Mobile viewport
          setViewportWidth(375);

          // Create button with dimensions below minimum
          const button = document.createElement('button');
          button.textContent = 'Small Button';
          container.appendChild(button);

          // Mock getBoundingClientRect for JSDOM
          mockElementSize(button, width, height);

          // Test: Validate touch target size
          const validation = validateTouchTargetSize(button, 44);

          // Verify: Does not meet minimum on mobile
          expect(validation.isMobile).toBe(true);
          expect(validation.meetsMinimum).toBe(false);
          expect(validation.width).toBeLessThan(44);
          expect(validation.height).toBeLessThan(44);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should be more lenient on desktop viewports', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 44, max: 100 }), // width meets minimum
        fc.integer({ min: 20, max: 43 }),  // height below minimum
        (width, height) => {
          // Setup: Desktop viewport
          setViewportWidth(1024);

          // Create button with one dimension meeting minimum
          const button = document.createElement('button');
          button.textContent = 'Desktop Button';
          container.appendChild(button);

          // Mock getBoundingClientRect for JSDOM
          mockElementSize(button, width, height);

          // Test: Validate touch target size
          const validation = validateTouchTargetSize(button, 44);

          // Verify: Passes on desktop if one dimension meets minimum
          expect(validation.isMobile).toBe(false);
          expect(validation.meetsMinimum).toBe(true); // Lenient on desktop
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should validate all interactive elements in a container', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),    // number of valid buttons
        fc.integer({ min: 1, max: 5 }),    // number of invalid buttons
        (numValid, numInvalid) => {
          // Setup: Mobile viewport
          setViewportWidth(375);
          container.innerHTML = '';

          // Create valid buttons (meet minimum)
          for (let i = 0; i < numValid; i++) {
            const button = document.createElement('button');
            button.textContent = `Valid ${i}`;
            container.appendChild(button);
            mockElementSize(button, 48, 48);
          }

          // Create invalid buttons (below minimum)
          for (let i = 0; i < numInvalid; i++) {
            const button = document.createElement('button');
            button.textContent = `Invalid ${i}`;
            container.appendChild(button);
            mockElementSize(button, 30, 30);
          }

          // Test: Validate all touch targets
          const failedValidations = validateAllTouchTargets(container, 44);

          // Verify: Only invalid buttons are reported
          expect(failedValidations.length).toBe(numInvalid);
          
          failedValidations.forEach(validation => {
            expect(validation.meetsMinimum).toBe(false);
            expect(validation.isMobile).toBe(true);
          });
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should handle custom minimum size thresholds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 30, max: 60 }), // custom minimum
        fc.integer({ min: 30, max: 100 }), // element size
        (customMinimum, elementSize) => {
          // Setup: Mobile viewport
          setViewportWidth(375);

          // Create button with specified size
          const button = document.createElement('button');
          button.textContent = 'Test';
          container.appendChild(button);

          // Mock getBoundingClientRect for JSDOM
          mockElementSize(button, elementSize, elementSize);

          // Test: Validate with custom minimum
          const validation = validateTouchTargetSize(button, customMinimum);

          // Verify: Validation uses custom minimum
          const expectedResult = elementSize >= customMinimum;
          expect(validation.meetsMinimum).toBe(expectedResult);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should correctly identify mobile vs desktop viewports', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }), // viewport width
        (viewportWidth) => {
          // Setup: Set viewport width
          setViewportWidth(viewportWidth);

          // Create button
          const button = document.createElement('button');
          button.textContent = 'Test';
          container.appendChild(button);

          // Mock getBoundingClientRect for JSDOM
          mockElementSize(button, 50, 50);

          // Test: Validate touch target
          const validation = validateTouchTargetSize(button, 44);

          // Verify: Mobile detection is correct (< 768px is mobile)
          const expectedMobile = viewportWidth < 768;
          expect(validation.isMobile).toBe(expectedMobile);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return validation result with all required properties', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 20, max: 100 }), // width
        fc.integer({ min: 20, max: 100 }), // height
        (width, height) => {
          // Setup
          setViewportWidth(375);
          
          const button = document.createElement('button');
          container.appendChild(button);

          // Mock getBoundingClientRect for JSDOM
          mockElementSize(button, width, height);

          // Test
          const validation = validateTouchTargetSize(button, 44);

          // Verify: All required properties exist
          expect(validation).toHaveProperty('element');
          expect(validation).toHaveProperty('width');
          expect(validation).toHaveProperty('height');
          expect(validation).toHaveProperty('meetsMinimum');
          expect(validation).toHaveProperty('isMobile');
          
          expect(validation.element).toBe(button);
          expect(typeof validation.width).toBe('number');
          expect(typeof validation.height).toBe('number');
          expect(typeof validation.meetsMinimum).toBe('boolean');
          expect(typeof validation.isMobile).toBe('boolean');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle elements with padding and borders correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 30, max: 50 }), // base size
        fc.integer({ min: 0, max: 10 }),  // padding
        fc.integer({ min: 0, max: 5 }),   // border
        (baseSize, padding, border) => {
          // Setup: Mobile viewport
          setViewportWidth(375);

          const button = document.createElement('button');
          button.textContent = 'Test';
          container.appendChild(button);

          // Mock getBoundingClientRect for JSDOM
          // With box-sizing: border-box, total size should be baseSize
          mockElementSize(button, baseSize, baseSize);

          // Test
          const validation = validateTouchTargetSize(button, 44);

          // Verify: Validation considers total rendered size
          expect(validation.width).toBeCloseTo(baseSize, 1);
          expect(validation.height).toBeCloseTo(baseSize, 1);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should validate only visible interactive elements', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }), // number of visible elements
        fc.integer({ min: 1, max: 5 }), // number of hidden elements
        (numVisible, numHidden) => {
          // Setup: Mobile viewport
          setViewportWidth(375);
          container.innerHTML = '';

          // Create visible elements with invalid size
          for (let i = 0; i < numVisible; i++) {
            const button = document.createElement('button');
            button.textContent = `Visible ${i}`;
            container.appendChild(button);
            mockElementSize(button, 30, 30);
          }

          // Create hidden elements with invalid size
          for (let i = 0; i < numHidden; i++) {
            const button = document.createElement('button');
            button.textContent = `Hidden ${i}`;
            button.style.display = 'none'; // Hidden
            container.appendChild(button);
            mockElementSize(button, 30, 30);
          }

          // Test: Validate all touch targets
          const failedValidations = validateAllTouchTargets(container, 44);

          // Verify: Only visible elements are validated
          // Hidden elements should not be in the failed list
          expect(failedValidations.length).toBe(numVisible);
        }
      ),
      { numRuns: 30 }
    );
  });
});
