/**
 * Property Test: Component Lifecycle Cleanup
 * 
 * **Validates: Requirements 5.9, 19.1, 19.2, 19.3, 19.4**
 * 
 * Property: For any component that unmounts, all active animations, event listeners,
 * timeouts, and intervals must be cancelled and cleaned up.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fc } from '@fast-check/vitest';
import { orchestrateAnimation, cancelAllAnimations, getActiveAnimations } from '../orchestrator';
import type { AnimationConfig, AnimationKeyframe } from '../types';

// Mock Web Animations API
class MockAnimation {
  playState: 'idle' | 'running' | 'paused' | 'finished' = 'running';
  onfinish: (() => void) | null = null;
  oncancel: (() => void) | null = null;
  cancelled = false;

  cancel() {
    this.playState = 'idle';
    this.cancelled = true;
    // Defer callback to next tick to allow promise handlers to be attached
    if (this.oncancel) {
      queueMicrotask(() => {
        if (this.oncancel) {
          this.oncancel();
        }
      });
    }
  }

  finish() {
    this.playState = 'finished';
    if (this.onfinish) {
      this.onfinish();
    }
  }
}

beforeEach(() => {
  if (typeof Element !== 'undefined' && !Element.prototype.animate) {
    Element.prototype.animate = function (_keyframes: any, _options: any) {
      return new MockAnimation() as any;
    };
  }
});

// Mock performance monitor
vi.mock('../performance', () => ({
  getPerformanceMonitor: () => ({
    isPerformanceAcceptable: () => true,
  }),
}));

describe('Property 7: Component Lifecycle Cleanup', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  it('should cancel all active animations when component unmounts', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            opacity: fc.double({ min: 0, max: 1 }),
            duration: fc.integer({ min: 100, max: 500 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (animations) => {
          // Start multiple animations
          const promises: Promise<void>[] = [];
          
          for (const anim of animations) {
            const keyframes: AnimationKeyframe[] = [
              { opacity: 0 },
              { opacity: anim.opacity },
            ];
            const config: AnimationConfig = {
              name: `anim-${anim.opacity}`,
              duration: anim.duration,
              easing: 'ease-out',
            };

            const [promise] = orchestrateAnimation(element, keyframes, config);
            promises.push(promise);
            // Catch rejections to prevent unhandled promise warnings
            promise.catch(() => {});
          }

          // Verify animations are active
          const activeAnimations = getActiveAnimations(element);
          expect(activeAnimations).toBeDefined();
          expect(activeAnimations!.size).toBeGreaterThan(0);

          // Simulate component unmount by cancelling all animations
          cancelAllAnimations(element);

          // Verify all animations are cancelled
          const activeAnimationsAfter = getActiveAnimations(element);
          expect(activeAnimationsAfter).toBeUndefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should cancel animations on different properties when component unmounts', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1 }),
        fc.integer({ min: -100, max: 100 }),
        fc.integer({ min: 100, max: 500 }),
        (opacity, translateX, duration) => {
          // Start animation on opacity
          const keyframes1: AnimationKeyframe[] = [
            { opacity: 0 },
            { opacity },
          ];
          const config1: AnimationConfig = {
            name: 'opacity-anim',
            duration,
            easing: 'ease-out',
          };

          const [promise1] = orchestrateAnimation(element, keyframes1, config1);
          promise1.catch(() => {});

          // Start animation on transform
          const keyframes2: AnimationKeyframe[] = [
            { transform: 'translateX(0)' },
            { transform: `translateX(${translateX}px)` },
          ];
          const config2: AnimationConfig = {
            name: 'transform-anim',
            duration,
            easing: 'ease-out',
          };

          const [promise2] = orchestrateAnimation(element, keyframes2, config2);
          promise2.catch(() => {});

          // Verify both animations are active
          const activeAnimations = getActiveAnimations(element);
          expect(activeAnimations).toBeDefined();
          expect(activeAnimations!.size).toBe(2);
          expect(activeAnimations!.has('opacity')).toBe(true);
          expect(activeAnimations!.has('transform')).toBe(true);

          // Simulate component unmount
          cancelAllAnimations(element);

          // Verify all animations are cancelled
          const activeAnimationsAfter = getActiveAnimations(element);
          expect(activeAnimationsAfter).toBeUndefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle cleanup when no animations are active', () => {
    // This should not throw an error
    expect(() => cancelAllAnimations(element)).not.toThrow();

    // Verify no active animations
    const activeAnimations = getActiveAnimations(element);
    expect(activeAnimations).toBeUndefined();
  });

  it('should clean up animations independently for different elements', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1 }),
        fc.double({ min: 0, max: 1 }),
        fc.integer({ min: 100, max: 500 }),
        (opacity1, opacity2, duration) => {
          const element2 = document.createElement('div');
          document.body.appendChild(element2);

          // Start animation on first element
          const keyframes1: AnimationKeyframe[] = [
            { opacity: 0 },
            { opacity: opacity1 },
          ];
          const config1: AnimationConfig = {
            name: 'anim1',
            duration,
            easing: 'ease-out',
          };

          const [promise1] = orchestrateAnimation(element, keyframes1, config1);
          promise1.catch(() => {});

          // Start animation on second element
          const keyframes2: AnimationKeyframe[] = [
            { opacity: 0 },
            { opacity: opacity2 },
          ];
          const config2: AnimationConfig = {
            name: 'anim2',
            duration,
            easing: 'ease-out',
          };

          const [promise2] = orchestrateAnimation(element2, keyframes2, config2);
          promise2.catch(() => {});

          // Verify both elements have active animations
          expect(getActiveAnimations(element)).toBeDefined();
          expect(getActiveAnimations(element2)).toBeDefined();

          // Cancel animations on first element only
          cancelAllAnimations(element);

          // Verify first element has no active animations
          expect(getActiveAnimations(element)).toBeUndefined();

          // Verify second element still has active animations
          expect(getActiveAnimations(element2)).toBeDefined();

          // Cleanup
          cancelAllAnimations(element2);
          document.body.removeChild(element2);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should cancel animations immediately without waiting for completion', () => {
    const keyframes: AnimationKeyframe[] = [
      { opacity: 0 },
      { opacity: 1 },
    ];
    const config: AnimationConfig = {
      name: 'long-anim',
      duration: 10000, // Very long duration
      easing: 'linear',
    };

    const [promise] = orchestrateAnimation(element, keyframes, config);
    
    // Verify animation is active
    expect(getActiveAnimations(element)).toBeDefined();

    // Cancel immediately
    cancelAllAnimations(element);

    // Verify animation is cancelled immediately
    expect(getActiveAnimations(element)).toBeUndefined();

    // Promise should reject
    promise.catch(() => {
      // Expected to reject
    });
  });
});
