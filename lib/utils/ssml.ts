import { logger } from '../logger';

/**
 * SSML Utility Functions
 * 
 * Provides utility functions for working with SSML (Speech Synthesis Markup Language).
 * 
 * Requirements:
 * - 31.8: Strip SSML tags from displayed transcript text
 */

/**
 * Strip SSML tags from text for display purposes
 * 
 * Removes all XML/SSML tags and decodes common XML entities.
 * Used to display clean text in the UI while preserving SSML for TTS.
 * 
 * @param text - The text with SSML markup
 * @returns Plain text with SSML tags removed
 * 
 * @example
 * ```typescript
 * const ssml = '<speak>Hello <break time="500ms"/> world!</speak>';
 * const plain = stripSSML(ssml);
 * // Returns: "Hello world!"
 * ```
 */
export function stripSSML(text: string): string {
  try {
    // Remove all XML/SSML tags
    let plainText = text.replace(/<[^>]+>/g, '');

    // Decode common XML entities
    plainText = plainText
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');

    // Trim whitespace
    plainText = plainText.trim();

    // Normalize multiple spaces to single space
    plainText = plainText.replace(/\s+/g, ' ');

    return plainText;
  } catch (error) {
    logger.error('Error stripping SSML tags', {
      component: 'ssml-utils',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Return original text if stripping fails
    return text;
  }
}

/**
 * Detect if text contains SSML markup
 * 
 * @param text - The text to check
 * @returns True if SSML markup is detected, false otherwise
 * 
 * @example
 * ```typescript
 * detectSSML('<speak>Hello</speak>'); // Returns: true
 * detectSSML('Hello world'); // Returns: false
 * ```
 */
export function detectSSML(text: string): boolean {
  // Check for <speak> tag or other common SSML tags
  const ssmlPattern = /<speak[\s>]|<break[\s/>]|<emphasis[\s>]|<prosody[\s>]|<say-as[\s>]/i;
  return ssmlPattern.test(text);
}
