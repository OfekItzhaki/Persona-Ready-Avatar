import { logger } from '../logger';
import { getEnvConfig } from '../env';
import type {
  IBrainApiRepository,
  ChatResponse,
  Agent,
  ApiError,
  Result,
  SendMessageRequest,
  AgentsResponse,
} from '@/types';

/**
 * BrainApiRepository
 * 
 * Handles all communication with the Brain API, including:
 * - Sending chat messages
 * - Fetching available agents
 * - Error handling and transformation
 * - Request timeout management
 * - Retry logic with exponential backoff
 * - Structured logging
 */
export class BrainApiRepository implements IBrainApiRepository {
  private readonly baseUrl: string;
  private readonly timeout: number = 30000; // 30 seconds
  private readonly maxRetries: number = 3;

  constructor() {
    const config = getEnvConfig();
    this.baseUrl = config.brainApiUrl;
  }

  /**
   * Send a chat message to the Brain API
   * 
   * @param agentId - The ID of the agent to send the message to
   * @param message - The message text
   * @returns Result containing ChatResponse or ApiError
   */
  async sendMessage(agentId: string, message: string): Promise<Result<ChatResponse, ApiError>> {
    const endpoint = '/chat';
    const url = `${this.baseUrl}${endpoint}`;
    const method = 'POST';

    const payload: SendMessageRequest = {
      agentId,
      message,
    };

    logger.info('Sending chat message', {
      component: 'BrainApiRepository',
      endpoint,
      method,
      agentId,
    });

    return this.fetchWithRetry(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Fetch the list of available agents from the Brain API
   * 
   * @returns Result containing Agent array or ApiError
   */
  async getAgents(): Promise<Result<Agent[], ApiError>> {
    const endpoint = '/agents';
    const url = `${this.baseUrl}${endpoint}`;
    const method = 'GET';

    logger.info('Fetching agents', {
      component: 'BrainApiRepository',
      endpoint,
      method,
    });

    const result = await this.fetchWithRetry<AgentsResponse>(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (result.success) {
      return {
        success: true,
        data: result.data.agents,
      };
    }

    return result;
  }

  /**
   * Fetch with timeout wrapper
   * 
   * @param url - The URL to fetch
   * @param options - Fetch options
   * @returns Promise that rejects on timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Fetch with retry logic and exponential backoff
   * 
   * @param url - The URL to fetch
   * @param options - Fetch options
   * @param attempt - Current attempt number (for recursion)
   * @returns Result containing parsed response or ApiError
   */
  private async fetchWithRetry<T = ChatResponse>(
    url: string,
    options: RequestInit,
    attempt: number = 1
  ): Promise<Result<T, ApiError>> {
    try {
      const response = await this.fetchWithTimeout(url, options);

      logger.info('API request completed', {
        component: 'BrainApiRepository',
        endpoint: url,
        method: options.method,
        status: response.status,
        attempt,
      });

      // Handle successful responses
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          data: data as T,
        };
      }

      // Handle HTTP error responses
      const errorDetails = await this.extractErrorDetails(response);
      const apiError: ApiError = {
        type: 'SERVER_ERROR',
        status: response.status,
        details: errorDetails,
      };

      logger.error('API request failed', {
        component: 'BrainApiRepository',
        endpoint: url,
        method: options.method,
        status: response.status,
        errorDetails,
        attempt,
      });

      return {
        success: false,
        error: apiError,
      };
    } catch (error) {
      const isTimeout = error instanceof Error && error.message === 'Request timeout';
      const isNetworkError = error instanceof Error && error.message !== 'Request timeout';

      // Handle timeout errors
      if (isTimeout) {
        const timeoutError: ApiError = {
          type: 'TIMEOUT',
          duration: this.timeout,
        };

        logger.error('API request timeout', {
          component: 'BrainApiRepository',
          endpoint: url,
          method: options.method,
          duration: this.timeout,
          attempt,
        });

        return {
          success: false,
          error: timeoutError,
        };
      }

      // Handle network errors with retry logic
      if (isNetworkError && attempt < this.maxRetries) {
        const backoffDelay = this.calculateBackoffDelay(attempt);

        logger.warn('Network error, retrying', {
          component: 'BrainApiRepository',
          endpoint: url,
          method: options.method,
          attempt,
          nextAttempt: attempt + 1,
          backoffDelay,
          error: error.message,
        });

        await this.delay(backoffDelay);
        return this.fetchWithRetry<T>(url, options, attempt + 1);
      }

      // Final network error after all retries
      const networkError: ApiError = {
        type: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Unknown network error',
      };

      logger.error('API request failed after retries', {
        component: 'BrainApiRepository',
        endpoint: url,
        method: options.method,
        attempts: attempt,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: networkError,
      };
    }
  }

  /**
   * Extract error details from response body
   * 
   * @param response - The HTTP response
   * @returns Error details string
   */
  private async extractErrorDetails(response: Response): Promise<string> {
    try {
      const body = await response.json();
      return body.error || body.message || `HTTP ${response.status} ${response.statusText}`;
    } catch {
      return `HTTP ${response.status} ${response.statusText}`;
    }
  }

  /**
   * Calculate exponential backoff delay
   * 
   * @param attempt - Current attempt number
   * @returns Delay in milliseconds
   */
  private calculateBackoffDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s
    return Math.pow(2, attempt - 1) * 1000;
  }

  /**
   * Delay helper for retry logic
   * 
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
