import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ErrorBoundary,
  AvatarCanvasErrorBoundary,
  ChatInterfaceErrorBoundary,
  PersonaSwitcherErrorBoundary,
} from '../ErrorBoundary';
import { logger } from '@/lib/logger';

/**
 * ErrorBoundary Unit Tests
 *
 * Tests for the ErrorBoundary component and its component-specific variants covering:
 * - Error catching and fallback UI display (Requirement 10.6)
 * - Error logging with stack traces (Requirement 10.5, 10.7)
 * - Reload functionality to recover from errors
 * - Component-specific error boundaries
 * - Custom fallback UI
 * - Maintaining application state for unaffected features
 *
 * **Validates: Requirements 10.6, 10.7**
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
function ThrowError({ shouldThrow = true, errorMessage = 'Test error' }: { shouldThrow?: boolean; errorMessage?: string }) {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
}

// Component that works correctly
function WorkingComponent() {
  return <div>Working component</div>;
}

describe('ErrorBoundary Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test: Error Catching
   * Validates: Requirement 10.6
   */
  describe('Error Catching (Requirement 10.6)', () => {
    it('should catch errors thrown by child components', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Should display fallback UI instead of crashing
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should display error message in fallback UI', () => {
      const errorMessage = 'Custom error message';
      
      render(
        <ErrorBoundary>
          <ThrowError errorMessage={errorMessage} />
        </ErrorBoundary>
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should not catch errors when children render successfully', () => {
      render(
        <ErrorBoundary>
          <WorkingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });

    it('should catch errors from multiple child components', () => {
      render(
        <ErrorBoundary>
          <WorkingComponent />
          <ThrowError />
        </ErrorBoundary>
      );

      // Should catch the error and display fallback
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.queryByText('Working component')).not.toBeInTheDocument();
    });

    it('should prevent component crashes from breaking the entire application', () => {
      const { container } = render(
        <div>
          <div>Unaffected component</div>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
          <div>Another unaffected component</div>
        </div>
      );

      // Error boundary should catch the error
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      
      // Other components should still be visible (maintaining application state)
      expect(screen.getByText('Unaffected component')).toBeInTheDocument();
      expect(screen.getByText('Another unaffected component')).toBeInTheDocument();
    });
  });

  /**
   * Test: Fallback UI Display
   * Validates: Requirement 10.6
   */
  describe('Fallback UI Display (Requirement 10.6)', () => {
    it('should display default fallback UI with error icon', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should display reload button in fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /reload component/i });
      expect(reloadButton).toBeInTheDocument();
    });

    it('should display troubleshooting guidance in fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/if the problem persists/i)).toBeInTheDocument();
      expect(screen.getByText(/check the console for more details/i)).toBeInTheDocument();
    });

    it('should display component name in fallback UI when provided', () => {
      render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('TestComponent Error')).toBeInTheDocument();
    });

    it('should use custom fallback UI when provided', () => {
      const customFallback = (error: Error, reset: () => void) => (
        <div>
          <h1>Custom Error UI</h1>
          <p>{error.message}</p>
          <button onClick={reset}>Custom Reload</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError errorMessage="Custom error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
      expect(screen.getByText('Custom error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /custom reload/i })).toBeInTheDocument();
    });
  });

  /**
   * Test: Error Logging
   * Validates: Requirements 10.5, 10.7
   */
  describe('Error Logging (Requirements 10.5, 10.7)', () => {
    it('should log error with stack trace when error is caught', () => {
      render(
        <ErrorBoundary>
          <ThrowError errorMessage="Test error for logging" />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Component error caught by ErrorBoundary',
        expect.objectContaining({
          component: 'ErrorBoundary',
          error: expect.objectContaining({
            message: 'Test error for logging',
            name: 'Error',
            stack: expect.any(String),
          }),
          errorInfo: expect.objectContaining({
            componentStack: expect.any(String),
          }),
          timestamp: expect.any(String),
        })
      );
    });

    it('should log error with component name when provided', () => {
      render(
        <ErrorBoundary componentName="CustomComponent">
          <ThrowError />
        </ErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Component error caught by ErrorBoundary',
        expect.objectContaining({
          component: 'CustomComponent',
        })
      );
    });

    it('should log error with ISO 8601 timestamp', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const logCall = vi.mocked(logger.error).mock.calls[0];
      const context = logCall[1] as any;
      const timestamp = context.timestamp;

      // Verify ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include error stack trace in log', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const logCall = vi.mocked(logger.error).mock.calls[0];
      const context = logCall[1] as any;
      
      expect(context.error.stack).toBeDefined();
      expect(typeof context.error.stack).toBe('string');
      expect(context.error.stack.length).toBeGreaterThan(0);
    });

    it('should include component stack in log', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const logCall = vi.mocked(logger.error).mock.calls[0];
      const context = logCall[1] as any;
      
      expect(context.errorInfo.componentStack).toBeDefined();
      expect(typeof context.errorInfo.componentStack).toBe('string');
    });

    it('should call custom onError handler when provided', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError errorMessage="Custom handler test" />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Custom handler test',
        }),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });
  });

  /**
   * Test: Reload Functionality
   * Validates: Requirement 10.7
   */
  describe('Reload Functionality (Requirement 10.7)', () => {
    it('should call reset function when reload button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Error should be displayed
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Click reload button
      const reloadButton = screen.getByRole('button', { name: /reload component/i });
      await user.click(reloadButton);

      // Should log the reset action
      expect(logger.info).toHaveBeenCalledWith(
        'ErrorBoundary reset triggered',
        expect.objectContaining({
          component: 'ErrorBoundary',
        })
      );
    });

    it('should log when error boundary is reset', async () => {
      const user = userEvent.setup();

      render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowError />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /reload component/i });
      await user.click(reloadButton);

      expect(logger.info).toHaveBeenCalledWith(
        'ErrorBoundary reset triggered',
        expect.objectContaining({
          component: 'TestComponent',
        })
      );
    });

    it('should provide reset callback to custom fallback', () => {
      let resetFn: (() => void) | null = null;

      const customFallback = (error: Error, reset: () => void) => {
        // Capture the reset function
        resetFn = reset;
        return (
          <div>
            <h1>Custom Error</h1>
            <button onClick={reset}>Custom Reset</button>
          </div>
        );
      };

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      // The reset function should have been provided to the fallback
      expect(resetFn).toBeDefined();
      expect(typeof resetFn).toBe('function');
    });

    it('should have accessible reload button with proper ARIA label', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /reload component/i });
      expect(reloadButton).toHaveAttribute('aria-label', 'Reload component');
    });
  });

  /**
   * Test: AvatarCanvasErrorBoundary
   * Validates: Requirements 10.6, 10.7
   */
  describe('AvatarCanvasErrorBoundary (Requirements 10.6, 10.7)', () => {
    it('should display avatar-specific error UI', () => {
      render(
        <AvatarCanvasErrorBoundary>
          <ThrowError errorMessage="Avatar rendering failed" />
        </AvatarCanvasErrorBoundary>
      );

      expect(screen.getByText('🎭')).toBeInTheDocument();
      expect(screen.getByText('Avatar Rendering Error')).toBeInTheDocument();
      expect(screen.getByText('Avatar rendering failed')).toBeInTheDocument();
    });

    it('should display avatar-specific troubleshooting guidance', () => {
      render(
        <AvatarCanvasErrorBoundary>
          <ThrowError />
        </AvatarCanvasErrorBoundary>
      );

      expect(screen.getByText(/check that your model file is valid and accessible/i)).toBeInTheDocument();
    });

    it('should have reload button with avatar-specific label', () => {
      render(
        <AvatarCanvasErrorBoundary>
          <ThrowError />
        </AvatarCanvasErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /reload avatar/i });
      expect(reloadButton).toBeInTheDocument();
      expect(reloadButton).toHaveAttribute('aria-label', 'Reload avatar');
    });

    it('should log errors with AvatarCanvas component name', () => {
      render(
        <AvatarCanvasErrorBoundary>
          <ThrowError />
        </AvatarCanvasErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Component error caught by ErrorBoundary',
        expect.objectContaining({
          component: 'AvatarCanvas',
        })
      );
    });

    it('should render children when no error occurs', () => {
      render(
        <AvatarCanvasErrorBoundary>
          <WorkingComponent />
        </AvatarCanvasErrorBoundary>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
      expect(screen.queryByText('Avatar Rendering Error')).not.toBeInTheDocument();
    });
  });

  /**
   * Test: ChatInterfaceErrorBoundary
   * Validates: Requirements 10.6, 10.7
   */
  describe('ChatInterfaceErrorBoundary (Requirements 10.6, 10.7)', () => {
    it('should display chat-specific error UI', () => {
      render(
        <ChatInterfaceErrorBoundary>
          <ThrowError errorMessage="Chat interface crashed" />
        </ChatInterfaceErrorBoundary>
      );

      expect(screen.getByText('💬')).toBeInTheDocument();
      expect(screen.getByText('Chat Interface Error')).toBeInTheDocument();
      expect(screen.getByText('Chat interface crashed')).toBeInTheDocument();
    });

    it('should display chat-specific troubleshooting guidance', () => {
      render(
        <ChatInterfaceErrorBoundary>
          <ThrowError />
        </ChatInterfaceErrorBoundary>
      );

      expect(screen.getByText(/your conversation history may be preserved/i)).toBeInTheDocument();
    });

    it('should have reload button with chat-specific label', () => {
      render(
        <ChatInterfaceErrorBoundary>
          <ThrowError />
        </ChatInterfaceErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /reload chat/i });
      expect(reloadButton).toBeInTheDocument();
      expect(reloadButton).toHaveAttribute('aria-label', 'Reload chat');
    });

    it('should log errors with ChatInterface component name', () => {
      render(
        <ChatInterfaceErrorBoundary>
          <ThrowError />
        </ChatInterfaceErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Component error caught by ErrorBoundary',
        expect.objectContaining({
          component: 'ChatInterface',
        })
      );
    });

    it('should render children when no error occurs', () => {
      render(
        <ChatInterfaceErrorBoundary>
          <WorkingComponent />
        </ChatInterfaceErrorBoundary>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
      expect(screen.queryByText('Chat Interface Error')).not.toBeInTheDocument();
    });
  });

  /**
   * Test: PersonaSwitcherErrorBoundary
   * Validates: Requirements 10.6, 10.7
   */
  describe('PersonaSwitcherErrorBoundary (Requirements 10.6, 10.7)', () => {
    it('should display persona switcher-specific error UI', () => {
      render(
        <PersonaSwitcherErrorBoundary>
          <ThrowError errorMessage="Agent selector failed" />
        </PersonaSwitcherErrorBoundary>
      );

      expect(screen.getByText('👤')).toBeInTheDocument();
      expect(screen.getByText('Agent Selector Error')).toBeInTheDocument();
      expect(screen.getByText('Agent selector failed')).toBeInTheDocument();
    });

    it('should display default error message when error message is empty', () => {
      render(
        <PersonaSwitcherErrorBoundary>
          <ThrowError errorMessage="" />
        </PersonaSwitcherErrorBoundary>
      );

      expect(screen.getByText('Failed to load agent selector')).toBeInTheDocument();
    });

    it('should have reload button with persona switcher-specific label', () => {
      render(
        <PersonaSwitcherErrorBoundary>
          <ThrowError />
        </PersonaSwitcherErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /reload agent selector/i });
      expect(reloadButton).toBeInTheDocument();
      expect(reloadButton).toHaveAttribute('aria-label', 'Reload agent selector');
    });

    it('should log errors with PersonaSwitcher component name', () => {
      render(
        <PersonaSwitcherErrorBoundary>
          <ThrowError />
        </PersonaSwitcherErrorBoundary>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Component error caught by ErrorBoundary',
        expect.objectContaining({
          component: 'PersonaSwitcher',
        })
      );
    });

    it('should render children when no error occurs', () => {
      render(
        <PersonaSwitcherErrorBoundary>
          <WorkingComponent />
        </PersonaSwitcherErrorBoundary>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
      expect(screen.queryByText('Agent Selector Error')).not.toBeInTheDocument();
    });
  });

  /**
   * Test: Multiple Error Boundaries
   * Validates: Requirement 10.7 - Maintaining application state
   */
  describe('Multiple Error Boundaries (Requirement 10.7)', () => {
    it('should isolate errors to specific boundaries', () => {
      render(
        <div>
          <AvatarCanvasErrorBoundary>
            <ThrowError errorMessage="Avatar error" />
          </AvatarCanvasErrorBoundary>
          <ChatInterfaceErrorBoundary>
            <WorkingComponent />
          </ChatInterfaceErrorBoundary>
        </div>
      );

      // Avatar boundary should catch its error
      expect(screen.getByText('Avatar Rendering Error')).toBeInTheDocument();
      
      // Chat interface should still work
      expect(screen.getByText('Working component')).toBeInTheDocument();
    });

    it('should allow unaffected features to continue working', () => {
      render(
        <div>
          <div>Header component</div>
          <ErrorBoundary componentName="FeatureA">
            <ThrowError />
          </ErrorBoundary>
          <ErrorBoundary componentName="FeatureB">
            <WorkingComponent />
          </ErrorBoundary>
          <div>Footer component</div>
        </div>
      );

      // Feature A should show error
      expect(screen.getByText('FeatureA Error')).toBeInTheDocument();
      
      // Feature B should work
      expect(screen.getByText('Working component')).toBeInTheDocument();
      
      // Other components should work
      expect(screen.getByText('Header component')).toBeInTheDocument();
      expect(screen.getByText('Footer component')).toBeInTheDocument();
    });

    it('should log errors from different boundaries separately', () => {
      render(
        <div>
          <ErrorBoundary componentName="Component1">
            <ThrowError errorMessage="Error 1" />
          </ErrorBoundary>
          <ErrorBoundary componentName="Component2">
            <ThrowError errorMessage="Error 2" />
          </ErrorBoundary>
        </div>
      );

      // Should have logged both errors
      expect(logger.error).toHaveBeenCalledTimes(2);
      
      // First error
      expect(logger.error).toHaveBeenCalledWith(
        'Component error caught by ErrorBoundary',
        expect.objectContaining({
          component: 'Component1',
          error: expect.objectContaining({
            message: 'Error 1',
          }),
        })
      );
      
      // Second error
      expect(logger.error).toHaveBeenCalledWith(
        'Component error caught by ErrorBoundary',
        expect.objectContaining({
          component: 'Component2',
          error: expect.objectContaining({
            message: 'Error 2',
          }),
        })
      );
    });
  });

  /**
   * Test: Error Boundary Styling
   * Validates: Requirement 10.6 - User-friendly error display
   */
  describe('Error Boundary Styling', () => {
    it('should apply proper styling classes to fallback UI', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const fallbackContainer = container.querySelector('.bg-red-50');
      expect(fallbackContainer).toBeInTheDocument();
      expect(fallbackContainer).toHaveClass('rounded-lg');
    });

    it('should style reload button with proper colors', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /reload component/i });
      expect(reloadButton).toHaveClass('bg-red-600', 'text-white', 'hover:bg-red-700');
    });

    it('should have focus styles for accessibility', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /reload component/i });
      expect(reloadButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-red-500');
    });
  });

  /**
   * Test: Edge Cases
   * Validates: Requirements 10.6, 10.7
   */
  describe('Edge Cases', () => {
    it('should handle errors with no message', () => {
      function ThrowEmptyError() {
        throw new Error();
      }

      render(
        <ErrorBoundary>
          <ThrowEmptyError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
    });

    it('should handle errors with very long messages', () => {
      const longMessage = 'A'.repeat(500);
      
      render(
        <ErrorBoundary>
          <ThrowError errorMessage={longMessage} />
        </ErrorBoundary>
      );

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle errors with special characters in message', () => {
      const specialMessage = '<script>alert("xss")</script>';
      
      render(
        <ErrorBoundary>
          <ThrowError errorMessage={specialMessage} />
        </ErrorBoundary>
      );

      // Message should be displayed as text, not executed
      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });

    it('should reset error boundary state when reset is called', async () => {
      const user = userEvent.setup();

      render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowError />
        </ErrorBoundary>
      );

      // Error should be displayed (with component name)
      expect(screen.getByText('TestComponent Error')).toBeInTheDocument();

      // Click reload button
      const reloadButton = screen.getByRole('button', { name: /reload component/i });
      await user.click(reloadButton);

      // Should log the reset
      expect(logger.info).toHaveBeenCalledWith(
        'ErrorBoundary reset triggered',
        expect.objectContaining({
          component: 'TestComponent',
        })
      );
    });

    it('should handle nested error boundaries', () => {
      render(
        <ErrorBoundary componentName="Outer">
          <div>
            <ErrorBoundary componentName="Inner">
              <ThrowError errorMessage="Inner error" />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(screen.getByText('Inner Error')).toBeInTheDocument();
      expect(screen.getByText('Inner error')).toBeInTheDocument();
      
      // Outer boundary should not be triggered
      expect(screen.queryByText('Outer Error')).not.toBeInTheDocument();
    });
  });
});
