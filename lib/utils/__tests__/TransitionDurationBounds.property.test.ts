/**
 * Property Test: Transition Duration Bounds
 * 
 * **Validates: Requirements 16.1, 16.2, 16.3**
 * 
 * For all state transitions, the duration must be between 100ms and 500ms
 * with natural easing (no linear easing).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import {
  validateTransitionDuration,
  validateEasingFunction,
  validateTransitionConfig,
  transitionBetweenStates,
  coordinateTransitions,
  transitionProperty,
  getRecommendedDuration,
  getRecommendedEasing,
  createTransitionConfig,
  NATURAL_EASING_FUNCTIONS,
  prefersReducedMotion,
} from '../transitions';

describe('Property: Transition Duration Bounds', () => {
  let testElement: HTMLElement;

  beforeEach(() => {
    testElement = document.createElement('div');
    testElement.style.opacity = '1';
    testElement.style.transform = 'translateX(0)';
    document.body.appendChild(testElement);
  });

  afterEach(() => {
    if (testElement && testElement.parentNode) {
      testElement.parentNode.removeChild(testElement);
    }
  });

  it('should accept durations between 100ms and 500ms', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 500 }),
        (duration) => {
          const isValid = validateTransitionDuration(duration);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject durations below 100ms', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        (duration) => {
          const isValid = validateTransitionDuration(duration);
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should reject durations above 500ms', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 501, max: 10000 }),
        (duration) => {
          const isValid = validateTransitionDuration(duration);
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should reject linear easing', () => {
    fc.assert(
      fc.property(
        fc.constant('linear'),
        (easing) => {
          const isValid = validateEasingFunction(easing);
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should accept all natural easing functions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...NATURAL_EASING_FUNCTIONS),
        (easing) => {
          const isValid = validateEasingFunction(easing);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should reject linear cubic-bezier', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('cubic-bezier(0, 0, 1, 1)', 'cubic-bezier(0,0,1,1)'),
        (easing) => {
          const isValid = validateEasingFunction(easing);
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should accept non-linear cubic-bezier functions', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: -2, max: 2, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: -2, max: 2, noNaN: true })
        ).filter(([p1, p2, p3, p4]) => {
          // Filter out linear bezier (0,0,1,1)
          return !(p1 === 0 && p2 === 0 && p3 === 1 && p4 === 1);
        }),
        ([p1, p2, p3, p4]) => {
          const easing = `cubic-bezier(${p1}, ${p2}, ${p3}, ${p4})`;
          const isValid = validateEasingFunction(easing);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should validate complete transition config with valid parameters', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 500 }),
        fc.constantFrom(...NATURAL_EASING_FUNCTIONS),
        fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
        (duration, easing, delay) => {
          const result = validateTransitionConfig({ duration, easing, delay });
          expect(result.success).toBe(true);
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject transition config with invalid duration', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: 0, max: 99 }),
          fc.integer({ min: 501, max: 10000 })
        ),
        fc.constantFrom(...NATURAL_EASING_FUNCTIONS),
        (duration, easing) => {
          const result = validateTransitionConfig({ duration, easing });
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('Duration must be between');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should reject transition config with linear easing', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 500 }),
        fc.constant('linear'),
        (duration, easing) => {
          const result = validateTransitionConfig({ duration, easing });
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('natural function');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should reject transition config with negative delay', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 500 }),
        fc.constantFrom(...NATURAL_EASING_FUNCTIONS),
        fc.integer({ min: -1000, max: -1 }),
        (duration, easing, delay) => {
          const result = validateTransitionConfig({ duration, easing, delay });
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('non-negative');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should successfully transition between states with valid config', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 500 }),
        fc.constantFrom(...NATURAL_EASING_FUNCTIONS),
        async (duration, easing) => {
          const fromState = { opacity: '1', transform: 'translateX(0px)' };
          const toState = { opacity: '0.5', transform: 'translateX(100px)' };

          // Should not throw
          await transitionBetweenStates(testElement, fromState, toState, duration, easing);

          // Element should have final state
          expect(testElement.style.opacity).toBe('0.5');
          expect(testElement.style.transform).toBe('translateX(100px)');
        }
      ),
      { numRuns: 10 } // Fewer runs for async tests
    );
  });

  it('should throw error for invalid duration in transitionBetweenStates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.integer({ min: 0, max: 99 }),
          fc.integer({ min: 501, max: 1000 })
        ),
        fc.constantFrom(...NATURAL_EASING_FUNCTIONS),
        async (duration, easing) => {
          const fromState = { opacity: '1' };
          const toState = { opacity: '0.5' };

          await expect(
            transitionBetweenStates(testElement, fromState, toState, duration, easing)
          ).rejects.toThrow();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should throw error for linear easing in transitionBetweenStates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 500 }),
        fc.constant('linear'),
        async (duration, easing) => {
          const fromState = { opacity: '1' };
          const toState = { opacity: '0.5' };

          await expect(
            transitionBetweenStates(testElement, fromState, toState, duration, easing)
          ).rejects.toThrow('natural function');
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should coordinate multiple transitions with valid configs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 500 }),
        fc.constantFrom(...NATURAL_EASING_FUNCTIONS),
        async (duration, easing) => {
          const element1 = document.createElement('div');
          const element2 = document.createElement('div');
          document.body.appendChild(element1);
          document.body.appendChild(element2);

          try {
            await coordinateTransitions([
              {
                element: element1,
                fromState: { opacity: '1' },
                toState: { opacity: '0.5' },
                duration,
                easing,
              },
              {
                element: element2,
                fromState: { transform: 'scale(1)' },
                toState: { transform: 'scale(1.2)' },
                duration,
                easing,
              },
            ]);

            // Both elements should have final states
            expect(element1.style.opacity).toBe('0.5');
            expect(element2.style.transform).toBe('scale(1.2)');
          } finally {
            element1.remove();
            element2.remove();
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  it('should recommend durations within valid bounds', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<'simple' | 'moderate' | 'complex'>('simple', 'moderate', 'complex'),
        (complexity) => {
          const duration = getRecommendedDuration(complexity);
          expect(duration).toBeGreaterThanOrEqual(100);
          expect(duration).toBeLessThanOrEqual(500);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should recommend natural easing functions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<'enter' | 'exit' | 'move'>('enter', 'exit', 'move'),
        (type) => {
          const easing = getRecommendedEasing(type);
          expect(validateEasingFunction(easing)).toBe(true);
          expect(easing).not.toBe('linear');
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should create valid transition config', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 500 }),
        fc.constantFrom(...NATURAL_EASING_FUNCTIONS),
        fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
        (duration, easing, delay) => {
          const config = createTransitionConfig(duration, easing, delay);
          expect(config.duration).toBe(duration);
          expect(config.easing).toBe(easing);
          expect(config.delay).toBe(delay);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should throw when creating invalid transition config', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: 0, max: 99 }),
          fc.integer({ min: 501, max: 1000 })
        ),
        fc.constantFrom(...NATURAL_EASING_FUNCTIONS),
        (duration, easing) => {
          expect(() => createTransitionConfig(duration, easing)).toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should transition single property with valid config', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 500 }),
        fc.constantFrom(...NATURAL_EASING_FUNCTIONS),
        fc.float({ min: 0, max: 1, noNaN: true }),
        async (duration, easing, targetOpacity) => {
          await transitionProperty(
            testElement,
            'opacity',
            '1',
            targetOpacity.toString(),
            duration,
            easing
          );

          // Element should have final value
          expect(parseFloat(testElement.style.opacity)).toBeCloseTo(targetOpacity, 2);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should ensure all transitions use natural easing', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 500 }),
        fc.constantFrom(...NATURAL_EASING_FUNCTIONS),
        (duration, easing) => {
          const config = { duration, easing };
          const validation = validateTransitionConfig(config);

          // Valid config must use natural easing
          expect(validation.success).toBe(true);
          expect(easing).not.toBe('linear');
          expect(validateEasingFunction(easing)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should ensure transition duration is always within bounds for any valid config', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 500 }),
        fc.constantFrom(...NATURAL_EASING_FUNCTIONS),
        (duration, easing) => {
          const config = createTransitionConfig(duration, easing);

          // Duration must be within bounds
          expect(config.duration).toBeGreaterThanOrEqual(100);
          expect(config.duration).toBeLessThanOrEqual(500);

          // Validation must pass
          const validation = validateTransitionConfig(config);
          expect(validation.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
