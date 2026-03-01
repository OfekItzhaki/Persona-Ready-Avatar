/**
 * Transition Utilities
 * 
 * Utilities for smooth state transitions with proper duration and easing.
 * Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5
 */

export type CSSProperties = Record<string, string | number>;

export interface TransitionConfig {
  duration: number; // in milliseconds
  easing: string;
  delay?: number;
}

export interface TransitionResult {
  success: boolean;
  error?: string;
}

// Natural easing functions (no linear easing for UI transitions)
export const NATURAL_EASING_FUNCTIONS = [
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'cubic-bezier(0.4, 0, 0.2, 1)', // Material Design standard
  'cubic-bezier(0.34, 1.56, 0.64, 1)', // Spring easing
  'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Ease-out-quad
  'cubic-bezier(0.55, 0.085, 0.68, 0.53)', // Ease-in-quad
  'cubic-bezier(0.455, 0.03, 0.515, 0.955)', // Ease-in-out-quad
] as const;

const MIN_DURATION = 100; // milliseconds
const MAX_DURATION = 500; // milliseconds

/**
 * Validate transition duration is within acceptable bounds (100-500ms)
 */
export function validateTransitionDuration(duration: number): boolean {
  return duration >= MIN_DURATION && duration <= MAX_DURATION;
}

/**
 * Validate easing function is natural (not linear)
 */
export function validateEasingFunction(easing: string): boolean {
  // Reject linear easing
  if (easing === 'linear') {
    return false;
  }

  // Accept known natural easing functions
  if (NATURAL_EASING_FUNCTIONS.includes(easing as any)) {
    return true;
  }

  // Accept cubic-bezier functions (but not linear ones)
  if (easing.startsWith('cubic-bezier(')) {
    // Linear cubic-bezier would be cubic-bezier(0, 0, 1, 1)
    if (easing === 'cubic-bezier(0, 0, 1, 1)' || easing === 'cubic-bezier(0,0,1,1)') {
      return false;
    }
    return true;
  }

  // Accept steps functions
  if (easing.startsWith('steps(')) {
    return true;
  }

  return false;
}

/**
 * Validate transition configuration
 */
export function validateTransitionConfig(config: TransitionConfig): TransitionResult {
  // Validate duration
  if (!validateTransitionDuration(config.duration)) {
    return {
      success: false,
      error: `Duration must be between ${MIN_DURATION}ms and ${MAX_DURATION}ms, got ${config.duration}ms`,
    };
  }

  // Validate easing
  if (!validateEasingFunction(config.easing)) {
    return {
      success: false,
      error: `Easing must be a natural function (not linear), got ${config.easing}`,
    };
  }

  // Validate delay if provided
  if (config.delay !== undefined && config.delay < 0) {
    return {
      success: false,
      error: `Delay must be non-negative, got ${config.delay}ms`,
    };
  }

  return { success: true };
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Adjust transition config for reduced motion preference
 */
export function adjustForReducedMotion(config: TransitionConfig): TransitionConfig {
  if (prefersReducedMotion()) {
    return {
      ...config,
      duration: 0, // Instant transitions
    };
  }
  return config;
}

/**
 * Transition between states with smooth animation
 */
export async function transitionBetweenStates(
  element: HTMLElement,
  fromState: CSSProperties,
  toState: CSSProperties,
  duration: number,
  easing: string
): Promise<void> {
  // Validate configuration
  const validation = validateTransitionConfig({ duration, easing });
  if (!validation.success) {
    throw new Error(validation.error);
  }

  // Adjust for reduced motion
  const config = adjustForReducedMotion({ duration, easing });

  // Apply from state
  Object.entries(fromState).forEach(([property, value]) => {
    (element.style as any)[property] = value;
  });

  // Force reflow to ensure from state is applied
  void element.offsetHeight;

  // Set up transition
  const properties = Object.keys(toState);
  element.style.transition = properties
    .map(prop => {
      // Convert camelCase to kebab-case
      const kebabProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${kebabProp} ${config.duration}ms ${config.easing}`;
    })
    .join(', ');

  // Apply to state
  Object.entries(toState).forEach(([property, value]) => {
    (element.style as any)[property] = value;
  });

  // Wait for transition to complete
  return new Promise<void>((resolve) => {
    if (config.duration === 0) {
      // Instant transition for reduced motion
      element.style.transition = '';
      resolve();
      return;
    }

    const handleTransitionEnd = (event: TransitionEvent) => {
      // Only handle transitions on this element
      if (event.target === element) {
        element.removeEventListener('transitionend', handleTransitionEnd);
        element.style.transition = '';
        resolve();
      }
    };

    element.addEventListener('transitionend', handleTransitionEnd);

    // Fallback timeout in case transitionend doesn't fire
    setTimeout(() => {
      element.removeEventListener('transitionend', handleTransitionEnd);
      element.style.transition = '';
      resolve();
    }, config.duration + 50);
  });
}

/**
 * Create a coordinated transition for multiple elements
 */
export async function coordinateTransitions(
  transitions: Array<{
    element: HTMLElement;
    fromState: CSSProperties;
    toState: CSSProperties;
    duration: number;
    easing: string;
    delay?: number;
  }>
): Promise<void> {
  // Validate all transitions
  for (const transition of transitions) {
    const validation = validateTransitionConfig({
      duration: transition.duration,
      easing: transition.easing,
      delay: transition.delay,
    });
    if (!validation.success) {
      throw new Error(validation.error);
    }
  }

  // Execute all transitions in parallel
  const promises = transitions.map(async (transition) => {
    if (transition.delay) {
      await new Promise(resolve => setTimeout(resolve, transition.delay));
    }
    return transitionBetweenStates(
      transition.element,
      transition.fromState,
      transition.toState,
      transition.duration,
      transition.easing
    );
  });

  await Promise.all(promises);
}

/**
 * Apply a smooth transition to a single property
 */
export async function transitionProperty(
  element: HTMLElement,
  property: string,
  fromValue: string | number,
  toValue: string | number,
  duration: number,
  easing: string
): Promise<void> {
  return transitionBetweenStates(
    element,
    { [property]: fromValue },
    { [property]: toValue },
    duration,
    easing
  );
}

/**
 * Get recommended transition duration based on distance/complexity
 */
export function getRecommendedDuration(complexity: 'simple' | 'moderate' | 'complex'): number {
  switch (complexity) {
    case 'simple':
      return 150; // Quick transitions for simple changes
    case 'moderate':
      return 250; // Standard transitions
    case 'complex':
      return 400; // Longer transitions for complex changes
    default:
      return 250;
  }
}

/**
 * Get recommended easing function based on transition type
 */
export function getRecommendedEasing(type: 'enter' | 'exit' | 'move'): string {
  switch (type) {
    case 'enter':
      return 'cubic-bezier(0, 0, 0.2, 1)'; // Ease-out for entering elements
    case 'exit':
      return 'cubic-bezier(0.4, 0, 1, 1)'; // Ease-in for exiting elements
    case 'move':
      return 'cubic-bezier(0.4, 0, 0.2, 1)'; // Ease-in-out for moving elements
    default:
      return 'ease-in-out';
  }
}

/**
 * Create a transition configuration with validation
 */
export function createTransitionConfig(
  duration: number,
  easing: string,
  delay?: number
): TransitionConfig {
  const config: TransitionConfig = { duration, easing, delay };
  const validation = validateTransitionConfig(config);
  
  if (!validation.success) {
    throw new Error(validation.error);
  }
  
  return config;
}
