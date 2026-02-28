import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OfflineQueueService, type IOfflineQueueStore } from '../OfflineQueueService';
import { LocalStorageRepository } from '../../repositories/LocalStorageRepository';
import type { OfflineQueueItem } from '@/types';

// Mock logger
vi.mock('../../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('OfflineQueueService', () => {
  let service: OfflineQueueService;
  let mockStore: IOfflineQueueStore;
  let mockRepository: LocalStorageRepository;
  let queueItems: OfflineQueueItem[];

  beforeEach(() => {
    // Reset singleton
    OfflineQueueService.reset();

    // Initialize queue items array
    queueItems = [];

    // Create mock store
    mockStore = {
      offlineQueue: queueItems,
      addToOfflineQueue: vi.fn((item: OfflineQueueItem) => {
        queueItems.push(item);
      }),
      updateOfflineQueueItem: vi.fn((id: string, updates: Partial<OfflineQueueItem>) => {
        const index = queueItems.findIndex((item) => item.id === id);
        if (index >= 0) {
          queueItems[index] = { ...queueItems[index], ...updates };
        }
      }),
      removeFromOfflineQueue: vi.fn((id: string) => {
        const index = queueItems.findIndex((item) => item.id === id);
        if (index >= 0) {
          queueItems.splice(index, 1);
        }
      }),
      clearOfflineQueue: vi.fn(() => {
        queueItems.length = 0;
      }),
    };

    // Create mock repository
    mockRepository = {
      load: vi.fn().mockReturnValue({
        success: true,
        data: {
          audioPreferences: {
            volume: 100,
            isMuted: false,
            playbackSpeed: 1.0,
            speechRate: 1.0,
            speechPitch: 0,
            audioQuality: 'high' as const,
          },
          avatarCustomization: {
            skinTone: '#f5d5c5',
            eyeColor: '#4a90e2',
            hairColor: '#3d2817',
            currentExpression: null,
          },
          uiPreferences: {
            theme: 'system' as const,
            graphicsQuality: 'high' as const,
            performanceMonitorVisible: false,
            performanceMonitorExpanded: false,
            highContrastMode: false,
            screenReaderOptimizations: false,
            enhancedFocusIndicators: true,
          },
          offlineQueue: [],
        },
      }),
      save: vi.fn().mockReturnValue({ success: true, data: undefined }),
      clear: vi.fn().mockReturnValue({ success: true, data: undefined }),
    } as unknown as LocalStorageRepository;

    // Initialize service
    service = OfflineQueueService.initialize(mockStore, mockRepository);
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when calling getInstance', () => {
      const instance1 = OfflineQueueService.getInstance();
      const instance2 = OfflineQueueService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should throw error when getInstance is called before initialize', () => {
      OfflineQueueService.reset();
      expect(() => OfflineQueueService.getInstance()).toThrow(
        'OfflineQueueService not initialized'
      );
    });
  });

  describe('enqueue', () => {
    it('should enqueue a message successfully', () => {
      const itemId = service.enqueue('agent-1', 'Hello world');

      expect(itemId).toBeTruthy();
      expect(mockStore.addToOfflineQueue).toHaveBeenCalledTimes(1);
      expect(queueItems).toHaveLength(1);
      expect(queueItems[0]).toMatchObject({
        agentId: 'agent-1',
        message: 'Hello world',
        status: 'pending',
        retryCount: 0,
      });
    });

    it('should generate unique IDs for each message', () => {
      const id1 = service.enqueue('agent-1', 'Message 1');
      const id2 = service.enqueue('agent-1', 'Message 2');

      expect(id1).not.toBe(id2);
    });

    it('should persist queue after enqueuing', () => {
      service.enqueue('agent-1', 'Test message');

      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should reject messages when queue is full (50 items)', () => {
      // Fill queue to max capacity
      for (let i = 0; i < 50; i++) {
        service.enqueue('agent-1', `Message ${i}`);
      }

      // Try to add one more
      const result = service.enqueue('agent-1', 'Overflow message');

      expect(result).toBeNull();
      expect(queueItems).toHaveLength(50);
    });

    it('should set timestamp when enqueuing', () => {
      const beforeEnqueue = new Date();
      service.enqueue('agent-1', 'Test message');
      const afterEnqueue = new Date();

      expect(queueItems[0].timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeEnqueue.getTime()
      );
      expect(queueItems[0].timestamp.getTime()).toBeLessThanOrEqual(
        afterEnqueue.getTime()
      );
    });
  });

  describe('dequeue', () => {
    it('should return the first pending message', () => {
      const id1 = service.enqueue('agent-1', 'Message 1');
      service.enqueue('agent-1', 'Message 2');

      const item = service.dequeue();

      expect(item).toBeTruthy();
      expect(item?.id).toBe(id1);
      expect(item?.message).toBe('Message 1');
    });

    it('should return null when queue is empty', () => {
      const item = service.dequeue();
      expect(item).toBeNull();
    });

    it('should skip non-pending items', () => {
      const id1 = service.enqueue('agent-1', 'Message 1');
      const id2 = service.enqueue('agent-1', 'Message 2');

      // Mark first item as sending
      mockStore.updateOfflineQueueItem(id1!, { status: 'sending' });

      const item = service.dequeue();

      expect(item?.id).toBe(id2);
    });

    it('should not remove the item from queue', () => {
      service.enqueue('agent-1', 'Message 1');
      service.dequeue();

      expect(queueItems).toHaveLength(1);
    });
  });

  describe('processQueue', () => {
    it('should process all pending messages sequentially', async () => {
      const sendCallback = vi.fn().mockResolvedValue(true);
      service.setSendMessageCallback(sendCallback);

      service.enqueue('agent-1', 'Message 1');
      service.enqueue('agent-2', 'Message 2');
      service.enqueue('agent-1', 'Message 3');

      const successCount = await service.processQueue();

      expect(successCount).toBe(3);
      expect(sendCallback).toHaveBeenCalledTimes(3);
      expect(sendCallback).toHaveBeenNthCalledWith(1, 'agent-1', 'Message 1');
      expect(sendCallback).toHaveBeenNthCalledWith(2, 'agent-2', 'Message 2');
      expect(sendCallback).toHaveBeenNthCalledWith(3, 'agent-1', 'Message 3');
    });

    it('should update status to sending then sent for successful messages', async () => {
      const sendCallback = vi.fn().mockResolvedValue(true);
      service.setSendMessageCallback(sendCallback);

      service.enqueue('agent-1', 'Message 1');

      await service.processQueue();

      // Item should be removed after successful send
      expect(queueItems).toHaveLength(0);
    });

    it('should update status to failed for unsuccessful messages', async () => {
      const sendCallback = vi.fn().mockResolvedValue(false);
      service.setSendMessageCallback(sendCallback);

      service.enqueue('agent-1', 'Message 1');

      await service.processQueue();

      expect(queueItems).toHaveLength(1);
      expect(queueItems[0].status).toBe('failed');
      expect(queueItems[0].retryCount).toBe(1);
    });

    it('should handle exceptions during send', async () => {
      const sendCallback = vi.fn().mockRejectedValue(new Error('Network error'));
      service.setSendMessageCallback(sendCallback);

      service.enqueue('agent-1', 'Message 1');

      const successCount = await service.processQueue();

      expect(successCount).toBe(0);
      expect(queueItems).toHaveLength(1);
      expect(queueItems[0].status).toBe('failed');
    });

    it('should persist queue after each message', async () => {
      const sendCallback = vi.fn().mockResolvedValue(true);
      service.setSendMessageCallback(sendCallback);

      service.enqueue('agent-1', 'Message 1');
      service.enqueue('agent-1', 'Message 2');

      // Clear previous save calls from enqueue
      vi.mocked(mockRepository.save).mockClear();

      await service.processQueue();

      // Should save after each message
      expect(mockRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should return 0 if send callback is not set', async () => {
      service.enqueue('agent-1', 'Message 1');

      const successCount = await service.processQueue();

      expect(successCount).toBe(0);
    });

    it('should prevent concurrent processing', async () => {
      const sendCallback = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(true), 100))
      );
      service.setSendMessageCallback(sendCallback);

      service.enqueue('agent-1', 'Message 1');

      // Start processing
      const promise1 = service.processQueue();
      // Try to start again immediately
      const promise2 = service.processQueue();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Second call should return 0 (already processing)
      expect(result1).toBe(1);
      expect(result2).toBe(0);
    });

    it('should remove successfully sent messages from queue', async () => {
      const sendCallback = vi.fn().mockResolvedValue(true);
      service.setSendMessageCallback(sendCallback);

      service.enqueue('agent-1', 'Message 1');
      service.enqueue('agent-1', 'Message 2');

      await service.processQueue();

      expect(queueItems).toHaveLength(0);
    });

    it('should keep failed messages in queue', async () => {
      const sendCallback = vi.fn().mockResolvedValue(false);
      service.setSendMessageCallback(sendCallback);

      service.enqueue('agent-1', 'Message 1');
      service.enqueue('agent-1', 'Message 2');

      await service.processQueue();

      expect(queueItems).toHaveLength(2);
      expect(queueItems[0].status).toBe('failed');
      expect(queueItems[1].status).toBe('failed');
    });
  });

  describe('getQueueSize', () => {
    it('should return 0 for empty queue', () => {
      expect(service.getQueueSize()).toBe(0);
    });

    it('should return correct queue size', () => {
      service.enqueue('agent-1', 'Message 1');
      service.enqueue('agent-1', 'Message 2');
      service.enqueue('agent-1', 'Message 3');

      expect(service.getQueueSize()).toBe(3);
    });
  });

  describe('getPendingCount', () => {
    it('should return 0 when no pending items', () => {
      expect(service.getPendingCount()).toBe(0);
    });

    it('should return correct pending count', () => {
      const id1 = service.enqueue('agent-1', 'Message 1');
      service.enqueue('agent-1', 'Message 2');
      service.enqueue('agent-1', 'Message 3');

      // Mark some as non-pending
      mockStore.updateOfflineQueueItem(id1!, { status: 'sending' });

      expect(service.getPendingCount()).toBe(2);
    });
  });

  describe('getFailedCount', () => {
    it('should return 0 when no failed items', () => {
      expect(service.getFailedCount()).toBe(0);
    });

    it('should return correct failed count', () => {
      const id1 = service.enqueue('agent-1', 'Message 1');
      const id2 = service.enqueue('agent-1', 'Message 2');
      service.enqueue('agent-1', 'Message 3');

      // Mark some as failed
      mockStore.updateOfflineQueueItem(id1!, { status: 'failed' });
      mockStore.updateOfflineQueueItem(id2!, { status: 'failed' });

      expect(service.getFailedCount()).toBe(2);
    });
  });

  describe('clearQueue', () => {
    it('should clear all items from queue', () => {
      service.enqueue('agent-1', 'Message 1');
      service.enqueue('agent-1', 'Message 2');
      service.enqueue('agent-1', 'Message 3');

      service.clearQueue();

      expect(queueItems).toHaveLength(0);
      expect(mockStore.clearOfflineQueue).toHaveBeenCalled();
    });

    it('should persist after clearing', () => {
      service.enqueue('agent-1', 'Message 1');

      // Clear previous save calls
      vi.mocked(mockRepository.save).mockClear();

      service.clearQueue();

      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('retryFailedMessages', () => {
    it('should reset failed messages to pending', () => {
      const id1 = service.enqueue('agent-1', 'Message 1');
      const id2 = service.enqueue('agent-1', 'Message 2');
      service.enqueue('agent-1', 'Message 3');

      // Mark some as failed
      mockStore.updateOfflineQueueItem(id1!, { status: 'failed', retryCount: 1 });
      mockStore.updateOfflineQueueItem(id2!, { status: 'failed', retryCount: 2 });

      const retryCount = service.retryFailedMessages();

      expect(retryCount).toBe(2);
      expect(queueItems[0].status).toBe('pending');
      expect(queueItems[1].status).toBe('pending');
      expect(queueItems[2].status).toBe('pending');
    });

    it('should not affect non-failed messages', () => {
      const id1 = service.enqueue('agent-1', 'Message 1');
      service.enqueue('agent-1', 'Message 2');

      mockStore.updateOfflineQueueItem(id1!, { status: 'failed' });

      service.retryFailedMessages();

      expect(queueItems[1].status).toBe('pending');
    });

    it('should persist after retry', () => {
      const id1 = service.enqueue('agent-1', 'Message 1');
      mockStore.updateOfflineQueueItem(id1!, { status: 'failed' });

      // Clear previous save calls
      vi.mocked(mockRepository.save).mockClear();

      service.retryFailedMessages();

      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should return 0 when no failed messages', () => {
      service.enqueue('agent-1', 'Message 1');
      service.enqueue('agent-1', 'Message 2');

      const retryCount = service.retryFailedMessages();

      expect(retryCount).toBe(0);
    });
  });

  describe('setSendMessageCallback', () => {
    it('should set the send message callback', () => {
      const callback = vi.fn();
      service.setSendMessageCallback(callback);

      // Callback should be set (tested indirectly through processQueue)
      expect(() => service.setSendMessageCallback(callback)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty queue processing', async () => {
      const sendCallback = vi.fn().mockResolvedValue(true);
      service.setSendMessageCallback(sendCallback);

      const successCount = await service.processQueue();

      expect(successCount).toBe(0);
      expect(sendCallback).not.toHaveBeenCalled();
    });

    it('should handle mixed success and failure during processing', async () => {
      const sendCallback = vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      service.setSendMessageCallback(sendCallback);

      service.enqueue('agent-1', 'Message 1');
      service.enqueue('agent-1', 'Message 2');
      service.enqueue('agent-1', 'Message 3');

      const successCount = await service.processQueue();

      expect(successCount).toBe(2);
      expect(queueItems).toHaveLength(1);
      expect(queueItems[0].message).toBe('Message 2');
      expect(queueItems[0].status).toBe('failed');
    });

    it('should handle repository save failure gracefully', () => {
      vi.mocked(mockRepository.save).mockReturnValue({
        success: false,
        error: 'Save failed',
      });

      // Should not throw
      expect(() => service.enqueue('agent-1', 'Message 1')).not.toThrow();
    });

    it('should handle repository load failure gracefully', () => {
      vi.mocked(mockRepository.load).mockReturnValue({
        success: false,
        error: 'Load failed',
      });

      // Should not throw during persistence
      expect(() => service.enqueue('agent-1', 'Message 1')).not.toThrow();
    });
  });
});
