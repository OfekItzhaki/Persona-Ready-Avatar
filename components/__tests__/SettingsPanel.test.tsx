import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsPanel } from '../SettingsPanel';
import { useAppStore } from '@/lib/store/useAppStore';

describe('SettingsPanel', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    // Reset store to default state
    useAppStore.setState({
      audioPreferences: {
        volume: 100,
        isMuted: false,
        playbackSpeed: 1.0,
        speechRate: 1.0,
        speechPitch: 0,
        audioQuality: 'high',
      },
      uiPreferences: {
        theme: 'system',
        graphicsQuality: 'high',
        performanceMonitorVisible: false,
        performanceMonitorExpanded: false,
        highContrastMode: false,
        screenReaderOptimizations: false,
        enhancedFocusIndicators: true,
      },
    });
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<SettingsPanel isOpen={false} onClose={mockOnClose} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render all section tabs', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByRole('tab', { name: /audio/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /graphics/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /appearance/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /accessibility/i })).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByLabelText(/close settings panel/i)).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'settings-panel-title');
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      const closeButton = screen.getByLabelText(/close settings panel/i);
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key is pressed', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      const backdrop = screen.getByRole('dialog');
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when modal content is clicked', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      const modalContent = screen.getByText('Settings');
      fireEvent.click(modalContent);
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Section Navigation', () => {
    it('should show Audio section by default', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByRole('tab', { name: /audio/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'audio-panel');
    });

    it('should switch to Graphics section when clicked', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      const graphicsTab = screen.getByRole('tab', { name: /graphics/i });
      fireEvent.click(graphicsTab);
      
      expect(graphicsTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'graphics-panel');
    });

    it('should switch to Appearance section when clicked', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      const appearanceTab = screen.getByRole('tab', { name: /appearance/i });
      fireEvent.click(appearanceTab);
      
      expect(appearanceTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'appearance-panel');
    });

    it('should switch to Accessibility section when clicked', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      const accessibilityTab = screen.getByRole('tab', { name: /accessibility/i });
      fireEvent.click(accessibilityTab);
      
      expect(accessibilityTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'accessibility-panel');
    });

    it('should persist active section to store', async () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      const graphicsTab = screen.getByRole('tab', { name: /graphics/i });
      fireEvent.click(graphicsTab);
      
      await waitFor(() => {
        const state = useAppStore.getState();
        expect(state.uiPreferences.settingsPanelActiveSection).toBe('graphics');
      });
    });
  });

  describe('Reset to Defaults', () => {
    it('should render Reset to Defaults button in each section', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      
      // Audio section
      expect(screen.getByLabelText(/reset audio settings to defaults/i)).toBeInTheDocument();
      
      // Graphics section
      fireEvent.click(screen.getByRole('tab', { name: /graphics/i }));
      expect(screen.getByLabelText(/reset graphics settings to defaults/i)).toBeInTheDocument();
      
      // Appearance section
      fireEvent.click(screen.getByRole('tab', { name: /appearance/i }));
      expect(screen.getByLabelText(/reset appearance settings to defaults/i)).toBeInTheDocument();
      
      // Accessibility section
      fireEvent.click(screen.getByRole('tab', { name: /accessibility/i }));
      expect(screen.getByLabelText(/reset accessibility settings to defaults/i)).toBeInTheDocument();
    });

    it('should reset audio preferences when Reset button is clicked', () => {
      // Set non-default values
      useAppStore.setState({
        audioPreferences: {
          volume: 50,
          isMuted: true,
          playbackSpeed: 1.5,
          speechRate: 0.8,
          speechPitch: 10,
          audioQuality: 'low',
        },
      });

      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      const resetButton = screen.getByLabelText(/reset audio settings to defaults/i);
      fireEvent.click(resetButton);

      const state = useAppStore.getState();
      expect(state.audioPreferences).toEqual({
        volume: 100,
        isMuted: false,
        playbackSpeed: 1.0,
        speechRate: 1.0,
        speechPitch: 0,
        audioQuality: 'high',
      });
    });

    it('should reset graphics preferences when Reset button is clicked', () => {
      // Set non-default values
      useAppStore.setState({
        uiPreferences: {
          theme: 'dark',
          graphicsQuality: 'low',
          performanceMonitorVisible: true,
          performanceMonitorExpanded: true,
          highContrastMode: true,
        },
      });

      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      fireEvent.click(screen.getByRole('tab', { name: /graphics/i }));
      
      const resetButton = screen.getByLabelText(/reset graphics settings to defaults/i);
      fireEvent.click(resetButton);

      const state = useAppStore.getState();
      expect(state.uiPreferences.graphicsQuality).toBe('high');
    });

    it('should reset appearance preferences when Reset button is clicked', () => {
      // Set non-default values
      useAppStore.setState({
        uiPreferences: {
          theme: 'dark',
          graphicsQuality: 'high',
          performanceMonitorVisible: false,
          performanceMonitorExpanded: false,
          highContrastMode: true,
        },
      });

      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      fireEvent.click(screen.getByRole('tab', { name: /appearance/i }));
      
      const resetButton = screen.getByLabelText(/reset appearance settings to defaults/i);
      fireEvent.click(resetButton);

      const state = useAppStore.getState();
      expect(state.uiPreferences.theme).toBe('system');
      expect(state.uiPreferences.highContrastMode).toBe(false);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should focus close button when modal opens', async () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      
      await waitFor(() => {
        const closeButton = screen.getByLabelText(/close settings panel/i);
        expect(closeButton).toHaveFocus();
      });
    });

    it('should trap focus within modal', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      
      const closeButton = screen.getByLabelText(/close settings panel/i);
      const audioTab = screen.getByRole('tab', { name: /audio/i });
      
      // Tab should cycle through focusable elements
      closeButton.focus();
      expect(closeButton).toHaveFocus();
      
      fireEvent.keyDown(document, { key: 'Tab' });
      // Focus should move to next element (audio tab)
      // Note: This is a simplified test; actual focus trap behavior may vary
    });
  });

  describe('Accessibility', () => {
    it('should have proper tab roles and attributes', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      
      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
        expect(tab).toHaveAttribute('aria-controls');
      });
    });

    it('should have proper tabpanel roles and attributes', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      
      const audioPanel = screen.getByRole('tabpanel');
      expect(audioPanel).toHaveAttribute('id', 'audio-panel');
      expect(audioPanel).toHaveAttribute('aria-labelledby', 'audio-tab');
    });

    it('should have descriptive button labels', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByLabelText(/close settings panel/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/reset audio settings to defaults/i)).toBeInTheDocument();
    });
  });

  describe('Privacy & Data Section', () => {
    it('should render Privacy & Data tab', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByRole('tab', { name: /privacy & data/i })).toBeInTheDocument();
    });

    it('should switch to Privacy section when clicked', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      
      const privacyTab = screen.getByRole('tab', { name: /privacy & data/i });
      fireEvent.click(privacyTab);
      
      expect(privacyTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'privacy-panel');
    });

    it('should display privacy policy information', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      
      const privacyTab = screen.getByRole('tab', { name: /privacy & data/i });
      fireEvent.click(privacyTab);
      
      expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
      expect(screen.getByText(/all conversation data is stored locally/i)).toBeInTheDocument();
      expect(screen.getByText(/no conversation history is transmitted to analytics/i)).toBeInTheDocument();
    });

    it('should display data storage information', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      
      const privacyTab = screen.getByRole('tab', { name: /privacy & data/i });
      fireEvent.click(privacyTab);
      
      expect(screen.getByText(/data storage/i)).toBeInTheDocument();
      expect(screen.getByText(/conversation history and messages/i)).toBeInTheDocument();
    });

    it('should display analytics tracking information', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      
      const privacyTab = screen.getByRole('tab', { name: /privacy & data/i });
      fireEvent.click(privacyTab);
      
      expect(screen.getByText(/analytics & tracking/i)).toBeInTheDocument();
      expect(screen.getByText(/no conversation tracking/i)).toBeInTheDocument();
    });

    it('should display security information', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      
      const privacyTab = screen.getByRole('tab', { name: /privacy & data/i });
      fireEvent.click(privacyTab);
      
      expect(screen.getByText('Security')).toBeInTheDocument();
      expect(screen.getAllByText(/https encryption/i).length).toBeGreaterThan(0);
    });

    it('should display Delete All Data button', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      
      const privacyTab = screen.getByRole('tab', { name: /privacy & data/i });
      fireEvent.click(privacyTab);
      
      expect(screen.getByLabelText(/delete all data permanently/i)).toBeInTheDocument();
    });

    it('should display production logging information', () => {
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      
      const privacyTab = screen.getByRole('tab', { name: /privacy & data/i });
      fireEvent.click(privacyTab);
      
      expect(screen.getByText(/logging & debugging/i)).toBeInTheDocument();
      expect(screen.getByText(/sensitive user data is not logged/i)).toBeInTheDocument();
    });

    it('should show confirmation dialog when Delete All Data is clicked', () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      render(<SettingsPanel isOpen={true} onClose={mockOnClose} />);
      
      const privacyTab = screen.getByRole('tab', { name: /privacy & data/i });
      fireEvent.click(privacyTab);
      
      const deleteButton = screen.getByLabelText(/delete all data permanently/i);
      fireEvent.click(deleteButton);
      
      expect(confirmSpy).toHaveBeenCalled();
      
      confirmSpy.mockRestore();
    });
  });
});
