import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { BrainApiRepository } from '../repositories/BrainApiRepository';
import { logger } from '../logger';

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

/**
 * Property 15: HTTP Headers in API Requests
 * 
 * **Validates: Requirements 6.4**
 * 
 * For any HTTP request to the Brain API, the request should include proper headers
 * including Content-Type: application/json.
 */
describe('Property 15: HTTP Headers in API Requests', () => {
  let repository: BrainApiRepository;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    repository = new BrainApiRepository();
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should include Content-Type: application/json header in all sendMessage requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary agent IDs and messages
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        async (agentId, message) => {
          // Clear previous calls
          fetchMock.mockClear();
          
          // Mock successful response
          fetchMock.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
              message: 'Response',
              agentId,
              timestamp: new Date().toISOString(),
            }),
          });

          // Execute the request
          await repository.sendMessage(agentId, message);

          // Property 1: fetch should have been called
          expect(fetchMock).toHaveBeenCalledTimes(1);

          // Property 2: Request should include Content-Type header
          const callArgs = fetchMock.mock.calls[0];
          expect(callArgs).toBeDefined();
          expect(callArgs[1]).toBeDefined();
          expect(callArgs[1].headers).toBeDefined();

          // Property 3: Content-Type should be application/json
          const headers = callArgs[1].headers as Record<string, string>;
          expect(headers['Content-Type']).toBe('application/json');
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should include Content-Type: application/json header in all getAgents requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary number of agents to return
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            description: fc.option(fc.string({ minLength: 0, maxLength: 200 })),
            voice: fc.string({ minLength: 1, maxLength: 50 }),
            language: fc.constantFrom('en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        async (agents) => {
          // Clear previous calls
          fetchMock.mockClear();
          
          // Mock successful response
          fetchMock.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ agents }),
          });

          // Execute the request
          await repository.getAgents();

          // Property 1: fetch should have been called
          expect(fetchMock).toHaveBeenCalledTimes(1);

          // Property 2: Request should include Content-Type header
          const callArgs = fetchMock.mock.calls[0];
          expect(callArgs).toBeDefined();
          expect(callArgs[1]).toBeDefined();
          expect(callArgs[1].headers).toBeDefined();

          // Property 3: Content-Type should be application/json
          const headers = callArgs[1].headers as Record<string, string>;
          expect(headers['Content-Type']).toBe('application/json');
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should maintain proper headers even after retry attempts', async () => {
    // Mock setTimeout to avoid actual delays during retries
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = ((callback: () => void) => {
      callback();
      return 0 as unknown as NodeJS.Timeout;
    }) as unknown as typeof setTimeout;

    try {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary agent IDs and messages
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 500 }),
          // Generate number of retries (1-2, since max is 3 attempts total)
          fc.integer({ min: 1, max: 2 }),
          async (agentId, message, numRetries) => {
            // Clear previous calls
            fetchMock.mockClear();
            
            // Mock network errors for retry attempts, then success
            const networkError = new Error('Network error');
            for (let i = 0; i < numRetries; i++) {
              fetchMock.mockRejectedValueOnce(networkError);
            }
            fetchMock.mockResolvedValueOnce({
              ok: true,
              status: 200,
              json: async () => ({
                message: 'Response',
                agentId,
                timestamp: new Date().toISOString(),
              }),
            });

            // Execute the request
            await repository.sendMessage(agentId, message);

            // Property 1: fetch should have been called numRetries + 1 times
            expect(fetchMock).toHaveBeenCalledTimes(numRetries + 1);

            // Property 2: All requests should include Content-Type header
            for (let i = 0; i < numRetries + 1; i++) {
              const callArgs = fetchMock.mock.calls[i];
              expect(callArgs).toBeDefined();
              expect(callArgs[1]).toBeDefined();
              expect(callArgs[1].headers).toBeDefined();

              // Property 3: Content-Type should be application/json in all attempts
              const headers = callArgs[1].headers as Record<string, string>;
              expect(headers['Content-Type']).toBe('application/json');
            }
          }
        ),
        { numRuns: 25 }
      );
    } finally {
      // Restore setTimeout
      global.setTimeout = originalSetTimeout;
    }
  });

  it('should include proper headers regardless of request success or failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary agent IDs and messages
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        // Generate various HTTP status codes (both success and error)
        fc.constantFrom(200, 201, 400, 401, 403, 404, 500, 502, 503),
        async (agentId, message, statusCode) => {
          // Clear previous calls
          fetchMock.mockClear();
          
          // Mock response with given status code
          fetchMock.mockResolvedValueOnce({
            ok: statusCode >= 200 && statusCode < 300,
            status: statusCode,
            statusText: 'Status',
            json: async () => ({
              message: statusCode < 400 ? 'Success' : 'Error',
              agentId,
              timestamp: new Date().toISOString(),
            }),
          });

          // Execute the request
          await repository.sendMessage(agentId, message);

          // Property 1: fetch should have been called
          expect(fetchMock).toHaveBeenCalledTimes(1);

          // Property 2: Request should include Content-Type header regardless of outcome
          const callArgs = fetchMock.mock.calls[0];
          expect(callArgs).toBeDefined();
          expect(callArgs[1]).toBeDefined();
          expect(callArgs[1].headers).toBeDefined();

          // Property 3: Content-Type should be application/json
          const headers = callArgs[1].headers as Record<string, string>;
          expect(headers['Content-Type']).toBe('application/json');
        }
      ),
      { numRuns: 25 }
    );
  });
});

/**
 * Property 17: Request Timeout Handling
 * 
 * **Validates: Requirements 6.7**
 * 
 * For any Brain API request that exceeds 30 seconds, the request should timeout
 * and trigger error handling with appropriate timeout error type.
 */
describe('Property 17: Request Timeout Handling', () => {
  let repository: BrainApiRepository;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    repository = new BrainApiRepository();
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should timeout sendMessage requests after 30 seconds and return TIMEOUT error', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary agent IDs and messages
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        async (agentId, message) => {
          // Clear previous calls
          fetchMock.mockClear();
          
          // Mock a request that simulates timeout by throwing AbortError
          fetchMock.mockImplementationOnce(() => {
            return new Promise((_, reject) => {
              const error = new Error('The operation was aborted');
              error.name = 'AbortError';
              reject(error);
            });
          });

          // Execute the request
          const result = await repository.sendMessage(agentId, message);

          // Property 1: Result should indicate failure
          expect(result.success).toBe(false);

          // Property 2: Error type should be TIMEOUT
          if (!result.success) {
            expect(result.error.type).toBe('TIMEOUT');
            
            // Property 3: Error should include timeout duration
            if (result.error.type === 'TIMEOUT') {
              expect(result.error.duration).toBe(30000);
            }
          }

          // Property 4: Should not retry on timeout (only 1 fetch call)
          expect(fetchMock).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should timeout getAgents requests after 30 seconds and return TIMEOUT error', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary test iteration number (for variety)
        fc.integer({ min: 1, max: 100 }),
        async () => {
          // Clear previous calls
          fetchMock.mockClear();
          
          // Mock a request that simulates timeout by throwing AbortError
          fetchMock.mockImplementationOnce(() => {
            return new Promise((_, reject) => {
              const error = new Error('The operation was aborted');
              error.name = 'AbortError';
              reject(error);
            });
          });

          // Execute the request
          const result = await repository.getAgents();

          // Property 1: Result should indicate failure
          expect(result.success).toBe(false);

          // Property 2: Error type should be TIMEOUT
          if (!result.success) {
            expect(result.error.type).toBe('TIMEOUT');
            
            // Property 3: Error should include timeout duration
            if (result.error.type === 'TIMEOUT') {
              expect(result.error.duration).toBe(30000);
            }
          }

          // Property 4: Should not retry on timeout (only 1 fetch call)
          expect(fetchMock).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should distinguish timeout errors from network errors', async () => {
    // Mock setTimeout to avoid actual delays during retries
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = ((callback: () => void) => {
      callback();
      return 0 as unknown as NodeJS.Timeout;
    }) as unknown as typeof setTimeout;

    try {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary agent IDs and messages
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 500 }),
          // Generate error type: true for timeout, false for network error
          fc.boolean(),
          async (agentId, message, isTimeout) => {
            // Clear previous calls
            fetchMock.mockClear();
            
            if (isTimeout) {
              // Mock timeout error
              fetchMock.mockImplementationOnce(() => {
                return new Promise((_, reject) => {
                  const error = new Error('The operation was aborted');
                  error.name = 'AbortError';
                  reject(error);
                });
              });
            } else {
              // Mock network error (all 3 attempts fail)
              const networkError = new Error('Network connection failed');
              fetchMock
                .mockRejectedValueOnce(networkError)
                .mockRejectedValueOnce(networkError)
                .mockRejectedValueOnce(networkError);
            }

            // Execute the request
            const result = await repository.sendMessage(agentId, message);

            // Property 1: Result should indicate failure
            expect(result.success).toBe(false);

            if (!result.success) {
              if (isTimeout) {
                // Property 2a: Timeout errors should have TIMEOUT type
                expect(result.error.type).toBe('TIMEOUT');
                if (result.error.type === 'TIMEOUT') {
                  expect(result.error.duration).toBe(30000);
                }
                // Property 3a: Timeout should not retry
                expect(fetchMock).toHaveBeenCalledTimes(1);
              } else {
                // Property 2b: Network errors should have NETWORK_ERROR type
                expect(result.error.type).toBe('NETWORK_ERROR');
                if (result.error.type === 'NETWORK_ERROR') {
                  expect(result.error.message).toBeTruthy();
                }
                // Property 3b: Network errors should retry (3 attempts)
                expect(fetchMock).toHaveBeenCalledTimes(3);
              }
            }
          }
        ),
        { numRuns: 25 }
      );
    } finally {
      // Restore setTimeout
      global.setTimeout = originalSetTimeout;
    }
  });

  it('should log timeout errors with appropriate context', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary agent IDs and messages
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        async (agentId, message) => {
          // Clear previous calls
          fetchMock.mockClear();
          vi.clearAllMocks();
          
          // Mock timeout error
          fetchMock.mockImplementationOnce(() => {
            return new Promise((_, reject) => {
              const error = new Error('The operation was aborted');
              error.name = 'AbortError';
              reject(error);
            });
          });

          // Execute the request
          await repository.sendMessage(agentId, message);

          // Property 1: Should log error with timeout context
          expect(logger.error).toHaveBeenCalledWith(
            'API request timeout',
            expect.objectContaining({
              component: 'BrainApiRepository',
              duration: 30000,
              attempt: 1,
            })
          );
        }
      ),
      { numRuns: 25 }
    );
  });

  it('should handle timeout consistently across different request types', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate request type: true for sendMessage, false for getAgents
        fc.boolean(),
        // Generate arbitrary data for sendMessage
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        async (isSendMessage, agentId, message) => {
          // Clear previous calls
          fetchMock.mockClear();
          
          // Mock timeout error
          fetchMock.mockImplementationOnce(() => {
            return new Promise((_, reject) => {
              const error = new Error('The operation was aborted');
              error.name = 'AbortError';
              reject(error);
            });
          });

          // Execute the appropriate request
          const result = isSendMessage
            ? await repository.sendMessage(agentId, message)
            : await repository.getAgents();

          // Property 1: Both request types should handle timeout the same way
          expect(result.success).toBe(false);

          if (!result.success) {
            // Property 2: Error type should be TIMEOUT
            expect(result.error.type).toBe('TIMEOUT');
            
            // Property 3: Error should include 30-second duration
            if (result.error.type === 'TIMEOUT') {
              expect(result.error.duration).toBe(30000);
            }
          }

          // Property 4: Should not retry on timeout
          expect(fetchMock).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 25 }
    );
  });
});
