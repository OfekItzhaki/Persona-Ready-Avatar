/**
 * Property Test: State Consistency
 * 
 * **Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5**
 * 
 * For any stateful component, the visual state must always match the logical state
 * (loading, disabled, error states must be visually distinct).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import {
  ComponentState,
  getExpectedVisualState,
  extractVisualState,
  validateStateConsistency,
  synchronizeVisualState,
  createStateValidator,
  applyLoadingState,
  applyDisabledState,
  applyErrorState,
  applySuccessState,
  clearStateIndicators,
  isStateConsistent,
} from '../state-consistency';

describe('Property: State Consistency', () => {
  let testElement: HTMLElement;

  beforeEach(() => {
    // Create a test element
    testElement = document.createElement('button');
    testElement.textContent = 'Test Button';
    document.body.appendChild(testElement);
  });

  afterEach(() => {
    // Clean up
    if (testElement && testElement.parentNode) {
      testElement.parentNode.removeChild(testElement);
    }
  });

  it('should ensure visual state always matches logical state for all states', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ComponentState>('idle', 'loading', 'disabled', 'error', 'success'),
        (state) => {
          // Synchronize visual state with logical state
          synchronizeVisualState(testElement, state);

          // Extract visual state
          const visualState = extractVisualState(testElement);

          // Validate consistency
          const result = validateStateConsistency(state, visualState);

          // Visual state must match logical state
          expect(result.isConsistent).toBe(true);
          expect(result.inconsistencies).toHaveLength(0);

          // Verify expected visual indicators are applied
          const expected = getExpectedVisualState(state);
          
          if (expected.opacity !== undefined) {
            expect(Math.abs(visualState.opacity! - expected.opacity)).toBeLessThan(0.01);
          }

          if (expected.cursor) {
            expect(visualState.cursor).toBe(expected.cursor);
          }

          if (expected.pointerEvents) {
            expect(visualState.pointerEvents).toBe(expected.pointerEvents);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain state consistency through multiple state transitions', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom<ComponentState>('idle', 'loading', 'disabled', 'error', 'success'),
          { minLength: 2, maxLength: 10 }
        ),
        (states) => {
          // Apply each state in sequence
          for (const state of states) {
            synchronizeVisualState(testElement, state);
            
            // After each transition, visual state must match logical state
            const visualState = extractVisualState(testElement);
            const result = validateStateConsistency(state, visualState);
            
            expect(result.isConsistent).toBe(true);
            expect(result.inconsistencies).toHaveLength(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should apply correct visual indicators for loading state', () => {
    fc.assert(
      fc.property(
        fc.constant('loading' as ComponentState),
        (state) => {
          applyLoadingState(testElement);

          const visualState = extractVisualState(testElement);
          const expected = getExpectedVisualState(state);

          // Loading state must have reduced opacity
          expect(visualState.opacity).toBeCloseTo(expected.opacity!, 2);

          // Loading state must have wait cursor
          expect(visualState.cursor).toBe('wait');

          // Loading state must disable pointer events
          expect(visualState.pointerEvents).toBe('none');

          // Loading state must have aria-busy
          expect(testElement.getAttribute('aria-busy')).toBe('true');
          expect(testElement.getAttribute('aria-disabled')).toBe('true');

          // Loading state must have state class
          expect(testElement.classList.contains('state-loading')).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should apply correct visual indicators for disabled state', () => {
    fc.assert(
      fc.property(
        fc.constant('disabled' as ComponentState),
        (state) => {
          applyDisabledState(testElement);

          const visualState = extractVisualState(testElement);
          const expected = getExpectedVisualState(state);

          // Disabled state must have reduced opacity
          expect(visualState.opacity).toBeCloseTo(expected.opacity!, 2);

          // Disabled state must have not-allowed cursor
          expect(visualState.cursor).toBe('not-allowed');

          // Disabled state must disable pointer events
          expect(visualState.pointerEvents).toBe('none');

          // Disabled state must have aria-disabled
          expect(testElement.getAttribute('aria-disabled')).toBe('true');
          expect(testElement.getAttribute('aria-busy')).toBeNull();

          // Disabled state must have state class
          expect(testElement.classList.contains('state-disabled')).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should apply correct visual indicators for error state', () => {
    fc.assert(
      fc.property(
        fc.constant('error' as ComponentState),
        () => {
          applyErrorState(testElement);

          // Error state must have aria-invalid
          expect(testElement.getAttribute('aria-invalid')).toBe('true');
          expect(testElement.getAttribute('aria-busy')).toBeNull();
          expect(testElement.getAttribute('aria-disabled')).toBeNull();

          // Error state must have state class
          expect(testElement.classList.contains('state-error')).toBe(true);

          // Error state must be interactive (not disabled)
          const visualState = extractVisualState(testElement);
          expect(visualState.pointerEvents).not.toBe('none');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should apply correct visual indicators for success state', () => {
    fc.assert(
      fc.property(
        fc.constant('success' as ComponentState),
        () => {
          applySuccessState(testElement);

          // Success state must not have error/busy/disabled attributes
          expect(testElement.getAttribute('aria-invalid')).toBeNull();
          expect(testElement.getAttribute('aria-busy')).toBeNull();
          expect(testElement.getAttribute('aria-disabled')).toBeNull();

          // Success state must have state class
          expect(testElement.classList.contains('state-success')).toBe(true);

          // Success state must be interactive
          const visualState = extractVisualState(testElement);
          expect(visualState.pointerEvents).not.toBe('none');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should clear all state indicators when returning to idle', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ComponentState>('loading', 'disabled', 'error', 'success'),
        (initialState) => {
          // Apply initial state
          synchronizeVisualState(testElement, initialState);

          // Clear state indicators
          clearStateIndicators(testElement);

          // Should return to idle state
          const visualState = extractVisualState(testElement);
          const expected = getExpectedVisualState('idle');

          expect(visualState.opacity).toBeCloseTo(expected.opacity!, 2);
          expect(testElement.getAttribute('aria-busy')).toBeNull();
          expect(testElement.getAttribute('aria-disabled')).toBeNull();
          expect(testElement.getAttribute('aria-invalid')).toBeNull();
          expect(testElement.classList.contains('state-idle')).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should validate state consistency correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ComponentState>('idle', 'loading', 'disabled', 'error', 'success'),
        (state) => {
          // Apply state
          synchronizeVisualState(testElement, state);

          // Validate using helper function
          const isConsistent = isStateConsistent(testElement, state);

          // Should be consistent
          expect(isConsistent).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should detect inconsistencies when visual state does not match logical state', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.constantFrom<ComponentState>('loading', 'disabled'),
          fc.constantFrom<ComponentState>('idle', 'error', 'success')
        ),
        ([appliedState, claimedState]) => {
          // Apply one state (loading or disabled - both have distinct visual properties)
          synchronizeVisualState(testElement, appliedState);

          // But claim it's a different state (idle, error, or success - different visual properties)
          const visualState = extractVisualState(testElement);
          const result = validateStateConsistency(claimedState, visualState);

          // Should detect inconsistency because loading/disabled have distinct opacity and cursor
          const appliedExpected = getExpectedVisualState(appliedState);
          const claimedExpected = getExpectedVisualState(claimedState);

          // These states have different visual properties, so should detect inconsistency
          expect(appliedExpected.opacity).not.toBe(claimedExpected.opacity);
          expect(result.isConsistent).toBe(false);
          expect(result.inconsistencies.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should maintain consistency with state validator', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom<ComponentState>('idle', 'loading', 'disabled', 'error', 'success'),
          { minLength: 1, maxLength: 10 }
        ),
        (states) => {
          const validator = createStateValidator(testElement);

          // Apply each state through validator
          for (const state of states) {
            const result = validator.setState(state);

            // Each state change should maintain consistency
            expect(result.isConsistent).toBe(true);
            expect(result.inconsistencies).toHaveLength(0);

            // Validator should track current state
            expect(validator.getState()).toBe(state);

            // Validation should confirm consistency
            const validationResult = validator.validate();
            expect(validationResult.isConsistent).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should ensure loading and disabled states are visually distinct', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          // Apply loading state
          applyLoadingState(testElement);
          const loadingVisual = extractVisualState(testElement);
          const loadingClass = testElement.className;
          const loadingAria = testElement.getAttribute('aria-busy');

          // Apply disabled state
          applyDisabledState(testElement);
          const disabledVisual = extractVisualState(testElement);
          const disabledClass = testElement.className;
          const disabledAria = testElement.getAttribute('aria-busy');

          // States must be visually distinct
          // Different cursors
          expect(loadingVisual.cursor).not.toBe(disabledVisual.cursor);

          // Different classes
          expect(loadingClass).not.toBe(disabledClass);

          // Different ARIA attributes
          expect(loadingAria).not.toBe(disabledAria);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should ensure error and success states are visually distinct', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          // Apply error state
          applyErrorState(testElement);
          const errorClass = testElement.className;
          const errorAria = testElement.getAttribute('aria-invalid');

          // Apply success state
          applySuccessState(testElement);
          const successClass = testElement.className;
          const successAria = testElement.getAttribute('aria-invalid');

          // States must be visually distinct
          // Different classes
          expect(errorClass).not.toBe(successClass);

          // Different ARIA attributes
          expect(errorAria).not.toBe(successAria);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should immediately update visual state when logical state changes', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.constantFrom<ComponentState>('idle', 'loading', 'disabled', 'error', 'success'),
          fc.constantFrom<ComponentState>('idle', 'loading', 'disabled', 'error', 'success')
        ),
        ([state1, state2]) => {
          // Apply first state
          synchronizeVisualState(testElement, state1);
          const class1 = testElement.className;

          // Apply second state
          synchronizeVisualState(testElement, state2);
          const visual2 = extractVisualState(testElement);
          const class2 = testElement.className;

          // If states are different, class should change
          if (state1 !== state2) {
            expect(class1).not.toBe(class2);
            
            const expected1 = getExpectedVisualState(state1);
            const expected2 = getExpectedVisualState(state2);

            // If expected visuals differ in measurable ways, actual visuals should differ
            if (expected1.opacity !== expected2.opacity) {
              expect(Math.abs(visual2.opacity! - expected2.opacity!)).toBeLessThan(0.01);
            }
            if (expected1.cursor !== expected2.cursor && expected2.cursor) {
              expect(visual2.cursor).toBe(expected2.cursor);
            }
          }

          // Visual state should always match current logical state
          const result = validateStateConsistency(state2, visual2);
          expect(result.isConsistent).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
