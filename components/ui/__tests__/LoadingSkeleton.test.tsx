/**
 * Unit Tests: LoadingSkeleton Component
 * 
 * Tests specific examples and edge cases for the LoadingSkeleton component.
 * Validates Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSkeleton, AvatarLoadingSkeleton } from '../LoadingSkeleton';

describe('LoadingSkeleton Component', () => {
  describe('Shimmer Animation Effect (Requirement 9.1)', () => {
    it('should apply shimmer animation by default', () => {
      const { container } = render(<LoadingSkeleton />);
      const skeleton = container.querySelector('[aria-busy="true"]');
      
      expect(skeleton).toBeTruthy();
      expect(skeleton?.className).toContain('animate-shimmer');
    });

    it('should render shimmer overlay element for shimmer animation', () => {
      const { container } = render(<LoadingSkeleton animation="shimmer" />);
      const shimmerOverlay = container.querySelector('.animate-shimmer-slide');
      
      expect(shimmerOverlay).toBeTruthy();
    });

    it('should apply pulse animation when specified', () => {
      const { container } = render(<LoadingSkeleton animation="pulse" />);
      const skeleton = container.querySelector('[aria-busy="true"]');
      
      expect(skeleton?.className).toContain('animate-pulse');
    });

    it('should apply wave animation when specified', () => {
      const { container } = render(<LoadingSkeleton animation="wave" />);
      const skeleton = container.querySelector('[aria-busy="true"]');
      
      expect(skeleton?.className).toContain('animate-wave');
    });
  });

  describe('Configurable Dimensions (Requirement 9.2)', () => {
    it('should support full width', () => {
      const { container } = render(<LoadingSkeleton width="full" height="2rem" />);
      const skeleton = container.querySelector('[aria-busy="true"]');
      
      expect(skeleton?.className).toContain('w-full');
    });

    it('should support custom width in pixels', () => {
      const { container } = render(<LoadingSkeleton width="200px" height="2rem" />);
      const skeleton = container.querySelector('[aria-busy="true"]') as HTMLElement;
      
      expect(skeleton?.style.width).toBe('200px');
    });

    it('should support custom width in percentage', () => {
      const { container } = render(<LoadingSkeleton width="50%" height="2rem" />);
      const skeleton = container.querySelector('[aria-busy="true"]') as HTMLElement;
      
      expect(skeleton?.style.width).toBe('50%');
    });

    it('should support custom height', () => {
      const { container } = render(<LoadingSkeleton width="full" height="100px" />);
      const skeleton = container.querySelector('[aria-busy="true"]') as HTMLElement;
      
      expect(skeleton?.style.height).toBe('100px');
    });

    it('should render multiple skeleton elements when count > 1', () => {
      const { container } = render(<LoadingSkeleton count={3} />);
      const skeletons = container.querySelectorAll('[aria-busy="true"]');
      
      expect(skeletons.length).toBe(3);
    });

    it('should wrap multiple skeletons in a container with spacing', () => {
      const { container } = render(<LoadingSkeleton count={3} />);
      const wrapper = container.querySelector('.space-y-3');
      
      expect(wrapper).toBeTruthy();
      expect(wrapper?.children.length).toBe(3);
    });
  });

  describe('Gradient Backgrounds (Requirement 9.3)', () => {
    it('should apply gradient background from gray-200 to gray-300 in light mode', () => {
      const { container } = render(<LoadingSkeleton />);
      const skeleton = container.querySelector('[aria-busy="true"]');
      
      expect(skeleton?.className).toContain('bg-gradient-to-br');
      expect(skeleton?.className).toContain('from-gray-200');
      expect(skeleton?.className).toContain('to-gray-300');
    });

    it('should apply gradient background from gray-700 to gray-800 in dark mode', () => {
      const { container } = render(<LoadingSkeleton />);
      const skeleton = container.querySelector('[aria-busy="true"]');
      
      expect(skeleton?.className).toContain('dark:from-gray-700');
      expect(skeleton?.className).toContain('dark:to-gray-800');
    });
  });

  describe('Accessibility Attributes (Requirements 9.4, 9.5)', () => {
    it('should include aria-busy="true"', () => {
      const { container } = render(<LoadingSkeleton />);
      const skeleton = container.querySelector('[aria-busy="true"]');
      
      expect(skeleton).toBeTruthy();
      expect(skeleton?.getAttribute('aria-busy')).toBe('true');
    });

    it('should include default aria-label', () => {
      const { container } = render(<LoadingSkeleton />);
      const skeleton = container.querySelector('[aria-label]');
      
      expect(skeleton?.getAttribute('aria-label')).toBe('Loading content');
    });

    it('should support custom aria-label', () => {
      const { container } = render(<LoadingSkeleton ariaLabel="Loading avatar" />);
      const skeleton = container.querySelector('[aria-label]');
      
      expect(skeleton?.getAttribute('aria-label')).toBe('Loading avatar');
    });

    it('should include role="status" for screen readers', () => {
      const { container } = render(<LoadingSkeleton />);
      const skeleton = container.querySelector('[role="status"]');
      
      expect(skeleton).toBeTruthy();
    });
  });

  describe('Prefers-Reduced-Motion Support (Requirement 9.6)', () => {
    let originalMatchMedia: typeof window.matchMedia;

    beforeEach(() => {
      originalMatchMedia = window.matchMedia;
    });

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    it('should disable shimmer animation when prefers-reduced-motion is enabled', () => {
      // Mock matchMedia to return prefers-reduced-motion: reduce
      window.matchMedia = (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      });

      const { container } = render(<LoadingSkeleton animation="shimmer" />);
      const skeleton = container.querySelector('[aria-busy="true"]');
      
      // Should not have animation class
      expect(skeleton?.className).not.toContain('animate-shimmer');
      
      // Should not render shimmer overlay
      const shimmerOverlay = container.querySelector('.animate-shimmer-slide');
      expect(shimmerOverlay).toBeFalsy();
    });

    it('should enable shimmer animation when prefers-reduced-motion is not set', () => {
      // Mock matchMedia to return no preference
      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      });

      const { container } = render(<LoadingSkeleton animation="shimmer" />);
      const skeleton = container.querySelector('[aria-busy="true"]');
      
      // Should have animation class
      expect(skeleton?.className).toContain('animate-shimmer');
      
      // Should render shimmer overlay
      const shimmerOverlay = container.querySelector('.animate-shimmer-slide');
      expect(shimmerOverlay).toBeTruthy();
    });
  });

  describe('Variant Support (Requirement 9.7)', () => {
    it('should apply default variant with rounded-md', () => {
      const { container } = render(<LoadingSkeleton variant="default" />);
      const skeleton = container.querySelector('[aria-busy="true"]');
      
      expect(skeleton?.className).toContain('rounded-md');
    });

    it('should apply avatar variant with rounded-lg', () => {
      const { container } = render(<LoadingSkeleton variant="avatar" />);
      const skeleton = container.querySelector('[aria-busy="true"]');
      
      expect(skeleton?.className).toContain('rounded-lg');
    });

    it('should apply text variant with rounded', () => {
      const { container } = render(<LoadingSkeleton variant="text" />);
      const skeleton = container.querySelector('[aria-busy="true"]');
      
      expect(skeleton?.className).toContain('rounded');
    });

    it('should apply circle variant with rounded-full', () => {
      const { container } = render(<LoadingSkeleton variant="circle" />);
      const skeleton = container.querySelector('[aria-busy="true"]');
      
      expect(skeleton?.className).toContain('rounded-full');
    });
  });

  describe('AvatarLoadingSkeleton Component (Requirement 9.7)', () => {
    it('should render with avatar-specific preset dimensions', () => {
      const { container } = render(<AvatarLoadingSkeleton />);
      const skeleton = container.querySelector('[aria-busy="true"]') as HTMLElement;
      
      expect(skeleton).toBeTruthy();
      expect(skeleton?.className).toContain('w-full');
      expect(skeleton?.style.height).toBe('600px');
    });

    it('should use avatar variant', () => {
      const { container } = render(<AvatarLoadingSkeleton />);
      const skeleton = container.querySelector('[aria-busy="true"]');
      
      expect(skeleton?.className).toContain('rounded-lg');
    });

    it('should use shimmer animation', () => {
      const { container } = render(<AvatarLoadingSkeleton />);
      const skeleton = container.querySelector('[aria-busy="true"]');
      
      expect(skeleton?.className).toContain('animate-shimmer');
    });

    it('should have descriptive aria-label for avatar', () => {
      const { container } = render(<AvatarLoadingSkeleton />);
      const skeleton = container.querySelector('[aria-label]');
      
      expect(skeleton?.getAttribute('aria-label')).toBe('Loading avatar');
    });

    it('should support custom className', () => {
      const { container } = render(<AvatarLoadingSkeleton className="custom-class" />);
      const skeleton = container.querySelector('[aria-busy="true"]');
      
      expect(skeleton?.className).toContain('custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('should handle count of 1 without wrapper', () => {
      const { container } = render(<LoadingSkeleton count={1} />);
      const wrapper = container.querySelector('.space-y-3');
      
      // Should not have wrapper for single skeleton
      expect(wrapper).toBeFalsy();
    });

    it('should handle empty className', () => {
      const { container } = render(<LoadingSkeleton className="" />);
      const skeleton = container.querySelector('[aria-busy="true"]');
      
      expect(skeleton).toBeTruthy();
    });

    it('should apply custom className alongside default classes', () => {
      const { container } = render(<LoadingSkeleton className="my-custom-class" />);
      const skeleton = container.querySelector('[aria-busy="true"]');
      
      expect(skeleton?.className).toContain('my-custom-class');
      expect(skeleton?.className).toContain('bg-gradient-to-br');
    });
  });

  describe('Visual Structure', () => {
    it('should have proper structure for shimmer effect', () => {
      const { container } = render(<LoadingSkeleton />);
      const skeleton = container.querySelector('[aria-busy="true"]');
      
      // Check that skeleton element exists and has gradient classes
      expect(skeleton).toBeTruthy();
      expect(skeleton?.className).toMatch(/bg-gradient-to-br/);
    });

    it('should render shimmer overlay with proper gradient', () => {
      const { container } = render(<LoadingSkeleton animation="shimmer" />);
      const shimmerOverlay = container.querySelector('.animate-shimmer-slide');
      
      // Check shimmer overlay exists and has gradient
      expect(shimmerOverlay).toBeTruthy();
      expect(shimmerOverlay?.className).toMatch(/bg-gradient-to-r/);
    });
  });
});
