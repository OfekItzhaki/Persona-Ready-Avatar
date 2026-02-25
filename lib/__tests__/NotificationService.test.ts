import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationService, INotificationStore } from '../services/NotificationService';
import { Notification } from '@/types';

describe('NotificationService', () => {
  let mockStore: INotificationStore;
  let notificationService: NotificationService;
  let addedNotifications: Notification[];
  let removedIds: string[];

  beforeEach(() => {
    addedNotifications = [];
    removedIds = [];

    mockStore = {
      addNotification: vi.fn((notification: Notification) => {
        addedNotifications.push(notification);
      }),
      removeNotification: vi.fn((id: string) => {
        removedIds.push(id);
      }),
    };

    NotificationService.reset();
    notificationService = NotificationService.initialize(mockStore);
    vi.useFakeTimers();
  });

  afterEach(() => {
    NotificationService.reset();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('notification creation', () => {
    it('should create an info notification', () => {
      const id = notificationService.info('Test info message');

      expect(id).toBeTruthy();
      expect(mockStore.addNotification).toHaveBeenCalledTimes(1);
      expect(addedNotifications).toHaveLength(1);
      expect(addedNotifications[0]).toMatchObject({
        id,
        type: 'info',
        message: 'Test info message',
      });
      expect(addedNotifications[0].timestamp).toBeInstanceOf(Date);
    });

    it('should create a success notification with default duration', () => {
      const id = notificationService.success('Test success message');

      expect(id).toBeTruthy();
      expect(addedNotifications[0]).toMatchObject({
        id,
        type: 'success',
        message: 'Test success message',
        duration: 3000,
      });
    });

    it('should create a warning notification with default duration', () => {
      const id = notificationService.warning('Test warning message');

      expect(id).toBeTruthy();
      expect(addedNotifications[0]).toMatchObject({
        id,
        type: 'warning',
        message: 'Test warning message',
        duration: 5000,
      });
    });

    it('should create an error notification with default duration', () => {
      const id = notificationService.error('Test error message');

      expect(id).toBeTruthy();
      expect(addedNotifications[0]).toMatchObject({
        id,
        type: 'error',
        message: 'Test error message',
        duration: 7000,
      });
    });

    it('should create notifications with custom duration', () => {
      const id = notificationService.info('Test message', 10000);

      expect(addedNotifications[0]).toMatchObject({
        id,
        type: 'info',
        message: 'Test message',
        duration: 10000,
      });
    });

    it('should generate unique IDs for each notification', () => {
      const id1 = notificationService.info('Message 1');
      const id2 = notificationService.info('Message 2');
      const id3 = notificationService.info('Message 3');

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });
  });

  describe('auto-dismiss functionality', () => {
    it('should auto-dismiss notification after specified duration', () => {
      const id = notificationService.success('Auto-dismiss test', 3000);

      expect(mockStore.removeNotification).not.toHaveBeenCalled();

      vi.advanceTimersByTime(3000);

      expect(mockStore.removeNotification).toHaveBeenCalledWith(id);
      expect(removedIds).toContain(id);
    });

    it('should not auto-dismiss notification without duration', () => {
      notificationService.info('No auto-dismiss');

      vi.advanceTimersByTime(10000);

      expect(mockStore.removeNotification).not.toHaveBeenCalled();
    });

    it('should not auto-dismiss notification with zero duration', () => {
      notificationService.info('Zero duration', 0);

      vi.advanceTimersByTime(10000);

      expect(mockStore.removeNotification).not.toHaveBeenCalled();
    });

    it('should handle multiple notifications with different durations', () => {
      const id1 = notificationService.success('Fast', 1000);
      const id2 = notificationService.warning('Medium', 3000);
      const id3 = notificationService.error('Slow', 5000);

      vi.advanceTimersByTime(1000);
      expect(removedIds).toContain(id1);
      expect(removedIds).not.toContain(id2);
      expect(removedIds).not.toContain(id3);

      vi.advanceTimersByTime(2000);
      expect(removedIds).toContain(id2);
      expect(removedIds).not.toContain(id3);

      vi.advanceTimersByTime(2000);
      expect(removedIds).toContain(id3);
    });
  });

  describe('manual dismiss functionality', () => {
    it('should manually dismiss a notification', () => {
      const id = notificationService.info('Manual dismiss test');

      notificationService.dismiss(id);

      expect(mockStore.removeNotification).toHaveBeenCalledWith(id);
      expect(removedIds).toContain(id);
    });

    it('should cancel auto-dismiss timer when manually dismissed', () => {
      const id = notificationService.success('Cancel timer test', 5000);

      notificationService.dismiss(id);

      expect(removedIds).toContain(id);
      removedIds = [];

      vi.advanceTimersByTime(5000);

      expect(removedIds).not.toContain(id);
    });

    it('should handle dismissing non-existent notification gracefully', () => {
      expect(() => {
        notificationService.dismiss('non-existent-id');
      }).not.toThrow();

      expect(mockStore.removeNotification).toHaveBeenCalledWith('non-existent-id');
    });
  });

  describe('dismissAll functionality', () => {
    it('should clear all auto-dismiss timers', () => {
      const id1 = notificationService.success('Test 1', 3000);
      const id2 = notificationService.warning('Test 2', 5000);
      const id3 = notificationService.error('Test 3', 7000);

      notificationService.dismissAll();

      vi.advanceTimersByTime(10000);

      expect(removedIds).not.toContain(id1);
      expect(removedIds).not.toContain(id2);
      expect(removedIds).not.toContain(id3);
    });
  });

  describe('destroy functionality', () => {
    it('should clean up all timers on destroy', () => {
      const id1 = notificationService.success('Test 1', 3000);
      const id2 = notificationService.warning('Test 2', 5000);

      notificationService.destroy();

      vi.advanceTimersByTime(10000);

      expect(removedIds).not.toContain(id1);
      expect(removedIds).not.toContain(id2);
    });
  });

  describe('ID generation', () => {
    it('should generate IDs with correct format', () => {
      const id = notificationService.info('Test');

      expect(id).toMatch(/^notification-\d+-[a-z0-9]+$/);
    });

    it('should generate IDs with timestamp component', () => {
      const beforeTimestamp = Date.now();
      const id = notificationService.info('Test');
      const afterTimestamp = Date.now();

      const timestampMatch = id.match(/notification-(\d+)-/);
      expect(timestampMatch).toBeTruthy();

      const idTimestamp = parseInt(timestampMatch![1], 10);
      expect(idTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(idTimestamp).toBeLessThanOrEqual(afterTimestamp);
    });
  });
});
