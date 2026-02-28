/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
/**
 * Integration Tests for React Query Hooks
 *
 * Tests React Query hooks for server state management:
 * - useAgents query with caching behavior
 * - useSendMessage mutation with optimistic updates
 * - Error handling in queries and mutations
 *
 * **Validates: Requirements 4.1, 5.3, 11.2, 11.3**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAgents, useSendMessage } from '../useReactQuery';
import { useAppStore } from '@/lib/store/useAppStore';
import type { Agent, ChatResponse, ApiError, Result } from '@/types';
import React from 'react';

// Mock the BrainApiRepository
vi.mock('@/lib/repositories/BrainApiRepository');

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('React Query Hooks Integration Tests', () => {
  let queryClient: QueryClient;

  const mockAgents: Agent[] = [
    {
      id: 'agent-1',
      name: 'Assistant',
      description: 'Helpful AI assistant',
      voice: 'en-US-JennyNeural',
      language: 'en-US',
    },
    {
      id: 'agent-2',
      name: 'Spanish Assistant',
      description: 'Spanish speaking assistant',
      voice: 'es-ES-ElviraNeural',
      language: 'es-ES',
    },
  ];

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(async () => {
    // Reset Zustand store
    const store = useAppStore.getState();
    act(() => {
      store.setSelectedAgent(null as any);
      store.clearMessages();
      store.setCurrentViseme(null);
      store.setPlaybackState('idle');
      store.notifications.forEach((n) => store.removeNotification(n.id));
    });

    // Create fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity, // Prevent garbage collection during tests
        },
        mutations: {
          retry: false,
        },
      },
    });

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('useAgents Query Hook', () => {
    describe('Successful Agent Fetching', () => {
      it('should fetch agents successfully', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        vi.mocked(BrainApiRepository.prototype.getAgents).mockResolvedValue({
          success: true,
          data: mockAgents,
        });

        const { result } = renderHook(() => useAgents(), { wrapper });

        // Initially loading
        expect(result.current.isLoading).toBe(true);
        expect(result.current.data).toBeUndefined();

        // Wait for data to load
        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockAgents);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      it('should return agent list with correct structure', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        vi.mocked(BrainApiRepository.prototype.getAgents).mockResolvedValue({
          success: true,
          data: mockAgents,
        });

        const { result } = renderHook(() => useAgents(), { wrapper });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toHaveLength(2);
        expect(result.current.data?.[0]).toHaveProperty('id');
        expect(result.current.data?.[0]).toHaveProperty('name');
        expect(result.current.data?.[0]).toHaveProperty('voice');
        expect(result.current.data?.[0]).toHaveProperty('language');
      });
    });

    describe('Caching Behavior (Requirement 11.2)', () => {
      it('should cache agent list for 5 minutes', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        const mockGetAgents = vi.fn().mockResolvedValue({
          success: true,
          data: mockAgents,
        });
        vi.mocked(BrainApiRepository.prototype.getAgents).mockImplementation(mockGetAgents);

        // First render
        const { result: result1, unmount: unmount1 } = renderHook(() => useAgents(), { wrapper });

        await waitFor(() => {
          expect(result1.current.isSuccess).toBe(true);
        });

        expect(mockGetAgents).toHaveBeenCalledTimes(1);

        // Unmount first hook
        unmount1();

        // Second render within cache time - should use cached data
        const { result: result2 } = renderHook(() => useAgents(), { wrapper });

        await waitFor(() => {
          expect(result2.current.isSuccess).toBe(true);
        });

        // Should still be called only once (using cache)
        expect(mockGetAgents).toHaveBeenCalledTimes(1);
        expect(result2.current.data).toEqual(mockAgents);
      });

      it('should not refetch on window focus', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        const mockGetAgents = vi.fn().mockResolvedValue({
          success: true,
          data: mockAgents,
        });
        vi.mocked(BrainApiRepository.prototype.getAgents).mockImplementation(mockGetAgents);

        const { result } = renderHook(() => useAgents(), { wrapper });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockGetAgents).toHaveBeenCalledTimes(1);

        // Simulate window focus event
        act(() => {
          window.dispatchEvent(new Event('focus'));
        });

        // Wait a bit to ensure no refetch happens
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Should still be called only once (no refetch on focus)
        expect(mockGetAgents).toHaveBeenCalledTimes(1);
      });

      it('should serve multiple components from same cache', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        const mockGetAgents = vi.fn().mockResolvedValue({
          success: true,
          data: mockAgents,
        });
        vi.mocked(BrainApiRepository.prototype.getAgents).mockImplementation(mockGetAgents);

        // Render multiple hooks simultaneously
        const { result: result1 } = renderHook(() => useAgents(), { wrapper });
        const { result: result2 } = renderHook(() => useAgents(), { wrapper });
        const { result: result3 } = renderHook(() => useAgents(), { wrapper });

        await waitFor(() => {
          expect(result1.current.isSuccess).toBe(true);
          expect(result2.current.isSuccess).toBe(true);
          expect(result3.current.isSuccess).toBe(true);
        });

        // Should only fetch once for all three hooks
        expect(mockGetAgents).toHaveBeenCalledTimes(1);
        expect(result1.current.data).toEqual(mockAgents);
        expect(result2.current.data).toEqual(mockAgents);
        expect(result3.current.data).toEqual(mockAgents);
      });
    });

    describe('Error Handling', () => {
      it('should allow refetch after error', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        const networkError: Result<Agent[], ApiError> = {
          success: false,
          error: {
            type: 'NETWORK_ERROR',
            message: 'Failed to connect',
          },
        };

        // First call fails, second succeeds
        vi.mocked(BrainApiRepository.prototype.getAgents)
          .mockResolvedValueOnce(networkError)
          .mockResolvedValueOnce({
            success: true,
            data: mockAgents,
          });

        const { result } = renderHook(() => useAgents(), { wrapper });

        await waitFor(
          () => {
            expect(result.current.isLoading).toBe(false);
          },
          { timeout: 3000 }
        );

        // Refetch
        act(() => {
          result.current.refetch();
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockAgents);
      });
    });
  });

  describe('useSendMessage Mutation Hook', () => {
    describe('Successful Message Sending', () => {
      it('should send message successfully', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        const mockResponse: ChatResponse = {
          message: 'Hello! How can I help you?',
          agentId: 'agent-1',
          timestamp: new Date().toISOString(),
        };
        vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue({
          success: true,
          data: mockResponse,
        });

        const { result } = renderHook(() => useSendMessage(), { wrapper });

        act(() => {
          result.current.mutate({
            agentId: 'agent-1',
            message: 'Hello',
          });
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toEqual(mockResponse);
        expect(result.current.isError).toBe(false);
      });

      it('should call repository with correct parameters', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        const mockSendMessage = vi.fn().mockResolvedValue({
          success: true,
          data: {
            message: 'Response',
            agentId: 'agent-1',
            timestamp: new Date().toISOString(),
          },
        });
        vi.mocked(BrainApiRepository.prototype.sendMessage).mockImplementation(mockSendMessage);

        const { result } = renderHook(() => useSendMessage(), { wrapper });

        act(() => {
          result.current.mutate({
            agentId: 'agent-1',
            message: 'Test message',
          });
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(mockSendMessage).toHaveBeenCalledWith('agent-1', 'Test message');
      });
    });

    describe('Optimistic UI Updates (Requirement 11.3)', () => {
      it('should add user message optimistically before API response', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');

        // Delay the response to test optimistic update
        vi.mocked(BrainApiRepository.prototype.sendMessage).mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return {
            success: true,
            data: {
              message: 'Response',
              agentId: 'agent-1',
              timestamp: new Date().toISOString(),
            },
          };
        });

        const { result } = renderHook(() => useSendMessage(), { wrapper });

        // Store should be empty initially
        expect(useAppStore.getState().messages).toHaveLength(0);

        act(() => {
          result.current.mutate({
            agentId: 'agent-1',
            message: 'Hello',
          });
        });

        // User message should appear immediately (optimistic update)
        await waitFor(() => {
          const messages = useAppStore.getState().messages;
          expect(messages.length).toBeGreaterThan(0);
          expect(messages[0].role).toBe('user');
          expect(messages[0].content).toBe('Hello');
        });

        // Mutation should still be pending
        expect(result.current.isPending).toBe(true);

        // Wait for mutation to complete
        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        // Agent response should be added
        const messages = useAppStore.getState().messages;
        expect(messages).toHaveLength(2);
        expect(messages[1].role).toBe('agent');
        expect(messages[1].content).toBe('Response');
      });

      it('should generate temporary ID for optimistic message', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue({
          success: true,
          data: {
            message: 'Response',
            agentId: 'agent-1',
            timestamp: new Date().toISOString(),
          },
        });

        const { result } = renderHook(() => useSendMessage(), { wrapper });

        act(() => {
          result.current.mutate({
            agentId: 'agent-1',
            message: 'Test',
          });
        });

        await waitFor(() => {
          const messages = useAppStore.getState().messages;
          expect(messages.length).toBeGreaterThan(0);
        });

        // Find the user message (messages are sorted chronologically)
        const messages = useAppStore.getState().messages;
        const userMessage = messages.find((m) => m.role === 'user');
        expect(userMessage).toBeDefined();
        expect(userMessage!.id).toMatch(/^temp-\d+$/);
      });

      it('should keep optimistic message on error', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        const networkError: Result<ChatResponse, ApiError> = {
          success: false,
          error: {
            type: 'NETWORK_ERROR',
            message: 'Failed to connect',
          },
        };
        vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue(networkError);

        const { result } = renderHook(() => useSendMessage(), { wrapper });

        act(() => {
          result.current.mutate({
            agentId: 'agent-1',
            message: 'Hello',
          });
        });

        // Optimistic message should be added
        await waitFor(() => {
          expect(useAppStore.getState().messages).toHaveLength(1);
        });

        // Wait for error
        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        });

        // Optimistic message should still be there
        expect(useAppStore.getState().messages).toHaveLength(1);
        expect(useAppStore.getState().messages[0].content).toBe('Hello');
      });
    });

    describe('TTS Integration', () => {
      it('should trigger TTS synthesis on successful response', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        const mockResponse: ChatResponse = {
          message: 'Hello! How can I help you?',
          agentId: 'agent-1',
          timestamp: new Date().toISOString(),
        };
        vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue({
          success: true,
          data: mockResponse,
        });

        const mockTTSService = {
          synthesizeSpeech: vi.fn().mockResolvedValue(undefined),
        };

        const mockAgent: Agent = {
          id: 'agent-1',
          name: 'Assistant',
          voice: 'en-US-JennyNeural',
          language: 'en-US',
        };

        const { result } = renderHook(() => useSendMessage(), { wrapper });

        act(() => {
          result.current.mutate({
            agentId: 'agent-1',
            message: 'Hello',
            ttsService: mockTTSService,
            selectedAgent: mockAgent,
          });
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        // TTS should be triggered with correct parameters
        expect(mockTTSService.synthesizeSpeech).toHaveBeenCalledWith(
          'Hello! How can I help you?',
          'en-US-JennyNeural',
          'en-US'
        );
      });

      it('should not trigger TTS if service not provided', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue({
          success: true,
          data: {
            message: 'Response',
            agentId: 'agent-1',
            timestamp: new Date().toISOString(),
          },
        });

        const { result } = renderHook(() => useSendMessage(), { wrapper });

        act(() => {
          result.current.mutate({
            agentId: 'agent-1',
            message: 'Hello',
            // No ttsService provided
          });
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        // Should complete successfully without TTS
        expect(result.current.isSuccess).toBe(true);
      });

      it('should handle TTS synthesis failure gracefully', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue({
          success: true,
          data: {
            message: 'Response',
            agentId: 'agent-1',
            timestamp: new Date().toISOString(),
          },
        });

        const mockTTSService = {
          synthesizeSpeech: vi.fn().mockRejectedValue(new Error('TTS failed')),
        };

        const mockAgent: Agent = {
          id: 'agent-1',
          name: 'Assistant',
          voice: 'en-US-JennyNeural',
          language: 'en-US',
        };

        const { result } = renderHook(() => useSendMessage(), { wrapper });

        act(() => {
          result.current.mutate({
            agentId: 'agent-1',
            message: 'Hello',
            ttsService: mockTTSService,
            selectedAgent: mockAgent,
          });
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        // Mutation should still succeed even if TTS fails
        expect(result.current.isSuccess).toBe(true);

        // Agent message should still be added
        const messages = useAppStore.getState().messages;
        expect(messages.some((m) => m.role === 'agent')).toBe(true);
      });
    });

    describe('Error Handling', () => {
      it('should handle network errors in mutation', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        const networkError: Result<ChatResponse, ApiError> = {
          success: false,
          error: {
            type: 'NETWORK_ERROR',
            message: 'Failed to connect to server',
          },
        };
        vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue(networkError);

        const { result } = renderHook(() => useSendMessage(), { wrapper });

        act(() => {
          result.current.mutate({
            agentId: 'agent-1',
            message: 'Hello',
          });
        });

        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        });

        expect(result.current.error).toBeTruthy();
        expect((result.current.error as Error).message).toContain('Unable to connect to the server');
      });

      it('should handle timeout errors in mutation', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        const timeoutError: Result<ChatResponse, ApiError> = {
          success: false,
          error: {
            type: 'TIMEOUT',
            duration: 30000,
          },
        };
        vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue(timeoutError);

        const { result } = renderHook(() => useSendMessage(), { wrapper });

        act(() => {
          result.current.mutate({
            agentId: 'agent-1',
            message: 'Hello',
          });
        });

        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        });

        expect(result.current.error).toBeTruthy();
        expect((result.current.error as Error).message).toContain('timed out');
      });

      it('should handle server errors in mutation', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        const serverError: Result<ChatResponse, ApiError> = {
          success: false,
          error: {
            type: 'SERVER_ERROR',
            status: 500,
            details: 'Internal server error',
          },
        };
        vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue(serverError);

        const { result } = renderHook(() => useSendMessage(), { wrapper });

        act(() => {
          result.current.mutate({
            agentId: 'agent-1',
            message: 'Hello',
          });
        });

        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        });

        expect(result.current.error).toBeTruthy();
        expect((result.current.error as Error).message).toContain('server encountered an error');
      });

      it('should allow retry after error', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        const networkError: Result<ChatResponse, ApiError> = {
          success: false,
          error: {
            type: 'NETWORK_ERROR',
            message: 'Failed to connect',
          },
        };

        // First call fails, second succeeds
        vi.mocked(BrainApiRepository.prototype.sendMessage)
          .mockResolvedValueOnce(networkError)
          .mockResolvedValueOnce({
            success: true,
            data: {
              message: 'Success response',
              agentId: 'agent-1',
              timestamp: new Date().toISOString(),
            },
          });

        const { result } = renderHook(() => useSendMessage(), { wrapper });

        // First attempt - fails
        act(() => {
          result.current.mutate({
            agentId: 'agent-1',
            message: 'Hello',
          });
        });

        await waitFor(() => {
          expect(result.current.isError).toBe(true);
        });

        // Retry - succeeds
        act(() => {
          result.current.mutate({
            agentId: 'agent-1',
            message: 'Hello',
          });
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.message).toBe('Success response');
      });
    });

    describe('Message History Management', () => {
      it('should add agent response to conversation history', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue({
          success: true,
          data: {
            message: 'Agent response',
            agentId: 'agent-1',
            timestamp: new Date().toISOString(),
          },
        });

        const { result } = renderHook(() => useSendMessage(), { wrapper });

        act(() => {
          result.current.mutate({
            agentId: 'agent-1',
            message: 'User message',
          });
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        const messages = useAppStore.getState().messages;
        expect(messages).toHaveLength(2);

        // Find messages by role (messages are sorted chronologically)
        const userMessage = messages.find((m) => m.role === 'user');
        const agentMessage = messages.find((m) => m.role === 'agent');

        expect(userMessage).toBeDefined();
        expect(userMessage!.content).toBe('User message');
        expect(agentMessage).toBeDefined();
        expect(agentMessage!.content).toBe('Agent response');
      });

      it('should maintain message order across multiple mutations', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        vi.mocked(BrainApiRepository.prototype.sendMessage)
          .mockResolvedValueOnce({
            success: true,
            data: {
              message: 'First response',
              agentId: 'agent-1',
              timestamp: new Date().toISOString(),
            },
          })
          .mockResolvedValueOnce({
            success: true,
            data: {
              message: 'Second response',
              agentId: 'agent-1',
              timestamp: new Date().toISOString(),
            },
          });

        const { result } = renderHook(() => useSendMessage(), { wrapper });

        // First message
        act(() => {
          result.current.mutate({
            agentId: 'agent-1',
            message: 'First message',
          });
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        // Second message
        act(() => {
          result.current.mutate({
            agentId: 'agent-1',
            message: 'Second message',
          });
        });

        await waitFor(() => {
          const messages = useAppStore.getState().messages;
          return messages.length === 4;
        });

        const messages = useAppStore.getState().messages;

        // Messages should be in chronological order
        // Verify all messages are present
        const contents = messages.map((m) => m.content);
        expect(contents).toContain('First message');
        expect(contents).toContain('First response');
        expect(contents).toContain('Second message');
        expect(contents).toContain('Second response');

        // Verify chronological ordering
        for (let i = 1; i < messages.length; i++) {
          expect(messages[i].timestamp.getTime()).toBeGreaterThanOrEqual(
            messages[i - 1].timestamp.getTime()
          );
        }
      });

      it('should preserve timestamps in messages', async () => {
        const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
        const responseTimestamp = new Date('2024-01-15T10:00:00Z');
        vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue({
          success: true,
          data: {
            message: 'Response',
            agentId: 'agent-1',
            timestamp: responseTimestamp.toISOString(),
          },
        });

        const { result } = renderHook(() => useSendMessage(), { wrapper });

        act(() => {
          result.current.mutate({
            agentId: 'agent-1',
            message: 'Hello',
          });
        });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        const messages = useAppStore.getState().messages;
        expect(messages).toHaveLength(2);

        // Find agent message by role
        const agentMessage = messages.find((m) => m.role === 'agent');
        expect(agentMessage).toBeDefined();
        expect(agentMessage!.timestamp).toBeInstanceOf(Date);
        expect(agentMessage!.timestamp.toISOString()).toBe(responseTimestamp.toISOString());

        // User message should also have a valid timestamp
        const userMessage = messages.find((m) => m.role === 'user');
        expect(userMessage).toBeDefined();
        expect(userMessage!.timestamp).toBeInstanceOf(Date);
      });
    });
  });

  describe('Integration Between Hooks', () => {
    it('should work together: fetch agents then send message', async () => {
      const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
      vi.mocked(BrainApiRepository.prototype.getAgents).mockResolvedValue({
        success: true,
        data: mockAgents,
      });
      vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue({
        success: true,
        data: {
          message: 'Hello!',
          agentId: 'agent-1',
          timestamp: new Date().toISOString(),
        },
      });

      // Fetch agents
      const { result: agentsResult } = renderHook(() => useAgents(), { wrapper });

      await waitFor(() => {
        expect(agentsResult.current.isSuccess).toBe(true);
      });

      const selectedAgent = agentsResult.current.data?.[0];
      expect(selectedAgent).toBeDefined();

      // Send message with selected agent
      const { result: sendResult } = renderHook(() => useSendMessage(), { wrapper });

      act(() => {
        sendResult.current.mutate({
          agentId: selectedAgent!.id,
          message: 'Hello',
          selectedAgent,
        });
      });

      await waitFor(() => {
        expect(sendResult.current.isSuccess).toBe(true);
      });

      expect(sendResult.current.data?.agentId).toBe(selectedAgent!.id);
    });
  });
});
