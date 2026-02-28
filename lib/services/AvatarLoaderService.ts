import { GLTF } from 'three-stdlib';
import { useGLTF } from '@react-three/drei';
import { AvatarLoadResult, AvatarLoadError } from '@/types';
import { avatarValidatorService } from './AvatarValidatorService';
import { logger } from '@/lib/logger';

/**
 * Configuration for AvatarLoaderService
 */
interface AvatarLoaderConfig {
  maxRetries: number;
  retryDelayMs: number;
  cacheEnabled: boolean;
  timeoutMs: number;
}

/**
 * AvatarLoaderService
 * 
 * Handles loading avatar models from URLs with retry logic, caching, and validation.
 * Implements exponential backoff for transient errors and distinguishes between
 * retryable and non-retryable errors.
 * 
 * Requirements: 1.1, 1.5, 4.7, 5.3, 5.4, 6.3, 6.4, 7.1, 7.4
 */
export class AvatarLoaderService {
  private config: AvatarLoaderConfig;
  private cache: Map<string, GLTF>;

  constructor(config?: Partial<AvatarLoaderConfig>) {
    this.config = {
      maxRetries: parseInt(process.env.NEXT_PUBLIC_AVATAR_MAX_RETRIES || '3', 10),
      retryDelayMs: 1000,
      cacheEnabled: true,
      timeoutMs: parseInt(process.env.NEXT_PUBLIC_AVATAR_LOAD_TIMEOUT || '10000', 10),
      ...config,
    };
    this.cache = new Map();
  }

  /**
   * Loads an avatar model from a URL with retry logic and validation
   * 
   * @param url - URL to the GLB model (local or remote)
   * @returns Promise resolving to AvatarLoadResult
   */
  async loadAvatar(url: string): Promise<AvatarLoadResult> {
    const startTime = performance.now();

    // Check cache first (Requirement 7.4)
    if (this.config.cacheEnabled && this.cache.has(url)) {
      logger.info('Avatar loaded from cache', {
        component: 'AvatarLoaderService',
        url,
        loadTimeMs: performance.now() - startTime,
      });

      return {
        success: true,
        model: this.cache.get(url)!,
        fromCache: true,
      };
    }

    // Attempt to load with retry logic
    let lastError: AvatarLoadError | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Add delay for retries (exponential backoff)
        if (attempt > 0) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
          logger.info(`Retrying avatar load after ${delay}ms`, {
            component: 'AvatarLoaderService',
            url,
            attempt,
            delay,
          });
          await this.sleep(delay);
        }

        // Load the model with timeout
        const model = await this.loadWithTimeout(url, this.config.timeoutMs);

        // Validate the model
        const validationResult = avatarValidatorService.validateModel(model);

        if (!validationResult.valid) {
          // Model is invalid - non-retryable error
          const errorDetails = validationResult.errors.map((e) => e.message).join(', ');
          lastError = {
            type: 'INVALID_FORMAT',
            details: errorDetails,
            retryable: false,
          };

          logger.error('Avatar validation failed', {
            component: 'AvatarLoaderService',
            url,
            errors: validationResult.errors,
          });

          break; // Don't retry invalid models
        }

        // Log warnings if any
        if (validationResult.warnings.length > 0) {
          logger.warn('Avatar loaded with warnings', {
            component: 'AvatarLoaderService',
            url,
            warnings: validationResult.warnings,
          });
        }

        // Cache the model
        if (this.config.cacheEnabled) {
          this.cache.set(url, model);
        }

        const loadTimeMs = performance.now() - startTime;
        logger.info('Avatar loaded successfully', {
          component: 'AvatarLoaderService',
          url,
          attempt,
          loadTimeMs,
          metadata: validationResult.metadata,
        });

        return {
          success: true,
          model,
          fromCache: false,
        };
      } catch (error) {
        lastError = this.categorizeError(error, url);

        logger.warn('Avatar load attempt failed', {
          component: 'AvatarLoaderService',
          url,
          attempt,
          error: lastError,
        });

        // Don't retry non-retryable errors
        if (!lastError.retryable) {
          break;
        }
      }
    }

    // All attempts failed
    logger.error('Avatar load failed after all retries', {
      component: 'AvatarLoaderService',
      url,
      attempts: this.config.maxRetries + 1,
      error: lastError,
    });

    return {
      success: false,
      error: lastError || {
        type: 'NETWORK_ERROR',
        message: 'Unknown error occurred',
        retryable: true,
      },
      fromCache: false,
    };
  }

  /**
   * Loads a model with a timeout
   * 
   * @param url - URL to load
   * @param timeoutMs - Timeout in milliseconds
   * @returns Promise resolving to GLTF model
   */
  private async loadWithTimeout(url: string, timeoutMs: number): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      // Use useGLTF's preload mechanism to load the model
      // This is a workaround since useGLTF is a hook and can't be called here directly
      // We'll use the GLTFLoader directly instead
      import('three-stdlib').then(({ GLTFLoader }) => {
        const loader = new GLTFLoader();
        
        loader.load(
          url,
          (gltf) => {
            clearTimeout(timeoutId);
            resolve(gltf);
          },
          undefined,
          (error) => {
            clearTimeout(timeoutId);
            reject(error);
          }
        );
      }).catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  /**
   * Categorizes an error into an AvatarLoadError type
   * 
   * @param error - The error that occurred
   * @param url - The URL that was being loaded
   * @returns Categorized AvatarLoadError
   */
  private categorizeError(error: unknown, url: string): AvatarLoadError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    // Timeout error
    if (lowerMessage.includes('timeout')) {
      return {
        type: 'TIMEOUT',
        duration: this.config.timeoutMs,
        retryable: true,
      };
    }

    // 404 Not Found
    if (lowerMessage.includes('404') || lowerMessage.includes('not found')) {
      return {
        type: 'NOT_FOUND',
        url,
        retryable: false,
      };
    }

    // Invalid format / parse error
    if (
      lowerMessage.includes('parse') ||
      lowerMessage.includes('invalid') ||
      lowerMessage.includes('format') ||
      lowerMessage.includes('corrupted')
    ) {
      return {
        type: 'INVALID_FORMAT',
        details: errorMessage,
        retryable: false,
      };
    }

    // WebGL error
    if (lowerMessage.includes('webgl') || lowerMessage.includes('gpu')) {
      return {
        type: 'WEBGL_ERROR',
        message: errorMessage,
        retryable: false,
      };
    }

    // Default to network error (retryable)
    return {
      type: 'NETWORK_ERROR',
      message: errorMessage,
      retryable: true,
    };
  }

  /**
   * Clears the cache for a specific URL or all URLs
   * 
   * @param url - Optional URL to clear from cache. If not provided, clears all.
   */
  clearCache(url?: string): void {
    if (url) {
      this.cache.delete(url);
      // Also clear from useGLTF cache
      useGLTF.clear(url);
      logger.info('Cleared avatar cache for URL', {
        component: 'AvatarLoaderService',
        url,
      });
    } else {
      this.cache.clear();
      // Note: useGLTF.clear() requires a URL, so we can't clear all from drei cache
      logger.info('Cleared all avatar cache from service', {
        component: 'AvatarLoaderService',
      });
    }
  }

  /**
   * Preloads an avatar model into cache
   * 
   * @param url - URL to preload
   */
  async preloadAvatar(url: string): Promise<void> {
    logger.info('Preloading avatar', {
      component: 'AvatarLoaderService',
      url,
    });

    await this.loadAvatar(url);
  }

  /**
   * Helper function to sleep for a specified duration
   * 
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const avatarLoaderService = new AvatarLoaderService();
