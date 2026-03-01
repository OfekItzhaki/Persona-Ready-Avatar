/**
 * Property-Based Test: Button State Visual Feedback
 * 
 * **Validates: Requirements 4.3, 4.4**
 * 
 * Property 10: Button State Visual Feedback
 * For any button in loading or disabled state, the button must display appropriate
 * visual feedback and be non-interactive.
 * 
 * This test validates that:
 * 1. When a button is in loading state, it displays a loading spinner and is non-interactive (Req 4.3)
 * 2. When a button is disabled, it has reduced opacity and is non-interactive (Req 4.4)
 */

import { describe, expect, vi } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import { render, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, ButtonProps } from '../Button';

describe('Property 10: Button State Visual Feedback', () => {
  /**
   * Property: For any button variant and size in loading state,
   * the button must display a loading spinner and be non-interactive
   */
  test.prop([
    fc.constantFrom<ButtonProps['variant']>('primary', 'secondary', 'ghost', 'danger'),
    fc.constantFrom<ButtonProps['size']>('sm', 'md', 'lg'),
  ])('displays loading spinner and is non-interactive when loading', async (variant, size) => {
    const handleClick = vi.fn();
    
    const { container } = render(
      <Button
        variant={variant}
        size={size}
        loading={true}
        onClick={handleClick}
      >
        Test Button
      </Button>
    );

    const button = container.querySelector('button');
    expect(button).toBeInTheDocument();

    // Requirement 4.3: When a button is in loading state, it SHALL display a loading spinner
    const spinner = button?.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner?.classList.contains('animate-spin')).toBe(true);

    // Verify spinner size matches button size
    const expectedSizeClass = size === 'sm' ? 'w-3' : size === 'md' ? 'w-4' : 'w-5';
    expect(spinner?.classList.contains(expectedSizeClass)).toBe(true);

    // Requirement 4.3: When a button is in loading state, it SHALL be non-interactive
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-disabled', 'true');

    // Verify button is truly non-interactive by attempting to click
    if (button) {
      await userEvent.click(button);
    }
    expect(handleClick).not.toHaveBeenCalled();
    
    cleanup();
  });

  /**
   * Property: For any button variant and size in disabled state,
   * the button must have reduced opacity and be non-interactive
   */
  test.prop([
    fc.constantFrom<ButtonProps['variant']>('primary', 'secondary', 'ghost', 'danger'),
    fc.constantFrom<ButtonProps['size']>('sm', 'md', 'lg'),
  ])('has reduced opacity and is non-interactive when disabled', async (variant, size) => {
    const handleClick = vi.fn();
    
    const { container } = render(
      <Button
        variant={variant}
        size={size}
        disabled={true}
        onClick={handleClick}
      >
        Test Button
      </Button>
    );

    const button = container.querySelector('button');
    expect(button).toBeInTheDocument();

    // Requirement 4.4: When a button is disabled, it SHALL have reduced opacity
    expect(button?.className).toContain('opacity-60');

    // Requirement 4.4: When a button is disabled, it SHALL be non-interactive
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');

    // Verify button is truly non-interactive by attempting to click
    if (button) {
      await userEvent.click(button);
    }
    expect(handleClick).not.toHaveBeenCalled();
    
    cleanup();
  });

  /**
   * Property: For any button in loading state, icons should not be displayed
   * (replaced by spinner)
   */
  test.prop([
    fc.constantFrom<ButtonProps['variant']>('primary', 'secondary', 'ghost', 'danger'),
    fc.constantFrom<ButtonProps['size']>('sm', 'md', 'lg'),
    fc.constantFrom<ButtonProps['iconPosition']>('left', 'right'),
  ])('replaces icon with spinner when loading', (variant, size, iconPosition) => {
    const icon = <span data-testid="test-icon">Icon</span>;
    
    const { container } = render(
      <Button
        variant={variant}
        size={size}
        loading={true}
        icon={icon}
        iconPosition={iconPosition}
      >
        Test Button
      </Button>
    );

    const button = container.querySelector('button');

    // Spinner should be present
    const spinner = button?.querySelector('svg.animate-spin');
    expect(spinner).toBeInTheDocument();

    // Icon should not be present (replaced by spinner)
    const iconElement = container.querySelector('[data-testid="test-icon"]');
    expect(iconElement).not.toBeInTheDocument();
    
    cleanup();
  });

  /**
   * Property: For any button, both loading and disabled states should result
   * in non-interactive behavior
   */
  test.prop([
    fc.constantFrom<ButtonProps['variant']>('primary', 'secondary', 'ghost', 'danger'),
    fc.constantFrom<ButtonProps['size']>('sm', 'md', 'lg'),
    fc.boolean(),
    fc.boolean(),
  ])('is non-interactive when either loading or disabled', async (variant, size, loading, disabled) => {
    // Skip case where both are false (button would be interactive)
    if (!loading && !disabled) {
      return;
    }

    const handleClick = vi.fn();
    
    const { container } = render(
      <Button
        variant={variant}
        size={size}
        loading={loading}
        disabled={disabled}
        onClick={handleClick}
      >
        Test Button
      </Button>
    );

    const button = container.querySelector('button');

    // Button must be disabled
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');

    // Button must not respond to clicks
    if (button) {
      await userEvent.click(button);
    }
    expect(handleClick).not.toHaveBeenCalled();

    // If loading, must show spinner
    if (loading) {
      const spinner = button?.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-busy', 'true');
    }

    // If disabled (and not loading), must have reduced opacity
    if (disabled) {
      expect(button?.className).toContain('opacity-60');
    }
    
    cleanup();
  });

  /**
   * Property: For any button variant in loading state, hover effects should be disabled
   */
  test.prop([
    fc.constantFrom<ButtonProps['variant']>('primary', 'secondary', 'ghost', 'danger'),
    fc.constantFrom<ButtonProps['size']>('sm', 'md', 'lg'),
  ])('disables hover effects when loading', (variant, size) => {
    const { container } = render(
      <Button
        variant={variant}
        size={size}
        loading={true}
      >
        Test Button
      </Button>
    );

    const button = container.querySelector('button');

    // Verify disabled hover classes are present
    expect(button?.className).toContain('disabled:hover:scale-100');
    
    // For ghost variant, verify background doesn't change on hover when disabled
    if (variant === 'ghost') {
      expect(button?.className).toContain('disabled:hover:bg-transparent');
    } else {
      expect(button?.className).toContain('disabled:hover:shadow-none');
    }
    
    cleanup();
  });

  /**
   * Property: For any button variant in disabled state, hover effects should be disabled
   */
  test.prop([
    fc.constantFrom<ButtonProps['variant']>('primary', 'secondary', 'ghost', 'danger'),
    fc.constantFrom<ButtonProps['size']>('sm', 'md', 'lg'),
  ])('disables hover effects when disabled', (variant, size) => {
    const { container } = render(
      <Button
        variant={variant}
        size={size}
        disabled={true}
      >
        Test Button
      </Button>
    );

    const button = container.querySelector('button');

    // Verify disabled hover classes are present
    expect(button?.className).toContain('disabled:hover:scale-100');
    
    // For ghost variant, verify background doesn't change on hover when disabled
    if (variant === 'ghost') {
      expect(button?.className).toContain('disabled:hover:bg-transparent');
    } else {
      expect(button?.className).toContain('disabled:hover:shadow-none');
    }
    
    cleanup();
  });

  /**
   * Property: For any button with fullWidth in loading or disabled state,
   * the button must maintain full width while being non-interactive
   */
  test.prop([
    fc.constantFrom<ButtonProps['variant']>('primary', 'secondary', 'ghost', 'danger'),
    fc.constantFrom<ButtonProps['size']>('sm', 'md', 'lg'),
    fc.boolean(),
    fc.boolean(),
  ])('maintains full width when loading or disabled', (variant, size, loading, disabled) => {
    // Skip case where both are false
    if (!loading && !disabled) {
      return;
    }

    const { container } = render(
      <Button
        variant={variant}
        size={size}
        loading={loading}
        disabled={disabled}
        fullWidth={true}
      >
        Test Button
      </Button>
    );

    const button = container.querySelector('button');

    // Must maintain full width
    expect(button?.className).toContain('w-full');

    // Must be non-interactive
    expect(button).toBeDisabled();
    
    cleanup();
  });

  /**
   * Property: For any button in loading state, aria-busy must be true
   */
  test.prop([
    fc.constantFrom<ButtonProps['variant']>('primary', 'secondary', 'ghost', 'danger'),
    fc.constantFrom<ButtonProps['size']>('sm', 'md', 'lg'),
  ])('sets aria-busy when loading', (variant, size) => {
    const { container } = render(
      <Button
        variant={variant}
        size={size}
        loading={true}
      >
        Test Button
      </Button>
    );

    const button = container.querySelector('button');

    // Requirement 4.3: Loading state must be communicated to assistive technologies
    expect(button).toHaveAttribute('aria-busy', 'true');
    
    cleanup();
  });

  /**
   * Property: For any button not in loading state, aria-busy should be false
   */
  test.prop([
    fc.constantFrom<ButtonProps['variant']>('primary', 'secondary', 'ghost', 'danger'),
    fc.constantFrom<ButtonProps['size']>('sm', 'md', 'lg'),
    fc.boolean(),
  ])('sets aria-busy to false when not loading', (variant, size, disabled) => {
    const { container } = render(
      <Button
        variant={variant}
        size={size}
        loading={false}
        disabled={disabled}
      >
        Test Button
      </Button>
    );

    const button = container.querySelector('button');

    // aria-busy should be false when not loading
    expect(button).toHaveAttribute('aria-busy', 'false');
    
    cleanup();
  });
});
