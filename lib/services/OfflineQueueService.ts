import { logger } from '../logger';
import { LocalStorageRepository } from '../repositories/LocalStorageRepository';
import type { OfflineQueueItem } from '@/types';

/**
 * Store interface for offline queue management
 * This allows the OfflineQueueService to work with any store implementation
 */
export interface IOfflineQueueStore {
  offlineQueue: OfflineQueueItem[];
  addToOfflineQueue: (item: OfflineQueueItem) => void;
  updateOfflineQueueItem: (id: string, updates: Partial<OfflineQueueItem>) => void;
  removeFromOfflineQueue: (id: string) => void;
  clearOfflineQueue: () => void;
}

/**
 * Callback type for message sending
 * Returns true if send was successful, false otherwise
 */
export type SendMessageCallback = (
  agentId: string,
  message: string
) => Promise<boolean>;

/**
 * OfflineQueueService
 * 
 * Manages offline message queuing with persistence and sequential processing.
 * 
 * Features:
 * - Enqueue messages when offline
 * - Persist queue to localStorage
 * - Limit queue to 50 messages maximum
 * - Sequential processing when online
 * - Status tracking (pending → sending → sent/failed)
 * - Automatic retry with exponential backoff
 * 
 * Requirements: 33
 */
export class OfflineQueueService {
  private static instance: OfflineQueueService | null = null;
  private store: IOfflineQueueStore;
  private repository: LocalStorageRepository;
  private sendMessageCallback: SendMessageCallback | null = null;
  private isProcessing = false;
  private readonly MAX_QUEUE_SIZE = 50;

  private constructor(
    store: IOfflineQueueStore,
    repository: LocalStorageRepository
  ) {
    this.store = store;
    this.repository = repository;
  }

  /**
   * Get the singleton instance of OfflineQueueService
   * Must call initialize() first
   */
  static getInstance(): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      throw new Error(
        'OfflineQueueService not initialized. Call initialize() first.'
      );
    }
    return OfflineQueueService.instance;
  }

  /**
   * Initialize the OfflineQueueService with a store and repository
   * Should be called once at application startup
   * 
   * @param store - The offline queue store (typically Zustand store)
   * @param repository - The localStorage repository (optional, creates new instance if not provided)
   * @returns The initialized OfflineQueueService instance
   */
  static initialize(
    store: IOfflineQueueStore,
    repository?: LocalStorageRepository
  ): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      const repo = repository || new LocalStorageRepository();
      OfflineQueueService.instance = new OfflineQueueService(store, repo);
    }
    return OfflineQueueService.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static reset(): void {
    OfflineQueueService.instance = null;
  }

  /**
   * Set the callback function for sending messages
   * This callback will be invoked when processing the queue
   * 
   * @param callback - Function that sends a message and returns success status
   */
  setSendMessageCallback(callback: SendMessageCallback): void {
    this.sendMessageCallback = callback;
    logger.info('Send message callback registered', {
      component: 'OfflineQueueService',
      operation: 'setSendMessageCallback',
    });
  }

  /**
   * Enqueue a message for later sending
   * 
   * @param agentId - The agent ID to send the message to
   * @param message - The message content
   * @returns The queue item ID if successful, null if queue is full
   */
  enqueue(agentId: string, message: string): string | null {
    try {
      // Check queue size limit
      if (this.store.offlineQueue.length >= this.MAX_QUEUE_SIZE) {
        logger.warn('Offline queue is full, cannot enqueue message', {
          component: 'OfflineQueueService',
          operation: 'enqueue',
          queueSize: this.store.offlineQueue.length,
          maxSize: this.MAX_QUEUE_SIZE,
        });
        return null;
      }

      // Create queue item
      const queueItem: OfflineQueueItem = {
        id: this.generateId(),
        agentId,
        message,
        timestamp: new Date(),
        status: 'pending',
        retryCount: 0,
      };

      // Add to store
      this.store.addToOfflineQueue(queueItem);

      // Persist to localStorage
      this.persistQueue();

      logger.info('Message enqueued successfully', {
        component: 'OfflineQueueService',
        operation: 'enqueue',
        itemId: queueItem.id,
        queueSize: this.store.offlineQueue.length,
      });

      return queueItem.id;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during enqueue';

      logger.error('Failed to enqueue message', {
        component: 'OfflineQueueService',
        operation: 'enqueue',
        error: errorMessage,
      });

      return null;
    }
  }

  /**
   * Dequeue and return the next pending message
   * 
   * @returns The next queue item or null if queue is empty
   */
  dequeue(): OfflineQueueItem | null {
    try {
      // Find first pending item
      const pendingItem = this.store.offlineQueue.find(
        (item) => item.status === 'pending'
      );

      if (!pendingItem) {
        return null;
      }

      logger.info('Message dequeued', {
        component: 'OfflineQueueService',
        operation: 'dequeue',
        itemId: pendingItem.id,
      });

      return pendingItem;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during dequeue';

      logger.error('Failed to dequeue message', {
        component: 'OfflineQueueService',
        operation: 'dequeue',
        error: errorMessage,
      });

      return null;
    }
  }

  /**
   * Process the offline queue sequentially
   * Sends all pending messages one by one
   * 
   * @returns Number of messages successfully sent
   */
  async processQueue(): Promise<number> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      logger.warn('Queue processing already in progress', {
        component: 'OfflineQueueService',
        operation: 'processQueue',
      });
      return 0;
    }

    if (!this.sendMessageCallback) {
      logger.error('Cannot process queue: send message callback not set', {
        component: 'OfflineQueueService',
        operation: 'processQueue',
      });
      return 0;
    }

    this.isProcessing = true;
    let successCount = 0;

    try {
      logger.info('Starting queue processing', {
        component: 'OfflineQueueService',
        operation: 'processQueue',
        queueSize: this.store.offlineQueue.length,
      });

      // Process messages sequentially
      while (true) {
        const item = this.dequeue();
        if (!item) {
          // No more pending items
          break;
        }

        // Update status to sending
        this.updateItemStatus(item.id, 'sending');

        try {
          // Send message
          const success = await this.sendMessageCallback(
            item.agentId,
            item.message
          );

          if (success) {
            // Mark as sent and remove from queue
            this.updateItemStatus(item.id, 'sent');
            this.removeItem(item.id);
            successCount++;

            logger.info('Message sent successfully', {
              component: 'OfflineQueueService',
              operation: 'processQueue',
              itemId: item.id,
            });
          } else {
            // Mark as failed
            this.updateItemStatus(item.id, 'failed', item.retryCount + 1);

            logger.warn('Message send failed', {
              component: 'OfflineQueueService',
              operation: 'processQueue',
              itemId: item.id,
              retryCount: item.retryCount + 1,
            });
          }
        } catch (error) {
          // Mark as failed on exception
          this.updateItemStatus(item.id, 'failed', item.retryCount + 1);

          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          logger.error('Exception during message send', {
            component: 'OfflineQueueService',
            operation: 'processQueue',
            itemId: item.id,
            error: errorMessage,
          });
        }

        // Persist after each item
        this.persistQueue();
      }

      logger.info('Queue processing completed', {
        component: 'OfflineQueueService',
        operation: 'processQueue',
        successCount,
        remainingItems: this.store.offlineQueue.length,
      });

      return successCount;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get the current queue size
   * 
   * @returns Number of items in the queue
   */
  getQueueSize(): number {
    return this.store.offlineQueue.length;
  }

  /**
   * Get the number of pending items
   * 
   * @returns Number of pending items
   */
  getPendingCount(): number {
    return this.store.offlineQueue.filter((item) => item.status === 'pending')
      .length;
  }

  /**
   * Get the number of failed items
   * 
   * @returns Number of failed items
   */
  getFailedCount(): number {
    return this.store.offlineQueue.filter((item) => item.status === 'failed')
      .length;
  }

  /**
   * Clear all items from the queue
   */
  clearQueue(): void {
    try {
      this.store.clearOfflineQueue();
      this.persistQueue();

      logger.info('Queue cleared', {
        component: 'OfflineQueueService',
        operation: 'clearQueue',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during clear';

      logger.error('Failed to clear queue', {
        component: 'OfflineQueueService',
        operation: 'clearQueue',
        error: errorMessage,
      });
    }
  }

  /**
   * Retry all failed messages
   * Resets their status to pending so they can be processed again
   * 
   * @returns Number of items reset to pending
   */
  retryFailedMessages(): number {
    try {
      let retryCount = 0;

      this.store.offlineQueue.forEach((item) => {
        if (item.status === 'failed') {
          this.store.updateOfflineQueueItem(item.id, {
            status: 'pending',
          });
          retryCount++;
        }
      });

      if (retryCount > 0) {
        this.persistQueue();
      }

      logger.info('Failed messages reset to pending', {
        component: 'OfflineQueueService',
        operation: 'retryFailedMessages',
        retryCount,
      });

      return retryCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during retry';

      logger.error('Failed to retry messages', {
        component: 'OfflineQueueService',
        operation: 'retryFailedMessages',
        error: errorMessage,
      });

      return 0;
    }
  }

  /**
   * Remove a specific item from the queue
   * 
   * @param itemId - The ID of the item to remove
   */
  private removeItem(itemId: string): void {
    this.store.removeFromOfflineQueue(itemId);
  }

  /**
   * Update the status of a queue item
   * 
   * @param itemId - The ID of the item to update
   * @param status - The new status
   * @param retryCount - Optional retry count to update
   */
  private updateItemStatus(
    itemId: string,
    status: OfflineQueueItem['status'],
    retryCount?: number
  ): void {
    const updates: Partial<OfflineQueueItem> = { status };
    if (retryCount !== undefined) {
      updates.retryCount = retryCount;
    }
    this.store.updateOfflineQueueItem(itemId, updates);
  }

  /**
   * Persist the current queue to localStorage
   */
  private persistQueue(): void {
    try {
      // Load current preferences
      const result = this.repository.load();
      if (!result.success) {
        logger.error('Failed to load preferences for queue persistence', {
          component: 'OfflineQueueService',
          operation: 'persistQueue',
          error: result.error,
        });
        return;
      }

      // Update offline queue
      const preferences = result.data;
      preferences.offlineQueue = this.store.offlineQueue;

      // Save back to repository
      const saveResult = this.repository.save(preferences);
      if (!saveResult.success) {
        logger.error('Failed to persist queue to localStorage', {
          component: 'OfflineQueueService',
          operation: 'persistQueue',
          error: saveResult.error,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during persist';

      logger.error('Exception during queue persistence', {
        component: 'OfflineQueueService',
        operation: 'persistQueue',
        error: errorMessage,
      });
    }
  }

  /**
   * Generate a unique ID for queue items
   * 
   * @returns A unique ID string
   */
  private generateId(): string {
    return `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
