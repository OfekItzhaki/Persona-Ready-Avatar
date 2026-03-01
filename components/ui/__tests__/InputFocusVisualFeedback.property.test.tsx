/**
 * Property-Based Test: Input Focus Visual Feedback
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
 * 
 * Property 14: Input Focus Visual Feedback
 * For any input field that receives focus, it must display a glowing border effect,
 * scale to 1.01, and show a focus ring.
 * 
 * This test validates that:
 * 1. When the input field receives focus, it displays a glowing border effect (Req 8.1)
 * 2. When the input field receives focus, it scales to 1.01 with smooth transition (Req 8.2)
 * 3. The input field has a 2px border that changes color on focus (gray to blue) (Req 8.3)
 * 4. The input field displays a 4px focus ring with 20% opacity (Req 8.4)
 */

import { describe, expect, vi } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { Input, InputProps } from '../Input';

describe('Property 14: Input Focus Visual Feedback', () => {
  /**
   * Property: For any input field that receives focus,
   * it must display a glowing border effect
   */
  test.prop([
    fc.boolean(), // autoResize
    fc.integer({ min: 1, max: 3 }), // minRows
    fc.integer({ min: 4, max: 10 }), // maxRows
  ])('displays glowing border effect on focus', (autoResize, minRows, maxRows) => {
    const { container } = render(
      <Input
        placeholder="Test input"
        autoResize={autoResize}
        minRows={minRows}
        maxRows={maxRows}
      />
    );

    const input = container.querySelector('textarea');
    expect(input).toBeInTheDocument();

    // Before focus - no glow effect
    let glowEffect = container.querySelector('.blur-sm.opacity-30');
    expect(glowEffect).not.toBeInTheDocument();

    // Focus the input
    if (input) {
      fireEvent.focus(input);
    }

    // Requirement 8.1: When the input field receives focus, it SHALL display a glowing border effect
    glowEffect = container.querySelector('.blur-sm.opacity-30');
    expect(glowEffect).toBeInTheDocument();

    // Verify glow effect has gradient
    const gradientGlow = container.querySelector('.bg-gradient-to-r.from-blue-500.to-purple-500');
    expect(gradientGlow).toBeInTheDocument();

    // Verify glow effect has blur
    expect(glowEffect?.classList.contains('blur-sm')).toBe(true);

    // Verify glow effect has correct opacity
    expect(glowEffect?.classList.contains('opacity-30')).toBe(true);

    // Verify glow effect has animation
    expect(glowEffect?.classList.contains('animate-pulse')).toBe(true);

    cleanup();
  });

  /**
   * Property: For any input field that receives focus,
   * it must scale to 1.01 with smooth transition
   */
  test.prop([
    fc.boolean(), // autoResize
    fc.integer({ min: 1, max: 3 }), // minRows
    fc.integer({ min: 4, max: 10 }), // maxRows
  ])('scales to 1.01 on focus with smooth transition', (autoResize, minRows, maxRows) => {
    const { container } = render(
      <Input
        placeholder="Test input"
        autoResize={autoResize}
        minRows={minRows}
        maxRows={maxRows}
      />
    );

    const input = container.querySelector('textarea');
    expect(input).toBeInTheDocument();

    // Before focus - scale 100
    expect(input?.classList.contains('scale-100')).toBe(true);

    // Focus the input
    if (input) {
      fireEvent.focus(input);
    }

    // Requirement 8.2: When the input field receives focus, it SHALL scale to 1.01 with smooth transition
    expect(input?.classList.contains('scale-[1.01]')).toBe(true);

    // Verify smooth transition is applied
    expect(input?.classList.contains('transition-all')).toBe(true);
    expect(input?.classList.contains('duration-200')).toBe(true);
    expect(input?.classList.contains('ease-in-out')).toBe(true);

    cleanup();
  });

  /**
   * Property: For any input field, the border must change from gray to blue on focus
   */
  test.prop([
    fc.boolean(), // autoResize
    fc.integer({ min: 1, max: 3 }), // minRows
    fc.integer({ min: 4, max: 10 }), // maxRows
  ])('changes border color from gray to blue on focus', (autoResize, minRows, maxRows) => {
    const { container } = render(
      <Input
        placeholder="Test input"
        autoResize={autoResize}
        minRows={minRows}
        maxRows={maxRows}
      />
    );

    const input = container.querySelector('textarea');
    expect(input).toBeInTheDocument();

    // Requirement 8.3: The input field SHALL have a 2px border that changes color on focus (gray to blue)
    // Before focus - gray border
    expect(input?.classList.contains('border-2')).toBe(true);
    expect(input?.classList.contains('border-gray-300')).toBe(true);

    // Focus the input
    if (input) {
      fireEvent.focus(input);
    }

    // After focus - blue border
    expect(input?.classList.contains('border-2')).toBe(true);
    expect(input?.classList.contains('border-blue-500')).toBe(true);

    cleanup();
  });

  /**
   * Property: For any input field that receives focus,
   * it must display a 4px focus ring with 20% opacity
   */
  test.prop([
    fc.boolean(), // autoResize
    fc.integer({ min: 1, max: 3 }), // minRows
    fc.integer({ min: 4, max: 10 }), // maxRows
  ])('displays 4px focus ring with 20% opacity', (autoResize, minRows, maxRows) => {
    const { container } = render(
      <Input
        placeholder="Test input"
        autoResize={autoResize}
        minRows={minRows}
        maxRows={maxRows}
      />
    );

    const input = container.querySelector('textarea');
    expect(input).toBeInTheDocument();

    // Requirement 8.4: The input field SHALL display a 4px focus ring with 20% opacity
    // Verify focus ring classes are present
    expect(input?.classList.contains('focus:ring-4')).toBe(true);
    expect(input?.classList.contains('focus:ring-blue-500/20')).toBe(true);

    cleanup();
  });

  /**
   * Property: For any input field with error state,
   * the border and focus ring should be red instead of blue
   */
  test.prop([
    fc.string({ minLength: 1, maxLength: 50 }), // error message
    fc.boolean(), // autoResize
  ])('displays red border and focus ring when error is present', (errorMessage, autoResize) => {
    const { container } = render(
      <Input
        placeholder="Test input"
        error={errorMessage}
        autoResize={autoResize}
      />
    );

    const input = container.querySelector('textarea');
    expect(input).toBeInTheDocument();

    // Error state - red border
    expect(input?.classList.contains('border-2')).toBe(true);
    expect(input?.classList.contains('border-red-500')).toBe(true);

    // Error state - red focus ring
    expect(input?.classList.contains('focus:ring-4')).toBe(true);
    expect(input?.classList.contains('focus:ring-red-500/20')).toBe(true);

    // Focus the input
    if (input) {
      fireEvent.focus(input);
    }

    // Glow effect should NOT be present when error is present
    const glowEffect = container.querySelector('.blur-sm.opacity-30');
    expect(glowEffect).not.toBeInTheDocument();

    cleanup();
  });

  /**
   * Property: For any disabled input field,
   * focus effects should not be applied
   */
  test.prop([
    fc.boolean(), // autoResize
    fc.integer({ min: 1, max: 3 }), // minRows
  ])('does not apply scale effect when disabled', (autoResize, minRows) => {
    const { container } = render(
      <Input
        placeholder="Test input"
        disabled={true}
        autoResize={autoResize}
        minRows={minRows}
      />
    );

    const input = container.querySelector('textarea');
    expect(input).toBeInTheDocument();

    // Focus the input (even though it's disabled)
    if (input) {
      fireEvent.focus(input);
    }

    // Should NOT scale when disabled
    expect(input?.classList.contains('scale-100')).toBe(true);
    expect(input?.classList.contains('scale-[1.01]')).toBe(false);

    // Glow effect should NOT be present when disabled
    const glowEffect = container.querySelector('.blur-sm.opacity-30');
    expect(glowEffect).not.toBeInTheDocument();

    cleanup();
  });

  /**
   * Property: For any input field, focus effects should be removed on blur
   */
  test.prop([
    fc.boolean(), // autoResize
    fc.integer({ min: 1, max: 3 }), // minRows
    fc.integer({ min: 4, max: 10 }), // maxRows
  ])('removes focus effects on blur', (autoResize, minRows, maxRows) => {
    const { container } = render(
      <Input
        placeholder="Test input"
        autoResize={autoResize}
        minRows={minRows}
        maxRows={maxRows}
      />
    );

    const input = container.querySelector('textarea');
    expect(input).toBeInTheDocument();

    // Focus the input
    if (input) {
      fireEvent.focus(input);
    }

    // Verify focus effects are present
    expect(input?.classList.contains('scale-[1.01]')).toBe(true);
    let glowEffect = container.querySelector('.blur-sm.opacity-30');
    expect(glowEffect).toBeInTheDocument();

    // Blur the input
    if (input) {
      fireEvent.blur(input);
    }

    // Verify focus effects are removed
    expect(input?.classList.contains('scale-100')).toBe(true);
    expect(input?.classList.contains('scale-[1.01]')).toBe(false);
    glowEffect = container.querySelector('.blur-sm.opacity-30');
    expect(glowEffect).not.toBeInTheDocument();

    cleanup();
  });

  /**
   * Property: For any input field with label,
   * focus effects should still work correctly
   */
  test.prop([
    fc.string({ minLength: 1, maxLength: 20 }), // label
    fc.boolean(), // required
    fc.boolean(), // autoResize
  ])('applies focus effects correctly with label', (label, required, autoResize) => {
    const { container } = render(
      <Input
        label={label}
        required={required}
        autoResize={autoResize}
        placeholder="Test input"
      />
    );

    const input = container.querySelector('textarea');
    expect(input).toBeInTheDocument();

    // Focus the input
    if (input) {
      fireEvent.focus(input);
    }

    // All focus effects should be present
    expect(input?.classList.contains('scale-[1.01]')).toBe(true);
    expect(input?.classList.contains('border-blue-500')).toBe(true);
    const glowEffect = container.querySelector('.blur-sm.opacity-30');
    expect(glowEffect).toBeInTheDocument();

    cleanup();
  });

  /**
   * Property: For any input field with helper text,
   * focus effects should still work correctly
   */
  test.prop([
    fc.string({ minLength: 1, maxLength: 50 }), // helperText
    fc.boolean(), // autoResize
  ])('applies focus effects correctly with helper text', (helperText, autoResize) => {
    const { container } = render(
      <Input
        helperText={helperText}
        autoResize={autoResize}
        placeholder="Test input"
      />
    );

    const input = container.querySelector('textarea');
    expect(input).toBeInTheDocument();

    // Focus the input
    if (input) {
      fireEvent.focus(input);
    }

    // All focus effects should be present
    expect(input?.classList.contains('scale-[1.01]')).toBe(true);
    expect(input?.classList.contains('border-blue-500')).toBe(true);
    const glowEffect = container.querySelector('.blur-sm.opacity-30');
    expect(glowEffect).toBeInTheDocument();

    cleanup();
  });

  /**
   * Property: For any input field, focus event handlers should be called
   */
  test.prop([
    fc.boolean(), // autoResize
  ])('calls focus and blur event handlers', (autoResize) => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();

    const { container } = render(
      <Input
        placeholder="Test input"
        autoResize={autoResize}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    );

    const input = container.querySelector('textarea');
    expect(input).toBeInTheDocument();

    // Focus the input
    if (input) {
      fireEvent.focus(input);
    }

    // Verify focus handler was called
    expect(handleFocus).toHaveBeenCalledTimes(1);

    // Blur the input
    if (input) {
      fireEvent.blur(input);
    }

    // Verify blur handler was called
    expect(handleBlur).toHaveBeenCalledTimes(1);

    cleanup();
  });

  /**
   * Property: For any input field with custom className,
   * focus effects should still be applied
   */
  test.prop([
    fc.constantFrom('custom-class', 'my-input', 'test-class-name', 'input-custom'), // custom className
    fc.boolean(), // autoResize
  ])('applies focus effects with custom className', (customClass, autoResize) => {
    const { container } = render(
      <Input
        className={customClass}
        autoResize={autoResize}
        placeholder="Test input"
      />
    );

    const input = container.querySelector('textarea');
    expect(input).toBeInTheDocument();

    // Verify custom class is present
    expect(input?.classList.contains(customClass)).toBe(true);

    // Focus the input
    if (input) {
      fireEvent.focus(input);
    }

    // All focus effects should still be present
    expect(input?.classList.contains('scale-[1.01]')).toBe(true);
    expect(input?.classList.contains('border-blue-500')).toBe(true);
    const glowEffect = container.querySelector('.blur-sm.opacity-30');
    expect(glowEffect).toBeInTheDocument();

    cleanup();
  });

  /**
   * Property: For any input field, dark mode classes should be present
   * and focus effects should work in dark mode
   */
  test.prop([
    fc.boolean(), // autoResize
  ])('applies focus effects correctly in dark mode', (autoResize) => {
    const { container } = render(
      <Input
        placeholder="Test input"
        autoResize={autoResize}
      />
    );

    const input = container.querySelector('textarea');
    expect(input).toBeInTheDocument();

    // Verify dark mode classes are present
    expect(input?.classList.contains('dark:bg-gray-800')).toBe(true);
    expect(input?.classList.contains('dark:text-gray-100')).toBe(true);
    expect(input?.classList.contains('dark:border-gray-600')).toBe(true);

    // Focus the input
    if (input) {
      fireEvent.focus(input);
    }

    // Verify dark mode focus classes
    expect(input?.classList.contains('dark:border-blue-400')).toBe(true);
    expect(input?.classList.contains('dark:focus:ring-blue-400/20')).toBe(true);

    cleanup();
  });

  /**
   * Property: For any input field, the glow effect should have correct positioning
   */
  test.prop([
    fc.boolean(), // autoResize
  ])('positions glow effect correctly behind input', (autoResize) => {
    const { container } = render(
      <Input
        placeholder="Test input"
        autoResize={autoResize}
      />
    );

    const input = container.querySelector('textarea');
    expect(input).toBeInTheDocument();

    // Focus the input
    if (input) {
      fireEvent.focus(input);
    }

    const glowEffect = container.querySelector('.blur-sm.opacity-30');
    expect(glowEffect).toBeInTheDocument();

    // Verify glow effect positioning
    expect(glowEffect?.classList.contains('absolute')).toBe(true);
    expect(glowEffect?.classList.contains('-inset-1')).toBe(true);
    expect(glowEffect?.classList.contains('pointer-events-none')).toBe(true);

    // Verify glow effect is behind input (aria-hidden)
    expect(glowEffect).toHaveAttribute('aria-hidden', 'true');

    cleanup();
  });
});
