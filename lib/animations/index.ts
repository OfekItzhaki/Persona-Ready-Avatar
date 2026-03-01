/**
 * Animation System
 * 
 * A comprehensive animation system that orchestrates smooth transitions,
 * micro-interactions, and loading states throughout the application.
 * 
 * Features:
 * - GPU-accelerated animations (transform, opacity only)
 * - Automatic performance monitoring and complexity reduction
 * - Prefers-reduced-motion support
 * - Animation conflict resolution
 * - Automatic cleanup on component unmount
 * 
 * @example
 * ```typescript
 * import { orchestrateAnimation, fadeIn, slideIn } from '@/lib/animations';
 * 
 * // Simple fade in
 * const [promise, cleanup] = fadeIn(element);
 * await promise;
 * 
 * // Custom animation
 * const [promise, cleanup] = orchestrateAnimation(
 *   element,
 *   [{ opacity: 0 }, { opacity: 1 }],
 *   { name: 'fadeIn', duration: 300, easing: 'ease-out' }
 * );
 * ```
 */

// Core orchestration
export {
  orchestrateAnimation,
  cancelAllAnimations,
  getActiveAnimations,
} from './orchestrator';

// Validation utilities
export {
  validateAnimationConfig,
  validateKeyframes,
  supportsWebAnimations,
  prefersReducedMotion,
} from './validator';

// Performance monitoring
export {
  AnimationPerformanceMonitor,
  getPerformanceMonitor,
  measureAnimationPerformance,
} from './performance';

// Animation utilities
export {
  fadeIn,
  fadeOut,
  slideIn,
  scale,
  pulse,
  animateMessageEntry,
  cleanupAnimations,
} from './utilities';

// Types
export type {
  AnimationConfig,
  AnimationKeyframe,
  AnimationPerformanceMetrics,
  AnimationCleanup,
} from './types';

export {
  GPU_ACCELERATED_PROPERTIES,
  LAYOUT_TRIGGERING_PROPERTIES,
  ANIMATION_EASINGS,
  ANIMATION_DURATIONS,
} from './types';
