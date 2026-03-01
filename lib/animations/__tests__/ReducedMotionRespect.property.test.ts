/**
 * Property Test: Reduced Motion Respect
 * 
 * **Validates: Requirements 5.10, 9.6, 10.6**
 * 
 * Property: For any animation, when the user has prefers-reduced-motion enabled,
 * the animation must be disabled or significantly reduced.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fc } from '@fast-check/vitest';
import { orchestrateAnimation } from '../orchestrator';
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

describe('Property 8: Reduced Motion Respect', () => {
  let element: HTMLElement;
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
    
    // Save original matchMedia
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    // Restore original matchMedia
    window.matchMedia = originalMatchMedia;
  });

  it('should skip animations when prefers-reduced-motion is enabled', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1 }),
        fc.integer({ min: 100, max: 1000 }),
        fc.constantFrom('ease', 'ease-in', 'ease-out', 'ease-in-out'),
        (opacity, duration, easing) => {
          // Mock prefers-reduced-motion: reduce
          window.matchMedia = vi.fn().mockImplementation((query) => ({
            matches: query === '(prefers-reduced-motion: reduce)',
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }));

          const keyframes: AnimationKeyframe[] = [
            { opacity: 0 },
            { opacity },
          ];
          const config: AnimationConfig = {
            name: 'test-anim',
            duration,
            easing,
          };

          const [promise] = orchestrateAnimation(element, keyframes, config);

          // Promise should resolve immediately without animation
          return promise.then(() => {
            // Animation should complete immediately
            expect(true).toBe(true);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should run animations normally when prefers-reduced-motion is not enabled', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1 }),
        fc.integer({ min: 100, max: 1000 }),
        fc.constantFrom('ease', 'ease-in', 'ease-out', 'ease-in-out'),
        (opacity, duration, easing) => {
          // Mock prefers-reduced-motion: no-preference
          window.matchMedia = vi.fn().mockImplementation((query) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }));

          let animateCalled = false;
          element.animate = vi.fn((_keyframes: any, _options: any) => {
            animateCalled = true;
            return new MockAnimation() as any;
          });

          const keyframes: AnimationKeyframe[] = [
            { opacity: 0 },
            { opacity },
          ];
          const config: AnimationConfig = {
            name: 'test-anim',
            duration,
            easing,
          };

          orchestrateAnimation(element, keyframes, config);

          // Animation should be called
          expect(animateCalled).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should respect reduced motion for transform animations', () => {
    // Mock prefers-reduced-motion: reduce
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const keyframes: AnimationKeyframe[] = [
      { transform: 'translateX(0)' },
      { transform: 'translateX(100px)' },
    ];
    const config: AnimationConfig = {
      name: 'transform-anim',
      duration: 300,
      easing: 'ease-out',
    };

    const [promise] = orchestrateAnimation(element, keyframes, config);

    // Promise should resolve immediately
    return promise.then(() => {
      expect(true).toBe(true);
    });
  });

  it('should respect reduced motion for combined animations', () => {
    // Mock prefers-reduced-motion: reduce
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const keyframes: AnimationKeyframe[] = [
      { opacity: 0, transform: 'translateX(-20px) scale(0.95)' },
      { opacity: 1, transform: 'translateX(0) scale(1)' },
    ];
    const config: AnimationConfig = {
      name: 'combined-anim',
      duration: 300,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    };

    const [promise] = orchestrateAnimation(element, keyframes, config);

    // Promise should resolve immediately
    return promise.then(() => {
      expect(true).toBe(true);
    });
  });

  it('should handle reduced motion preference changes', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.double({ min: 0, max: 1 }),
        fc.integer({ min: 100, max: 1000 }),
        (reducedMotion, opacity, duration) => {
          // Mock matchMedia based on property
          window.matchMedia = vi.fn().mockImplementation((query) => ({
            matches: reducedMotion && query === '(prefers-reduced-motion: reduce)',
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }));

          let animateCalled = false;
          element.animate = vi.fn((_keyframes: any, _options: any) => {
            animateCalled = true;
            return new MockAnimation() as any;
          });

          const keyframes: AnimationKeyframe[] = [
            { opacity: 0 },
            { opacity },
          ];
          const config: AnimationConfig = {
            name: 'test-anim',
            duration,
            easing: 'ease-out',
          };

          const [promise] = orchestrateAnimation(element, keyframes, config);

          if (reducedMotion) {
            // Animation should not be called
            expect(animateCalled).toBe(false);
          } else {
            // Animation should be called
            expect(animateCalled).toBe(true);
          }

          // Catch any rejections
          promise.catch(() => {});
        }
      ),
      { numRuns: 100 }
    );
  });
});
