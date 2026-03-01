/**
 * React Hook for Animation System
 * 
 * Provides a React-friendly interface to the animation system with
 * automatic cleanup on component unmount.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { AnimationConfig, AnimationKeyframe } from './types';
import { orchestrateAnimation, cancelAllAnimations } from './orchestrator';

/**
 * Hook for managing animations on a React component
 * 
 * @returns Object with animation utilities
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { elementRef, animate } = useAnimation();
 * 
 *   useEffect(() => {
 *     if (elementRef.current) {
 *       animate(
 *         [{ opacity: 0 }, { opacity: 1 }],
 *         { name: 'fadeIn', duration: 300, easing: 'ease-out' }
 *       );
 *     }
 *   }, [animate]);
 * 
 *   return <div ref={elementRef}>Content</div>;
 * }
 * ```
 */
export function useAnimation<T extends HTMLElement = HTMLElement>() {
  const elementRef = useRef<T>(null);
  const cleanupFnsRef = useRef<Array<() => void>>([]);

  /**
   * Animates the element with the given keyframes and configuration
   */
  const animate = useCallback(
    (
      keyframes: AnimationKeyframe[],
      config: AnimationConfig
    ): Promise<void> => {
      if (!elementRef.current) {
        return Promise.reject(new Error('Element ref is not set'));
      }

      const [promise, cleanup] = orchestrateAnimation(
        elementRef.current,
        keyframes,
        config
      );

      // Track cleanup function
      cleanupFnsRef.current.push(cleanup);

      // Remove cleanup function after animation completes
      promise.finally(() => {
        const index = cleanupFnsRef.current.indexOf(cleanup);
        if (index > -1) {
          cleanupFnsRef.current.splice(index, 1);
        }
      });

      return promise;
    },
    []
  );

  /**
   * Cancels all active animations on the element
   */
  const cancelAnimations = useCallback(() => {
    if (elementRef.current) {
      cancelAllAnimations(elementRef.current);
    }
    // Call all cleanup functions
    cleanupFnsRef.current.forEach((cleanup) => cleanup());
    cleanupFnsRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimations();
    };
  }, [cancelAnimations]);

  return {
    elementRef,
    animate,
    cancelAnimations,
  };
}

/**
 * Hook for animating element entry (mount animation)
 * 
 * @param keyframes - Animation keyframes
 * @param config - Animation configuration
 * @param deps - Dependencies array (when to re-run animation)
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const ref = useAnimationOnMount(
 *     [{ opacity: 0 }, { opacity: 1 }],
 *     { name: 'fadeIn', duration: 300, easing: 'ease-out' }
 *   );
 * 
 *   return <div ref={ref}>Content</div>;
 * }
 * ```
 */
export function useAnimationOnMount<T extends HTMLElement = HTMLElement>(
  keyframes: AnimationKeyframe[],
  config: AnimationConfig,
  deps: React.DependencyList = []
) {
  const elementRef = useRef<T>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const [promise, cleanup] = orchestrateAnimation(
      elementRef.current,
      keyframes,
      config
    );

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return elementRef;
}
