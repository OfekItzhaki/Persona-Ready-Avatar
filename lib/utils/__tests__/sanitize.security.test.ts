/**
 * Security tests for sanitization utilities
 * 
 * Tests XSS prevention and input sanitization
 * 
 * Requirements: 43, 45
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeMessage, validateNoSqlInjection, sanitizeAndValidate } from '../sanitize';
import { logger } from '../../logger';

// Mock logger
vi.mock('../../logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('sanitizeMessage - XSS Prevention', () => {
  it('should remove script tags', () => {
    const input = '<script>alert("XSS")</script>Hello';
    const sanitized = sanitizeMessage(input);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('</script>');
    expect(sanitized).toBe('Hello');
  });

  it('should remove script tags with attributes', () => {
    const input = '<script type="text/javascript">alert(1)</script>';
    const sanitized = sanitizeMessage(input);
    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('</script>');
  });

  it('should remove nested script tags', () => {
    const input = '<div><script>alert(1)</script></div>';
    const sanitized = sanitizeMessage(input);
    expect(sanitized).not.toContain('<script>');
  });

  it('should remove all HTML tags', () => {
    const input = '<div><p>Hello</p><span>World</span></div>';
    const sanitized = sanitizeMessage(input);
    expect(sanitized).toBe('HelloWorld');
  });

  it('should remove event handlers', () => {
    const input = '<div onclick="alert(1)">Click me</div>';
    const sanitized = sanitizeMessage(input);
    expect(sanitized).not.toContain('onclick');
    expect(sanitized).not.toContain('alert');
  });

  it('should remove onerror handlers', () => {
    const input = '<img src=x onerror="alert(1)">';
    const sanitized = sanitizeMessage(input);
    expect(sanitized).not.toContain('onerror');
  });

  it('should remove javascript: protocol', () => {
    const input = '<a href="javascript:alert(1)">Click</a>';
    const sanitized = sanitizeMessage(input);
    expect(sanitized).not.toContain('javascript:');
  });

  it('should remove data:text/html protocol', () => {
    const input = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
    const sanitized = sanitizeMessage(input);
    expect(sanitized).not.toContain('data:text/html');
  });

  it('should remove control characters', () => {
    const input = 'Hello\x00\x01\x02World';
    const sanitized = sanitizeMessage(input);
    expect(sanitized).toBe('HelloWorld');
  });

  it('should preserve newlines and tabs', () => {
    const input = 'Hello\nWorld\tTest';
    const sanitized = sanitizeMessage(input);
    expect(sanitized).toContain('\n');
    expect(sanitized).toContain('\t');
  });

  it('should trim whitespace', () => {
    const input = '  Hello World  ';
    const sanitized = sanitizeMessage(input);
    expect(sanitized).toBe('Hello World');
  });

  it('should limit length to prevent DoS', () => {
    const input = 'a'.repeat(15000);
    const sanitized = sanitizeMessage(input);
    expect(sanitized.length).toBeLessThanOrEqual(10000);
  });

  it('should handle empty input', () => {
    expect(sanitizeMessage('')).toBe('');
    expect(sanitizeMessage(null as any)).toBe('');
    expect(sanitizeMessage(undefined as any)).toBe('');
  });

  it('should handle complex XSS attempts', () => {
    const xssAttempts = [
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      '<iframe src="javascript:alert(1)">',
      '<body onload=alert(1)>',
      '<input onfocus=alert(1) autofocus>',
      '<select onfocus=alert(1) autofocus>',
      '<textarea onfocus=alert(1) autofocus>',
      '<marquee onstart=alert(1)>',
    ];

    xssAttempts.forEach((attempt) => {
      const sanitized = sanitizeMessage(attempt);
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).not.toContain('javascript:');
    });
  });
});

describe('validateNoSqlInjection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow safe input', () => {
    const input = 'This is a normal message';
    expect(validateNoSqlInjection(input)).toBe(true);
  });

  it('should detect SELECT statements', () => {
    const input = 'SELECT * FROM users';
    expect(validateNoSqlInjection(input)).toBe(false);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should detect INSERT statements', () => {
    const input = 'INSERT INTO users VALUES (1, "admin")';
    expect(validateNoSqlInjection(input)).toBe(false);
  });

  it('should detect UPDATE statements', () => {
    const input = 'UPDATE users SET admin=1';
    expect(validateNoSqlInjection(input)).toBe(false);
  });

  it('should detect DELETE statements', () => {
    const input = 'DELETE FROM users';
    expect(validateNoSqlInjection(input)).toBe(false);
  });

  it('should detect DROP statements', () => {
    const input = 'DROP TABLE users';
    expect(validateNoSqlInjection(input)).toBe(false);
  });

  it('should detect SQL comments', () => {
    expect(validateNoSqlInjection('test -- comment')).toBe(false);
    expect(validateNoSqlInjection('test /* comment */')).toBe(false);
  });

  it('should detect OR injection patterns', () => {
    const input = "' OR '1'='1";
    expect(validateNoSqlInjection(input)).toBe(false);
  });

  it('should detect AND injection patterns', () => {
    const input = "' AND '1'='1";
    expect(validateNoSqlInjection(input)).toBe(false);
  });

  it('should handle empty input', () => {
    expect(validateNoSqlInjection('')).toBe(true);
    expect(validateNoSqlInjection(null as any)).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(validateNoSqlInjection('select * from users')).toBe(false);
    expect(validateNoSqlInjection('SeLeCt * FrOm users')).toBe(false);
  });

  it('should log validation failures', () => {
    validateNoSqlInjection('SELECT * FROM users');
    expect(logger.warn).toHaveBeenCalledWith(
      'SQL injection pattern detected in user input',
      expect.objectContaining({
        component: 'sanitize',
        operation: 'validateNoSqlInjection',
      })
    );
  });
});

describe('sanitizeAndValidate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sanitize and validate safe input', () => {
    const input = 'Hello, world!';
    const result = sanitizeAndValidate(input);
    expect(result.isValid).toBe(true);
    expect(result.sanitized).toBe('Hello, world!');
    expect(result.error).toBeUndefined();
  });

  it('should sanitize HTML and validate', () => {
    const input = '<p>Hello</p>';
    const result = sanitizeAndValidate(input);
    expect(result.isValid).toBe(true);
    expect(result.sanitized).toBe('Hello');
  });

  it('should reject empty input after sanitization', () => {
    const input = '   ';
    const result = sanitizeAndValidate(input);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('cannot be empty');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should reject input with SQL injection patterns', () => {
    const input = 'SELECT * FROM users';
    const result = sanitizeAndValidate(input);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('suspicious patterns');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should sanitize XSS and validate', () => {
    const input = '<script>alert(1)</script>Hello';
    const result = sanitizeAndValidate(input);
    expect(result.isValid).toBe(true);
    expect(result.sanitized).toBe('Hello');
    expect(result.sanitized).not.toContain('<script>');
  });

  it('should reject input that becomes empty after sanitization', () => {
    const input = '<script>alert(1)</script>';
    const result = sanitizeAndValidate(input);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('cannot be empty');
  });

  it('should log validation failures', () => {
    sanitizeAndValidate('   ');
    expect(logger.warn).toHaveBeenCalledWith(
      'Input validation failed: empty after sanitization',
      expect.objectContaining({
        component: 'sanitize',
        operation: 'sanitizeAndValidate',
      })
    );
  });
});

describe('Security Edge Cases', () => {
  it('should handle Unicode characters safely', () => {
    const input = 'Hello 世界 🌍';
    const sanitized = sanitizeMessage(input);
    expect(sanitized).toBe('Hello 世界 🌍');
  });

  it('should handle mixed content', () => {
    const input = 'Normal text <script>alert(1)</script> more text';
    const sanitized = sanitizeMessage(input);
    expect(sanitized).toBe('Normal text  more text');
  });

  it('should handle malformed HTML', () => {
    const input = '<div><p>Unclosed tags';
    const sanitized = sanitizeMessage(input);
    expect(sanitized).not.toContain('<');
  });

  it('should handle encoded entities', () => {
    const input = '&lt;script&gt;alert(1)&lt;/script&gt;';
    const sanitized = sanitizeMessage(input);
    // Should preserve encoded entities (they're safe)
    expect(sanitized).toContain('&lt;');
  });

  it('should handle very long input', () => {
    const input = 'a'.repeat(20000);
    const sanitized = sanitizeMessage(input);
    expect(sanitized.length).toBeLessThanOrEqual(10000);
  });
});
