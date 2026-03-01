/**
 * Unit Tests for Enhanced Input Component
 * 
 * Tests focus effects, auto-resize, accessibility, and visual feedback.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from '../Input';

describe('Input Component', () => {
  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<Input placeholder="Enter text" />);
      const input = screen.getByPlaceholderText('Enter text');
      expect(input).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Input label="Username" placeholder="Enter username" />);
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('renders with required indicator', () => {
      render(<Input label="Email" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('renders with helper text', () => {
      render(<Input helperText="Enter your email address" />);
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('renders with error message', () => {
      render(<Input error="This field is required" />);
      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('This field is required');
    });
  });

  describe('Focus Effects (Requirements 8.1, 8.2, 8.3, 8.4)', () => {
    it('applies focus styles when focused', () => {
      render(<Input placeholder="Test input" />);
      const input = screen.getByPlaceholderText('Test input');
      
      fireEvent.focus(input);
      
      // Check for focus ring class
      expect(input).toHaveClass('focus:ring-4');
      expect(input).toHaveClass('focus:ring-blue-500/20');
    });

    it('applies border color change on focus', () => {
      render(<Input placeholder="Test input" />);
      const input = screen.getByPlaceholderText('Test input');
      
      // Before focus - gray border
      expect(input).toHaveClass('border-gray-300');
      
      fireEvent.focus(input);
      
      // After focus - blue border
      expect(input).toHaveClass('border-blue-500');
    });

    it('applies scale transition on focus', () => {
      render(<Input placeholder="Test input" />);
      const input = screen.getByPlaceholderText('Test input');
      
      fireEvent.focus(input);
      
      // Check for scale class
      expect(input).toHaveClass('scale-[1.01]');
    });

    it('removes focus styles when blurred', () => {
      render(<Input placeholder="Test input" />);
      const input = screen.getByPlaceholderText('Test input');
      
      fireEvent.focus(input);
      fireEvent.blur(input);
      
      // Should return to normal scale
      expect(input).toHaveClass('scale-100');
    });

    it('does not apply scale when disabled', () => {
      render(<Input placeholder="Test input" disabled />);
      const input = screen.getByPlaceholderText('Test input');
      
      fireEvent.focus(input);
      
      // Should not scale when disabled
      expect(input).toHaveClass('scale-100');
    });
  });

  describe('Auto-Resize (Requirement 8.5)', () => {
    it('auto-resizes based on content when enabled', async () => {
      render(<Input autoResize minRows={1} maxRows={5} />);
      const input = screen.getByRole('textbox');
      
      // Simulate typing multiple lines
      fireEvent.change(input, { target: { value: 'Line 1\nLine 2\nLine 3' } });
      
      await waitFor(() => {
        // Height should be adjusted (we can't test exact pixels in jsdom)
        expect(input.style.height).toBeTruthy();
      });
    });

    it('respects minRows constraint', () => {
      render(<Input autoResize minRows={3} />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveAttribute('rows', '3');
    });

    it('does not auto-resize when disabled', () => {
      render(<Input autoResize={false} />);
      const input = screen.getByRole('textbox');
      
      const initialHeight = input.style.height;
      fireEvent.change(input, { target: { value: 'Line 1\nLine 2\nLine 3' } });
      
      // Height should not change
      expect(input.style.height).toBe(initialHeight);
    });
  });

  describe('Error State', () => {
    it('applies error border color', () => {
      render(<Input error="Invalid input" />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveClass('border-red-500');
    });

    it('applies error focus ring', () => {
      render(<Input error="Invalid input" />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveClass('focus:ring-red-500/20');
    });

    it('sets aria-invalid when error is present', () => {
      render(<Input error="Invalid input" />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('links error message with aria-describedby', () => {
      render(<Input error="Invalid input" id="test-input" />);
      const input = screen.getByRole('textbox');
      const errorMessage = screen.getByRole('alert');
      
      expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
      expect(errorMessage).toHaveAttribute('id', 'test-input-error');
    });

    it('does not show glow effect when error is present', () => {
      const { container } = render(<Input error="Invalid input" />);
      const input = screen.getByRole('textbox');
      
      fireEvent.focus(input);
      
      // Glow effect should not be present
      const glowEffect = container.querySelector('.blur-sm.opacity-30');
      expect(glowEffect).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('applies disabled styles', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:cursor-not-allowed');
      expect(input).toHaveClass('disabled:opacity-60');
    });

    it('does not show glow effect when disabled', () => {
      const { container } = render(<Input disabled />);
      const input = screen.getByRole('textbox');
      
      fireEvent.focus(input);
      
      // Glow effect should not be present
      const glowEffect = container.querySelector('.blur-sm.opacity-30');
      expect(glowEffect).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('generates unique ID when not provided', () => {
      const { container } = render(<Input />);
      const input = container.querySelector('textarea');
      
      expect(input).toHaveAttribute('id');
      expect(input?.getAttribute('id')).toMatch(/^input-/);
    });

    it('uses provided ID', () => {
      render(<Input id="custom-id" />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveAttribute('id', 'custom-id');
    });

    it('links label with input', () => {
      render(<Input label="Username" id="username" />);
      const label = screen.getByText('Username');
      const input = screen.getByRole('textbox');
      
      expect(label).toHaveAttribute('for', 'username');
      expect(input).toHaveAttribute('id', 'username');
    });

    it('links helper text with aria-describedby', () => {
      render(<Input helperText="Enter your name" id="name-input" />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveAttribute('aria-describedby', 'name-input-helper');
    });

    it('sets required attribute', () => {
      render(<Input required />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveAttribute('required');
    });
  });

  describe('Event Handlers', () => {
    it('calls onFocus when focused', () => {
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} />);
      const input = screen.getByRole('textbox');
      
      fireEvent.focus(input);
      
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('calls onBlur when blurred', () => {
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} />);
      const input = screen.getByRole('textbox');
      
      fireEvent.focus(input);
      fireEvent.blur(input);
      
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('calls onChange when value changes', () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');
      
      fireEvent.change(input, { target: { value: 'test' } });
      
      expect(handleChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      render(<Input className="custom-class" />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveClass('custom-class');
    });

    it('applies dark mode styles', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveClass('dark:bg-gray-800');
      expect(input).toHaveClass('dark:text-gray-100');
    });

    it('applies smooth transitions', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      
      expect(input).toHaveClass('transition-all');
      expect(input).toHaveClass('duration-200');
      expect(input).toHaveClass('ease-in-out');
    });
  });

  describe('Glow Effect (Requirement 8.1)', () => {
    it('shows glow effect on focus', () => {
      const { container } = render(<Input />);
      const input = screen.getByRole('textbox');
      
      fireEvent.focus(input);
      
      // Check for glow effect element
      const glowEffect = container.querySelector('.blur-sm.opacity-30');
      expect(glowEffect).toBeInTheDocument();
    });

    it('hides glow effect on blur', () => {
      const { container } = render(<Input />);
      const input = screen.getByRole('textbox');
      
      fireEvent.focus(input);
      fireEvent.blur(input);
      
      // Glow effect should be removed
      const glowEffect = container.querySelector('.blur-sm.opacity-30');
      expect(glowEffect).not.toBeInTheDocument();
    });

    it('applies gradient to glow effect', () => {
      const { container } = render(<Input />);
      const input = screen.getByRole('textbox');
      
      fireEvent.focus(input);
      
      const glowEffect = container.querySelector('.bg-gradient-to-r.from-blue-500.to-purple-500');
      expect(glowEffect).toBeInTheDocument();
    });
  });
});
