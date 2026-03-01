/**
 * Animation System Types
 * 
 * Type definitions for the animation system that orchestrates smooth transitions,
 * micro-interactions, and loading states throughout the application.
 */

/**
 * Animation configuration for Web Animations API
 */
export interface AnimationConfig {
  /** Animation name/identifier */
  name: string;
  /** Duration in milliseconds */
  duration: number;
  /** CSS timing function or cubic-bezier */
  easing: string;
  /** Delay before animation starts (ms) */
  delay?: number;
  /** Number of iterations or 'infinite' */
  iterations?: number | 'infinite';
  /** Fill mode for animation */
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}

/**
 * Keyframe definition for animations
 */
export interface AnimationKeyframe {
  [property: string]: string | number;
}

/**
 * Performance metrics for animation monitoring
 */
export interface AnimationPerformanceMetrics {
  /** Average frame rate */
  averageFps: number;
  /** Minimum frame rate observed */
  minFps: number;
  /** Maximum frame rate observed */
  maxFps: number;
  /** Number of dropped frames */
  droppedFrames: number;
  /** Total animation duration */
  duration: number;
}

/**
 * Animation cleanup function
 */
export type AnimationCleanup = () => void;

/**
 * GPU-accelerated properties that can be safely animated
 */
export const GPU_ACCELERATED_PROPERTIES = ['transform', 'opacity'] as const;

/**
 * Properties that trigger layout recalculation (should NOT be animated)
 */
export const LAYOUT_TRIGGERING_PROPERTIES = [
  'width',
  'height',
  'top',
  'left',
  'right',
  'bottom',
  'margin',
  'padding',
  'border-width',
] as const;

/**
 * Animation easing presets
 */
export const ANIMATION_EASINGS = {
  linear: 'linear',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  smooth: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
} as const;

/**
 * Animation duration presets (in milliseconds)
 */
export const ANIMATION_DURATIONS = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;
