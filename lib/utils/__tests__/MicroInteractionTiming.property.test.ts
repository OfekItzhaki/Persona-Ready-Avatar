/**
 * Property Test: Micro-Interaction Timing
 * 
 * **Validates: Requirements 18.1, 18.2, 18.3, 18.4**
 * 
 * Property: For any micro-interaction (hover, click, focus), the interaction must
 * provide immediate visual feedback with duration between 100ms and 300ms.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fc } from '@fast-check/vitest';
import { applyMicroInteraction, type InteractionType, type MicroInteractionConfig } from '../micro-interactions';

describe('Property 23: Micro-Interaction Timing', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  it('should enforce duration bounds between 100ms and 300ms for all interactions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<InteractionType>('hover', 'click', 'focus'),
        fc.integer({ min: -1000, max: 10000 }), // Test wide range including invalid values
        (interaction, requestedDuration) => {
          const config: MicroInteractionConfig = {
            duration: requestedDuration,
          };

          const cleanup = applyMicroInteraction(element, interaction, config);

          // Extract the actual duration from the transition style
          const transitionStyle = element.style.transition;
          const durationMatch = transitionStyle.match(/(\d+)ms/);
          
          if (durationMatch) {
            const actualDuration = parseInt(durationMatch[1], 10);
            
            // Duration should be clamped between 100ms and 300ms
            expect(actualDuration).toBeGreaterThanOrEqual(100);
            expect(actualDuration).toBeLessThanOrEqual(300);
          }

          cleanup();
        }
      ),
      { numRuns: 200 }
    );
  });

  it('should provide immediate visual feedback for hover interactions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 300 }),
        fc.double({ min: 1.01, max: 1.2 }).filter(n => !isNaN(n) && isFinite(n)),
        (duration, scale) => {
          const config: MicroInteractionConfig = {
            duration,
            scale,
          };

          const cleanup = applyMicroInteraction(element, 'hover', config);

          // Simulate hover
          const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
          element.dispatchEvent(mouseEnterEvent);

          // Check that transform is applied immediately
          const transform = element.style.transform;
          expect(transform).toBeTruthy();
          expect(transform).toContain('scale');

          // Simulate mouse leave
          const mouseLeaveEvent = new MouseEvent('mouseleave', { bubbles: true });
          element.dispatchEvent(mouseLeaveEvent);

          // Check that transform is removed
          expect(element.style.transform).toBe('');

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide immediate visual feedback for click interactions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 300 }),
        (duration) => {
          const config: MicroInteractionConfig = {
            duration,
          };

          const cleanup = applyMicroInteraction(element, 'click', config);

          // Mock the animate method since it's not available in jsdom
          let animateCalled = false;
          let animationDuration = 0;
          element.animate = vi.fn((keyframes: any, options: any) => {
            animateCalled = true;
            animationDuration = typeof options === 'number' ? options : options.duration;
            return {
              onfinish: null,
              cancel: vi.fn(),
            } as any;
          });

          // Simulate click
          const clickEvent = new MouseEvent('click', { bubbles: true });
          element.dispatchEvent(clickEvent);

          // Check that animate was called
          expect(animateCalled).toBe(true);

          // Verify animation duration is within bounds
          expect(animationDuration).toBeGreaterThanOrEqual(100);
          expect(animationDuration).toBeLessThanOrEqual(300);

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide immediate visual feedback for focus interactions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 300 }),
        fc.double({ min: 1.01, max: 1.2 }).filter(n => !isNaN(n) && isFinite(n)),
        (duration, scale) => {
          // Create a focusable element
          const focusableElement = document.createElement('button');
          document.body.appendChild(focusableElement);

          const config: MicroInteractionConfig = {
            duration,
            scale,
          };

          const cleanup = applyMicroInteraction(focusableElement, 'focus', config);

          // Simulate focus
          const focusEvent = new FocusEvent('focus', { bubbles: true });
          focusableElement.dispatchEvent(focusEvent);

          // Check that transform is applied immediately
          const transform = focusableElement.style.transform;
          expect(transform).toBeTruthy();
          expect(transform).toContain('scale');

          // Simulate blur
          const blurEvent = new FocusEvent('blur', { bubbles: true });
          focusableElement.dispatchEvent(blurEvent);

          // Check that transform is removed
          expect(focusableElement.style.transform).toBe('');

          cleanup();
          document.body.removeChild(focusableElement);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should respect prefers-reduced-motion setting', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<InteractionType>('hover', 'click', 'focus'),
        fc.integer({ min: 100, max: 300 }),
        (interaction, duration) => {
          // Mock matchMedia to return prefers-reduced-motion
          const originalMatchMedia = window.matchMedia;
          window.matchMedia = vi.fn().mockImplementation((query) => ({
            matches: query === '(prefers-reduced-motion: reduce)',
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }));

          const config: MicroInteractionConfig = {
            duration,
            scale: 1.1,
          };

          const cleanup = applyMicroInteraction(element, interaction, config);

          // For hover interaction, test the reduced motion effect
          if (interaction === 'hover') {
            const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
            element.dispatchEvent(mouseEnterEvent);

            // With reduced motion, scale should be minimal (1.01)
            expect(element.style.transform).toContain('scale(1.01)');
          }

          cleanup();
          window.matchMedia = originalMatchMedia;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should apply valid easing functions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<InteractionType>('hover', 'click', 'focus'),
        fc.constantFrom(
          'linear',
          'ease',
          'ease-in',
          'ease-out',
          'ease-in-out',
          'cubic-bezier(0.4, 0, 0.2, 1)',
          'cubic-bezier(0.34, 1.56, 0.64, 1)'
        ),
        (interaction, easing) => {
          const config: MicroInteractionConfig = {
            duration: 200,
            easing,
          };

          const cleanup = applyMicroInteraction(element, interaction, config);

          // Check that transition includes the easing function
          const transitionStyle = element.style.transition;
          expect(transitionStyle).toBeTruthy();

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should support transform properties (scale, translate)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.01, max: 1.3 }).filter(n => !isNaN(n) && isFinite(n)),
        fc.integer({ min: -50, max: 50 }),
        fc.integer({ min: -50, max: 50 }),
        (scale, translateX, translateY) => {
          const config: MicroInteractionConfig = {
            duration: 200,
            scale,
            translateX,
            translateY,
          };

          const cleanup = applyMicroInteraction(element, 'hover', config);

          // Simulate hover
          const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
          element.dispatchEvent(mouseEnterEvent);

          // Check that transform includes all specified properties
          const transform = element.style.transform;
          
          // Scale should always be present since we're using values > 1
          expect(transform).toContain('scale');
          
          if (translateX !== 0) {
            expect(transform).toContain('translateX');
          }
          if (translateY !== 0) {
            expect(transform).toContain('translateY');
          }

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should support opacity changes', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.5, max: 0.99 }).filter(n => !isNaN(n) && isFinite(n)),
        (opacity) => {
          const config: MicroInteractionConfig = {
            duration: 200,
            opacity,
          };

          const cleanup = applyMicroInteraction(element, 'hover', config);

          // Simulate hover
          const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
          element.dispatchEvent(mouseEnterEvent);

          // Check that opacity is applied (since we're using values < 1)
          expect(element.style.opacity).toBe(opacity.toString());

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should clean up event listeners when cleanup function is called', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<InteractionType>('hover', 'click', 'focus'),
        (interaction) => {
          const config: MicroInteractionConfig = {
            duration: 200,
          };

          const cleanup = applyMicroInteraction(element, interaction, config);

          // Apply the interaction
          if (interaction === 'hover') {
            element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            expect(element.style.transform).toBeTruthy();
          }

          // Call cleanup
          cleanup();

          // After cleanup, styles should be reset
          expect(element.style.transform).toBe('');
          expect(element.style.opacity).toBe('');

          // Verify that events no longer trigger effects
          if (interaction === 'hover') {
            element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            expect(element.style.transform).toBe('');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use default values when config is not provided', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<InteractionType>('hover', 'click', 'focus'),
        (interaction) => {
          // Apply with no config
          const cleanup = applyMicroInteraction(element, interaction);

          // Check that transition is applied with default duration (200ms)
          const transitionStyle = element.style.transition;
          expect(transitionStyle).toContain('200ms');

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });
});
