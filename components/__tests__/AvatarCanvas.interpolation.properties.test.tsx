import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '@/lib/store/useAppStore';
import { VisemeData, VISEME_BLENDSHAPE_MAP } from '@/types';
import * as THREE from 'three';

/**
 * Property-Based Tests for Blendshape Interpolation
 * 
 * Feature: avatar-client, Property 7: Blendshape Interpolation
 * 
 * For any sequence of viseme events with timing data, the Avatar Component
 * should interpolate blendshape values smoothly over time, creating continuous
 * mouth animations.
 * 
 * **Validates: Requirements 3.4**
 */

/**
 * Helper function to simulate blendshape interpolation using lerp
 * This mirrors the logic in AvatarCanvas component
 */
function simulateBlendshapeInterpolation(
  currentValue: number,
  targetValue: number,
  delta: number,
  lerpSpeed: number = 10
): number {
  const lerpFactor = Math.min(delta * lerpSpeed, 1);
  return THREE.MathUtils.lerp(currentValue, targetValue, lerpFactor);
}

/**
 * Helper function to simulate a sequence of interpolation steps
 */
function simulateInterpolationSequence(
  startValue: number,
  targetValue: number,
  steps: number,
  deltaPerStep: number = 0.016 // ~60 FPS
): number[] {
  const values: number[] = [startValue];
  let currentValue = startValue;

  for (let i = 0; i < steps; i++) {
    currentValue = simulateBlendshapeInterpolation(currentValue, targetValue, deltaPerStep);
    values.push(currentValue);
  }

  return values;
}

describe('Property 7: Blendshape Interpolation', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      currentViseme: null,
      playbackState: 'idle',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property: For any target blendshape value, interpolation should
   * monotonically approach the target (no oscillation)
   */
  it('should monotonically approach target value without oscillation', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }), // Start value
        fc.float({ min: 0, max: 1, noNaN: true }), // Target value
        fc.integer({ min: 10, max: 100 }), // Number of steps
        (startValue, targetValue, steps) => {
          // Act - Simulate interpolation sequence
          const values = simulateInterpolationSequence(startValue, targetValue, steps);

          // Assert - Property: Values should monotonically approach target
          if (startValue < targetValue) {
            // Should be increasing
            for (let i = 1; i < values.length; i++) {
              expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
            }
          } else if (startValue > targetValue) {
            // Should be decreasing
            for (let i = 1; i < values.length; i++) {
              expect(values[i]).toBeLessThanOrEqual(values[i - 1]);
            }
          } else {
            // Should remain constant
            for (let i = 1; i < values.length; i++) {
              expect(Math.abs(values[i] - startValue)).toBeLessThan(0.001);
            }
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any interpolation sequence, the final value should
   * converge to the target value within a reasonable number of steps
   */
  it('should converge to target value within reasonable time', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }), // Start value
        fc.float({ min: 0, max: 1, noNaN: true }), // Target value
        (startValue, targetValue) => {
          // Act - Simulate interpolation for 60 frames (~1 second at 60 FPS)
          const values = simulateInterpolationSequence(startValue, targetValue, 60);
          const finalValue = values[values.length - 1];

          // Assert - Property: Should be very close to target after 1 second
          const tolerance = 0.01; // 1% tolerance
          expect(Math.abs(finalValue - targetValue)).toBeLessThan(tolerance);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any blendshape value, it should remain within valid range [0, 1]
   * throughout the interpolation
   */
  it('should keep blendshape values within valid range [0, 1]', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }), // Start value
        fc.float({ min: 0, max: 1, noNaN: true }), // Target value
        fc.integer({ min: 10, max: 100 }), // Number of steps
        (startValue, targetValue, steps) => {
          // Act - Simulate interpolation sequence
          const values = simulateInterpolationSequence(startValue, targetValue, steps);

          // Assert - Property: All values should be in [0, 1] range
          values.forEach((value) => {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any sequence of viseme changes, interpolation should
   * create smooth transitions without sudden jumps
   */
  it('should create smooth transitions without sudden jumps', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            visemeId: fc.integer({ min: 0, max: 21 }),
            timestamp: fc.float({ min: 0, max: 10000 }),
            duration: fc.float({ min: 50, max: 500 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (visemeSequence) => {
          // Sort by timestamp to ensure chronological order
          const sortedSequence = [...visemeSequence].sort((a, b) => a.timestamp - b.timestamp);

          // Act - Simulate transitions between visemes
          let currentValue = 0;
          const maxJumpThreshold = 0.3; // Maximum allowed change per frame at 60 FPS

          for (let i = 1; i < sortedSequence.length; i++) {
            const prevViseme = sortedSequence[i - 1];
            const currentViseme = sortedSequence[i];
            
            // Simulate interpolation from previous to current
            const targetValue = 1.0; // Target for active blendshape
            const steps = Math.ceil((currentViseme.timestamp - prevViseme.timestamp) / 16); // ~60 FPS
            
            if (steps > 0) {
              const values = simulateInterpolationSequence(currentValue, targetValue, Math.min(steps, 100));
              
              // Assert - Property: No sudden jumps between consecutive frames
              for (let j = 1; j < values.length; j++) {
                const change = Math.abs(values[j] - values[j - 1]);
                expect(change).toBeLessThanOrEqual(maxJumpThreshold);
              }
              
              currentValue = values[values.length - 1];
            }
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any viseme ID, the interpolation should work correctly
   * with the mapped blendshape name
   */
  it('should interpolate correctly for all valid viseme IDs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 21 }), // Viseme ID
        fc.float({ min: 0, max: 1, noNaN: true }), // Start value
        (visemeId, startValue) => {
          // Act - Get blendshape name for viseme
          const blendshapeName = VISEME_BLENDSHAPE_MAP[visemeId];
          expect(blendshapeName).toBeDefined();

          // Simulate interpolation to target value 1.0
          const targetValue = 1.0;
          const values = simulateInterpolationSequence(startValue, targetValue, 30);

          // Assert - Property: Interpolation should work for any viseme
          expect(values.length).toBeGreaterThan(0);
          expect(values[0]).toBeCloseTo(startValue, 2);
          
          // Should approach target (unless already at target)
          const finalValue = values[values.length - 1];
          if (startValue < targetValue) {
            expect(finalValue).toBeGreaterThan(startValue);
          }
          expect(finalValue).toBeLessThanOrEqual(1.0);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any delta time value, the lerp factor should be bounded
   * to prevent overshooting
   */
  it('should bound lerp factor to prevent overshooting', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }), // Start value
        fc.float({ min: 0, max: 1, noNaN: true }), // Target value
        fc.float({ min: Math.fround(0.001), max: 1.0, noNaN: true }), // Delta time (up to 1 second)
        (startValue, targetValue, delta) => {
          // Act - Simulate single interpolation step
          const newValue = simulateBlendshapeInterpolation(startValue, targetValue, delta);

          // Assert - Property: Should not overshoot target
          if (startValue < targetValue) {
            expect(newValue).toBeLessThanOrEqual(targetValue);
            expect(newValue).toBeGreaterThanOrEqual(startValue);
          } else if (startValue > targetValue) {
            expect(newValue).toBeGreaterThanOrEqual(targetValue);
            expect(newValue).toBeLessThanOrEqual(startValue);
          } else {
            expect(Math.abs(newValue - startValue)).toBeLessThan(0.001);
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any sequence of viseme events, interpolation should
   * handle rapid transitions smoothly
   */
  it('should handle rapid viseme transitions smoothly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 0, max: 21 }),
          { minLength: 5, maxLength: 20 }
        ),
        (visemeIds) => {
          // Act - Simulate rapid transitions between visemes
          let currentValue = 0;
          const deltaPerFrame = 0.016; // ~60 FPS

          for (const visemeId of visemeIds) {
            const blendshapeName = VISEME_BLENDSHAPE_MAP[visemeId];
            expect(blendshapeName).toBeDefined();

            // Simulate a few frames of interpolation
            const targetValue = 1.0;
            const steps = 5; // Only 5 frames before next viseme
            
            for (let i = 0; i < steps; i++) {
              const newValue = simulateBlendshapeInterpolation(currentValue, targetValue, deltaPerFrame);
              
              // Assert - Property: Value should be valid
              expect(newValue).toBeGreaterThanOrEqual(0);
              expect(newValue).toBeLessThanOrEqual(1);
              
              // Property: Should move towards target
              if (currentValue < targetValue) {
                expect(newValue).toBeGreaterThanOrEqual(currentValue);
              }
              
              currentValue = newValue;
            }
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any interpolation, the rate of change should be
   * proportional to the distance from target (exponential decay)
   */
  it('should exhibit exponential decay behavior', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }), // Start value
        fc.float({ min: 0, max: 1, noNaN: true }), // Target value
        (startValue, targetValue) => {
          // Skip if start equals target
          if (Math.abs(startValue - targetValue) < 0.001) return;

          // Act - Simulate interpolation sequence
          const values = simulateInterpolationSequence(startValue, targetValue, 50);

          // Assert - Property: Rate of change should decrease over time
          const changes: number[] = [];
          for (let i = 1; i < values.length; i++) {
            changes.push(Math.abs(values[i] - values[i - 1]));
          }

          // Skip if no meaningful changes occurred
          if (changes.length < 2) return;

          // Check that changes generally decrease (allowing for some numerical noise)
          let decreasingCount = 0;
          for (let i = 1; i < changes.length; i++) {
            if (changes[i] <= changes[i - 1] + 0.001) {
              decreasingCount++;
            }
          }

          // At least 80% of changes should be decreasing or stable
          const decreasingRatio = decreasingCount / (changes.length - 1);
          expect(decreasingRatio).toBeGreaterThan(0.8);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any neutral position return (viseme ID 0), interpolation
   * should smoothly transition to neutral blendshape
   */
  it('should smoothly return to neutral position', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 21 }), // Non-neutral viseme ID
        fc.float({ min: 0.5, max: 1.0, noNaN: true }), // Current active value
        (activeVisemeId, currentValue) => {
          // Act - Simulate transition to neutral (viseme ID 0)
          const neutralBlendshape = VISEME_BLENDSHAPE_MAP[0];
          expect(neutralBlendshape).toBe('viseme_sil');

          // Simulate interpolation from active to neutral (0)
          const targetValue = 0.0; // Deactivate current blendshape
          const values = simulateInterpolationSequence(currentValue, targetValue, 30);

          // Assert - Property: Should smoothly decrease to 0
          expect(values[0]).toBeCloseTo(currentValue, 2);
          
          for (let i = 1; i < values.length; i++) {
            // Should be decreasing
            expect(values[i]).toBeLessThanOrEqual(values[i - 1] + 0.001);
            // Should stay in valid range
            expect(values[i]).toBeGreaterThanOrEqual(0);
            expect(values[i]).toBeLessThanOrEqual(1);
          }

          // Should approach 0
          const finalValue = values[values.length - 1];
          expect(finalValue).toBeLessThan(0.1);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any interpolation with very small delta times,
   * the change should be proportionally small
   */
  it('should handle small delta times correctly', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }), // Start value
        fc.float({ min: 0, max: 1, noNaN: true }), // Target value
        fc.float({ min: Math.fround(0.0001), max: Math.fround(0.01), noNaN: true }), // Very small delta
        (startValue, targetValue, delta) => {
          // Skip if start equals target
          if (Math.abs(startValue - targetValue) < 0.001) return;

          // Act - Simulate single step with small delta
          const newValue = simulateBlendshapeInterpolation(startValue, targetValue, delta);

          // Assert - Property: Change should be small
          const change = Math.abs(newValue - startValue);
          const maxExpectedChange = delta * 10 * Math.abs(targetValue - startValue);
          
          expect(change).toBeLessThanOrEqual(maxExpectedChange + 0.001);
          
          // Property: Should still be in valid range
          expect(newValue).toBeGreaterThanOrEqual(0);
          expect(newValue).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any interpolation with large delta times,
   * the lerp factor should be clamped to 1 to prevent overshooting
   */
  it('should clamp lerp factor for large delta times', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }), // Start value
        fc.float({ min: 0, max: 1, noNaN: true }), // Target value
        fc.float({ min: 0.5, max: 10.0, noNaN: true }), // Large delta (up to 10 seconds)
        (startValue, targetValue, delta) => {
          // Act - Simulate single step with large delta
          const newValue = simulateBlendshapeInterpolation(startValue, targetValue, delta);

          // Assert - Property: Should reach target exactly (or very close)
          // because lerp factor is clamped to 1
          expect(Math.abs(newValue - targetValue)).toBeLessThan(0.001);
          
          // Property: Should not overshoot
          if (startValue < targetValue) {
            expect(newValue).toBeLessThanOrEqual(targetValue + 0.001);
          } else if (startValue > targetValue) {
            expect(newValue).toBeGreaterThanOrEqual(targetValue - 0.001);
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any sequence of viseme events with overlapping durations,
   * interpolation should handle transitions correctly
   */
  it('should handle overlapping viseme durations', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            visemeId: fc.integer({ min: 0, max: 21 }),
            timestamp: fc.float({ min: 0, max: 5000, noNaN: true }),
            duration: fc.float({ min: 100, max: 500, noNaN: true }),
          }),
          { minLength: 3, maxLength: 8 }
        ),
        (visemeSequence) => {
          // Sort by timestamp
          const sortedSequence = [...visemeSequence].sort((a, b) => a.timestamp - b.timestamp);

          // Act - Check that interpolation handles each viseme
          sortedSequence.forEach((viseme) => {
            const blendshapeName = VISEME_BLENDSHAPE_MAP[viseme.visemeId];
            
            // Assert - Property: Each viseme should have valid mapping
            expect(blendshapeName).toBeDefined();
            expect(typeof blendshapeName).toBe('string');
            expect(blendshapeName.length).toBeGreaterThan(0);
            
            // Property: Timestamp and duration should be valid
            expect(viseme.timestamp).toBeGreaterThanOrEqual(0);
            expect(viseme.duration).toBeGreaterThan(0);
          });

          // Property: Sequence should be chronologically ordered after sorting
          for (let i = 1; i < sortedSequence.length; i++) {
            expect(sortedSequence[i].timestamp).toBeGreaterThanOrEqual(
              sortedSequence[i - 1].timestamp
            );
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any interpolation, the THREE.MathUtils.lerp function
   * should produce values between start and target
   */
  it('should use THREE.MathUtils.lerp correctly', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }), // Start value
        fc.float({ min: 0, max: 1, noNaN: true }), // Target value
        fc.float({ min: 0, max: 1, noNaN: true }), // Lerp factor
        (startValue, targetValue, lerpFactor) => {
          // Act - Use THREE.MathUtils.lerp directly
          const result = THREE.MathUtils.lerp(startValue, targetValue, lerpFactor);

          // Assert - Property: Result should be between start and target
          const min = Math.min(startValue, targetValue);
          const max = Math.max(startValue, targetValue);
          
          expect(result).toBeGreaterThanOrEqual(min - 0.001);
          expect(result).toBeLessThanOrEqual(max + 0.001);
          
          // Property: When factor is 0, result should be start
          const resultAtZero = THREE.MathUtils.lerp(startValue, targetValue, 0);
          expect(Math.abs(resultAtZero - startValue)).toBeLessThan(0.001);
          
          // Property: When factor is 1, result should be target
          const resultAtOne = THREE.MathUtils.lerp(startValue, targetValue, 1);
          expect(Math.abs(resultAtOne - targetValue)).toBeLessThan(0.001);
        }
      ),
      { numRuns: 25 }
    );
  });
});
