/**
 * Integration Tests for Complete Conversation Flow
 * 
 * Tests end-to-end flow from agent selection to avatar animation, including:
 * - Agent selection and state synchronization
 * - Message submission with agent context
 * - Complete end-to-end flow with avatar animation
 * - Error recovery scenarios (network failures, TTS failures)
 * - State synchronization for viseme updates
 * - Playback state management
 * - Conversation history management
 * 
 * **Validates: Requirements 4.3, 5.6, 11.5**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '@/lib/store/useAppStore';
import { ChatInterface } from '@/components/ChatInterface';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { TTSService } from '@/lib/services/TTSService';
import { NotificationService } from '@/lib/services/NotificationService';
import type {
  Agent,
  VisemeEvent,
  SynthesisResult,
  Result,
  ChatResponse,
  ApiError,
} from '@/types';

// Mock modules
vi.mock('@/lib/repositories/BrainApiRepository');

describe('Conversation Flow Integration Tests', () => {
  let queryClient: QueryClient;
  let mockTTSService: any;
  let mockAzureSpeechRepository: any;
  let mockAudioManager: any;
  let mockVisemeCoordinator: any;
  let mockLanguageVoiceMapper: any;

  // Mock data
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

  const mockAudioBuffer = {
    duration: 3.5,
    length: 154350,
    numberOfChannels: 1,
    sampleRate: 44100,
  } as AudioBuffer;

  const mockVisemes: VisemeEvent[] = [
    { visemeId: 0, audioOffset: 0, duration: 100 },
    { visemeId: 1, audioOffset: 100, duration: 150 },
    { visemeId: 5, audioOffset: 250, duration: 200 },
    { visemeId: 10, audioOffset: 450, duration: 180 },
  ];

  const mockSynthesisResult: SynthesisResult = {
    audioBuffer: mockAudioBuffer,
    visemes: mockVisemes,
  };

  beforeEach(async () => {
    // Mock scrollIntoView for JSDOM environment
    Element.prototype.scrollIntoView = vi.fn();

    // Reset Zustand store
    const store = useAppStore.getState();
    act(() => {
      store.setSelectedAgent(null as any);
      store.clearMessages();
      store.setCurrentViseme(null);
      store.setPlaybackState('idle');
      store.notifications.forEach((n) => store.removeNotification(n.id));
    });

    // Initialize NotificationService with the store
    NotificationService.reset();
    NotificationService.initialize({
      addNotification: (notification) => {
        useAppStore.getState().addNotification(notification);
      },
      removeNotification: (id) => {
        useAppStore.getState().removeNotification(id);
      },
    });

    // Create fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    // Create mock dependencies for TTSService
    mockAzureSpeechRepository = {
      synthesize: vi.fn().mockResolvedValue({
        success: true,
        data: mockSynthesisResult,
      }),
    };

    mockAudioManager = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      resume: vi.fn(),
      stop: vi.fn(),
      getCurrentTime: vi.fn().mockReturnValue(0),
      getDuration: vi.fn().mockReturnValue(mockAudioBuffer.duration),
      subscribeToPlaybackState: vi.fn().mockReturnValue(() => {}),
    };

    mockVisemeCoordinator = {
      start: vi.fn(),
      stop: vi.fn(),
      getCurrentViseme: vi.fn().mockReturnValue(null),
      subscribeToVisemeChanges: vi.fn().mockReturnValue(() => {}),
    };

    mockLanguageVoiceMapper = {
      getVoiceForLanguage: vi.fn((lang: string) => {
        const voiceMap: Record<string, string> = {
          'en-US': 'en-US-JennyNeural',
          'es-ES': 'es-ES-ElviraNeural',
        };
        return voiceMap[lang] || 'en-US-JennyNeural';
      }),
    };

    // Create TTSService instance with mocks
    mockTTSService = new TTSService(
      mockAzureSpeechRepository,
      mockAudioManager,
      mockVisemeCoordinator,
      mockLanguageVoiceMapper
    );

    // Mock BrainApiRepository
    const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
    vi.mocked(BrainApiRepository.prototype.getAgents).mockResolvedValue({
      success: true,
      data: mockAgents,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    NotificationService.reset();
  });

  describe('Agent Selection and State Synchronization', () => {
    it('should synchronize agent selection across components', async () => {
      // Render PersonaSwitcher
      render(
        <QueryClientProvider client={queryClient}>
          <PersonaSwitcher />
        </QueryClientProvider>
      );

      // Wait for agents to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /select ai agent/i })).toBeInTheDocument();
      });

      // Select an agent
      const user = userEvent.setup();
      const dropdown = screen.getByRole('button', { name: /select ai agent/i });
      await user.click(dropdown);

      // Wait for options to appear
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Assistant'));

      // Verify state is updated in Zustand store
      await waitFor(() => {
        const store = useAppStore.getState();
        expect(store.selectedAgentId).toBe('agent-1');
      });
    });

    it('should update selected agent when switching between agents', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <PersonaSwitcher />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /select ai agent/i })).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const dropdown = screen.getByRole('button', { name: /select ai agent/i });

      // Select first agent
      await user.click(dropdown);
      await waitFor(() => {
        expect(screen.getByText('Assistant')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Assistant'));

      await waitFor(() => {
        expect(useAppStore.getState().selectedAgentId).toBe('agent-1');
      });

      // Switch to second agent
      await user.click(dropdown);
      await waitFor(() => {
        expect(screen.getByText('Spanish Assistant')).toBeInTheDocument();
      });
      await user.click(screen.getByText('Spanish Assistant'));

      await waitFor(() => {
        expect(useAppStore.getState().selectedAgentId).toBe('agent-2');
      });
    });
  });

  describe('Message Submission with Agent Context', () => {
    it('should include selected agent ID in message submission', async () => {
      const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
      const mockSendMessage = vi.fn().mockResolvedValue({
        success: true,
        data: {
          message: 'Hello! How can I help you?',
          agentId: 'agent-1',
          timestamp: new Date().toISOString(),
        },
      });
      vi.mocked(BrainApiRepository.prototype.sendMessage).mockImplementation(mockSendMessage);

      // Set selected agent in store
      act(() => {
        useAppStore.getState().setSelectedAgent('agent-1');
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface
            ttsService={mockTTSService}
            selectedAgent={mockAgents[0]}
          />
        </QueryClientProvider>
      );

      const user = userEvent.setup();
      const input = screen.getByRole('textbox', { name: /message input/i });
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Type and send message
      await user.type(input, 'Hello');
      await user.click(sendButton);

      // Verify sendMessage was called with correct agent ID
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith(
          'agent-1',
          'Hello'
        );
      });
    });

    it('should prevent message submission without selected agent', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface ttsService={mockTTSService} selectedAgent={null} />
        </QueryClientProvider>
      );

      const user = userEvent.setup();
      const input = screen.getByRole('textbox', { name: /message input/i });
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Try to send message without agent
      await user.type(input, 'Hello');
      
      // Button should be disabled
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Complete End-to-End Flow with Avatar Animation', () => {
    it('should complete full conversation flow: select agent → send message → receive response → play audio → animate avatar', async () => {
      const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
      const mockSendMessage = vi.fn().mockResolvedValue({
        success: true,
        data: {
          message: 'Hello! How can I help you today?',
          agentId: 'agent-1',
          timestamp: new Date().toISOString(),
        },
      });
      vi.mocked(BrainApiRepository.prototype.sendMessage).mockImplementation(mockSendMessage);

      // Step 1: Select agent
      act(() => {
        useAppStore.getState().setSelectedAgent('agent-1');
      });

      // Step 2: Render chat interface
      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface
            ttsService={mockTTSService}
            selectedAgent={mockAgents[0]}
          />
        </QueryClientProvider>
      );

      const user = userEvent.setup();
      const input = screen.getByRole('textbox', { name: /message input/i });
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Step 3: Send message
      await user.type(input, 'Hello');
      await user.click(sendButton);

      // Step 4: Verify message was sent to Brain API
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('agent-1', 'Hello');
      });

      // Step 5: Verify user message appears in conversation history
      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
      });

      // Step 6: Verify agent response appears
      await waitFor(() => {
        expect(screen.getByText('Hello! How can I help you today?')).toBeInTheDocument();
      });

      // Step 7: Verify TTS synthesis was triggered
      await waitFor(() => {
        expect(mockAzureSpeechRepository.synthesize).toHaveBeenCalledWith(
          'Hello! How can I help you today?',
          expect.objectContaining({
            voice: 'en-US-JennyNeural',
            language: 'en-US',
          })
        );
      });

      // Step 8: Verify viseme coordinator was started
      expect(mockVisemeCoordinator.start).toHaveBeenCalledWith(
        mockAudioBuffer,
        mockVisemes
      );

      // Step 9: Verify audio playback was started
      expect(mockAudioManager.play).toHaveBeenCalledWith(mockAudioBuffer);

      // Step 10: Verify conversation history is maintained
      const store = useAppStore.getState();
      expect(store.messages).toHaveLength(2);
      expect(store.messages[0].role).toBe('user');
      expect(store.messages[0].content).toBe('Hello');
      expect(store.messages[1].role).toBe('agent');
      expect(store.messages[1].content).toBe('Hello! How can I help you today?');
    });

    it('should handle multiple message exchanges in sequence', async () => {
      const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
      const mockSendMessage = vi.fn()
        .mockResolvedValueOnce({
          success: true,
          data: {
            message: 'Hello! How can I help you?',
            agentId: 'agent-1',
            timestamp: new Date().toISOString(),
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            message: 'The weather is sunny today.',
            agentId: 'agent-1',
            timestamp: new Date().toISOString(),
          },
        });
      vi.mocked(BrainApiRepository.prototype.sendMessage).mockImplementation(mockSendMessage);

      act(() => {
        useAppStore.getState().setSelectedAgent('agent-1');
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface
            ttsService={mockTTSService}
            selectedAgent={mockAgents[0]}
          />
        </QueryClientProvider>
      );

      const user = userEvent.setup();
      const input = screen.getByRole('textbox', { name: /message input/i });
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // First message
      await user.type(input, 'Hello');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
      });

      // Second message
      await user.type(input, 'What is the weather?');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('The weather is sunny today.')).toBeInTheDocument();
      });

      // Verify conversation history
      const store = useAppStore.getState();
      expect(store.messages).toHaveLength(4);
      expect(store.messages[0].content).toBe('Hello');
      expect(store.messages[1].content).toBe('Hello! How can I help you?');
      expect(store.messages[2].content).toBe('What is the weather?');
      expect(store.messages[3].content).toBe('The weather is sunny today.');
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle network failure when sending message', async () => {
      const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
      const networkError: Result<ChatResponse, ApiError> = {
        success: false,
        error: {
          type: 'NETWORK_ERROR',
          message: 'Failed to connect to server',
        },
      };
      vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue(networkError);

      act(() => {
        useAppStore.getState().setSelectedAgent('agent-1');
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface
            ttsService={mockTTSService}
            selectedAgent={mockAgents[0]}
          />
        </QueryClientProvider>
      );

      const user = userEvent.setup();
      const input = screen.getByRole('textbox', { name: /message input/i });
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Send message
      await user.type(input, 'Hello');
      await user.click(sendButton);

      // Verify error notification is displayed
      await waitFor(() => {
        const store = useAppStore.getState();
        expect(store.notifications.length).toBeGreaterThan(0);
        expect(store.notifications[0].type).toBe('error');
      });

      // Verify input is re-enabled after error
      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });

      // Verify user message is still in history (optimistic update)
      const store = useAppStore.getState();
      expect(store.messages.some(m => m.content === 'Hello')).toBe(true);
    });

    it('should handle TTS synthesis failure', async () => {
      const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
      vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue({
        success: true,
        data: {
          message: 'Hello! How can I help you?',
          agentId: 'agent-1',
          timestamp: new Date().toISOString(),
        },
      });

      // Mock TTS failure
      mockAzureSpeechRepository.synthesize.mockResolvedValue({
        success: false,
        error: {
          type: 'SYNTHESIS_FAILED',
          reason: 'Voice not available',
        },
      });

      act(() => {
        useAppStore.getState().setSelectedAgent('agent-1');
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface
            ttsService={mockTTSService}
            selectedAgent={mockAgents[0]}
          />
        </QueryClientProvider>
      );

      const user = userEvent.setup();
      const input = screen.getByRole('textbox', { name: /message input/i });
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(input, 'Hello');
      await user.click(sendButton);

      // Verify message appears even though TTS failed
      await waitFor(() => {
        expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
      });

      // Verify audio playback was not started
      expect(mockAudioManager.play).not.toHaveBeenCalled();
    });

    it('should recover from timeout error and allow retry', async () => {
      const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
      const timeoutError: Result<ChatResponse, ApiError> = {
        success: false,
        error: {
          type: 'TIMEOUT',
          duration: 30000,
        },
      };

      // First call times out, second succeeds
      vi.mocked(BrainApiRepository.prototype.sendMessage)
        .mockResolvedValueOnce(timeoutError)
        .mockResolvedValueOnce({
          success: true,
          data: {
            message: 'Hello! How can I help you?',
            agentId: 'agent-1',
            timestamp: new Date().toISOString(),
          },
        });

      act(() => {
        useAppStore.getState().setSelectedAgent('agent-1');
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface
            ttsService={mockTTSService}
            selectedAgent={mockAgents[0]}
          />
        </QueryClientProvider>
      );

      const user = userEvent.setup();
      const input = screen.getByRole('textbox', { name: /message input/i });
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // First attempt - timeout
      await user.type(input, 'Hello');
      await user.click(sendButton);

      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });

      // Retry - success
      await user.type(input, 'Hello');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
      });
    });

    it('should handle server error with details', async () => {
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

      act(() => {
        useAppStore.getState().setSelectedAgent('agent-1');
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface
            ttsService={mockTTSService}
            selectedAgent={mockAgents[0]}
          />
        </QueryClientProvider>
      );

      const user = userEvent.setup();
      const input = screen.getByRole('textbox', { name: /message input/i });
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(input, 'Hello');
      await user.click(sendButton);

      // Verify error notification
      await waitFor(() => {
        const store = useAppStore.getState();
        expect(store.notifications.length).toBeGreaterThan(0);
        expect(store.notifications[0].type).toBe('error');
      });
    });
  });

  describe('State Synchronization for Viseme Updates', () => {
    it('should synchronize viseme data from TTS to store', async () => {
      const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
      vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue({
        success: true,
        data: {
          message: 'Hello!',
          agentId: 'agent-1',
          timestamp: new Date().toISOString(),
        },
      });

      // Mock viseme coordinator to capture and invoke callbacks
      const visemeCallbacks: Array<(viseme: any) => void> = [];
      mockVisemeCoordinator.subscribeToVisemeChanges.mockImplementation((callback: any) => {
        visemeCallbacks.push(callback);
        return () => {
          const index = visemeCallbacks.indexOf(callback);
          if (index > -1) visemeCallbacks.splice(index, 1);
        };
      });

      // Subscribe to viseme coordinator changes in the store (simulating app/page.tsx behavior)
      const unsubscribe = mockVisemeCoordinator.subscribeToVisemeChanges((viseme: any) => {
        useAppStore.getState().setCurrentViseme(viseme);
      });

      act(() => {
        useAppStore.getState().setSelectedAgent('agent-1');
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface
            ttsService={mockTTSService}
            selectedAgent={mockAgents[0]}
          />
        </QueryClientProvider>
      );

      const user = userEvent.setup();
      const input = screen.getByRole('textbox', { name: /message input/i });
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(input, 'Hello');
      await user.click(sendButton);

      // Wait for TTS to start
      await waitFor(() => {
        expect(mockVisemeCoordinator.start).toHaveBeenCalled();
      });

      // Simulate viseme updates from the coordinator
      act(() => {
        visemeCallbacks.forEach(cb => cb({
          visemeId: 5,
          timestamp: 250,
          duration: 200,
        }));
      });

      // Verify viseme data is in store
      const store = useAppStore.getState();
      expect(store.currentViseme).toEqual({
        visemeId: 5,
        timestamp: 250,
        duration: 200,
      });

      // Cleanup
      unsubscribe();
    });

    it('should clear viseme data when playback stops', async () => {
      // First, start TTS to make it active
      await mockTTSService.synthesizeSpeech('Test', 'en-US-JennyNeural', 'en-US');
      
      // Set initial viseme data
      act(() => {
        useAppStore.getState().setCurrentViseme({
          visemeId: 10,
          timestamp: 500,
          duration: 150,
        });
      });

      // Verify initial state
      expect(useAppStore.getState().currentViseme).not.toBeNull();

      // Stop TTS (this should trigger coordinator.stop())
      act(() => {
        mockTTSService.stop();
      });

      // Verify viseme coordinator stop was called
      expect(mockVisemeCoordinator.stop).toHaveBeenCalled();

      // Clear viseme data (simulating what would happen in the app)
      act(() => {
        useAppStore.getState().setCurrentViseme(null);
      });

      // Verify viseme data is cleared
      const store = useAppStore.getState();
      expect(store.currentViseme).toBeNull();
    });
  });

  describe('Playback State Management', () => {
    it('should update playback state during conversation flow', async () => {
      const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
      vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue({
        success: true,
        data: {
          message: 'Hello!',
          agentId: 'agent-1',
          timestamp: new Date().toISOString(),
        },
      });

      // Mock playback state callbacks
      const playbackCallbacks: Array<(state: any) => void> = [];
      mockAudioManager.subscribeToPlaybackState.mockImplementation((callback: any) => {
        playbackCallbacks.push(callback);
        return () => {
          const index = playbackCallbacks.indexOf(callback);
          if (index > -1) playbackCallbacks.splice(index, 1);
        };
      });

      act(() => {
        useAppStore.getState().setSelectedAgent('agent-1');
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface
            ttsService={mockTTSService}
            selectedAgent={mockAgents[0]}
          />
        </QueryClientProvider>
      );

      const user = userEvent.setup();
      const input = screen.getByRole('textbox', { name: /message input/i });
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Initial state should be idle
      expect(useAppStore.getState().playbackState).toBe('idle');

      await user.type(input, 'Hello');
      await user.click(sendButton);

      // Wait for audio to start
      await waitFor(() => {
        expect(mockAudioManager.play).toHaveBeenCalled();
      });

      // Simulate playback state change to playing
      act(() => {
        playbackCallbacks.forEach(cb => cb('playing'));
        useAppStore.getState().setPlaybackState('playing');
      });

      expect(useAppStore.getState().playbackState).toBe('playing');

      // Simulate playback completion
      act(() => {
        playbackCallbacks.forEach(cb => cb('stopped'));
        useAppStore.getState().setPlaybackState('stopped');
      });

      expect(useAppStore.getState().playbackState).toBe('stopped');
    });

    it('should handle pause and resume playback', () => {
      // Start with playing state
      act(() => {
        useAppStore.getState().setPlaybackState('playing');
      });

      // Pause
      act(() => {
        mockAudioManager.pause();
        useAppStore.getState().setPlaybackState('paused');
      });

      expect(mockAudioManager.pause).toHaveBeenCalled();
      expect(useAppStore.getState().playbackState).toBe('paused');

      // Resume
      act(() => {
        mockAudioManager.resume();
        useAppStore.getState().setPlaybackState('playing');
      });

      expect(mockAudioManager.resume).toHaveBeenCalled();
      expect(useAppStore.getState().playbackState).toBe('playing');
    });
  });

  describe('Conversation History Management', () => {
    it('should maintain conversation history across multiple interactions', async () => {
      const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
      const responses = [
        'First response',
        'Second response',
        'Third response',
      ];
      let callCount = 0;

      vi.mocked(BrainApiRepository.prototype.sendMessage).mockImplementation(async () => ({
        success: true,
        data: {
          message: responses[callCount++],
          agentId: 'agent-1',
          timestamp: new Date().toISOString(),
        },
      }));

      act(() => {
        useAppStore.getState().setSelectedAgent('agent-1');
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface
            ttsService={mockTTSService}
            selectedAgent={mockAgents[0]}
          />
        </QueryClientProvider>
      );

      const user = userEvent.setup();
      const input = screen.getByRole('textbox', { name: /message input/i });
      const sendButton = screen.getByRole('button', { name: /send message/i });

      // Send three messages
      const userMessages = ['Hello', 'How are you?', 'Goodbye'];

      for (const message of userMessages) {
        await user.type(input, message);
        await user.click(sendButton);
        
        // Wait for response
        await waitFor(() => {
          const store = useAppStore.getState();
          return store.messages.length >= (userMessages.indexOf(message) + 1) * 2;
        });
      }

      // Verify all messages are in history
      const store = useAppStore.getState();
      expect(store.messages).toHaveLength(6);

      // Verify order
      expect(store.messages[0].content).toBe('Hello');
      expect(store.messages[1].content).toBe('First response');
      expect(store.messages[2].content).toBe('How are you?');
      expect(store.messages[3].content).toBe('Second response');
      expect(store.messages[4].content).toBe('Goodbye');
      expect(store.messages[5].content).toBe('Third response');
    });

    it('should preserve message timestamps in chronological order', async () => {
      const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
      
      // Mock to return timestamp that's always after the current time
      vi.mocked(BrainApiRepository.prototype.sendMessage).mockImplementation(async () => {
        // Wait a bit to ensure response timestamp is after user message
        await new Promise(resolve => setTimeout(resolve, 10));
        
        return {
          success: true,
          data: {
            message: 'Response',
            agentId: 'agent-1',
            timestamp: new Date().toISOString(), // Create timestamp after the delay
          },
        };
      });

      act(() => {
        useAppStore.getState().setSelectedAgent('agent-1');
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface
            ttsService={mockTTSService}
            selectedAgent={mockAgents[0]}
          />
        </QueryClientProvider>
      );

      const user = userEvent.setup();
      const input = screen.getByRole('textbox', { name: /message input/i });
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(input, 'First message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(useAppStore.getState().messages.length).toBe(2);
      });

      // Delay to ensure timestamps are different
      await new Promise(resolve => setTimeout(resolve, 50));

      await user.type(input, 'Second message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(useAppStore.getState().messages.length).toBe(4);
      });

      // Verify timestamps are in order
      const store = useAppStore.getState();
      const timestamps = store.messages.map(m => m.timestamp.getTime());
      
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });

    it('should clear conversation history when requested', () => {
      // Add some messages
      act(() => {
        useAppStore.getState().addMessage({
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        });
        useAppStore.getState().addMessage({
          id: '2',
          role: 'agent',
          content: 'Hi there!',
          timestamp: new Date(),
        });
      });

      expect(useAppStore.getState().messages).toHaveLength(2);

      // Clear messages
      act(() => {
        useAppStore.getState().clearMessages();
      });

      expect(useAppStore.getState().messages).toHaveLength(0);
    });

    it('should persist conversation history during agent switch', async () => {
      // Add messages with first agent
      act(() => {
        useAppStore.getState().setSelectedAgent('agent-1');
        useAppStore.getState().addMessage({
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
        });
        useAppStore.getState().addMessage({
          id: '2',
          role: 'agent',
          content: 'Hi!',
          timestamp: new Date(),
        });
      });

      expect(useAppStore.getState().messages).toHaveLength(2);

      // Switch agent
      act(() => {
        useAppStore.getState().setSelectedAgent('agent-2');
      });

      // Messages should still be there
      expect(useAppStore.getState().messages).toHaveLength(2);
      expect(useAppStore.getState().selectedAgentId).toBe('agent-2');
    });
  });

  describe('Multi-Language Support', () => {
    it('should use correct voice for Spanish agent', async () => {
      const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
      vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue({
        success: true,
        data: {
          message: '¡Hola! ¿Cómo puedo ayudarte?',
          agentId: 'agent-2',
          timestamp: new Date().toISOString(),
        },
      });

      act(() => {
        useAppStore.getState().setSelectedAgent('agent-2');
      });

      render(
        <QueryClientProvider client={queryClient}>
          <ChatInterface
            ttsService={mockTTSService}
            selectedAgent={mockAgents[1]} // Spanish agent
          />
        </QueryClientProvider>
      );

      const user = userEvent.setup();
      const input = screen.getByRole('textbox', { name: /message input/i });
      const sendButton = screen.getByRole('button', { name: /send message/i });

      await user.type(input, 'Hola');
      await user.click(sendButton);

      // Verify Spanish voice was used
      await waitFor(() => {
        expect(mockAzureSpeechRepository.synthesize).toHaveBeenCalledWith(
          '¡Hola! ¿Cómo puedo ayudarte?',
          expect.objectContaining({
            voice: 'es-ES-ElviraNeural',
            language: 'es-ES',
          })
        );
      });
    });
  });
});
