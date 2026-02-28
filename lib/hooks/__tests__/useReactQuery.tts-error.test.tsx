import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSendMessage } from '../useReactQuery';
import { useAppStore } from '../../store/useAppStore';
import { BrainApiRepository } from '../../repositories/BrainApiRepository';
import type { Agent } from '@/types';

/**
 * TTS Error Handling Tests (Requirement 39)
 * 
 * Tests for enhanced TTS error handling including:
 * - Error notification display
 * - Text display even when TTS fails
 * - Retry button functionality
 * - Consecutive failure tracking
 * - Text-only mode fallback after 3+ failures
 */

// Mock BrainApiRepository
vi.mock('../../repositories/BrainApiRepository');

// Mock NotificationService
vi.mock('../../services/NotificationService', () => ({
  NotificationService: {
    getInstance: vi.fn(() => ({
      error: vi.fn(),
      warning: vi.fn(),
      success: vi.fn(),
    })),
  },
}));

describe('TTS Error Handling (Requirement 39)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset store state
    useAppStore.setState({
      messages: [],
      consecutiveTTSFailures: 0,
      ttsTextOnlyMode: false,
    });

    // Mock successful Brain API response
    vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue({
      success: true,
      data: {
        agentId: 'agent-1',
        message: 'Hello! How can I help you?',
        timestamp: new Date().toISOString(),
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockAgent: Agent = {
    id: 'agent-1',
    name: 'Test Agent',
    voice: 'en-US-JennyNeural',
    language: 'en-US',
    description: 'Test agent',
  };

  it('should display agent response text even when TTS fails (Requirement 39.3)', async () => {
    const mockTTSService = {
      synthesizeSpeech: vi.fn().mockRejectedValue(new Error('TTS synthesis failed')),
    };

    const { result } = renderHook(() => useSendMessage(), { wrapper });

    // Send message
    result.current.mutate({
      agentId: 'agent-1',
      message: 'Hello',
      ttsService: mockTTSService,
      selectedAgent: mockAgent,
    });

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify agent message was added to store despite TTS failure
    const messages = useAppStore.getState().messages;
    const agentMessage = messages.find((m) => m.role === 'agent');
    
    expect(agentMessage).toBeDefined();
    expect(agentMessage?.content).toBe('Hello! How can I help you?');
  });

  it('should increment consecutive TTS failure counter on TTS error (Requirement 39.5)', async () => {
    const mockTTSService = {
      synthesizeSpeech: vi.fn().mockRejectedValue(new Error('TTS synthesis failed')),
    };

    const { result } = renderHook(() => useSendMessage(), { wrapper });

    // Initial failure count should be 0
    expect(useAppStore.getState().consecutiveTTSFailures).toBe(0);

    // Send message
    result.current.mutate({
      agentId: 'agent-1',
      message: 'Hello',
      ttsService: mockTTSService,
      selectedAgent: mockAgent,
    });

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Wait for TTS error handling
    await waitFor(() => {
      expect(useAppStore.getState().consecutiveTTSFailures).toBe(1);
    });
  });

  it('should reset TTS failure counter on successful TTS synthesis (Requirement 39.6)', async () => {
    // Set initial failure count
    useAppStore.setState({ consecutiveTTSFailures: 2 });

    const mockTTSService = {
      synthesizeSpeech: vi.fn().mockResolvedValue(undefined),
    };

    const { result } = renderHook(() => useSendMessage(), { wrapper });

    // Send message
    result.current.mutate({
      agentId: 'agent-1',
      message: 'Hello',
      ttsService: mockTTSService,
      selectedAgent: mockAgent,
    });

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Wait for TTS success handling
    await waitFor(() => {
      expect(useAppStore.getState().consecutiveTTSFailures).toBe(0);
    });
  });

  it('should enable text-only mode after 3 consecutive TTS failures (Requirement 39.8)', async () => {
    const mockTTSService = {
      synthesizeSpeech: vi.fn().mockRejectedValue(new Error('TTS synthesis failed')),
    };

    const { result } = renderHook(() => useSendMessage(), { wrapper });

    // Initial state
    expect(useAppStore.getState().ttsTextOnlyMode).toBe(false);

    // Simulate 3 consecutive failures
    for (let i = 0; i < 3; i++) {
      result.current.mutate({
        agentId: 'agent-1',
        message: `Hello ${i}`,
        ttsService: mockTTSService,
        selectedAgent: mockAgent,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Reset mutation state for next iteration
      result.current.reset();
    }

    // Wait for text-only mode to be enabled
    await waitFor(() => {
      expect(useAppStore.getState().ttsTextOnlyMode).toBe(true);
    });

    expect(useAppStore.getState().consecutiveTTSFailures).toBe(3);
  });

  it('should skip TTS synthesis when in text-only mode', async () => {
    // Enable text-only mode
    useAppStore.setState({ 
      consecutiveTTSFailures: 3,
      ttsTextOnlyMode: true,
    });

    const mockTTSService = {
      synthesizeSpeech: vi.fn().mockResolvedValue(undefined),
    };

    const { result } = renderHook(() => useSendMessage(), { wrapper });

    // Send message
    result.current.mutate({
      agentId: 'agent-1',
      message: 'Hello',
      ttsService: mockTTSService,
      selectedAgent: mockAgent,
    });

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // TTS should not be called when in text-only mode
    expect(mockTTSService.synthesizeSpeech).not.toHaveBeenCalled();

    // Agent message should still be displayed
    const messages = useAppStore.getState().messages;
    const agentMessage = messages.find((m) => m.role === 'agent');
    expect(agentMessage).toBeDefined();
  });

  it('should log TTS error details (Requirement 39.5)', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockTTSService = {
      synthesizeSpeech: vi.fn().mockRejectedValue(new Error('TTS synthesis failed')),
    };

    const { result } = renderHook(() => useSendMessage(), { wrapper });

    // Send message
    result.current.mutate({
      agentId: 'agent-1',
      message: 'Hello',
      ttsService: mockTTSService,
      selectedAgent: mockAgent,
    });

    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Wait for error logging
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });
});
