/**
 * Property Test: Security Input Validation
 * 
 * **Validates: Requirements 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7**
 * 
 * For any user input used in styling or theme configuration, the input must be
 * validated and sanitized to prevent CSS injection.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import {
  validateColorValue,
  sanitizeClassName,
  validateThemeConfig,
  sanitizeStyleValue,
  preventCSSInjection,
  whitelistCSSProperties,
  sanitizeInlineStyles,
  rejectDangerousTheme,
  escapeHTML,
  validateGradient,
  validateStyleString,
} from '../security';

// Helper to generate hex strings
const hexChar = () => fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f');
const hexString = (length: number) => fc.array(hexChar(), { minLength: length, maxLength: length }).map(arr => arr.join(''));

describe('Property: Security Input Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate safe color values and reject dangerous ones', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Valid hex colors
          hexString(3).map(s => `#${s}`),
          hexString(6).map(s => `#${s}`),
          // Valid rgb colors
          fc.tuple(
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 })
          ).map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`),
          // Dangerous patterns
          fc.constantFrom(
            'javascript:alert(1)',
            'expression(alert(1))',
            'behavior:url(xss.htc)',
            '-moz-binding:url(xss.xml)',
            'url(javascript:alert(1))'
          )
        ),
        (color) => {
          const isValid = validateColorValue(color);

          // Dangerous patterns should be rejected
          if (color.toLowerCase().includes('javascript:') ||
              color.toLowerCase().includes('expression') ||
              color.toLowerCase().includes('behavior') ||
              color.toLowerCase().includes('-moz-binding')) {
            expect(isValid).toBe(false);
          }

          // Valid hex/rgb colors should pass
          if (color.match(/^#[0-9a-f]{3,8}$/i) || color.match(/^rgb\(\d+,\s*\d+,\s*\d+\)$/)) {
            expect(isValid).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should sanitize class names by removing dangerous characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (className) => {
          const sanitized = sanitizeClassName(className);

          // Sanitized output should only contain safe characters
          expect(sanitized).toMatch(/^[a-zA-Z0-9\-_\s]*$/);

          // Should not contain dangerous characters
          expect(sanitized).not.toContain('<');
          expect(sanitized).not.toContain('>');
          expect(sanitized).not.toContain('"');
          expect(sanitized).not.toContain("'");
          expect(sanitized).not.toContain('(');
          expect(sanitized).not.toContain(')');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate theme configurations and reject dangerous ones', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Valid theme config
          fc.record({
            colors: fc.record({
              primary: hexString(6).map(s => `#${s}`),
              secondary: hexString(6).map(s => `#${s}`),
            }),
          }),
          // Dangerous theme config
          fc.record({
            colors: fc.record({
              primary: fc.constantFrom(
                'javascript:alert(1)',
                'expression(alert(1))',
                'behavior:url(xss.htc)'
              ),
            }),
          })
        ),
        (config) => {
          const isValid = validateThemeConfig(config);
          const configString = JSON.stringify(config);

          // Configs with dangerous properties should be rejected
          if (configString.toLowerCase().includes('javascript:') ||
              configString.toLowerCase().includes('expression') ||
              configString.toLowerCase().includes('behavior') ||
              configString.toLowerCase().includes('-moz-binding')) {
            expect(isValid).toBe(false);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should sanitize style values and reject disallowed properties', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.constantFrom('color', 'background-color', 'border-color', 'behavior', 'expression'),
          fc.string({ minLength: 1, maxLength: 50 })
        ),
        ([property, value]) => {
          const sanitized = sanitizeStyleValue(property, value);

          // Dangerous properties should be rejected
          if (property === 'behavior' || property === 'expression') {
            expect(sanitized).toBeNull();
          }

          // If sanitized is not null, it should be a string
          if (sanitized !== null) {
            expect(typeof sanitized).toBe('string');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should prevent CSS injection in any string', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.constantFrom(
            'javascript:alert(1)',
            '<script>alert(1)</script>',
            'expression(alert(1))',
            'behavior:url(xss.htc)',
            '-moz-binding:url(xss.xml)',
            'onerror=alert(1)',
            '@import url(evil.css)'
          )
        ),
        (cssString) => {
          const isSafe = preventCSSInjection(cssString);

          // Dangerous patterns should be detected
          const dangerous = [
            'javascript:',
            '<script',
            'expression',
            'behavior',
            '-moz-binding',
            'onerror=',
            '@import',
          ];

          const hasDangerous = dangerous.some(pattern =>
            cssString.toLowerCase().includes(pattern)
          );

          if (hasDangerous) {
            expect(isSafe).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should whitelist only allowed CSS properties', () => {
    fc.assert(
      fc.property(
        fc.record({
          color: hexString(6).map(s => `#${s}`),
          backgroundColor: hexString(6).map(s => `#${s}`),
          behavior: fc.constant('url(xss.htc)'),
          expression: fc.constant('alert(1)'),
        }),
        (config) => {
          const whitelisted = whitelistCSSProperties(config);

          // Dangerous properties should be removed or blocked
          expect(whitelisted.behavior).toBeUndefined();
          expect(whitelisted.expression).toBeUndefined();

          // Safe properties should be preserved
          if (config.color && !config.color.includes('javascript')) {
            expect(whitelisted.color).toBeDefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should sanitize inline styles object', () => {
    fc.assert(
      fc.property(
        fc.record({
          color: fc.oneof(
            hexString(6).map(s => `#${s}`),
            fc.constant('javascript:alert(1)')
          ),
          opacity: fc.float({ min: 0, max: 1, noNaN: true }).map(v => Math.fround(v)),
          behavior: fc.constant('url(xss.htc)'),
        }),
        (styles) => {
          const sanitized = sanitizeInlineStyles(styles);

          // Dangerous properties should be removed
          expect(sanitized.behavior).toBeUndefined();

          // Dangerous values should be removed
          if (styles.color && styles.color.includes('javascript')) {
            expect(sanitized.color).toBeUndefined();
          }

          // Safe numeric values should be preserved
          if (typeof styles.opacity === 'number' && !isNaN(styles.opacity)) {
            expect(sanitized.opacity).toBe(styles.opacity);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should reject theme configurations with dangerous properties', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Safe theme
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            colors: fc.record({
              primary: hexString(6).map(s => `#${s}`),
            }),
          }),
          // Dangerous theme
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            colors: fc.record({
              primary: fc.constantFrom(
                'javascript:alert(1)',
                'expression(alert(1))',
                '<script>alert(1)</script>'
              ),
            }),
          })
        ),
        (config) => {
          const result = rejectDangerousTheme(config);

          const configString = JSON.stringify(config);
          const hasDangerous = [
            'javascript:',
            'expression',
            '<script',
            'behavior',
            '-moz-binding',
          ].some(pattern => configString.toLowerCase().includes(pattern));

          if (hasDangerous) {
            expect(result.valid).toBe(false);
            expect(result.reason).toBeDefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should escape HTML to prevent XSS', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }),
        (str) => {
          const escaped = escapeHTML(str);

          // Dangerous characters should be escaped
          expect(escaped).not.toContain('<script');
          expect(escaped).not.toContain('</script>');

          // If input had dangerous chars, output should have entities
          if (str.includes('<')) {
            expect(escaped).toContain('&lt;');
          }
          if (str.includes('>')) {
            expect(escaped).toContain('&gt;');
          }
          if (str.includes('&')) {
            expect(escaped).toContain('&amp;');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate gradient strings for safety', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Valid gradients
          fc.tuple(
            hexString(6),
            hexString(6)
          ).map(([c1, c2]) => `linear-gradient(to right, #${c1}, #${c2})`),
          // Dangerous gradients
          fc.constantFrom(
            'javascript:alert(1)',
            'url(javascript:alert(1))',
            'expression(alert(1))'
          )
        ),
        (gradient) => {
          const isValid = validateGradient(gradient);

          // Dangerous patterns should be rejected
          if (gradient.toLowerCase().includes('javascript:') ||
              gradient.toLowerCase().includes('expression')) {
            expect(isValid).toBe(false);
          }

          // Valid gradient functions should pass
          if (gradient.startsWith('linear-gradient(') ||
              gradient.startsWith('radial-gradient(')) {
            // Should be valid if no dangerous content
            const hasDangerous = ['javascript:', 'expression'].some(p =>
              gradient.toLowerCase().includes(p)
            );
            if (!hasDangerous) {
              expect(isValid).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate style strings and reject excessively long ones', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ minLength: 0, maxLength: 1000 }),
          fc.string({ minLength: 10001, maxLength: 15000 })
        ),
        (styleString) => {
          const isValid = validateStyleString(styleString);

          // Excessively long strings should be rejected (DoS prevention)
          if (styleString.length > 10000) {
            expect(isValid).toBe(false);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should never allow user input directly in style attributes', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (userInput) => {
          // Simulate applying user input to styles
          const sanitized = sanitizeStyleValue('color', userInput);

          // If input contains dangerous patterns, it should be rejected
          const dangerous = [
            'javascript:',
            'expression',
            'behavior',
            '<script',
          ];

          const hasDangerous = dangerous.some(pattern =>
            userInput.toLowerCase().includes(pattern)
          );

          if (hasDangerous) {
            expect(sanitized).toBeNull();
          }

          // If sanitized is not null, it should be safe
          if (sanitized !== null) {
            expect(preventCSSInjection(sanitized)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
