import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../logger';

describe('Logger', () => {
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

  it('should log info messages in JSON format', () => {
    logger.info('Test message', { component: 'TestComponent' });

    expect(consoleLogSpy).toHaveBeenCalledOnce();
    const loggedMessage = consoleLogSpy.mock.calls[0][0];
    const parsed = JSON.parse(loggedMessage);

    expect(parsed).toMatchObject({
      level: 'info',
      message: 'Test message',
      context: { component: 'TestComponent' },
    });
    expect(parsed.timestamp).toBeDefined();
  });

  it('should redact sensitive data from logs', () => {
    logger.info('Test message', {
      component: 'TestComponent',
      apiKey: 'secret-key-123',
      password: 'my-password',
      token: 'auth-token',
      normalData: 'visible',
    });

    expect(consoleLogSpy).toHaveBeenCalledOnce();
    const loggedMessage = consoleLogSpy.mock.calls[0][0];
    const parsed = JSON.parse(loggedMessage);

    expect(parsed.context).toMatchObject({
      component: 'TestComponent',
      apiKey: '[REDACTED]',
      password: '[REDACTED]',
      token: '[REDACTED]',
      normalData: 'visible',
    });
  });

  it('should log error messages in JSON format', () => {
    logger.error('Error occurred', { errorType: 'TEST_ERROR' });

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    const loggedMessage = consoleErrorSpy.mock.calls[0][0];
    const parsed = JSON.parse(loggedMessage);

    expect(parsed).toMatchObject({
      level: 'error',
      message: 'Error occurred',
      context: { errorType: 'TEST_ERROR' },
    });
    expect(parsed.timestamp).toBeDefined();
  });

  it('should include ISO 8601 timestamp', () => {
    logger.info('Test message');

    const loggedMessage = consoleLogSpy.mock.calls[0][0];
    const parsed = JSON.parse(loggedMessage);

    // Verify ISO 8601 format
    expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should log without context when not provided', () => {
    logger.warn('Warning message');

    expect(consoleWarnSpy).toHaveBeenCalledOnce();
    const loggedMessage = consoleWarnSpy.mock.calls[0][0];
    const parsed = JSON.parse(loggedMessage);

    expect(parsed).toMatchObject({
      level: 'warn',
      message: 'Warning message',
    });
    expect(parsed.context).toBeUndefined();
  });
});
