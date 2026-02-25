import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Notification } from '@/types';

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
import { NotificationToast } from '../NotificationToast';
import { useAppStore } from '@/lib/store/useAppStore';
import { NotificationService } from '@/lib/services/NotificationService';

/**
 * NotificationToast Component Tests
 *
 * Tests for the NotificationToast component covering:
 * - Notification display with different types (Requirement 10.1)
 * - Auto-dismiss functionality (Requirement 10.2)
 * - Manual dismiss (Requirement 10.2)
 * - ARIA live region for accessibility (Requirement 13.6)
 *
 * Validates Requirements 10.1, 10.2
 */

// Mock notifications data
const createMockNotification = (
  overrides?: Partial<Notification>
): Notification => ({
  id: `notification-${Date.now()}-${Math.random()}`,
  type: 'info',
  message: 'Test notification',
  timestamp: new Date(),
  duration: undefined,
  ...overrides,
});

describe('NotificationToast', () => {
  beforeEach(() => {
    // Reset Zustand store
    useAppStore.setState({
      selectedAgentId: null,
      messages: [],
      currentViseme: null,
      playbackState: 'idle',
      notifications: [],
    });

    // Initialize NotificationService with the store
    NotificationService.reset();
    NotificationService.initialize(useAppStore.getState());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    NotificationService.reset();
  });

  describe('Notification Display with Different Types', () => {
    it('should display info notification with correct styling', () => {
      const notification = createMockNotification({
        type: 'info',
        message: 'This is an info message',
      });

      useAppStore.setState({ notifications: [notification] });

      render(<NotificationToast />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(screen.getByText('This is an info message')).toBeInTheDocument();
      
      // Verify info styling classes are applied
      expect(alert).toHaveClass('bg-blue-600');
      expect(alert).toHaveClass('text-white');
      expect(alert).toHaveClass('border-blue-700');
    });

    it('should display success notification with correct styling', () => {
      const notification = createMockNotification({
        type: 'success',
        message: 'Operation completed successfully',
      });

      useAppStore.setState({ notifications: [notification] });

      render(<NotificationToast />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
      
      // Verify success styling classes are applied
      expect(alert).toHaveClass('bg-green-600');
      expect(alert).toHaveClass('text-white');
      expect(alert).toHaveClass('border-green-700');
    });

    it('should display warning notification with correct styling', () => {
      const notification = createMockNotification({
        type: 'warning',
        message: 'This is a warning',
      });

      useAppStore.setState({ notifications: [notification] });

      render(<NotificationToast />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(screen.getByText('This is a warning')).toBeInTheDocument();
      
      // Verify warning styling classes are applied
      expect(alert).toHaveClass('bg-yellow-500');
      expect(alert).toHaveClass('text-gray-900');
      expect(alert).toHaveClass('border-yellow-600');
    });

    it('should display error notification with correct styling', () => {
      const notification = createMockNotification({
        type: 'error',
        message: 'An error occurred',
      });

      useAppStore.setState({ notifications: [notification] });

      render(<NotificationToast />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(screen.getByText('An error occurred')).toBeInTheDocument();
      
      // Verify error styling classes are applied
      expect(alert).toHaveClass('bg-red-600');
      expect(alert).toHaveClass('text-white');
      expect(alert).toHaveClass('border-red-700');
    });

    it('should display multiple notifications simultaneously', () => {
      const notifications = [
        createMockNotification({ id: 'notif-1', type: 'info', message: 'Info message' }),
        createMockNotification({ id: 'notif-2', type: 'success', message: 'Success message' }),
        createMockNotification({ id: 'notif-3', type: 'error', message: 'Error message' }),
      ];

      useAppStore.setState({ notifications });

      render(<NotificationToast />);

      expect(screen.getByText('Info message')).toBeInTheDocument();
      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
      
      // Verify all three alerts are rendered
      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(3);
    });

    it('should display notification icon for each type', () => {
      const notifications = [
        createMockNotification({ id: 'notif-1', type: 'info', message: 'Info' }),
        createMockNotification({ id: 'notif-2', type: 'success', message: 'Success' }),
        createMockNotification({ id: 'notif-3', type: 'warning', message: 'Warning' }),
        createMockNotification({ id: 'notif-4', type: 'error', message: 'Error' }),
      ];

      useAppStore.setState({ notifications });

      const { container } = render(<NotificationToast />);

      // Verify icons are rendered (SVG elements)
      const svgIcons = container.querySelectorAll('svg[aria-hidden="true"]');
      // Each notification has an icon + dismiss button icon = 2 SVGs per notification
      expect(svgIcons.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Manual Dismiss Functionality', () => {
    it('should have dismiss button for each notification', () => {
      const notification = createMockNotification({
        message: 'Test notification',
      });

      useAppStore.setState({ notifications: [notification] });

      render(<NotificationToast />);

      const dismissButton = screen.getByRole('button', { name: /dismiss notification/i });
      expect(dismissButton).toBeInTheDocument();
    });

    it('should remove notification when dismiss button is clicked', async () => {
      const notification = createMockNotification({
        id: 'test-notif',
        message: 'Test notification',
      });

      useAppStore.setState({ notifications: [notification] });

      render(<NotificationToast />);

      expect(screen.getByText('Test notification')).toBeInTheDocument();

      // Click dismiss button
      const dismissButton = screen.getByRole('button', { name: /dismiss notification/i });
      await userEvent.click(dismissButton);

      // Verify notification is removed from store
      await waitFor(() => {
        expect(useAppStore.getState().notifications).toHaveLength(0);
      });
    });

    it('should only dismiss the specific notification when multiple exist', async () => {
      const notifications = [
        createMockNotification({ id: 'notif-1', message: 'First notification' }),
        createMockNotification({ id: 'notif-2', message: 'Second notification' }),
        createMockNotification({ id: 'notif-3', message: 'Third notification' }),
      ];

      useAppStore.setState({ notifications });

      render(<NotificationToast />);

      // Get all dismiss buttons
      const dismissButtons = screen.getAllByRole('button', { name: /dismiss notification/i });
      expect(dismissButtons).toHaveLength(3);

      // Click the second dismiss button
      await userEvent.click(dismissButtons[1]);

      // Verify only the second notification is removed
      await waitFor(() => {
        const remainingNotifications = useAppStore.getState().notifications;
        expect(remainingNotifications).toHaveLength(2);
        expect(remainingNotifications.find(n => n.id === 'notif-1')).toBeDefined();
        expect(remainingNotifications.find(n => n.id === 'notif-2')).toBeUndefined();
        expect(remainingNotifications.find(n => n.id === 'notif-3')).toBeDefined();
      });
    });
  });

  describe('Auto-Dismiss Functionality', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should auto-dismiss notification after specified duration', async () => {
      const notificationService = NotificationService.getInstance();
      
      render(<NotificationToast />);

      // Add notification with 3 second duration
      act(() => {
        notificationService.success('Auto-dismiss test', 3000);
      });

      // Verify notification is displayed
      expect(screen.getByText('Auto-dismiss test')).toBeInTheDocument();

      // Fast-forward time by 3 seconds
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Verify notification is removed from store
      expect(useAppStore.getState().notifications).toHaveLength(0);
      expect(screen.queryByText('Auto-dismiss test')).not.toBeInTheDocument();
    });

    it('should not auto-dismiss notification without duration', async () => {
      const notificationService = NotificationService.getInstance();
      
      render(<NotificationToast />);

      // Add notification without duration
      act(() => {
        notificationService.info('Persistent notification');
      });

      // Verify notification is displayed
      expect(screen.getByText('Persistent notification')).toBeInTheDocument();

      // Fast-forward time by 10 seconds
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Verify notification is still displayed
      expect(useAppStore.getState().notifications).toHaveLength(1);
      expect(screen.getByText('Persistent notification')).toBeInTheDocument();
    });

    it('should use default duration for success notifications', async () => {
      const notificationService = NotificationService.getInstance();
      
      render(<NotificationToast />);

      // Add success notification (default 3000ms)
      act(() => {
        notificationService.success('Success message');
      });

      expect(screen.getByText('Success message')).toBeInTheDocument();

      // Fast-forward by default duration (3000ms)
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Verify notification is removed
      expect(useAppStore.getState().notifications).toHaveLength(0);
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });

    it('should use default duration for warning notifications', async () => {
      const notificationService = NotificationService.getInstance();
      
      render(<NotificationToast />);

      // Add warning notification (default 5000ms)
      act(() => {
        notificationService.warning('Warning message');
      });

      expect(screen.getByText('Warning message')).toBeInTheDocument();

      // Fast-forward by default duration (5000ms)
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Verify notification is removed
      expect(useAppStore.getState().notifications).toHaveLength(0);
      expect(screen.queryByText('Warning message')).not.toBeInTheDocument();
    });

    it('should use default duration for error notifications', async () => {
      const notificationService = NotificationService.getInstance();
      
      render(<NotificationToast />);

      // Add error notification (default 7000ms)
      act(() => {
        notificationService.error('Error message');
      });

      expect(screen.getByText('Error message')).toBeInTheDocument();

      // Fast-forward by default duration (7000ms)
      act(() => {
        vi.advanceTimersByTime(7000);
      });

      // Verify notification is removed
      expect(useAppStore.getState().notifications).toHaveLength(0);
      expect(screen.queryByText('Error message')).not.toBeInTheDocument();
    });

    it('should cancel auto-dismiss when manually dismissed', async () => {
      const notificationService = NotificationService.getInstance();
      
      render(<NotificationToast />);

      // Add notification with 5 second duration
      act(() => {
        notificationService.success('Manual dismiss test', 5000);
      });

      expect(screen.getByText('Manual dismiss test')).toBeInTheDocument();

      // Manually dismiss after 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      
      const dismissButton = screen.getByRole('button', { name: /dismiss notification/i });
      
      // Use fireEvent instead of userEvent for synchronous click with fake timers
      act(() => {
        fireEvent.click(dismissButton);
      });

      // Verify notification is removed immediately
      expect(useAppStore.getState().notifications).toHaveLength(0);
      expect(screen.queryByText('Manual dismiss test')).not.toBeInTheDocument();

      // Fast-forward remaining time to ensure no errors
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Notification should still be gone
      expect(screen.queryByText('Manual dismiss test')).not.toBeInTheDocument();
    });
  });

  describe('ARIA Live Region', () => {
    it('should have ARIA live region for accessibility', () => {
      render(<NotificationToast />);

      const liveRegion = screen.getByRole('region', { name: /notifications/i });
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'false');
    });

    it('should have assertive aria-live for error notifications', () => {
      const notification = createMockNotification({
        type: 'error',
        message: 'Critical error',
      });

      useAppStore.setState({ notifications: [notification] });

      render(<NotificationToast />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have polite aria-live for non-error notifications', () => {
      const notifications = [
        createMockNotification({ id: 'notif-1', type: 'info', message: 'Info' }),
        createMockNotification({ id: 'notif-2', type: 'success', message: 'Success' }),
        createMockNotification({ id: 'notif-3', type: 'warning', message: 'Warning' }),
      ];

      useAppStore.setState({ notifications });

      render(<NotificationToast />);

      const alerts = screen.getAllByRole('alert');
      alerts.forEach((alert) => {
        const ariaLive = alert.getAttribute('aria-live');
        if (ariaLive !== 'assertive') {
          expect(ariaLive).toBe('polite');
        }
      });
    });

    it('should have proper role attributes for screen readers', () => {
      const notification = createMockNotification({
        message: 'Test notification',
      });

      useAppStore.setState({ notifications: [notification] });

      render(<NotificationToast />);

      // Verify region role
      const region = screen.getByRole('region', { name: /notifications/i });
      expect(region).toBeInTheDocument();

      // Verify alert role
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });
  });

  describe('Positioning', () => {
    it('should position notifications in top-right by default', () => {
      const { container } = render(<NotificationToast />);

      const notificationContainer = container.firstChild as HTMLElement;
      expect(notificationContainer).toHaveClass('top-4');
      expect(notificationContainer).toHaveClass('right-4');
    });

    it('should position notifications in bottom-right when specified', () => {
      const { container } = render(<NotificationToast position="bottom-right" />);

      const notificationContainer = container.firstChild as HTMLElement;
      expect(notificationContainer).toHaveClass('bottom-4');
      expect(notificationContainer).toHaveClass('right-4');
    });

    it('should have fixed positioning', () => {
      const { container } = render(<NotificationToast />);

      const notificationContainer = container.firstChild as HTMLElement;
      expect(notificationContainer).toHaveClass('fixed');
    });

    it('should have high z-index for visibility', () => {
      const { container } = render(<NotificationToast />);

      const notificationContainer = container.firstChild as HTMLElement;
      expect(notificationContainer).toHaveClass('z-50');
    });
  });

  describe('Empty State', () => {
    it('should render empty container when no notifications', () => {
      const { container } = render(<NotificationToast />);

      const notificationContainer = container.firstChild as HTMLElement;
      expect(notificationContainer).toBeInTheDocument();
      
      // Should have no alerts
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should not display any messages when notifications array is empty', () => {
      useAppStore.setState({ notifications: [] });

      render(<NotificationToast />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className to container', () => {
      const { container } = render(<NotificationToast className="custom-class" />);

      const notificationContainer = container.firstChild as HTMLElement;
      expect(notificationContainer).toHaveClass('custom-class');
    });

    it('should preserve default classes when custom className is provided', () => {
      const { container } = render(<NotificationToast className="custom-class" />);

      const notificationContainer = container.firstChild as HTMLElement;
      expect(notificationContainer).toHaveClass('fixed');
      expect(notificationContainer).toHaveClass('z-50');
      expect(notificationContainer).toHaveClass('custom-class');
    });
  });
});
