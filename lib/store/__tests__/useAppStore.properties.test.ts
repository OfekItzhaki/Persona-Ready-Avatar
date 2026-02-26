/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import fc from 'fast-check';
import { useAppStore } from '../useAppStore';

/**
 * Helper to generate unique message IDs
 * Ensures no duplicate IDs in the same test run
 */
let messageIdCounter = 0;
const uniqueMessageId = () => {
  return fc.uuid().map((uuid) => `${uuid}-${messageIdCounter++}`);
};

/**
 * Property-Based Tests for Agent Selection State Management
 *
 * Feature: avatar-client, Property 9: Agent Selection State Management
 *
 * For any agent selected from the dropdown, the application state should update
 * to reflect that agent as the active conversation context, and all subsequent
 * operations should use that agent.
 *
 * **Validates: Requirements 4.3**
 */
describe('Property: Agent Selection State Management', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.setSelectedAgent(null as any);
      result.current.clearMessages();
      result.current.setCurrentViseme(null);
      result.current.setPlaybackState('idle');
      result.current.notifications.forEach((n) => {
        result.current.removeNotification(n.id);
      });
    });
  });

  /**
   * Property: For any agent ID, setting it as selected should update the
   * selectedAgentId state to that exact value
   */
  it('should update selectedAgentId to exact value for any agent ID', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 100 }), (agentId) => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.setSelectedAgent(agentId);
        });

        // Property: selectedAgentId should match the input exactly
        expect(result.current.selectedAgentId).toBe(agentId);
      }),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any sequence of agent selections, the state should always
   * reflect the most recently selected agent
   */
  it('should always reflect the most recently selected agent for any sequence', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
        (agentIds) => {
          const { result } = renderHook(() => useAppStore());

          // Select each agent in sequence
          agentIds.forEach((agentId) => {
            act(() => {
              result.current.setSelectedAgent(agentId);
            });
          });

          // Property: State should reflect the last agent in the sequence
          const lastAgentId = agentIds[agentIds.length - 1];
          expect(result.current.selectedAgentId).toBe(lastAgentId);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: Agent selection should be independent of other state changes
   * (messages, visemes, notifications, playback state)
   */
  it('should maintain agent selection independently of other state changes', () => {
    fc.assert(
      fc.property(
        fc.record({
          agentId: fc.string({ minLength: 1, maxLength: 50 }),
          messageCount: fc.integer({ min: 0, max: 10 }),
          playbackStates: fc.array(fc.constantFrom('idle', 'playing', 'paused', 'stopped'), {
            minLength: 0,
            maxLength: 5,
          }),
        }),
        ({ agentId, messageCount, playbackStates }) => {
          const { result } = renderHook(() => useAppStore());

          // Set agent
          act(() => {
            result.current.setSelectedAgent(agentId);
          });

          const initialAgentId = result.current.selectedAgentId;

          // Perform various state changes
          act(() => {
            // Add messages
            for (let i = 0; i < messageCount; i++) {
              result.current.addMessage({
                id: `msg-${i}`,
                role: i % 2 === 0 ? 'user' : 'agent',
                content: `Message ${i}`,
                timestamp: new Date(),
              });
            }

            // Change playback states
            playbackStates.forEach((state) => {
              result.current.setPlaybackState(state);
            });

            // Add and remove notifications
            result.current.addNotification({
              id: 'test-notif',
              type: 'info',
              message: 'Test',
              timestamp: new Date(),
            });
            result.current.removeNotification('test-notif');
          });

          // Property: Agent selection should remain unchanged
          expect(result.current.selectedAgentId).toBe(initialAgentId);
          expect(result.current.selectedAgentId).toBe(agentId);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any agent selection, the state should be immediately
   * available for subsequent operations (no async delay)
   */
  it('should make agent selection immediately available for subsequent operations', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 50 }), (agentId) => {
        const { result } = renderHook(() => useAppStore());

        // Clear any existing state
        act(() => {
          result.current.clearMessages();
        });

        act(() => {
          result.current.setSelectedAgent(agentId);
        });

        // Property: State should be immediately readable
        const readAgentId = result.current.selectedAgentId;
        expect(readAgentId).toBe(agentId);

        // Property: State should be usable in subsequent operations
        const messageContent = `Message for agent ${result.current.selectedAgentId}`;
        act(() => {
          result.current.addMessage({
            id: 'msg-1',
            role: 'user',
            content: messageContent,
            timestamp: new Date(),
          });
        });

        expect(result.current.messages[result.current.messages.length - 1].content).toBe(
          messageContent
        );
      }),
      { numRuns: 25 }
    );
  });

  /**
   * Property: Agent selection should be idempotent - selecting the same
   * agent multiple times should have the same effect as selecting it once
   */
  it('should be idempotent when selecting the same agent multiple times', () => {
    fc.assert(
      fc.property(
        fc.record({
          agentId: fc.string({ minLength: 1, maxLength: 50 }),
          repetitions: fc.integer({ min: 1, max: 10 }),
        }),
        ({ agentId, repetitions }) => {
          const { result } = renderHook(() => useAppStore());

          // Select the same agent multiple times
          for (let i = 0; i < repetitions; i++) {
            act(() => {
              result.current.setSelectedAgent(agentId);
            });
          }

          // Property: State should be the same as selecting once
          expect(result.current.selectedAgentId).toBe(agentId);

          // Property: No side effects should accumulate
          expect(result.current.messages).toHaveLength(0);
          expect(result.current.notifications).toHaveLength(0);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: Agent selection should persist across other state operations
   * until explicitly changed
   */
  it('should persist agent selection across state operations until changed', () => {
    fc.assert(
      fc.property(
        fc
          .record({
            initialAgent: fc.string({ minLength: 1, maxLength: 50 }),
            operations: fc.array(
              fc.constantFrom('addMessage', 'clearMessages', 'addNotification', 'setPlayback'),
              { minLength: 1, maxLength: 20 }
            ),
            newAgent: fc.string({ minLength: 1, maxLength: 50 }),
          })
          .filter(({ initialAgent, newAgent }) => initialAgent !== newAgent), // Ensure agents are different
        ({ initialAgent, operations, newAgent }) => {
          const { result } = renderHook(() => useAppStore());

          // Set initial agent
          act(() => {
            result.current.setSelectedAgent(initialAgent);
          });

          // Perform various operations
          act(() => {
            operations.forEach((op, index) => {
              switch (op) {
                case 'addMessage':
                  result.current.addMessage({
                    id: `msg-${index}`,
                    role: 'user',
                    content: `Message ${index}`,
                    timestamp: new Date(),
                  });
                  break;
                case 'clearMessages':
                  result.current.clearMessages();
                  break;
                case 'addNotification':
                  result.current.addNotification({
                    id: `notif-${index}`,
                    type: 'info',
                    message: `Notification ${index}`,
                    timestamp: new Date(),
                  });
                  break;
                case 'setPlayback':
                  result.current.setPlaybackState('playing');
                  break;
              }
            });
          });

          // Property: Agent should still be the initial agent
          expect(result.current.selectedAgentId).toBe(initialAgent);

          // Change agent
          act(() => {
            result.current.setSelectedAgent(newAgent);
          });

          // Property: Agent should now be the new agent
          expect(result.current.selectedAgentId).toBe(newAgent);
          expect(result.current.selectedAgentId).not.toBe(initialAgent);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any valid agent ID format (UUIDs, slugs, numeric IDs),
   * the state should handle them correctly
   */
  it('should handle any valid agent ID format correctly', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.uuid(), // UUID format
          fc
            .string({ minLength: 1, maxLength: 50 })
            .map((s) => s.toLowerCase().replace(/\s/g, '-')), // Slug format
          fc.integer({ min: 1, max: 999999 }).map((n) => n.toString()), // Numeric ID
          fc.string({ minLength: 1, maxLength: 50 }) // Arbitrary string
        ),
        (agentId) => {
          const { result } = renderHook(() => useAppStore());

          act(() => {
            result.current.setSelectedAgent(agentId);
          });

          // Property: State should store the agent ID exactly as provided
          expect(result.current.selectedAgentId).toBe(agentId);
          expect(typeof result.current.selectedAgentId).toBe('string');
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: Agent selection state should be consistent across multiple
   * hook instances (Zustand store is shared)
   */
  it('should maintain consistent state across multiple hook instances', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 50 }), (agentId) => {
        const { result: result1 } = renderHook(() => useAppStore());
        const { result: result2 } = renderHook(() => useAppStore());

        // Set agent in first instance
        act(() => {
          result1.current.setSelectedAgent(agentId);
        });

        // Property: Both instances should see the same state
        expect(result1.current.selectedAgentId).toBe(agentId);
        expect(result2.current.selectedAgentId).toBe(agentId);
        expect(result1.current.selectedAgentId).toBe(result2.current.selectedAgentId);
      }),
      { numRuns: 25 }
    );
  });

  /**
   * Property: Agent selection should work correctly in a conversation flow
   * where messages are added after agent selection
   */
  it('should support conversation flow with agent selection followed by messages', () => {
    fc.assert(
      fc.property(
        fc.record({
          agentId: fc.string({ minLength: 1, maxLength: 50 }),
          messages: fc.array(
            fc.record({
              role: fc.constantFrom('user', 'agent'),
              content: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        ({ agentId, messages }) => {
          const { result } = renderHook(() => useAppStore());

          // Clear any existing state
          act(() => {
            result.current.clearMessages();
          });

          // Select agent first
          act(() => {
            result.current.setSelectedAgent(agentId);
          });

          // Add messages
          act(() => {
            messages.forEach((msg, index) => {
              result.current.addMessage({
                id: `msg-${index}`,
                role: msg.role,
                content: msg.content,
                timestamp: new Date(),
              });
            });
          });

          // Property: Agent should remain selected throughout conversation
          expect(result.current.selectedAgentId).toBe(agentId);

          // Property: Messages should be added correctly
          expect(result.current.messages).toHaveLength(messages.length);

          // Property: All messages should be associated with the selected agent context
          // (In a real app, messages would reference the agent ID, but here we verify
          // the agent selection persists)
          expect(result.current.selectedAgentId).toBe(agentId);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: Switching agents should not affect existing conversation history
   * (messages persist when agent changes)
   */
  it('should preserve conversation history when switching agents', () => {
    fc.assert(
      fc.property(
        fc.record({
          agent1: fc.string({ minLength: 1, maxLength: 50 }),
          agent2: fc.string({ minLength: 1, maxLength: 50 }),
          messageCount: fc.integer({ min: 1, max: 10 }),
        }),
        ({ agent1, agent2, messageCount }) => {
          const { result } = renderHook(() => useAppStore());

          // Clear any existing state
          act(() => {
            result.current.clearMessages();
          });

          // Select first agent and add messages
          act(() => {
            result.current.setSelectedAgent(agent1);
            for (let i = 0; i < messageCount; i++) {
              result.current.addMessage({
                id: `msg-${i}`,
                role: i % 2 === 0 ? 'user' : 'agent',
                content: `Message ${i}`,
                timestamp: new Date(),
              });
            }
          });

          const messagesBeforeSwitch = result.current.messages.length;

          // Switch to second agent
          act(() => {
            result.current.setSelectedAgent(agent2);
          });

          // Property: Agent should be updated
          expect(result.current.selectedAgentId).toBe(agent2);

          // Property: Messages should be preserved
          expect(result.current.messages).toHaveLength(messagesBeforeSwitch);
          expect(result.current.messages).toHaveLength(messageCount);
        }
      ),
      { numRuns: 25 }
    );
  });
});

/**
 * Property-Based Tests for Session Conversation Persistence
 *
 * Feature: avatar-client, Property 27: Session Conversation Persistence
 *
 * For any message added to the conversation history, the message should persist
 * in client-side state for the duration of the session.
 *
 * **Validates: Requirements 11.4**
 */
describe('Property: Session Conversation Persistence', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.setSelectedAgent(null as any);
      result.current.clearMessages();
      result.current.setCurrentViseme(null);
      result.current.setPlaybackState('idle');
      result.current.notifications.forEach((n) => {
        result.current.removeNotification(n.id);
      });
    });
  });

  /**
   * Property: For any message added to the conversation history, the message
   * should be retrievable from state immediately after addition
   */
  it('should persist any message added to conversation history', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          role: fc.constantFrom('user', 'agent'),
          content: fc.string({ minLength: 1, maxLength: 500 }),
          timestamp: fc.date(),
        }),
        (message) => {
          const { result } = renderHook(() => useAppStore());

          // Clear any existing messages
          act(() => {
            result.current.clearMessages();
          });

          // Add message
          act(() => {
            result.current.addMessage(message);
          });

          // Property: Message should be persisted in state
          expect(result.current.messages).toHaveLength(1);
          expect(result.current.messages[0]).toEqual(message);
          expect(result.current.messages[0].id).toBe(message.id);
          expect(result.current.messages[0].role).toBe(message.role);
          expect(result.current.messages[0].content).toBe(message.content);
          expect(result.current.messages[0].timestamp).toEqual(message.timestamp);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any sequence of messages added, all messages should persist
   * in chronological order (sorted by timestamp)
   */
  it('should persist all messages in a sequence in chronological order', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: uniqueMessageId(),
            role: fc.constantFrom('user', 'agent'),
            content: fc.string({ minLength: 1, maxLength: 500 }),
            timestamp: fc.date(),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (messages) => {
          const { result } = renderHook(() => useAppStore());

          // Clear any existing messages
          act(() => {
            result.current.clearMessages();
          });

          // Add all messages
          act(() => {
            messages.forEach((msg) => {
              result.current.addMessage(msg);
            });
          });

          // Property: All messages should be persisted
          expect(result.current.messages).toHaveLength(messages.length);

          // Property: Messages should be in chronological order (sorted by timestamp)
          const sortedMessages = [...messages].sort((a, b) => {
            const timeA = a.timestamp.getTime();
            const timeB = b.timestamp.getTime();
            if (isNaN(timeA) && isNaN(timeB)) return 0;
            if (isNaN(timeA)) return -1;
            if (isNaN(timeB)) return 1;
            if (timeA === timeB) return 0;
            return timeA - timeB;
          });

          sortedMessages.forEach((msg, index) => {
            expect(result.current.messages[index]).toEqual(msg);
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: Messages should persist across other state operations
   * (agent selection, viseme updates, playback state changes, notifications)
   */
  it('should persist messages across other state operations', () => {
    fc.assert(
      fc.property(
        fc.record({
          messages: fc.array(
            fc.record({
              id: uniqueMessageId(),
              role: fc.constantFrom('user', 'agent'),
              content: fc.string({ minLength: 1, maxLength: 200 }),
              timestamp: fc.date(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          agentChanges: fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
            minLength: 0,
            maxLength: 5,
          }),
          playbackStates: fc.array(fc.constantFrom('idle', 'playing', 'paused', 'stopped'), {
            minLength: 0,
            maxLength: 5,
          }),
          notificationCount: fc.integer({ min: 0, max: 5 }),
        }),
        ({ messages, agentChanges, playbackStates, notificationCount }) => {
          const { result } = renderHook(() => useAppStore());

          // Clear any existing messages
          act(() => {
            result.current.clearMessages();
          });

          // Add messages
          act(() => {
            messages.forEach((msg) => {
              result.current.addMessage(msg);
            });
          });

          const messageCountAfterAdd = result.current.messages.length;
          const messagesSnapshot = [...result.current.messages];

          // Perform various state operations
          act(() => {
            // Change agents
            agentChanges.forEach((agentId) => {
              result.current.setSelectedAgent(agentId);
            });

            // Change playback states
            playbackStates.forEach((state) => {
              result.current.setPlaybackState(state);
            });

            // Add and remove notifications
            for (let i = 0; i < notificationCount; i++) {
              result.current.addNotification({
                id: `notif-${i}`,
                type: 'info',
                message: `Notification ${i}`,
                timestamp: new Date(),
              });
            }

            // Set viseme data
            result.current.setCurrentViseme({
              visemeId: 5,
              timestamp: 100,
              duration: 50,
            });
            result.current.setCurrentViseme(null);
          });

          // Property: Messages should remain unchanged
          expect(result.current.messages).toHaveLength(messageCountAfterAdd);
          expect(result.current.messages).toHaveLength(messages.length);

          // Property: Message content should be identical
          messagesSnapshot.forEach((msg, index) => {
            expect(result.current.messages[index]).toEqual(msg);
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: Messages should persist across multiple hook instances
   * (Zustand store is shared across components)
   */
  it('should persist messages across multiple hook instances', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: uniqueMessageId(),
            role: fc.constantFrom('user', 'agent'),
            content: fc.string({ minLength: 1, maxLength: 200 }),
            timestamp: fc.date(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (messages) => {
          const { result: result1 } = renderHook(() => useAppStore());
          const { result: result2 } = renderHook(() => useAppStore());

          // Clear any existing messages
          act(() => {
            result1.current.clearMessages();
          });

          // Add messages via first instance
          act(() => {
            messages.forEach((msg) => {
              result1.current.addMessage(msg);
            });
          });

          // Property: Both instances should see the same messages
          expect(result1.current.messages).toHaveLength(messages.length);
          expect(result2.current.messages).toHaveLength(messages.length);

          // Property: Message content should be identical in both instances (in chronological order)
          const sortedMessages = [...messages].sort((a, b) => {
            const timeA = a.timestamp.getTime();
            const timeB = b.timestamp.getTime();
            if (isNaN(timeA) && isNaN(timeB)) return 0;
            if (isNaN(timeA)) return -1;
            if (isNaN(timeB)) return 1;
            if (timeA === timeB) return 0;
            return timeA - timeB;
          });

          sortedMessages.forEach((msg, index) => {
            expect(result1.current.messages[index]).toEqual(msg);
            expect(result2.current.messages[index]).toEqual(msg);
            expect(result1.current.messages[index]).toEqual(result2.current.messages[index]);
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: Messages should persist until explicitly cleared
   */
  it('should persist messages until explicitly cleared', () => {
    fc.assert(
      fc.property(
        fc.record({
          initialMessages: fc.array(
            fc.record({
              id: uniqueMessageId(),
              role: fc.constantFrom('user', 'agent'),
              content: fc.string({ minLength: 1, maxLength: 200 }),
              timestamp: fc.date(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          additionalMessages: fc.array(
            fc.record({
              id: uniqueMessageId(),
              role: fc.constantFrom('user', 'agent'),
              content: fc.string({ minLength: 1, maxLength: 200 }),
              timestamp: fc.date(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        ({ initialMessages, additionalMessages }) => {
          const { result } = renderHook(() => useAppStore());

          // Clear any existing messages
          act(() => {
            result.current.clearMessages();
          });

          // Add initial messages
          act(() => {
            initialMessages.forEach((msg) => {
              result.current.addMessage(msg);
            });
          });

          // Property: Initial messages should persist
          expect(result.current.messages).toHaveLength(initialMessages.length);

          // Add more messages
          act(() => {
            additionalMessages.forEach((msg) => {
              result.current.addMessage(msg);
            });
          });

          // Property: All messages should persist
          const totalMessages = initialMessages.length + additionalMessages.length;
          expect(result.current.messages).toHaveLength(totalMessages);

          // Clear messages
          act(() => {
            result.current.clearMessages();
          });

          // Property: Messages should be cleared
          expect(result.current.messages).toHaveLength(0);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: Message persistence should maintain data integrity
   * (no mutation, corruption, or loss of message properties)
   */
  it('should maintain data integrity for persisted messages', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: uniqueMessageId(),
            role: fc.constantFrom('user', 'agent'),
            content: fc.string({ minLength: 1, maxLength: 500 }),
            timestamp: fc.date(),
          }),
          { minLength: 1, maxLength: 15 }
        ),
        (messages) => {
          const { result } = renderHook(() => useAppStore());

          // Clear any existing messages
          act(() => {
            result.current.clearMessages();
          });

          // Create deep copies of messages for comparison
          const messagesCopy = messages.map((msg) => ({ ...msg }));

          // Add messages
          act(() => {
            messages.forEach((msg) => {
              result.current.addMessage(msg);
            });
          });

          // Sort the copy to match the chronological order in the store
          const sortedMessagesCopy = messagesCopy.sort((a, b) => {
            const timeA = a.timestamp.getTime();
            const timeB = b.timestamp.getTime();
            if (isNaN(timeA) && isNaN(timeB)) return 0;
            if (isNaN(timeA)) return -1;
            if (isNaN(timeB)) return 1;
            if (timeA === timeB) return 0;
            return timeA - timeB;
          });

          // Property: Each message property should be preserved exactly
          sortedMessagesCopy.forEach((originalMsg, index) => {
            const persistedMsg = result.current.messages[index];

            expect(persistedMsg.id).toBe(originalMsg.id);
            expect(persistedMsg.role).toBe(originalMsg.role);
            expect(persistedMsg.content).toBe(originalMsg.content);
            expect(persistedMsg.timestamp).toEqual(originalMsg.timestamp);

            // Property: No additional properties should be added
            expect(Object.keys(persistedMsg).sort()).toEqual(Object.keys(originalMsg).sort());
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: Messages should accumulate over time (append-only until cleared)
   */
  it('should accumulate messages over time in append-only fashion', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.array(
            fc.record({
              id: uniqueMessageId(),
              role: fc.constantFrom('user', 'agent'),
              content: fc.string({ minLength: 1, maxLength: 200 }),
              timestamp: fc.date(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          { minLength: 1, maxLength: 5 }
        ),
        (messageBatches) => {
          const { result } = renderHook(() => useAppStore());

          // Clear any existing messages
          act(() => {
            result.current.clearMessages();
          });

          let expectedTotalMessages = 0;
          const allMessages: any[] = [];

          // Add messages in batches
          messageBatches.forEach((batch) => {
            act(() => {
              batch.forEach((msg) => {
                result.current.addMessage(msg);
                allMessages.push(msg);
              });
            });

            expectedTotalMessages += batch.length;

            // Property: Message count should accumulate
            expect(result.current.messages).toHaveLength(expectedTotalMessages);
          });

          // Property: All messages should be present in chronological order
          expect(result.current.messages).toHaveLength(allMessages.length);

          const sortedAllMessages = allMessages.sort((a, b) => {
            const timeA = a.timestamp.getTime();
            const timeB = b.timestamp.getTime();
            if (isNaN(timeA) && isNaN(timeB)) return 0;
            if (isNaN(timeA)) return -1;
            if (isNaN(timeB)) return 1;
            if (timeA === timeB) return 0;
            return timeA - timeB;
          });

          sortedAllMessages.forEach((msg, index) => {
            expect(result.current.messages[index]).toEqual(msg);
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: Message persistence should handle edge cases
   * (empty content, special characters, very long content)
   */
  it('should persist messages with edge case content correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: uniqueMessageId(),
            role: fc.constantFrom('user', 'agent'),
            content: fc.oneof(
              fc.constant(''), // Empty string (edge case)
              fc.string({ minLength: 1, maxLength: 1 }), // Single character
              fc.string({ minLength: 1000, maxLength: 2000 }), // Very long content
              fc.constant('Hello\nWorld\t!'), // Special characters
              fc.constant('🎉 Unicode 中文 العربية'), // Unicode characters
              fc.constant('<script>alert("xss")</script>'), // HTML/Script content
              fc.constant('{"json": "content"}') // JSON-like content
            ),
            timestamp: fc.date(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (messages) => {
          const { result } = renderHook(() => useAppStore());

          // Clear any existing messages
          act(() => {
            result.current.clearMessages();
          });

          // Add messages with edge case content
          act(() => {
            messages.forEach((msg) => {
              result.current.addMessage(msg);
            });
          });

          // Property: All messages should be persisted regardless of content
          expect(result.current.messages).toHaveLength(messages.length);

          // Property: Content should be preserved exactly (no sanitization or mutation)
          // Sort messages to match chronological order
          const sortedMessages = [...messages].sort((a, b) => {
            const timeA = a.timestamp.getTime();
            const timeB = b.timestamp.getTime();
            if (isNaN(timeA) && isNaN(timeB)) return 0;
            if (isNaN(timeA)) return -1;
            if (isNaN(timeB)) return 1;
            if (timeA === timeB) return 0;
            return timeA - timeB;
          });

          sortedMessages.forEach((msg, index) => {
            expect(result.current.messages[index].content).toBe(msg.content);
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: Message persistence should be independent of message role
   * (both user and agent messages persist equally)
   */
  it('should persist user and agent messages equally', () => {
    fc.assert(
      fc.property(
        fc.record({
          userMessages: fc.array(
            fc.record({
              id: uniqueMessageId(),
              role: fc.constant('user' as const),
              content: fc.string({ minLength: 1, maxLength: 200 }),
              timestamp: fc.date(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          agentMessages: fc.array(
            fc.record({
              id: uniqueMessageId(),
              role: fc.constant('agent' as const),
              content: fc.string({ minLength: 1, maxLength: 200 }),
              timestamp: fc.date(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        ({ userMessages, agentMessages }) => {
          const { result } = renderHook(() => useAppStore());

          // Clear any existing messages
          act(() => {
            result.current.clearMessages();
          });

          // Interleave user and agent messages
          const interleavedMessages: any[] = [];
          const maxLength = Math.max(userMessages.length, agentMessages.length);

          for (let i = 0; i < maxLength; i++) {
            if (i < userMessages.length) {
              interleavedMessages.push(userMessages[i]);
            }
            if (i < agentMessages.length) {
              interleavedMessages.push(agentMessages[i]);
            }
          }

          // Add interleaved messages
          act(() => {
            interleavedMessages.forEach((msg) => {
              result.current.addMessage(msg);
            });
          });

          // Property: All messages should be persisted
          expect(result.current.messages).toHaveLength(interleavedMessages.length);

          // Property: Messages should maintain their roles
          const sortedInterleaved = interleavedMessages.sort((a, b) => {
            const timeA = a.timestamp.getTime();
            const timeB = b.timestamp.getTime();
            if (isNaN(timeA) && isNaN(timeB)) return 0;
            if (isNaN(timeA)) return -1;
            if (isNaN(timeB)) return 1;
            if (timeA === timeB) return 0;
            return timeA - timeB;
          });

          sortedInterleaved.forEach((msg, index) => {
            expect(result.current.messages[index].role).toBe(msg.role);
          });

          // Property: User and agent messages should be treated equally
          const persistedUserMessages = result.current.messages.filter((m) => m.role === 'user');
          const persistedAgentMessages = result.current.messages.filter((m) => m.role === 'agent');

          expect(persistedUserMessages).toHaveLength(userMessages.length);
          expect(persistedAgentMessages).toHaveLength(agentMessages.length);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: Message persistence should handle rapid successive additions
   * (stress test for state update batching)
   */
  it('should handle rapid successive message additions correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: uniqueMessageId(),
            role: fc.constantFrom('user', 'agent'),
            content: fc.string({ minLength: 1, maxLength: 100 }),
            timestamp: fc.date(),
          }),
          { minLength: 5, maxLength: 30 }
        ),
        (messages) => {
          const { result } = renderHook(() => useAppStore());

          // Clear any existing messages
          act(() => {
            result.current.clearMessages();
          });

          // Add all messages rapidly in a single act block
          act(() => {
            messages.forEach((msg) => {
              result.current.addMessage(msg);
            });
          });

          // Property: All messages should be persisted despite rapid additions
          expect(result.current.messages).toHaveLength(messages.length);

          // Property: No messages should be lost or duplicated
          const messageIds = result.current.messages.map((m) => m.id);
          const uniqueIds = new Set(messageIds);
          expect(uniqueIds.size).toBe(messages.length);

          // Property: Chronological order should be preserved
          const sortedMessages = [...messages].sort((a, b) => {
            const timeA = a.timestamp.getTime();
            const timeB = b.timestamp.getTime();
            if (isNaN(timeA) && isNaN(timeB)) return 0;
            if (isNaN(timeA)) return -1;
            if (isNaN(timeB)) return 1;
            if (timeA === timeB) return 0;
            return timeA - timeB;
          });

          sortedMessages.forEach((msg, index) => {
            expect(result.current.messages[index]).toEqual(msg);
          });
        }
      ),
      { numRuns: 25 }
    );
  });
});
