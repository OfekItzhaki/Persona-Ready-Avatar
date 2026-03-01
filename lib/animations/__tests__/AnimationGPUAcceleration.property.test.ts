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
  it('should accept keyframes with only GPU-accelerated properties (transform, opacity)', () => {
    fc.assert(
      fc.property(
        // Generate keyframes with only GPU-accelerated properties
        fc.array(
          fc.record(
            {
              transform: fc.option(
                fc.oneof(
                  fc.string({ minLength: 1, maxLength: 50 }),
                  fc.constant('translateX(0)'),
                  fc.constant('translateY(0)'),
                  fc.constant('scale(1)'),
                  fc.constant('rotate(0deg)')
                ),
                { nil: undefined }
              ),
              opacity: fc.option(fc.double({ min: 0, max: 1 }), {
                nil: undefined,
              }),
            },
            { requiredKeys: [] }
          ),
          { minLength: 1, maxLength: 10 }
        ),
        (keyframes) => {
          // Filter out empty keyframes
          const validKeyframes = keyframes.filter(
            (kf) => Object.keys(kf).length > 0
          );

          if (validKeyframes.length === 0) {
            // If all keyframes are empty, expect error
            expect(() => validateKeyframes(validKeyframes)).toThrow(
              'Keyframes must be a non-empty array'
            );
          } else {
            // Should not throw for GPU-accelerated properties
            expect(() => validateKeyframes(validKeyframes)).not.toThrow();
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('should reject keyframes with layout-triggering properties', () => {
    fc.assert(
      fc.property(
        // Generate at least one layout-triggering property
        fc.constantFrom(...LAYOUT_TRIGGERING_PROPERTIES),
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.integer({ min: 0, max: 1000 })
        ),
        (layoutProperty, value) => {
          const keyframes: AnimationKeyframe[] = [
            { [layoutProperty]: value },
          ];

          expect(() => validateKeyframes(keyframes)).toThrow(
            /Animation uses layout-triggering property/
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject keyframes mixing GPU-accelerated and layout-triggering properties', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...LAYOUT_TRIGGERING_PROPERTIES),
        fc.double({ min: 0, max: 1 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        (layoutProperty, opacity, transform) => {
          const keyframes: AnimationKeyframe[] = [
            {
              opacity,
              transform,
              [layoutProperty]: '100px',
            },
          ];

          expect(() => validateKeyframes(keyframes)).toThrow(
            /Animation uses layout-triggering property/
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept keyframes with transform property variations', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.tuple(
            fc.integer({ min: -1000, max: 1000 }),
            fc.integer({ min: -1000, max: 1000 })
          ).map(([x, y]) => `translate(${x}px, ${y}px)`),
          fc
            .integer({ min: -1000, max: 1000 })
            .map((x) => `translateX(${x}px)`),
          fc
            .integer({ min: -1000, max: 1000 })
            .map((y) => `translateY(${y}px)`),
          fc.double({ min: 0, max: 3 }).map((s) => `scale(${s})`),
          fc
            .tuple(fc.double({ min: 0, max: 3 }), fc.double({ min: 0, max: 3 }))
            .map(([x, y]) => `scale(${x}, ${y})`),
          fc.integer({ min: 0, max: 360 }).map((deg) => `rotate(${deg}deg)`),
          fc
            .tuple(
              fc.integer({ min: -1000, max: 1000 }),
              fc.double({ min: 0, max: 3 }),
              fc.integer({ min: 0, max: 360 })
            )
            .map(
              ([x, s, deg]) =>
                `translateX(${x}px) scale(${s}) rotate(${deg}deg)`
            )
        ),
        (transform) => {
          const keyframes: AnimationKeyframe[] = [
            { transform: 'translate(0, 0)' },
            { transform },
          ];

          expect(() => validateKeyframes(keyframes)).not.toThrow();
        }
      ),
      { numRuns: 200 }
    );
  });

  it('should accept keyframes with opacity property variations', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1 }),
        fc.double({ min: 0, max: 1 }),
        (startOpacity, endOpacity) => {
          const keyframes: AnimationKeyframe[] = [
            { opacity: startOpacity },
            { opacity: endOpacity },
          ];

          expect(() => validateKeyframes(keyframes)).not.toThrow();
        }
      ),
      { numRuns: 200 }
    );
  });

  it('should accept keyframes combining transform and opacity', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1 }),
        fc.integer({ min: -100, max: 100 }),
        fc.double({ min: 0.5, max: 1.5 }),
        (opacity, translateX, scale) => {
          const keyframes: AnimationKeyframe[] = [
            {
              opacity: 0,
              transform: 'translateX(0) scale(1)',
            },
            {
              opacity,
              transform: `translateX(${translateX}px) scale(${scale})`,
            },
          ];

          expect(() => validateKeyframes(keyframes)).not.toThrow();
        }
      ),
      { numRuns: 200 }
    );
  });

  it('should reject empty keyframes array', () => {
    const keyframes: AnimationKeyframe[] = [];

    expect(() => validateKeyframes(keyframes)).toThrow(
      'Keyframes must be a non-empty array'
    );
  });

  it('should reject all common layout-triggering properties individually', () => {
    const layoutProperties = [
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

    for (const property of layoutProperties) {
      const keyframes: AnimationKeyframe[] = [
        { [property]: '0px' },
        { [property]: '100px' },
      ];

      expect(() => validateKeyframes(keyframes)).toThrow(
        new RegExp(`Animation uses layout-triggering property: ${property}`)
      );
    }
  });

  it('should accept multi-step animations with only GPU-accelerated properties', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            opacity: fc.double({ min: 0, max: 1 }),
            transform: fc.oneof(
              fc.constant('translateX(0)'),
              fc.constant('translateX(50px)'),
              fc.constant('scale(1)'),
              fc.constant('scale(1.1)')
            ),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (keyframes) => {
          expect(() => validateKeyframes(keyframes)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate that only transform and opacity are GPU-accelerated', () => {
    // This test ensures our constants are correct
    expect(GPU_ACCELERATED_PROPERTIES).toEqual(['transform', 'opacity']);
    expect(LAYOUT_TRIGGERING_PROPERTIES).toContain('width');
    expect(LAYOUT_TRIGGERING_PROPERTIES).toContain('height');
    expect(LAYOUT_TRIGGERING_PROPERTIES).toContain('top');
    expect(LAYOUT_TRIGGERING_PROPERTIES).toContain('left');
  });
});
