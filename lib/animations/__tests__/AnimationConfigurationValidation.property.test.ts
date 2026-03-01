/**
 * Property Test: Animation Configuration Validation
 * 
 * **Validates: Requirements 5.6, 5.7**
 * 
 * Property: For any animation configuration, the system must validate it before
 * applying, and throw an error for invalid configurations.
 */

import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { validateAnimationConfig } from '../validator';
import type { AnimationConfig } from '../types';

describe('Property 5: Animation Configuration Validation', () => {
  it('should accept all valid animation configurations', () => {
    fc.assert(
      fc.property(
        // Generate valid animation configurations
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          duration: fc.integer({ min: 1, max: 10000 }),
          easing: fc.constantFrom(
            'linear',
            'ease',
            'ease-in',
            'ease-out',
            'ease-in-out',
            'cubic-bezier(0.4, 0.0, 0.2, 1)',
            'cubic-bezier(0.34, 1.56, 0.64, 1)'
          ),
          delay: fc.option(fc.integer({ min: 0, max: 5000 }), {
            nil: undefined,
          }),
          iterations: fc.option(
            fc.oneof(
              fc.integer({ min: 1, max: 100 }),
              fc.constant('infinite' as const)
            ),
            { nil: undefined }
          ),
          fillMode: fc.option(
            fc.constantFrom(
              'none' as const,
              'forwards' as const,
              'backwards' as const,
              'both' as const
            ),
            { nil: undefined }
          ),
        }),
        (config) => {
          // Should not throw for valid configurations
          expect(() => validateAnimationConfig(config)).not.toThrow();
        }
      ),
      { numRuns: 200 }
    );
  });

  it('should reject configurations with invalid duration', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.oneof(
          fc.integer({ max: 0 }), // Zero or negative
          fc.constant(NaN)
        ),
        fc.constantFrom('ease', 'linear', 'ease-in-out'), // Valid easing
        (name, invalidDuration, easing) => {
          const config: AnimationConfig = {
            name,
            duration: invalidDuration,
            easing,
          };

          expect(() => validateAnimationConfig(config)).toThrow(
            /Invalid animation duration/
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject configurations with invalid easing', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.integer({ min: 1, max: 1000 }),
        fc.constantFrom('', '   ', '\t', '\n'), // Empty or whitespace
        (name, duration, invalidEasing) => {
          const config: AnimationConfig = {
            name,
            duration,
            easing: invalidEasing,
          };

          expect(() => validateAnimationConfig(config)).toThrow(
            /Invalid animation easing/
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should reject configurations with negative delay', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.integer({ min: 1, max: 1000 }),
        fc.constantFrom('ease', 'linear', 'ease-in-out'), // Valid easing
        fc.integer({ max: -1 }), // Negative delay
        (name, duration, easing, invalidDelay) => {
          const config: AnimationConfig = {
            name,
            duration,
            easing,
            delay: invalidDelay,
          };

          expect(() => validateAnimationConfig(config)).toThrow(
            /Invalid animation delay/
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject configurations with invalid iterations', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.integer({ min: 1, max: 1000 }),
        fc.constantFrom('ease', 'linear', 'ease-in-out'),
        fc.integer({ max: 0 }), // Zero or negative iterations
        (name, duration, easing, invalidIterations) => {
          const config: AnimationConfig = {
            name,
            duration,
            easing,
            iterations: invalidIterations,
          };

          expect(() => validateAnimationConfig(config)).toThrow(
            /Invalid animation iterations/
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject configurations with invalid fillMode', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.integer({ min: 1, max: 1000 }),
        fc.constantFrom('ease', 'linear', 'ease-in-out'),
        fc.string({ minLength: 1 }).filter(
          (s) => !['none', 'forwards', 'backwards', 'both'].includes(s)
        ),
        (name, duration, easing, invalidFillMode) => {
          const config: AnimationConfig = {
            name,
            duration,
            easing,
            fillMode: invalidFillMode as any,
          };

          expect(() => validateAnimationConfig(config)).toThrow(
            /Invalid animation fillMode/
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept configurations with all optional fields set to valid values', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.integer({ min: 1, max: 1000 }),
        fc.constantFrom('ease', 'linear', 'ease-in-out'),
        fc.integer({ min: 0, max: 1000 }),
        fc.oneof(fc.integer({ min: 1, max: 100 }), fc.constant('infinite')),
        fc.constantFrom('none', 'forwards', 'backwards', 'both'),
        (name, duration, easing, delay, iterations, fillMode) => {
          const config: AnimationConfig = {
            name,
            duration,
            easing,
            delay,
            iterations: iterations as number | 'infinite',
            fillMode: fillMode as 'none' | 'forwards' | 'backwards' | 'both',
          };

          expect(() => validateAnimationConfig(config)).not.toThrow();
        }
      ),
      { numRuns: 200 }
    );
  });

  it('should validate that infinite iterations is accepted', () => {
    const config: AnimationConfig = {
      name: 'pulse',
      duration: 1000,
      easing: 'ease-in-out',
      iterations: 'infinite',
    };

    expect(() => validateAnimationConfig(config)).not.toThrow();
  });

  it('should validate minimum valid configuration (only required fields)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.integer({ min: 1, max: 10000 }),
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        (name, duration, easing) => {
          const config: AnimationConfig = {
            name,
            duration,
            easing,
          };

          expect(() => validateAnimationConfig(config)).not.toThrow();
        }
      ),
      { numRuns: 200 }
    );
  });
});
