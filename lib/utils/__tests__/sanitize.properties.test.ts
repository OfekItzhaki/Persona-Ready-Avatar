/**
 * Property-based tests for input sanitization utilities
 *
 * **Property 33: Input Validation and Sanitization**
 * **Validates: Requirements 14.5**
 *
 * These property tests verify universal correctness properties:
 * - Sanitized output never contains dangerous patterns (XSS, SQL injection)
 * - Sanitization is idempotent (sanitizing twice yields same result)
 * - Output length never exceeds maximum allowed length
 * - Valid input always produces valid output
 * - Dangerous patterns are always detected and removed
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  sanitizeMessage,
  validateNoSqlInjection,
  sanitizeAndValidate,
} from '../sanitize';

describe('Property 33: Input Validation and Sanitization', () => {
  describe('sanitizeMessage properties', () => {
    it('should never return output containing script tags', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          fc.string(),
          (before, scriptContent, after) => {
            const input = `${before}<script>${scriptContent}</script>${after}`;
            const result = sanitizeMessage(input);
            expect(result).not.toMatch(/<script/i);
            expect(result).not.toMatch(/<\/script>/i);
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should never return output containing HTML tags', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom('div', 'span', 'p', 'a', 'img', 'iframe', 'object'),
          fc.string(),
          (content, tagName, attributes) => {
            const input = `<${tagName} ${attributes}>${content}</${tagName}>`;
            const result = sanitizeMessage(input);
            expect(result).not.toMatch(/<[^>]+>/);
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should never return output containing event handlers', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'onclick',
            'onerror',
            'onload',
            'onmouseover',
            'onfocus',
            'onblur'
          ),
          fc.string(),
          (eventHandler, code) => {
            const input = `<div ${eventHandler}="${code}">content</div>`;
            const result = sanitizeMessage(input);
            expect(result.toLowerCase()).not.toContain(eventHandler);
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should never return output containing javascript: protocol', () => {
      fc.assert(
        fc.property(fc.string(), (code) => {
          const input = `<a href="javascript:${code}">link</a>`;
          const result = sanitizeMessage(input);
          expect(result.toLowerCase()).not.toContain('javascript:');
        }),
        { numRuns: 25 }
      );
    });

    it('should never return output containing data:text/html protocol', () => {
      fc.assert(
        fc.property(fc.string(), (content) => {
          const input = `<a href="data:text/html,${content}">link</a>`;
          const result = sanitizeMessage(input);
          expect(result.toLowerCase()).not.toContain('data:text/html');
        }),
        { numRuns: 25 }
      );
    });

    it('should never return output longer than 10000 characters', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 50000 }), (input) => {
          const result = sanitizeMessage(input);
          expect(result.length).toBeLessThanOrEqual(10000);
        }),
        { numRuns: 25 }
      );
    });

    it('should be idempotent (sanitizing twice yields same result)', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const firstPass = sanitizeMessage(input);
          const secondPass = sanitizeMessage(firstPass);
          expect(secondPass).toBe(firstPass);
        }),
        { numRuns: 25 }
      );
    });

    it('should never return output with leading or trailing whitespace', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = sanitizeMessage(input);
          if (result.length > 0) {
            expect(result).toBe(result.trim());
          }
        }),
        { numRuns: 25 }
      );
    });

    it('should never return output containing control characters (except newlines and tabs)', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.integer({ min: 0, max: 31 }).filter((n) => n !== 9 && n !== 10 && n !== 13),
          (text, controlChar) => {
            const input = `${text}${String.fromCharCode(controlChar)}${text}`;
            const result = sanitizeMessage(input);
            expect(result).not.toContain(String.fromCharCode(controlChar));
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should preserve safe text content', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => {
            // Only alphanumeric, spaces, and basic punctuation
            return /^[a-zA-Z0-9\s.,!?'"()-]+$/.test(s);
          }),
          (input) => {
            const result = sanitizeMessage(input);
            expect(result).toBe(input.trim());
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should handle empty or whitespace-only input gracefully', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   ', '\t\t', '\n\n', '  \t\n  '),
          (input) => {
            const result = sanitizeMessage(input);
            expect(result).toBe('');
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should handle non-string input gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.integer(),
            fc.boolean(),
            fc.object()
          ),
          (input) => {
            const result = sanitizeMessage(input as any);
            expect(result).toBe('');
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  describe('validateNoSqlInjection properties', () => {
    it('should reject input containing SQL keywords', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom(
            'SELECT',
            'INSERT',
            'UPDATE',
            'DELETE',
            'DROP',
            'CREATE',
            'ALTER',
            'EXEC',
            'EXECUTE'
          ),
          fc.string(),
          (before, keyword, after) => {
            const input = `${before} ${keyword} ${after}`;
            const result = validateNoSqlInjection(input);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should reject input containing SQL comment patterns', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom('--', '/*', '*/'),
          fc.string(),
          (before, comment, after) => {
            const input = `${before}${comment}${after}`;
            const result = validateNoSqlInjection(input);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should reject input containing OR/AND injection patterns', () => {
      fc.assert(
        fc.property(
          fc.constantFrom("' OR '", '" OR "', "' AND '", '" AND "'),
          fc.string(),
          (pattern, value) => {
            const input = `${pattern}${value}${pattern}`;
            const result = validateNoSqlInjection(input);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should accept safe alphanumeric input', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => /^[a-zA-Z0-9\s.,!?'"()-]+$/.test(s) && s.length > 0),
          (input) => {
            // Filter out inputs that happen to contain SQL keywords as whole words
            if (
              /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|OR|AND)\b/i.test(
                input
              )
            ) {
              return; // Skip this test case
            }
            const result = validateNoSqlInjection(input);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should handle empty or null input gracefully', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', null, undefined),
          (input) => {
            const result = validateNoSqlInjection(input as any);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  describe('sanitizeAndValidate properties', () => {
    it('should always return an object with required fields', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = sanitizeAndValidate(input);
          expect(result).toHaveProperty('sanitized');
          expect(result).toHaveProperty('isValid');
          expect(typeof result.sanitized).toBe('string');
          expect(typeof result.isValid).toBe('boolean');
        }),
        { numRuns: 25 }
      );
    });

    it('should set isValid to false when sanitized output is empty', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   ', '<div></div>', '<script></script>'),
          (input) => {
            const result = sanitizeAndValidate(input);
            expect(result.isValid).toBe(false);
            expect(result.sanitized).toBe('');
            expect(result.error).toBe('Input cannot be empty');
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should set isValid to false when SQL injection patterns detected', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'SELECT * FROM users',
            "admin' OR '1'='1",
            'DROP TABLE users',
            "admin' --"
          ),
          (input) => {
            const result = sanitizeAndValidate(input);
            expect(result.isValid).toBe(false);
            expect(result.sanitized).toBe('');
            expect(result.error).toBe('Input contains suspicious patterns');
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should set isValid to true for safe input', () => {
      fc.assert(
        fc.property(
          fc
            .string()
            .filter(
              (s) =>
                /^[a-zA-Z0-9\s.,!?'"()-]+$/.test(s) &&
                s.trim().length > 0 &&
                !/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b/i.test(
                  s
                )
            ),
          (input) => {
            const result = sanitizeAndValidate(input);
            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should never return valid output containing dangerous patterns', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = sanitizeAndValidate(input);
          if (result.isValid) {
            // Valid output should not contain script tags
            expect(result.sanitized).not.toMatch(/<script/i);
            // Valid output should not contain HTML tags
            expect(result.sanitized).not.toMatch(/<[^>]+>/);
            // Valid output should not contain javascript: protocol
            expect(result.sanitized.toLowerCase()).not.toContain('javascript:');
            // Valid output should not exceed max length
            expect(result.sanitized.length).toBeLessThanOrEqual(10000);
          }
        }),
        { numRuns: 25 }
      );
    });

    it('should sanitize before validating (order matters)', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom('SELECT', 'DROP', 'DELETE'),
          fc.string(),
          (before, keyword, after) => {
            const input = `${before}<div>${keyword}</div>${after}`;
            const result = sanitizeAndValidate(input);
            // After sanitization, if the keyword remains as a word boundary, it should be detected
            const wordBoundaryRegex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (wordBoundaryRegex.test(result.sanitized)) {
              expect(result.isValid).toBe(false);
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should handle XSS attempts and validate successfully if no SQL patterns remain', () => {
      fc.assert(
        fc.property(
          fc
            .string()
            .filter(
              (s) =>
                s.length > 0 &&
                !/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b/i.test(
                  s
                ) &&
                // Also filter out SQL comment patterns
                !/(--|;|\/\*|\*\/)/.test(s) &&
                // Filter out OR/AND injection patterns
                !/('|")\s*(OR|AND)\s*('|")/.test(s) &&
                // Filter out OR/AND with equals
                !/\b(OR|AND)\b.*=/.test(s)
            ),
          (safeContent) => {
            const input = `<script>alert("XSS")</script>${safeContent}`;
            const result = sanitizeAndValidate(input);
            if (safeContent.trim().length > 0) {
              expect(result.isValid).toBe(true);
              expect(result.sanitized).not.toContain('<script>');
            }
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  describe('Combined security properties', () => {
    it('should protect against combined XSS and SQL injection attacks', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            '<script>alert("XSS")</script>SELECT * FROM users',
            '<img onerror="alert(\'XSS\')" />DROP TABLE users',
            '<a href="javascript:alert(\'XSS\')">INSERT INTO users</a>'
          ),
          (input) => {
            const result = sanitizeAndValidate(input);
            // Should either be invalid or have all dangerous content removed
            if (result.isValid) {
              expect(result.sanitized).not.toMatch(/<script/i);
              expect(result.sanitized).not.toMatch(/<[^>]+>/);
              expect(result.sanitized.toLowerCase()).not.toContain('javascript:');
            } else {
              expect(result.error).toBeDefined();
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should maintain security properties under repeated sanitization', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const firstPass = sanitizeAndValidate(input);
          const secondPass = sanitizeAndValidate(firstPass.sanitized);
          
          // Idempotency: second pass should yield same result
          expect(secondPass.sanitized).toBe(firstPass.sanitized);
          
          // If first pass was valid, second pass should also be valid
          if (firstPass.isValid) {
            expect(secondPass.isValid).toBe(true);
          }
        }),
        { numRuns: 25 }
      );
    });
  });
});
