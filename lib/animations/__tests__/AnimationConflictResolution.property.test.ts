/**
 * Property Test: Animation Conflict Resolution
 * 
 * **Validates: Requirements 5.8**
 * 
 * Property: For any two animations targeting the same property on the same element,
 * the later animation must cancel the earlier one.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { orchestrateAnimation, getActiveAnimations } from '../orchestrator';
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

beforeAll(() => {
  if (typeof Element !== 'undefined' && !Element.prototype.animate) {
    Element.prototype.animate = function (keyframes: any, options: any) {
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

describe('Property 6: Animation Conflict Resolution', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  it('should cancel previous animation when new animation targets the same property', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1 }),
        fc.double({ min: 0, max: 1 }),
        fc.integer({ min: 100, max: 500 }),
        (opacity1, opacity2, duration) => {
          let firstAnimation: MockAnimation | null = null;
          let secondAnimation: MockAnimation | null = null;

          element.animate = vi.fn((keyframes, options) => {
            const anim = new MockAnimation() as any;
            if (!firstAnimation) {
              firstAnimation = anim;
            } else {
              secondAnimation = anim;
            }
            return anim;
          });

          // Start first animation on opacity
          const keyframes1: AnimationKeyframe[] = [
            { opacity: 0 },
            { opacity: opacity1 },
          ];
          const config1: AnimationConfig = {
            name: 'anim1',
            duration,
            easing: 'ease-out',
          };

          orchestrateAnimation(element, keyframes1, config1);

          // Start second animation on opacity (should cancel first)
          const keyframes2: AnimationKeyframe[] = [
            { opacity: 0 },
            { opacity: opacity2 },
          ];
          const config2: AnimationConfig = {
            name: 'anim2',
            duration,
            easing: 'ease-out',
          };

          orchestrateAnimation(element, keyframes2, config2);

          // First animation should be cancelled
          expect(firstAnimation?.cancelled).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should not cancel animations on different properties', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1 }),
        fc.nat({ max: 100 }),
        fc.integer({ min: 100, max: 500 }),
        (opacity, translateX, duration) => {
          let firstAnimation: MockAnimation | null = null;
          let secondAnimation: MockAnimation | null = null;

          element.animate = vi.fn((keyframes, options) => {
            const anim = new MockAnimation() as any;
            if (!firstAnimation) {
              firstAnimation = anim;
            } else {
              secondAnimation = anim;
            }
            return anim;
          });

          // Start first animation on opacity
          const keyframes1: AnimationKeyframe[] = [
            { opacity: 0 },
            { opacity },
          ];
          const config1: AnimationConfig = {
            name: 'anim1',
            duration,
            easing: 'ease-out',
          };

          orchestrateAnimation(element, keyframes1, config1);

          // Start second animation on transform (different property)
          const keyframes2: AnimationKeyframe[] = [
            { transform: 'translateX(0)' },
            { transform: `translateX(${translateX}px)` },
          ];
          const config2: AnimationConfig = {
            name: 'anim2',
            duration,
            easing: 'ease-out',
          };

          orchestrateAnimation(element, keyframes2, config2);

          // First animation should NOT be cancelled
          expect(firstAnimation?.cancelled).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should track active animations correctly after conflict resolution', () => {
    const keyframes1: AnimationKeyframe[] = [{ opacity: 0 }, { opacity: 1 }];
    const keyframes2: AnimationKeyframe[] = [{ opacity: 0 }, { opacity: 0.5 }];

    const config: AnimationConfig = {
      name: 'test',
      duration: 300,
      easing: 'ease-out',
    };

    // Start first animation
    orchestrateAnimation(element, keyframes1, config);

    // Start second animation (should cancel first)
    orchestrateAnimation(element, keyframes2, config);

    // Should have exactly one active animation on opacity
    const activeAnimations = getActiveAnimations(element);
    expect(activeAnimations).toBeDefined();
    expect(activeAnimations!.has('opacity')).toBe(true);
    expect(activeAnimations!.size).toBe(1);
  });
});
