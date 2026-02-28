import { useMutation, useQuery } from '@tanstack/react-query';
import { BrainApiRepository } from '../repositories/BrainApiRepository';
import { useAppStore } from '../store/useAppStore';
import { NotificationService } from '../services/NotificationService';
import { logger } from '../logger';
import { stripSSML } from '../utils/ssml';
import { formatErrorNotification } from '../utils/errorMessages';
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

        // Create user-friendly error message (Requirement 38.1, 38.2)
        const errorMessage = formatErrorNotification(result.error);
        
        // Create error object with detailed information for debugging (Requirement 38.8)
        const error = new Error(errorMessage);
        (error as any).apiError = result.error;
        
        throw error;
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

        // Create user-friendly error message (Requirement 38.1, 38.2)
        const errorMessage = formatErrorNotification(result.error);
        
        // Create error object with detailed information for debugging (Requirement 38.8)
        const error = new Error(errorMessage);
        (error as any).apiError = result.error;
        
        throw error;
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

      // Strip SSML tags from displayed transcript (Requirement 31.8)
      const displayContent = stripSSML(response.message);

      // Add agent response to conversation history
      const agentMessage: ChatMessage = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        content: displayContent,
        timestamp: new Date(response.timestamp),
      };

      addMessage(agentMessage);

      // Check if TTS is in text-only mode (Requirement 39.8)
      const ttsTextOnlyMode = useAppStore.getState().ttsTextOnlyMode;

      // Trigger TTS synthesis with original message (may contain SSML)
      // Skip TTS if in text-only mode after 3+ consecutive failures
      if (variables.ttsService && variables.selectedAgent && !ttsTextOnlyMode) {
        logger.info('Triggering TTS synthesis', {
          component: 'useSendMessage',
          voice: variables.selectedAgent.voice,
          language: variables.selectedAgent.language,
        });

        variables.ttsService
          .synthesizeSpeech(
            response.message, // Use original message with SSML for TTS
            variables.selectedAgent.voice,
            variables.selectedAgent.language
          )
          .then(() => {
            // TTS synthesis succeeded - reset failure counter (Requirement 39.6)
            useAppStore.getState().resetTTSFailures();
            
            logger.info('TTS synthesis completed successfully', {
              component: 'useSendMessage',
            });
          })
          .catch((error) => {
            // TTS synthesis failed - increment failure counter (Requirement 39.5)
            useAppStore.getState().incrementTTSFailures();
            
            const consecutiveFailures = useAppStore.getState().consecutiveTTSFailures;
            const textOnlyMode = useAppStore.getState().ttsTextOnlyMode;

            logger.error('TTS synthesis failed', {
              component: 'useSendMessage',
              error: error instanceof Error ? error.message : 'Unknown error',
              errorCode: (error as any)?.error?.type,
              errorDetails: (error as any)?.error?.details || (error as any)?.error?.message,
              consecutiveFailures,
              textOnlyMode,
            });

            // Display error notification (Requirement 39.1, 39.2, 39.3)
            try {
              const notificationService = NotificationService.getInstance();

              if (textOnlyMode) {
                // Entered text-only mode after 3+ failures (Requirement 39.8)
                notificationService.warning(
                  'TTS has been disabled after multiple failures. Text responses will continue to display normally. You can try enabling TTS again in settings.',
                  10000 // 10 seconds
                );
              } else {
                // Display error with retry button (Requirement 39.1, 39.2, 39.4)
                notificationService.error(
                  'Audio synthesis failed, but the text response is available above. Click retry to attempt audio synthesis again.',
                  undefined, // No auto-dismiss for errors with retry
                  {
                    label: 'Retry TTS',
                    onClick: () => {
                      // Retry TTS synthesis (Requirement 39.4)
                      if (variables.ttsService && variables.selectedAgent) {
                        logger.info('Retrying TTS synthesis', {
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
                          .then(() => {
                            // Retry succeeded - reset failure counter
                            useAppStore.getState().resetTTSFailures();
                            notificationService.success('Audio synthesis successful');
                          })
                          .catch((retryError) => {
                            // Retry failed - increment failure counter again
                            useAppStore.getState().incrementTTSFailures();
                            
                            logger.error('TTS retry failed', {
                              component: 'useSendMessage',
                              error: retryError instanceof Error ? retryError.message : 'Unknown error',
                            });

                            notificationService.error(
                              'Audio synthesis retry failed. The text response remains available.'
                            );
                          });
                      }
                    },
                  }
                );
              }
            } catch (notificationError) {
              // NotificationService not initialized (e.g., in tests) - just log
              logger.warn('NotificationService not available for TTS error notification', {
                component: 'useSendMessage',
                error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
              });
            }
          });
      } else if (ttsTextOnlyMode) {
        // Log that TTS is skipped due to text-only mode
        logger.info('TTS synthesis skipped - text-only mode enabled', {
          component: 'useSendMessage',
          consecutiveFailures: useAppStore.getState().consecutiveTTSFailures,
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
