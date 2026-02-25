/**
 * Property-based tests for logger sensitive data protection
 *
 * **Property 34: Sensitive Data Protection in Logs**
 * **Validates: Requirements 14.6**
 *
 * These property tests verify universal correctness properties:
 * - Sensitive keys are always redacted in log output
 * - Redaction works at any nesting level
 * - Non-sensitive data is never redacted
 * - Log output is always valid JSON
 * - Redaction is consistent across all log levels
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { logger } from '../logger';

describe('Property 34: Sensitive Data Protection in Logs', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Sensitive key redaction properties', () => {
    it('should always redact password fields', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom('password', 'Password', 'PASSWORD', 'user_password', 'userPassword'),
          (value, keyName) => {
            logger.info('Test message', { [keyName]: value });

            const loggedMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
            const parsed = JSON.parse(loggedMessage);

            expect(parsed.context[keyName]).toBe('[REDACTED]');
            expect(parsed.context[keyName]).not.toBe(value);
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should always redact token fields', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom('token', 'Token', 'TOKEN', 'auth_token', 'authToken', 'accessToken'),
          (value, keyName) => {
            logger.info('Test message', { [keyName]: value });

            const loggedMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
            const parsed = JSON.parse(loggedMessage);

            expect(parsed.context[keyName]).toBe('[REDACTED]');
            expect(parsed.context[keyName]).not.toBe(value);
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should always redact apiKey fields', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom('apiKey', 'api_key', 'ApiKey', 'API_KEY', 'apikey'),
          (value, keyName) => {
            logger.info('Test message', { [keyName]: value });

            const loggedMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
            const parsed = JSON.parse(loggedMessage);

            expect(parsed.context[keyName]).toBe('[REDACTED]');
            expect(parsed.context[keyName]).not.toBe(value);
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should always redact secret fields', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom('secret', 'Secret', 'SECRET', 'client_secret', 'clientSecret'),
          (value, keyName) => {
            logger.info('Test message', { [keyName]: value });

            const loggedMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
            const parsed = JSON.parse(loggedMessage);

            expect(parsed.context[keyName]).toBe('[REDACTED]');
            expect(parsed.context[keyName]).not.toBe(value);
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should always redact authorization fields', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom('authorization', 'Authorization', 'AUTHORIZATION', 'auth', 'Auth'),
          (value, keyName) => {
            logger.info('Test message', { [keyName]: value });

            const loggedMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
            const parsed = JSON.parse(loggedMessage);

            expect(parsed.context[keyName]).toBe('[REDACTED]');
            expect(parsed.context[keyName]).not.toBe(value);
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should always redact key fields', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom('key', 'Key', 'KEY', 'AZURE_SPEECH_KEY', 'BRAIN_API_KEY'),
          (value, keyName) => {
            logger.info('Test message', { [keyName]: value });

            const loggedMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
            const parsed = JSON.parse(loggedMessage);

            expect(parsed.context[keyName]).toBe('[REDACTED]');
            expect(parsed.context[keyName]).not.toBe(value);
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  describe('Non-sensitive data preservation properties', () => {
    it('should never redact non-sensitive fields', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => {
            const lower = s.toLowerCase();
            return (
              !lower.includes('password') &&
              !lower.includes('token') &&
              !lower.includes('apikey') &&
              !lower.includes('api_key') &&
              !lower.includes('secret') &&
              !lower.includes('authorization') &&
              !lower.includes('auth') &&
              !lower.includes('key')
            );
          }),
          fc.string(),
          (keyName, value) => {
            if (keyName.length === 0) return; // Skip empty keys

            logger.info('Test message', { [keyName]: value });

            const loggedMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
            const parsed = JSON.parse(loggedMessage);

            expect(parsed.context[keyName]).toBe(value);
            expect(parsed.context[keyName]).not.toBe('[REDACTED]');
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should preserve non-sensitive data types correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            userId: fc.integer(),
            userName: fc.string(),
            isActive: fc.boolean(),
            timestamp: fc.date().map((d) => d.toISOString()),
          }),
          (context) => {
            logger.info('Test message', context);

            const loggedMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
            const parsed = JSON.parse(loggedMessage);

            expect(parsed.context.userId).toBe(context.userId);
            expect(parsed.context.userName).toBe(context.userName);
            expect(parsed.context.isActive).toBe(context.isActive);
            expect(parsed.context.timestamp).toBe(context.timestamp);
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  describe('Nested object redaction properties', () => {
    it('should redact sensitive data in nested objects', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (sensitiveValue, normalValue) => {
          logger.info('Test message', {
            user: {
              name: normalValue,
              password: sensitiveValue,
            },
          });

          const loggedMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
          const parsed = JSON.parse(loggedMessage);

          expect(parsed.context.user.password).toBe('[REDACTED]');
          expect(parsed.context.user.name).toBe(normalValue);
        }),
        { numRuns: 25 }
      );
    });

    it('should redact sensitive data at any nesting level', () => {
      fc.assert(
        fc.property(fc.string(), (sensitiveValue) => {
          logger.info('Test message', {
            level1: {
              level2: {
                level3: {
                  apiKey: sensitiveValue,
                },
              },
            },
          });

          const loggedMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
          const parsed = JSON.parse(loggedMessage);

          expect(parsed.context.level1.level2.level3.apiKey).toBe('[REDACTED]');
        }),
        { numRuns: 25 }
      );
    });

    it('should handle mixed sensitive and non-sensitive data in nested objects', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          fc.string(),
          (password, username, email) => {
            logger.info('Test message', {
              user: {
                username,
                email,
                credentials: {
                  password,
                },
              },
            });

            const loggedMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
            const parsed = JSON.parse(loggedMessage);

            expect(parsed.context.user.username).toBe(username);
            expect(parsed.context.user.email).toBe(email);
            expect(parsed.context.user.credentials.password).toBe('[REDACTED]');
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  describe('Log level consistency properties', () => {
    it('should redact sensitive data consistently across all log levels', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom('info', 'warn', 'error'), // Skip 'debug' as it may be filtered by log level
          (sensitiveValue, logLevel) => {
            // Call the appropriate log method
            (logger as any)[logLevel]('Test message', { password: sensitiveValue });

            // Get the appropriate spy based on log level
            let spy;
            if (logLevel === 'info') {
              spy = consoleLogSpy;
            } else if (logLevel === 'warn') {
              spy = consoleWarnSpy;
            } else {
              spy = consoleErrorSpy;
            }

            const loggedMessage = spy.mock.calls[spy.mock.calls.length - 1][0];
            const parsed = JSON.parse(loggedMessage);

            expect(parsed.context.password).toBe('[REDACTED]');
            expect(parsed.level).toBe(logLevel);
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  describe('JSON format properties', () => {
    it('should always produce valid JSON output', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.record({
            password: fc.string(),
            username: fc.string(),
            count: fc.integer(),
          }),
          (message, context) => {
            logger.info(message, context);

            const loggedMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];

            // Should not throw when parsing
            expect(() => JSON.parse(loggedMessage)).not.toThrow();

            const parsed = JSON.parse(loggedMessage);
            expect(parsed).toHaveProperty('timestamp');
            expect(parsed).toHaveProperty('level');
            expect(parsed).toHaveProperty('message');
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should include ISO 8601 timestamp in all logs', () => {
      fc.assert(
        fc.property(fc.string(), (message) => {
          logger.info(message);

          const loggedMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
          const parsed = JSON.parse(loggedMessage);

          expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        }),
        { numRuns: 25 }
      );
    });
  });

  describe('Edge cases and robustness properties', () => {
    it('should handle empty context gracefully', () => {
      fc.assert(
        fc.property(fc.string(), (message) => {
          logger.info(message, {});

          const loggedMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
          const parsed = JSON.parse(loggedMessage);

          expect(parsed.message).toBe(message);
          expect(parsed.context).toEqual({});
        }),
        { numRuns: 25 }
      );
    });

    it('should handle undefined context gracefully', () => {
      fc.assert(
        fc.property(fc.string(), (message) => {
          logger.info(message);

          const loggedMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
          const parsed = JSON.parse(loggedMessage);

          expect(parsed.message).toBe(message);
          expect(parsed.context).toBeUndefined();
        }),
        { numRuns: 25 }
      );
    });

    it('should handle multiple sensitive keys in same context', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          fc.string(),
          fc.string(),
          (password, token, apiKey, secret) => {
            logger.info('Test message', {
              password,
              token,
              apiKey,
              secret,
            });

            const loggedMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
            const parsed = JSON.parse(loggedMessage);

            expect(parsed.context.password).toBe('[REDACTED]');
            expect(parsed.context.token).toBe('[REDACTED]');
            expect(parsed.context.apiKey).toBe('[REDACTED]');
            expect(parsed.context.secret).toBe('[REDACTED]');
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should never leak sensitive values in any form', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 10 }), (sensitiveValue) => {
          logger.info('Test message', {
            password: sensitiveValue,
            nested: {
              token: sensitiveValue,
            },
          });

          const loggedMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];

          // The logged message should not contain the sensitive value anywhere
          expect(loggedMessage).not.toContain(sensitiveValue);
          expect(loggedMessage).toContain('[REDACTED]');
        }),
        { numRuns: 25 }
      );
    });
  });

  describe('Case-insensitive redaction properties', () => {
    it('should redact sensitive keys regardless of case', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom(
            'password',
            'PASSWORD',
            'Password',
            'PaSsWoRd',
            'token',
            'TOKEN',
            'Token',
            'apiKey',
            'APIKEY',
            'ApiKey'
          ),
          (value, keyName) => {
            logger.info('Test message', { [keyName]: value });

            const loggedMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
            const parsed = JSON.parse(loggedMessage);

            expect(parsed.context[keyName]).toBe('[REDACTED]');
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should redact keys containing sensitive substrings', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom(
            'userPassword',
            'user_password',
            'accessToken',
            'access_token',
            'clientSecret',
            'client_secret'
          ),
          (value, keyName) => {
            logger.info('Test message', { [keyName]: value });

            const loggedMessage = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
            const parsed = JSON.parse(loggedMessage);

            expect(parsed.context[keyName]).toBe('[REDACTED]');
          }
        ),
        { numRuns: 25 }
      );
    });
  });
});
