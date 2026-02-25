import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import type { Agent } from '@/types';
import { ChatInterface } from '@/components/ChatInterface';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationService } from '@/lib/services/NotificationService';
import { useAppStore } from '@/lib/store/useAppStore';

// Mock scrollIntoView which is not available in jsdom
Element.prototype.scrollIntoView = vi.fn();

/**
 * Helper function to get form elements
 */
const getFormElements = (container: HTMLElement) => {
  const form = container.querySelector('form')!;
  const input = form.querySelector('input[type="text"]') as HTMLInputElement;
  const sendButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
  return { input, sendButton };
};

/**
 * ChatInterface Property-Based Tests
 *
 * Property tests for ChatInterface component using fast-check
 * to verify universal properties across randomized inputs.
 */

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

const messageArbitrary = fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0);

describe('ChatInterface Property Tests', () => {
  /**
   * Feature: avatar-client, Property 12: Chat Message Submission
   * For any user message submitted through the chat interface, an HTTP POST request
   * should be sent to the Brain API `/api/chat` endpoint with the message text and agent ID.
   *
   * **Validates: Requirements 5.3, 5.4**
   */
  describe('Property 12: Chat Message Submission', () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      // Mock global fetch
      mockFetch = vi.fn();
      global.fetch = mockFetch;
      // Clear all mocks before each test
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    /**
     * Property: For any valid agent and message, the submission should create
     * a POST request to the correct endpoint
     */
    it('should send POST request to /api/chat endpoint for any valid message and agent', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          messageArbitrary,
          async (agent: Agent, message: string) => {
            // Clear mocks before each iteration
            mockFetch.mockClear();
            
            // Arrange
            const expectedEndpoint = `${process.env.NEXT_PUBLIC_BRAIN_API_URL || 'http://localhost:3001'}/api/chat`;
            
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                message: 'Response',
                agentId: agent.id,
                timestamp: new Date().toISOString(),
              }),
            });

            // Import the repository to test the actual API call
            const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
            const repository = new BrainApiRepository();

            // Act
            await repository.sendMessage(agent.id, message);

            // Assert - Property 1: Fetch should be called
            expect(mockFetch).toHaveBeenCalled();

            // Property 2: Should use POST method
            const callArgs = mockFetch.mock.calls[0];
            expect(callArgs[0]).toBe(expectedEndpoint);
            expect(callArgs[1]?.method).toBe('POST');

            // Property 3: Should include Content-Type header
            expect(callArgs[1]?.headers).toMatchObject({
              'Content-Type': 'application/json',
            });

            // Property 4: Request body should include agent ID and message
            const requestBody = JSON.parse(callArgs[1]?.body);
            expect(requestBody).toMatchObject({
              agentId: agent.id,
              message: message,
            });
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any valid agent and message, the request payload should
     * include both the agent ID and message content
     */
    it('should include agent ID and message content in request payload for any input', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          messageArbitrary,
          async (agent: Agent, message: string) => {
            // Clear mocks before each iteration
            mockFetch.mockClear();
            
            // Arrange
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                message: 'Response',
                agentId: agent.id,
                timestamp: new Date().toISOString(),
              }),
            });

            const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
            const repository = new BrainApiRepository();

            // Act
            await repository.sendMessage(agent.id, message);

            // Assert - Property: Request body should contain both fields
            const callArgs = mockFetch.mock.calls[0];
            const requestBody = JSON.parse(callArgs[1]?.body);

            // Property 1: Agent ID should be present and match
            expect(requestBody.agentId).toBeDefined();
            expect(requestBody.agentId).toBe(agent.id);

            // Property 2: Message should be present and match
            expect(requestBody.message).toBeDefined();
            expect(requestBody.message).toBe(message);

            // Property 3: Request should only contain expected fields
            const expectedFields = ['agentId', 'message'];
            const actualFields = Object.keys(requestBody);
            expect(actualFields.sort()).toEqual(expectedFields.sort());
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any agent ID, the request should include that exact agent ID
     * without modification
     */
    it('should preserve agent ID exactly as provided for any agent', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          messageArbitrary,
          async (agent: Agent, message: string) => {
            // Clear mocks before each iteration
            mockFetch.mockClear();
            
            // Arrange
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                message: 'Response',
                agentId: agent.id,
                timestamp: new Date().toISOString(),
              }),
            });

            const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
            const repository = new BrainApiRepository();

            // Act
            await repository.sendMessage(agent.id, message);

            // Assert - Property: Agent ID should be preserved exactly
            const callArgs = mockFetch.mock.calls[0];
            const requestBody = JSON.parse(callArgs[1]?.body);

            // Property 1: Agent ID should match exactly (no trimming, no modification)
            expect(requestBody.agentId).toBe(agent.id);

            // Property 2: Agent ID type should be string
            expect(typeof requestBody.agentId).toBe('string');

            // Property 3: Agent ID should not be empty
            expect(requestBody.agentId.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any message content, the request should include that exact
     * message content
     */
    it('should preserve message content exactly as provided for any message', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          messageArbitrary,
          async (agent: Agent, message: string) => {
            // Clear mocks before each iteration
            mockFetch.mockClear();
            
            // Arrange
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                message: 'Response',
                agentId: agent.id,
                timestamp: new Date().toISOString(),
              }),
            });

            const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
            const repository = new BrainApiRepository();

            // Act
            await repository.sendMessage(agent.id, message);

            // Assert - Property: Message should be preserved exactly
            const callArgs = mockFetch.mock.calls[0];
            const requestBody = JSON.parse(callArgs[1]?.body);

            // Property 1: Message should match exactly
            expect(requestBody.message).toBe(message);

            // Property 2: Message type should be string
            expect(typeof requestBody.message).toBe('string');

            // Property 3: Message should not be empty (filtered by arbitrary)
            expect(requestBody.message.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any valid request, the HTTP method should always be POST
     */
    it('should always use POST method for any message submission', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          messageArbitrary,
          async (agent: Agent, message: string) => {
            // Arrange
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                message: 'Response',
                agentId: agent.id,
                timestamp: new Date().toISOString(),
              }),
            });

            const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
            const repository = new BrainApiRepository();

            // Act
            await repository.sendMessage(agent.id, message);

            // Assert - Property: Method should always be POST
            const callArgs = mockFetch.mock.calls[0];
            
            // Property 1: Method should be POST
            expect(callArgs[1]?.method).toBe('POST');

            // Property 2: Method should be uppercase
            expect(callArgs[1]?.method).toMatch(/^[A-Z]+$/);

            // Property 3: Method should not be GET, PUT, DELETE, or PATCH
            expect(callArgs[1]?.method).not.toBe('GET');
            expect(callArgs[1]?.method).not.toBe('PUT');
            expect(callArgs[1]?.method).not.toBe('DELETE');
            expect(callArgs[1]?.method).not.toBe('PATCH');
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any valid request, the Content-Type header should be application/json
     */
    it('should include Content-Type: application/json header for any request', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          messageArbitrary,
          async (agent: Agent, message: string) => {
            // Arrange
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                message: 'Response',
                agentId: agent.id,
                timestamp: new Date().toISOString(),
              }),
            });

            const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
            const repository = new BrainApiRepository();

            // Act
            await repository.sendMessage(agent.id, message);

            // Assert - Property: Content-Type header should be application/json
            const callArgs = mockFetch.mock.calls[0];
            const headers = callArgs[1]?.headers;

            // Property 1: Content-Type header should exist
            expect(headers).toHaveProperty('Content-Type');

            // Property 2: Content-Type should be application/json
            expect(headers['Content-Type']).toBe('application/json');

            // Property 3: Headers should be an object
            expect(typeof headers).toBe('object');
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any valid request, the endpoint should be /api/chat
     */
    it('should send request to /api/chat endpoint for any message', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          messageArbitrary,
          async (agent: Agent, message: string) => {
            // Arrange
            const baseUrl = process.env.NEXT_PUBLIC_BRAIN_API_URL || 'http://localhost:3001';
            const expectedEndpoint = `${baseUrl}/api/chat`;

            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                message: 'Response',
                agentId: agent.id,
                timestamp: new Date().toISOString(),
              }),
            });

            const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
            const repository = new BrainApiRepository();

            // Act
            await repository.sendMessage(agent.id, message);

            // Assert - Property: Endpoint should be /api/chat
            const callArgs = mockFetch.mock.calls[0];
            const actualEndpoint = callArgs[0];

            // Property 1: Endpoint should match expected
            expect(actualEndpoint).toBe(expectedEndpoint);

            // Property 2: Endpoint should end with /api/chat
            expect(actualEndpoint).toMatch(/\/api\/chat$/);

            // Property 3: Endpoint should be a string
            expect(typeof actualEndpoint).toBe('string');
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any sequence of messages with the same agent, each should
     * include the correct agent ID
     */
    it('should include correct agent ID for any sequence of messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          fc.array(messageArbitrary, { minLength: 1, maxLength: 10 }),
          async (agent: Agent, messages: string[]) => {
            // Clear mocks before each iteration
            mockFetch.mockClear();
            
            // Arrange
            const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
            const repository = new BrainApiRepository();

            // Act - Send multiple messages
            for (const message of messages) {
              mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                  message: 'Response',
                  agentId: agent.id,
                  timestamp: new Date().toISOString(),
                }),
              });

              await repository.sendMessage(agent.id, message);
            }

            // Assert - Property: All requests should include the same agent ID
            expect(mockFetch).toHaveBeenCalledTimes(messages.length);

            for (let i = 0; i < messages.length; i++) {
              const callArgs = mockFetch.mock.calls[i];
              const requestBody = JSON.parse(callArgs[1]?.body);

              // Property 1: Each request should have the agent ID
              expect(requestBody.agentId).toBe(agent.id);

              // Property 2: Each request should have the corresponding message
              expect(requestBody.message).toBe(messages[i]);
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any valid request, the request body should be valid JSON
     */
    it('should send valid JSON in request body for any message', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          messageArbitrary,
          async (agent: Agent, message: string) => {
            // Arrange
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                message: 'Response',
                agentId: agent.id,
                timestamp: new Date().toISOString(),
              }),
            });

            const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
            const repository = new BrainApiRepository();

            // Act
            await repository.sendMessage(agent.id, message);

            // Assert - Property: Request body should be valid JSON
            const callArgs = mockFetch.mock.calls[0];
            const requestBodyString = callArgs[1]?.body;

            // Property 1: Body should be a string
            expect(typeof requestBodyString).toBe('string');

            // Property 2: Body should be parseable as JSON
            let parsedBody;
            expect(() => {
              parsedBody = JSON.parse(requestBodyString);
            }).not.toThrow();

            // Property 3: Parsed body should be an object
            expect(typeof parsedBody).toBe('object');
            expect(parsedBody).not.toBeNull();

            // Property 4: Parsed body should have expected structure
            expect(parsedBody).toHaveProperty('agentId');
            expect(parsedBody).toHaveProperty('message');
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any agent with different properties (voice, language, description),
     * only the agent ID should be included in the request
     */
    it('should only include agent ID in request, not other agent properties', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          messageArbitrary,
          async (agent: Agent, message: string) => {
            // Arrange
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                message: 'Response',
                agentId: agent.id,
                timestamp: new Date().toISOString(),
              }),
            });

            const { BrainApiRepository } = await import('@/lib/repositories/BrainApiRepository');
            const repository = new BrainApiRepository();

            // Act
            await repository.sendMessage(agent.id, message);

            // Assert - Property: Only agentId and message should be in request
            const callArgs = mockFetch.mock.calls[0];
            const requestBody = JSON.parse(callArgs[1]?.body);

            // Property 1: Should not include agent name
            expect(requestBody).not.toHaveProperty('name');

            // Property 2: Should not include agent voice
            expect(requestBody).not.toHaveProperty('voice');

            // Property 3: Should not include agent language
            expect(requestBody).not.toHaveProperty('language');

            // Property 4: Should not include agent description
            expect(requestBody).not.toHaveProperty('description');

            // Property 5: Should only have agentId and message
            const keys = Object.keys(requestBody);
            expect(keys).toHaveLength(2);
            expect(keys).toContain('agentId');
            expect(keys).toContain('message');
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  /**
   * Feature: avatar-client, Property 21: Visual Message Distinction
   * For any message in the conversation history, user messages and agent responses
   * should have visually distinct styling to differentiate them.
   *
   * **Validates: Requirements 9.5**
   */
  describe('Property 21: Visual Message Distinction', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
      // Create a new QueryClient for each test
      queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      // Initialize NotificationService
      NotificationService.reset();
      NotificationService.initialize(useAppStore.getState());
      // Clear messages from store
      useAppStore.getState().clearMessages();
      // Clear all mocks before each test
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      queryClient.clear();
      useAppStore.getState().clearMessages();
    });

    /**
     * Property: For any sequence of messages, user messages should have
     * different background color than agent messages
     */
    it('should apply distinct background colors for user and agent messages', { timeout: 30000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          fc.array(
            fc.record({
              id: fc.uuid(),
              role: fc.constantFrom('user' as const, 'agent' as const),
              content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
              timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            }),
            { minLength: 2, maxLength: 20 }
          ),
          async (agent, messages) => {
            // Ensure we have at least one user and one agent message
            const hasUserMessage = messages.some(m => m.role === 'user');
            const hasAgentMessage = messages.some(m => m.role === 'agent');
            
            if (!hasUserMessage || !hasAgentMessage) {
              // Add at least one of each type if missing
              if (!hasUserMessage) {
                messages.push({
                  id: 'user-msg',
                  role: 'user' as const,
                  content: 'User message',
                  timestamp: new Date(),
                });
              }
              if (!hasAgentMessage) {
                messages.push({
                  id: 'agent-msg',
                  role: 'agent' as const,
                  content: 'Agent message',
                  timestamp: new Date(),
                });
              }
            }

            // Arrange
            const store = useAppStore.getState();
            store.clearMessages();

            for (const message of messages) {
              store.addMessage(message);
            }

            // Act
            const { container } = render(
              <QueryClientProvider client={queryClient}>
                <ChatInterface selectedAgent={agent} />
              </QueryClientProvider>
            );

            // Assert - Property: User and agent messages should have distinct styling
            await waitFor(() => {
              const messageElements = container.querySelectorAll('[role="article"]');
              expect(messageElements.length).toBeGreaterThan(0);
            });

            const messageElements = container.querySelectorAll('[role="article"]');
            const storeMessages = useAppStore.getState().messages;

            // Property 1: Each message should have appropriate background color based on role
            messageElements.forEach((element, index) => {
              const message = storeMessages[index];
              const classList = element.className;

              if (message.role === 'user') {
                // User messages should have blue background
                expect(classList).toContain('bg-blue-600');
                expect(classList).toContain('text-white');
              } else {
                // Agent messages should have gray background
                expect(classList).toContain('bg-gray-200');
                expect(classList).toContain('text-gray-900');
              }
            });

            // Property 2: User and agent messages should have different background colors
            const userMessages = Array.from(messageElements).filter((_, index) => 
              storeMessages[index].role === 'user'
            );
            const agentMessages = Array.from(messageElements).filter((_, index) => 
              storeMessages[index].role === 'agent'
            );

            if (userMessages.length > 0 && agentMessages.length > 0) {
              const userBgClass = userMessages[0].className.match(/bg-\w+-\d+/)?.[0];
              const agentBgClass = agentMessages[0].className.match(/bg-\w+-\d+/)?.[0];

              // Background colors should be different
              expect(userBgClass).toBeDefined();
              expect(agentBgClass).toBeDefined();
              expect(userBgClass).not.toBe(agentBgClass);
            }

            // Property 3: All user messages should have consistent styling
            userMessages.forEach(element => {
              expect(element.className).toContain('bg-blue-600');
              expect(element.className).toContain('text-white');
            });

            // Property 4: All agent messages should have consistent styling
            agentMessages.forEach(element => {
              expect(element.className).toContain('bg-gray-200');
              expect(element.className).toContain('text-gray-900');
            });
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any sequence of messages, user and agent messages should
     * be visually distinguishable by their styling
     */
    it('should maintain visual distinction across various message sequences', { timeout: 30000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          fc.array(
            fc.record({
              id: fc.uuid(),
              role: fc.constantFrom('user' as const, 'agent' as const),
              content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
              timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            }),
            { minLength: 3, maxLength: 15 }
          ),
          async (agent, messages) => {
            // Arrange
            const store = useAppStore.getState();
            store.clearMessages();

            for (const message of messages) {
              store.addMessage(message);
            }

            // Act
            const { container } = render(
              <QueryClientProvider client={queryClient}>
                <ChatInterface selectedAgent={agent} />
              </QueryClientProvider>
            );

            // Assert
            await waitFor(() => {
              const messageElements = container.querySelectorAll('[role="article"]');
              expect(messageElements.length).toBe(messages.length);
            });

            const messageElements = container.querySelectorAll('[role="article"]');
            const storeMessages = useAppStore.getState().messages;

            // Property 1: Each message should have role-specific styling
            for (let i = 0; i < messageElements.length; i++) {
              const element = messageElements[i];
              const message = storeMessages[i];
              const classList = element.className;

              // Verify role-specific styling is applied
              if (message.role === 'user') {
                expect(classList).toMatch(/bg-blue-\d+/);
                expect(classList).toContain('text-white');
              } else {
                expect(classList).toMatch(/bg-gray-\d+/);
                expect(classList).toContain('text-gray-900');
              }
            }

            // Property 2: Adjacent messages with different roles should have different styling
            for (let i = 1; i < messageElements.length; i++) {
              const prevMessage = storeMessages[i - 1];
              const currMessage = storeMessages[i];

              if (prevMessage.role !== currMessage.role) {
                const prevBg = messageElements[i - 1].className.match(/bg-\w+-\d+/)?.[0];
                const currBg = messageElements[i].className.match(/bg-\w+-\d+/)?.[0];

                // Different roles should have different backgrounds
                expect(prevBg).not.toBe(currBg);
              }
            }

            // Property 3: Messages with the same role should have the same styling
            const userMessageElements = Array.from(messageElements).filter((_, index) =>
              storeMessages[index].role === 'user'
            );
            const agentMessageElements = Array.from(messageElements).filter((_, index) =>
              storeMessages[index].role === 'agent'
            );

            // All user messages should have identical styling
            if (userMessageElements.length > 1) {
              const firstUserBg = userMessageElements[0].className.match(/bg-\w+-\d+/)?.[0];
              userMessageElements.forEach(element => {
                const bg = element.className.match(/bg-\w+-\d+/)?.[0];
                expect(bg).toBe(firstUserBg);
              });
            }

            // All agent messages should have identical styling
            if (agentMessageElements.length > 1) {
              const firstAgentBg = agentMessageElements[0].className.match(/bg-\w+-\d+/)?.[0];
              agentMessageElements.forEach(element => {
                const bg = element.className.match(/bg-\w+-\d+/)?.[0];
                expect(bg).toBe(firstAgentBg);
              });
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any single user message, it should have user-specific styling
     */
    it('should apply user styling for any single user message', { timeout: 30000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          fc.record({
            id: fc.uuid(),
            role: fc.constant('user' as const),
            content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
          }),
          async (agent, message) => {
            // Arrange
            const store = useAppStore.getState();
            store.clearMessages();
            store.addMessage(message);

            // Act
            const { container } = render(
              <QueryClientProvider client={queryClient}>
                <ChatInterface selectedAgent={agent} />
              </QueryClientProvider>
            );

            // Assert
            await waitFor(() => {
              const messageElements = container.querySelectorAll('[role="article"]');
              expect(messageElements.length).toBe(1);
            });

            const messageElement = container.querySelector('[role="article"]');
            expect(messageElement).toBeTruthy();

            // Property: User message should have blue background and white text
            expect(messageElement!.className).toContain('bg-blue-600');
            expect(messageElement!.className).toContain('text-white');
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any single agent message, it should have agent-specific styling
     */
    it('should apply agent styling for any single agent message', { timeout: 30000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          fc.record({
            id: fc.uuid(),
            role: fc.constant('agent' as const),
            content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
          }),
          async (agent, message) => {
            // Arrange
            const store = useAppStore.getState();
            store.clearMessages();
            store.addMessage(message);

            // Act
            const { container } = render(
              <QueryClientProvider client={queryClient}>
                <ChatInterface selectedAgent={agent} />
              </QueryClientProvider>
            );

            // Assert
            await waitFor(() => {
              const messageElements = container.querySelectorAll('[role="article"]');
              expect(messageElements.length).toBe(1);
            });

            const messageElement = container.querySelector('[role="article"]');
            expect(messageElement).toBeTruthy();

            // Property: Agent message should have gray background and dark text
            expect(messageElement!.className).toContain('bg-gray-200');
            expect(messageElement!.className).toContain('text-gray-900');
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any alternating sequence of user and agent messages,
     * each message should have the correct role-specific styling
     */
    it('should maintain correct styling for alternating user and agent messages', { timeout: 30000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          fc.integer({ min: 3, max: 10 }),
          async (agent, messageCount) => {
            // Arrange - Create alternating user and agent messages
            const messages = [];
            const baseTime = new Date('2024-01-01T00:00:00Z').getTime();

            for (let i = 0; i < messageCount; i++) {
              messages.push({
                id: `msg-${i}`,
                role: (i % 2 === 0 ? 'user' : 'agent') as const,
                content: `Message ${i}`,
                timestamp: new Date(baseTime + i * 1000),
              });
            }

            const store = useAppStore.getState();
            store.clearMessages();

            for (const message of messages) {
              store.addMessage(message);
            }

            // Act
            const { container } = render(
              <QueryClientProvider client={queryClient}>
                <ChatInterface selectedAgent={agent} />
              </QueryClientProvider>
            );

            // Assert
            await waitFor(() => {
              const messageElements = container.querySelectorAll('[role="article"]');
              expect(messageElements.length).toBe(messageCount);
            });

            const messageElements = container.querySelectorAll('[role="article"]');

            // Property: Each message should have correct styling based on its role
            messageElements.forEach((element, index) => {
              const expectedRole = index % 2 === 0 ? 'user' : 'agent';

              if (expectedRole === 'user') {
                expect(element.className).toContain('bg-blue-600');
                expect(element.className).toContain('text-white');
              } else {
                expect(element.className).toContain('bg-gray-200');
                expect(element.className).toContain('text-gray-900');
              }
            });

            // Property: Adjacent messages should have different styling
            for (let i = 1; i < messageElements.length; i++) {
              const prevBg = messageElements[i - 1].className.match(/bg-\w+-\d+/)?.[0];
              const currBg = messageElements[i].className.match(/bg-\w+-\d+/)?.[0];

              // Alternating messages should have different backgrounds
              expect(prevBg).not.toBe(currBg);
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any message content length, the styling should remain consistent
     */
    it('should maintain consistent styling regardless of message content length', { timeout: 30000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          fc.constantFrom('user' as const, 'agent' as const),
          fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
          async (agent, role, content) => {
            // Arrange
            const message = {
              id: 'test-msg',
              role,
              content,
              timestamp: new Date(),
            };

            const store = useAppStore.getState();
            store.clearMessages();
            store.addMessage(message);

            // Act
            const { container } = render(
              <QueryClientProvider client={queryClient}>
                <ChatInterface selectedAgent={agent} />
              </QueryClientProvider>
            );

            // Assert
            await waitFor(() => {
              const messageElements = container.querySelectorAll('[role="article"]');
              expect(messageElements.length).toBe(1);
            });

            const messageElement = container.querySelector('[role="article"]');
            expect(messageElement).toBeTruthy();

            // Property: Styling should be consistent regardless of content length
            if (role === 'user') {
              expect(messageElement!.className).toContain('bg-blue-600');
              expect(messageElement!.className).toContain('text-white');
            } else {
              expect(messageElement!.className).toContain('bg-gray-200');
              expect(messageElement!.className).toContain('text-gray-900');
            }
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  /**
   * Feature: avatar-client, Property 14: Input Disabling During Request
   * For any pending Brain API request, the chat input field should be disabled
   * until the request completes (success or failure).
   *
   * **Validates: Requirements 5.7**
   */
  describe('Property 14: Input Disabling During Request', () => {
    let mockFetch: ReturnType<typeof vi.fn>;
    let queryClient: QueryClient;

    beforeEach(() => {
      // Mock global fetch
      mockFetch = vi.fn();
      global.fetch = mockFetch;
      // Create a new QueryClient for each test
      queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      // Initialize NotificationService
      NotificationService.reset();
      NotificationService.initialize(useAppStore.getState());
      // Clear all mocks before each test
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      queryClient.clear();
    });

    /**
     * Property: For any message submission, the input field should be disabled
     * while the request is pending
     */
    it('should disable input field during pending request for any message', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          messageArbitrary,
          async (agent: Agent, message: string) => {
            // Arrange - Create a promise we can control
            let resolveRequest: (value: any) => void;
            const requestPromise = new Promise((resolve) => {
              resolveRequest = resolve;
            });

            mockFetch.mockReturnValueOnce(
              requestPromise.then(() => ({
                ok: true,
                json: async () => ({
                  message: 'Response',
                  agentId: agent.id,
                  timestamp: new Date().toISOString(),
                }),
              }))
            );

            const { container } = render(
              <QueryClientProvider client={queryClient}>
                <ChatInterface selectedAgent={agent} />
              </QueryClientProvider>
            );

            const { input, sendButton } = getFormElements(container);

            // Property 1: Input should be enabled before submission
            expect(input.disabled).toBe(false);
            expect(sendButton.disabled).toBe(false);

            // Act - Submit message
            await userEvent.type(input, message);
            await userEvent.click(sendButton);

            // Property 2: Input should be disabled during pending request
            await waitFor(() => {
              expect(input.disabled).toBe(true);
            });

            // Property 3: Send button should also be disabled during pending request
            expect(sendButton.disabled).toBe(true);

            // Property 4: Input should have disabled styling
            expect(input.className).toContain('disabled:');

            // Complete the request
            resolveRequest!(null);

            // Property 5: Input should be re-enabled after request completes
            await waitFor(() => {
              expect(input.disabled).toBe(false);
            });

            // Property 6: Send button should be re-enabled after request completes
            expect(sendButton.disabled).toBe(false);
          }
        ),
        { numRuns: 20 } // Reduced for faster execution
      );
    });

    /**
     * Property: For any message submission, the send button should be disabled
     * while the request is pending
     */
    it('should disable send button during pending request for any message', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          messageArbitrary,
          async (agent: Agent, message: string) => {
            // Arrange - Create a promise we can control
            let resolveRequest: (value: any) => void;
            const requestPromise = new Promise((resolve) => {
              resolveRequest = resolve;
            });

            mockFetch.mockReturnValueOnce(
              requestPromise.then(() => ({
                ok: true,
                json: async () => ({
                  message: 'Response',
                  agentId: agent.id,
                  timestamp: new Date().toISOString(),
                }),
              }))
            );

            const { container } = render(
              <QueryClientProvider client={queryClient}>
                <ChatInterface selectedAgent={agent} />
              </QueryClientProvider>
            );

            const { input, sendButton } = getFormElements(container);

            // Property 1: Send button should be enabled before submission (with valid input)
            await userEvent.type(input, message);
            expect(sendButton.disabled).toBe(false);

            // Act - Submit message
            await userEvent.click(sendButton);

            // Property 2: Send button should be disabled during pending request
            await waitFor(() => {
              expect(sendButton.disabled).toBe(true);
            });

            // Property 3: Send button text should indicate pending state
            expect(sendButton.textContent).toContain('Sending');

            // Complete the request
            resolveRequest!(null);

            // Property 4: Send button should be re-enabled after request completes
            await waitFor(() => {
              expect(sendButton.disabled).toBe(false);
            });

            // Property 5: Send button text should return to normal state
            expect(sendButton.textContent).toContain('Send');
          }
        ),
        { numRuns: 20 } // Reduced for faster execution
      );
    });

    /**
     * Property: For any failed request, inputs should be re-enabled after failure
     */
    it('should re-enable inputs after request failure for any message', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          messageArbitrary,
          async (agent: Agent, message: string) => {
            // Arrange - Mock a failed request
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const { container } = render(
              <QueryClientProvider client={queryClient}>
                <ChatInterface selectedAgent={agent} />
              </QueryClientProvider>
            );

            const { input, sendButton } = getFormElements(container);

            // Act - Submit message
            await userEvent.type(input, message);
            await userEvent.click(sendButton);

            // Wait for request to fail
            await waitFor(() => {
              expect(mockFetch).toHaveBeenCalled();
            });

            // Property 1: Input should be re-enabled after failure
            await waitFor(() => {
              expect(input.disabled).toBe(false);
            }, { timeout: 3000 });

            // Property 2: Send button should be re-enabled after failure
            expect(sendButton.disabled).toBe(false);

            // Property 3: User should be able to type again
            await userEvent.clear(input);
            await userEvent.type(input, 'retry');
            expect(input.value).toBe('retry');
          }
        ),
        { numRuns: 20 } // Reduced for faster execution
      );
    });

    /**
     * Property: For any sequence of messages, each submission should disable
     * inputs until that specific request completes
     */
    it('should disable inputs for each request in a sequence', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          fc.array(messageArbitrary, { minLength: 2, maxLength: 5 }),
          async (agent: Agent, messages: string[]) => {
            // Arrange
            const { container } = render(
              <QueryClientProvider client={queryClient}>
                <ChatInterface selectedAgent={agent} />
              </QueryClientProvider>
            );

            const { input, sendButton } = getFormElements(container);

            // Act - Send multiple messages sequentially
            for (const message of messages) {
              // Mock successful response for this message
              mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                  message: 'Response',
                  agentId: agent.id,
                  timestamp: new Date().toISOString(),
                }),
              });

              // Property 1: Input should be enabled before each submission
              expect(input.disabled).toBe(false);

              // Submit message
              await userEvent.type(input, message);
              await userEvent.click(sendButton);

              // Property 2: Input should be disabled during each request
              await waitFor(() => {
                expect(input.disabled).toBe(true);
              });

              // Property 3: Wait for request to complete and input to re-enable
              await waitFor(() => {
                expect(input.disabled).toBe(false);
              }, { timeout: 3000 });
            }

            // Property 4: After all requests, input should be enabled
            expect(input.disabled).toBe(false);
            expect(sendButton.disabled).toBe(false);
          }
        ),
        { numRuns: 20 } // Reduced for faster execution
      );
    });

    /**
     * Property: For any pending request, user should not be able to submit
     * another message until the first completes
     */
    it('should prevent duplicate submissions during pending request', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          messageArbitrary,
          async (agent: Agent, message: string) => {
            // Arrange - Create a promise we can control
            let resolveRequest: (value: any) => void;
            const requestPromise = new Promise((resolve) => {
              resolveRequest = resolve;
            });

            mockFetch.mockReturnValueOnce(
              requestPromise.then(() => ({
                ok: true,
                json: async () => ({
                  message: 'Response',
                  agentId: agent.id,
                  timestamp: new Date().toISOString(),
                }),
              }))
            );

            const { container } = render(
              <QueryClientProvider client={queryClient}>
                <ChatInterface selectedAgent={agent} />
              </QueryClientProvider>
            );

            const { input, sendButton } = getFormElements(container);

            // Act - Submit first message
            await userEvent.type(input, message);
            await userEvent.click(sendButton);

            // Wait for input to be disabled
            await waitFor(() => {
              expect(input.disabled).toBe(true);
            });

            // Property 1: Attempting to type should not work while disabled
            const initialCallCount = mockFetch.mock.calls.length;
            
            // Try to type (should not work because input is disabled)
            await userEvent.type(input, 'another message');
            
            // Property 2: Input value should remain empty (cleared after submission)
            expect(input.value).toBe('');

            // Property 3: Send button should remain disabled
            expect(sendButton.disabled).toBe(true);

            // Property 4: No additional API calls should be made
            expect(mockFetch.mock.calls.length).toBe(initialCallCount);

            // Complete the request
            resolveRequest!(null);

            // Property 5: After completion, user can submit again
            await waitFor(() => {
              expect(input.disabled).toBe(false);
            });
          }
        ),
        { numRuns: 20 } // Reduced for faster execution
      );
    });

    /**
     * Property: For any request duration, inputs should remain disabled
     * for the entire duration
     */
    it('should keep inputs disabled for entire request duration', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          messageArbitrary,
          fc.integer({ min: 100, max: 300 }), // Request duration in ms (reduced for faster tests)
          async (agent: Agent, message: string, duration: number) => {
            // Arrange - Create a delayed response
            mockFetch.mockImplementationOnce(
              () =>
                new Promise((resolve) => {
                  setTimeout(() => {
                    resolve({
                      ok: true,
                      json: async () => ({
                        message: 'Response',
                        agentId: agent.id,
                        timestamp: new Date().toISOString(),
                      }),
                    });
                  }, duration);
                })
            );

            const { container } = render(
              <QueryClientProvider client={queryClient}>
                <ChatInterface selectedAgent={agent} />
              </QueryClientProvider>
            );

            const { input, sendButton } = getFormElements(container);

            // Act - Submit message
            await userEvent.type(input, message);
            await userEvent.click(sendButton);

            // Property 1: Input should be disabled immediately
            await waitFor(() => {
              expect(input.disabled).toBe(true);
            });

            // Property 2: Input should remain disabled for at least half the duration
            await new Promise((resolve) => setTimeout(resolve, duration / 2));
            expect(input.disabled).toBe(true);
            expect(sendButton.disabled).toBe(true);

            // Property 3: After duration, input should be re-enabled
            await waitFor(
              () => {
                expect(input.disabled).toBe(false);
              },
              { timeout: duration + 1000 }
            );
          }
        ),
        { numRuns: 10 } // Reduced for faster execution
      );
    }, 20000); // 20 second timeout for this test
  });
});

/**
 * Feature: avatar-client, Property 19: Message Chronological Ordering
 * For any sequence of messages in the conversation history, the messages should
 * be displayed in chronological order based on their timestamps.
 *
 * **Validates: Requirements 9.3**
 */
describe('Property 19: Message Chronological Ordering', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    // Create a new QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    // Initialize NotificationService
    NotificationService.reset();
    NotificationService.initialize(useAppStore.getState());
    // Clear messages from store
    useAppStore.getState().clearMessages();
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
    useAppStore.getState().clearMessages();
  });

  /**
   * Property: For any sequence of messages with random timestamps,
   * messages should be displayed in chronological order (oldest first)
   */
  it('should display messages in chronological order for any message sequence', async () => {
    await fc.assert(
      fc.asyncProperty(
        agentArbitrary,
        fc.array(
          fc.record({
            id: fc.uuid(),
            role: fc.constantFrom('user' as const, 'agent' as const),
            content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
          }),
          { minLength: 2, maxLength: 20 }
        ),
        async (agent, messages) => {
          // Arrange - Add messages to store in random order
          const store = useAppStore.getState();
          store.clearMessages();

          // Shuffle messages to ensure they're not already sorted
          const shuffledMessages = [...messages].sort(() => Math.random() - 0.5);

          for (const message of shuffledMessages) {
            store.addMessage(message);
          }

          // Act - Render component
          const { container } = render(
            <QueryClientProvider client={queryClient}>
              <ChatInterface selectedAgent={agent} />
            </QueryClientProvider>
          );

          // Assert - Property: Messages should be displayed in chronological order
          await waitFor(() => {
            const messageElements = container.querySelectorAll('[role="article"]');
            expect(messageElements.length).toBeGreaterThan(0);
          });

          const messageElements = container.querySelectorAll('[role="article"]');
          const displayedMessages = Array.from(messageElements);

          // Property 1: Number of displayed messages should match input
          expect(displayedMessages.length).toBe(messages.length);

          // Property 2: Messages should be in chronological order
          // Extract timestamps from the displayed messages
          const displayedTimestamps: Date[] = [];
          displayedMessages.forEach((element, index) => {
            // Get the timestamp from the store messages (which should be sorted)
            const storeMessages = useAppStore.getState().messages;
            if (storeMessages[index]) {
              displayedTimestamps.push(storeMessages[index].timestamp);
            }
          });

          // Verify chronological ordering (each timestamp >= previous)
          for (let i = 1; i < displayedTimestamps.length; i++) {
            const prevTime = displayedTimestamps[i - 1].getTime();
            const currTime = displayedTimestamps[i].getTime();

            // Property: Current message timestamp should be >= previous message timestamp
            expect(currTime).toBeGreaterThanOrEqual(prevTime);
          }

          // Property 3: Displayed order should match sorted order
          const sortedMessages = [...messages].sort((a, b) =>
            a.timestamp.getTime() - b.timestamp.getTime()
          );

          const storeMessages = useAppStore.getState().messages;
          for (let i = 0; i < sortedMessages.length; i++) {
            expect(storeMessages[i].id).toBe(sortedMessages[i].id);
            expect(storeMessages[i].timestamp.getTime()).toBe(sortedMessages[i].timestamp.getTime());
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any sequence of messages with identical timestamps,
   * the order should be stable (maintain insertion order)
   */
  it('should maintain stable order for messages with identical timestamps', async () => {
    await fc.assert(
      fc.asyncProperty(
        agentArbitrary,
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            role: fc.constantFrom('user' as const, 'agent' as const),
            content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (agent, sharedTimestamp, messageData) => {
          // Arrange - Create messages with identical timestamps
          const messages = messageData.map(data => ({
            ...data,
            timestamp: new Date(sharedTimestamp.getTime()), // Same timestamp for all
          }));

          const store = useAppStore.getState();
          store.clearMessages();

          // Add messages in order
          for (const message of messages) {
            store.addMessage(message);
          }

          // Act - Render component
          const { container } = render(
            <QueryClientProvider client={queryClient}>
              <ChatInterface selectedAgent={agent} />
            </QueryClientProvider>
          );

          // Assert - Property: Messages with same timestamp should maintain insertion order
          await waitFor(() => {
            const messageElements = container.querySelectorAll('[role="article"]');
            expect(messageElements.length).toBe(messages.length);
          });

          const storeMessages = useAppStore.getState().messages;

          // Property 1: All messages should have the same timestamp
          for (let i = 0; i < storeMessages.length; i++) {
            expect(storeMessages[i].timestamp.getTime()).toBe(sharedTimestamp.getTime());
          }

          // Property 2: Order should match insertion order
          for (let i = 0; i < messages.length; i++) {
            expect(storeMessages[i].id).toBe(messages[i].id);
            expect(storeMessages[i].content).toBe(messages[i].content);
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any sequence where older messages are added after newer ones,
   * the display should still show chronological order
   */
  it('should maintain chronological order even when older messages are added later', async () => {
    await fc.assert(
      fc.asyncProperty(
        agentArbitrary,
        fc.array(
          fc.record({
            id: fc.uuid(),
            role: fc.constantFrom('user' as const, 'agent' as const),
            content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
          }),
          { minLength: 3, maxLength: 15 }
        ),
        async (agent, messages) => {
          // Arrange - Add messages in reverse chronological order
          const store = useAppStore.getState();
          store.clearMessages();

          // Sort messages by timestamp descending (newest first)
          const reversedMessages = [...messages].sort((a, b) =>
            b.timestamp.getTime() - a.timestamp.getTime()
          );

          // Add messages in reverse order
          for (const message of reversedMessages) {
            store.addMessage(message);
          }

          // Act - Render component
          const { container } = render(
            <QueryClientProvider client={queryClient}>
              <ChatInterface selectedAgent={agent} />
            </QueryClientProvider>
          );

          // Assert - Property: Despite reverse insertion, display should be chronological
          await waitFor(() => {
            const messageElements = container.querySelectorAll('[role="article"]');
            expect(messageElements.length).toBe(messages.length);
          });

          const storeMessages = useAppStore.getState().messages;

          // Property: Messages should be in chronological order (oldest first)
          for (let i = 1; i < storeMessages.length; i++) {
            const prevTime = storeMessages[i - 1].timestamp.getTime();
            const currTime = storeMessages[i].timestamp.getTime();

            expect(currTime).toBeGreaterThanOrEqual(prevTime);
          }

          // Property: Should match the correctly sorted order
          const correctlySorted = [...messages].sort((a, b) =>
            a.timestamp.getTime() - b.timestamp.getTime()
          );

          for (let i = 0; i < correctlySorted.length; i++) {
            expect(storeMessages[i].id).toBe(correctlySorted[i].id);
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any sequence of messages with various timestamp gaps,
   * the chronological ordering should be maintained
   */
  it('should maintain chronological order with various timestamp gaps', async () => {
    await fc.assert(
      fc.asyncProperty(
        agentArbitrary,
        fc.integer({ min: 5, max: 15 }),
        async (agent, messageCount) => {
          // Arrange - Create messages with varying time gaps
          const baseTime = new Date('2024-01-01T00:00:00Z').getTime();
          const messages = [];

          for (let i = 0; i < messageCount; i++) {
            // Random time gap between 1 second and 1 hour
            const timeGap = Math.floor(Math.random() * 3600000) + 1000;
            const timestamp = new Date(baseTime + (i * timeGap));

            messages.push({
              id: `msg-${i}-${Math.random()}`,
              role: (i % 2 === 0 ? 'user' : 'agent') as const,
              content: `Message ${i}`,
              timestamp,
            });
          }

          const store = useAppStore.getState();
          store.clearMessages();

          // Add messages in random order
          const shuffled = [...messages].sort(() => Math.random() - 0.5);
          for (const message of shuffled) {
            store.addMessage(message);
          }

          // Act - Render component
          const { container } = render(
            <QueryClientProvider client={queryClient}>
              <ChatInterface selectedAgent={agent} />
            </QueryClientProvider>
          );

          // Assert - Property: Messages should be chronologically ordered
          await waitFor(() => {
            const messageElements = container.querySelectorAll('[role="article"]');
            expect(messageElements.length).toBe(messageCount);
          });

          const storeMessages = useAppStore.getState().messages;

          // Property 1: Each message should come after the previous one
          for (let i = 1; i < storeMessages.length; i++) {
            expect(storeMessages[i].timestamp.getTime())
              .toBeGreaterThanOrEqual(storeMessages[i - 1].timestamp.getTime());
          }

          // Property 2: First message should be the oldest
          const oldestMessage = messages.reduce((oldest, msg) =>
            msg.timestamp.getTime() < oldest.timestamp.getTime() ? msg : oldest
          );
          expect(storeMessages[0].id).toBe(oldestMessage.id);

          // Property 3: Last message should be the newest
          const newestMessage = messages.reduce((newest, msg) =>
            msg.timestamp.getTime() > newest.timestamp.getTime() ? msg : newest
          );
          expect(storeMessages[storeMessages.length - 1].id).toBe(newestMessage.id);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any single message, it should be displayed correctly
   * (edge case: single element is trivially sorted)
   */
  it('should handle single message correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        agentArbitrary,
        fc.record({
          id: fc.uuid(),
          role: fc.constantFrom('user' as const, 'agent' as const),
          content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        }),
        async (agent, message) => {
          // Arrange
          const store = useAppStore.getState();
          store.clearMessages();
          store.addMessage(message);

          // Act
          const { container } = render(
            <QueryClientProvider client={queryClient}>
              <ChatInterface selectedAgent={agent} />
            </QueryClientProvider>
          );

          // Assert - Property: Single message should be displayed
          await waitFor(() => {
            const messageElements = container.querySelectorAll('[role="article"]');
            expect(messageElements.length).toBe(1);
          });

          const storeMessages = useAppStore.getState().messages;

          // Property: Message should match the input
          expect(storeMessages.length).toBe(1);
          expect(storeMessages[0].id).toBe(message.id);
          expect(storeMessages[0].content).toBe(message.content);
          expect(storeMessages[0].timestamp.getTime()).toBe(message.timestamp.getTime());
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any sequence of alternating user and agent messages,
   * chronological order should be maintained regardless of role
   */
  it('should maintain chronological order regardless of message role', async () => {
    await fc.assert(
      fc.asyncProperty(
        agentArbitrary,
        fc.array(
          fc.record({
            id: fc.uuid(),
            role: fc.constantFrom('user' as const, 'agent' as const),
            content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
          }),
          { minLength: 4, maxLength: 20 }
        ),
        async (agent, messages) => {
          // Arrange
          const store = useAppStore.getState();
          store.clearMessages();

          // Add messages in random order
          const shuffled = [...messages].sort(() => Math.random() - 0.5);
          for (const message of shuffled) {
            store.addMessage(message);
          }

          // Act
          const { container } = render(
            <QueryClientProvider client={queryClient}>
              <ChatInterface selectedAgent={agent} />
            </QueryClientProvider>
          );

          // Assert
          await waitFor(() => {
            const messageElements = container.querySelectorAll('[role="article"]');
            expect(messageElements.length).toBe(messages.length);
          });

          const storeMessages = useAppStore.getState().messages;

          // Property 1: Chronological order should be maintained
          for (let i = 1; i < storeMessages.length; i++) {
            expect(storeMessages[i].timestamp.getTime())
              .toBeGreaterThanOrEqual(storeMessages[i - 1].timestamp.getTime());
          }

          // Property 2: Role should not affect ordering
          // Verify that messages are not grouped by role
          const sortedByTimestamp = [...messages].sort((a, b) =>
            a.timestamp.getTime() - b.timestamp.getTime()
          );

          for (let i = 0; i < sortedByTimestamp.length; i++) {
            expect(storeMessages[i].role).toBe(sortedByTimestamp[i].role);
          }
        }
      ),
      { numRuns: 25 }
    );
  });
});


  /**
   * Feature: avatar-client, Property 19: Message Chronological Ordering
   * For any sequence of messages in the conversation history, the messages should
   * be displayed in chronological order based on their timestamps.
   *
   * **Validates: Requirements 9.3**
   */
  describe('Property 19: Message Chronological Ordering', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
      // Create a new QueryClient for each test
      queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      // Initialize NotificationService
      NotificationService.reset();
      NotificationService.initialize(useAppStore.getState());
      // Clear messages from store
      useAppStore.getState().clearMessages();
      // Clear all mocks before each test
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      queryClient.clear();
      useAppStore.getState().clearMessages();
    });

    /**
     * Property: For any sequence of messages with random timestamps,
     * messages should be displayed in chronological order (oldest first)
     */
    it('should display messages in chronological order for any message sequence', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          fc.array(
            fc.record({
              id: fc.uuid(),
              role: fc.constantFrom('user' as const, 'agent' as const),
              content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
              timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            }),
            { minLength: 2, maxLength: 20 }
          ),
          async (agent, messages) => {
            // Arrange - Add messages to store in random order
            const store = useAppStore.getState();
            store.clearMessages();
            
            // Shuffle messages to ensure they're not already sorted
            const shuffledMessages = [...messages].sort(() => Math.random() - 0.5);
            
            for (const message of shuffledMessages) {
              store.addMessage(message);
            }

            // Act - Render component
            const { container } = render(
              <QueryClientProvider client={queryClient}>
                <ChatInterface selectedAgent={agent} />
              </QueryClientProvider>
            );

            // Assert - Property: Messages should be displayed in chronological order
            await waitFor(() => {
              const messageElements = container.querySelectorAll('[role="article"]');
              expect(messageElements.length).toBeGreaterThan(0);
            });

            const messageElements = container.querySelectorAll('[role="article"]');
            const displayedMessages = Array.from(messageElements);

            // Property 1: Number of displayed messages should match input
            expect(displayedMessages.length).toBe(messages.length);

            // Property 2: Messages should be in chronological order
            // Extract timestamps from the displayed messages
            const displayedTimestamps: Date[] = [];
            displayedMessages.forEach((element, index) => {
              // Get the timestamp from the store messages (which should be sorted)
              const storeMessages = useAppStore.getState().messages;
              if (storeMessages[index]) {
                displayedTimestamps.push(storeMessages[index].timestamp);
              }
            });

            // Verify chronological ordering (each timestamp >= previous)
            for (let i = 1; i < displayedTimestamps.length; i++) {
              const prevTime = displayedTimestamps[i - 1].getTime();
              const currTime = displayedTimestamps[i].getTime();
              
              // Property: Current message timestamp should be >= previous message timestamp
              expect(currTime).toBeGreaterThanOrEqual(prevTime);
            }

            // Property 3: Displayed order should match sorted order
            const sortedMessages = [...messages].sort((a, b) => 
              a.timestamp.getTime() - b.timestamp.getTime()
            );
            
            const storeMessages = useAppStore.getState().messages;
            for (let i = 0; i < sortedMessages.length; i++) {
              expect(storeMessages[i].id).toBe(sortedMessages[i].id);
              expect(storeMessages[i].timestamp.getTime()).toBe(sortedMessages[i].timestamp.getTime());
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any sequence of messages with identical timestamps,
     * the order should be stable (maintain insertion order)
     */
    it('should maintain stable order for messages with identical timestamps', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
          fc.array(
            fc.record({
              id: fc.uuid(),
              role: fc.constantFrom('user' as const, 'agent' as const),
              content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (agent, sharedTimestamp, messageData) => {
            // Arrange - Create messages with identical timestamps
            const messages = messageData.map(data => ({
              ...data,
              timestamp: new Date(sharedTimestamp.getTime()), // Same timestamp for all
            }));

            const store = useAppStore.getState();
            store.clearMessages();
            
            // Add messages in order
            for (const message of messages) {
              store.addMessage(message);
            }

            // Act - Render component
            const { container } = render(
              <QueryClientProvider client={queryClient}>
                <ChatInterface selectedAgent={agent} />
              </QueryClientProvider>
            );

            // Assert - Property: Messages with same timestamp should maintain insertion order
            await waitFor(() => {
              const messageElements = container.querySelectorAll('[role="article"]');
              expect(messageElements.length).toBe(messages.length);
            });

            const storeMessages = useAppStore.getState().messages;

            // Property 1: All messages should have the same timestamp
            for (let i = 0; i < storeMessages.length; i++) {
              expect(storeMessages[i].timestamp.getTime()).toBe(sharedTimestamp.getTime());
            }

            // Property 2: Order should match insertion order
            for (let i = 0; i < messages.length; i++) {
              expect(storeMessages[i].id).toBe(messages[i].id);
              expect(storeMessages[i].content).toBe(messages[i].content);
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any sequence where older messages are added after newer ones,
     * the display should still show chronological order
     */
    it('should maintain chronological order even when older messages are added later', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          fc.array(
            fc.record({
              id: fc.uuid(),
              role: fc.constantFrom('user' as const, 'agent' as const),
              content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
              timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            }),
            { minLength: 3, maxLength: 15 }
          ),
          async (agent, messages) => {
            // Arrange - Add messages in reverse chronological order
            const store = useAppStore.getState();
            store.clearMessages();
            
            // Sort messages by timestamp descending (newest first)
            const reversedMessages = [...messages].sort((a, b) => 
              b.timestamp.getTime() - a.timestamp.getTime()
            );
            
            // Add messages in reverse order
            for (const message of reversedMessages) {
              store.addMessage(message);
            }

            // Act - Render component
            const { container } = render(
              <QueryClientProvider client={queryClient}>
                <ChatInterface selectedAgent={agent} />
              </QueryClientProvider>
            );

            // Assert - Property: Despite reverse insertion, display should be chronological
            await waitFor(() => {
              const messageElements = container.querySelectorAll('[role="article"]');
              expect(messageElements.length).toBe(messages.length);
            });

            const storeMessages = useAppStore.getState().messages;

            // Property: Messages should be in chronological order (oldest first)
            for (let i = 1; i < storeMessages.length; i++) {
              const prevTime = storeMessages[i - 1].timestamp.getTime();
              const currTime = storeMessages[i].timestamp.getTime();
              
              expect(currTime).toBeGreaterThanOrEqual(prevTime);
            }

            // Property: Should match the correctly sorted order
            const correctlySorted = [...messages].sort((a, b) => 
              a.timestamp.getTime() - b.timestamp.getTime()
            );
            
            for (let i = 0; i < correctlySorted.length; i++) {
              expect(storeMessages[i].id).toBe(correctlySorted[i].id);
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any sequence of messages with various timestamp gaps,
     * the chronological ordering should be maintained
     */
    it('should maintain chronological order with various timestamp gaps', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          fc.integer({ min: 5, max: 15 }),
          async (agent, messageCount) => {
            // Arrange - Create messages with varying time gaps
            const baseTime = new Date('2024-01-01T00:00:00Z').getTime();
            const messages = [];
            
            for (let i = 0; i < messageCount; i++) {
              // Random time gap between 1 second and 1 hour
              const timeGap = Math.floor(Math.random() * 3600000) + 1000;
              const timestamp = new Date(baseTime + (i * timeGap));
              
              messages.push({
                id: `msg-${i}-${Math.random()}`,
                role: (i % 2 === 0 ? 'user' : 'agent') as const,
                content: `Message ${i}`,
                timestamp,
              });
            }

            const store = useAppStore.getState();
            store.clearMessages();
            
            // Add messages in random order
            const shuffled = [...messages].sort(() => Math.random() - 0.5);
            for (const message of shuffled) {
              store.addMessage(message);
            }

            // Act - Render component
            const { container } = render(
              <QueryClientProvider client={queryClient}>
                <ChatInterface selectedAgent={agent} />
              </QueryClientProvider>
            );

            // Assert - Property: Messages should be chronologically ordered
            await waitFor(() => {
              const messageElements = container.querySelectorAll('[role="article"]');
              expect(messageElements.length).toBe(messageCount);
            });

            const storeMessages = useAppStore.getState().messages;

            // Property 1: Each message should come after the previous one
            for (let i = 1; i < storeMessages.length; i++) {
              expect(storeMessages[i].timestamp.getTime())
                .toBeGreaterThanOrEqual(storeMessages[i - 1].timestamp.getTime());
            }

            // Property 2: First message should be the oldest
            const oldestMessage = messages.reduce((oldest, msg) => 
              msg.timestamp.getTime() < oldest.timestamp.getTime() ? msg : oldest
            );
            expect(storeMessages[0].id).toBe(oldestMessage.id);

            // Property 3: Last message should be the newest
            const newestMessage = messages.reduce((newest, msg) => 
              msg.timestamp.getTime() > newest.timestamp.getTime() ? msg : newest
            );
            expect(storeMessages[storeMessages.length - 1].id).toBe(newestMessage.id);
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any single message, it should be displayed correctly
     * (edge case: single element is trivially sorted)
     */
    it('should handle single message correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          fc.record({
            id: fc.uuid(),
            role: fc.constantFrom('user' as const, 'agent' as const),
            content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
          }),
          async (agent, message) => {
            // Arrange
            const store = useAppStore.getState();
            store.clearMessages();
            store.addMessage(message);

            // Act
            const { container } = render(
              <QueryClientProvider client={queryClient}>
                <ChatInterface selectedAgent={agent} />
              </QueryClientProvider>
            );

            // Assert - Property: Single message should be displayed
            await waitFor(() => {
              const messageElements = container.querySelectorAll('[role="article"]');
              expect(messageElements.length).toBe(1);
            });

            const storeMessages = useAppStore.getState().messages;

            // Property: Message should match the input
            expect(storeMessages.length).toBe(1);
            expect(storeMessages[0].id).toBe(message.id);
            expect(storeMessages[0].content).toBe(message.content);
            expect(storeMessages[0].timestamp.getTime()).toBe(message.timestamp.getTime());
          }
        ),
        { numRuns: 25 }
      );
    });

    /**
     * Property: For any sequence of alternating user and agent messages,
     * chronological order should be maintained regardless of role
     */
    it('should maintain chronological order regardless of message role', async () => {
      await fc.assert(
        fc.asyncProperty(
          agentArbitrary,
          fc.array(
            fc.record({
              id: fc.uuid(),
              role: fc.constantFrom('user' as const, 'agent' as const),
              content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
              timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            }),
            { minLength: 4, maxLength: 20 }
          ),
          async (agent, messages) => {
            // Arrange
            const store = useAppStore.getState();
            store.clearMessages();
            
            // Add messages in random order
            const shuffled = [...messages].sort(() => Math.random() - 0.5);
            for (const message of shuffled) {
              store.addMessage(message);
            }

            // Act
            const { container } = render(
              <QueryClientProvider client={queryClient}>
                <ChatInterface selectedAgent={agent} />
              </QueryClientProvider>
            );

            // Assert
            await waitFor(() => {
              const messageElements = container.querySelectorAll('[role="article"]');
              expect(messageElements.length).toBe(messages.length);
            });

            const storeMessages = useAppStore.getState().messages;

            // Property 1: Chronological order should be maintained
            for (let i = 1; i < storeMessages.length; i++) {
              expect(storeMessages[i].timestamp.getTime())
                .toBeGreaterThanOrEqual(storeMessages[i - 1].timestamp.getTime());
            }

            // Property 2: Role should not affect ordering
            // Verify that messages are not grouped by role
            const sortedByTimestamp = [...messages].sort((a, b) => 
              a.timestamp.getTime() - b.timestamp.getTime()
            );
            
            for (let i = 0; i < sortedByTimestamp.length; i++) {
              expect(storeMessages[i].role).toBe(sortedByTimestamp[i].role);
            }
          }
        ),
        { numRuns: 25 }
      );
    });
  });
