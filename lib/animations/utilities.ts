/**
 * Animation Utilities
 * 
 * Helper functions for common animation patterns using GPU-accelerated properties.
 */

import type { AnimationConfig, AnimationKeyframe } from './types';
import { ANIMATION_EASINGS, ANIMATION_DURATIONS } from './types';
import { orchestrateAnimation, cancelAllAnimations } from './orchestrator';

/**
 * Fades an element in
 * 
 * @param element - Element to fade in
 * @param duration - Animation duration in ms (default: 300)
 * @returns Promise that resolves when animation completes, and cleanup function
 */
export function fadeIn(
  element: HTMLElement,
  duration: number = ANIMATION_DURATIONS.normal
): [Promise<void>, () => void] {
  const keyframes: AnimationKeyframe[] = [
    { opacity: 0 },
    { opacity: 1 },
  ];

  const config: AnimationConfig = {
    name: 'fadeIn',
    duration,
    easing: ANIMATION_EASINGS.easeOut,
    fillMode: 'forwards',
  };

  return orchestrateAnimation(element, keyframes, config);
}

/**
 * Fades an element out
 * 
 * @param element - Element to fade out
 * @param duration - Animation duration in ms (default: 300)
 * @returns Promise that resolves when animation completes, and cleanup function
 */
export function fadeOut(
  element: HTMLElement,
  duration: number = ANIMATION_DURATIONS.normal
): [Promise<void>, () => void] {
  const keyframes: AnimationKeyframe[] = [
    { opacity: 1 },
    { opacity: 0 },
  ];

  const config: AnimationConfig = {
    name: 'fadeOut',
    duration,
    easing: ANIMATION_EASINGS.easeIn,
    fillMode: 'forwards',
  };

  return orchestrateAnimation(element, keyframes, config);
}

/**
 * Slides an element in from a direction
 * 
 * @param element - Element to slide in
 * @param direction - Direction to slide from ('left', 'right', 'top', 'bottom')
 * @param distance - Distance to slide in pixels (default: 20)
 * @param duration - Animation duration in ms (default: 300)
 * @returns Promise that resolves when animation completes, and cleanup function
 */
export function slideIn(
  element: HTMLElement,
  direction: 'left' | 'right' | 'top' | 'bottom',
  distance: number = 20,
  duration: number = ANIMATION_DURATIONS.normal
): [Promise<void>, () => void] {
  const transforms: Record<typeof direction, string> = {
    left: `translateX(-${distance}px)`,
    right: `translateX(${distance}px)`,
    top: `translateY(-${distance}px)`,
    bottom: `translateY(${distance}px)`,
  };

  const keyframes: AnimationKeyframe[] = [
    { opacity: 0, transform: transforms[direction] },
    { opacity: 1, transform: 'translate(0, 0)' },
  ];

  const config: AnimationConfig = {
    name: `slideIn-${direction}`,
    duration,
    easing: ANIMATION_EASINGS.spring,
    fillMode: 'forwards',
  };

  return orchestrateAnimation(element, keyframes, config);
}

/**
 * Scales an element with optional fade
 * 
 * @param element - Element to scale
 * @param from - Starting scale (default: 0.95)
 * @param to - Ending scale (default: 1)
 * @param withFade - Whether to fade in during scale (default: true)
 * @param duration - Animation duration in ms (default: 300)
 * @returns Promise that resolves when animation completes, and cleanup function
 */
export function scale(
  element: HTMLElement,
  from: number = 0.95,
  to: number = 1,
  withFade: boolean = true,
  duration: number = ANIMATION_DURATIONS.normal
): [Promise<void>, () => void] {
  const keyframes: AnimationKeyframe[] = withFade
    ? [
        { opacity: 0, transform: `scale(${from})` },
        { opacity: 1, transform: `scale(${to})` },
      ]
    : [
        { transform: `scale(${from})` },
        { transform: `scale(${to})` },
      ];

  const config: AnimationConfig = {
    name: 'scale',
    duration,
    easing: ANIMATION_EASINGS.spring,
    fillMode: 'forwards',
  };

  return orchestrateAnimation(element, keyframes, config);
}

/**
 * Creates a pulsing animation (useful for loading indicators)
 * 
 * @param element - Element to pulse
 * @param minOpacity - Minimum opacity (default: 0.5)
 * @param maxOpacity - Maximum opacity (default: 1)
 * @param duration - Animation duration in ms (default: 1000)
 * @returns Cleanup function to stop the animation
 */
export function pulse(
  element: HTMLElement,
  minOpacity: number = 0.5,
  maxOpacity: number = 1,
  duration: number = 1000
): () => void {
  const keyframes: AnimationKeyframe[] = [
    { opacity: maxOpacity },
    { opacity: minOpacity },
    { opacity: maxOpacity },
  ];

  const config: AnimationConfig = {
    name: 'pulse',
    duration,
    easing: ANIMATION_EASINGS.easeInOut,
    iterations: 'infinite',
  };

  const [, cleanup] = orchestrateAnimation(element, keyframes, config);
  return cleanup;
}

/**
 * Animates a message bubble entering the chat
 * 
 * @param element - Message element to animate
 * @param isUser - Whether this is a user message (slides from right) or agent message (slides from left)
 * @param duration - Animation duration in ms (default: 300)
 * @returns Promise that resolves when animation completes, and cleanup function
 */
export function animateMessageEntry(
  element: HTMLElement,
  isUser: boolean,
  duration: number = ANIMATION_DURATIONS.normal
): [Promise<void>, () => void] {
  const direction = isUser ? 'right' : 'left';
  const translateX = isUser ? '20px' : '-20px';

  const keyframes: AnimationKeyframe[] = [
    {
      opacity: 0,
      transform: `translateX(${translateX}) scale(0.95)`,
    },
    {
      opacity: 1,
      transform: 'translateX(0) scale(1)',
    },
  ];

  const config: AnimationConfig = {
    name: `messageEntry-${direction}`,
    duration,
    easing: ANIMATION_EASINGS.spring,
    fillMode: 'forwards',
  };

  const [promise, cleanup] = orchestrateAnimation(element, keyframes, config);

  // Clean up inline styles after animation completes
  const enhancedPromise = promise.then(() => {
    element.style.opacity = '';
    element.style.transform = '';
  });

  return [enhancedPromise, cleanup];
}

/**
 * Cleans up all animations on an element when it unmounts
 * 
 * @param element - Element to clean up
 */
export function cleanupAnimations(element: HTMLElement): void {
  cancelAllAnimations(element);
}
