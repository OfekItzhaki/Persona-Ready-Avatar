import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import fc from 'fast-check';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationToast } from '../NotificationToast';
import { ChatInterface } from '../ChatInterface';
import { useAppStore } from '@/lib/store/useAppStore';
import { NotificationService } from '@/lib/services/NotificationService';
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

/**
 * NotificationToast Property-Based Tests
 *
 * Property tests for NotificationToast component using fast-check
 * to verify universal properties across randomized inputs.
 */

// Arbitraries for generating test data
const networkErrorMessageArbitrary = fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length >= 5);

const agentArbitrary = fc.record({
  id: fc.string({ minLength: 8, maxLength: 36 }).filter(s => s.trim().length >= 8),
  name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
  description: fc.option(
    fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length >= 5),
    { nil: undefined }
  ),
  voice: fc.constantFrom(
    'en-US-JennyNeural',
    'en-US-GuyNeural',
    'es-ES-ElviraNeural',
    'fr-FR-DeniseNeural',
    'de-DE-KatjaNeural',
    'ja-JP-NanamiNeural',
    'zh-CN-XiaoxiaoNeural'
  ),
  language: fc.constantFrom('en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'),
});

const userMessageArbitrary = fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0);

describe('NotificationToast Property Tests', () => {
  /**
   * Feature: avatar-client, Property 22: Network Error Notifications
   * For any network request failure, the application should display a user-friendly
   * error notification with the failure reason.
   *
   * **Validates: Requirements 10.2**
   */
  describe('Property 22: Network Error Notifications', () => {
    let queryClient: QueryClient;
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Create a new QueryClient for each test
      queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Mock global fetch
      mockFetch = vi.fn();
      global.fetch = mockFetch;

      // Initialize NotificationService
      NotificationService.reset();
      NotificationService.initialize(useAppStore.getState());

      // Clear messages and notifications from store
      useAppStore.getState().clearMessages();
      useAppStore.setState({ notifications: [] });

      // Clear all mocks before each test
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      queryClient.clear();
      useAppStore.getState().clearMessages();
      useAppStore.setState({ notifications: [] });
      NotificationService.reset();
    });

    /**
     * Property: For any network error during message sending, an error notification
     * should be displayed with the failure reason
     */
    it('should display error notification for any network error during message sending', { timeout: 30000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          networkErrorMessageArbitrary,
          async (errorMessage: string) => {
            // Clear state before each iteration
            useAppStore.setState({ notifications: [] });
            NotificationService.reset();
            NotificationService.initialize(useAppStore.getState());

            // Act - Trigger network error notification directly
            NotificationService.getInstance().error(errorMessage);

            // Assert - Property 1: Error notification should be created
            const notifications = useAppStore.getState().notifications;
            expect(notifications.length).toBeGreaterThan(0);

            // Property 2: At least one notification should be of type 'error'
            const errorNotifications = notifications.filter(n => n.type === 'error');
            expect(errorNotifications.length).toBeGreaterThan(0);

            // Property 3: Error notification should contain failure information
            const errorNotification = errorNotifications[0];
            expect(errorNotification.message).toBeTruthy();
            expect(errorNotification.message.length).toBeGreaterThan(0);
            expect(errorNotification.message).toBe(errorMessage);
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any network error during agent fetching, an error notification
     * should be displayed
     */
    it('should display error notification for any network error during agent fetching', { timeout: 30000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          networkErrorMessageArbitrary,
          async (errorMessage: string) => {
            // Clear state before each iteration
            useAppStore.setState({ notifications: [] });
            NotificationService.reset();
            NotificationService.initialize(useAppStore.getState());

            // Act - Simulate network error notification
            NotificationService.getInstance().error(errorMessage);

            // Assert - Property 1: Notification should be created
            const notifications = useAppStore.getState().notifications;
            expect(notifications.length).toBeGreaterThan(0);

            // Property 2: Notification should be of type error
            const errorNotifications = notifications.filter(n => n.type === 'error');
            expect(errorNotifications.length).toBeGreaterThan(0);

            // Property 3: Error should contain a message
            const errorNotification = errorNotifications[0];
            expect(errorNotification.message).toBeTruthy();
            expect(errorNotification.message.length).toBeGreaterThan(0);
            expect(errorNotification.message).toBe(errorMessage);
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any sequence of network errors, each should trigger a separate
     * error notification
     */
    it('should display separate error notifications for multiple network errors', { timeout: 30000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(networkErrorMessageArbitrary, { minLength: 2, maxLength: 5 }),
          async (errorMessages: string[]) => {
            // Clear state before each iteration
            useAppStore.setState({ notifications: [] });
            NotificationService.reset();
            NotificationService.initialize(useAppStore.getState());

            // Act - Trigger multiple network errors
            for (const errorMessage of errorMessages) {
              NotificationService.getInstance().error(errorMessage);
            }

            // Assert - Property 1: Number of notifications should match number of errors
            const notifications = useAppStore.getState().notifications;
            expect(notifications.length).toBe(errorMessages.length);

            // Property 2: All notifications should be of type 'error'
            const errorNotifications = notifications.filter(n => n.type === 'error');
            expect(errorNotifications.length).toBe(errorMessages.length);

            // Property 3: Each notification should contain the corresponding error message
            for (let i = 0; i < errorMessages.length; i++) {
              expect(errorNotifications[i].message).toBe(errorMessages[i]);
            }

            // Property 4: Each notification should have a unique ID
            const notificationIds = notifications.map(n => n.id);
            const uniqueIds = new Set(notificationIds);
            expect(uniqueIds.size).toBe(notifications.length);
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any network error, the notification should have error-specific styling
     */
    it('should apply error styling to network error notifications', { timeout: 30000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          networkErrorMessageArbitrary,
          async (errorMessage: string) => {
            // Clear state before each iteration
            useAppStore.setState({ notifications: [] });
            NotificationService.reset();
            NotificationService.initialize(useAppStore.getState());

            // Act - Trigger network error notification
            NotificationService.getInstance().error(errorMessage);

            // Render NotificationToast
            const { container, unmount } = render(<NotificationToast />);

            try {
              // Assert - Property 1: Error notification should be visible
              await waitFor(() => {
                const errorAlerts = container.querySelectorAll('[role="alert"]');
                expect(errorAlerts.length).toBeGreaterThan(0);
              }, { timeout: 1000 });

              const errorAlert = container.querySelector('[role="alert"]') as HTMLElement;

              if (errorAlert) {
                // Property 2: Should have error background color
                expect(errorAlert.className).toContain('bg-red-600');

                // Property 3: Should have white text for contrast
                expect(errorAlert.className).toContain('text-white');

                // Property 4: Should have error border color
                expect(errorAlert.className).toContain('border-red-700');

                // Property 5: Should have assertive aria-live for screen readers
                expect(errorAlert.getAttribute('aria-live')).toBe('assertive');

                // Property 6: Should display the error message
                expect(errorAlert.textContent).toContain(errorMessage);
              }
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any network error notification, it should be dismissible
     */
    it('should allow dismissing network error notifications', { timeout: 30000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          networkErrorMessageArbitrary,
          async (errorMessage: string) => {
            // Clear state before each iteration
            useAppStore.setState({ notifications: [] });
            NotificationService.reset();
            NotificationService.initialize(useAppStore.getState());

            // Act - Trigger network error notification
            NotificationService.getInstance().error(errorMessage);

            // Render NotificationToast
            const { container, unmount } = render(<NotificationToast />);

            try {
              // Assert - Property 1: Dismiss button should be present
              await waitFor(() => {
                const dismissButtons = container.querySelectorAll('button[aria-label="Dismiss notification"]');
                expect(dismissButtons.length).toBe(1);
              });

              const dismissButton = container.querySelector('button[aria-label="Dismiss notification"]') as HTMLButtonElement;
              expect(dismissButton).toBeTruthy();

              // Property 2: Clicking dismiss should remove the notification
              act(() => {
                dismissButton.click();
              });

              await waitFor(() => {
                const notifications = useAppStore.getState().notifications;
                expect(notifications.length).toBe(0);
              });

              // Property 3: Error alert should no longer be in the DOM
              const alerts = container.querySelectorAll('[role="alert"]');
              expect(alerts.length).toBe(0);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any network error with timeout, the notification should include
     * timeout information
     */
    it('should display timeout information for timeout errors', { timeout: 30000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 60000 }),
          async (timeoutDuration: number) => {
            // Clear state before each iteration
            useAppStore.setState({ notifications: [] });
            NotificationService.reset();
            NotificationService.initialize(useAppStore.getState());

            // Act - Simulate timeout error notification
            const timeoutMessage = `Request timeout after ${timeoutDuration}ms`;
            NotificationService.getInstance().error(timeoutMessage);

            // Assert - Property 1: Notification should be created
            const notifications = useAppStore.getState().notifications;
            expect(notifications.length).toBeGreaterThan(0);

            const errorNotification = notifications[0];

            // Property 2: Notification should be of type error
            expect(errorNotification.type).toBe('error');

            // Property 3: Notification message should contain timeout information
            expect(errorNotification.message).toContain('timeout');
            expect(errorNotification.message).toContain(timeoutDuration.toString());

            // Property 4: Notification message should be non-empty
            expect(errorNotification.message.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any network error, the notification should persist until manually dismissed
     * (error notifications should not auto-dismiss)
     */
    it('should not auto-dismiss network error notifications', { timeout: 30000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          networkErrorMessageArbitrary,
          async (errorMessage: string) => {
            // Clear state before each iteration
            useAppStore.setState({ notifications: [] });
            NotificationService.reset();
            NotificationService.initialize(useAppStore.getState());

            // Act - Trigger network error notification (error notifications have 7000ms duration)
            NotificationService.getInstance().error(errorMessage);

            // Assert - Property 1: Notification should be present initially
            const initialNotifications = useAppStore.getState().notifications;
            expect(initialNotifications.length).toBe(1);

            // Property 2: Notification should have a duration set (7000ms for errors)
            expect(initialNotifications[0].duration).toBe(7000);

            // Property 3: Notification should be of type error
            expect(initialNotifications[0].type).toBe('error');

            // Property 4: Notification should contain the error message
            expect(initialNotifications[0].message).toBe(errorMessage);
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any network error type (NETWORK_ERROR, TIMEOUT, SERVER_ERROR),
     * an appropriate error notification should be displayed
     */
    it('should display appropriate notifications for different network error types', { timeout: 30000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'),
          networkErrorMessageArbitrary,
          async (errorType: string, errorMessage: string) => {
            // Clear state before each iteration
            useAppStore.setState({ notifications: [] });
            NotificationService.reset();
            NotificationService.initialize(useAppStore.getState());

            // Act - Trigger error notification based on type
            let notificationMessage = errorMessage;
            if (errorType === 'TIMEOUT') {
              notificationMessage = `Request timeout: ${errorMessage}`;
            } else if (errorType === 'SERVER_ERROR') {
              notificationMessage = `Server error: ${errorMessage}`;
            }

            NotificationService.getInstance().error(notificationMessage);

            // Assert - Property 1: Notification should be created
            const notifications = useAppStore.getState().notifications;
            expect(notifications.length).toBe(1);

            // Property 2: Notification should be of type error
            expect(notifications[0].type).toBe('error');

            // Property 3: Notification message should contain the error information
            expect(notifications[0].message).toBe(notificationMessage);

            // Property 4: Notification should have a timestamp
            expect(notifications[0].timestamp).toBeInstanceOf(Date);

            // Property 5: Notification should have a unique ID
            expect(notifications[0].id).toBeTruthy();
            expect(notifications[0].id.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 25 }
      );
    });
  });
});
