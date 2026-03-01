/**
 * Property-Based Test: Glassmorphism Configuration
 * 
 * **Validates: Requirements 3.1, 3.2, 3.4, 3.5**
 * 
 * Property 9: Glassmorphism Configuration
 * For any GlassCard component with valid blur level (sm, md, lg) and opacity (0-1),
 * the component must apply the correct backdrop-filter blur and background opacity.
 * 
 * This test validates that:
 * 1. THE GlassCard component SHALL apply backdrop-filter blur effects with configurable blur levels (sm: 4px, md: 12px, lg: 24px) (Req 3.1)
 * 2. THE GlassCard component SHALL apply semi-transparent backgrounds with configurable opacity (0-1) (Req 3.2)
 * 3. THE GlassCard component SHALL support configurable shadow depths (sm, md, lg, xl) (Req 3.4)
 * 4. THE GlassCard component SHALL apply smooth transitions (0.3s ease-in-out) for effect changes (Req 3.5)
 */

import { describe, expect } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import { render, cleanup } from '@testing-library/react';
import { GlassCard, GlassCardProps } from '../GlassCard';

describe('Property 9: Glassmorphism Configuration', () => {
  /**
   * Property: For any valid blur level (sm, md, lg), the GlassCard must apply
   * the correct backdrop-filter blur class
   */
  test.prop([
    fc.constantFrom<GlassCardProps['blur']>('sm', 'md', 'lg'),
  ])('applies correct backdrop-filter blur for blur level', (blur) => {
    const { container } = render(
      <GlassCard blur={blur}>
        Test Content
      </GlassCard>
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();

    // Requirement 3.1: THE GlassCard component SHALL apply backdrop-filter blur effects
    // with configurable blur levels (sm: 4px, md: 12px, lg: 24px)
    const expectedBlurClass = `backdrop-blur-${blur}`;
    expect(card.className).toContain(expectedBlurClass);

    // Verify the blur class corresponds to the correct pixel value
    // sm: 4px, md: 12px, lg: 24px (as per Tailwind CSS defaults)
    const blurMapping = {
      sm: 'backdrop-blur-sm',
      md: 'backdrop-blur-md',
      lg: 'backdrop-blur-lg',
    };
    expect(card.className).toContain(blurMapping[blur]);
    
    cleanup();
  });

  /**
   * Property: For any opacity value between 0 and 1, the GlassCard must apply
   * the correct background opacity
   */
  test.prop([
    fc.double({ min: 0, max: 1, noNaN: true }),
  ])('applies correct background opacity for valid opacity values', (opacity) => {
    const { container } = render(
      <GlassCard opacity={opacity}>
        Test Content
      </GlassCard>
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();

    // Requirement 3.2: THE GlassCard component SHALL apply semi-transparent backgrounds
    // with configurable opacity (0-1)
    const expectedOpacityPattern = `bg-white/[${opacity}]`;
    expect(card.className).toContain(expectedOpacityPattern);
    
    cleanup();
  });

  /**
   * Property: For any opacity value outside the valid range (0-1), the GlassCard
   * must clamp the opacity to the valid range
   */
  test.prop([
    fc.oneof(
      fc.double({ min: -10, max: -0.01, noNaN: true }),
      fc.double({ min: 1.01, max: 10, noNaN: true })
    ),
  ])('clamps opacity to valid range (0-1)', (invalidOpacity) => {
    const { container } = render(
      <GlassCard opacity={invalidOpacity}>
        Test Content
      </GlassCard>
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();

    // Requirement 3.2: Opacity must be clamped to valid range
    const clampedOpacity = Math.max(0, Math.min(1, invalidOpacity));
    const expectedOpacityPattern = `bg-white/[${clampedOpacity}]`;
    expect(card.className).toContain(expectedOpacityPattern);
    
    cleanup();
  });

  /**
   * Property: For any valid shadow depth (sm, md, lg, xl), the GlassCard must
   * apply the correct shadow class
   */
  test.prop([
    fc.constantFrom<GlassCardProps['shadow']>('sm', 'md', 'lg', 'xl'),
  ])('applies correct shadow depth', (shadow) => {
    const { container } = render(
      <GlassCard shadow={shadow}>
        Test Content
      </GlassCard>
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();

    // Requirement 3.4: THE GlassCard component SHALL support configurable shadow depths (sm, md, lg, xl)
    const expectedShadowClass = `shadow-${shadow}`;
    expect(card.className).toContain(expectedShadowClass);
    
    cleanup();
  });

  /**
   * Property: For any combination of blur, opacity, and shadow, the GlassCard
   * must apply smooth transitions
   */
  test.prop([
    fc.constantFrom<GlassCardProps['blur']>('sm', 'md', 'lg'),
    fc.double({ min: 0, max: 1, noNaN: true }),
    fc.constantFrom<GlassCardProps['shadow']>('sm', 'md', 'lg', 'xl'),
  ])('applies smooth transitions for effect changes', (blur, opacity, shadow) => {
    const { container } = render(
      <GlassCard blur={blur} opacity={opacity} shadow={shadow}>
        Test Content
      </GlassCard>
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();

    // Requirement 3.5: THE GlassCard component SHALL apply smooth transitions (0.3s ease-in-out)
    // for effect changes
    expect(card.className).toContain('transition-all');
    expect(card.className).toContain('duration-300');
    expect(card.className).toContain('ease-in-out');
    
    cleanup();
  });

  /**
   * Property: For any combination of blur, opacity, shadow, and border settings,
   * the GlassCard must apply all configurations correctly
   */
  test.prop([
    fc.constantFrom<GlassCardProps['blur']>('sm', 'md', 'lg'),
    fc.double({ min: 0, max: 1, noNaN: true }),
    fc.constantFrom<GlassCardProps['shadow']>('sm', 'md', 'lg', 'xl'),
    fc.boolean(),
  ])('applies all glassmorphism configurations correctly', (blur, opacity, shadow, border) => {
    const { container } = render(
      <GlassCard blur={blur} opacity={opacity} shadow={shadow} border={border}>
        Test Content
      </GlassCard>
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();

    // Requirement 3.1: Blur effect
    expect(card.className).toContain(`backdrop-blur-${blur}`);

    // Requirement 3.2: Background opacity
    expect(card.className).toContain(`bg-white/[${opacity}]`);

    // Requirement 3.4: Shadow depth
    expect(card.className).toContain(`shadow-${shadow}`);

    // Requirement 3.5: Smooth transitions
    expect(card.className).toContain('transition-all');
    expect(card.className).toContain('duration-300');
    expect(card.className).toContain('ease-in-out');

    // Border configuration (Requirement 3.3)
    if (border) {
      expect(card.className).toContain('border');
      expect(card.className).toContain('border-white/[0.18]');
    } else {
      expect(card.className).not.toContain('border-white/[0.18]');
    }
    
    cleanup();
  });

  /**
   * Property: For any padding size (sm, md, lg), the GlassCard must apply
   * the correct padding class
   */
  test.prop([
    fc.constantFrom<GlassCardProps['padding']>('sm', 'md', 'lg'),
  ])('applies correct padding size', (padding) => {
    const { container } = render(
      <GlassCard padding={padding}>
        Test Content
      </GlassCard>
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();

    // Verify correct padding class is applied
    const paddingMapping = {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };
    expect(card.className).toContain(paddingMapping[padding]);
    
    cleanup();
  });

  /**
   * Property: For any GlassCard configuration, the component must always
   * include base styling (rounded corners)
   */
  test.prop([
    fc.constantFrom<GlassCardProps['blur']>('sm', 'md', 'lg'),
    fc.double({ min: 0, max: 1, noNaN: true }),
    fc.constantFrom<GlassCardProps['shadow']>('sm', 'md', 'lg', 'xl'),
    fc.constantFrom<GlassCardProps['padding']>('sm', 'md', 'lg'),
    fc.boolean(),
  ])('always includes base styling', (blur, opacity, shadow, padding, border) => {
    const { container } = render(
      <GlassCard
        blur={blur}
        opacity={opacity}
        shadow={shadow}
        padding={padding}
        border={border}
      >
        Test Content
      </GlassCard>
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();

    // Base styling must always be present
    expect(card.className).toContain('rounded-lg');
    
    cleanup();
  });

  /**
   * Property: For any GlassCard with custom className, the component must
   * preserve both default and custom classes
   */
  test.prop([
    fc.constantFrom<GlassCardProps['blur']>('sm', 'md', 'lg'),
    fc.double({ min: 0, max: 1, noNaN: true }),
    fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-z-]+$/.test(s)),
  ])('preserves custom className while applying glassmorphism effects', (blur, opacity, customClass) => {
    const { container } = render(
      <GlassCard blur={blur} opacity={opacity} className={customClass}>
        Test Content
      </GlassCard>
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();

    // Custom class must be present
    expect(card.className).toContain(customClass);

    // Glassmorphism effects must still be applied
    expect(card.className).toContain(`backdrop-blur-${blur}`);
    expect(card.className).toContain(`bg-white/[${opacity}]`);
    
    cleanup();
  });

  /**
   * Property: For any GlassCard, the component must render children correctly
   */
  test.prop([
    fc.constantFrom<GlassCardProps['blur']>('sm', 'md', 'lg'),
    fc.double({ min: 0, max: 1, noNaN: true }),
    fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  ])('renders children correctly with glassmorphism effects', (blur, opacity, content) => {
    const { container } = render(
      <GlassCard blur={blur} opacity={opacity}>
        {content}
      </GlassCard>
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();

    // Children must be rendered
    expect(card.textContent).toBe(content);

    // Glassmorphism effects must be applied
    expect(card.className).toContain(`backdrop-blur-${blur}`);
    expect(card.className).toContain(`bg-white/[${opacity}]`);
    
    cleanup();
  });

  /**
   * Property: For any GlassCard with default values, the component must apply
   * the correct default configuration
   */
  test.prop([
    fc.constant(undefined),
  ])('applies correct default configuration', () => {
    const { container } = render(
      <GlassCard>
        Test Content
      </GlassCard>
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();

    // Default blur: md
    expect(card.className).toContain('backdrop-blur-md');

    // Default opacity: 0.8
    expect(card.className).toContain('bg-white/[0.8]');

    // Default shadow: lg
    expect(card.className).toContain('shadow-lg');

    // Default padding: md
    expect(card.className).toContain('p-4');

    // Default border: true
    expect(card.className).toContain('border');
    expect(card.className).toContain('border-white/[0.18]');

    // Transitions
    expect(card.className).toContain('transition-all');
    expect(card.className).toContain('duration-300');
    expect(card.className).toContain('ease-in-out');
    
    cleanup();
  });

  /**
   * Property: For any GlassCard, the component must support dark mode styling
   */
  test.prop([
    fc.constantFrom<GlassCardProps['blur']>('sm', 'md', 'lg'),
    fc.double({ min: 0, max: 1, noNaN: true }),
  ])('includes dark mode background styling', (blur, opacity) => {
    const { container } = render(
      <GlassCard blur={blur} opacity={opacity}>
        Test Content
      </GlassCard>
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();

    // Must include dark mode background class
    expect(card.className).toContain(`dark:bg-gray-800/[${opacity}]`);
    
    cleanup();
  });
});
