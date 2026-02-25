import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TranscriptDisplay } from '../TranscriptDisplay';
import { useAppStore } from '@/lib/store/useAppStore';
import type { ChatMessage, PlaybackState } from '@/types';

/**
 * TranscriptDisplay Unit Tests
 *
 * Tests for the TranscriptDisplay component covering:
 * - Message display with timestamps (Requirements 9.1, 9.3)
 * - Visual distinction between user and agent messages (Requirement 9.5)
 * - Auto-scroll functionality (Requirement 9.4)
 * - ARIA live region announcements (Requirements 13.4, 13.6)
 * - Currently spoken text highlighting (Requirement 9.2)
 *
 * **Validates: Requirements 9.1-9.5, 13.4, 13.6**
 */

describe('TranscriptDisplay Component', () => {
  let mockScrollIntoView: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      messages: [],
      playbackState: 'idle',
    });

    // Mock scrollIntoView
    mockScrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = mockScrollIntoView;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Message Display
   * Validates: Requirement 9.1
   */
  describe('Message Display (Requirement 9.1)', () => {
    it('should display conversation text in real-time', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello, how are you?',
          timestamp: new Date('2024-01-15T10:00:00'),
        },
        {
          id: '2',
          role: 'agent',
          content: 'I am doing well, thank you!',
          timestamp: new Date('2024-01-15T10:00:05'),
        },
      ];

      useAppStore.setState({ messages });

      render(<TranscriptDisplay />);

      expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
      expect(screen.getByText('I am doing well, thank you!')).toBeInTheDocument();
    });

    it('should show empty state when no messages exist', () => {
      render(<TranscriptDisplay />);

      expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
      expect(screen.getByText(/conversation transcript will appear here/i)).toBeInTheDocument();
    });

    it('should display header with title and description', () => {
      render(<TranscriptDisplay />);

      expect(screen.getByText('Transcript')).toBeInTheDocument();
      expect(screen.getByText('Real-time conversation text')).toBeInTheDocument();
    });
  });

  /**
   * Test: Message Timestamps
   * Validates: Requirement 9.1, 9.3
   */
  describe('Message Timestamps (Requirements 9.1, 9.3)', () => {
    it('should display formatted timestamps for each message', () => {
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

      render(<TranscriptDisplay />);

      // Check that timestamp is displayed (format: "2:30 PM")
      const formattedTime = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(testDate);

      expect(screen.getByText(formattedTime)).toBeInTheDocument();
    });

    it('should display different timestamps for different messages', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'First message',
          timestamp: new Date('2024-01-15T10:00:00'),
        },
        {
          id: '2',
          role: 'agent',
          content: 'Second message',
          timestamp: new Date('2024-01-15T14:30:00'),
        },
      ];

      useAppStore.setState({ messages });

      render(<TranscriptDisplay />);

      const time1 = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(new Date('2024-01-15T10:00:00'));

      const time2 = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(new Date('2024-01-15T14:30:00'));

      expect(screen.getByText(time1)).toBeInTheDocument();
      expect(screen.getByText(time2)).toBeInTheDocument();
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

      render(<TranscriptDisplay />);

      const messageElements = screen.getAllByRole('article');

      // User message should have blue styling
      expect(messageElements[0]).toHaveClass('bg-blue-50', 'border-blue-600');

      // Agent message should have gray styling (when not highlighted)
      expect(messageElements[1]).toHaveClass('bg-gray-50', 'border-gray-400');
    });

    it('should display "You" label for user messages', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'User message',
          timestamp: new Date(),
        },
      ];

      useAppStore.setState({ messages });

      render(<TranscriptDisplay />);

      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('should display "Agent" label for agent messages', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'agent',
          content: 'Agent message',
          timestamp: new Date(),
        },
      ];

      useAppStore.setState({ messages });

      render(<TranscriptDisplay />);

      expect(screen.getByText('Agent')).toBeInTheDocument();
    });

    it('should use different text colors for user and agent messages', () => {
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

      const { container } = render(<TranscriptDisplay />);

      const userLabel = screen.getByText('You');
      const agentLabel = screen.getByText('Agent');

      expect(userLabel).toHaveClass('text-blue-700');
      expect(agentLabel).toHaveClass('text-gray-700');
    });
  });

  /**
   * Test: Chronological Message Ordering
   * Validates: Requirement 9.3
   */
  describe('Chronological Message Ordering (Requirement 9.3)', () => {
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

      render(<TranscriptDisplay />);

      const messageElements = screen.getAllByRole('article');
      expect(messageElements).toHaveLength(3);
      expect(messageElements[0]).toHaveTextContent('First message');
      expect(messageElements[1]).toHaveTextContent('Second message');
      expect(messageElements[2]).toHaveTextContent('Third message');
    });

    it('should maintain order when messages are added', () => {
      const { rerender } = render(<TranscriptDisplay />);

      // Add first message
      useAppStore.setState({
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'First',
            timestamp: new Date('2024-01-01T10:00:00'),
          },
        ],
      });

      rerender(<TranscriptDisplay />);
      expect(screen.getByText('First')).toBeInTheDocument();

      // Add second message
      useAppStore.setState({
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'First',
            timestamp: new Date('2024-01-01T10:00:00'),
          },
          {
            id: '2',
            role: 'agent',
            content: 'Second',
            timestamp: new Date('2024-01-01T10:01:00'),
          },
        ],
      });

      rerender(<TranscriptDisplay />);

      const messageElements = screen.getAllByRole('article');
      expect(messageElements[0]).toHaveTextContent('First');
      expect(messageElements[1]).toHaveTextContent('Second');
    });
  });

  /**
   * Test: Auto-Scroll Functionality
   * Validates: Requirement 9.4
   */
  describe('Auto-Scroll Functionality (Requirement 9.4)', () => {
    it('should auto-scroll to latest message when new message is added', async () => {
      const { rerender } = render(<TranscriptDisplay />);

      // Add a new message
      const newMessage: ChatMessage = {
        id: '1',
        role: 'user',
        content: 'New message',
        timestamp: new Date(),
      };

      useAppStore.setState({ messages: [newMessage] });

      rerender(<TranscriptDisplay />);

      // Wait for scroll to be called
      await waitFor(() => {
        expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
      });
    });

    it('should auto-scroll when multiple messages are added', async () => {
      const { rerender } = render(<TranscriptDisplay />);

      // Add first message
      useAppStore.setState({
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'First',
            timestamp: new Date(),
          },
        ],
      });

      rerender(<TranscriptDisplay />);

      mockScrollIntoView.mockClear();

      // Add second message
      useAppStore.setState({
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'First',
            timestamp: new Date(),
          },
          {
            id: '2',
            role: 'agent',
            content: 'Second',
            timestamp: new Date(),
          },
        ],
      });

      rerender(<TranscriptDisplay />);

      await waitFor(() => {
        expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
      });
    });

    it('should have auto-scroll anchor element', () => {
      const { container } = render(<TranscriptDisplay />);

      // The auto-scroll anchor is the last div in the transcript content
      const transcriptContent = container.querySelector('[role="log"]');
      expect(transcriptContent?.lastElementChild).toBeInTheDocument();
      expect(transcriptContent?.lastElementChild).toHaveAttribute('aria-hidden', 'true');
    });
  });

  /**
   * Test: Currently Spoken Text Highlighting
   * Validates: Requirement 9.2
   */
  describe('Currently Spoken Text Highlighting (Requirement 9.2)', () => {
    it('should highlight the most recent agent message during playback', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'agent',
          content: 'First agent message',
          timestamp: new Date('2024-01-01T10:00:00'),
        },
        {
          id: '2',
          role: 'agent',
          content: 'Second agent message',
          timestamp: new Date('2024-01-01T10:01:00'),
        },
      ];

      useAppStore.setState({
        messages,
        playbackState: 'playing',
      });

      render(<TranscriptDisplay />);

      const messageElements = screen.getAllByRole('article');

      // First message should not be highlighted
      expect(messageElements[0]).not.toHaveClass('bg-yellow-100', 'border-yellow-600');

      // Second (most recent) agent message should be highlighted
      expect(messageElements[1]).toHaveClass('bg-yellow-100', 'border-yellow-600');
    });

    it('should not highlight user messages during playback', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'User message',
          timestamp: new Date(),
        },
      ];

      useAppStore.setState({
        messages,
        playbackState: 'playing',
      });

      render(<TranscriptDisplay />);

      const messageElement = screen.getByRole('article');

      // User message should not be highlighted even during playback
      expect(messageElement).not.toHaveClass('bg-yellow-100', 'border-yellow-600');
      expect(messageElement).toHaveClass('bg-blue-50', 'border-blue-600');
    });

    it('should not highlight messages when playback is idle', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'agent',
          content: 'Agent message',
          timestamp: new Date(),
        },
      ];

      useAppStore.setState({
        messages,
        playbackState: 'idle',
      });

      render(<TranscriptDisplay />);

      const messageElement = screen.getByRole('article');

      // Message should not be highlighted when not playing
      expect(messageElement).not.toHaveClass('bg-yellow-100', 'border-yellow-600');
      expect(messageElement).toHaveClass('bg-gray-50', 'border-gray-400');
    });

    it('should show "Speaking..." indicator for highlighted message', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'agent',
          content: 'Agent message',
          timestamp: new Date(),
        },
      ];

      useAppStore.setState({
        messages,
        playbackState: 'playing',
      });

      render(<TranscriptDisplay />);

      expect(screen.getByText('Speaking...')).toBeInTheDocument();
    });

    it('should not show "Speaking..." indicator when not playing', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'agent',
          content: 'Agent message',
          timestamp: new Date(),
        },
      ];

      useAppStore.setState({
        messages,
        playbackState: 'idle',
      });

      render(<TranscriptDisplay />);

      expect(screen.queryByText('Speaking...')).not.toBeInTheDocument();
    });

    it('should update highlighting when playback state changes', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'agent',
          content: 'Agent message',
          timestamp: new Date(),
        },
      ];

      useAppStore.setState({
        messages,
        playbackState: 'idle',
      });

      const { rerender } = render(<TranscriptDisplay />);

      // Initially not highlighted
      let messageElement = screen.getByRole('article');
      expect(messageElement).not.toHaveClass('bg-yellow-100');

      // Start playback
      useAppStore.setState({
        messages,
        playbackState: 'playing',
      });

      rerender(<TranscriptDisplay />);

      // Now should be highlighted
      messageElement = screen.getByRole('article');
      expect(messageElement).toHaveClass('bg-yellow-100', 'border-yellow-600');
    });
  });

  /**
   * Test: ARIA Live Region Announcements
   * Validates: Requirements 13.4, 13.6
   */
  describe('ARIA Live Region Announcements (Requirements 13.4, 13.6)', () => {
    it('should have ARIA live region for conversation updates', () => {
      render(<TranscriptDisplay />);

      const conversationLog = screen.getByRole('log', { name: /conversation transcript/i });
      expect(conversationLog).toHaveAttribute('aria-live', 'polite');
      expect(conversationLog).toHaveAttribute('aria-atomic', 'false');
      expect(conversationLog).toHaveAttribute('aria-relevant', 'additions');
    });

    it('should have screen reader announcement for latest message', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        },
      ];

      useAppStore.setState({ messages });

      const { container } = render(<TranscriptDisplay />);

      const srOnly = container.querySelector('.sr-only[role="status"]');
      expect(srOnly).toBeInTheDocument();
      expect(srOnly).toHaveAttribute('aria-live', 'assertive');
      expect(srOnly).toHaveAttribute('aria-atomic', 'true');
      expect(srOnly).toHaveTextContent('You said: Hello');
    });

    it('should announce agent messages to screen readers', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'agent',
          content: 'How can I help you?',
          timestamp: new Date(),
        },
      ];

      useAppStore.setState({ messages });

      const { container } = render(<TranscriptDisplay />);

      const srOnly = container.querySelector('.sr-only[role="status"]');
      expect(srOnly).toHaveTextContent('Agent said: How can I help you?');
    });

    it('should update screen reader announcement when new message arrives', () => {
      const { container, rerender } = render(<TranscriptDisplay />);

      // Add first message
      useAppStore.setState({
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'First message',
            timestamp: new Date(),
          },
        ],
      });

      rerender(<TranscriptDisplay />);

      let srOnly = container.querySelector('.sr-only[role="status"]');
      expect(srOnly).toHaveTextContent('You said: First message');

      // Add second message
      useAppStore.setState({
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'First message',
            timestamp: new Date(),
          },
          {
            id: '2',
            role: 'agent',
            content: 'Second message',
            timestamp: new Date(),
          },
        ],
      });

      rerender(<TranscriptDisplay />);

      srOnly = container.querySelector('.sr-only[role="status"]');
      expect(srOnly).toHaveTextContent('Agent said: Second message');
    });

    it('should have proper ARIA labels on message elements', () => {
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

      render(<TranscriptDisplay />);

      const formattedTime = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(testDate);

      const messageElement = screen.getByRole('article');
      expect(messageElement).toHaveAttribute('aria-label', `User message at ${formattedTime}`);
    });
  });

  /**
   * Test: Text Alternatives for Audio Content
   * Validates: Requirement 13.4
   */
  describe('Text Alternatives for Audio Content (Requirement 13.4)', () => {
    it('should display text content for all agent messages', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'agent',
          content: 'This is spoken by the agent',
          timestamp: new Date(),
        },
      ];

      useAppStore.setState({ messages });

      render(<TranscriptDisplay />);

      // Text content should be visible as alternative to audio
      expect(screen.getByText('This is spoken by the agent')).toBeInTheDocument();
    });

    it('should preserve whitespace and line breaks in message content', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'agent',
          content: 'Line 1\nLine 2\nLine 3',
          timestamp: new Date(),
        },
      ];

      useAppStore.setState({ messages });

      const { container } = render(<TranscriptDisplay />);

      const messageContent = container.querySelector('.whitespace-pre-wrap');
      expect(messageContent).toBeInTheDocument();
      // Check that the class is applied for whitespace preservation
      expect(messageContent).toHaveClass('whitespace-pre-wrap');
      // Verify the content includes the newline characters
      expect(messageContent?.textContent).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should handle long messages with word wrapping', () => {
      const longMessage = 'This is a very long message that should wrap properly when displayed in the transcript to ensure readability and proper formatting across different screen sizes.';
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'agent',
          content: longMessage,
          timestamp: new Date(),
        },
      ];

      useAppStore.setState({ messages });

      const { container } = render(<TranscriptDisplay />);

      const messageContent = container.querySelector('.break-words');
      expect(messageContent).toBeInTheDocument();
      expect(messageContent).toHaveTextContent(longMessage);
    });
  });

  /**
   * Test: Audio Manager Integration
   * Validates: Requirement 9.2
   */
  describe('Audio Manager Integration (Requirement 9.2)', () => {
    it('should accept audioManager prop', () => {
      const mockAudioManager = {
        getCurrentTime: vi.fn().mockReturnValue(0),
        getDuration: vi.fn().mockReturnValue(10),
        subscribeToPlaybackState: vi.fn().mockReturnValue(() => {}),
      };

      render(<TranscriptDisplay audioManager={mockAudioManager} />);

      // Component should render without errors
      expect(screen.getByText('Transcript')).toBeInTheDocument();
    });

    it('should subscribe to playback state changes when audioManager is provided', () => {
      const mockUnsubscribe = vi.fn();
      const mockAudioManager = {
        getCurrentTime: vi.fn().mockReturnValue(0),
        getDuration: vi.fn().mockReturnValue(10),
        subscribeToPlaybackState: vi.fn().mockReturnValue(mockUnsubscribe),
      };

      const { unmount } = render(<TranscriptDisplay audioManager={mockAudioManager} />);

      expect(mockAudioManager.subscribeToPlaybackState).toHaveBeenCalled();

      // Should unsubscribe on unmount
      unmount();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should work without audioManager prop', () => {
      render(<TranscriptDisplay />);

      // Component should render without errors even without audioManager
      expect(screen.getByText('Transcript')).toBeInTheDocument();
    });
  });

  /**
   * Test: Component Styling and Layout
   * Validates: Requirements 9.1, 9.5
   */
  describe('Component Styling and Layout', () => {
    it('should have proper container structure', () => {
      const { container } = render(<TranscriptDisplay />);

      const mainContainer = container.querySelector('.flex.flex-col.h-full.bg-white');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should have scrollable content area', () => {
      render(<TranscriptDisplay />);

      const contentArea = screen.getByRole('log');
      expect(contentArea).toHaveClass('overflow-y-auto');
    });

    it('should apply custom className prop', () => {
      const { container } = render(<TranscriptDisplay className="custom-class" />);

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('custom-class');
    });

    it('should have proper spacing between messages', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'First',
          timestamp: new Date(),
        },
        {
          id: '2',
          role: 'agent',
          content: 'Second',
          timestamp: new Date(),
        },
      ];

      useAppStore.setState({ messages });

      const { container } = render(<TranscriptDisplay />);

      const contentArea = container.querySelector('.space-y-3');
      expect(contentArea).toBeInTheDocument();
    });
  });
});
