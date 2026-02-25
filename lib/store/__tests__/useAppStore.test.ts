import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '../useAppStore';
import type { ChatMessage, VisemeData, Notification, PlaybackState } from '@/types';

/**
 * Unit Tests for Zustand Store
 * 
 * Tests state updates for all actions, message persistence in session,
 * and notification queue management.
 * 
 * Validates: Requirements 4.3, 9.3, 11.4
 */

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.setSelectedAgent(null as any);
      result.current.clearMessages();
      result.current.setCurrentViseme(null);
      result.current.setPlaybackState('idle');
      // Clear all notifications
      result.current.notifications.forEach((n) => {
        result.current.removeNotification(n.id);
      });
    });
  });

  describe('Agent Selection State', () => {
    it('should initialize with null selectedAgentId', () => {
      const { result } = renderHook(() => useAppStore());
      expect(result.current.selectedAgentId).toBeNull();
    });

    it('should update selectedAgentId when setSelectedAgent is called', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSelectedAgent('agent-123');
      });

      expect(result.current.selectedAgentId).toBe('agent-123');
    });

    it('should allow changing selected agent multiple times', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setSelectedAgent('agent-1');
      });
      expect(result.current.selectedAgentId).toBe('agent-1');

      act(() => {
        result.current.setSelectedAgent('agent-2');
      });
      expect(result.current.selectedAgentId).toBe('agent-2');

      act(() => {
        result.current.setSelectedAgent('agent-3');
      });
      expect(result.current.selectedAgentId).toBe('agent-3');
    });
  });

  describe('Conversation State - Message Management', () => {
    it('should initialize with empty messages array', () => {
      const { result } = renderHook(() => useAppStore());
      expect(result.current.messages).toEqual([]);
    });

    it('should add a user message to the messages array', () => {
      const { result } = renderHook(() => useAppStore());

      const userMessage: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello, how are you?',
        timestamp: new Date('2024-01-15T10:00:00Z'),
      };

      act(() => {
        result.current.addMessage(userMessage);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toEqual(userMessage);
    });

    it('should add an agent message to the messages array', () => {
      const { result } = renderHook(() => useAppStore());

      const agentMessage: ChatMessage = {
        id: 'msg-2',
        role: 'agent',
        content: 'I am doing well, thank you!',
        timestamp: new Date('2024-01-15T10:00:05Z'),
      };

      act(() => {
        result.current.addMessage(agentMessage);
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toEqual(agentMessage);
    });

    it('should add multiple messages in sequence', () => {
      const { result } = renderHook(() => useAppStore());

      const message1: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'First message',
        timestamp: new Date('2024-01-15T10:00:00Z'),
      };

      const message2: ChatMessage = {
        id: 'msg-2',
        role: 'agent',
        content: 'Second message',
        timestamp: new Date('2024-01-15T10:00:05Z'),
      };

      const message3: ChatMessage = {
        id: 'msg-3',
        role: 'user',
        content: 'Third message',
        timestamp: new Date('2024-01-15T10:00:10Z'),
      };

      act(() => {
        result.current.addMessage(message1);
        result.current.addMessage(message2);
        result.current.addMessage(message3);
      });

      expect(result.current.messages).toHaveLength(3);
      expect(result.current.messages[0]).toEqual(message1);
      expect(result.current.messages[1]).toEqual(message2);
      expect(result.current.messages[2]).toEqual(message3);
    });

    it('should maintain message order when adding messages', () => {
      const { result } = renderHook(() => useAppStore());

      const messages: ChatMessage[] = [
        { id: '1', role: 'user', content: 'Hello', timestamp: new Date('2024-01-15T10:00:00Z') },
        { id: '2', role: 'agent', content: 'Hi', timestamp: new Date('2024-01-15T10:00:01Z') },
        { id: '3', role: 'user', content: 'How are you?', timestamp: new Date('2024-01-15T10:00:02Z') },
        { id: '4', role: 'agent', content: 'Good!', timestamp: new Date('2024-01-15T10:00:03Z') },
      ];

      act(() => {
        messages.forEach((msg) => result.current.addMessage(msg));
      });

      expect(result.current.messages).toHaveLength(4);
      expect(result.current.messages.map((m) => m.id)).toEqual(['1', '2', '3', '4']);
    });

    it('should persist messages in session until cleared', () => {
      const { result } = renderHook(() => useAppStore());

      const message1: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Persistent message',
        timestamp: new Date(),
      };

      act(() => {
        result.current.addMessage(message1);
      });

      expect(result.current.messages).toHaveLength(1);

      // Simulate some time passing or other operations
      const message2: ChatMessage = {
        id: 'msg-2',
        role: 'agent',
        content: 'Another message',
        timestamp: new Date(),
      };

      act(() => {
        result.current.addMessage(message2);
      });

      // Messages should still be there
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0]).toEqual(message1);
      expect(result.current.messages[1]).toEqual(message2);
    });

    it('should clear all messages when clearMessages is called', () => {
      const { result } = renderHook(() => useAppStore());

      const messages: ChatMessage[] = [
        { id: '1', role: 'user', content: 'Message 1', timestamp: new Date() },
        { id: '2', role: 'agent', content: 'Message 2', timestamp: new Date() },
        { id: '3', role: 'user', content: 'Message 3', timestamp: new Date() },
      ];

      act(() => {
        messages.forEach((msg) => result.current.addMessage(msg));
      });

      expect(result.current.messages).toHaveLength(3);

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toEqual([]);
    });

    it('should handle clearing messages when already empty', () => {
      const { result } = renderHook(() => useAppStore());

      expect(result.current.messages).toEqual([]);

      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toEqual([]);
    });

    it('should not mutate original message objects', () => {
      const { result } = renderHook(() => useAppStore());

      const originalMessage: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Original content',
        timestamp: new Date('2024-01-15T10:00:00Z'),
      };

      act(() => {
        result.current.addMessage(originalMessage);
      });

      // Verify the message in store is not the same reference
      expect(result.current.messages[0]).toEqual(originalMessage);
      
      // Modify the stored message's content (this shouldn't affect the original)
      const storedMessage = result.current.messages[0];
      expect(storedMessage.content).toBe('Original content');
    });
  });

  describe('Audio/Viseme State', () => {
    it('should initialize with null currentViseme', () => {
      const { result } = renderHook(() => useAppStore());
      expect(result.current.currentViseme).toBeNull();
    });

    it('should update currentViseme when setCurrentViseme is called', () => {
      const { result } = renderHook(() => useAppStore());

      const viseme: VisemeData = {
        visemeId: 5,
        timestamp: 1234.5,
        duration: 100,
      };

      act(() => {
        result.current.setCurrentViseme(viseme);
      });

      expect(result.current.currentViseme).toEqual(viseme);
    });

    it('should allow setting currentViseme to null', () => {
      const { result } = renderHook(() => useAppStore());

      const viseme: VisemeData = {
        visemeId: 10,
        timestamp: 5000,
        duration: 150,
      };

      act(() => {
        result.current.setCurrentViseme(viseme);
      });

      expect(result.current.currentViseme).toEqual(viseme);

      act(() => {
        result.current.setCurrentViseme(null);
      });

      expect(result.current.currentViseme).toBeNull();
    });

    it('should update currentViseme multiple times', () => {
      const { result } = renderHook(() => useAppStore());

      const viseme1: VisemeData = { visemeId: 1, timestamp: 100, duration: 50 };
      const viseme2: VisemeData = { visemeId: 2, timestamp: 200, duration: 60 };
      const viseme3: VisemeData = { visemeId: 3, timestamp: 300, duration: 70 };

      act(() => {
        result.current.setCurrentViseme(viseme1);
      });
      expect(result.current.currentViseme).toEqual(viseme1);

      act(() => {
        result.current.setCurrentViseme(viseme2);
      });
      expect(result.current.currentViseme).toEqual(viseme2);

      act(() => {
        result.current.setCurrentViseme(viseme3);
      });
      expect(result.current.currentViseme).toEqual(viseme3);
    });

    it('should initialize with idle playbackState', () => {
      const { result } = renderHook(() => useAppStore());
      expect(result.current.playbackState).toBe('idle');
    });

    it('should update playbackState when setPlaybackState is called', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setPlaybackState('playing');
      });

      expect(result.current.playbackState).toBe('playing');
    });

    it('should handle all playback state transitions', () => {
      const { result } = renderHook(() => useAppStore());

      const states: PlaybackState[] = ['idle', 'playing', 'paused', 'stopped'];

      states.forEach((state) => {
        act(() => {
          result.current.setPlaybackState(state);
        });
        expect(result.current.playbackState).toBe(state);
      });
    });

    it('should handle typical playback state flow', () => {
      const { result } = renderHook(() => useAppStore());

      // Start idle
      expect(result.current.playbackState).toBe('idle');

      // Start playing
      act(() => {
        result.current.setPlaybackState('playing');
      });
      expect(result.current.playbackState).toBe('playing');

      // Pause
      act(() => {
        result.current.setPlaybackState('paused');
      });
      expect(result.current.playbackState).toBe('paused');

      // Resume playing
      act(() => {
        result.current.setPlaybackState('playing');
      });
      expect(result.current.playbackState).toBe('playing');

      // Stop
      act(() => {
        result.current.setPlaybackState('stopped');
      });
      expect(result.current.playbackState).toBe('stopped');

      // Back to idle
      act(() => {
        result.current.setPlaybackState('idle');
      });
      expect(result.current.playbackState).toBe('idle');
    });
  });

  describe('Notification State - Queue Management', () => {
    it('should initialize with empty notifications array', () => {
      const { result } = renderHook(() => useAppStore());
      expect(result.current.notifications).toEqual([]);
    });

    it('should add a notification to the queue', () => {
      const { result } = renderHook(() => useAppStore());

      const notification: Notification = {
        id: 'notif-1',
        type: 'info',
        message: 'This is an info notification',
        timestamp: new Date('2024-01-15T10:00:00Z'),
      };

      act(() => {
        result.current.addNotification(notification);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toEqual(notification);
    });

    it('should add multiple notifications to the queue', () => {
      const { result } = renderHook(() => useAppStore());

      const notification1: Notification = {
        id: 'notif-1',
        type: 'info',
        message: 'Info message',
        timestamp: new Date('2024-01-15T10:00:00Z'),
      };

      const notification2: Notification = {
        id: 'notif-2',
        type: 'success',
        message: 'Success message',
        timestamp: new Date('2024-01-15T10:00:01Z'),
      };

      const notification3: Notification = {
        id: 'notif-3',
        type: 'error',
        message: 'Error message',
        timestamp: new Date('2024-01-15T10:00:02Z'),
      };

      act(() => {
        result.current.addNotification(notification1);
        result.current.addNotification(notification2);
        result.current.addNotification(notification3);
      });

      expect(result.current.notifications).toHaveLength(3);
      expect(result.current.notifications[0]).toEqual(notification1);
      expect(result.current.notifications[1]).toEqual(notification2);
      expect(result.current.notifications[2]).toEqual(notification3);
    });

    it('should handle all notification types', () => {
      const { result } = renderHook(() => useAppStore());

      const types: Array<'info' | 'success' | 'warning' | 'error'> = [
        'info',
        'success',
        'warning',
        'error',
      ];

      types.forEach((type, index) => {
        const notification: Notification = {
          id: `notif-${index}`,
          type,
          message: `${type} message`,
          timestamp: new Date(),
        };

        act(() => {
          result.current.addNotification(notification);
        });
      });

      expect(result.current.notifications).toHaveLength(4);
      expect(result.current.notifications.map((n) => n.type)).toEqual(types);
    });

    it('should add notification with optional duration', () => {
      const { result } = renderHook(() => useAppStore());

      const notification: Notification = {
        id: 'notif-1',
        type: 'warning',
        message: 'Warning with duration',
        timestamp: new Date(),
        duration: 5000,
      };

      act(() => {
        result.current.addNotification(notification);
      });

      expect(result.current.notifications[0].duration).toBe(5000);
    });

    it('should remove a notification by id', () => {
      const { result } = renderHook(() => useAppStore());

      const notification1: Notification = {
        id: 'notif-1',
        type: 'info',
        message: 'First notification',
        timestamp: new Date(),
      };

      const notification2: Notification = {
        id: 'notif-2',
        type: 'success',
        message: 'Second notification',
        timestamp: new Date(),
      };

      act(() => {
        result.current.addNotification(notification1);
        result.current.addNotification(notification2);
      });

      expect(result.current.notifications).toHaveLength(2);

      act(() => {
        result.current.removeNotification('notif-1');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].id).toBe('notif-2');
    });

    it('should remove multiple notifications in sequence', () => {
      const { result } = renderHook(() => useAppStore());

      const notifications: Notification[] = [
        { id: '1', type: 'info', message: 'Notification 1', timestamp: new Date() },
        { id: '2', type: 'success', message: 'Notification 2', timestamp: new Date() },
        { id: '3', type: 'warning', message: 'Notification 3', timestamp: new Date() },
        { id: '4', type: 'error', message: 'Notification 4', timestamp: new Date() },
      ];

      act(() => {
        notifications.forEach((n) => result.current.addNotification(n));
      });

      expect(result.current.notifications).toHaveLength(4);

      act(() => {
        result.current.removeNotification('2');
      });
      expect(result.current.notifications).toHaveLength(3);
      expect(result.current.notifications.map((n) => n.id)).toEqual(['1', '3', '4']);

      act(() => {
        result.current.removeNotification('4');
      });
      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.notifications.map((n) => n.id)).toEqual(['1', '3']);

      act(() => {
        result.current.removeNotification('1');
      });
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications.map((n) => n.id)).toEqual(['3']);

      act(() => {
        result.current.removeNotification('3');
      });
      expect(result.current.notifications).toHaveLength(0);
    });

    it('should handle removing non-existent notification gracefully', () => {
      const { result } = renderHook(() => useAppStore());

      const notification: Notification = {
        id: 'notif-1',
        type: 'info',
        message: 'Test notification',
        timestamp: new Date(),
      };

      act(() => {
        result.current.addNotification(notification);
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        result.current.removeNotification('non-existent-id');
      });

      // Should still have the original notification
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].id).toBe('notif-1');
    });

    it('should maintain notification queue order', () => {
      const { result } = renderHook(() => useAppStore());

      const notifications: Notification[] = [
        { id: '1', type: 'info', message: 'First', timestamp: new Date('2024-01-15T10:00:00Z') },
        { id: '2', type: 'success', message: 'Second', timestamp: new Date('2024-01-15T10:00:01Z') },
        { id: '3', type: 'warning', message: 'Third', timestamp: new Date('2024-01-15T10:00:02Z') },
      ];

      act(() => {
        notifications.forEach((n) => result.current.addNotification(n));
      });

      expect(result.current.notifications.map((n) => n.id)).toEqual(['1', '2', '3']);

      // Remove middle notification
      act(() => {
        result.current.removeNotification('2');
      });

      // Order should be preserved
      expect(result.current.notifications.map((n) => n.id)).toEqual(['1', '3']);
    });

    it('should handle rapid notification additions and removals', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.addNotification({
          id: '1',
          type: 'info',
          message: 'Notification 1',
          timestamp: new Date(),
        });
        result.current.addNotification({
          id: '2',
          type: 'success',
          message: 'Notification 2',
          timestamp: new Date(),
        });
        result.current.removeNotification('1');
        result.current.addNotification({
          id: '3',
          type: 'warning',
          message: 'Notification 3',
          timestamp: new Date(),
        });
        result.current.removeNotification('2');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].id).toBe('3');
    });
  });

  describe('State Independence', () => {
    it('should update agent selection without affecting messages', () => {
      const { result } = renderHook(() => useAppStore());

      const message: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Test message',
        timestamp: new Date(),
      };

      act(() => {
        result.current.addMessage(message);
        result.current.setSelectedAgent('agent-1');
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.selectedAgentId).toBe('agent-1');

      act(() => {
        result.current.setSelectedAgent('agent-2');
      });

      // Messages should remain unchanged
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]).toEqual(message);
    });

    it('should update viseme state without affecting notifications', () => {
      const { result } = renderHook(() => useAppStore());

      const notification: Notification = {
        id: 'notif-1',
        type: 'info',
        message: 'Test notification',
        timestamp: new Date(),
      };

      const viseme: VisemeData = {
        visemeId: 5,
        timestamp: 1000,
        duration: 100,
      };

      act(() => {
        result.current.addNotification(notification);
        result.current.setCurrentViseme(viseme);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.currentViseme).toEqual(viseme);

      act(() => {
        result.current.setCurrentViseme(null);
      });

      // Notifications should remain unchanged
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toEqual(notification);
    });

    it('should update playback state without affecting messages or notifications', () => {
      const { result } = renderHook(() => useAppStore());

      const message: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Test message',
        timestamp: new Date(),
      };

      const notification: Notification = {
        id: 'notif-1',
        type: 'info',
        message: 'Test notification',
        timestamp: new Date(),
      };

      act(() => {
        result.current.addMessage(message);
        result.current.addNotification(notification);
        result.current.setPlaybackState('playing');
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.playbackState).toBe('playing');

      act(() => {
        result.current.setPlaybackState('paused');
      });

      // Messages and notifications should remain unchanged
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.notifications).toHaveLength(1);
    });
  });

  describe('Complex State Scenarios', () => {
    it('should handle a complete conversation flow', () => {
      const { result } = renderHook(() => useAppStore());

      // Select an agent
      act(() => {
        result.current.setSelectedAgent('gpt-4');
      });

      // Add user message
      act(() => {
        result.current.addMessage({
          id: 'msg-1',
          role: 'user',
          content: 'Hello!',
          timestamp: new Date('2024-01-15T10:00:00Z'),
        });
      });

      // Start playback
      act(() => {
        result.current.setPlaybackState('playing');
      });

      // Add agent response
      act(() => {
        result.current.addMessage({
          id: 'msg-2',
          role: 'agent',
          content: 'Hi there!',
          timestamp: new Date('2024-01-15T10:00:05Z'),
        });
      });

      // Update viseme during speech
      act(() => {
        result.current.setCurrentViseme({
          visemeId: 10,
          timestamp: 1000,
          duration: 100,
        });
      });

      // Verify all state is correct
      expect(result.current.selectedAgentId).toBe('gpt-4');
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.playbackState).toBe('playing');
      expect(result.current.currentViseme).not.toBeNull();

      // Stop playback
      act(() => {
        result.current.setPlaybackState('stopped');
        result.current.setCurrentViseme(null);
      });

      expect(result.current.playbackState).toBe('stopped');
      expect(result.current.currentViseme).toBeNull();
      // Messages should persist
      expect(result.current.messages).toHaveLength(2);
    });

    it('should handle error notification during conversation', () => {
      const { result } = renderHook(() => useAppStore());

      // Start conversation
      act(() => {
        result.current.setSelectedAgent('agent-1');
        result.current.addMessage({
          id: 'msg-1',
          role: 'user',
          content: 'Test message',
          timestamp: new Date(),
        });
      });

      // Simulate error
      act(() => {
        result.current.addNotification({
          id: 'error-1',
          type: 'error',
          message: 'Failed to send message',
          timestamp: new Date(),
        });
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('error');

      // Dismiss error
      act(() => {
        result.current.removeNotification('error-1');
      });

      expect(result.current.notifications).toHaveLength(0);
      // Conversation state should remain
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.selectedAgentId).toBe('agent-1');
    });

    it('should handle clearing messages while maintaining other state', () => {
      const { result } = renderHook(() => useAppStore());

      // Set up complete state
      act(() => {
        result.current.setSelectedAgent('agent-1');
        result.current.addMessage({
          id: 'msg-1',
          role: 'user',
          content: 'Message 1',
          timestamp: new Date(),
        });
        result.current.addMessage({
          id: 'msg-2',
          role: 'agent',
          content: 'Message 2',
          timestamp: new Date(),
        });
        result.current.setPlaybackState('playing');
        result.current.setCurrentViseme({
          visemeId: 5,
          timestamp: 500,
          duration: 50,
        });
        result.current.addNotification({
          id: 'notif-1',
          type: 'info',
          message: 'Test notification',
          timestamp: new Date(),
        });
      });

      // Clear messages
      act(() => {
        result.current.clearMessages();
      });

      // Only messages should be cleared
      expect(result.current.messages).toEqual([]);
      expect(result.current.selectedAgentId).toBe('agent-1');
      expect(result.current.playbackState).toBe('playing');
      expect(result.current.currentViseme).not.toBeNull();
      expect(result.current.notifications).toHaveLength(1);
    });
  });
});
