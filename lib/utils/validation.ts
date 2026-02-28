/**
 * Comprehensive Input Validation Utilities
 * 
 * Provides validation functions for security and data integrity.
 * 
 * Requirements: 43
 */

import { logger } from '../logger';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate message length
 * 
 * @param message - Message to validate
 * @param maxLength - Maximum allowed length (default: 5000)
 * @returns Validation result
 */
export function validateMessageLength(
  message: string,
  maxLength: number = 5000
): ValidationResult {
  if (!message || typeof message !== 'string') {
    return {
      isValid: false,
      error: 'Message must be a non-empty string',
    };
  }

  if (message.trim().length === 0) {
    return {
      isValid: false,
      error: 'Message cannot be empty',
    };
  }

  if (message.length > maxLength) {
    logger.warn('Message length validation failed', {
      component: 'validation',
      operation: 'validateMessageLength',
      length: message.length,
      maxLength,
    });

    return {
      isValid: false,
      error: `Message cannot exceed ${maxLength} characters`,
    };
  }

  return { isValid: true };
}

/**
 * Validate file type for import operations
 * 
 * @param file - File to validate
 * @param allowedTypes - Array of allowed MIME types
 * @param allowedExtensions - Array of allowed file extensions
 * @returns Validation result
 */
export function validateFileType(
  file: File,
  allowedTypes: string[] = ['application/json', 'text/plain'],
  allowedExtensions: string[] = ['.json', '.txt']
): ValidationResult {
  // Check MIME type
  const mimeTypeValid = allowedTypes.some(type => 
    file.type === type || file.type === ''
  );

  // Check file extension
  const extensionValid = allowedExtensions.some(ext =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!mimeTypeValid && !extensionValid) {
    logger.warn('File type validation failed', {
      component: 'validation',
      operation: 'validateFileType',
      fileName: file.name,
      fileType: file.type,
      allowedTypes,
      allowedExtensions,
    });

    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`,
    };
  }

  return { isValid: true };
}

/**
 * Validate file size
 * 
 * @param file - File to validate
 * @param maxSizeBytes - Maximum allowed size in bytes (default: 10MB)
 * @returns Validation result
 */
export function validateFileSize(
  file: File,
  maxSizeBytes: number = 10 * 1024 * 1024
): ValidationResult {
  if (file.size > maxSizeBytes) {
    const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);

    logger.warn('File size validation failed', {
      component: 'validation',
      operation: 'validateFileSize',
      fileName: file.name,
      fileSize: file.size,
      maxSize: maxSizeBytes,
    });

    return {
      isValid: false,
      error: `File is too large (${fileSizeMB}MB). Maximum size is ${maxSizeMB}MB.`,
    };
  }

  return { isValid: true };
}

/**
 * Detect potentially malicious content in text
 * 
 * Checks for:
 * - Excessive script tags
 * - Suspicious patterns (eval, Function constructor, etc.)
 * - Encoded scripts
 * - Data URIs with scripts
 * 
 * @param content - Text content to check
 * @returns Validation result
 */
export function detectMaliciousContent(content: string): ValidationResult {
  if (!content || typeof content !== 'string') {
    return { isValid: true };
  }

  // Check for excessive script tags (more than 5 is suspicious)
  const scriptTagCount = (content.match(/<script/gi) || []).length;
  if (scriptTagCount > 5) {
    logger.warn('Malicious content detected: excessive script tags', {
      component: 'validation',
      operation: 'detectMaliciousContent',
      scriptTagCount,
    });

    return {
      isValid: false,
      error: 'File contains suspicious content (excessive script tags)',
    };
  }

  // Check for dangerous JavaScript patterns
  const dangerousPatterns = [
    /eval\s*\(/gi,
    /Function\s*\(/gi,
    /setTimeout\s*\(\s*["']/gi,
    /setInterval\s*\(\s*["']/gi,
    /document\.write/gi,
    /innerHTML\s*=/gi,
    /outerHTML\s*=/gi,
    /<iframe/gi,
    /<embed/gi,
    /<object/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick, onerror
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(content)) {
      logger.warn('Malicious content detected: dangerous pattern', {
        component: 'validation',
        operation: 'detectMaliciousContent',
        pattern: pattern.source,
      });

      return {
        isValid: false,
        error: 'File contains potentially malicious content',
      };
    }
  }

  // Check for encoded scripts (base64, hex, etc.)
  const encodedScriptPatterns = [
    /atob\s*\(/gi, // Base64 decode
    /btoa\s*\(/gi, // Base64 encode
    /fromCharCode/gi, // Character code conversion
    /\\x[0-9a-f]{2}/gi, // Hex encoding
    /\\u[0-9a-f]{4}/gi, // Unicode encoding
  ];

  let encodedPatternCount = 0;
  for (const pattern of encodedScriptPatterns) {
    if (pattern.test(content)) {
      encodedPatternCount++;
    }
  }

  // Multiple encoded patterns is suspicious
  if (encodedPatternCount >= 3) {
    logger.warn('Malicious content detected: multiple encoding patterns', {
      component: 'validation',
      operation: 'detectMaliciousContent',
      encodedPatternCount,
    });

    return {
      isValid: false,
      error: 'File contains suspicious encoded content',
    };
  }

  return { isValid: true };
}

/**
 * Validate imported conversation file content
 * 
 * Combines file type, size, and malicious content checks
 * 
 * @param file - File to validate
 * @param content - File content (optional, will be read if not provided)
 * @returns Validation result
 */
export async function validateImportFile(
  file: File,
  content?: string
): Promise<ValidationResult> {
  // Validate file type
  const typeResult = validateFileType(file);
  if (!typeResult.isValid) {
    return typeResult;
  }

  // Validate file size
  const sizeResult = validateFileSize(file);
  if (!sizeResult.isValid) {
    return sizeResult;
  }

  // Read content if not provided
  let fileContent = content;
  if (!fileContent) {
    try {
      fileContent = await file.text();
    } catch (error) {
      logger.error('Failed to read file content', {
        component: 'validation',
        operation: 'validateImportFile',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        isValid: false,
        error: 'Failed to read file content',
      };
    }
  }

  // Check for malicious content
  const maliciousResult = detectMaliciousContent(fileContent);
  if (!maliciousResult.isValid) {
    return maliciousResult;
  }

  logger.info('Import file validation passed', {
    component: 'validation',
    operation: 'validateImportFile',
    fileName: file.name,
    fileSize: file.size,
  });

  return { isValid: true };
}

/**
 * Encode user-generated content for safe display
 * 
 * Encodes HTML entities to prevent XSS when displaying user content
 * 
 * @param content - Content to encode
 * @returns Encoded content safe for HTML display
 */
export function encodeForDisplay(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate preference value is within acceptable range
 * 
 * @param value - Value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param name - Name of the preference (for error messages)
 * @returns Validation result
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  name: string
): ValidationResult {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      isValid: false,
      error: `${name} must be a valid number`,
    };
  }

  if (value < min || value > max) {
    logger.warn('Preference value out of range', {
      component: 'validation',
      operation: 'validateRange',
      name,
      value,
      min,
      max,
    });

    return {
      isValid: false,
      error: `${name} must be between ${min} and ${max}`,
    };
  }

  return { isValid: true };
}

/**
 * Validate enum value
 * 
 * @param value - Value to validate
 * @param allowedValues - Array of allowed values
 * @param name - Name of the preference (for error messages)
 * @returns Validation result
 */
export function validateEnum<T>(
  value: T,
  allowedValues: T[],
  name: string
): ValidationResult {
  if (!allowedValues.includes(value)) {
    logger.warn('Invalid enum value', {
      component: 'validation',
      operation: 'validateEnum',
      name,
      value,
      allowedValues,
    });

    return {
      isValid: false,
      error: `${name} must be one of: ${allowedValues.join(', ')}`,
    };
  }

  return { isValid: true };
}
