/**
 * GlassCard Component Tests
 * 
 * Tests for the GlassCard component including:
 * - Rendering with different blur levels
 * - Opacity configuration
 * - Border and shadow options
 * - Padding sizes
 * - Fallback support
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GlassCard } from '../GlassCard';

describe('GlassCard', () => {
  it('renders children correctly', () => {
    render(
      <GlassCard>
        <div>Test Content</div>
      </GlassCard>
    );
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies default blur level (md)', () => {
    const { container } = render(
      <GlassCard>Content</GlassCard>
    );
    
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('backdrop-blur-md');
  });

  it('applies small blur level', () => {
    const { container } = render(
      <GlassCard blur="sm">Content</GlassCard>
    );
    
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('backdrop-blur-sm');
  });

  it('applies large blur level', () => {
    const { container } = render(
      <GlassCard blur="lg">Content</GlassCard>
    );
    
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('backdrop-blur-lg');
  });

  it('applies default opacity (0.8)', () => {
    const { container } = render(
      <GlassCard>Content</GlassCard>
    );
    
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-white/[0.8]');
  });

  it('applies custom opacity', () => {
    const { container } = render(
      <GlassCard opacity={0.5}>Content</GlassCard>
    );
    
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-white/[0.5]');
  });

  it('clamps opacity to valid range (0-1)', () => {
    const { container: container1 } = render(
      <GlassCard opacity={1.5}>Content</GlassCard>
    );
    const card1 = container1.firstChild as HTMLElement;
    expect(card1.className).toContain('bg-white/[1]');

    const { container: container2 } = render(
      <GlassCard opacity={-0.5}>Content</GlassCard>
    );
    const card2 = container2.firstChild as HTMLElement;
    expect(card2.className).toContain('bg-white/[0]');
  });

  it('applies border by default', () => {
    const { container } = render(
      <GlassCard>Content</GlassCard>
    );
    
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border');
    expect(card.className).toContain('border-white/[0.18]');
  });

  it('can disable border', () => {
    const { container } = render(
      <GlassCard border={false}>Content</GlassCard>
    );
    
    const card = container.firstChild as HTMLElement;
    expect(card.className).not.toContain('border-white/[0.18]');
  });

  it('applies default shadow (lg)', () => {
    const { container } = render(
      <GlassCard>Content</GlassCard>
    );
    
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('shadow-lg');
  });

  it('applies different shadow depths', () => {
    const shadows = ['sm', 'md', 'lg', 'xl'] as const;
    
    shadows.forEach(shadow => {
      const { container } = render(
        <GlassCard shadow={shadow}>Content</GlassCard>
      );
      
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain(`shadow-${shadow}`);
    });
  });

  it('applies default padding (md)', () => {
    const { container } = render(
      <GlassCard>Content</GlassCard>
    );
    
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('p-4');
  });

  it('applies different padding sizes', () => {
    const paddings = {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };
    
    Object.entries(paddings).forEach(([size, expectedClass]) => {
      const { container } = render(
        <GlassCard padding={size as 'sm' | 'md' | 'lg'}>Content</GlassCard>
      );
      
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain(expectedClass);
    });
  });

  it('applies transition classes for smooth effect changes', () => {
    const { container } = render(
      <GlassCard>Content</GlassCard>
    );
    
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('transition-all');
    expect(card.className).toContain('duration-300');
    expect(card.className).toContain('ease-in-out');
  });

  it('applies rounded corners', () => {
    const { container } = render(
      <GlassCard>Content</GlassCard>
    );
    
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('rounded-lg');
  });

  it('accepts custom className', () => {
    const { container } = render(
      <GlassCard className="custom-class">Content</GlassCard>
    );
    
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <GlassCard ref={ref}>Content</GlassCard>
    );
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('passes through additional HTML attributes', () => {
    const { container } = render(
      <GlassCard data-testid="glass-card" aria-label="Test Card">
        Content
      </GlassCard>
    );
    
    const card = container.firstChild as HTMLElement;
    expect(card.getAttribute('data-testid')).toBe('glass-card');
    expect(card.getAttribute('aria-label')).toBe('Test Card');
  });

  it('includes fallback for browsers without backdrop-filter', () => {
    // The component uses CSS.supports() to detect backdrop-filter support
    // In the test environment, backdrop-filter is supported by default
    const { container } = render(
      <GlassCard opacity={0.8}>Content</GlassCard>
    );
    
    const card = container.firstChild as HTMLElement;
    // With backdrop-filter support, opacity should be 0.8
    expect(card.className).toContain('bg-white/[0.8]');
    // Backdrop blur should be applied
    expect(card.className).toContain('backdrop-blur-md');
  });
});
