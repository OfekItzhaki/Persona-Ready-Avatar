import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatInterface } from '../ChatInterface';
import { useAppStore } from '@/lib/store/useAppStore';
import { NotificationService } from '@/lib/services/NotificationService';
import * as sanitizeModule from '@/lib/utils/sanitize';
import type { Agent, ChatMessage } from '@/types';

/**
 * ChatInterface Unit Tests
 *
 * Tests for the ChatInterface component covering:
 * - Message input and submission (Requirements 5.1, 5.3)
 * - Input disabling during pending request (Requirement 5.7)
 * - Optimistic UI updates (Requirement 11.3)
 * - Error handling and input re-enabling (Requirement 5.8)
 * - Auto-scroll behavior (Requirement 9.4)
 * - Keyboard shortcuts - Enter to send (Requirement 13.2)
 * - Visual distinction between user and agent messages (Requirement 9.5)
 * - Message chronological ordering (Requirement 9.3)
 *
 * **Validates: Requirements 5.1-5.8, 9.3, 9.4, 9.5, 13.2**
 */

// Mock dependencies
vi.mock('@/lib/hooks/useReactQuery');
vi.mock('@/lib/services/NotificationService');
vi.mock('@/lib/utils/sanitize');

// Helper function to create a test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// Sample test data
const mockAgent: Agent = {
  id: 'agent-1',
  name: 'Test Agent',
  description: 'A test agent',
  voice: 'en-US-JennyNeural',
  language: 'en-US',
};

const mockTTSService = {
  synthesizeSpeech: vi.fn().mockResolvedValue({}),
};

describe('ChatInterface Component', () => {
  let queryClient: QueryClient;

  beforeEach(async () => {
    // Reset store state before each test
    useAppStore.setState({
      messages: [],
      selectedAgentId: null,
    });

    // Create fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset all mocks
    vi.clearAllMocks();

    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();

    // Setup default mock for useSendMessage
    const { useSendMessage } = await import('@/lib/hooks/useReactQuery');
    vi.mocked(useSendMessage).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
      isSuccess: false,
      data: undefined,
      error: null,
    } as any);

    // Setup default mock for NotificationService
    vi.mocked(NotificationService.getInstance).mockReturnValue({
      error: vi.fn(),
      success: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    } as any);

    // Setup default mock for sanitize
    const sanitizeModule = await import('@/lib/utils/sanitize');
    vi.mocked(sanitizeModule.sanitizeAndValidate).mockImplementation((input: string) => ({
      sanitized: input,
      isValid: true,
      error: null,
    }));
  });

  afterEach(() => {
    queryClient.clear();
  });

  /**
   * Test: Message Input Field Existence
   * Validates: Requirement 5.1
   */
  describe('Message Input (Requirement 5.1)', () => {
    it('should render a text input field for message entry', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox', { name: /message input/i });
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should have proper ARIA label for accessibility', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox', { name: /message input/i });
      expect(input).toHaveAttribute('aria-label', 'Message input');
    });

    it('should show appropriate placeholder when agent is selected', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'Type your message...');
    });

    it('should show appropriate placeholder when no agent is selected', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={null} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'Select an agent to start chatting');
    });
  });

  /**
   * Test: Conversation History Display
   * Validates: Requirements 5.2, 9.3
   */
  describe('Conversation History (Requirements 5.2, 9.3)', () => {
    it('should display scrollable conversation history', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const conversationHistory = screen.getByRole('log', { name: /conversation history/i });
      expect(conversationHistory).toBeInTheDocument();
      expect(conversationHistory).toHaveClass('overflow-y-auto');
    });

    it('should show empty state when no messages exist', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
    });

    it('should display messages in chronological order', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'First message',
          timestamp: new Date('2024-01-01T10:00:00'),
        },
        {
          id: '2',
          role: 'agent',
          content: 'Second message',
          timestamp: new Date('2024-01-01T10:01:00'),
        },
        {
          id: '3',
          role: 'user',
          content: 'Third message',
          timestamp: new Date('2024-01-01T10:02:00'),
        },
      ];

      useAppStore.setState({ messages });

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const messageElements = screen.getAllByRole('article');
      expect(messageElements).toHaveLength(3);
      expect(messageElements[0]).toHaveTextContent('First message');
      expect(messageElements[1]).toHaveTextContent('Second message');
      expect(messageElements[2]).toHaveTextContent('Third message');
    });
  });

  /**
   * Test: Visual Message Distinction
   * Validates: Requirement 9.5
   */
  describe('Visual Message Distinction (Requirement 9.5)', () => {
    it('should visually distinguish user messages from agent messages', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'User message',
          timestamp: new Date(),
        },
        {
          id: '2',
          role: 'agent',
          content: 'Agent message',
          timestamp: new Date(),
        },
      ];

      useAppStore.setState({ messages });

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const messageElements = screen.getAllByRole('article');
      
      // User message should have blue background
      expect(messageElements[0]).toHaveClass('bg-blue-600', 'text-white');
      
      // Agent message should have gray background
      expect(messageElements[1]).toHaveClass('bg-gray-200', 'text-gray-900');
    });

    it('should align user messages to the right', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'User message',
          timestamp: new Date(),
        },
      ];

      useAppStore.setState({ messages });

      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const messageContainer = container.querySelector('.justify-end');
      expect(messageContainer).toBeInTheDocument();
    });

    it('should align agent messages to the left', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'agent',
          content: 'Agent message',
          timestamp: new Date(),
        },
      ];

      useAppStore.setState({ messages });

      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const messageContainer = container.querySelector('.justify-start');
      expect(messageContainer).toBeInTheDocument();
    });
  });

  /**
   * Test: Message Submission
   * Validates: Requirements 5.3, 5.4
   */
  describe('Message Submission (Requirements 5.3, 5.4)', () => {
    it('should allow user to type and submit a message', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();
      
      const { useSendMessage } = await import('@/lib/hooks/useReactQuery');
      vi.mocked(useSendMessage).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} ttsService={mockTTSService} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(input, 'Hello, agent!');
      await user.click(sendButton);

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: mockAgent.id,
          message: 'Hello, agent!',
          ttsService: mockTTSService,
          selectedAgent: mockAgent,
        }),
        expect.any(Object)
      );
    });

    it('should clear input field after successful submission', async () => {
      const user = userEvent.setup();
      
      const { useSendMessage } = await import('@/lib/hooks/useReactQuery');
      vi.mocked(useSendMessage).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox') as HTMLInputElement;
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(input, 'Test message');
      expect(input.value).toBe('Test message');

      await user.click(sendButton);
      
      // Input should be cleared after submission
      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should not submit empty messages', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();
      
      const { useSendMessage } = await import('@/lib/hooks/useReactQuery');
      vi.mocked(useSendMessage).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const sendButton = screen.getByRole('button', { name: /send message/i });
      await user.click(sendButton);

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should not submit whitespace-only messages', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();
      
      const { useSendMessage } = await import('@/lib/hooks/useReactQuery');
      vi.mocked(useSendMessage).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(input, '   ');
      await user.click(sendButton);

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should show error notification when no agent is selected', async () => {
      const user = userEvent.setup();
      const mockError = vi.fn();
      
      // Mock NotificationService before rendering
      vi.mocked(NotificationService.getInstance).mockReturnValue({
        error: mockError,
        success: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
      } as any);

      // Render with an agent first, then remove it
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox');
      await user.type(input, 'Test message');

      // Now rerender without agent
      rerender(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={null} />
        </QueryClientProvider>
      );

      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      // Try to submit by pressing Enter (button is disabled but Enter handler should still work)
      await user.click(input);
      await user.keyboard('{Enter}');

      // Wait for the error notification to be called
      await waitFor(() => {
        expect(mockError).toHaveBeenCalledWith('Please select an agent before sending a message');
      });
    });
  });

  /**
   * Test: Input Sanitization
   * Validates: Requirement 14.5
   */
  describe('Input Sanitization (Requirement 14.5)', () => {
    it('should sanitize user input before submission', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();
      
      const { useSendMessage } = await import('@/lib/hooks/useReactQuery');
      vi.mocked(useSendMessage).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      // Mock sanitize function
      const sanitizeModule = await import('@/lib/utils/sanitize');
      vi.mocked(sanitizeModule.sanitizeAndValidate).mockReturnValue({
        sanitized: 'Sanitized message',
        isValid: true,
        error: null,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(input, '<script>alert("xss")</script>');
      await user.click(sendButton);

      expect(sanitizeModule.sanitizeAndValidate).toHaveBeenCalledWith('<script>alert("xss")</script>');
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Sanitized message',
        }),
        expect.any(Object)
      );
    });

    it('should show error notification for invalid input', async () => {
      const user = userEvent.setup();
      const mockError = vi.fn();
      
      vi.mocked(NotificationService.getInstance).mockReturnValue({
        error: mockError,
      } as any);

      // Mock sanitize function to return invalid
      const sanitizeModule = await import('@/lib/utils/sanitize');
      vi.mocked(sanitizeModule.sanitizeAndValidate).mockReturnValue({
        sanitized: '',
        isValid: false,
        error: 'Invalid input detected',
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(input, 'Invalid input');
      await user.click(sendButton);

      expect(mockError).toHaveBeenCalledWith('Invalid input detected');
    });
  });

  /**
   * Test: Input Disabling During Pending Request
   * Validates: Requirement 5.7
   */
  describe('Input Disabling During Request (Requirement 5.7)', () => {
    it('should disable input field while request is pending', async () => {
      const { useSendMessage } = await import('@/lib/hooks/useReactQuery');
      
      vi.mocked(useSendMessage).mockReturnValue({
        mutate: vi.fn(),
        isPending: true, // Simulate pending state
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should disable send button while request is pending', async () => {
      const { useSendMessage } = await import('@/lib/hooks/useReactQuery');
      
      vi.mocked(useSendMessage).mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).toBeDisabled();
    });

    it('should show "Sending..." text on button while pending', async () => {
      const { useSendMessage } = await import('@/lib/hooks/useReactQuery');
      
      vi.mocked(useSendMessage).mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      expect(screen.getByText('Sending...')).toBeInTheDocument();
    });

    it('should re-enable input field after request completes', async () => {
      const { useSendMessage } = await import('@/lib/hooks/useReactQuery');
      
      vi.mocked(useSendMessage).mockReturnValue({
        mutate: vi.fn(),
        isPending: false, // Request completed
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox');
      expect(input).not.toBeDisabled();
    });
  });

  /**
   * Test: Error Handling
   * Validates: Requirement 5.8
   */
  describe('Error Handling (Requirement 5.8)', () => {
    it('should display error notification on submission failure', async () => {
      const user = userEvent.setup();
      const mockError = vi.fn();
      
      const { useSendMessage } = await import('@/lib/hooks/useReactQuery');
      
      // Mock mutation that calls onError callback
      const mockMutate = vi.fn((variables, options) => {
        if (options?.onError) {
          options.onError(new Error('Network error'));
        }
      });
      
      vi.mocked(useSendMessage).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      vi.mocked(NotificationService.getInstance).mockReturnValue({
        error: mockError,
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(input, 'Test message');
      await user.click(sendButton);

      // Error notification should be displayed
      await waitFor(() => {
        expect(mockError).toHaveBeenCalledWith('Network error');
      });
    });

    it('should keep input enabled after error', async () => {
      const user = userEvent.setup();
      
      const { useSendMessage } = await import('@/lib/hooks/useReactQuery');
      
      const mockMutate = vi.fn((variables, options) => {
        if (options?.onError) {
          options.onError(new Error('Network error'));
        }
      });
      
      vi.mocked(useSendMessage).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(input, 'Test message');
      await user.click(sendButton);

      // Input should remain enabled after error
      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });
    });
  });

  /**
   * Test: Keyboard Shortcuts
   * Validates: Requirement 13.2
   */
  describe('Keyboard Shortcuts (Requirement 13.2)', () => {
    it('should submit message when Enter key is pressed', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();
      
      const { useSendMessage } = await import('@/lib/hooks/useReactQuery');
      vi.mocked(useSendMessage).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox');

      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test message',
        }),
        expect.any(Object)
      );
    });

    it('should not submit when Shift+Enter is pressed', async () => {
      const user = userEvent.setup();
      const mockMutate = vi.fn();
      
      const { useSendMessage } = await import('@/lib/hooks/useReactQuery');
      vi.mocked(useSendMessage).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox');

      // Type message
      await user.type(input, 'Test message');
      
      // Clear any previous calls from typing
      mockMutate.mockClear();
      
      // Simulate Shift+Enter keydown event directly
      const shiftEnterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      
      input.dispatchEvent(shiftEnterEvent);

      // Give it a moment to process
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should not submit on Shift+Enter
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it('should show keyboard hint text', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      expect(screen.getByText(/press enter to send/i)).toBeInTheDocument();
    });
  });

  /**
   * Test: Auto-Scroll Behavior
   * Validates: Requirement 9.4
   */
  describe('Auto-Scroll Behavior (Requirement 9.4)', () => {
    it('should auto-scroll to latest message when new message is added', async () => {
      const mockScrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = mockScrollIntoView;

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      // Add a new message
      const newMessage: ChatMessage = {
        id: '1',
        role: 'user',
        content: 'New message',
        timestamp: new Date(),
      };

      useAppStore.setState({ messages: [newMessage] });

      rerender(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      // Wait for scroll to be called
      await waitFor(() => {
        expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
      });
    });

    it('should have auto-scroll anchor element', () => {
      const { container } = render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      // The auto-scroll anchor is the last div in the conversation history
      const conversationHistory = container.querySelector('[role="log"]');
      expect(conversationHistory?.lastElementChild).toBeInTheDocument();
    });
  });

  /**
   * Test: Accessibility Features
   * Validates: Requirement 13.2
   */
  describe('Accessibility Features (Requirement 13.2)', () => {
    it('should have proper ARIA labels on all interactive elements', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      const conversationHistory = screen.getByRole('log');

      expect(input).toHaveAttribute('aria-label', 'Message input');
      expect(sendButton).toHaveAttribute('aria-label', 'Send message');
      expect(conversationHistory).toHaveAttribute('aria-label', 'Conversation history');
    });

    it('should have aria-live region for conversation updates', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const conversationHistory = screen.getByRole('log');
      expect(conversationHistory).toHaveAttribute('aria-live', 'polite');
    });

    it('should have descriptive help text for input field', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'message-input-help');
      expect(screen.getByText(/press enter to send/i)).toHaveAttribute('id', 'message-input-help');
    });

    it('should focus input field on mount', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveFocus();
    });
  });

  /**
   * Test: Message Timestamps
   * Validates: Requirement 9.3
   */
  describe('Message Timestamps (Requirement 9.3)', () => {
    it('should display formatted timestamps for messages', () => {
      const testDate = new Date('2024-01-15T14:30:00');
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Test message',
          timestamp: testDate,
        },
      ];

      useAppStore.setState({ messages });

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      // Check that timestamp is displayed (format: "2:30 PM")
      const formattedTime = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(testDate);

      expect(screen.getByText(formattedTime)).toBeInTheDocument();
    });
  });

  /**
   * Test: Button States
   * Validates: Requirements 5.7, 13.2
   */
  describe('Button States', () => {
    it('should disable send button when input is empty', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).toBeDisabled();
    });

    it('should disable send button when no agent is selected', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={null} />
        </QueryClientProvider>
      );

      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).toBeDisabled();
    });

    it('should enable send button when input has text and agent is selected', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      const input = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(input, 'Test message');

      expect(sendButton).not.toBeDisabled();
    });
  });
});
