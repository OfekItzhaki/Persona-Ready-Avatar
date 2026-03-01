/**
 * State Consistency Utilities
 * 
 * Utilities for ensuring visual state always matches logical state across components.
 * Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5
 */

export type ComponentState = 'idle' | 'loading' | 'disabled' | 'error' | 'success';

export interface VisualStateIndicators {
  opacity?: number;
  cursor?: string;
  pointerEvents?: string;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
}

export interface StateValidationResult {
  isConsistent: boolean;
  expectedVisual: VisualStateIndicators;
  actualVisual: VisualStateIndicators;
  inconsistencies: string[];
}

/**
 * Get expected visual indicators for a given logical state
 */
export function getExpectedVisualState(state: ComponentState): VisualStateIndicators {
  switch (state) {
    case 'loading':
      return {
        opacity: 0.7,
        cursor: 'wait',
        pointerEvents: 'none',
      };
    case 'disabled':
      return {
        opacity: 0.5,
        cursor: 'not-allowed',
        pointerEvents: 'none',
      };
    case 'error':
      return {
        opacity: 1,
        cursor: 'pointer',
        pointerEvents: 'auto',
        borderColor: 'error',
        backgroundColor: 'error-light',
      };
    case 'success':
      return {
        opacity: 1,
        cursor: 'pointer',
        pointerEvents: 'auto',
        borderColor: 'success',
        backgroundColor: 'success-light',
      };
    case 'idle':
    default:
      return {
        opacity: 1,
        cursor: 'pointer',
        pointerEvents: 'auto',
      };
  }
}

/**
 * Extract visual state from an element's computed styles
 */
export function extractVisualState(element: HTMLElement): VisualStateIndicators {
  const computed = window.getComputedStyle(element);
  
  return {
    opacity: parseFloat(computed.opacity),
    cursor: computed.cursor,
    pointerEvents: computed.pointerEvents,
    backgroundColor: computed.backgroundColor,
    borderColor: computed.borderColor,
    className: element.className,
  };
}

/**
 * Validate that visual state matches logical state
 */
export function validateStateConsistency(
  logicalState: ComponentState,
  visualState: VisualStateIndicators
): StateValidationResult {
  const expectedVisual = getExpectedVisualState(logicalState);
  const inconsistencies: string[] = [];

  // Check opacity
  if (expectedVisual.opacity !== undefined && visualState.opacity !== undefined) {
    if (Math.abs(expectedVisual.opacity - visualState.opacity) > 0.01) {
      inconsistencies.push(
        `Opacity mismatch: expected ${expectedVisual.opacity}, got ${visualState.opacity}`
      );
    }
  }

  // Check cursor
  if (expectedVisual.cursor && visualState.cursor !== expectedVisual.cursor) {
    inconsistencies.push(
      `Cursor mismatch: expected ${expectedVisual.cursor}, got ${visualState.cursor}`
    );
  }

  // Check pointer events
  if (expectedVisual.pointerEvents && visualState.pointerEvents !== expectedVisual.pointerEvents) {
    inconsistencies.push(
      `Pointer events mismatch: expected ${expectedVisual.pointerEvents}, got ${visualState.pointerEvents}`
    );
  }

  return {
    isConsistent: inconsistencies.length === 0,
    expectedVisual,
    actualVisual: visualState,
    inconsistencies,
  };
}

/**
 * Synchronize visual state with logical state
 */
export function synchronizeVisualState(
  element: HTMLElement,
  logicalState: ComponentState
): void {
  const expectedVisual = getExpectedVisualState(logicalState);

  // Apply opacity
  if (expectedVisual.opacity !== undefined) {
    element.style.opacity = expectedVisual.opacity.toString();
  }

  // Apply cursor
  if (expectedVisual.cursor) {
    element.style.cursor = expectedVisual.cursor;
  }

  // Apply pointer events
  if (expectedVisual.pointerEvents) {
    element.style.pointerEvents = expectedVisual.pointerEvents;
  }

  // Add state class for CSS-based styling
  element.classList.remove('state-idle', 'state-loading', 'state-disabled', 'state-error', 'state-success');
  element.classList.add(`state-${logicalState}`);

  // Set aria attributes for accessibility
  switch (logicalState) {
    case 'loading':
      element.setAttribute('aria-busy', 'true');
      element.setAttribute('aria-disabled', 'true');
      break;
    case 'disabled':
      element.setAttribute('aria-disabled', 'true');
      element.removeAttribute('aria-busy');
      break;
    case 'error':
      element.setAttribute('aria-invalid', 'true');
      element.removeAttribute('aria-busy');
      element.removeAttribute('aria-disabled');
      break;
    case 'success':
      element.removeAttribute('aria-invalid');
      element.removeAttribute('aria-busy');
      element.removeAttribute('aria-disabled');
      break;
    case 'idle':
    default:
      element.removeAttribute('aria-busy');
      element.removeAttribute('aria-disabled');
      element.removeAttribute('aria-invalid');
      break;
  }
}

/**
 * Create a state change validator that ensures visual updates match logical state changes
 */
export function createStateValidator(element: HTMLElement) {
  let currentState: ComponentState = 'idle';

  return {
    setState(newState: ComponentState): StateValidationResult {
      currentState = newState;
      synchronizeVisualState(element, newState);
      const visualState = extractVisualState(element);
      return validateStateConsistency(newState, visualState);
    },
    getState(): ComponentState {
      return currentState;
    },
    validate(): StateValidationResult {
      const visualState = extractVisualState(element);
      return validateStateConsistency(currentState, visualState);
    },
  };
}

/**
 * Apply loading state visual indicators
 */
export function applyLoadingState(element: HTMLElement): void {
  synchronizeVisualState(element, 'loading');
}

/**
 * Apply disabled state visual indicators
 */
export function applyDisabledState(element: HTMLElement): void {
  synchronizeVisualState(element, 'disabled');
}

/**
 * Apply error state visual indicators
 */
export function applyErrorState(element: HTMLElement): void {
  synchronizeVisualState(element, 'error');
}

/**
 * Apply success state visual indicators
 */
export function applySuccessState(element: HTMLElement): void {
  synchronizeVisualState(element, 'success');
}

/**
 * Clear all state indicators and return to idle
 */
export function clearStateIndicators(element: HTMLElement): void {
  synchronizeVisualState(element, 'idle');
}

/**
 * Check if an element's visual state is consistent with its logical state
 */
export function isStateConsistent(
  element: HTMLElement,
  logicalState: ComponentState
): boolean {
  const visualState = extractVisualState(element);
  const result = validateStateConsistency(logicalState, visualState);
  return result.isConsistent;
}
