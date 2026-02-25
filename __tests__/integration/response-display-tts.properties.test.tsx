/**
 * Property-Based Integration Tests for Response Display and TTS Trigger
 *
 * **Feature: avatar-client, Property 13: Response Display and TTS Trigger**
 *
 * For any response received from the Brain API, the response text should be
 * displayed in the conversation history and passed to the TTS Service for
 * speech synthesis.
 *
 * **Validates: Requirements 5.5, 5.6**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '@/lib/store/useAppStore';
import { ChatInterface } from '@/components/ChatInterface';
import { TTSService } from '@/lib/services/TTSService';
import { NotificationService } from '@/lib/services/NotificationService';
import type { Agent, SynthesisResult, VisemeEvent } from '@/types';

// Mock scrollIntoView which is not available in jsdom
Element.prototype.scrollIntoView = vi.fn();

// Mock modules
vi.mock('@/lib/repositories/BrainApiRepository');

// Arbitraries for generating test data
const agentArbitrary = fc.record({
  id: fc.string({ minLength: 8, maxLength: 36 }).filter(s => s.trim().length >= 8),
  name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
  description: fc.option(
    fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length >= 5),
    { nil: undefined }
  ),
  voice: fc.constantFrom(
    'en-US-JennyNeural',
    'en-US-GuyNeural',
    'es-ES-ElviraNeural',
    'fr-FR-DeniseNeural',
    'de-DE-KatjaNeural',
    'ja-JP-NanamiNeural',
    'zh-CN-XiaoxiaoNeural'
  ),
  language: fc.constantFrom('en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'),
});

// Filter out strings that start with special characters that userEvent interprets as keyboard commands
const userMessageArbitrary = fc.string({ minLength: 1, maxLength: 200 })
  .filter(s => s.trim().length > 0)
  .filter(s => !s.startsWith('[') && !s.startsWith('{'));

const agentResponseArbitrary = fc.string({ minLength: 1, maxLength: 500 })
  .filter(s => s.trim().length > 0);

describe('Property 13: Response Display and TTS Trigger', () => {
  let queryClient: QueryClient;
  let mockTTSService: any;
  let mockAzureSpeechRepository: any;
  let mockAudioManager: any;
  let mockVisemeCoordinator: any;
  let mockLanguageVoiceMapper: any;

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
  ];

  const mockSynthesisResult: SynthesisResult = {
    audioBuffer: mockAudioBuffer,
    visemes: mockVisemes,
  };

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

    // Initialize NotificationService
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
          'fr-FR': 'fr-FR-DeniseNeural',
          'de-DE': 'de-DE-KatjaNeural',
          'ja-JP': 'ja-JP-NanamiNeural',
          'zh-CN': 'zh-CN-XiaoxiaoNeural',
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

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    NotificationService.reset();
  });

  /**
   * Property: For any agent response text, the response should be displayed
   * in the conversation history
   */
  it('should display agent response in conversation history for any response text', async () => {
    await fc.assert(
      fc.asyncProperty(
        agentArbitrary,
        userMessageArbitrary,
        agentResponseArbitrary,
        async (agent: Agent, userMessage: string, agentResponse: string) => {
          // Arrange - Mock Brain API response
          const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
          vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue({
            success: true,
            data: {
              message: agentResponse,
              agentId: agent.id,
              timestamp: new Date().toISOString(),
            },
          });

          // Set selected agent in store
          act(() => {
            useAppStore.getState().setSelectedAgent(agent.id);
          });

          // Act - Render ChatInterface and send message
          const { container } = render(
            <QueryClientProvider client={queryClient}>
              <ChatInterface
                ttsService={mockTTSService}
                selectedAgent={agent}
              />
            </QueryClientProvider>
          );

          const user = userEvent.setup();
          const input = container.querySelector('input[type="text"]') as HTMLInputElement;
          const sendButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;

          await user.type(input, userMessage);
          await user.click(sendButton);

          // Assert - Property 1: Agent response should appear in conversation history
          await waitFor(() => {
            expect(container.textContent).toContain(agentResponse);
          }, { timeout: 5000 });

          // Property 2: Response should be in the messages store
          const store = useAppStore.getState();
          const agentMessages = store.messages.filter(m => m.role === 'agent');
          expect(agentMessages.length).toBeGreaterThan(0);
          expect(agentMessages[agentMessages.length - 1].content).toBe(agentResponse);

          // Property 3: Response should be displayed as an agent message (not user message)
          const messageElements = container.querySelectorAll('[role="article"]');
          const agentMessageElements = Array.from(messageElements).filter(el =>
            el.textContent?.includes(agentResponse)
          );
          expect(agentMessageElements.length).toBeGreaterThan(0);

          // Property 4: Agent message should have agent-specific styling
          const agentMessageElement = agentMessageElements[0];
          expect(agentMessageElement.className).toContain('bg-gray-200');
          expect(agentMessageElement.className).toContain('text-gray-900');
        }
      ),
      { numRuns: 20 }
    );
  }, 180000); // 3 minute timeout for 50 iterations

  /**
   * Property: For any agent response text, the response should trigger TTS synthesis
   */
  it('should trigger TTS synthesis for any agent response', async () => {
    await fc.assert(
      fc.asyncProperty(
        agentArbitrary,
        userMessageArbitrary,
        agentResponseArbitrary,
        async (agent: Agent, userMessage: string, agentResponse: string) => {
          // Arrange - Mock Brain API response
          const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
          vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue({
            success: true,
            data: {
              message: agentResponse,
              agentId: agent.id,
              timestamp: new Date().toISOString(),
            },
          });

          // Set selected agent in store
          act(() => {
            useAppStore.getState().setSelectedAgent(agent.id);
          });

          // Act - Render ChatInterface and send message
          const { container } = render(
            <QueryClientProvider client={queryClient}>
              <ChatInterface
                ttsService={mockTTSService}
                selectedAgent={agent}
              />
            </QueryClientProvider>
          );

          const user = userEvent.setup();
          const input = container.querySelector('input[type="text"]') as HTMLInputElement;
          const sendButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;

          await user.type(input, userMessage);
          await user.click(sendButton);

          // Assert - Property 1: TTS synthesis should be called
          await waitFor(() => {
            expect(mockAzureSpeechRepository.synthesize).toHaveBeenCalled();
          }, { timeout: 5000 });

          // Property 2: TTS should be called with the agent response text
          const synthesizeCalls = mockAzureSpeechRepository.synthesize.mock.calls;
          const lastCall = synthesizeCalls[synthesizeCalls.length - 1];
          expect(lastCall[0]).toBe(agentResponse);

          // Property 3: TTS should be called with the agent's voice
          // Note: TTSService uses LanguageVoiceMapper to select voice based on language
          const expectedVoice = mockLanguageVoiceMapper.getVoiceForLanguage(agent.language);
          expect(lastCall[1]).toMatchObject({
            voice: expectedVoice,
            language: agent.language,
          });

          // Property 4: Audio playback should be started
          await waitFor(() => {
            expect(mockAudioManager.play).toHaveBeenCalled();
          }, { timeout: 5000 });

          // Property 5: Viseme coordinator should be started
          expect(mockVisemeCoordinator.start).toHaveBeenCalledWith(
            mockAudioBuffer,
            mockVisemes
          );
        }
      ),
      { numRuns: 20 }
    );
  }, 180000); // 3 minute timeout for 50 iterations

  /**
   * Property: For any agent response, both display and TTS should occur
   * (combined property test)
   */
  it('should both display response and trigger TTS for any agent response', async () => {
    await fc.assert(
      fc.asyncProperty(
        agentArbitrary,
        userMessageArbitrary,
        agentResponseArbitrary,
        async (agent: Agent, userMessage: string, agentResponse: string) => {
          // Arrange - Mock Brain API response
          const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
          vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue({
            success: true,
            data: {
              message: agentResponse,
              agentId: agent.id,
              timestamp: new Date().toISOString(),
            },
          });

          // Set selected agent in store
          act(() => {
            useAppStore.getState().setSelectedAgent(agent.id);
          });

          // Act - Render ChatInterface and send message
          const { container } = render(
            <QueryClientProvider client={queryClient}>
              <ChatInterface
                ttsService={mockTTSService}
                selectedAgent={agent}
              />
            </QueryClientProvider>
          );

          const user = userEvent.setup();
          const input = container.querySelector('input[type="text"]') as HTMLInputElement;
          const sendButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;

          await user.type(input, userMessage);
          await user.click(sendButton);

          // Assert - Property 1: Response should be displayed
          await waitFor(() => {
            expect(container.textContent).toContain(agentResponse);
          }, { timeout: 5000 });

          // Property 2: TTS should be triggered
          await waitFor(() => {
            expect(mockAzureSpeechRepository.synthesize).toHaveBeenCalled();
          }, { timeout: 5000 });

          // Property 3: Both should happen with the same response text
          const store = useAppStore.getState();
          const agentMessages = store.messages.filter(m => m.role === 'agent');
          const displayedResponse = agentMessages[agentMessages.length - 1].content;

          const synthesizeCalls = mockAzureSpeechRepository.synthesize.mock.calls;
          const synthesizedText = synthesizeCalls[synthesizeCalls.length - 1][0];

          expect(displayedResponse).toBe(agentResponse);
          expect(synthesizedText).toBe(agentResponse);
          expect(displayedResponse).toBe(synthesizedText);
        }
      ),
      { numRuns: 20 }
    );
  }, 180000); // 3 minute timeout for 50 iterations

  /**
   * Property: For any sequence of responses, each should be displayed and
   * trigger TTS in order
   */
  it('should display and trigger TTS for each response in a sequence', async () => {
    await fc.assert(
      fc.asyncProperty(
        agentArbitrary,
        fc.array(
          fc.record({
            userMessage: userMessageArbitrary,
            agentResponse: agentResponseArbitrary,
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (agent: Agent, exchanges) => {
          // Arrange - Mock Brain API responses
          const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
          let callIndex = 0;
          vi.mocked(BrainApiRepository.prototype.sendMessage).mockImplementation(async () => {
            const response = exchanges[callIndex];
            callIndex++;
            return {
              success: true,
              data: {
                message: response.agentResponse,
                agentId: agent.id,
                timestamp: new Date().toISOString(),
              },
            };
          });

          // Set selected agent in store
          act(() => {
            useAppStore.getState().setSelectedAgent(agent.id);
          });

          // Act - Render ChatInterface and send multiple messages
          const { container } = render(
            <QueryClientProvider client={queryClient}>
              <ChatInterface
                ttsService={mockTTSService}
                selectedAgent={agent}
              />
            </QueryClientProvider>
          );

          const user = userEvent.setup();

          for (const exchange of exchanges) {
            const input = container.querySelector('input[type="text"]') as HTMLInputElement;
            const sendButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;

            await user.type(input, exchange.userMessage);
            await user.click(sendButton);

            // Wait for response to be displayed
            await waitFor(() => {
              expect(container.textContent).toContain(exchange.agentResponse);
            }, { timeout: 5000 });

            // Wait for TTS to be triggered
            await waitFor(() => {
              const synthesizeCalls = mockAzureSpeechRepository.synthesize.mock.calls;
              return synthesizeCalls.some(call => call[0] === exchange.agentResponse);
            }, { timeout: 5000 });
          }

          // Assert - Property 1: All responses should be displayed
          const store = useAppStore.getState();
          const agentMessages = store.messages.filter(m => m.role === 'agent');
          expect(agentMessages.length).toBe(exchanges.length);

          for (let i = 0; i < exchanges.length; i++) {
            expect(agentMessages[i].content).toBe(exchanges[i].agentResponse);
          }

          // Property 2: TTS should be called for each response
          expect(mockAzureSpeechRepository.synthesize).toHaveBeenCalledTimes(exchanges.length);

          // Property 3: Each TTS call should match the corresponding response
          const synthesizeCalls = mockAzureSpeechRepository.synthesize.mock.calls;
          for (let i = 0; i < exchanges.length; i++) {
            expect(synthesizeCalls[i][0]).toBe(exchanges[i].agentResponse);
          }
        }
      ),
      { numRuns: 20 } // Reduced for faster execution with multiple exchanges
    );
  }, 120000); // 2 minute timeout

  /**
   * Property: For any response with special characters, both display and TTS
   * should handle it correctly
   */
  it('should handle responses with special characters in both display and TTS', async () => {
    await fc.assert(
      fc.asyncProperty(
        agentArbitrary,
        userMessageArbitrary,
        fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
        async (agent: Agent, userMessage: string, agentResponse: string) => {
          // Arrange - Mock Brain API response
          const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
          vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue({
            success: true,
            data: {
              message: agentResponse,
              agentId: agent.id,
              timestamp: new Date().toISOString(),
            },
          });

          // Set selected agent in store
          act(() => {
            useAppStore.getState().setSelectedAgent(agent.id);
          });

          // Act - Render ChatInterface and send message
          const { container } = render(
            <QueryClientProvider client={queryClient}>
              <ChatInterface
                ttsService={mockTTSService}
                selectedAgent={agent}
              />
            </QueryClientProvider>
          );

          const user = userEvent.setup();
          const input = container.querySelector('input[type="text"]') as HTMLInputElement;
          const sendButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;

          await user.type(input, userMessage);
          await user.click(sendButton);

          // Assert - Property 1: Response should be displayed exactly as received
          await waitFor(() => {
            const store = useAppStore.getState();
            const agentMessages = store.messages.filter(m => m.role === 'agent');
            return agentMessages.length > 0 && agentMessages[agentMessages.length - 1].content === agentResponse;
          }, { timeout: 5000 });

          // Property 2: TTS should receive the exact response text
          await waitFor(() => {
            expect(mockAzureSpeechRepository.synthesize).toHaveBeenCalled();
          }, { timeout: 5000 });

          const synthesizeCalls = mockAzureSpeechRepository.synthesize.mock.calls;
          const lastCall = synthesizeCalls[synthesizeCalls.length - 1];
          expect(lastCall[0]).toBe(agentResponse);

          // Property 3: No modification or sanitization should occur
          const store = useAppStore.getState();
          const agentMessages = store.messages.filter(m => m.role === 'agent');
          const displayedText = agentMessages[agentMessages.length - 1].content;
          const synthesizedText = lastCall[0];

          expect(displayedText).toBe(agentResponse);
          expect(synthesizedText).toBe(agentResponse);
          expect(displayedText.length).toBe(agentResponse.length);
          expect(synthesizedText.length).toBe(agentResponse.length);
        }
      ),
      { numRuns: 20 }
    );
  }, 180000); // 3 minute timeout for 50 iterations

  /**
   * Property: For any response, the timestamp should be preserved in the display
   */
  it('should preserve response timestamp when displaying and triggering TTS', async () => {
    await fc.assert(
      fc.asyncProperty(
        agentArbitrary,
        userMessageArbitrary,
        agentResponseArbitrary,
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        async (agent: Agent, userMessage: string, agentResponse: string, responseTimestamp: Date) => {
          // Arrange - Mock Brain API response with specific timestamp
          const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
          vi.mocked(BrainApiRepository.prototype.sendMessage).mockResolvedValue({
            success: true,
            data: {
              message: agentResponse,
              agentId: agent.id,
              timestamp: responseTimestamp.toISOString(),
            },
          });

          // Set selected agent in store
          act(() => {
            useAppStore.getState().setSelectedAgent(agent.id);
          });

          // Act - Render ChatInterface and send message
          const { container } = render(
            <QueryClientProvider client={queryClient}>
              <ChatInterface
                ttsService={mockTTSService}
                selectedAgent={agent}
              />
            </QueryClientProvider>
          );

          const user = userEvent.setup();
          const input = container.querySelector('input[type="text"]') as HTMLInputElement;
          const sendButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;

          await user.type(input, userMessage);
          await user.click(sendButton);

          // Assert - Property: Response timestamp should be preserved
          await waitFor(() => {
            const store = useAppStore.getState();
            const agentMessages = store.messages.filter(m => m.role === 'agent');
            return agentMessages.length > 0;
          }, { timeout: 5000 });

          const store = useAppStore.getState();
          const agentMessages = store.messages.filter(m => m.role === 'agent');
          const displayedMessage = agentMessages[agentMessages.length - 1];

          // Property 1: Timestamp should match the response timestamp
          expect(displayedMessage.timestamp.toISOString()).toBe(responseTimestamp.toISOString());

          // Property 2: TTS should still be triggered regardless of timestamp
          await waitFor(() => {
            expect(mockAzureSpeechRepository.synthesize).toHaveBeenCalled();
          }, { timeout: 5000 });
        }
      ),
      { numRuns: 20 }
    );
  }, 180000); // 3 minute timeout for 50 iterations
});
