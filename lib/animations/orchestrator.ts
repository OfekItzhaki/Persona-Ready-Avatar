/**
 * Animation Orchestrator
 * 
 * Core animation system that orchestrates smooth transitions using the Web Animations API.
 * Handles animation lifecycle, cleanup, conflict resolution, and performance monitoring.
 */

import type {
  AnimationConfig,
  AnimationKeyframe,
  AnimationCleanup,
} from './types';
import {
  validateAnimationConfig,
  validateKeyframes,
  supportsWebAnimations,
  prefersReducedMotion,
} from './validator';
import { getPerformanceMonitor } from './performance';

/**
 * Map to track active animations by element and property
 */
const activeAnimations = new WeakMap<
  HTMLElement,
  Map<string, Animation>
>();

/**
 * Orchestrates an animation on an element using the Web Animations API
 * 
 * @param element - HTML element to animate
 * @param keyframes - Animation keyframes
 * @param config - Animation configuration
 * @returns Promise that resolves when animation completes, and cleanup function
 * 
 * @throws Error if Web Animations API is not supported
 * @throws Error if configuration or keyframes are invalid
 * 
 * @example
 * ```typescript
 * const [promise, cleanup] = orchestrateAnimation(
 *   element,
 *   [
 *     { opacity: 0, transform: 'translateX(-20px)' },
 *     { opacity: 1, transform: 'translateX(0)' }
 *   ],
 *   {
 *     name: 'slideIn',
 *     duration: 300,
 *     easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
 *     fillMode: 'forwards'
 *   }
 * );
 * 
 * await promise; // Wait for animation to complete
 * cleanup(); // Clean up animation resources
 * ```
 */
export function orchestrateAnimation(
  element: HTMLElement,
  keyframes: AnimationKeyframe[],
  config: AnimationConfig
): [Promise<void>, AnimationCleanup] {
  // Check browser support
  if (!supportsWebAnimations()) {
    throw new Error(
      'Web Animations API is not supported in this browser. Please use a modern browser.'
    );
  }

  // Validate configuration and keyframes
  validateAnimationConfig(config);
  validateKeyframes(keyframes);

  // Check if user prefers reduced motion
  if (prefersReducedMotion()) {
    // Return immediately resolved promise and no-op cleanup
    return [Promise.resolve(), () => {}];
  }

  // Start performance monitoring
  const monitor = getPerformanceMonitor();
  if (!monitor.isPerformanceAcceptable()) {
    // Reduce animation complexity by shortening duration
    config = {
      ...config,
      duration: Math.min(config.duration, 150),
    };
  }

  // Get properties being animated
  const animatedProperties = new Set<string>();
  keyframes.forEach((keyframe) => {
    Object.keys(keyframe).forEach((prop) => animatedProperties.add(prop));
  });

  // Cancel any existing animations on the same properties
  cancelConflictingAnimations(element, animatedProperties);

  // Configure animation options
  const options: KeyframeAnimationOptions = {
    duration: config.duration,
    easing: config.easing,
    delay: config.delay ?? 0,
    iterations: config.iterations ?? 1,
    fill: config.fillMode ?? 'forwards',
  };

  // Start animation
  const animation = element.animate(keyframes, options);

  // Track active animation
  trackAnimation(element, animatedProperties, animation);

  // Create promise that resolves when animation completes or is cancelled
  // Note: Cancellation is treated as a normal outcome, not an error, since
  // animations can be cancelled due to conflict resolution (Requirement 5.8)
  const promise = new Promise<void>((resolve) => {
    animation.onfinish = () => {
      untrackAnimation(element, animatedProperties);
      resolve();
    };

    animation.oncancel = () => {
      untrackAnimation(element, animatedProperties);
      resolve(); // Resolve, not reject - cancellation is expected behavior
    };
  });

  // Create cleanup function
  const cleanup: AnimationCleanup = () => {
    if (animation.playState !== 'finished') {
      animation.cancel();
    }
    untrackAnimation(element, animatedProperties);
  };

  return [promise, cleanup];
}

/**
 * Cancels any existing animations on the element that conflict with the given properties
 */
function cancelConflictingAnimations(
  element: HTMLElement,
  properties: Set<string>
): void {
  const animations = activeAnimations.get(element);
  if (!animations) return;

  for (const [property, animation] of animations.entries()) {
    if (properties.has(property)) {
      animation.cancel();
      animations.delete(property);
    }
  }
}

/**
 * Tracks an active animation
 */
function trackAnimation(
  element: HTMLElement,
  properties: Set<string>,
  animation: Animation
): void {
  let animations = activeAnimations.get(element);
  if (!animations) {
    animations = new Map();
    activeAnimations.set(element, animations);
  }

  properties.forEach((property) => {
    animations!.set(property, animation);
  });
}

/**
 * Untracks an animation
 */
function untrackAnimation(
  element: HTMLElement,
  properties: Set<string>
): void {
  const animations = activeAnimations.get(element);
  if (!animations) return;

  properties.forEach((property) => {
    animations.delete(property);
  });

  if (animations.size === 0) {
    activeAnimations.delete(element);
  }
}

/**
 * Cancels all active animations on an element
 * 
 * @param element - Element to cancel animations on
 */
export function cancelAllAnimations(element: HTMLElement): void {
  const animations = activeAnimations.get(element);
  if (!animations) return;

  for (const animation of animations.values()) {
    animation.cancel();
  }

  activeAnimations.delete(element);
}

/**
 * Gets all active animations on an element
 * 
 * @param element - Element to get animations for
 * @returns Map of property names to animations
 */
export function getActiveAnimations(
  element: HTMLElement
): Map<string, Animation> | undefined {
  return activeAnimations.get(element);
}
