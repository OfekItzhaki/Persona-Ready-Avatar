import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '../useAppStore';
import type { OfflineQueueItem } from '@/types';

/**
 * Unit Tests for Enhanced Zustand Store State Slices
 * 
 * Tests the new state slices added for enhanced avatar features:
 * - Audio preferences (Requirements 3, 4, 5)
 * - Avatar customization (Requirements 7, 8, 9)
 * - UI preferences (Requirements 22, 23)
 * - Offline queue (Requirements 32, 33)
 * - Performance metrics (Requirements 34)
 * 
 * Validates: Task 1.1 - Extend Zustand store with new state slices
 */

describe('useAppStore - Enhanced State Slices', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useAppStore());
    act(() => {
      // Reset to defaults
      result.current.updateAudioPreferences({
        volume: 100,
        isMuted: false,
        playbackSpeed: 1.0,
        speechRate: 1.0,
        speechPitch: 0,
        audioQuality: 'high',
      });
      result.current.updateAvatarCustomization({
        skinTone: '#f5d5c5',
        eyeColor: '#4a90e2',
        hairColor: '#3d2817',
        currentExpression: null,
      });
      result.current.updateUIPreferences({
        theme: 'system',
        graphicsQuality: 'high',
        performanceMonitorVisible: false,
        performanceMonitorExpanded: false,
        highContrastMode: false,
      });
      result.current.clearOfflineQueue();
      result.current.updatePerformanceMetrics({
        fps: 0,
        averageFps: 0,
        frameTime: 0,
        memoryUsage: null,
        drawCalls: 0,
        triangles: 0,
        brainApiLatency: [],
        ttsLatency: [],
      });
    });
  });

  describe('Audio Preferences State (Requirements 3, 4, 5)', () => {
    it('should initialize with default audio preferences', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.audioPreferences).toEqual({
        volume: 100,
        isMuted: false,
        playbackSpeed: 1.0,
        speechRate: 1.0,
        speechPitch: 0,
        audioQuality: 'high',
      });
    });

    it('should update volume preference', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updateAudioPreferences({ volume: 75 });
      });

      expect(result.current.audioPreferences.volume).toBe(75);
      expect(result.current.audioPreferences.isMuted).toBe(false);
    });

    it('should update mute preference', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updateAudioPreferences({ isMuted: true });
      });

      expect(result.current.audioPreferences.isMuted).toBe(true);
    });

    it('should update playback speed preference', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updateAudioPreferences({ playbackSpeed: 1.5 });
      });

      expect(result.current.audioPreferences.playbackSpeed).toBe(1.5);
    });

    it('should update multiple audio preferences at once', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updateAudioPreferences({
          volume: 50,
          isMuted: true,
          playbackSpeed: 2.0,
          audioQuality: 'medium',
        });
      });

      expect(result.current.audioPreferences.volume).toBe(50);
      expect(result.current.audioPreferences.isMuted).toBe(true);
      expect(result.current.audioPreferences.playbackSpeed).toBe(2.0);
      expect(result.current.audioPreferences.audioQuality).toBe('medium');
    });
  });

  describe('Avatar Customization State (Requirements 7, 8, 9)', () => {
    it('should initialize with default avatar customization', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.avatarCustomization).toEqual({
        skinTone: '#f5d5c5',
        eyeColor: '#4a90e2',
        hairColor: '#3d2817',
        currentExpression: null,
      });
    });

    it('should update skin tone', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updateAvatarCustomization({ skinTone: '#8d5524' });
      });

      expect(result.current.avatarCustomization.skinTone).toBe('#8d5524');
    });

    it('should update eye color', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updateAvatarCustomization({ eyeColor: '#2e7d32' });
      });

      expect(result.current.avatarCustomization.eyeColor).toBe('#2e7d32');
    });

    it('should update hair color', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updateAvatarCustomization({ hairColor: '#ffd700' });
      });

      expect(result.current.avatarCustomization.hairColor).toBe('#ffd700');
    });

    it('should update current expression', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updateAvatarCustomization({ currentExpression: 'happy' });
      });

      expect(result.current.avatarCustomization.currentExpression).toBe('happy');
    });

    it('should update multiple customization options at once', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updateAvatarCustomization({
          skinTone: '#c68642',
          eyeColor: '#8b4513',
          hairColor: '#000000',
          currentExpression: 'surprised',
        });
      });

      expect(result.current.avatarCustomization.skinTone).toBe('#c68642');
      expect(result.current.avatarCustomization.eyeColor).toBe('#8b4513');
      expect(result.current.avatarCustomization.hairColor).toBe('#000000');
      expect(result.current.avatarCustomization.currentExpression).toBe('surprised');
    });
  });

  describe('UI Preferences State (Requirements 22, 23)', () => {
    it('should initialize with default UI preferences', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.uiPreferences).toEqual({
        theme: 'system',
        graphicsQuality: 'high',
        performanceMonitorVisible: false,
        performanceMonitorExpanded: false,
        highContrastMode: false,
        screenReaderOptimizations: false,
        enhancedFocusIndicators: true,
      });
    });

    it('should update theme preference', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updateUIPreferences({ theme: 'dark' });
      });

      expect(result.current.uiPreferences.theme).toBe('dark');
    });

    it('should update graphics quality preference', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updateUIPreferences({ graphicsQuality: 'medium' });
      });

      expect(result.current.uiPreferences.graphicsQuality).toBe('medium');
    });

    it('should update performance monitor visibility', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updateUIPreferences({ performanceMonitorVisible: true });
      });

      expect(result.current.uiPreferences.performanceMonitorVisible).toBe(true);
    });

    it('should update multiple UI preferences at once', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updateUIPreferences({
          theme: 'light',
          graphicsQuality: 'ultra',
          performanceMonitorVisible: true,
          performanceMonitorExpanded: true,
          highContrastMode: true,
        });
      });

      expect(result.current.uiPreferences.theme).toBe('light');
      expect(result.current.uiPreferences.graphicsQuality).toBe('ultra');
      expect(result.current.uiPreferences.performanceMonitorVisible).toBe(true);
      expect(result.current.uiPreferences.performanceMonitorExpanded).toBe(true);
      expect(result.current.uiPreferences.highContrastMode).toBe(true);
    });
  });

  describe('Offline Queue State (Requirements 32, 33)', () => {
    it('should initialize with empty offline queue', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.offlineQueue).toEqual([]);
    });

    it('should add item to offline queue', () => {
      const { result } = renderHook(() => useAppStore());

      const queueItem: OfflineQueueItem = {
        id: 'queue-1',
        agentId: 'agent-1',
        message: 'Test message',
        timestamp: new Date(),
        status: 'pending',
        retryCount: 0,
      };

      act(() => {
        result.current.addToOfflineQueue(queueItem);
      });

      expect(result.current.offlineQueue).toHaveLength(1);
      expect(result.current.offlineQueue[0]).toEqual(queueItem);
    });

    it('should update offline queue item status', () => {
      const { result } = renderHook(() => useAppStore());

      const queueItem: OfflineQueueItem = {
        id: 'queue-1',
        agentId: 'agent-1',
        message: 'Test message',
        timestamp: new Date(),
        status: 'pending',
        retryCount: 0,
      };

      act(() => {
        result.current.addToOfflineQueue(queueItem);
      });

      act(() => {
        result.current.updateOfflineQueueItem('queue-1', { status: 'sending' });
      });

      expect(result.current.offlineQueue[0].status).toBe('sending');
    });

    it('should remove item from offline queue', () => {
      const { result } = renderHook(() => useAppStore());

      const queueItem1: OfflineQueueItem = {
        id: 'queue-1',
        agentId: 'agent-1',
        message: 'Message 1',
        timestamp: new Date(),
        status: 'pending',
        retryCount: 0,
      };

      const queueItem2: OfflineQueueItem = {
        id: 'queue-2',
        agentId: 'agent-1',
        message: 'Message 2',
        timestamp: new Date(),
        status: 'pending',
        retryCount: 0,
      };

      act(() => {
        result.current.addToOfflineQueue(queueItem1);
        result.current.addToOfflineQueue(queueItem2);
      });

      expect(result.current.offlineQueue).toHaveLength(2);

      act(() => {
        result.current.removeFromOfflineQueue('queue-1');
      });

      expect(result.current.offlineQueue).toHaveLength(1);
      expect(result.current.offlineQueue[0].id).toBe('queue-2');
    });

    it('should clear offline queue', () => {
      const { result } = renderHook(() => useAppStore());

      const queueItems: OfflineQueueItem[] = [
        {
          id: 'queue-1',
          agentId: 'agent-1',
          message: 'Message 1',
          timestamp: new Date(),
          status: 'pending',
          retryCount: 0,
        },
        {
          id: 'queue-2',
          agentId: 'agent-1',
          message: 'Message 2',
          timestamp: new Date(),
          status: 'pending',
          retryCount: 0,
        },
      ];

      act(() => {
        queueItems.forEach((item) => result.current.addToOfflineQueue(item));
      });

      expect(result.current.offlineQueue).toHaveLength(2);

      act(() => {
        result.current.clearOfflineQueue();
      });

      expect(result.current.offlineQueue).toEqual([]);
    });
  });

  describe('Performance Metrics State (Requirements 34)', () => {
    it('should initialize with default performance metrics', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.performanceMetrics).toEqual({
        fps: 0,
        averageFps: 0,
        frameTime: 0,
        memoryUsage: null,
        drawCalls: 0,
        triangles: 0,
        brainApiLatency: [],
        ttsLatency: [],
      });
    });

    it('should update FPS metrics', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updatePerformanceMetrics({
          fps: 60,
          averageFps: 58.5,
        });
      });

      expect(result.current.performanceMetrics.fps).toBe(60);
      expect(result.current.performanceMetrics.averageFps).toBe(58.5);
    });

    it('should update memory usage', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updatePerformanceMetrics({
          memoryUsage: 150.5,
        });
      });

      expect(result.current.performanceMetrics.memoryUsage).toBe(150.5);
    });

    it('should update API latency arrays', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updatePerformanceMetrics({
          brainApiLatency: [120, 150, 130],
          ttsLatency: [200, 180, 210],
        });
      });

      expect(result.current.performanceMetrics.brainApiLatency).toEqual([120, 150, 130]);
      expect(result.current.performanceMetrics.ttsLatency).toEqual([200, 180, 210]);
    });

    it('should update multiple performance metrics at once', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updatePerformanceMetrics({
          fps: 55,
          averageFps: 57.2,
          frameTime: 18.2,
          memoryUsage: 200.3,
          drawCalls: 45,
          triangles: 15000,
        });
      });

      expect(result.current.performanceMetrics.fps).toBe(55);
      expect(result.current.performanceMetrics.averageFps).toBe(57.2);
      expect(result.current.performanceMetrics.frameTime).toBe(18.2);
      expect(result.current.performanceMetrics.memoryUsage).toBe(200.3);
      expect(result.current.performanceMetrics.drawCalls).toBe(45);
      expect(result.current.performanceMetrics.triangles).toBe(15000);
    });
  });

  describe('Message Update and Delete Actions', () => {
    it('should update message properties', () => {
      const { result } = renderHook(() => useAppStore());

      // Clear messages first
      act(() => {
        result.current.clearMessages();
      });

      const message = {
        id: 'msg-update-1',
        role: 'user' as const,
        content: 'Original content',
        timestamp: new Date(),
      };

      act(() => {
        result.current.addMessage(message);
      });

      act(() => {
        result.current.updateMessage('msg-update-1', {
          content: 'Updated content',
          edited: true,
          editedAt: new Date(),
        });
      });

      const updatedMessage = result.current.messages.find(m => m.id === 'msg-update-1');
      expect(updatedMessage?.content).toBe('Updated content');
      expect(updatedMessage?.edited).toBe(true);
      expect(updatedMessage?.editedAt).toBeDefined();
    });

    it('should delete message by id', () => {
      const { result } = renderHook(() => useAppStore());

      // Clear messages first
      act(() => {
        result.current.clearMessages();
      });

      const message1 = {
        id: 'msg-delete-1',
        role: 'user' as const,
        content: 'Message 1',
        timestamp: new Date(),
      };

      const message2 = {
        id: 'msg-delete-2',
        role: 'agent' as const,
        content: 'Message 2',
        timestamp: new Date(),
      };

      act(() => {
        result.current.addMessage(message1);
        result.current.addMessage(message2);
      });

      expect(result.current.messages).toHaveLength(2);

      act(() => {
        result.current.deleteMessage('msg-delete-1');
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].id).toBe('msg-delete-2');
    });

    it('should add reaction to message', () => {
      const { result } = renderHook(() => useAppStore());

      // Clear messages first
      act(() => {
        result.current.clearMessages();
      });

      const message = {
        id: 'msg-reaction-1',
        role: 'agent' as const,
        content: 'Agent message',
        timestamp: new Date(),
      };

      act(() => {
        result.current.addMessage(message);
      });

      act(() => {
        result.current.updateMessage('msg-reaction-1', { reaction: 'thumbs_up' });
      });

      const messageWithReaction = result.current.messages.find(m => m.id === 'msg-reaction-1');
      expect(messageWithReaction?.reaction).toBe('thumbs_up');
    });
  });

  describe('State Independence - Enhanced Slices', () => {
    it('should update audio preferences without affecting other state', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updateAvatarCustomization({ skinTone: '#123456' });
        result.current.updateAudioPreferences({ volume: 50 });
      });

      expect(result.current.audioPreferences.volume).toBe(50);
      expect(result.current.avatarCustomization.skinTone).toBe('#123456');
    });

    it('should update UI preferences without affecting performance metrics', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.updatePerformanceMetrics({ fps: 60 });
        result.current.updateUIPreferences({ theme: 'dark' });
      });

      expect(result.current.uiPreferences.theme).toBe('dark');
      expect(result.current.performanceMetrics.fps).toBe(60);
    });

    it('should manage offline queue without affecting messages', () => {
      const { result } = renderHook(() => useAppStore());

      // Clear both messages and queue first
      act(() => {
        result.current.clearMessages();
        result.current.clearOfflineQueue();
      });

      const message = {
        id: 'msg-independence-1',
        role: 'user' as const,
        content: 'Test message',
        timestamp: new Date(),
      };

      const queueItem: OfflineQueueItem = {
        id: 'queue-independence-1',
        agentId: 'agent-1',
        message: 'Queued message',
        timestamp: new Date(),
        status: 'pending',
        retryCount: 0,
      };

      act(() => {
        result.current.addMessage(message);
        result.current.addToOfflineQueue(queueItem);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.offlineQueue).toHaveLength(1);

      act(() => {
        result.current.clearOfflineQueue();
      });

      expect(result.current.offlineQueue).toHaveLength(0);
      expect(result.current.messages).toHaveLength(1);
    });
  });
});
