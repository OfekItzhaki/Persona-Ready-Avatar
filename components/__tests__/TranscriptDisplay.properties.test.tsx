import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { TranscriptDisplay } from '../TranscriptDisplay';
import { useAppStore } from '@/lib/store/useAppStore';
import type { ChatMessage } from '@/types';

/**
 * TranscriptDisplay Property-Based Tests
 *
 * Property tests for TranscriptDisplay component using fast-check
 * to verify universal properties across randomized inputs.
 */

// Mock scrollIntoView which is not available in jsdom
let mockScrollIntoView: ReturnType<typeof vi.fn>;

// Arbitraries for generating test data
const messageArbitrary = fc.record({
  id: fc.string({ minLength: 8, maxLength: 36 }).filter(s => s.trim().length >= 8),
  role: fc.constantFrom('user' as const, 'agent' as const),
  content: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
});

describe('TranscriptDisplay Property Tests', () => {
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
    useAppStore.getState().clearMessages();
  });

  /**
   * Feature: avatar-client, Property 20: Auto-Scroll to Latest Message
   * For any new message added to the conversation history, the transcript display
   * should automatically scroll to show the most recent message.
   *
   * **Validates: Requirements 9.4**
   */
  describe('Property 20: Auto-Scroll to Latest Message', () => {
    /**
     * Property: For any single message added, scrollIntoView should be called
     */
    it(
      'should auto-scroll when any single message is added',
      async () => {
        await fc.assert(
          fc.asyncProperty(messageArbitrary, async (message: ChatMessage) => {
            // Clear mocks before each iteration
            mockScrollIntoView.mockClear();
            useAppStore.getState().clearMessages();

            // Arrange
            const { rerender } = render(<TranscriptDisplay />);

            // Act - Add a new message
            useAppStore.setState({ messages: [message] });
            rerender(<TranscriptDisplay />);

            // Assert - Property: scrollIntoView should be called
            await waitFor(
              () => {
                expect(mockScrollIntoView).toHaveBeenCalled();
              },
              { timeout: 1000 }
            );

            // Property: scrollIntoView should be called with smooth behavior
            expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
          }),
          { numRuns: 25, timeout: 10000 }
        );
      },
      20000
    );

    /**
     * Property: For any sequence of messages, scrollIntoView should be called
     */
    it(
      'should auto-scroll for any sequence of messages',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.array(messageArbitrary, { minLength: 1, maxLength: 5 }),
            async (messages: ChatMessage[]) => {
              // Ensure unique IDs and valid timestamps
              messages.forEach((msg, idx) => {
                msg.id = `msg-${idx}-${Date.now()}-${Math.random()}`;
                // Ensure valid timestamp
                if (isNaN(msg.timestamp.getTime())) {
                  msg.timestamp = new Date();
                }
              });

              // Clear mocks before each iteration
              mockScrollIntoView.mockClear();
              useAppStore.getState().clearMessages();

              // Arrange
              const { rerender } = render(<TranscriptDisplay />);

              // Act - Add all messages at once
              useAppStore.setState({ messages });
              rerender(<TranscriptDisplay />);

              // Assert - Property: scrollIntoView should be called
              await waitFor(
                () => {
                  expect(mockScrollIntoView).toHaveBeenCalled();
                },
                { timeout: 1000 }
              );
            }
          ),
          { numRuns: 25, timeout: 10000 }
        );
      },
      20000
    );

    /**
     * Property: For any message array, scrollIntoView should use smooth behavior
     */
    it(
      'should always use smooth scroll behavior',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.array(messageArbitrary, { minLength: 1, maxLength: 5 }),
            async (messages: ChatMessage[]) => {
              // Ensure unique IDs and valid timestamps
              messages.forEach((msg, idx) => {
                msg.id = `msg-${idx}-${Date.now()}-${Math.random()}`;
                // Ensure valid timestamp
                if (isNaN(msg.timestamp.getTime())) {
                  msg.timestamp = new Date();
                }
              });

              // Clear mocks before each iteration
              mockScrollIntoView.mockClear();
              useAppStore.getState().clearMessages();

              // Arrange
              const { rerender } = render(<TranscriptDisplay />);

              // Act - Add all messages at once
              useAppStore.setState({ messages });
              rerender(<TranscriptDisplay />);

              // Assert - Property: scrollIntoView should use smooth behavior
              await waitFor(
                () => {
                  expect(mockScrollIntoView).toHaveBeenCalled();
                },
                { timeout: 1000 }
              );

              // Property: All calls should use smooth behavior
              const calls = mockScrollIntoView.mock.calls;
              for (const call of calls) {
                expect(call[0]).toEqual({ behavior: 'smooth' });
              }
            }
          ),
          { numRuns: 25, timeout: 10000 }
        );
      },
      20000
    );

    /**
     * Property: For any message array, the scroll anchor element should exist
     */
    it('should have scroll anchor element for any message array', () => {
      fc.assert(
        fc.property(
          fc.array(messageArbitrary, { minLength: 0, maxLength: 10 }),
          (messages: ChatMessage[]) => {
            // Ensure unique IDs and valid timestamps
            messages.forEach((msg, idx) => {
              msg.id = `msg-${idx}-${Date.now()}-${Math.random()}`;
              // Ensure valid timestamp
              if (isNaN(msg.timestamp.getTime())) {
                msg.timestamp = new Date();
              }
            });

            // Arrange
            useAppStore.setState({ messages });

            // Act
            const { container } = render(<TranscriptDisplay />);

            // Assert - Property: Scroll anchor should exist
            const transcriptContent = container.querySelector('[role="log"]');
            expect(transcriptContent).toBeInTheDocument();

            // Property: Last child should be the scroll anchor
            const scrollAnchor = transcriptContent?.lastElementChild;
            expect(scrollAnchor).toBeInTheDocument();

            // Property: Scroll anchor should be hidden from screen readers
            expect(scrollAnchor).toHaveAttribute('aria-hidden', 'true');
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: Auto-scroll should work for both user and agent messages
     */
    it(
      'should auto-scroll for both user and agent messages',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.array(messageArbitrary, { minLength: 2, maxLength: 5 }),
            async (messages: ChatMessage[]) => {
              // Ensure unique IDs, mix of roles, and valid timestamps
              messages.forEach((msg, idx) => {
                msg.id = `msg-${idx}-${Date.now()}-${Math.random()}`;
                msg.role = idx % 2 === 0 ? 'user' : 'agent';
                // Ensure valid timestamp
                if (isNaN(msg.timestamp.getTime())) {
                  msg.timestamp = new Date();
                }
              });

              // Clear mocks before iteration
              mockScrollIntoView.mockClear();
              useAppStore.getState().clearMessages();

              // Arrange
              const { rerender } = render(<TranscriptDisplay />);

              // Act - Add all messages
              useAppStore.setState({ messages });
              rerender(<TranscriptDisplay />);

              // Assert - Property: scrollIntoView should be called
              await waitFor(
                () => {
                  expect(mockScrollIntoView).toHaveBeenCalled();
                },
                { timeout: 1000 }
              );

              // Property: Should use smooth behavior
              expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
            }
          ),
          { numRuns: 25, timeout: 10000 }
        );
      },
      20000
    );

    /**
     * Property: Auto-scroll should work regardless of content length
     */
    it(
      'should auto-scroll regardless of message content length',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.array(messageArbitrary, { minLength: 1, maxLength: 5 }),
            async (messages: ChatMessage[]) => {
              // Ensure unique IDs and valid timestamps
              messages.forEach((msg, idx) => {
                msg.id = `msg-${idx}-${Date.now()}-${Math.random()}`;
                // Ensure valid timestamp
                if (isNaN(msg.timestamp.getTime())) {
                  msg.timestamp = new Date();
                }
              });

              // Clear mocks before iteration
              mockScrollIntoView.mockClear();
              useAppStore.getState().clearMessages();

              // Arrange
              const { rerender, container } = render(<TranscriptDisplay />);

              // Act - Add all messages
              useAppStore.setState({ messages });
              rerender(<TranscriptDisplay />);

              // Assert - Property: scrollIntoView should be called
              await waitFor(
                () => {
                  expect(mockScrollIntoView).toHaveBeenCalled();
                },
                { timeout: 1000 }
              );

              // Property: All messages should be rendered (query from container, not document)
              const messageElements = container.querySelectorAll('[role="article"]');
              expect(messageElements.length).toBe(messages.length);
            }
          ),
          { numRuns: 25, timeout: 10000 }
        );
      },
      20000
    );

    /**
     * Property: Empty message array should not cause errors
     */
    it('should handle empty message array without scrolling', () => {
      fc.assert(
        fc.property(fc.constant([]), (messages: ChatMessage[]) => {
          // Clear mocks before iteration
          mockScrollIntoView.mockClear();
          useAppStore.getState().clearMessages();

          // Arrange
          useAppStore.setState({ messages });

          // Act
          const { container } = render(<TranscriptDisplay />);

          // Assert - Property: Component should render
          expect(container).toBeInTheDocument();

          // Property: Empty state should be shown
          expect(container.textContent).toContain('No messages yet');

          // Property: Scroll anchor should still exist
          const transcriptContent = container.querySelector('[role="log"]');
          expect(transcriptContent?.lastElementChild).toBeInTheDocument();
        }),
        { numRuns: 25 }
      );
    });
  });
});
