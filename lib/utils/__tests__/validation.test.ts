/**
 * Tests for validation utilities
 * 
 * Requirements: 43, 45
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateMessageLength,
  validateFileType,
  validateFileSize,
  detectMaliciousContent,
  validateImportFile,
  encodeForDisplay,
  validateRange,
  validateEnum,
} from '../validation';

describe('validateMessageLength', () => {
  it('should validate messages within length limit', () => {
    const result = validateMessageLength('Hello, world!', 5000);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject messages exceeding length limit', () => {
    const longMessage = 'a'.repeat(5001);
    const result = validateMessageLength(longMessage, 5000);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('cannot exceed 5000 characters');
  });

  it('should reject empty messages', () => {
    const result = validateMessageLength('   ', 5000);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('cannot be empty');
  });

  it('should reject non-string input', () => {
    const result = validateMessageLength(null as any, 5000);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('must be a non-empty string');
  });

  it('should use default max length of 5000', () => {
    const longMessage = 'a'.repeat(5001);
    const result = validateMessageLength(longMessage);
    expect(result.isValid).toBe(false);
  });
});

describe('validateFileType', () => {
  it('should validate JSON files', () => {
    const file = new File(['{}'], 'test.json', { type: 'application/json' });
    const result = validateFileType(file);
    expect(result.isValid).toBe(true);
  });

  it('should validate text files', () => {
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const result = validateFileType(file);
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid file types', () => {
    const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
    const result = validateFileType(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid file type');
  });

  it('should validate by extension when MIME type is empty', () => {
    const file = new File(['{}'], 'test.json', { type: '' });
    const result = validateFileType(file);
    expect(result.isValid).toBe(true);
  });

  it('should accept custom allowed types', () => {
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const result = validateFileType(file, ['text/csv'], ['.csv']);
    expect(result.isValid).toBe(true);
  });
});

describe('validateFileSize', () => {
  it('should validate files within size limit', () => {
    const file = new File(['a'.repeat(1000)], 'test.txt', { type: 'text/plain' });
    const result = validateFileSize(file, 10 * 1024 * 1024);
    expect(result.isValid).toBe(true);
  });

  it('should reject files exceeding size limit', () => {
    const largeContent = 'a'.repeat(11 * 1024 * 1024);
    const file = new File([largeContent], 'test.txt', { type: 'text/plain' });
    const result = validateFileSize(file, 10 * 1024 * 1024);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('too large');
  });

  it('should use default max size of 10MB', () => {
    const largeContent = 'a'.repeat(11 * 1024 * 1024);
    const file = new File([largeContent], 'test.txt', { type: 'text/plain' });
    const result = validateFileSize(file);
    expect(result.isValid).toBe(false);
  });
});

describe('detectMaliciousContent', () => {
  it('should allow safe content', () => {
    const safeContent = 'This is a normal conversation message.';
    const result = detectMaliciousContent(safeContent);
    expect(result.isValid).toBe(true);
  });

  it('should detect excessive script tags', () => {
    const maliciousContent = '<script>alert(1)</script>'.repeat(6);
    const result = detectMaliciousContent(maliciousContent);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('excessive script tags');
  });

  it('should detect eval patterns', () => {
    const maliciousContent = 'eval("alert(1)")';
    const result = detectMaliciousContent(maliciousContent);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('malicious content');
  });

  it('should detect Function constructor', () => {
    const maliciousContent = 'new Function("alert(1)")()';
    const result = detectMaliciousContent(maliciousContent);
    expect(result.isValid).toBe(false);
  });

  it('should detect setTimeout with string', () => {
    const maliciousContent = 'setTimeout("alert(1)", 1000)';
    const result = detectMaliciousContent(maliciousContent);
    expect(result.isValid).toBe(false);
  });

  it('should detect iframe tags', () => {
    const maliciousContent = '<iframe src="evil.com"></iframe>';
    const result = detectMaliciousContent(maliciousContent);
    expect(result.isValid).toBe(false);
  });

  it('should detect event handlers', () => {
    const maliciousContent = '<div onclick="alert(1)">Click me</div>';
    const result = detectMaliciousContent(maliciousContent);
    expect(result.isValid).toBe(false);
  });

  it('should detect javascript: protocol', () => {
    const maliciousContent = '<a href="javascript:alert(1)">Click</a>';
    const result = detectMaliciousContent(maliciousContent);
    expect(result.isValid).toBe(false);
  });

  it('should detect data: URIs', () => {
    const maliciousContent = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
    const result = detectMaliciousContent(maliciousContent);
    expect(result.isValid).toBe(false);
  });

  it('should detect multiple encoding patterns', () => {
    const maliciousContent = 'atob("YWxlcnQoMSk="); String.fromCharCode(97,108,101,114,116); \\x61\\x6c\\x65\\x72\\x74';
    const result = detectMaliciousContent(maliciousContent);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('encoded content');
  });

  it('should allow single encoding pattern (not suspicious)', () => {
    const content = 'Use atob() to decode base64';
    const result = detectMaliciousContent(content);
    expect(result.isValid).toBe(true);
  });

  it('should handle empty content', () => {
    const result = detectMaliciousContent('');
    expect(result.isValid).toBe(true);
  });
});

describe('validateImportFile', () => {
  it('should validate safe JSON file', async () => {
    const content = JSON.stringify({ messages: [] });
    const file = new File([content], 'test.json', { type: 'application/json' });
    const result = await validateImportFile(file, content);
    expect(result.isValid).toBe(true);
  });

  it('should reject file with invalid type', async () => {
    const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
    const result = await validateImportFile(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid file type');
  });

  it('should reject file that is too large', async () => {
    const largeContent = 'a'.repeat(11 * 1024 * 1024);
    const file = new File([largeContent], 'test.json', { type: 'application/json' });
    const result = await validateImportFile(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('too large');
  });

  it('should reject file with malicious content', async () => {
    const maliciousContent = '<script>alert(1)</script>'.repeat(6);
    const file = new File([maliciousContent], 'test.json', { type: 'application/json' });
    const result = await validateImportFile(file, maliciousContent);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('suspicious');
  });

  it('should read file content if not provided', async () => {
    const content = JSON.stringify({ messages: [] });
    const file = new File([content], 'test.json', { type: 'application/json' });
    const result = await validateImportFile(file);
    expect(result.isValid).toBe(true);
  });
});

describe('encodeForDisplay', () => {
  it('should encode HTML entities', () => {
    const input = '<script>alert("XSS")</script>';
    const encoded = encodeForDisplay(input);
    expect(encoded).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
  });

  it('should encode ampersands', () => {
    const input = 'Tom & Jerry';
    const encoded = encodeForDisplay(input);
    expect(encoded).toBe('Tom &amp; Jerry');
  });

  it('should encode quotes', () => {
    const input = 'He said "Hello"';
    const encoded = encodeForDisplay(input);
    expect(encoded).toBe('He said &quot;Hello&quot;');
  });

  it('should encode single quotes', () => {
    const input = "It's a test";
    const encoded = encodeForDisplay(input);
    expect(encoded).toBe('It&#x27;s a test');
  });

  it('should encode forward slashes', () => {
    const input = '</script>';
    const encoded = encodeForDisplay(input);
    expect(encoded).toBe('&lt;&#x2F;script&gt;');
  });

  it('should handle empty string', () => {
    const encoded = encodeForDisplay('');
    expect(encoded).toBe('');
  });

  it('should handle null/undefined', () => {
    expect(encodeForDisplay(null as any)).toBe('');
    expect(encodeForDisplay(undefined as any)).toBe('');
  });

  it('should encode complex XSS attempts', () => {
    const input = '<img src=x onerror="alert(1)">';
    const encoded = encodeForDisplay(input);
    expect(encoded).not.toContain('<');
    expect(encoded).not.toContain('>');
    expect(encoded).not.toContain('"');
  });
});

describe('validateRange', () => {
  it('should validate values within range', () => {
    const result = validateRange(50, 0, 100, 'Volume');
    expect(result.isValid).toBe(true);
  });

  it('should validate minimum value', () => {
    const result = validateRange(0, 0, 100, 'Volume');
    expect(result.isValid).toBe(true);
  });

  it('should validate maximum value', () => {
    const result = validateRange(100, 0, 100, 'Volume');
    expect(result.isValid).toBe(true);
  });

  it('should reject values below minimum', () => {
    const result = validateRange(-1, 0, 100, 'Volume');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('must be between 0 and 100');
  });

  it('should reject values above maximum', () => {
    const result = validateRange(101, 0, 100, 'Volume');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('must be between 0 and 100');
  });

  it('should reject non-numeric values', () => {
    const result = validateRange('50' as any, 0, 100, 'Volume');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('must be a valid number');
  });

  it('should reject NaN', () => {
    const result = validateRange(NaN, 0, 100, 'Volume');
    expect(result.isValid).toBe(false);
  });
});

describe('validateEnum', () => {
  it('should validate allowed values', () => {
    const result = validateEnum('dark', ['light', 'dark', 'system'], 'Theme');
    expect(result.isValid).toBe(true);
  });

  it('should reject disallowed values', () => {
    const result = validateEnum('invalid', ['light', 'dark', 'system'], 'Theme');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('must be one of: light, dark, system');
  });

  it('should work with numeric enums', () => {
    const result = validateEnum(2, [1, 2, 3], 'Level');
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid numeric values', () => {
    const result = validateEnum(4, [1, 2, 3], 'Level');
    expect(result.isValid).toBe(false);
  });
});
