import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HelpDialog from '../HelpDialog';

describe('HelpDialog', () => {
  beforeEach(() => {
    // Clear any existing event listeners
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up
    vi.restoreAllMocks();
  });

  describe('Keyboard Shortcut Activation', () => {
    it('should open dialog when Ctrl+Shift+H is pressed', async () => {
      render(<HelpDialog />);

      // Dialog should not be visible initially
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Simulate Ctrl+Shift+H
      fireEvent.keyDown(window, {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
      });

      // Dialog should now be visible
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      expect(screen.getByText('Feature Usage Guide')).toBeInTheDocument();
    });

    it('should open dialog when Cmd+Shift+H is pressed (Mac)', async () => {
      render(<HelpDialog />);

      // Simulate Cmd+Shift+H
      fireEvent.keyDown(window, {
        key: 'H',
        metaKey: true,
        shiftKey: true,
      });

      // Dialog should be visible
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should toggle dialog when shortcut is pressed multiple times', async () => {
      render(<HelpDialog />);

      // Open dialog
      fireEvent.keyDown(window, {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Close dialog with same shortcut
      fireEvent.keyDown(window, {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
      });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dialog Closing', () => {
    it('should close dialog when Escape key is pressed', async () => {
      render(<HelpDialog />);

      // Open dialog
      fireEvent.keyDown(window, {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Press Escape
      fireEvent.keyDown(window, {
        key: 'Escape',
      });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should close dialog when close button is clicked', async () => {
      render(<HelpDialog />);

      // Open dialog
      fireEvent.keyDown(window, {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click close button (X)
      const closeButton = screen.getByLabelText('Close help dialog');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should close dialog when Close button in footer is clicked', async () => {
      render(<HelpDialog />);

      // Open dialog
      fireEvent.keyDown(window, {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click Close button in footer (the one with text "Close", not aria-label)
      const closeButtons = screen.getAllByRole('button', { name: /close/i });
      const footerCloseButton = closeButtons.find(btn => btn.textContent === 'Close');
      
      if (footerCloseButton) {
        fireEvent.click(footerCloseButton);
      }

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should close dialog when backdrop is clicked', async () => {
      const { container } = render(<HelpDialog />);

      // Open dialog
      fireEvent.keyDown(window, {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Find the backdrop (the outer div with fixed positioning)
      const backdrop = container.querySelector('.fixed.inset-0.z-50');
      
      if (backdrop) {
        fireEvent.click(backdrop);
        
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        }, { timeout: 2000 });
      } else {
        // If we can't find backdrop, skip this test
        expect(backdrop).toBeTruthy();
      }
    });
  });

  describe('Content Display', () => {
    it('should display table of contents', async () => {
      render(<HelpDialog />);

      // Open dialog
      fireEvent.keyDown(window, {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Check for table of contents sections
      expect(screen.getByText('Table of Contents')).toBeInTheDocument();
      
      // Check for links in table of contents (using getAllByText since text appears multiple times)
      const audioControlsLinks = screen.getAllByText('Audio Controls');
      expect(audioControlsLinks.length).toBeGreaterThan(0);
      
      const avatarCustomizationLinks = screen.getAllByText('Avatar Customization');
      expect(avatarCustomizationLinks.length).toBeGreaterThan(0);
      
      const messageOperationsLinks = screen.getAllByText('Message Operations');
      expect(messageOperationsLinks.length).toBeGreaterThan(0);
      
      const conversationManagementLinks = screen.getAllByText('Conversation Management');
      expect(conversationManagementLinks.length).toBeGreaterThan(0);
      
      const settingsPanelLinks = screen.getAllByText('Settings Panel');
      expect(settingsPanelLinks.length).toBeGreaterThan(0);
      
      const keyboardShortcutsLinks = screen.getAllByText('Keyboard Shortcuts');
      expect(keyboardShortcutsLinks.length).toBeGreaterThan(0);
    });

    it('should display quick access information', async () => {
      render(<HelpDialog />);

      // Open dialog
      fireEvent.keyDown(window, {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Check for quick access info
      expect(screen.getByText(/Quick Access:/)).toBeInTheDocument();
      
      // Check for keyboard shortcuts (using getAllByText since they appear multiple times)
      const ctrlShiftHElements = screen.getAllByText(/Ctrl\+Shift\+H/);
      expect(ctrlShiftHElements.length).toBeGreaterThan(0);
    });

    it('should display keyboard shortcuts table', async () => {
      render(<HelpDialog />);

      // Open dialog
      fireEvent.keyDown(window, {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Check for keyboard shortcuts section by finding the section element
      const shortcutsSection = screen.getByRole('dialog').querySelector('#keyboard-shortcuts');
      expect(shortcutsSection).toBeInTheDocument();

      // Check for table headers
      expect(screen.getByText('Shortcut')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      render(<HelpDialog />);

      // Open dialog
      fireEvent.keyDown(window, {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'help-dialog-title');
    });

    it('should have accessible close button', async () => {
      render(<HelpDialog />);

      // Open dialog
      fireEvent.keyDown(window, {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const closeButton = screen.getByLabelText('Close help dialog');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('aria-label', 'Close help dialog');
    });

    it('should prevent event default when shortcut is pressed', () => {
      render(<HelpDialog />);

      const event = new KeyboardEvent('keydown', {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Focus Management', () => {
    it('should not render when closed', () => {
      render(<HelpDialog />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should stop propagation when clicking inside dialog', async () => {
      render(<HelpDialog />);

      // Open dialog
      fireEvent.keyDown(window, {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click inside dialog content
      const dialogContent = screen.getByText('Feature Usage Guide');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation');

      fireEvent.click(dialogContent);

      // Dialog should still be open (not closed by backdrop click)
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should render with proper styling classes', async () => {
      const { container } = render(<HelpDialog />);

      // Open dialog
      fireEvent.keyDown(window, {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Find the backdrop container
      const backdrop = container.querySelector('.fixed.inset-0.z-50');
      expect(backdrop).toBeInTheDocument();
      expect(backdrop).toHaveClass('fixed');
      expect(backdrop).toHaveClass('inset-0');
      expect(backdrop).toHaveClass('z-50');
    });

    it('should have scrollable content area', async () => {
      render(<HelpDialog />);

      // Open dialog
      fireEvent.keyDown(window, {
        key: 'H',
        ctrlKey: true,
        shiftKey: true,
      });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Check for overflow-y-auto class on content area
      const contentArea = screen.getByRole('dialog').querySelector('.overflow-y-auto');
      expect(contentArea).toBeInTheDocument();
    });
  });
});
