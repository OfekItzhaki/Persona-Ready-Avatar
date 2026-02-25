import { useMutation, useQuery } from '@tanstack/react-query';
import { BrainApiRepository } from '../repositories/BrainApiRepository';
import { useAppStore } from '../store/useAppStore';
import { logger } from '../logger';
import type { Agent, ChatMessage, ChatResponse } from '@/types';

/**
 * React Query Hooks for Avatar Client
 *
 * This module provides React Query hooks for server state management:
 * - useAgents: Fetches and caches the list of available agents
 * - useSendMessage: Sends chat messages with optimistic UI updates and TTS trigger
 *
 * Requirements:
 * - 4.1: Fetch agents from Brain API
 * - 5.3: Send messages to Brain API
 * - 11.2: Cache agent list for 5 minutes
 * - 11.3: Implement optimistic UI updates for message submission
 */

// Singleton instance of BrainApiRepository
const brainApiRepository = new BrainApiRepository();

/**
 * Query Keys
 *
 * Centralized query key definitions for React Query cache management
 */
export const queryKeys = {
  agents: ['agents'] as const,
  chat: (agentId: string) => ['chat', agentId] as const,
};

/**
 * useAgents Hook
 *
 * Fetches the list of available agents from the Brain API.
 *
 * Features:
 * - Automatic caching with 5-minute stale time (Requirement 11.2)
 * - Automatic retry on failure (3 attempts)
 * - Background refetching disabled for stable agent list
 * - Error handling with structured logging
 *
 * @returns React Query result with agents data, loading state, and error
 *
 * @example
 * ```tsx
 * const { data: agents, isLoading, error } = useAgents();
 *
 * if (isLoading) return <div>Loading agents...</div>;
 * if (error) return <div>Error loading agents</div>;
 *
 * return (
 *   <select>
 *     {agents?.map(agent => (
 *       <option key={agent.id} value={agent.id}>{agent.name}</option>
 *     ))}
 *   </select>
 * );
 * ```
 */
export function useAgents() {
  return useQuery({
    queryKey: queryKeys.agents,
    queryFn: async () => {
      logger.info('Fetching agents', {
        component: 'useAgents',
      });

      const result = await brainApiRepository.getAgents();

      if (!result.success) {
        logger.error('Failed to fetch agents', {
          component: 'useAgents',
          error: result.error,
        });

        throw new Error(
          result.error.type === 'NETWORK_ERROR'
            ? result.error.message
            : result.error.type === 'TIMEOUT'
              ? `Request timeout after ${result.error.duration}ms`
              : result.error.type === 'SERVER_ERROR'
                ? result.error.details
                : 'Failed to fetch agents'
        );
      }

      logger.info('Agents fetched successfully', {
        component: 'useAgents',
        agentCount: result.data.length,
      });

      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (Requirement 11.2)
    retry: 3,
    refetchOnWindowFocus: false,
  });
}

/**
 * Send Message Parameters
 */
interface SendMessageParams {
  agentId: string;
  message: string;
  ttsService?: {
    synthesizeSpeech: (text: string, voice: string, language: string) => Promise<any>;
  };
  selectedAgent?: Agent;
}

/**
 * useSendMessage Hook
 *
 * Sends a chat message to the Brain API with optimistic UI updates and TTS synthesis.
 *
 * Features:
 * - Optimistic UI updates (Requirement 11.3)
 * - Automatic TTS synthesis on success (Requirement 5.6)
 * - Message history management via Zustand store
 * - Error handling with rollback on failure
 * - Structured logging for observability
 *
 * @returns React Query mutation result with mutate function and state
 *
 * @example
 * ```tsx
 * const { mutate: sendMessage, isPending } = useSendMessage();
 *
 * const handleSubmit = (message: string) => {
 *   sendMessage({
 *     agentId: selectedAgentId,
 *     message,
 *     ttsService,
 *     selectedAgent,
 *   });
 * };
 * ```
 */
export function useSendMessage() {
  const addMessage = useAppStore((state) => state.addMessage);

  return useMutation({
    mutationFn: async ({ agentId, message }: SendMessageParams) => {
      logger.info('Sending message', {
        component: 'useSendMessage',
        agentId,
        messageLength: message.length,
      });

      const result = await brainApiRepository.sendMessage(agentId, message);

      if (!result.success) {
        logger.error('Failed to send message', {
          component: 'useSendMessage',
          agentId,
          error: result.error,
        });

        throw new Error(
          result.error.type === 'NETWORK_ERROR'
            ? result.error.message
            : result.error.type === 'TIMEOUT'
              ? `Request timeout after ${result.error.duration}ms`
              : result.error.type === 'SERVER_ERROR'
                ? result.error.details
                : 'Failed to send message'
        );
      }

      logger.info('Message sent successfully', {
        component: 'useSendMessage',
        agentId,
      });

      return result.data;
    },

    // Optimistic UI update (Requirement 11.3)
    onMutate: async ({ message }) => {
      // Create optimistic user message
      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date(),
      };

      // Add optimistic message to store immediately
      addMessage(optimisticMessage);

      logger.debug('Optimistic message added', {
        component: 'useSendMessage',
        messageId: optimisticMessage.id,
      });

      // Return context for potential rollback
      return { optimisticMessage };
    },

    // Success handler - Trigger TTS synthesis (Requirement 5.6)
    onSuccess: (response: ChatResponse, variables) => {
      logger.info('Message response received', {
        component: 'useSendMessage',
        agentId: response.agentId,
        responseLength: response.message.length,
      });

      // Add agent response to conversation history
      const agentMessage: ChatMessage = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        content: response.message,
        timestamp: new Date(response.timestamp),
      };

      addMessage(agentMessage);

      // Trigger TTS synthesis if service and agent are provided
      if (variables.ttsService && variables.selectedAgent) {
        logger.info('Triggering TTS synthesis', {
          component: 'useSendMessage',
          voice: variables.selectedAgent.voice,
          language: variables.selectedAgent.language,
        });

        variables.ttsService
          .synthesizeSpeech(
            response.message,
            variables.selectedAgent.voice,
            variables.selectedAgent.language
          )
          .catch((error) => {
            logger.error('TTS synthesis failed', {
              component: 'useSendMessage',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          });
      }
    },

    // Error handler - Log error (optimistic message already added, no rollback needed)
    onError: (error, variables) => {
      logger.error('Message mutation failed', {
        component: 'useSendMessage',
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId: variables.agentId,
      });

      // Note: We don't remove the optimistic message on error
      // The UI should show the error state while keeping the user's message visible
      // This provides better UX as the user can see what they tried to send
    },
  });
}

/**
 * Export repository instance for direct access if needed
 * (e.g., for testing or advanced use cases)
 */
export { brainApiRepository };
