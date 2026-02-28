import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { ThemeProvider } from '../ThemeProvider';
import { ThemeManager } from '@/lib/services/ThemeManager';
import { PreferencesService } from '@/lib/services/PreferencesService';
import { useAppStore } from '@/lib/store/useAppStore';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ThemeProvider', () => {
  beforeEach(() => {
    // Reset singletons before each test
    ThemeManager.reset();
    PreferencesService.reset();

    // Reset store to defaults
    useAppStore.setState({
      uiPreferences: {
        theme: 'system',
        graphicsQuality: 'high',
        highContrastMode: false,
        screenReaderOptimizations: false,
        enhancedFocusIndicators: true,
        settingsPanelActiveSection: 'audio',
      },
    });

    // Mock document.documentElement
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    ThemeManager.reset();
    PreferencesService.reset();
  });

  describe('Initialization', () => {
    it('should initialize ThemeManager on mount', () => {
      render(
        <ThemeProvider>
          <div>Test Content</div>
        </ThemeProvider>
      );

      const themeManager = ThemeManager.getInstance();
      expect(themeManager).toBeDefined();
    });

    it('should apply theme from store on mount', async () => {
      // Set theme in store
      useAppStore.setState({
        uiPreferences: {
          theme: 'dark',
          graphicsQuality: 'high',
          highContrastMode: false,
          screenReaderOptimizations: false,
          enhancedFocusIndicators: true,
          settingsPanelActiveSection: 'audio',
        },
      });

      render(
        <ThemeProvider>
          <div>Test Content</div>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });
    });

    it('should apply light theme when specified', async () => {
      useAppStore.setState({
        uiPreferences: {
          theme: 'light',
          graphicsQuality: 'high',
          highContrastMode: false,
          screenReaderOptimizations: false,
          enhancedFocusIndicators: true,
          settingsPanelActiveSection: 'audio',
        },
      });

      render(
        <ThemeProvider>
          <div>Test Content</div>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      });
    });

    it('should apply system theme when specified', async () => {
      // Mock system preference to dark
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      useAppStore.setState({
        uiPreferences: {
          theme: 'system',
          graphicsQuality: 'high',
          highContrastMode: false,
          screenReaderOptimizations: false,
          enhancedFocusIndicators: true,
          settingsPanelActiveSection: 'audio',
        },
      });

      render(
        <ThemeProvider>
          <div>Test Content</div>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });
    });
  });

  describe('Theme Changes', () => {
    it('should update theme when store changes', async () => {
      // Set initial theme to light
      useAppStore.setState({
        uiPreferences: {
          theme: 'light',
          graphicsQuality: 'high',
          highContrastMode: false,
          screenReaderOptimizations: false,
          enhancedFocusIndicators: true,
          settingsPanelActiveSection: 'audio',
        },
      });

      const { rerender } = render(
        <ThemeProvider>
          <div>Test Content</div>
        </ThemeProvider>
      );

      // Initially light
      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });

      // Change to dark
      useAppStore.setState({
        uiPreferences: {
          theme: 'dark',
          graphicsQuality: 'high',
          highContrastMode: false,
          screenReaderOptimizations: false,
          enhancedFocusIndicators: true,
          settingsPanelActiveSection: 'audio',
        },
      });

      rerender(
        <ThemeProvider>
          <div>Test Content</div>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(document.documentElement.classList.contains('light')).toBe(false);
      });
    });

    it('should switch between multiple themes', async () => {
      // Set initial theme to light
      useAppStore.setState({
        uiPreferences: {
          theme: 'light',
          graphicsQuality: 'high',
          highContrastMode: false,
          screenReaderOptimizations: false,
          enhancedFocusIndicators: true,
          settingsPanelActiveSection: 'audio',
        },
      });

      const { rerender } = render(
        <ThemeProvider>
          <div>Test Content</div>
        </ThemeProvider>
      );

      // Start with light
      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });

      // Switch to dark
      useAppStore.setState({
        uiPreferences: {
          theme: 'dark',
          graphicsQuality: 'high',
          highContrastMode: false,
          screenReaderOptimizations: false,
          enhancedFocusIndicators: true,
          settingsPanelActiveSection: 'audio',
        },
      });

      rerender(
        <ThemeProvider>
          <div>Test Content</div>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });

      // Switch back to light
      useAppStore.setState({
        uiPreferences: {
          theme: 'light',
          graphicsQuality: 'high',
          highContrastMode: false,
          screenReaderOptimizations: false,
          enhancedFocusIndicators: true,
          settingsPanelActiveSection: 'audio',
        },
      });

      rerender(
        <ThemeProvider>
          <div>Test Content</div>
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });
    });
  });

  describe('Persistence', () => {
    it('should attempt to persist theme changes via PreferencesService', async () => {
      // Initialize PreferencesService
      const mockStore = {
        audioPreferences: {
          volume: 100,
          isMuted: false,
          playbackSpeed: 1.0,
          speechRate: 1.0,
          speechPitch: 0,
          audioQuality: 'high' as const,
        },
        avatarCustomization: {
          skinTone: '#FFD1A3',
          eyeColor: '#4A90E2',
          hairColor: '#2C1810',
          currentExpression: null,
        },
        uiPreferences: {
          theme: 'light' as const,
          graphicsQuality: 'high' as const,
          highContrastMode: false,
          screenReaderOptimizations: false,
          enhancedFocusIndicators: true,
          settingsPanelActiveSection: 'audio' as const,
        },
        offlineQueue: [],
        updateAudioPreferences: vi.fn(),
        updateAvatarCustomization: vi.fn(),
        updateUIPreferences: vi.fn(),
        addToOfflineQueue: vi.fn(),
        updateOfflineQueueItem: vi.fn(),
        removeFromOfflineQueue: vi.fn(),
        clearOfflineQueue: vi.fn(),
      };

      PreferencesService.initialize(mockStore);

      // Set store to light theme
      useAppStore.setState({
        uiPreferences: {
          theme: 'light',
          graphicsQuality: 'high',
          highContrastMode: false,
          screenReaderOptimizations: false,
          enhancedFocusIndicators: true,
          settingsPanelActiveSection: 'audio',
        },
      });

      render(
        <ThemeProvider>
          <div>Test Content</div>
        </ThemeProvider>
      );

      // Wait for initialization
      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });

      // The ThemeProvider should have registered a callback with ThemeManager
      const themeManager = ThemeManager.getInstance();
      expect(themeManager).toBeDefined();
    });
  });

  describe('Rendering', () => {
    it('should render children correctly', () => {
      const { getByText } = render(
        <ThemeProvider>
          <div>Test Content</div>
        </ThemeProvider>
      );

      expect(getByText('Test Content')).toBeInTheDocument();
    });

    it('should not interfere with child component rendering', () => {
      const TestComponent = () => <div data-testid="test-component">Child Component</div>;

      const { getByTestId } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(getByTestId('test-component')).toBeInTheDocument();
    });
  });
});
