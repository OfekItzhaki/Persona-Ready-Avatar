/**
 * Button Component Tests
 * 
 * Tests for the enhanced Button component covering:
 * - All variants (primary, secondary, ghost, danger)
 * - All sizes (sm, md, lg)
 * - Loading state
 * - Disabled state
 * - Icon placement
 * - Full-width layout
 * - Accessibility
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button Component', () => {
  describe('Variants', () => {
    it('renders primary variant with correct styles', () => {
      render(<Button variant="primary">Primary Button</Button>);
      const button = screen.getByRole('button', { name: /primary button/i });
      expect(button).toBeInTheDocument();
      expect(button.className).toContain('bg-blue-600');
      expect(button.className).toContain('text-white');
    });

    it('renders secondary variant with correct styles', () => {
      render(<Button variant="secondary">Secondary Button</Button>);
      const button = screen.getByRole('button', { name: /secondary button/i });
      expect(button).toBeInTheDocument();
      expect(button.className).toContain('bg-gray-200');
      expect(button.className).toContain('text-gray-900');
    });

    it('renders ghost variant with correct styles', () => {
      render(<Button variant="ghost">Ghost Button</Button>);
      const button = screen.getByRole('button', { name: /ghost button/i });
      expect(button).toBeInTheDocument();
      expect(button.className).toContain('bg-transparent');
      expect(button.className).toContain('text-gray-700');
    });

    it('renders danger variant with correct styles', () => {
      render(<Button variant="danger">Danger Button</Button>);
      const button = screen.getByRole('button', { name: /danger button/i });
      expect(button).toBeInTheDocument();
      expect(button.className).toContain('bg-red-600');
      expect(button.className).toContain('text-white');
    });

    it('defaults to primary variant when not specified', () => {
      render(<Button>Default Button</Button>);
      const button = screen.getByRole('button', { name: /default button/i });
      expect(button.className).toContain('bg-blue-600');
    });
  });

  describe('Sizes', () => {
    it('renders small size with correct styles', () => {
      render(<Button size="sm">Small Button</Button>);
      const button = screen.getByRole('button', { name: /small button/i });
      expect(button.className).toContain('px-3');
      expect(button.className).toContain('py-1.5');
      expect(button.className).toContain('text-sm');
    });

    it('renders medium size with correct styles', () => {
      render(<Button size="md">Medium Button</Button>);
      const button = screen.getByRole('button', { name: /medium button/i });
      expect(button.className).toContain('px-4');
      expect(button.className).toContain('py-2.5');
      expect(button.className).toContain('text-base');
    });

    it('renders large size with correct styles', () => {
      render(<Button size="lg">Large Button</Button>);
      const button = screen.getByRole('button', { name: /large button/i });
      expect(button.className).toContain('px-6');
      expect(button.className).toContain('py-3');
      expect(button.className).toContain('text-lg');
    });

    it('defaults to medium size when not specified', () => {
      render(<Button>Default Size</Button>);
      const button = screen.getByRole('button', { name: /default size/i });
      expect(button.className).toContain('px-4');
      expect(button.className).toContain('py-2.5');
    });
  });

  describe('Loading State', () => {
    it('displays loading spinner when loading is true', () => {
      render(<Button loading>Loading Button</Button>);
      const button = screen.getByRole('button', { name: /loading button/i });
      
      // Check for spinner SVG
      const spinner = button.querySelector('svg');
      expect(spinner).toBeInTheDocument();
      expect(spinner?.classList.contains('animate-spin')).toBe(true);
    });

    it('is disabled when loading', () => {
      render(<Button loading>Loading Button</Button>);
      const button = screen.getByRole('button', { name: /loading button/i });
      expect(button).toBeDisabled();
    });

    it('has aria-busy attribute when loading', () => {
      render(<Button loading>Loading Button</Button>);
      const button = screen.getByRole('button', { name: /loading button/i });
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('does not show icon when loading', () => {
      const icon = <span data-testid="test-icon">Icon</span>;
      render(
        <Button loading icon={icon} iconPosition="left">
          Loading Button
        </Button>
      );
      
      expect(screen.queryByTestId('test-icon')).not.toBeInTheDocument();
    });

    it('is non-interactive when loading', async () => {
      const handleClick = vi.fn();
      render(
        <Button loading onClick={handleClick}>
          Loading Button
        </Button>
      );
      
      const button = screen.getByRole('button', { name: /loading button/i });
      await userEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('is disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button', { name: /disabled button/i });
      expect(button).toBeDisabled();
    });

    it('has reduced opacity when disabled', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button', { name: /disabled button/i });
      expect(button.className).toContain('opacity-60');
    });

    it('has aria-disabled attribute when disabled', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button', { name: /disabled button/i });
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('is non-interactive when disabled', async () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled Button
        </Button>
      );
      
      const button = screen.getByRole('button', { name: /disabled button/i });
      await userEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Icon Support', () => {
    it('renders icon on the left by default', () => {
      const icon = <span data-testid="test-icon">Icon</span>;
      render(
        <Button icon={icon} iconPosition="left">
          Button with Icon
        </Button>
      );
      
      const button = screen.getByRole('button', { name: /button with icon/i });
      const iconElement = screen.getByTestId('test-icon');
      
      expect(iconElement).toBeInTheDocument();
      expect(button.firstChild).toContain(iconElement.parentElement);
    });

    it('renders icon on the right when iconPosition is right', () => {
      const icon = <span data-testid="test-icon">Icon</span>;
      render(
        <Button icon={icon} iconPosition="right">
          Button with Icon
        </Button>
      );
      
      const button = screen.getByRole('button', { name: /button with icon/i });
      const iconElement = screen.getByTestId('test-icon');
      
      expect(iconElement).toBeInTheDocument();
      expect(button.lastChild).toContain(iconElement.parentElement);
    });

    it('icon has aria-hidden attribute', () => {
      const icon = <span data-testid="test-icon">Icon</span>;
      render(<Button icon={icon}>Button with Icon</Button>);
      
      const iconElement = screen.getByTestId('test-icon');
      expect(iconElement.parentElement).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Full Width Layout', () => {
    it('takes full width when fullWidth is true', () => {
      render(<Button fullWidth>Full Width Button</Button>);
      const button = screen.getByRole('button', { name: /full width button/i });
      expect(button.className).toContain('w-full');
    });

    it('does not take full width by default', () => {
      render(<Button>Normal Button</Button>);
      const button = screen.getByRole('button', { name: /normal button/i });
      expect(button.className).not.toContain('w-full');
    });
  });

  describe('Transitions and Effects', () => {
    it('has transition classes for smooth effects', () => {
      render(<Button>Button</Button>);
      const button = screen.getByRole('button', { name: /button/i });
      expect(button.className).toContain('transition-all');
      expect(button.className).toContain('duration-200');
      expect(button.className).toContain('ease-in-out');
    });

    it('has hover effect classes', () => {
      render(<Button variant="primary">Button</Button>);
      const button = screen.getByRole('button', { name: /button/i });
      expect(button.className).toContain('hover:bg-blue-700');
      expect(button.className).toContain('hover:shadow-lg');
      expect(button.className).toContain('hover:scale-[1.02]');
    });

    it('has active effect classes', () => {
      render(<Button variant="primary">Button</Button>);
      const button = screen.getByRole('button', { name: /button/i });
      expect(button.className).toContain('active:bg-blue-800');
      expect(button.className).toContain('active:scale-[0.98]');
    });

    it('has focus ring classes', () => {
      render(<Button variant="primary">Button</Button>);
      const button = screen.getByRole('button', { name: /button/i });
      expect(button.className).toContain('focus:outline-none');
      expect(button.className).toContain('focus:ring-4');
      expect(button.className).toContain('focus:ring-blue-500/50');
    });
  });

  describe('Accessibility', () => {
    it('has button role', () => {
      render(<Button>Accessible Button</Button>);
      const button = screen.getByRole('button', { name: /accessible button/i });
      expect(button).toBeInTheDocument();
    });

    it('has correct type attribute', () => {
      render(<Button type="submit">Submit Button</Button>);
      const button = screen.getByRole('button', { name: /submit button/i });
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('defaults to button type', () => {
      render(<Button>Default Type</Button>);
      const button = screen.getByRole('button', { name: /default type/i });
      expect(button).toHaveAttribute('type', 'button');
    });

    it('can receive focus', () => {
      render(<Button>Focusable Button</Button>);
      const button = screen.getByRole('button', { name: /focusable button/i });
      button.focus();
      expect(button).toHaveFocus();
    });

    it('forwards ref correctly', () => {
      const ref = { current: null as HTMLButtonElement | null };
      render(<Button ref={ref}>Button with Ref</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('supports custom className', () => {
      render(<Button className="custom-class">Custom Button</Button>);
      const button = screen.getByRole('button', { name: /custom button/i });
      expect(button.className).toContain('custom-class');
    });

    it('passes through additional props', () => {
      render(
        <Button data-testid="custom-button" aria-label="Custom Label">
          Button
        </Button>
      );
      const button = screen.getByTestId('custom-button');
      expect(button).toHaveAttribute('aria-label', 'Custom Label');
    });
  });

  describe('Click Handling', () => {
    it('calls onClick handler when clicked', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Clickable Button</Button>);
      
      const button = screen.getByRole('button', { name: /clickable button/i });
      await userEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled Button
        </Button>
      );
      
      const button = screen.getByRole('button', { name: /disabled button/i });
      await userEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when loading', async () => {
      const handleClick = vi.fn();
      render(
        <Button loading onClick={handleClick}>
          Loading Button
        </Button>
      );
      
      const button = screen.getByRole('button', { name: /loading button/i });
      await userEvent.click(button);
      
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Spinner Sizes', () => {
    it('renders small spinner for small button', () => {
      render(
        <Button size="sm" loading>
          Small Loading
        </Button>
      );
      const button = screen.getByRole('button', { name: /small loading/i });
      const spinner = button.querySelector('svg');
      expect(spinner?.classList.contains('w-3')).toBe(true);
      expect(spinner?.classList.contains('h-3')).toBe(true);
    });

    it('renders medium spinner for medium button', () => {
      render(
        <Button size="md" loading>
          Medium Loading
        </Button>
      );
      const button = screen.getByRole('button', { name: /medium loading/i });
      const spinner = button.querySelector('svg');
      expect(spinner?.classList.contains('w-4')).toBe(true);
      expect(spinner?.classList.contains('h-4')).toBe(true);
    });

    it('renders large spinner for large button', () => {
      render(
        <Button size="lg" loading>
          Large Loading
        </Button>
      );
      const button = screen.getByRole('button', { name: /large loading/i });
      const spinner = button.querySelector('svg');
      expect(spinner?.classList.contains('w-5')).toBe(true);
      expect(spinner?.classList.contains('h-5')).toBe(true);
    });
  });
});
