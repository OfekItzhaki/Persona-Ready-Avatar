/**
 * Property Test: Message Animation Sequence
 * 
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
 * 
 * Property: For any new message added to the chat, the message must slide in from the 
 * appropriate direction, fade in from 0 to 1 opacity, and scale from 0.95 to 1.0, 
 * completing in 300ms with spring easing.
 * 
 * This test verifies that:
 * - User messages slide in from the right (translateX: 20px → 0)
 * - Agent messages slide in from the left (translateX: -20px → 0)
 * - All messages fade in from opacity 0 to 1
 * - All messages scale from 0.95 to 1.0
 * - Animation duration is 300ms
 * - Animation uses spring easing cubic-bezier(0.34, 1.56, 0.64, 1)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { MessageBubble } from '../MessageBubble';
import type { ChatMessage } from '@/types';
import fc from 'fast-check';

describe('Property 12: Message Animation Sequence', () => {
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

  it('should animate user messages sliding in from the right with correct sequence', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary message content
        fc.string({ minLength: 1, maxLength: 500 }),
        async (content) => {
          // Reset spy and cleanup before each iteration
          animateSpy.mockClear();
          cleanup();

          const userMessage: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random()}`,
            role: 'user',
            content,
            timestamp: new Date(),
          };

          render(
            <MessageBubble message={userMessage} isUser={true}>
              <p>{content}</p>
            </MessageBubble>
          );

          await waitFor(() => {
            expect(animateSpy).toHaveBeenCalled();
          });

          // Verify animation was called
          expect(animateSpy).toHaveBeenCalled();

          // Get the first animation call arguments
          const [keyframes, options] = animateSpy.mock.calls[0];

          // Requirement 6.1: User messages slide in from the right
          expect(keyframes).toHaveLength(2);
          expect(keyframes[0]).toMatchObject({
            opacity: '0',
            transform: expect.stringContaining('translateX(20px)'),
          });
          expect(keyframes[0].transform).toContain('scale(0.95)');

          // Requirement 6.2: Fade in from 0 to 1 opacity
          expect(keyframes[0].opacity).toBe('0');
          expect(keyframes[1].opacity).toBe('1');

          // Requirement 6.3: Scale from 0.95 to 1.0
          expect(keyframes[0].transform).toContain('scale(0.95)');
          expect(keyframes[1].transform).toContain('scale(1)');

          // Final state: translateX(0)
          expect(keyframes[1].transform).toContain('translateX(0)');

          // Requirement 6.4: 300ms duration with spring easing
          expect(options.duration).toBe(300);
          expect(options.easing).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)');
          expect(options.fill).toBe('forwards');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should animate agent messages sliding in from the left with correct sequence', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary message content
        fc.string({ minLength: 1, maxLength: 500 }),
        async (content) => {
          // Reset spy and cleanup before each iteration
          animateSpy.mockClear();
          cleanup();

          const agentMessage: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random()}`,
            role: 'agent',
            content,
            timestamp: new Date(),
          };

          render(
            <MessageBubble message={agentMessage} isUser={false}>
              <p>{content}</p>
            </MessageBubble>
          );

          await waitFor(() => {
            expect(animateSpy).toHaveBeenCalled();
          });

          // Verify animation was called
          expect(animateSpy).toHaveBeenCalled();

          // Get the first animation call arguments
          const [keyframes, options] = animateSpy.mock.calls[0];

          // Requirement 6.1: Agent messages slide in from the left
          expect(keyframes).toHaveLength(2);
          expect(keyframes[0]).toMatchObject({
            opacity: '0',
            transform: expect.stringContaining('translateX(-20px)'),
          });
          expect(keyframes[0].transform).toContain('scale(0.95)');

          // Requirement 6.2: Fade in from 0 to 1 opacity
          expect(keyframes[0].opacity).toBe('0');
          expect(keyframes[1].opacity).toBe('1');

          // Requirement 6.3: Scale from 0.95 to 1.0
          expect(keyframes[0].transform).toContain('scale(0.95)');
          expect(keyframes[1].transform).toContain('scale(1)');

          // Final state: translateX(0)
          expect(keyframes[1].transform).toContain('translateX(0)');

          // Requirement 6.4: 300ms duration with spring easing
          expect(options.duration).toBe(300);
          expect(options.easing).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)');
          expect(options.fill).toBe('forwards');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should respect prefers-reduced-motion setting', async () => {
    // Mock prefers-reduced-motion: reduce
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

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

          render(
            <MessageBubble message={message} isUser={isUser}>
              <p>{content}</p>
            </MessageBubble>
          );

          // Wait a bit to ensure animation would have been called if it was going to be
          await new Promise((resolve) => setTimeout(resolve, 50));

          // Animation should NOT be called when prefers-reduced-motion is enabled
          expect(animateSpy).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle rapid message additions without conflicts', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate multiple messages
        fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 5 }),
        async (contents) => {
          // Reset spy and cleanup before each iteration
          animateSpy.mockClear();
          cleanup();

          const messages = contents.map((content, index) => ({
            id: `msg-${Date.now()}-${index}-${Math.random()}`,
            role: index % 2 === 0 ? ('user' as const) : ('agent' as const),
            content,
            timestamp: new Date(),
          }));

          // Render all messages
          const { container } = render(
            <div>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} isUser={msg.role === 'user'}>
                  <p>{msg.content}</p>
                </MessageBubble>
              ))}
            </div>
          );

          await waitFor(() => {
            expect(animateSpy).toHaveBeenCalled();
          });

          // Each message should trigger at least one animation
          expect(animateSpy.mock.calls.length).toBeGreaterThanOrEqual(messages.length);

          // Verify all messages are rendered
          expect(container.querySelectorAll('[role="article"]')).toHaveLength(messages.length);
        }
      ),
      { numRuns: 10 }
    );
  });
});
