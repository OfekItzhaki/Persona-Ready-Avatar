/**
 * Property Test: Animation GPU Acceleration
 * 
 * **Validates: Requirements 5.2, 5.3**
 * 
 * Property: For all animations in the system, only GPU-accelerated properties
 * (transform, opacity) should be animated, and layout-triggering properties
 * (width, height, top, left) should never be animated.
 */

import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { validateKeyframes } from '../validator';
import type { AnimationKeyframe } from '../types';
import {
  GPU_ACCELERATED_PROPERTIES,
  LAYOUT_TRIGGERING_PROPERTIES,
} from '../types';

describe('Property 4: Animation GPU Acceleration', () => {
  it('should accept keyframes with only GPU-accelerated properties', () => {
    fc.assert(
      fc.property(
        // Generate keyframes with only GPU-accelerated properties
        fc.array(
          fc.record({
            opacity: fc.double({ min: 0, max: 1 }),
            transform: fc.oneof(
              fc.constant('translateX(0)'),
              fc.constant('translateY(0)'),
              fc.constant('scale(1)'),
              fc.constant('rotate(0deg)'),
              fc.nat({ max: 100 }).map((n) => `translateX(${n}px)`),
              fc.nat({ max: 100 }).map((n) => `translateY(${n}px)`),
              fc.double({ min: 0.5, max: 2 }).map((n) => `scale(${n})`),
              fc.integer({ min: 0, max: 360 }).map((n) => `rotate(${n}deg)`)
            ),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (keyframes) => {
          // Should not throw for GPU-accelerated properties
          expect(() => validateKeyframes(keyframes)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept keyframes with only opacity', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            opacity: fc.double({ min: 0, max: 1 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (keyframes) => {
          expect(() => validateKeyframes(keyframes)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept keyframes with only transform', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            transform: fc.oneof(
              fc.nat({ max: 200 }).map((n) => `translateX(${n}px)`),
              fc.nat({ max: 200 }).map((n) => `translateY(${n}px)`),
              fc.double({ min: 0, max: 2 }).map((n) => `scale(${n})`),
              fc.integer({ min: 0, max: 360 }).map((n) => `rotate(${n}deg)`)
            ),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (keyframes) => {
          expect(() => validateKeyframes(keyframes)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject keyframes with layout-triggering properties', () => {
    fc.assert(
      fc.property(
        // Pick a random layout-triggering property
        fc.constantFrom(...LAYOUT_TRIGGERING_PROPERTIES),
        fc.string({ minLength: 1, maxLength: 20 }),
        (property, value) => {
          const keyframes: AnimationKeyframe[] = [
            { [property]: value },
            { [property]: value },
          ];

          // Should throw for layout-triggering properties
          expect(() => validateKeyframes(keyframes)).toThrow(
            /Animation uses layout-triggering property/
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should reject keyframes mixing GPU-accelerated and layout-triggering properties', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...LAYOUT_TRIGGERING_PROPERTIES),
        fc.double({ min: 0, max: 1 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (layoutProp, opacity, layoutValue) => {
          const keyframes: AnimationKeyframe[] = [
            { opacity: 0, [layoutProp]: layoutValue },
            { opacity: 1, [layoutProp]: layoutValue },
          ];

          // Should throw even if GPU-accelerated properties are present
          expect(() => validateKeyframes(keyframes)).toThrow(
            /Animation uses layout-triggering property/
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should validate that GPU_ACCELERATED_PROPERTIES only contains transform and opacity', () => {
    expect(GPU_ACCELERATED_PROPERTIES).toEqual(['transform', 'opacity']);
  });

  it('should validate that LAYOUT_TRIGGERING_PROPERTIES contains common layout properties', () => {
    const expectedProperties = [
      'width',
      'height',
      'top',
      'left',
      'right',
      'bottom',
      'margin',
      'padding',
      'border-width',
    ];

    expectedProperties.forEach((prop) => {
      expect(LAYOUT_TRIGGERING_PROPERTIES).toContain(prop);
    });
  });
});
