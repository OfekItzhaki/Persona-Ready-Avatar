/**
 * Hooks Module
 *
 * Centralized exports for all custom React hooks used in the Avatar Client.
 *
 * Available hooks:
 * - useAgents: Fetch and cache available agents from Brain API
 * - useSendMessage: Send chat messages with optimistic updates and TTS trigger
 * - useOnlineStatus: Detect browser network connectivity status
 */

export { useAgents, useSendMessage, queryKeys, brainApiRepository } from './useReactQuery';
export { useOnlineStatus } from './useOnlineStatus';
