import { describe, it, expect } from 'vitest';
import { getErrorMessage, formatErrorNotification } from '../errorMessages';
import type { ApiError } from '@/types';

describe('errorMessages', () => {
  describe('getErrorMessage', () => {
    it('should return user-friendly message for NETWORK_ERROR', () => {
      const error: ApiError = {
        type: 'NETWORK_ERROR',
        message: 'Failed to fetch',
      };

      const result = getErrorMessage(error);

      expect(result.message).toBe('Unable to connect to the server. Please check your internet connection.');
      expect(result.suggestedAction).toBe('Check your network connection and try again.');
    });

    it('should return user-friendly message for TIMEOUT', () => {
      const error: ApiError = {
        type: 'TIMEOUT',
        duration: 30000,
      };

      const result = getErrorMessage(error);

      expect(result.message).toBe('Request timed out after 30 seconds.');
      expect(result.suggestedAction).toBe('The server is taking too long to respond. Please try again.');
    });

    it('should return user-friendly message for SERVER_ERROR 500', () => {
      const error: ApiError = {
        type: 'SERVER_ERROR',
        status: 500,
        details: 'Internal Server Error',
      };

      const result = getErrorMessage(error);

      expect(result.message).toBe('The server encountered an error. This is not your fault.');
      expect(result.suggestedAction).toBe('Please try again in a few moments. If the problem persists, contact support.');
    });

    it('should return user-friendly message for SERVER_ERROR 429', () => {
      const error: ApiError = {
        type: 'SERVER_ERROR',
        status: 429,
        details: 'Too Many Requests',
      };

      const result = getErrorMessage(error);

      expect(result.message).toBe('Too many requests. Please slow down.');
      expect(result.suggestedAction).toBe('Wait a moment before trying again.');
    });

    it('should return user-friendly message for SERVER_ERROR 401', () => {
      const error: ApiError = {
        type: 'SERVER_ERROR',
        status: 401,
        details: 'Unauthorized',
      };

      const result = getErrorMessage(error);

      expect(result.message).toBe('Authentication failed.');
      expect(result.suggestedAction).toBe('Please check your credentials and try again.');
    });

    it('should return user-friendly message for SERVER_ERROR 404', () => {
      const error: ApiError = {
        type: 'SERVER_ERROR',
        status: 404,
        details: 'Not Found',
      };

      const result = getErrorMessage(error);

      expect(result.message).toBe('The requested resource was not found.');
      expect(result.suggestedAction).toBe('Please check your configuration and try again.');
    });

    it('should return user-friendly message for VALIDATION_ERROR', () => {
      const error: ApiError = {
        type: 'VALIDATION_ERROR',
        fields: ['email', 'password'],
      };

      const result = getErrorMessage(error);

      expect(result.message).toBe('Invalid input: email, password');
      expect(result.suggestedAction).toBe('Please check your input and try again.');
    });

    it('should return generic message for unknown error type', () => {
      const error = {
        type: 'UNKNOWN_ERROR',
      } as any;

      const result = getErrorMessage(error);

      expect(result.message).toBe('An unexpected error occurred.');
      expect(result.suggestedAction).toBe('Please try again.');
    });
  });

  describe('formatErrorNotification', () => {
    it('should combine message and suggested action', () => {
      const error: ApiError = {
        type: 'NETWORK_ERROR',
        message: 'Failed to fetch',
      };

      const result = formatErrorNotification(error);

      expect(result).toBe('Unable to connect to the server. Please check your internet connection. Check your network connection and try again.');
    });

    it('should format timeout error correctly', () => {
      const error: ApiError = {
        type: 'TIMEOUT',
        duration: 15000,
      };

      const result = formatErrorNotification(error);

      expect(result).toBe('Request timed out after 15 seconds. The server is taking too long to respond. Please try again.');
    });
  });
});
