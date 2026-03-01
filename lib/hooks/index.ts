/**
 * Hooks Module
 *
 * Centralized exports for all custom React hooks used in the Avatar Client.
 *
 * Available hooks:
 * - useAgents: Fetch and cache available agents from Brain API
 * - useSendMessage: Send chat messages with optimistic updates and TTS trigger
 * - useOnlineStatus: Detect browser network connectivity status
 * - useTheme: Theme management with design token system integration
 * - useFocusTrap: Trap focus within a container for accessibility
 */

export { useAgents, useSendMessage, queryKeys, brainApiRepository } from './useReactQuery';
export { useOnlineStatus } from './useOnlineStatus';
export { useTheme, applyTheme } from './useTheme';
export { useFocusTrap } from './useFocusTrap';
