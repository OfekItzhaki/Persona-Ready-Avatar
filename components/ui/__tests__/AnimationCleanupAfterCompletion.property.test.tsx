/**
 * Property Test: Animation Cleanup After Completion
 * 
 * **Validates: Requirements 6.5**
 * 
 * Property: For any message animation that completes, inline styles must be cleaned up 
 * to avoid style pollution.
 * 
 * This test verifies that:
 * - After animation completes, opacity inline style is removed
 * - After animation completes, transform inline style is removed
 * - Element retains its final visual state through CSS classes
 * - No memory leaks from lingering inline styles
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { MessageBubble } from '../MessageBubble';
import type { ChatMessage } from '@/types';
import fc from 'fast-check';

describe('Property 13: Animation Cleanup After Completion', () => {
  let animateSpy: ReturnType<typeof vi.fn>;
  let mockAnimation: {
    cancel: ReturnType<typeof vi.fn>;
    onfinish: (() => void) | null;
  };

  beforeEach(() => {
    // Mock Element.animate
    mockAnimation = {
      cancel: vi.fn(),
      onfinish: null,
    };

    animateSpy = vi.fn().mockReturnValue(mockAnimation);
    Element.prototype.animate = animateSpy;

    // Mock matchMedia for prefers-reduced-motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false, // Animation enabled by default
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('should clean up inline styles after animation completes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.boolean(),
        async (content, isUser) => {
          // Reset spy and cleanup before each iteration
          animateSpy.mockClear();
          cleanup();

          const message: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random()}`,
            role: isUser ? 'user' : 'agent',
            content,
            timestamp: new Date(),
          };

          const { container } = render(
            <MessageBubble message={message} isUser={isUser}>
              <p>{content}</p>
            </MessageBubble>
          );

          // Wait for animation to be called
          await waitFor(() => {
            expect(animateSpy).toHaveBeenCalled();
          });

          // Get the animated element (the outer div with flex)
          const messageContainer = container.firstChild as HTMLElement;
          expect(messageContainer).toBeTruthy();

          // Trigger the onfinish callback to simulate animation completion
          if (mockAnimation.onfinish) {
            mockAnimation.onfinish();
          }

          // Wait for cleanup to occur
          await waitFor(() => {
            // Requirement 6.5: Inline styles should be cleaned up
            // The element should not have inline opacity or transform styles
            expect(messageContainer.style.opacity).toBe('');
            expect(messageContainer.style.transform).toBe('');
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should cancel animation on unmount and prevent memory leaks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.boolean(),
        async (content, isUser) => {
          // Reset spy and cleanup before each iteration
          animateSpy.mockClear();
          cleanup();

          const message: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random()}`,
            role: isUser ? 'user' : 'agent',
            content,
            timestamp: new Date(),
          };

          const { unmount } = render(
            <MessageBubble message={message} isUser={isUser}>
              <p>{content}</p>
            </MessageBubble>
          );

          // Wait for animation to be called
          await waitFor(() => {
            expect(animateSpy).toHaveBeenCalled();
          });

          // Unmount the component before animation completes
          unmount();

          // Verify that animation.cancel() was called to prevent memory leaks
          expect(mockAnimation.cancel).toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should not animate the same message twice', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.boolean(),
        async (content, isUser) => {
          // Reset spy and cleanup before each iteration
          animateSpy.mockClear();
          cleanup();

          const message: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random()}`,
            role: isUser ? 'user' : 'agent',
            content,
            timestamp: new Date(),
          };

          const { rerender } = render(
            <MessageBubble message={message} isUser={isUser}>
              <p>{content}</p>
            </MessageBubble>
          );

          // Wait for initial animation
          await waitFor(() => {
            expect(animateSpy).toHaveBeenCalled();
          });

          const initialCallCount = animateSpy.mock.calls.length;

          // Trigger the onfinish callback to mark animation as complete
          if (mockAnimation.onfinish) {
            mockAnimation.onfinish();
          }

          // Wait for state update
          await new Promise((resolve) => setTimeout(resolve, 50));

          // Rerender with the same message
          rerender(
            <MessageBubble message={message} isUser={isUser}>
              <p>{content}</p>
            </MessageBubble>
          );

          // Wait a bit to ensure no new animation is triggered
          await new Promise((resolve) => setTimeout(resolve, 50));

          // Animation should not be called again after completion
          expect(animateSpy.mock.calls.length).toBe(initialCallCount);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should maintain visual state after cleanup through CSS classes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.boolean(),
        async (content, isUser) => {
          // Reset spy and cleanup before each iteration
          animateSpy.mockClear();
          cleanup();

          const message: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random()}`,
            role: isUser ? 'user' : 'agent',
            content,
            timestamp: new Date(),
          };

          const { container } = render(
            <MessageBubble message={message} isUser={isUser}>
              <p>{content}</p>
            </MessageBubble>
          );

          // Wait for animation to be called
          await waitFor(() => {
            expect(animateSpy).toHaveBeenCalled();
          });

          // Trigger the onfinish callback
          if (mockAnimation.onfinish) {
            mockAnimation.onfinish();
          }

          // Wait for cleanup
          await waitFor(() => {
            const messageContainer = container.firstChild as HTMLElement;
            expect(messageContainer.style.opacity).toBe('');
            expect(messageContainer.style.transform).toBe('');
          });

          // Verify the message bubble element exists and is rendered
          const messageBubble = container.querySelector('[role="article"]');
          expect(messageBubble).toBeTruthy();
          
          // Verify the message content is still visible
          expect(container.textContent).toContain(content.trim());
        }
      ),
      { numRuns: 20 }
    );
  });
});
