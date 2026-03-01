/**
 * Unit tests for animation orchestrator
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import {
  orchestrateAnimation,
  cancelAllAnimations,
  getActiveAnimations,
} from '../orchestrator';
import type { AnimationConfig, AnimationKeyframe } from '../types';

// Mock Web Animations API
class MockAnimation {
  playState: 'idle' | 'running' | 'paused' | 'finished' = 'running';
  onfinish: (() => void) | null = null;
  oncancel: (() => void) | null = null;

  cancel() {
    this.playState = 'idle';
    if (this.oncancel) {
      this.oncancel();
    }
  }

  finish() {
    this.playState = 'finished';
    if (this.onfinish) {
      this.onfinish();
    }
  }
}

// Mock Element.prototype.animate globally
beforeAll(() => {
  if (typeof Element !== 'undefined' && !Element.prototype.animate) {
    Element.prototype.animate = function (keyframes: any, options: any) {
      return new MockAnimation() as any;
    };
  }
});

// Mock performance monitor to always return acceptable performance
vi.mock('../performance', () => ({
  getPerformanceMonitor: () => ({
    isPerformanceAcceptable: () => true,
  }),
  AnimationPerformanceMonitor: class {
    isPerformanceAcceptable() {
      return true;
    }
  },
  measureAnimationPerformance: vi.fn(),
}));

describe('orchestrateAnimation', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);

    // Mock animate method
    element.animate = vi.fn((keyframes, options) => {
      return new MockAnimation() as any;
    });
  });

  it('should create animation with valid configuration', () => {
    const keyframes: AnimationKeyframe[] = [
      { opacity: 0 },
      { opacity: 1 },
    ];

    const config: AnimationConfig = {
      name: 'fadeIn',
      duration: 300,
      easing: 'ease-out',
    };

    const [promise, cleanup] = orchestrateAnimation(element, keyframes, config);

    expect(promise).toBeInstanceOf(Promise);
    expect(typeof cleanup).toBe('function');
    expect(element.animate).toHaveBeenCalledWith(keyframes, {
      duration: 300,
      easing: 'ease-out',
      delay: 0,
      iterations: 1,
      fill: 'forwards',
    });
  });

  it('should apply custom delay and iterations', () => {
    const keyframes: AnimationKeyframe[] = [
      { transform: 'scale(0.95)' },
      { transform: 'scale(1)' },
    ];

    const config: AnimationConfig = {
      name: 'scale',
      duration: 500,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      delay: 100,
      iterations: 2,
      fillMode: 'both',
    };

    orchestrateAnimation(element, keyframes, config);

    expect(element.animate).toHaveBeenCalledWith(keyframes, {
      duration: 500,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      delay: 100,
      iterations: 2,
      fill: 'both',
    });
  });

  it('should resolve promise when animation finishes', async () => {
    const keyframes: AnimationKeyframe[] = [
      { opacity: 0 },
      { opacity: 1 },
    ];

    const config: AnimationConfig = {
      name: 'fadeIn',
      duration: 300,
      easing: 'ease-out',
    };

    let mockAnimation: MockAnimation;
    element.animate = vi.fn(() => {
      mockAnimation = new MockAnimation() as any;
      return mockAnimation as any;
    });

    const [promise] = orchestrateAnimation(element, keyframes, config);

    // Simulate animation finishing
    setTimeout(() => mockAnimation!.finish(), 10);

    await expect(promise).resolves.toBeUndefined();
  });

  it('should reject promise when animation is cancelled', async () => {
    const keyframes: AnimationKeyframe[] = [
      { opacity: 0 },
      { opacity: 1 },
    ];

    const config: AnimationConfig = {
      name: 'fadeIn',
      duration: 300,
      easing: 'ease-out',
    };

    let mockAnimation: MockAnimation;
    element.animate = vi.fn(() => {
      mockAnimation = new MockAnimation() as any;
      return mockAnimation as any;
    });

    const [promise] = orchestrateAnimation(element, keyframes, config);

    // Simulate animation being cancelled
    setTimeout(() => mockAnimation!.cancel(), 10);

    await expect(promise).rejects.toThrow(/Animation "fadeIn" was cancelled/);
  });

  it('should throw error for invalid configuration', () => {
    const keyframes: AnimationKeyframe[] = [
      { opacity: 0 },
      { opacity: 1 },
    ];

    const config: AnimationConfig = {
      name: 'invalid',
      duration: -100, // Invalid
      easing: 'ease-out',
    };

    expect(() => orchestrateAnimation(element, keyframes, config)).toThrow(
      /Invalid animation duration/
    );
  });

  it('should throw error for invalid keyframes', () => {
    const keyframes: AnimationKeyframe[] = [
      { width: '100px' }, // Layout-triggering property
      { width: '200px' },
    ];

    const config: AnimationConfig = {
      name: 'invalid',
      duration: 300,
      easing: 'ease-out',
    };

    expect(() => orchestrateAnimation(element, keyframes, config)).toThrow(
      /Animation uses layout-triggering property/
    );
  });

  it('cleanup function should cancel animation', async () => {
    const keyframes: AnimationKeyframe[] = [
      { opacity: 0 },
      { opacity: 1 },
    ];

    const config: AnimationConfig = {
      name: 'fadeIn',
      duration: 300,
      easing: 'ease-out',
    };

    let mockAnimation: MockAnimation;
    element.animate = vi.fn(() => {
      mockAnimation = new MockAnimation() as any;
      return mockAnimation as any;
    });

    const [promise, cleanup] = orchestrateAnimation(element, keyframes, config);

    // Catch the rejection to prevent unhandled promise rejection
    promise.catch(() => {});

    cleanup();

    expect(mockAnimation!.playState).toBe('idle');
  });
});

describe('cancelAllAnimations', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);

    element.animate = vi.fn((keyframes, options) => {
      return new MockAnimation() as any;
    });
  });

  it('should cancel all active animations on element', async () => {
    const keyframes1: AnimationKeyframe[] = [
      { opacity: 0 },
      { opacity: 1 },
    ];
    const keyframes2: AnimationKeyframe[] = [
      { transform: 'scale(0.95)' },
      { transform: 'scale(1)' },
    ];

    const config: AnimationConfig = {
      name: 'test',
      duration: 300,
      easing: 'ease-out',
    };

    // Start two animations
    const [promise1] = orchestrateAnimation(element, keyframes1, config);
    const [promise2] = orchestrateAnimation(element, keyframes2, config);

    // Catch rejections to prevent unhandled promise rejections
    promise1.catch(() => {});
    promise2.catch(() => {});

    // Cancel all
    cancelAllAnimations(element);

    // Verify no active animations
    const activeAnimations = getActiveAnimations(element);
    expect(activeAnimations).toBeUndefined();
  });
});

describe('getActiveAnimations', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);

    element.animate = vi.fn((keyframes, options) => {
      return new MockAnimation() as any;
    });
  });

  it('should return undefined for element with no animations', () => {
    const activeAnimations = getActiveAnimations(element);
    expect(activeAnimations).toBeUndefined();
  });

  it('should return map of active animations', () => {
    const keyframes: AnimationKeyframe[] = [
      { opacity: 0 },
      { opacity: 1 },
    ];

    const config: AnimationConfig = {
      name: 'fadeIn',
      duration: 300,
      easing: 'ease-out',
    };

    orchestrateAnimation(element, keyframes, config);

    const activeAnimations = getActiveAnimations(element);
    expect(activeAnimations).toBeInstanceOf(Map);
    expect(activeAnimations!.size).toBeGreaterThan(0);
  });
});
