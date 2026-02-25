import { Notification } from '@/types';

/**
 * Store interface for notification management
 * This allows the NotificationService to work with any store implementation
 * (Zustand, Redux, etc.) as long as it provides these methods
 */
export interface INotificationStore {
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

/**
 * NotificationService provides centralized error and status notifications
 * 
 * Features:
 * - Auto-generates unique notification IDs
 * - Supports configurable auto-dismiss duration
 * - Provides convenience methods for different notification types
 * - Integrates with any store that implements INotificationStore interface
 * - Singleton pattern for global access
 */
export class NotificationService {
  private static instance: NotificationService | null = null;
  private store: INotificationStore;
  private dismissTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor(store: INotificationStore) {
    this.store = store;
  }

  /**
   * Get the singleton instance of NotificationService
   * Must call initialize() first
   */
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      throw new Error('NotificationService not initialized. Call initialize() first.');
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the NotificationService with a store
   * Should be called once at application startup
   */
  static initialize(store: INotificationStore): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService(store);
    }
    return NotificationService.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static reset(): void {
    if (NotificationService.instance) {
      NotificationService.instance.destroy();
      NotificationService.instance = null;
    }
  }

  /**
   * Display an info notification
   * @param message - The notification message
   * @param duration - Auto-dismiss duration in milliseconds (optional)
   */
  info(message: string, duration?: number): string {
    return this.notify('info', message, duration);
  }

  /**
   * Display a success notification
   * @param message - The notification message
   * @param duration - Auto-dismiss duration in milliseconds (optional, defaults to 3000ms)
   */
  success(message: string, duration: number = 3000): string {
    return this.notify('success', message, duration);
  }

  /**
   * Display a warning notification
   * @param message - The notification message
   * @param duration - Auto-dismiss duration in milliseconds (optional, defaults to 5000ms)
   */
  warning(message: string, duration: number = 5000): string {
    return this.notify('warning', message, duration);
  }

  /**
   * Display an error notification
   * @param message - The notification message
   * @param duration - Auto-dismiss duration in milliseconds (optional, defaults to 7000ms)
   */
  error(message: string, duration: number = 7000): string {
    return this.notify('error', message, duration);
  }

  /**
   * Manually dismiss a notification
   * @param id - The notification ID to dismiss
   */
  dismiss(id: string): void {
    // Clear any pending auto-dismiss timer
    const timer = this.dismissTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.dismissTimers.delete(id);
    }

    // Remove notification from store
    this.store.removeNotification(id);
  }

  /**
   * Dismiss all notifications
   */
  dismissAll(): void {
    // Clear all timers
    this.dismissTimers.forEach((timer) => clearTimeout(timer));
    this.dismissTimers.clear();
  }

  /**
   * Internal method to create and display a notification
   */
  private notify(
    type: 'info' | 'success' | 'warning' | 'error',
    message: string,
    duration?: number
  ): string {
    const id = this.generateId();
    const notification: Notification = {
      id,
      type,
      message,
      timestamp: new Date(),
      duration,
    };

    // Add notification to store
    this.store.addNotification(notification);

    // Set up auto-dismiss if duration is specified
    if (duration !== undefined && duration > 0) {
      const timer = setTimeout(() => {
        this.dismiss(id);
      }, duration);
      this.dismissTimers.set(id, timer);
    }

    return id;
  }

  /**
   * Generate a unique notification ID
   * Uses timestamp + random string for uniqueness
   */
  private generateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `notification-${timestamp}-${random}`;
  }

  /**
   * Clean up all timers (call this when destroying the service)
   */
  destroy(): void {
    this.dismissAll();
  }
}
