/**
 * Animation Configuration Validator
 * 
 * Validates animation configurations before applying them to ensure
 * they meet performance and correctness requirements.
 */

import type { AnimationConfig, AnimationKeyframe } from './types';
import {
  GPU_ACCELERATED_PROPERTIES,
  LAYOUT_TRIGGERING_PROPERTIES,
} from './types';

/**
 * Validates an animation configuration
 * 
 * @param config - Animation configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateAnimationConfig(config: AnimationConfig): void {
  // Validate duration
  if (
    typeof config.duration !== 'number' ||
    config.duration <= 0 ||
    !isFinite(config.duration)
  ) {
    throw new Error(
      `Invalid animation duration: ${config.duration}. Duration must be a positive finite number.`
    );
  }

  // Validate easing
  if (typeof config.easing !== 'string' || config.easing.trim() === '') {
    throw new Error(
      `Invalid animation easing: ${config.easing}. Easing must be a non-empty string.`
    );
  }

  // Validate delay if provided
  if (config.delay !== undefined) {
    if (typeof config.delay !== 'number' || config.delay < 0) {
      throw new Error(
        `Invalid animation delay: ${config.delay}. Delay must be a non-negative number.`
      );
    }
  }

  // Validate iterations if provided
  if (config.iterations !== undefined) {
    if (
      config.iterations !== 'infinite' &&
      (typeof config.iterations !== 'number' || config.iterations <= 0)
    ) {
      throw new Error(
        `Invalid animation iterations: ${config.iterations}. Iterations must be a positive number or 'infinite'.`
      );
    }
  }

  // Validate fillMode if provided
  if (config.fillMode !== undefined) {
    const validFillModes = ['none', 'forwards', 'backwards', 'both'];
    if (!validFillModes.includes(config.fillMode)) {
      throw new Error(
        `Invalid animation fillMode: ${config.fillMode}. Must be one of: ${validFillModes.join(', ')}.`
      );
    }
  }
}

/**
 * Validates animation keyframes to ensure they only use GPU-accelerated properties
 * 
 * @param keyframes - Animation keyframes to validate
 * @throws Error if keyframes contain layout-triggering properties
 */
export function validateKeyframes(keyframes: AnimationKeyframe[]): void {
  if (!Array.isArray(keyframes) || keyframes.length === 0) {
    throw new Error('Keyframes must be a non-empty array');
  }

  for (const keyframe of keyframes) {
    const properties = Object.keys(keyframe);

    for (const property of properties) {
      // Check if property triggers layout recalculation
      if (LAYOUT_TRIGGERING_PROPERTIES.includes(property as any)) {
        throw new Error(
          `Animation uses layout-triggering property: ${property}. ` +
            `Only GPU-accelerated properties (${GPU_ACCELERATED_PROPERTIES.join(', ')}) should be animated for optimal performance.`
        );
      }
    }
  }
}

/**
 * Checks if the browser supports the Web Animations API
 * 
 * @returns true if Web Animations API is supported
 */
export function supportsWebAnimations(): boolean {
  return (
    typeof Element !== 'undefined' &&
    typeof Element.prototype.animate === 'function'
  );
}

/**
 * Checks if the user prefers reduced motion
 * 
 * @returns true if user has prefers-reduced-motion enabled
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
