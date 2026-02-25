import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationService, INotificationStore } from '../NotificationService';
import { Notification } from '@/types';

/**
 * Unit Tests for NotificationService
 * 
 * Tests cover:
 * - Notification creation with different types (info, success, warning, error)
 * - Auto-dismiss functionality with configurable durations
 * - Manual dismiss functionality
 * - Singleton pattern initialization and reset
 * - Edge cases and error handling
 * 
 * **Validates: Requirements 10.1, 10.2**
 */
describe('NotificationService', () => {
  let mockStore: INotificationStore;
  let service: NotificationService;

  beforeEach(() => {
    // Reset singleton before each test
    NotificationService.reset();

    // Create mock store
    mockStore = {
      addNotification: vi.fn(),
      removeNotification: vi.fn(),
    };

    // Initialize service with mock store
    service = NotificationService.initialize(mockStore);

    // Use fake timers for testing auto-dismiss
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    NotificationService.reset();
  });

  describe('singleton pattern', () => {
    it('should initialize singleton instance', () => {
      expect(service).toBeInstanceOf(NotificationService);
    });

    it('should return same instance on subsequent initialize calls', () => {
      const instance1 = NotificationService.initialize(mockStore);
      const instance2 = NotificationService.initialize(mockStore);
      expect(instance1).toBe(instance2);
    });

    it('should return initialized instance via getInstance', () => {
      const instance = NotificationService.getInstance();
      expect(instance).toBe(service);
    });

    it('should throw error when getInstance called before initialize', () => {
      NotificationService.reset();
      expect(() => NotificationService.getInstance()).toThrow(
        'NotificationService not initialized. Call initialize() first.'
      );
    });

    it('should reset singleton instance', () => {
      NotificationService.reset();
      expect(() => NotificationService.getInstance()).toThrow();
    });

    it('should allow re-initialization after reset', () => {
      NotificationService.reset();
      const newService = NotificationService.initialize(mockStore);
      expect(newService).toBeInstanceOf(NotificationService);
    });
  });

  describe('info notifications', () => {
    it('should create info notification with message', () => {
      const id = service.info('Test info message');

      expect(mockStore.addNotification).toHaveBeenCalledTimes(1);
      expect(mockStore.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringContaining('notification-'),
          type: 'info',
          message: 'Test info message',
          timestamp: expect.any(Date),
          duration: undefined,
        })
      );
      expect(id).toMatch(/^notification-\d+-[a-z0-9]+$/);
    });

    it('should create info notification with custom duration', () => {
      service.info('Test info', 5000);

      expect(mockStore.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          message: 'Test info',
          duration: 5000,
        })
      );
    });

    it('should not auto-dismiss info notification without duration', () => {
      service.info('Test info');

      vi.advanceTimersByTime(10000);

      expect(mockStore.removeNotification).not.toHaveBeenCalled();
    });

    it('should return unique ID for info notification', () => {
      const id1 = service.info('Message 1');
      const id2 = service.info('Message 2');

      expect(id1).not.toBe(id2);
    });
  });

  describe('success notifications', () => {
    it('should create success notification with default duration', () => {
      const id = service.success('Operation successful');

      expect(mockStore.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringContaining('notification-'),
          type: 'success',
          message: 'Operation successful',
          duration: 3000,
        })
      );
      expect(id).toMatch(/^notification-\d+-[a-z0-9]+$/);
    });

    it('should create success notification with custom duration', () => {
      service.success('Success!', 5000);

      expect(mockStore.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          duration: 5000,
        })
      );
    });

    it('should auto-dismiss success notification after default duration', () => {
      const id = service.success('Success!');

      expect(mockStore.removeNotification).not.toHaveBeenCalled();

      vi.advanceTimersByTime(3000);

      expect(mockStore.removeNotification).toHaveBeenCalledWith(id);
    });

    it('should auto-dismiss success notification after custom duration', () => {
      const id = service.success('Success!', 2000);

      vi.advanceTimersByTime(2000);

      expect(mockStore.removeNotification).toHaveBeenCalledWith(id);
    });
  });

  describe('warning notifications', () => {
    it('should create warning notification with default duration', () => {
      const id = service.warning('Warning message');

      expect(mockStore.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringContaining('notification-'),
          type: 'warning',
          message: 'Warning message',
          duration: 5000,
        })
      );
      expect(id).toMatch(/^notification-\d+-[a-z0-9]+$/);
    });

    it('should create warning notification with custom duration', () => {
      service.warning('Warning!', 8000);

      expect(mockStore.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          duration: 8000,
        })
      );
    });

    it('should auto-dismiss warning notification after default duration', () => {
      const id = service.warning('Warning!');

      vi.advanceTimersByTime(5000);

      expect(mockStore.removeNotification).toHaveBeenCalledWith(id);
    });

    it('should auto-dismiss warning notification after custom duration', () => {
      const id = service.warning('Warning!', 3000);

      vi.advanceTimersByTime(3000);

      expect(mockStore.removeNotification).toHaveBeenCalledWith(id);
    });
  });

  describe('error notifications', () => {
    it('should create error notification with default duration', () => {
      const id = service.error('Error occurred');

      expect(mockStore.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringContaining('notification-'),
          type: 'error',
          message: 'Error occurred',
          duration: 7000,
        })
      );
      expect(id).toMatch(/^notification-\d+-[a-z0-9]+$/);
    });

    it('should create error notification with custom duration', () => {
      service.error('Error!', 10000);

      expect(mockStore.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          duration: 10000,
        })
      );
    });

    it('should auto-dismiss error notification after default duration', () => {
      const id = service.error('Error!');

      vi.advanceTimersByTime(7000);

      expect(mockStore.removeNotification).toHaveBeenCalledWith(id);
    });

    it('should auto-dismiss error notification after custom duration', () => {
      const id = service.error('Error!', 4000);

      vi.advanceTimersByTime(4000);

      expect(mockStore.removeNotification).toHaveBeenCalledWith(id);
    });
  });

  describe('manual dismiss', () => {
    it('should manually dismiss notification by ID', () => {
      const id = service.info('Test message');

      service.dismiss(id);

      expect(mockStore.removeNotification).toHaveBeenCalledWith(id);
    });

    it('should clear auto-dismiss timer when manually dismissed', () => {
      const id = service.success('Success!');

      service.dismiss(id);

      expect(mockStore.removeNotification).toHaveBeenCalledTimes(1);

      // Advance time to when auto-dismiss would have triggered
      vi.advanceTimersByTime(3000);

      // Should not be called again
      expect(mockStore.removeNotification).toHaveBeenCalledTimes(1);
    });

    it('should handle dismiss of non-existent notification gracefully', () => {
      expect(() => service.dismiss('non-existent-id')).not.toThrow();
      expect(mockStore.removeNotification).toHaveBeenCalledWith('non-existent-id');
    });

    it('should handle dismiss of already dismissed notification', () => {
      const id = service.info('Test');
      service.dismiss(id);
      
      expect(() => service.dismiss(id)).not.toThrow();
      expect(mockStore.removeNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe('dismissAll', () => {
    it('should clear all auto-dismiss timers', () => {
      const id1 = service.success('Success 1');
      const id2 = service.warning('Warning 1');
      const id3 = service.error('Error 1');

      service.dismissAll();

      // Advance time past all durations
      vi.advanceTimersByTime(10000);

      // No notifications should be auto-dismissed
      expect(mockStore.removeNotification).not.toHaveBeenCalled();
    });

    it('should handle dismissAll with no active notifications', () => {
      expect(() => service.dismissAll()).not.toThrow();
    });

    it('should handle dismissAll with only manual notifications', () => {
      service.info('Info 1');
      service.info('Info 2');

      expect(() => service.dismissAll()).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('should clear all timers on destroy', () => {
      service.success('Success');
      service.warning('Warning');

      service.destroy();

      vi.advanceTimersByTime(10000);

      expect(mockStore.removeNotification).not.toHaveBeenCalled();
    });

    it('should handle destroy with no active timers', () => {
      expect(() => service.destroy()).not.toThrow();
    });
  });

  describe('notification ID generation', () => {
    it('should generate unique IDs for each notification', () => {
      const ids = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        const id = service.info(`Message ${i}`);
        ids.add(id);
      }

      expect(ids.size).toBe(100);
    });

    it('should generate IDs with correct format', () => {
      const id = service.info('Test');
      expect(id).toMatch(/^notification-\d+-[a-z0-9]+$/);
    });

    it('should include timestamp in ID', () => {
      const id = service.info('Test');
      const parts = id.split('-');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('notification');
      expect(Number(parts[1])).toBeGreaterThan(0);
    });
  });

  describe('notification timestamps', () => {
    it('should set timestamp when notification is created', () => {
      const beforeTime = new Date();
      service.info('Test');
      const afterTime = new Date();

      const notification = (mockStore.addNotification as any).mock.calls[0][0] as Notification;
      expect(notification.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(notification.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should have different timestamps for notifications created at different times', () => {
      service.info('First');
      const firstNotification = (mockStore.addNotification as any).mock.calls[0][0] as Notification;

      vi.advanceTimersByTime(100);

      service.info('Second');
      const secondNotification = (mockStore.addNotification as any).mock.calls[1][0] as Notification;

      expect(secondNotification.timestamp.getTime()).toBeGreaterThan(firstNotification.timestamp.getTime());
    });
  });

  describe('edge cases', () => {
    it('should handle empty message string', () => {
      const id = service.info('');

      expect(mockStore.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '',
        })
      );
      expect(id).toBeTruthy();
    });

    it('should handle very long message string', () => {
      const longMessage = 'a'.repeat(10000);
      const id = service.info(longMessage);

      expect(mockStore.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: longMessage,
        })
      );
      expect(id).toBeTruthy();
    });

    it('should handle zero duration', () => {
      const id = service.success('Test', 0);

      expect(mockStore.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 0,
        })
      );

      // Should not auto-dismiss with zero duration
      vi.advanceTimersByTime(10000);
      expect(mockStore.removeNotification).not.toHaveBeenCalled();
    });

    it('should handle negative duration', () => {
      const id = service.success('Test', -1000);

      expect(mockStore.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: -1000,
        })
      );

      // Should not auto-dismiss with negative duration
      vi.advanceTimersByTime(10000);
      expect(mockStore.removeNotification).not.toHaveBeenCalled();
    });

    it('should handle very large duration', () => {
      const id = service.success('Test', 999999999);

      expect(mockStore.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 999999999,
        })
      );

      vi.advanceTimersByTime(999999999);
      expect(mockStore.removeNotification).toHaveBeenCalledWith(id);
    });

    it('should handle special characters in message', () => {
      const specialMessage = '<script>alert("xss")</script>';
      const id = service.info(specialMessage);

      expect(mockStore.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: specialMessage,
        })
      );
    });

    it('should handle unicode characters in message', () => {
      const unicodeMessage = '你好世界 🌍 مرحبا';
      const id = service.info(unicodeMessage);

      expect(mockStore.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: unicodeMessage,
        })
      );
    });
  });

  describe('multiple notifications', () => {
    it('should handle multiple notifications of different types', () => {
      const id1 = service.info('Info');
      const id2 = service.success('Success');
      const id3 = service.warning('Warning');
      const id4 = service.error('Error');

      expect(mockStore.addNotification).toHaveBeenCalledTimes(4);
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id3).not.toBe(id4);
    });

    it('should auto-dismiss multiple notifications independently', () => {
      const id1 = service.success('Success', 1000);
      const id2 = service.warning('Warning', 2000);
      const id3 = service.error('Error', 3000);

      vi.advanceTimersByTime(1000);
      expect(mockStore.removeNotification).toHaveBeenCalledWith(id1);
      expect(mockStore.removeNotification).not.toHaveBeenCalledWith(id2);
      expect(mockStore.removeNotification).not.toHaveBeenCalledWith(id3);

      vi.advanceTimersByTime(1000);
      expect(mockStore.removeNotification).toHaveBeenCalledWith(id2);
      expect(mockStore.removeNotification).not.toHaveBeenCalledWith(id3);

      vi.advanceTimersByTime(1000);
      expect(mockStore.removeNotification).toHaveBeenCalledWith(id3);
    });

    it('should handle rapid notification creation', () => {
      const ids: string[] = [];
      
      for (let i = 0; i < 50; i++) {
        ids.push(service.info(`Message ${i}`));
      }

      expect(mockStore.addNotification).toHaveBeenCalledTimes(50);
      expect(new Set(ids).size).toBe(50);
    });
  });

  describe('store integration', () => {
    it('should call store addNotification for each notification', () => {
      service.info('Info');
      service.success('Success');
      service.warning('Warning');
      service.error('Error');

      expect(mockStore.addNotification).toHaveBeenCalledTimes(4);
    });

    it('should call store removeNotification on dismiss', () => {
      const id = service.info('Test');
      service.dismiss(id);

      expect(mockStore.removeNotification).toHaveBeenCalledWith(id);
    });

    it('should call store removeNotification on auto-dismiss', () => {
      const id = service.success('Test');

      vi.advanceTimersByTime(3000);

      expect(mockStore.removeNotification).toHaveBeenCalledWith(id);
    });

    it('should pass correct notification object to store', () => {
      service.warning('Test warning', 5000);

      const notification = (mockStore.addNotification as any).mock.calls[0][0] as Notification;
      expect(notification).toEqual({
        id: expect.stringContaining('notification-'),
        type: 'warning',
        message: 'Test warning',
        timestamp: expect.any(Date),
        duration: 5000,
      });
    });
  });

  describe('consistency', () => {
    it('should maintain consistent behavior across multiple calls', () => {
      for (let i = 0; i < 10; i++) {
        const id = service.success('Test', 1000);
        expect(id).toMatch(/^notification-\d+-[a-z0-9]+$/);
        
        vi.advanceTimersByTime(1000);
        expect(mockStore.removeNotification).toHaveBeenCalledWith(id);
      }
    });

    it('should always return a string ID', () => {
      const testCases = [
        () => service.info('Test'),
        () => service.success('Test'),
        () => service.warning('Test'),
        () => service.error('Test'),
      ];

      testCases.forEach((testCase) => {
        const id = testCase();
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });
    });
  });
});
