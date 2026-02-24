/**
 * Input Sanitization Utilities
 *
 * Provides functions to sanitize user input before sending to API
 * to prevent injection attacks and ensure data integrity.
 *
 * Requirements: 14.5
 */

/**
 * Sanitize user message input
 *
 * Removes potentially dangerous characters and patterns:
 * - HTML tags
 * - Script tags
 * - SQL injection patterns
 * - Control characters
 *
 * @param input - Raw user input
 * @returns Sanitized input safe for API transmission
 */
export function sanitizeMessage(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  // Remove control characters (except newlines and tabs)
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length to prevent DoS
  const MAX_MESSAGE_LENGTH = 10000;
  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    sanitized = sanitized.substring(0, MAX_MESSAGE_LENGTH);
  }

  return sanitized;
}

/**
 * Validate that input doesn't contain SQL injection patterns
 *
 * @param input - User input to validate
 * @returns True if input appears safe, false if suspicious patterns detected
 */
export function validateNoSqlInjection(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return true;
  }

  // Common SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(--|;|\/\*|\*\/)/g,
    /(\bOR\b.*=.*)/gi,
    /(\bAND\b.*=.*)/gi,
    /('|")\s*(OR|AND)\s*('|")/gi,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(input)) {
      return false;
    }
  }

  return true;
}

/**
 * Sanitize and validate user input
 *
 * Combines sanitization and validation into a single function
 *
 * @param input - Raw user input
 * @returns Object with sanitized input and validation result
 */
export function sanitizeAndValidate(input: string): {
  sanitized: string;
  isValid: boolean;
  error?: string;
} {
  const sanitized = sanitizeMessage(input);

  if (!sanitized) {
    return {
      sanitized: '',
      isValid: false,
      error: 'Input cannot be empty',
    };
  }

  if (!validateNoSqlInjection(sanitized)) {
    return {
      sanitized: '',
      isValid: false,
      error: 'Input contains suspicious patterns',
    };
  }

  return {
    sanitized,
    isValid: true,
  };
}
