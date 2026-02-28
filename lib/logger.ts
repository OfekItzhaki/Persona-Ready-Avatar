type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  component?: string;
  errorType?: string;
  stack?: string;
}

class Logger {
  private logLevel: LogLevel;
  private sensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'api_key',
    'secret',
    'authorization',
    'auth',
    'key',
    'AZURE_SPEECH_KEY',
    'BRAIN_API_KEY',
    'message',
    'content',
    'text',
    'conversation',
    'userMessage',
    'agentMessage',
  ];

  constructor() {
    this.logLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'info';
    
    // In production, set log level to 'warn' to reduce logging of sensitive data (Requirement 44.5)
    if (process.env.NODE_ENV === 'production') {
      this.logLevel = 'warn';
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex >= currentLevelIndex;
  }

  /**
   * Sanitize context to remove sensitive data
   * Requirement 44.5: Ensure no sensitive data in logs, especially in production
   */
  private sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) return undefined;

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context)) {
      // Check if key contains sensitive information
      const isSensitive = this.sensitiveKeys.some((sensitiveKey) =>
        key.toLowerCase().includes(sensitiveKey.toLowerCase())
      );

      if (isSensitive) {
        // In production, completely redact sensitive data (Requirement 44.5)
        sanitized[key] = process.env.NODE_ENV === 'production' ? '[REDACTED]' : '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeContext(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private formatLog(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    const sanitizedContext = this.sanitizeContext(context);

    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(sanitizedContext && { context: sanitizedContext }),
    };
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const logEntry = this.formatLog(level, message, context);
    const logString = JSON.stringify(logEntry);

    switch (level) {
      case 'debug':
      case 'info':
        // eslint-disable-next-line no-console
        console.log(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      case 'error':
        console.error(logString);
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }
}

export const logger = new Logger();
