/**
 * Micro-interaction utilities for UI elements
 * Provides smooth, responsive feedback for user interactions
 */

export interface MicroInteractionConfig {
  duration?: number; // Duration in milliseconds (100-300ms)
  easing?: string; // CSS timing function
  scale?: number; // Scale factor for hover/focus effects
  opacity?: number; // Opacity change for interactions
  translateX?: number; // Horizontal translation in pixels
  translateY?: number; // Vertical translation in pixels
}

export type InteractionType = 'hover' | 'click' | 'focus';

/**
 * Apply micro-interaction animation to an element
 * 
 * @param element - The HTML element to apply the interaction to
 * @param interaction - The type of interaction (hover, click, focus)
 * @param config - Configuration for the animation
 * @returns Cleanup function to remove event listeners
 * 
 * @preconditions
 * - element must be a valid HTMLElement in the DOM
 * - interaction must be one of: 'hover', 'click', 'focus'
 * - config.duration must be between 100 and 300 milliseconds
 * - config.easing must be a valid CSS timing function
 * 
 * @postconditions
 * - Event listener is attached to element
 * - Animation plays on interaction trigger
 * - Returns cleanup function to remove listener
 * - Element returns to original state after animation
 * - No memory leaks from event listeners
 */
export function applyMicroInteraction(
  element: HTMLElement,
  interaction: InteractionType,
  config: MicroInteractionConfig = {}
): () => void {
  // Validate and set defaults
  const duration = Math.max(100, Math.min(300, config.duration ?? 200));
  const easing = config.easing ?? 'cubic-bezier(0.4, 0, 0.2, 1)';
  const scale = config.scale ?? 1.05;
  const opacity = config.opacity ?? 1;
  const translateX = config.translateX ?? 0;
  const translateY = config.translateY ?? 0;

  // Check for prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // Store original styles
  const originalTransition = element.style.transition;
  
  // Apply base transition
  element.style.transition = `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;

  let activeAnimation: Animation | null = null;

  const applyEffect = () => {
    if (prefersReducedMotion) {
      // Minimal effect for reduced motion
      element.style.transform = 'scale(1.01)';
      return;
    }

    // Build transform string
    const transforms: string[] = [];
    if (scale !== 1) transforms.push(`scale(${scale})`);
    if (translateX !== 0) transforms.push(`translateX(${translateX}px)`);
    if (translateY !== 0) transforms.push(`translateY(${translateY}px)`);
    
    element.style.transform = transforms.join(' ');
    if (opacity !== 1) {
      element.style.opacity = opacity.toString();
    }
  };

  const removeEffect = () => {
    element.style.transform = '';
    element.style.opacity = '';
  };

  const handleClick = () => {
    // Cancel any active animation
    if (activeAnimation) {
      activeAnimation.cancel();
    }

    // Apply click effect with scale down then up
    const keyframes = [
      { transform: 'scale(1)', opacity: '1' },
      { transform: 'scale(0.95)', opacity: '0.9' },
      { transform: 'scale(1)', opacity: '1' }
    ];

    activeAnimation = element.animate(keyframes, {
      duration: duration,
      easing: easing,
      fill: 'forwards'
    });

    activeAnimation.onfinish = () => {
      activeAnimation = null;
    };
  };

  // Set up event listeners based on interaction type
  let cleanup: () => void;

  switch (interaction) {
    case 'hover':
      const handleMouseEnter = () => applyEffect();
      const handleMouseLeave = () => removeEffect();
      
      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);
      
      cleanup = () => {
        element.removeEventListener('mouseenter', handleMouseEnter);
        element.removeEventListener('mouseleave', handleMouseLeave);
        removeEffect();
        element.style.transition = originalTransition;
      };
      break;

    case 'click':
      element.addEventListener('click', handleClick);
      
      cleanup = () => {
        element.removeEventListener('click', handleClick);
        if (activeAnimation) {
          activeAnimation.cancel();
          activeAnimation = null;
        }
        removeEffect();
        element.style.transition = originalTransition;
      };
      break;

    case 'focus':
      const handleFocus = () => applyEffect();
      const handleBlur = () => removeEffect();
      
      element.addEventListener('focus', handleFocus);
      element.addEventListener('blur', handleBlur);
      
      cleanup = () => {
        element.removeEventListener('focus', handleFocus);
        element.removeEventListener('blur', handleBlur);
        removeEffect();
        element.style.transition = originalTransition;
      };
      break;

    default:
      cleanup = () => {
        element.style.transition = originalTransition;
      };
  }

  return cleanup;
}

/**
 * Apply multiple micro-interactions to an element
 * 
 * @param element - The HTML element to apply interactions to
 * @param interactions - Map of interaction types to configurations
 * @returns Cleanup function to remove all event listeners
 */
export function applyMultipleMicroInteractions(
  element: HTMLElement,
  interactions: Partial<Record<InteractionType, MicroInteractionConfig>>
): () => void {
  const cleanupFunctions: Array<() => void> = [];

  for (const [interaction, config] of Object.entries(interactions)) {
    const cleanup = applyMicroInteraction(
      element,
      interaction as InteractionType,
      config
    );
    cleanupFunctions.push(cleanup);
  }

  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
  };
}

/**
 * Create a micro-interaction hook for React components
 * 
 * @param interaction - The type of interaction
 * @param config - Configuration for the animation
 * @returns Object with ref and cleanup function
 */
export function useMicroInteraction(
  interaction: InteractionType,
  config?: MicroInteractionConfig
) {
  let cleanup: (() => void) | null = null;

  const ref = (element: HTMLElement | null) => {
    // Clean up previous interaction
    if (cleanup) {
      cleanup();
      cleanup = null;
    }

    // Apply new interaction
    if (element) {
      cleanup = applyMicroInteraction(element, interaction, config);
    }
  };

  const destroy = () => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  };

  return { ref, destroy };
}
