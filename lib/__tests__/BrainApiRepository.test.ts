import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrainApiRepository } from '../repositories/BrainApiRepository';
import { logger } from '../logger';
import * as envModule from '../env';
import type { ChatResponse, Agent, ApiError } from '@/types';

// Mock the logger
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the env module
vi.mock('../env', () => ({
  getEnvConfig: vi.fn(() => ({
    brainApiUrl: 'https://api.example.com',
    azureSpeechKey: 'test-key',
    azureSpeechRegion: 'test-region',
  })),
}));

describe('BrainApiRepository', () => {
  let repository: BrainApiRepository;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    repository = new BrainApiRepository();
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendMessage', () => {
    const agentId = 'agent-123';
    const message = 'Hello, world!';
    const mockResponse: ChatResponse = {
      message: 'Hello back!',
      agentId: 'agent-123',
      timestamp: '2024-01-01T00:00:00Z',
    };

    it('should successfully send a message and return ChatResponse', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await repository.sendMessage(agentId, message);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockResponse);
      }

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ agentId, message }),
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Sending chat message',
        expect.objectContaining({
          component: 'BrainApiRepository',
          endpoint: '/chat',
          method: 'POST',
          agentId,
        })
      );
    });

    it('should include proper HTTP headers in the request', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      await repository.sendMessage(agentId, message);

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[1].headers).toEqual({
        'Content-Type': 'application/json',
      });
    });

    it('should handle server errors with status code and details', async () => {
      const errorDetails = 'Invalid agent ID';
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: errorDetails }),
      });

      const result = await repository.sendMessage(agentId, message);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('SERVER_ERROR');
        if (result.error.type === 'SERVER_ERROR') {
          expect(result.error.status).toBe(400);
          expect(result.error.details).toBe(errorDetails);
        }
      }

      expect(logger.error).toHaveBeenCalledWith(
        'API request failed',
        expect.objectContaining({
          component: 'BrainApiRepository',
          status: 400,
          errorDetails,
        })
      );
    });

    it('should handle server errors with message field in response', async () => {
      const errorMessage = 'Agent not found';
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: errorMessage }),
      });

      const result = await repository.sendMessage(agentId, message);

      expect(result.success).toBe(false);
      if (!result.success && result.error.type === 'SERVER_ERROR') {
        expect(result.error.details).toBe(errorMessage);
      }
    });

    it('should handle server errors without JSON body', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await repository.sendMessage(agentId, message);

      expect(result.success).toBe(false);
      if (!result.success && result.error.type === 'SERVER_ERROR') {
        expect(result.error.details).toBe('HTTP 500 Internal Server Error');
      }
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network connection failed');
      // Mock all 3 retry attempts to fail with network error
      fetchMock
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError);

      const result = await repository.sendMessage(agentId, message);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('NETWORK_ERROR');
        if (result.error.type === 'NETWORK_ERROR') {
          expect(result.error.message).toBe('Network connection failed');
        }
      }
    });

    it('should handle timeout errors', async () => {
      fetchMock.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('Timeout');
            error.name = 'AbortError';
            reject(error);
          }, 0);
        });
      });

      const result = await repository.sendMessage(agentId, message);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('TIMEOUT');
        if (result.error.type === 'TIMEOUT') {
          expect(result.error.duration).toBe(30000);
        }
      }

      expect(logger.error).toHaveBeenCalledWith(
        'API request timeout',
        expect.objectContaining({
          component: 'BrainApiRepository',
          duration: 30000,
        })
      );
    });

    it('should retry on network errors with exponential backoff', async () => {
      const networkError = new Error('Network error');
      
      // Fail first two attempts, succeed on third
      fetchMock
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockResponse,
        });

      const result = await repository.sendMessage(agentId, message);

      expect(result.success).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(3);

      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        'Network error, retrying',
        expect.objectContaining({
          component: 'BrainApiRepository',
          attempt: 1,
          nextAttempt: 2,
          backoffDelay: 1000,
        })
      );
      expect(logger.warn).toHaveBeenCalledWith(
        'Network error, retrying',
        expect.objectContaining({
          attempt: 2,
          nextAttempt: 3,
          backoffDelay: 2000,
        })
      );
    });

    it('should fail after maximum retry attempts', async () => {
      const networkError = new Error('Network error');
      fetchMock.mockRejectedValue(networkError);

      const result = await repository.sendMessage(agentId, message);

      expect(result.success).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(3);

      expect(logger.error).toHaveBeenCalledWith(
        'API request failed after retries',
        expect.objectContaining({
          component: 'BrainApiRepository',
          attempts: 3,
        })
      );
    });

    it('should not retry on server errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid request' }),
      });

      const result = await repository.sendMessage(agentId, message);

      expect(result.success).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should not retry on timeout errors', async () => {
      fetchMock.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          const error = new Error('Timeout');
          error.name = 'AbortError';
          reject(error);
        });
      });

      const result = await repository.sendMessage(agentId, message);

      expect(result.success).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAgents', () => {
    const mockAgents: Agent[] = [
      {
        id: 'agent-1',
        name: 'Agent One',
        description: 'First agent',
        voice: 'en-US-JennyNeural',
        language: 'en-US',
      },
      {
        id: 'agent-2',
        name: 'Agent Two',
        voice: 'es-ES-ElviraNeural',
        language: 'es-ES',
      },
    ];

    it('should successfully fetch agents list', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ agents: mockAgents }),
      });

      const result = await repository.getAgents();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockAgents);
      }

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/agents',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Fetching agents',
        expect.objectContaining({
          component: 'BrainApiRepository',
          endpoint: '/agents',
          method: 'GET',
        })
      );
    });

    it('should handle empty agents list', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ agents: [] }),
      });

      const result = await repository.getAgents();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it('should handle server errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({ error: 'Service temporarily unavailable' }),
      });

      const result = await repository.getAgents();

      expect(result.success).toBe(false);
      if (!result.success && result.error.type === 'SERVER_ERROR') {
        expect(result.error.status).toBe(503);
        expect(result.error.details).toBe('Service temporarily unavailable');
      }
    });

    it('should handle network errors with retry', async () => {
      const networkError = new Error('Connection refused');
      
      fetchMock
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ agents: mockAgents }),
        });

      const result = await repository.getAgents();

      expect(result.success).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should handle timeout errors', async () => {
      fetchMock.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          const error = new Error('Timeout');
          error.name = 'AbortError';
          reject(error);
        });
      });

      const result = await repository.getAgents();

      expect(result.success).toBe(false);
      if (!result.success && result.error.type === 'TIMEOUT') {
        expect(result.error.duration).toBe(30000);
      }
    });
  });

  describe('exponential backoff', () => {
    it('should use correct backoff delays for retries', async () => {
      const networkError = new Error('Network error');
      const delays: number[] = [];
      
      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((callback: () => void, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0) as unknown as NodeJS.Timeout;
      }) as unknown as typeof setTimeout;

      fetchMock.mockRejectedValue(networkError);

      await repository.sendMessage('agent-1', 'test');

      // Restore setTimeout
      global.setTimeout = originalSetTimeout;

      // Should have delays for 2 retries: 1000ms, 2000ms
      expect(delays).toContain(1000);
      expect(delays).toContain(2000);
    });
  });

  describe('logging', () => {
    it('should log successful API requests', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ agents: [] }),
      });

      await repository.getAgents();

      expect(logger.info).toHaveBeenCalledWith(
        'API request completed',
        expect.objectContaining({
          component: 'BrainApiRepository',
          status: 200,
          attempt: 1,
        })
      );
    });

    it('should log retry attempts', async () => {
      const networkError = new Error('Network error');
      
      fetchMock
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ agents: [] }),
        });

      await repository.getAgents();

      expect(logger.warn).toHaveBeenCalledWith(
        'Network error, retrying',
        expect.objectContaining({
          component: 'BrainApiRepository',
          attempt: 1,
          nextAttempt: 2,
        })
      );
    });
  });

  describe('configuration', () => {
    it('should use base URL from environment configuration', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ agents: [] }),
      });

      await repository.getAgents();

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/agents',
        expect.any(Object)
      );
    });

    it('should construct correct URLs for different endpoints', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ message: 'test', agentId: 'test', timestamp: '2024-01-01' }),
      });

      await repository.sendMessage('agent-1', 'test');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/chat',
        expect.any(Object)
      );

      fetchMock.mockClear();
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ agents: [] }),
      });

      await repository.getAgents();
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/agents',
        expect.any(Object)
      );
    });
  });
});
