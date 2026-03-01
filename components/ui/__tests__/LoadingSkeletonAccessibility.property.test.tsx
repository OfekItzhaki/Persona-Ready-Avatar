/**
 * Property-Based Test: Loading Skeleton Accessibility
 * 
 * **Validates: Requirements 9.4, 9.5**
 * 
 * Property 15: Loading Skeleton Accessibility
 * For any loading skeleton, it must include aria-busy="true" and a descriptive aria-label.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import fc from 'fast-check';
import { LoadingSkeleton } from '../LoadingSkeleton';

describe('Property 15: Loading Skeleton Accessibility', () => {
  it('should always include aria-busy="true" for any configuration', () => {
    fc.assert(
      fc.property(
        fc.record({
          width: fc.oneof(
            fc.constant('full'),
            fc.constantFrom('100px', '200px', '50%', '10rem')
          ),
          height: fc.constantFrom('1rem', '2rem', '100px', '200px'),
          count: fc.integer({ min: 1, max: 5 }),
          animation: fc.constantFrom('pulse', 'wave', 'shimmer'),
          variant: fc.constantFrom('default', 'avatar', 'text', 'circle'),
        }),
        (config) => {
          const { container } = render(
            <LoadingSkeleton
              width={config.width}
              height={config.height}
              count={config.count}
              animation={config.animation}
              variant={config.variant}
            />
          );

          // Find all elements with aria-busy attribute
          const skeletonElements = container.querySelectorAll('[aria-busy]');
          
          // Should have exactly count number of skeleton elements
          expect(skeletonElements.length).toBe(config.count);
          
          // Each skeleton element must have aria-busy="true"
          skeletonElements.forEach((element) => {
            expect(element.getAttribute('aria-busy')).toBe('true');
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should always include descriptive aria-label for any configuration', () => {
    fc.assert(
      fc.property(
        fc.record({
          width: fc.oneof(
            fc.constant('full'),
            fc.constantFrom('100px', '200px', '50%')
          ),
          height: fc.constantFrom('1rem', '2rem', '100px'),
          count: fc.integer({ min: 1, max: 5 }),
          ariaLabel: fc.oneof(
            fc.constant(undefined), // Test default label
            fc.constantFrom(
              'Loading content',
              'Loading avatar',
              'Loading messages',
              'Loading profile'
            )
          ),
        }),
        (config) => {
          const { container } = render(
            <LoadingSkeleton
              width={config.width}
              height={config.height}
              count={config.count}
              ariaLabel={config.ariaLabel}
            />
          );

          // Find all elements with aria-label attribute
          const skeletonElements = container.querySelectorAll('[aria-label]');
          
          // Should have exactly count number of skeleton elements with aria-label
          expect(skeletonElements.length).toBe(config.count);
          
          // Each skeleton element must have a non-empty aria-label
          skeletonElements.forEach((element) => {
            const label = element.getAttribute('aria-label');
            expect(label).toBeTruthy();
            expect(label!.length).toBeGreaterThan(0);
            
            // If custom label provided, it should match
            if (config.ariaLabel) {
              expect(label).toBe(config.ariaLabel);
            } else {
              // Default label should be 'Loading content'
              expect(label).toBe('Loading content');
            }
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should include role="status" for screen reader announcements', () => {
    fc.assert(
      fc.property(
        fc.record({
          count: fc.integer({ min: 1, max: 5 }),
          variant: fc.constantFrom('default', 'avatar', 'text', 'circle'),
        }),
        (config) => {
          const { container } = render(
            <LoadingSkeleton
              count={config.count}
              variant={config.variant}
            />
          );

          // Find all elements with role="status"
          const statusElements = container.querySelectorAll('[role="status"]');
          
          // Should have exactly count number of elements with role="status"
          expect(statusElements.length).toBe(config.count);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should maintain accessibility attributes regardless of animation type', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('pulse', 'wave', 'shimmer'),
        (animation) => {
          const { container } = render(
            <LoadingSkeleton
              animation={animation}
              ariaLabel="Test loading"
            />
          );

          const skeletonElement = container.querySelector('[aria-busy]');
          
          expect(skeletonElement).toBeTruthy();
          expect(skeletonElement!.getAttribute('aria-busy')).toBe('true');
          expect(skeletonElement!.getAttribute('aria-label')).toBe('Test loading');
          expect(skeletonElement!.getAttribute('role')).toBe('status');
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should maintain accessibility when prefers-reduced-motion is enabled', () => {
    // Mock matchMedia for prefers-reduced-motion
    const originalMatchMedia = window.matchMedia;
    
    fc.assert(
      fc.property(
        fc.boolean(),
        (prefersReducedMotion) => {
          // Mock matchMedia
          window.matchMedia = (query: string) => ({
            matches: query === '(prefers-reduced-motion: reduce)' ? prefersReducedMotion : false,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
          });

          const { container } = render(
            <LoadingSkeleton
              animation="shimmer"
              ariaLabel="Loading with motion preference"
            />
          );

          const skeletonElement = container.querySelector('[aria-busy]');
          
          // Accessibility attributes should be present regardless of motion preference
          expect(skeletonElement).toBeTruthy();
          expect(skeletonElement!.getAttribute('aria-busy')).toBe('true');
          expect(skeletonElement!.getAttribute('aria-label')).toBe('Loading with motion preference');
          expect(skeletonElement!.getAttribute('role')).toBe('status');
        }
      ),
      { numRuns: 20 }
    );
    
    // Restore original matchMedia
    window.matchMedia = originalMatchMedia;
  });
});
