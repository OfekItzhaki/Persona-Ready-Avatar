/**
 * Unit tests for animation validator
 */

import { describe, it, expect } from 'vitest';
import {
  validateAnimationConfig,
  validateKeyframes,
  supportsWebAnimations,
  prefersReducedMotion,
} from '../validator';
import type { AnimationConfig, AnimationKeyframe } from '../types';

describe('validateAnimationConfig', () => {
  it('should accept valid configuration', () => {
    const config: AnimationConfig = {
      name: 'fadeIn',
      duration: 300,
      easing: 'ease-out',
    };

    expect(() => validateAnimationConfig(config)).not.toThrow();
  });

  it('should accept configuration with all optional fields', () => {
    const config: AnimationConfig = {
      name: 'slideIn',
      duration: 500,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      delay: 100,
      iterations: 2,
      fillMode: 'forwards',
    };

    expect(() => validateAnimationConfig(config)).not.toThrow();
  });

  it('should accept infinite iterations', () => {
    const config: AnimationConfig = {
      name: 'pulse',
      duration: 1000,
      easing: 'ease-in-out',
      iterations: 'infinite',
    };

    expect(() => validateAnimationConfig(config)).not.toThrow();
  });

  it('should reject negative duration', () => {
    const config: AnimationConfig = {
      name: 'invalid',
      duration: -100,
      easing: 'ease-out',
    };

    expect(() => validateAnimationConfig(config)).toThrow(
      /Invalid animation duration/
    );
  });

  it('should reject zero duration', () => {
    const config: AnimationConfig = {
      name: 'invalid',
      duration: 0,
      easing: 'ease-out',
    };

    expect(() => validateAnimationConfig(config)).toThrow(
      /Invalid animation duration/
    );
  });

  it('should reject empty easing string', () => {
    const config: AnimationConfig = {
      name: 'invalid',
      duration: 300,
      easing: '',
    };

    expect(() => validateAnimationConfig(config)).toThrow(
      /Invalid animation easing/
    );
  });

  it('should reject negative delay', () => {
    const config: AnimationConfig = {
      name: 'invalid',
      duration: 300,
      easing: 'ease-out',
      delay: -50,
    };

    expect(() => validateAnimationConfig(config)).toThrow(
      /Invalid animation delay/
    );
  });

  it('should reject zero iterations', () => {
    const config: AnimationConfig = {
      name: 'invalid',
      duration: 300,
      easing: 'ease-out',
      iterations: 0,
    };

    expect(() => validateAnimationConfig(config)).toThrow(
      /Invalid animation iterations/
    );
  });

  it('should reject invalid fillMode', () => {
    const config: AnimationConfig = {
      name: 'invalid',
      duration: 300,
      easing: 'ease-out',
      fillMode: 'invalid' as any,
    };

    expect(() => validateAnimationConfig(config)).toThrow(
      /Invalid animation fillMode/
    );
  });
});

describe('validateKeyframes', () => {
  it('should accept keyframes with GPU-accelerated properties', () => {
    const keyframes: AnimationKeyframe[] = [
      { opacity: 0, transform: 'translateX(-20px)' },
      { opacity: 1, transform: 'translateX(0)' },
    ];

    expect(() => validateKeyframes(keyframes)).not.toThrow();
  });

  it('should accept keyframes with only transform', () => {
    const keyframes: AnimationKeyframe[] = [
      { transform: 'scale(0.95)' },
      { transform: 'scale(1)' },
    ];

    expect(() => validateKeyframes(keyframes)).not.toThrow();
  });

  it('should accept keyframes with only opacity', () => {
    const keyframes: AnimationKeyframe[] = [{ opacity: 0 }, { opacity: 1 }];

    expect(() => validateKeyframes(keyframes)).not.toThrow();
  });

  it('should reject empty keyframes array', () => {
    const keyframes: AnimationKeyframe[] = [];

    expect(() => validateKeyframes(keyframes)).toThrow(
      /Keyframes must be a non-empty array/
    );
  });

  it('should reject keyframes with width property', () => {
    const keyframes: AnimationKeyframe[] = [
      { width: '100px' },
      { width: '200px' },
    ];

    expect(() => validateKeyframes(keyframes)).toThrow(
      /Animation uses layout-triggering property: width/
    );
  });

  it('should reject keyframes with height property', () => {
    const keyframes: AnimationKeyframe[] = [
      { height: '100px' },
      { height: '200px' },
    ];

    expect(() => validateKeyframes(keyframes)).toThrow(
      /Animation uses layout-triggering property: height/
    );
  });

  it('should reject keyframes with top property', () => {
    const keyframes: AnimationKeyframe[] = [
      { top: '0px' },
      { top: '100px' },
    ];

    expect(() => validateKeyframes(keyframes)).toThrow(
      /Animation uses layout-triggering property: top/
    );
  });

  it('should reject keyframes with left property', () => {
    const keyframes: AnimationKeyframe[] = [
      { left: '0px' },
      { left: '100px' },
    ];

    expect(() => validateKeyframes(keyframes)).toThrow(
      /Animation uses layout-triggering property: left/
    );
  });

  it('should reject keyframes with margin property', () => {
    const keyframes: AnimationKeyframe[] = [
      { margin: '0px' },
      { margin: '10px' },
    ];

    expect(() => validateKeyframes(keyframes)).toThrow(
      /Animation uses layout-triggering property: margin/
    );
  });
});

describe('supportsWebAnimations', () => {
  it('should return a boolean', () => {
    const result = supportsWebAnimations();
    expect(typeof result).toBe('boolean');
  });
});

describe('prefersReducedMotion', () => {
  it('should return a boolean', () => {
    const result = prefersReducedMotion();
    expect(typeof result).toBe('boolean');
  });
});
