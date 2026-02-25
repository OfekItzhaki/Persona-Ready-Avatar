import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Agent } from '@/types';

// Mock environment variables before any imports
vi.mock('@/lib/env', () => ({
  getEnvConfig: () => ({
    azureSpeechKey: 'test-key',
    azureSpeechRegion: 'test-region',
    brainApiUrl: 'http://localhost:3001',
    avatarModelUrl: '/models/avatar.glb',
    logLevel: 'info',
  }),
}));

// Now import components that depend on env
import { PersonaSwitcher } from '../PersonaSwitcher';
import { useAppStore } from '@/lib/store/useAppStore';
import * as useReactQueryModule from '@/lib/hooks/useReactQuery';

/**
 * PersonaSwitcher Component Tests
 *
 * Tests for the PersonaSwitcher dropdown component covering:
 * - Agent list display (Requirement 4.2)
 * - Agent selection and state updates (Requirement 4.3)
 * - Loading and error states (Requirement 4.5)
 * - Retry logic on fetch failure (Requirement 4.5)
 * - Keyboard navigation (Requirement 13.3)
 * - Agent display information (Requirement 4.6)
 */

// Mock agents data
const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    name: 'Assistant Alpha',
    description: 'A helpful general-purpose assistant',
    voice: 'en-US-JennyNeural',
    language: 'en-US',
  },
  {
    id: 'agent-2',
    name: 'Assistant Beta',
    description: 'A specialized technical assistant',
    voice: 'en-US-GuyNeural',
    language: 'en-US',
  },
  {
    id: 'agent-3',
    name: 'Assistant Gamma',
    voice: 'es-ES-ElviraNeural',
    language: 'es-ES',
  },
];

// Helper function to create a test query client
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

// Helper function to render component with providers
function renderWithProviders(component: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
}

describe('PersonaSwitcher', () => {
  let mockRefetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset Zustand store
    useAppStore.setState({
      selectedAgentId: null,
      messages: [],
      currentViseme: null,
      playbackState: 'idle',
      notifications: [],
    });

    mockRefetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe('Agent List Display', () => {
    it('should display loading state while fetching agents', () => {
      vi.spyOn(useReactQueryModule, 'useAgents').mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      } as any);

      renderWithProviders(<PersonaSwitcher />);

      expect(screen.getByText('Loading agents...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select ai agent/i })).toBeDisabled();
    });

    it('should display agent list when data is loaded', async () => {
      vi.spyOn(useReactQueryModule, 'useAgents').mockReturnValue({
        data: mockAgents,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      renderWithProviders(<PersonaSwitcher />);

      const button = screen.getByRole('button', { name: /select ai agent/i });
      expect(button).not.toBeDisabled();
      expect(screen.getByText('Select an agent...')).toBeInTheDocument();

      // Open dropdown
      await userEvent.click(button);

      // Verify all agents are displayed
      expect(screen.getByText('Assistant Alpha')).toBeInTheDocument();
      expect(screen.getByText('Assistant Beta')).toBeInTheDocument();
      expect(screen.getByText('Assistant Gamma')).toBeInTheDocument();
    });

    it('should display agent name and description in dropdown options', async () => {
      vi.spyOn(useReactQueryModule, 'useAgents').mockReturnValue({
        data: mockAgents,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      renderWithProviders(<PersonaSwitcher />);

      // Open dropdown
      await userEvent.click(screen.getByRole('button', { name: /select ai agent/i }));

      // Verify agent names are displayed (Requirement 4.6)
      expect(screen.getByText('Assistant Alpha')).toBeInTheDocument();
      expect(screen.getByText('Assistant Beta')).toBeInTheDocument();

      // Verify descriptions are displayed (Requirement 4.6)
      expect(screen.getByText('A helpful general-purpose assistant')).toBeInTheDocument();
      expect(screen.getByText('A specialized technical assistant')).toBeInTheDocument();

      // Verify agent without description is still displayed
      expect(screen.getByText('Assistant Gamma')).toBeInTheDocument();

      // Verify language and voice info is displayed
      expect(screen.getByText(/en-US.*en-US-JennyNeural/)).toBeInTheDocument();
      expect(screen.getByText(/es-ES.*es-ES-ElviraNeural/)).toBeInTheDocument();
    });
  });

  describe('Agent Selection', () => {
    it('should update Zustand store when agent is selected', async () => {
      vi.spyOn(useReactQueryModule, 'useAgents').mockReturnValue({
        data: mockAgents,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      renderWithProviders(<PersonaSwitcher />);

      // Open dropdown
      await userEvent.click(screen.getByRole('button', { name: /select ai agent/i }));

      // Select an agent
      await userEvent.click(screen.getByText('Assistant Alpha'));

      // Verify store was updated (Requirement 4.3)
      expect(useAppStore.getState().selectedAgentId).toBe('agent-1');
    });

    it('should display selected agent in button', async () => {
      vi.spyOn(useReactQueryModule, 'useAgents').mockReturnValue({
        data: mockAgents,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      renderWithProviders(<PersonaSwitcher />);

      // Open dropdown and select agent
      await userEvent.click(screen.getByRole('button', { name: /select ai agent/i }));
      await userEvent.click(screen.getByText('Assistant Beta'));

      // Verify selected agent is displayed in button
      expect(screen.getByText('Assistant Beta')).toBeInTheDocument();
      expect(screen.getByText('A specialized technical assistant')).toBeInTheDocument();
    });

    it('should close dropdown after selection', async () => {
      vi.spyOn(useReactQueryModule, 'useAgents').mockReturnValue({
        data: mockAgents,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      renderWithProviders(<PersonaSwitcher />);

      // Open dropdown
      const button = screen.getByRole('button', { name: /select ai agent/i });
      await userEvent.click(button);

      // Verify dropdown is open
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Select an agent
      await userEvent.click(screen.getByText('Assistant Alpha'));

      // Verify dropdown is closed
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('should highlight selected agent in dropdown', async () => {
      vi.spyOn(useReactQueryModule, 'useAgents').mockReturnValue({
        data: mockAgents,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      // Set initial selected agent
      useAppStore.setState({ selectedAgentId: 'agent-2' });

      renderWithProviders(<PersonaSwitcher />);

      // Open dropdown
      await userEvent.click(screen.getByRole('button', { name: /select ai agent/i }));

      // Verify selected agent has aria-selected attribute
      const selectedOption = screen.getByRole('option', { name: /Assistant Beta/i });
      expect(selectedOption).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Error Handling and Retry Logic', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should display error message when agent fetch fails', () => {
      const mockError = new Error('Network error');
      vi.spyOn(useReactQueryModule, 'useAgents').mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        refetch: mockRefetch,
      } as any);

      renderWithProviders(<PersonaSwitcher />);

      expect(screen.getByText(/Error loading agents/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select ai agent/i })).toBeDisabled();
    });

    it('should retry after 5 seconds on failure', async () => {
      const mockError = new Error('Network error');
      vi.spyOn(useReactQueryModule, 'useAgents').mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        refetch: mockRefetch,
      } as any);

      renderWithProviders(<PersonaSwitcher />);

      // Verify refetch hasn't been called yet
      expect(mockRefetch).not.toHaveBeenCalled();

      // Fast-forward 5 seconds (Requirement 4.5)
      await vi.advanceTimersByTimeAsync(5000);

      // Verify refetch was called
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry multiple times for the same error', async () => {
      const mockError = new Error('Network error');
      vi.spyOn(useReactQueryModule, 'useAgents').mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        refetch: mockRefetch,
      } as any);

      renderWithProviders(<PersonaSwitcher />);

      // Fast-forward 5 seconds
      await vi.advanceTimersByTimeAsync(5000);

      expect(mockRefetch).toHaveBeenCalledTimes(1);

      // Fast-forward another 5 seconds
      await vi.advanceTimersByTimeAsync(5000);

      // Should still only be called once
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should open dropdown with Enter key', async () => {
      vi.spyOn(useReactQueryModule, 'useAgents').mockReturnValue({
        data: mockAgents,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      renderWithProviders(<PersonaSwitcher />);

      const button = screen.getByRole('button', { name: /select ai agent/i });
      button.focus();

      // Press Enter to open dropdown
      fireEvent.keyDown(button, { key: 'Enter' });

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should navigate options with arrow keys', async () => {
      vi.spyOn(useReactQueryModule, 'useAgents').mockReturnValue({
        data: mockAgents,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      const { container } = renderWithProviders(<PersonaSwitcher />);

      const button = screen.getByRole('button', { name: /select ai agent/i });
      button.focus();

      // Open dropdown with ArrowDown
      fireEvent.keyDown(container.firstChild as Element, { key: 'ArrowDown' });

      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Navigate down
      fireEvent.keyDown(container.firstChild as Element, { key: 'ArrowDown' });

      // Navigate up
      fireEvent.keyDown(container.firstChild as Element, { key: 'ArrowUp' });

      // Verify dropdown is still open
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should select agent with Enter key', async () => {
      vi.spyOn(useReactQueryModule, 'useAgents').mockReturnValue({
        data: mockAgents,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      const { container } = renderWithProviders(<PersonaSwitcher />);

      const button = screen.getByRole('button', { name: /select ai agent/i });
      button.focus();

      // Open dropdown
      fireEvent.keyDown(container.firstChild as Element, { key: 'ArrowDown' });

      // Select first agent with Enter
      fireEvent.keyDown(container.firstChild as Element, { key: 'Enter' });

      // Verify agent was selected
      await waitFor(() => {
        expect(useAppStore.getState().selectedAgentId).toBe('agent-1');
      });

      // Verify dropdown is closed
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('should close dropdown with Escape key', async () => {
      vi.spyOn(useReactQueryModule, 'useAgents').mockReturnValue({
        data: mockAgents,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      const { container } = renderWithProviders(<PersonaSwitcher />);

      const button = screen.getByRole('button', { name: /select ai agent/i });
      button.focus();

      // Open dropdown
      fireEvent.keyDown(container.firstChild as Element, { key: 'ArrowDown' });

      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Close with Escape
      fireEvent.keyDown(container.firstChild as Element, { key: 'Escape' });

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('should close dropdown with Tab key', async () => {
      vi.spyOn(useReactQueryModule, 'useAgents').mockReturnValue({
        data: mockAgents,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      const { container } = renderWithProviders(<PersonaSwitcher />);

      const button = screen.getByRole('button', { name: /select ai agent/i });
      button.focus();

      // Open dropdown
      fireEvent.keyDown(container.firstChild as Element, { key: 'ArrowDown' });

      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Tab away
      fireEvent.keyDown(container.firstChild as Element, { key: 'Tab' });

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      vi.spyOn(useReactQueryModule, 'useAgents').mockReturnValue({
        data: mockAgents,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      renderWithProviders(<PersonaSwitcher />);

      const button = screen.getByRole('button', { name: /select ai agent/i });

      // Verify ARIA attributes (Requirement 13.1)
      expect(button).toHaveAttribute('aria-label', 'Select AI agent');
      expect(button).toHaveAttribute('aria-haspopup', 'listbox');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should update aria-expanded when dropdown opens', async () => {
      vi.spyOn(useReactQueryModule, 'useAgents').mockReturnValue({
        data: mockAgents,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      renderWithProviders(<PersonaSwitcher />);

      const button = screen.getByRole('button', { name: /select ai agent/i });

      // Initially closed
      expect(button).toHaveAttribute('aria-expanded', 'false');

      // Open dropdown
      await userEvent.click(button);

      // Should be expanded
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have proper listbox role and aria-label', async () => {
      vi.spyOn(useReactQueryModule, 'useAgents').mockReturnValue({
        data: mockAgents,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      renderWithProviders(<PersonaSwitcher />);

      // Open dropdown
      await userEvent.click(screen.getByRole('button', { name: /select ai agent/i }));

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-label', 'Available AI agents');
    });
  });

  describe('Click Outside Behavior', () => {
    it('should close dropdown when clicking outside', async () => {
      vi.spyOn(useReactQueryModule, 'useAgents').mockReturnValue({
        data: mockAgents,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      renderWithProviders(
        <div>
          <PersonaSwitcher />
          <div data-testid="outside">Outside element</div>
        </div>
      );

      // Open dropdown
      await userEvent.click(screen.getByRole('button', { name: /select ai agent/i }));

      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Click outside
      await userEvent.click(screen.getByTestId('outside'));

      // Dropdown should be closed
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });
});
