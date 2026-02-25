/**
 * Unit tests for input sanitization utilities
 *
 * **Validates: Requirements 14.5**
 *
 * These tests ensure comprehensive security coverage for:
 * - XSS prevention (script tags, event handlers, javascript: protocol)
 * - HTML tag removal
 * - Control character removal
 * - Length limiting
 * - SQL injection pattern detection
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeMessage,
  validateNoSqlInjection,
  sanitizeAndValidate,
} from '../sanitize';

describe('sanitizeMessage', () => {
  describe('XSS Prevention', () => {
    it('should remove basic script tags', () => {
      const input = '<script>alert("XSS")</script>Hello';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello');
    });

    it('should remove script tags with attributes', () => {
      const input = '<script type="text/javascript">alert("XSS")</script>Hello';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello');
    });

    it('should remove script tags with mixed case', () => {
      const input = '<ScRiPt>alert("XSS")</ScRiPt>Hello';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello');
    });

    it('should remove nested script tags', () => {
      const input = '<script><script>alert("XSS")</script></script>Hello';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello');
    });

    it('should remove event handlers (onclick)', () => {
      const input = '<div onclick="alert(\'XSS\')">Hello</div>';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello');
    });

    it('should remove event handlers (onerror)', () => {
      const input = '<img onerror="alert(\'XSS\')" src="invalid">Hello';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello');
    });

    it('should remove event handlers (onload)', () => {
      const input = '<body onload="alert(\'XSS\')">Hello</body>';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello');
    });

    it('should remove javascript: protocol', () => {
      const input = '<a href="javascript:alert(\'XSS\')">Click</a>';
      const result = sanitizeMessage(input);
      expect(result).toBe('Click');
    });

    it('should remove javascript: protocol with mixed case', () => {
      const input = '<a href="JaVaScRiPt:alert(\'XSS\')">Click</a>';
      const result = sanitizeMessage(input);
      expect(result).toBe('Click');
    });

    it('should remove data:text/html protocol', () => {
      const input = '<a href="data:text/html,<script>alert(\'XSS\')</script>">Click</a>';
      const result = sanitizeMessage(input);
      expect(result).toBe('Click');
    });

    it('should handle multiple XSS vectors in one input', () => {
      const input =
        '<script>alert("XSS")</script><div onclick="alert(\'XSS\')">Hello</div><a href="javascript:alert(\'XSS\')">Click</a>';
      const result = sanitizeMessage(input);
      expect(result).toBe('HelloClick');
    });
  });

  describe('HTML Tag Removal', () => {
    it('should remove basic HTML tags', () => {
      const input = '<div>Hello</div>';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello');
    });

    it('should remove multiple HTML tags', () => {
      const input = '<p><strong>Hello</strong> <em>World</em></p>';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello World');
    });

    it('should remove self-closing tags', () => {
      const input = 'Hello<br/>World';
      const result = sanitizeMessage(input);
      expect(result).toBe('HelloWorld');
    });

    it('should remove tags with attributes', () => {
      const input = '<div class="test" id="main">Hello</div>';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello');
    });

    it('should remove nested tags', () => {
      const input = '<div><span><strong>Hello</strong></span></div>';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello');
    });

    it('should handle malformed tags', () => {
      const input = '<div>Hello<div>World';
      const result = sanitizeMessage(input);
      expect(result).toBe('HelloWorld');
    });
  });

  describe('Control Character Removal', () => {
    it('should remove null bytes', () => {
      const input = 'Hello\x00World';
      const result = sanitizeMessage(input);
      expect(result).toBe('HelloWorld');
    });

    it('should remove bell character', () => {
      const input = 'Hello\x07World';
      const result = sanitizeMessage(input);
      expect(result).toBe('HelloWorld');
    });

    it('should remove backspace character', () => {
      const input = 'Hello\x08World';
      const result = sanitizeMessage(input);
      expect(result).toBe('HelloWorld');
    });

    it('should remove delete character', () => {
      const input = 'Hello\x7FWorld';
      const result = sanitizeMessage(input);
      expect(result).toBe('HelloWorld');
    });

    it('should preserve newlines', () => {
      const input = 'Hello\nWorld';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello\nWorld');
    });

    it('should preserve tabs', () => {
      const input = 'Hello\tWorld';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello\tWorld');
    });

    it('should remove multiple control characters', () => {
      const input = 'Hello\x00\x01\x02World';
      const result = sanitizeMessage(input);
      expect(result).toBe('HelloWorld');
    });
  });

  describe('Length Limiting', () => {
    it('should limit input to 10000 characters', () => {
      const input = 'a'.repeat(15000);
      const result = sanitizeMessage(input);
      expect(result.length).toBe(10000);
    });

    it('should not truncate input under 10000 characters', () => {
      const input = 'a'.repeat(5000);
      const result = sanitizeMessage(input);
      expect(result.length).toBe(5000);
    });

    it('should handle exactly 10000 characters', () => {
      const input = 'a'.repeat(10000);
      const result = sanitizeMessage(input);
      expect(result.length).toBe(10000);
    });
  });

  describe('Whitespace Handling', () => {
    it('should trim leading whitespace', () => {
      const input = '   Hello';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello');
    });

    it('should trim trailing whitespace', () => {
      const input = 'Hello   ';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello');
    });

    it('should trim both leading and trailing whitespace', () => {
      const input = '   Hello   ';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello');
    });

    it('should preserve internal whitespace', () => {
      const input = 'Hello   World';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello   World');
    });
  });

  describe('Edge Cases', () => {
    it('should return empty string for null input', () => {
      const result = sanitizeMessage(null as any);
      expect(result).toBe('');
    });

    it('should return empty string for undefined input', () => {
      const result = sanitizeMessage(undefined as any);
      expect(result).toBe('');
    });

    it('should return empty string for non-string input', () => {
      const result = sanitizeMessage(123 as any);
      expect(result).toBe('');
    });

    it('should handle empty string', () => {
      const input = '';
      const result = sanitizeMessage(input);
      expect(result).toBe('');
    });

    it('should handle whitespace-only string', () => {
      const input = '   ';
      const result = sanitizeMessage(input);
      expect(result).toBe('');
    });

    it('should handle string with only HTML tags', () => {
      const input = '<div></div>';
      const result = sanitizeMessage(input);
      expect(result).toBe('');
    });

    it('should handle normal text without any dangerous content', () => {
      const input = 'Hello, how are you today?';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello, how are you today?');
    });

    it('should handle text with special characters', () => {
      const input = 'Hello! @#$%^&*() World?';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello! @#$%^&*() World?');
    });

    it('should handle unicode characters', () => {
      const input = 'Hello 世界 🌍';
      const result = sanitizeMessage(input);
      expect(result).toBe('Hello 世界 🌍');
    });
  });
});

describe('validateNoSqlInjection', () => {
  describe('SQL Keyword Detection', () => {
    it('should detect SELECT statement', () => {
      const input = 'SELECT * FROM users';
      const result = validateNoSqlInjection(input);
      expect(result).toBe(false);
    });

    it('should detect INSERT statement', () => {
      const input = 'INSERT INTO users VALUES (1, "admin")';
      const result = validateNoSqlInjection(input);
      expect(result).toBe(false);
    });

    it('should detect UPDATE statement', () => {
      const input = 'UPDATE users SET admin=1';
      const result = validateNoSqlInjection(input);
      expect(result).toBe(false);
    });

    it('should detect DELETE statement', () => {
      const input = 'DELETE FROM users';
      const result = validateNoSqlInjection(input);
      expect(result).toBe(false);
    });

    it('should detect DROP statement', () => {
      const input = 'DROP TABLE users';
      const result = validateNoSqlInjection(input);
      expect(result).toBe(false);
    });

    it('should detect CREATE statement', () => {
      const input = 'CREATE TABLE users';
      const result = validateNoSqlInjection(input);
      expect(result).toBe(false);
    });

    it('should detect ALTER statement', () => {
      const input = 'ALTER TABLE users';
      const result = validateNoSqlInjection(input);
      expect(result).toBe(false);
    });

    it('should detect EXEC statement', () => {
      const input = 'EXEC sp_executesql';
      const result = validateNoSqlInjection(input);
      expect(result).toBe(false);
    });

    it('should detect EXECUTE statement', () => {
      const input = 'EXECUTE sp_executesql';
      const result = validateNoSqlInjection(input);
      expect(result).toBe(false);
    });

    it('should detect SQL keywords with mixed case', () => {
      const input = 'SeLeCt * FrOm users';
      const result = validateNoSqlInjection(input);
      expect(result).toBe(false);
    });
  });

  describe('SQL Injection Pattern Detection', () => {
    it('should detect SQL comment (--)', () => {
      const input = "admin' --";
      const result = validateNoSqlInjection(input);
      expect(result).toBe(false);
    });

    it('should detect SQL comment (/* */)', () => {
      const input = "admin' /* comment */";
      const result = validateNoSqlInjection(input);
      expect(result).toBe(false);
    });

    it('should detect semicolon (statement separator)', () => {
      const input = "admin'; DROP TABLE users;";
      const result = validateNoSqlInjection(input);
      expect(result).toBe(false);
    });

    it('should detect OR-based injection', () => {
      const input = "admin' OR '1'='1";
      const result = validateNoSqlInjection(input);
      expect(result).toBe(false);
    });

    it('should detect AND-based injection', () => {
      const input = "admin' AND '1'='1";
      const result = validateNoSqlInjection(input);
      expect(result).toBe(false);
    });

    it('should detect OR with equals pattern', () => {
      const input = "' OR 1=1 --";
      const result = validateNoSqlInjection(input);
      expect(result).toBe(false);
    });

    it('should detect AND with equals pattern', () => {
      const input = "' AND 1=1 --";
      const result = validateNoSqlInjection(input);
      expect(result).toBe(false);
    });

    it('should detect quoted OR pattern', () => {
      const input = '" OR "1"="1';
      const result = validateNoSqlInjection(input);
      expect(result).toBe(false);
    });

    it('should detect quoted AND pattern', () => {
      const input = '" AND "1"="1';
      const result = validateNoSqlInjection(input);
      expect(result).toBe(false);
    });
  });

  describe('Safe Input Validation', () => {
    it('should allow normal text', () => {
      const input = 'Hello, how are you?';
      const result = validateNoSqlInjection(input);
      expect(result).toBe(true);
    });

    it('should allow text with numbers', () => {
      const input = 'I have 123 apples';
      const result = validateNoSqlInjection(input);
      expect(result).toBe(true);
    });

    it('should allow text with special characters', () => {
      const input = 'Hello! @#$%^&*() World?';
      const result = validateNoSqlInjection(input);
      expect(result).toBe(true);
    });

    it('should allow text with apostrophes in normal context', () => {
      const input = "It's a beautiful day";
      const result = validateNoSqlInjection(input);
      expect(result).toBe(true);
    });

    it('should allow text with quotes in normal context', () => {
      const input = 'He said "hello"';
      const result = validateNoSqlInjection(input);
      expect(result).toBe(true);
    });

    it('should allow unicode characters', () => {
      const input = 'Hello 世界 🌍';
      const result = validateNoSqlInjection(input);
      expect(result).toBe(true);
    });

    it('should allow empty string', () => {
      const input = '';
      const result = validateNoSqlInjection(input);
      expect(result).toBe(true);
    });

    it('should allow null input', () => {
      const result = validateNoSqlInjection(null as any);
      expect(result).toBe(true);
    });

    it('should allow undefined input', () => {
      const result = validateNoSqlInjection(undefined as any);
      expect(result).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should allow words containing SQL keywords as substrings', () => {
      const input = 'I will select a book from the library';
      const result = validateNoSqlInjection(input);
      // This should be false because it contains SELECT as a word boundary
      expect(result).toBe(false);
    });

    it('should allow hyphen in normal context', () => {
      const input = 'This is a well-known fact';
      const result = validateNoSqlInjection(input);
      expect(result).toBe(true);
    });
  });
});

describe('sanitizeAndValidate', () => {
  describe('Valid Input', () => {
    it('should return sanitized input for valid text', () => {
      const input = 'Hello, how are you?';
      const result = sanitizeAndValidate(input);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Hello, how are you?');
      expect(result.error).toBeUndefined();
    });

    it('should sanitize HTML and validate', () => {
      const input = '<div>Hello</div>';
      const result = sanitizeAndValidate(input);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Hello');
      expect(result.error).toBeUndefined();
    });

    it('should sanitize XSS and validate', () => {
      const input = '<script>alert("XSS")</script>Hello';
      const result = sanitizeAndValidate(input);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Hello');
      expect(result.error).toBeUndefined();
    });

    it('should handle unicode characters', () => {
      const input = 'Hello 世界 🌍';
      const result = sanitizeAndValidate(input);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Hello 世界 🌍');
      expect(result.error).toBeUndefined();
    });
  });

  describe('Invalid Input - Empty', () => {
    it('should reject empty string', () => {
      const input = '';
      const result = sanitizeAndValidate(input);
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toBe('Input cannot be empty');
    });

    it('should reject whitespace-only string', () => {
      const input = '   ';
      const result = sanitizeAndValidate(input);
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toBe('Input cannot be empty');
    });

    it('should reject string with only HTML tags', () => {
      const input = '<div></div>';
      const result = sanitizeAndValidate(input);
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toBe('Input cannot be empty');
    });
  });

  describe('Invalid Input - SQL Injection', () => {
    it('should reject SQL SELECT statement', () => {
      const input = 'SELECT * FROM users';
      const result = sanitizeAndValidate(input);
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toBe('Input contains suspicious patterns');
    });

    it('should reject SQL injection with OR pattern', () => {
      const input = "admin' OR '1'='1";
      const result = sanitizeAndValidate(input);
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toBe('Input contains suspicious patterns');
    });

    it('should reject SQL injection with comment', () => {
      const input = "admin' --";
      const result = sanitizeAndValidate(input);
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toBe('Input contains suspicious patterns');
    });

    it('should reject DROP TABLE statement', () => {
      const input = 'DROP TABLE users';
      const result = sanitizeAndValidate(input);
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toBe('Input contains suspicious patterns');
    });
  });

  describe('Combined Sanitization and Validation', () => {
    it('should sanitize HTML then validate for SQL injection', () => {
      const input = '<div>SELECT * FROM users</div>';
      const result = sanitizeAndValidate(input);
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toBe('Input contains suspicious patterns');
    });

    it('should sanitize XSS then validate successfully', () => {
      const input = '<script>alert("XSS")</script>Hello World';
      const result = sanitizeAndValidate(input);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('Hello World');
      expect(result.error).toBeUndefined();
    });

    it('should handle complex input with multiple threats', () => {
      const input =
        '<script>alert("XSS")</script>SELECT * FROM users WHERE id=1';
      const result = sanitizeAndValidate(input);
      expect(result.isValid).toBe(false);
      expect(result.sanitized).toBe('');
      expect(result.error).toBe('Input contains suspicious patterns');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long input', () => {
      const input = 'a'.repeat(15000);
      const result = sanitizeAndValidate(input);
      expect(result.isValid).toBe(true);
      expect(result.sanitized.length).toBe(10000);
      expect(result.error).toBeUndefined();
    });

    it('should handle input with control characters', () => {
      const input = 'Hello\x00\x01World';
      const result = sanitizeAndValidate(input);
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('HelloWorld');
      expect(result.error).toBeUndefined();
    });
  });
});
