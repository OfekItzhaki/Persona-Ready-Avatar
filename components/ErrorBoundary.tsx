'use client';

import { Component, ReactNode } from 'react';
import { logger } from '@/lib/logger';

/**
 * ErrorBoundary Props
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  componentName?: string;
}

/**
 * ErrorBoundary State
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Root ErrorBoundary Component
 * 
 * Catches errors in the component tree and displays a fallback UI.
 * Logs errors with stack traces to structured logger.
 * Maintains application state to allow unaffected features to continue working.
 * 
 * Features:
 * - Error catching and fallback UI (Requirement 10.6)
 * - Structured error logging with stack traces (Requirement 10.5, 10.7)
 * - Reload functionality to recover from errors
 * - Customizable fallback UI
 * - Component-specific error boundaries
 * 
 * Requirements: 10.6, 10.7
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { componentName, onError } = this.props;

    // Log error with stack trace to structured logger (Requirement 10.5, 10.7)
    logger.error('Component error caught by ErrorBoundary', {
      component: componentName || 'ErrorBoundary',
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      timestamp: new Date().toISOString(),
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }
  }

  /**
   * Reset error boundary state
   * Allows user to attempt recovery by re-rendering the component tree
   */
  resetError = (): void => {
    logger.info('ErrorBoundary reset triggered', {
      component: this.props.componentName || 'ErrorBoundary',
    });

    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, componentName } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, this.resetError);
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={error}
          reset={this.resetError}
          componentName={componentName}
        />
      );
    }

    return children;
  }
}

/**
 * Default Error Fallback UI
 * 
 * Displays error message and "Reload" button
 */
interface DefaultErrorFallbackProps {
  error: Error;
  reset: () => void;
  componentName?: string;
}

function DefaultErrorFallback({ error, reset, componentName }: DefaultErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[200px] p-6 bg-red-50 rounded-lg">
      <div className="text-center max-w-md">
        <div className="text-red-600 text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-red-900 mb-2">
          {componentName ? `${componentName} Error` : 'Something went wrong'}
        </h2>
        <p className="text-red-700 mb-4">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
          aria-label="Reload component"
        >
          Reload
        </button>
        <p className="text-sm text-red-600 mt-4">
          If the problem persists, please check the console for more details.
        </p>
      </div>
    </div>
  );
}

/**
 * Component-specific Error Boundary for AvatarCanvas
 */
export function AvatarCanvasErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      componentName="AvatarCanvas"
      fallback={(error, reset) => (
        <div className="flex items-center justify-center h-full bg-red-50 rounded-lg">
          <div className="text-center p-6 max-w-md">
            <div className="text-red-600 text-5xl mb-4">🎭</div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Avatar Rendering Error
            </h3>
            <p className="text-red-700 mb-4">
              {error.message || 'Failed to render the 3D avatar'}
            </p>
            <button
              onClick={reset}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              aria-label="Reload avatar"
            >
              Reload Avatar
            </button>
            <p className="text-sm text-red-600 mt-4">
              Check that your model file is valid and accessible.
            </p>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Component-specific Error Boundary for ChatInterface
 */
export function ChatInterfaceErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      componentName="ChatInterface"
      fallback={(error, reset) => (
        <div className="flex items-center justify-center h-full bg-red-50 rounded-lg">
          <div className="text-center p-6 max-w-md">
            <div className="text-red-600 text-5xl mb-4">💬</div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Chat Interface Error
            </h3>
            <p className="text-red-700 mb-4">
              {error.message || 'Failed to load the chat interface'}
            </p>
            <button
              onClick={reset}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              aria-label="Reload chat"
            >
              Reload Chat
            </button>
            <p className="text-sm text-red-600 mt-4">
              Your conversation history may be preserved.
            </p>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Component-specific Error Boundary for PersonaSwitcher
 */
export function PersonaSwitcherErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      componentName="PersonaSwitcher"
      fallback={(error, reset) => (
        <div className="flex items-center justify-center p-4 bg-red-50 rounded-lg">
          <div className="text-center max-w-md">
            <div className="text-red-600 text-3xl mb-2">👤</div>
            <h3 className="text-sm font-semibold text-red-900 mb-1">
              Agent Selector Error
            </h3>
            <p className="text-xs text-red-700 mb-3">
              {error.message || 'Failed to load agent selector'}
            </p>
            <button
              onClick={reset}
              className="px-4 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              aria-label="Reload agent selector"
            >
              Reload
            </button>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
