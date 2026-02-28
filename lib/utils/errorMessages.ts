import type { ApiError } from '@/types';

/**
 * Error message configuration for user-friendly error notifications
 * 
 * Requirements:
 * - 38.1: Display user-friendly error notifications
 * - 38.2: Include error type and suggested actions
 */

export interface ErrorMessageConfig {
  message: string;
  suggestedAction: string;
}

/**
 * Get user-friendly error message and suggested action based on error type
 * 
 * @param error - The API error object
 * @returns Error message configuration with message and suggested action
 */
export function getErrorMessage(error: ApiError): ErrorMessageConfig {
  switch (error.type) {
    case 'NETWORK_ERROR':
      return {
        message: 'Unable to connect to the server. Please check your internet connection.',
        suggestedAction: 'Check your network connection and try again.',
      };

    case 'TIMEOUT':
      return {
        message: `Request timed out after ${Math.round(error.duration / 1000)} seconds.`,
        suggestedAction: 'The server is taking too long to respond. Please try again.',
      };

    case 'SERVER_ERROR':
      if (error.status >= 500) {
        return {
          message: 'The server encountered an error. This is not your fault.',
          suggestedAction: 'Please try again in a few moments. If the problem persists, contact support.',
        };
      } else if (error.status === 429) {
        return {
          message: 'Too many requests. Please slow down.',
          suggestedAction: 'Wait a moment before trying again.',
        };
      } else if (error.status === 401 || error.status === 403) {
        return {
          message: 'Authentication failed.',
          suggestedAction: 'Please check your credentials and try again.',
        };
      } else if (error.status === 404) {
        return {
          message: 'The requested resource was not found.',
          suggestedAction: 'Please check your configuration and try again.',
        };
      } else {
        return {
          message: `Server error: ${error.details}`,
          suggestedAction: 'Please try again or contact support if the problem persists.',
        };
      }

    case 'VALIDATION_ERROR':
      return {
        message: `Invalid input: ${error.fields.join(', ')}`,
        suggestedAction: 'Please check your input and try again.',
      };

    default:
      return {
        message: 'An unexpected error occurred.',
        suggestedAction: 'Please try again.',
      };
  }
}

/**
 * Format error message for display in notification
 * Combines the main message with suggested action
 * 
 * @param error - The API error object
 * @returns Formatted error message string
 */
export function formatErrorNotification(error: ApiError): string {
  const config = getErrorMessage(error);
  return `${config.message} ${config.suggestedAction}`;
}
