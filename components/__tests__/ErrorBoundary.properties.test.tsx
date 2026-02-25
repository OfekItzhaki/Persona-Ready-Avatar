import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import fc from 'fast-check';
import {
  ErrorBoundary,
  AvatarCanvasErrorBoundary,
  ChatInterfaceErrorBoundary,
  PersonaSwitcherErrorBoundary,
} from '../ErrorBoundary';
import { logger } from '@/lib/logger';

/**
 * ErrorBoundary Property-Based Tests
 *
 * Property tests for ErrorBoundary component using fast-check
 * to verify universal properties across randomized inputs.
 *
 * **Validates: Requirements 10.6**
 */

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Component that throws an error for testing
function ThrowError({ errorMessage }: { errorMessage: string }) {
  throw new Error(errorMessage);
}

// Component that works correctly
function WorkingComponent({ content }: { content: string }) {
  return <div data-testid="working-component">{content}</div>;
}

// Arbitraries for generating test data
const errorMessageArbitrary = fc.string({ minLength: 5, maxLength: 500 }).filter(s => {
  const trimmed = s.trim();
  // Avoid very short messages that might appear in multiple places (buttons, headings, etc.)
  return trimmed.length >= 5 && trimmed.length <= 500;
}).map(s => s.trim());

const componentNameArbitrary = fc.string({ minLength: 5, maxLength: 50 }).filter(s => {
  const trimmed = s.trim();
  return trimmed.length >= 5 && /^[a-zA-Z][a-zA-Z0-9]*$/.test(trimmed);
}).map(s => s.trim());

const workingContentArbitrary = fc.string({ minLength: 5, maxLength: 200 }).filter(s => {
  const trimmed = s.trim();
  return trimmed.length >= 5 && trimmed.length <= 200;
}).map(s => s.trim());

describe('ErrorBoundary Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Feature: avatar-client, Property 24: Error Boundary Protection
   * For any component that throws an error during rendering, the error boundary
   * should catch the error and prevent the entire application from crashing.
   *
   * **Validates: Requirements 10.6**
   */
  describe('Property 24: Error Boundary Protection', () => {
    /**
     * Property: For any error message thrown by a child component, the error boundary
     * should catch it and display fallback UI instead of crashing
     */
    it('should catch any error and display fallback UI without crashing', () => {
      fc.assert(
        fc.property(
          errorMessageArbitrary,
          (errorMessage: string) => {
            // Act - Render component that throws error
            const { container, unmount } = render(
              <ErrorBoundary>
                <ThrowError errorMessage={errorMessage} />
              </ErrorBoundary>
            );

            try {
              // Assert - Property 1: Should display fallback UI (not crash)
              expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

              // Property 2: Should display the error message (check container)
              const container = screen.getByText(/something went wrong/i).closest('.bg-red-50');
              expect(container?.textContent).toContain(errorMessage);

              // Property 3: Should display reload button
              const reloadButton = screen.getByRole('button', { name: /reload component/i });
              expect(reloadButton).toBeInTheDocument();

              // Property 4: Should not render the error-throwing component
              expect(screen.queryByTestId('working-component')).not.toBeInTheDocument();

              // Property 5: Container should still be in the DOM (not crashed)
              expect(container).toBeInTheDocument();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any error thrown by a child component, the error boundary should
     * log the error with structured information
     */
    it('should log any caught error with structured information', () => {
      fc.assert(
        fc.property(
          errorMessageArbitrary,
          (errorMessage: string) => {
            // Clear previous mock calls
            vi.clearAllMocks();

            // Act - Render component that throws error
            const { unmount } = render(
              <ErrorBoundary>
                <ThrowError errorMessage={errorMessage} />
              </ErrorBoundary>
            );

            try {
              // Assert - Property 1: Logger should be called
              expect(logger.error).toHaveBeenCalled();

              // Property 2: Log should contain error message
              const logCall = vi.mocked(logger.error).mock.calls[0];
              const context = logCall[1] as any;
              expect(context.error.message).toBe(errorMessage);

              // Property 3: Log should contain component name
              expect(context.component).toBeTruthy();
              expect(typeof context.component).toBe('string');

              // Property 4: Log should contain timestamp in ISO 8601 format
              expect(context.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

              // Property 5: Log should contain error stack trace
              expect(context.error.stack).toBeDefined();
              expect(typeof context.error.stack).toBe('string');
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any component name provided to the error boundary, it should
     * be displayed in the fallback UI and included in logs
     */
    it('should display and log custom component names for any valid component name', () => {
      fc.assert(
        fc.property(
          componentNameArbitrary,
          errorMessageArbitrary,
          (componentName: string, errorMessage: string) => {
            // Clear previous mock calls
            vi.clearAllMocks();

            // Act - Render with custom component name
            const { container, unmount } = render(
              <ErrorBoundary componentName={componentName}>
                <ThrowError errorMessage={errorMessage} />
              </ErrorBoundary>
            );

            try {
              // Assert - Property 1: Component name should appear in fallback UI
              expect(screen.getByText(new RegExp(`${componentName}\\s+Error`, 'i'))).toBeInTheDocument();

              // Property 2: Component name should be in logs
              const logCall = vi.mocked(logger.error).mock.calls[0];
              const context = logCall[1] as any;
              expect(context.component).toBe(componentName);

              // Property 3: Error message should be in the DOM (check via container)
              const errorParagraphs = container.querySelectorAll('.text-red-700');
              const hasErrorMessage = Array.from(errorParagraphs).some(el => 
                el.textContent?.includes(errorMessage)
              );
              expect(hasErrorMessage).toBe(true);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any error boundary, unaffected sibling components should
     * continue to render normally (application doesn't crash)
     */
    it('should isolate errors and allow unaffected components to continue working', () => {
      fc.assert(
        fc.property(
          errorMessageArbitrary,
          workingContentArbitrary,
          workingContentArbitrary,
          (errorMessage: string, beforeContent: string, afterContent: string) => {
            // Act - Render error boundary with sibling components
            const { unmount } = render(
              <div>
                <WorkingComponent content={beforeContent} />
                <ErrorBoundary>
                  <ThrowError errorMessage={errorMessage} />
                </ErrorBoundary>
                <WorkingComponent content={afterContent} />
              </div>
            );

            try {
              // Assert - Property 1: Error boundary should catch the error
              expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

              // Property 2: Sibling components before error should still render
              const allWorkingComponents = screen.getAllByTestId('working-component');
              expect(allWorkingComponents).toHaveLength(2);
              
              // Verify both contents are present
              expect(allWorkingComponents[0].textContent).toBe(beforeContent);
              expect(allWorkingComponents[1].textContent).toBe(afterContent);

              // Property 3: Error message should be in the DOM (check container)
              const container = screen.getByText(/something went wrong/i).closest('.bg-red-50');
              expect(container?.textContent).toContain(errorMessage);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any sequence of nested error boundaries, each should catch
     * errors independently without affecting parent boundaries
     */
    it('should handle nested error boundaries independently', () => {
      fc.assert(
        fc.property(
          errorMessageArbitrary,
          componentNameArbitrary,
          componentNameArbitrary,
          (errorMessage: string, outerName: string, innerName: string) => {
            // Ensure names are different (case-insensitive)
            if (outerName.toLowerCase() === innerName.toLowerCase()) {
              return; // Skip this iteration
            }

            // Act - Render nested error boundaries
            const { unmount } = render(
              <ErrorBoundary componentName={outerName}>
                <div>
                  <ErrorBoundary componentName={innerName}>
                    <ThrowError errorMessage={errorMessage} />
                  </ErrorBoundary>
                </div>
              </ErrorBoundary>
            );

            try {
              // Assert - Property 1: Inner boundary should catch the error
              expect(screen.getByText(new RegExp(`${innerName}\\s+Error`, 'i'))).toBeInTheDocument();

              // Property 2: Error message should be in the DOM
              const container = screen.getByText(new RegExp(`${innerName}\\s+Error`, 'i')).closest('.bg-red-50');
              expect(container?.textContent).toContain(errorMessage);

              // Property 3: Outer boundary should NOT be triggered
              // Check that outer name doesn't appear in any error heading (exact match)
              const allErrorHeadings = screen.queryAllByText(/Error$/);
              const hasOuterError = allErrorHeadings.some(el => {
                const text = el.textContent || '';
                // Extract component name from "ComponentName Error" format
                const componentName = text.replace(/\s+Error$/i, '').trim();
                return componentName.toLowerCase() === outerName.toLowerCase();
              });
              expect(hasOuterError).toBe(false);

              // Property 4: Only one error fallback should be displayed
              const errorHeadings = screen.getAllByText(/Error$/);
              expect(errorHeadings).toHaveLength(1);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any error in AvatarCanvas component, the AvatarCanvasErrorBoundary
     * should catch it and display avatar-specific fallback UI
     */
    it('should catch errors in AvatarCanvas with component-specific fallback', () => {
      fc.assert(
        fc.property(
          errorMessageArbitrary,
          (errorMessage: string) => {
            // Act - Render AvatarCanvasErrorBoundary with error
            const { unmount } = render(
              <AvatarCanvasErrorBoundary>
                <ThrowError errorMessage={errorMessage} />
              </AvatarCanvasErrorBoundary>
            );

            try {
              // Assert - Property 1: Should display avatar-specific error UI
              expect(screen.getByText('Avatar Rendering Error')).toBeInTheDocument();

              // Property 2: Should display avatar emoji
              expect(screen.getByText('🎭')).toBeInTheDocument();

              // Property 3: Should display error message (check container)
              const container = screen.getByText('Avatar Rendering Error').closest('.bg-red-50');
              expect(container?.textContent).toContain(errorMessage);

              // Property 4: Should have avatar-specific reload button
              const reloadButton = screen.getByRole('button', { name: /reload avatar/i });
              expect(reloadButton).toBeInTheDocument();

              // Property 5: Should display avatar-specific guidance
              expect(screen.getByText(/check that your model file is valid and accessible/i)).toBeInTheDocument();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any error in ChatInterface component, the ChatInterfaceErrorBoundary
     * should catch it and display chat-specific fallback UI
     */
    it('should catch errors in ChatInterface with component-specific fallback', () => {
      fc.assert(
        fc.property(
          errorMessageArbitrary,
          (errorMessage: string) => {
            // Act - Render ChatInterfaceErrorBoundary with error
            const { unmount } = render(
              <ChatInterfaceErrorBoundary>
                <ThrowError errorMessage={errorMessage} />
              </ChatInterfaceErrorBoundary>
            );

            try {
              // Assert - Property 1: Should display chat-specific error UI
              expect(screen.getByText('Chat Interface Error')).toBeInTheDocument();

              // Property 2: Should display chat emoji
              expect(screen.getByText('💬')).toBeInTheDocument();

              // Property 3: Should display error message (check container)
              const container = screen.getByText('Chat Interface Error').closest('.bg-red-50');
              expect(container?.textContent).toContain(errorMessage);

              // Property 4: Should have chat-specific reload button
              const reloadButton = screen.getByRole('button', { name: /reload chat/i });
              expect(reloadButton).toBeInTheDocument();

              // Property 5: Should display chat-specific guidance
              expect(screen.getByText(/your conversation history may be preserved/i)).toBeInTheDocument();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any error in PersonaSwitcher component, the PersonaSwitcherErrorBoundary
     * should catch it and display persona-specific fallback UI
     */
    it('should catch errors in PersonaSwitcher with component-specific fallback', () => {
      fc.assert(
        fc.property(
          errorMessageArbitrary,
          (errorMessage: string) => {
            // Act - Render PersonaSwitcherErrorBoundary with error
            const { unmount } = render(
              <PersonaSwitcherErrorBoundary>
                <ThrowError errorMessage={errorMessage} />
              </PersonaSwitcherErrorBoundary>
            );

            try {
              // Assert - Property 1: Should display persona-specific error UI
              expect(screen.getByText('Agent Selector Error')).toBeInTheDocument();

              // Property 2: Should display persona emoji
              expect(screen.getByText('👤')).toBeInTheDocument();

              // Property 3: Should display error message (check container)
              const container = screen.getByText('Agent Selector Error').closest('.bg-red-50');
              expect(container?.textContent).toContain(errorMessage);

              // Property 4: Should have persona-specific reload button
              const reloadButton = screen.getByRole('button', { name: /reload agent selector/i });
              expect(reloadButton).toBeInTheDocument();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any multiple errors in different component-specific boundaries,
     * each should be caught independently with appropriate fallback UI
     */
    it('should handle multiple component-specific error boundaries independently', { timeout: 10000 }, () => {
      fc.assert(
        fc.property(
          errorMessageArbitrary,
          errorMessageArbitrary,
          errorMessageArbitrary,
          (avatarError: string, chatError: string, personaError: string) => {
            // Act - Render multiple component-specific error boundaries
            const { unmount } = render(
              <div>
                <AvatarCanvasErrorBoundary>
                  <ThrowError errorMessage={avatarError} />
                </AvatarCanvasErrorBoundary>
                <ChatInterfaceErrorBoundary>
                  <ThrowError errorMessage={chatError} />
                </ChatInterfaceErrorBoundary>
                <PersonaSwitcherErrorBoundary>
                  <ThrowError errorMessage={personaError} />
                </PersonaSwitcherErrorBoundary>
              </div>
            );

            try {
              // Assert - Property 1: All three error boundaries should catch their errors
              expect(screen.getByText('Avatar Rendering Error')).toBeInTheDocument();
              expect(screen.getByText('Chat Interface Error')).toBeInTheDocument();
              expect(screen.getByText('Agent Selector Error')).toBeInTheDocument();

              // Property 2: All error messages should be in the DOM (check containers)
              const avatarContainer = screen.getByText('Avatar Rendering Error').closest('.bg-red-50');
              expect(avatarContainer?.textContent).toContain(avatarError);
              
              const chatContainer = screen.getByText('Chat Interface Error').closest('.bg-red-50');
              expect(chatContainer?.textContent).toContain(chatError);
              
              const personaContainer = screen.getByText('Agent Selector Error').closest('.bg-red-50');
              expect(personaContainer?.textContent).toContain(personaError);

              // Property 3: Each should have its specific emoji
              expect(screen.getByText('🎭')).toBeInTheDocument();
              expect(screen.getByText('💬')).toBeInTheDocument();
              expect(screen.getByText('👤')).toBeInTheDocument();

              // Property 4: Each should have its specific reload button
              expect(screen.getByRole('button', { name: /reload avatar/i })).toBeInTheDocument();
              expect(screen.getByRole('button', { name: /reload chat/i })).toBeInTheDocument();
              expect(screen.getByRole('button', { name: /reload agent selector/i })).toBeInTheDocument();

              // Property 5: All three boundaries should be independent (3 error UIs)
              const errorHeadings = screen.getAllByText(/Error$/);
              expect(errorHeadings.length).toBeGreaterThanOrEqual(3);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any error boundary with working children, it should render
     * children normally without triggering fallback UI
     */
    it('should render children normally when no error occurs', () => {
      fc.assert(
        fc.property(
          workingContentArbitrary,
          componentNameArbitrary,
          (content: string, componentName: string) => {
            // Act - Render error boundary with working component
            const { unmount } = render(
              <ErrorBoundary componentName={componentName}>
                <WorkingComponent content={content} />
              </ErrorBoundary>
            );

            try {
              // Assert - Property 1: Should render children normally
              expect(screen.getByTestId('working-component')).toBeInTheDocument();
              expect(screen.getByTestId('working-component').textContent).toBe(content);

              // Property 2: Should NOT display fallback UI
              expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
              expect(screen.queryByText(new RegExp(`${componentName}\\s+Error`, 'i'))).not.toBeInTheDocument();

              // Property 3: Should NOT display reload button
              expect(screen.queryByRole('button', { name: /reload/i })).not.toBeInTheDocument();

              // Property 4: Logger should NOT be called
              expect(logger.error).not.toHaveBeenCalled();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any error with empty or whitespace-only message, the error boundary
     * should still catch it and display fallback UI
     */
    it('should handle errors with empty messages gracefully', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   ', '\t', '\n'),
          (emptyMessage: string) => {
            // Component that throws error with empty message
            function ThrowEmptyError() {
              throw new Error(emptyMessage);
            }

            // Act - Render with empty error message
            const { unmount } = render(
              <ErrorBoundary>
                <ThrowEmptyError />
              </ErrorBoundary>
            );

            try {
              // Assert - Property 1: Should display fallback UI
              expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

              // Property 2: Should display reload button
              expect(screen.getByRole('button', { name: /reload component/i })).toBeInTheDocument();

              // Property 3: Should log the error
              expect(logger.error).toHaveBeenCalled();
              
              // Property 4: Error message paragraph should exist (even if empty)
              const errorParagraphs = screen.getAllByText((content, element) => {
                return element?.className?.includes('text-red-700') || false;
              });
              expect(errorParagraphs.length).toBeGreaterThan(0);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 25 }
      );
    });
  });
});
