/**
 * ChatInterface Offline Queue Integration Tests
 * 
 * Tests for Task 18.3: Integrate offline queue with ChatInterface
 * 
 * Requirements:
 * - 33.1: Enqueue messages when offline
 * - 33.2: Display queued messages with pending indicator
 * - 33.3: Automatically process queue when online
 * - 33.4: Handle send failures with retry option
 * - 33.5: Show warning when queue limit reached
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatInterface } from '../ChatInterface';
import { useAppStore } from '@/lib/store/useAppStore';
import { OfflineQueueService } from '@/lib/services/OfflineQueueService';
import { LocalStorageRepository } from '@/lib/repositories/LocalStorageRepository';
import type { Agent } from '@/types';

// Mock dependencies
vi.mock('@/lib/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => false), // Start offline
}));

vi.mock('@/lib/services/NotificationService', () => ({
  NotificationService: {
    getInstance: () => ({
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    }),
  },
}));

describe('ChatInterface - Offline Queue Integration (Task 18.3)', () => {
  let queryClient: QueryClient;
  const mockAgent: Agent = {
    id: 'test-agent',
    name: 'Test Agent',
    voice: 'en-US-JennyNeural',
    language: 'en-US',
  };

  beforeEach(() => {
    // Reset Zustand store
    useAppStore.setState({
      messages: [],
      offlineQueue: [],
      selectedAgentId: mockAgent.id,
    });

    // Initialize OfflineQueueService with the store (not a snapshot)
    const repository = new LocalStorageRepository();
    OfflineQueueService.reset();
    OfflineQueueService.initialize(useAppStore.getState() as any, repository);

    // Create fresh QueryClient
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
  });

  describe('Requirement 33.1: Enqueue messages when offline', () => {
    it('should enqueue message when offline', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      // Find input and send button
      const input = screen.getByLabelText(/message input/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Type message and send
      await user.type(input, 'Test offline message');
      await user.click(sendButton);

      // Verify message was added to queue
      const state = useAppStore.getState();
      expect(state.offlineQueue.length).toBe(1);
      expect(state.offlineQueue[0].message).toBe('Test offline message');
      expect(state.offlineQueue[0].status).toBe('pending');
    });
  });

  describe('Requirement 33.2: Display queued messages with pending indicator', () => {
    it('should display queued message with pending indicator', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      // Find input and send button
      const input = screen.getByLabelText(/message input/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Type message and send
      await user.type(input, 'Test offline message');
      await user.click(sendButton);

      // Wait for message to appear
      await waitFor(() => {
        expect(screen.getByText('Test offline message')).toBeInTheDocument();
      });

      // Verify pending indicator is shown
      expect(screen.getByText(/\(pending\)/i)).toBeInTheDocument();
    });
  });

  describe('Requirement 33.5: Show warning when queue limit reached', () => {
    it('should show warning when queue approaches limit', () => {
      // Add 45 items to queue (90% of 50)
      const queueItems = Array.from({ length: 45 }, (_, i) => ({
        id: `queue-${i}`,
        agentId: mockAgent.id,
        message: `Message ${i}`,
        timestamp: new Date(),
        status: 'pending' as const,
        retryCount: 0,
      }));

      useAppStore.setState({
        offlineQueue: queueItems,
        selectedAgentId: mockAgent.id,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      // Verify warning is shown
      expect(screen.getByText(/message queue is nearly full/i)).toBeInTheDocument();
      expect(screen.getByText(/45\/50/)).toBeInTheDocument();
    });

    it('should not enqueue when queue is full', async () => {
      const user = userEvent.setup();

      // Fill queue to maximum (50 items)
      const queueItems = Array.from({ length: 50 }, (_, i) => ({
        id: `queue-${i}`,
        agentId: mockAgent.id,
        message: `Message ${i}`,
        timestamp: new Date(),
        status: 'pending' as const,
        retryCount: 0,
      }));

      useAppStore.setState({
        offlineQueue: queueItems,
        selectedAgentId: mockAgent.id,
      });

      // Reinitialize service to pick up new state
      const repository = new LocalStorageRepository();
      OfflineQueueService.reset();
      OfflineQueueService.initialize(useAppStore.getState() as any, repository);

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      // Find input and send button
      const input = screen.getByLabelText(/message input/i);
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Try to send message
      await user.type(input, 'This should not be queued');
      await user.click(sendButton);

      // Verify queue size didn't increase
      const state = useAppStore.getState();
      expect(state.offlineQueue.length).toBe(50);
    });
  });

  describe('Requirement 33.4: Handle send failures with retry option', () => {
    it('should show retry button when messages fail', () => {
      // Add failed message to queue
      useAppStore.setState({
        offlineQueue: [
          {
            id: 'failed-1',
            agentId: mockAgent.id,
            message: 'Failed message',
            timestamp: new Date(),
            status: 'failed',
            retryCount: 1,
          },
        ],
        selectedAgentId: mockAgent.id,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      // Verify retry button is shown
      expect(screen.getByRole('button', { name: /retry failed messages/i })).toBeInTheDocument();
      expect(screen.getByText(/some messages failed to send/i)).toBeInTheDocument();
    });

    it('should reset failed messages to pending when retry is clicked', async () => {
      const user = userEvent.setup();

      // Add failed message to queue
      useAppStore.setState({
        offlineQueue: [
          {
            id: 'failed-1',
            agentId: mockAgent.id,
            message: 'Failed message',
            timestamp: new Date(),
            status: 'failed',
            retryCount: 1,
          },
        ],
        selectedAgentId: mockAgent.id,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface selectedAgent={mockAgent} />
        </QueryClientProvider>
      );

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry failed messages/i });
      await user.click(retryButton);

      // Verify message status was reset to pending
      await waitFor(() => {
        const state = useAppStore.getState();
        expect(state.offlineQueue[0].status).toBe('pending');
      });
    });
  });
});
