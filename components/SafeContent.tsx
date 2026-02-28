/**
 * SafeContent Component
 * 
 * Safely displays user-generated content with HTML encoding to prevent XSS.
 * 
 * Requirements: 43.6
 */

import { encodeForDisplay } from '@/lib/utils/validation';

interface SafeContentProps {
  /** User-generated content to display */
  content: string;
  /** Additional CSS classes */
  className?: string;
  /** HTML element type to render */
  as?: 'div' | 'span' | 'p';
  /** Whether to preserve whitespace and line breaks */
  preserveWhitespace?: boolean;
}

/**
 * SafeContent Component
 * 
 * Encodes user-generated content before displaying to prevent XSS attacks.
 * Use this component whenever displaying content that comes from users.
 * 
 * @example
 * ```tsx
 * <SafeContent content={userMessage} />
 * ```
 */
export function SafeContent({
  content,
  className = '',
  as: Element = 'div',
  preserveWhitespace = false,
}: SafeContentProps) {
  // Encode content for safe display - Requirement 43.6
  const encodedContent = encodeForDisplay(content);

  const style = preserveWhitespace
    ? { whiteSpace: 'pre-wrap' as const }
    : undefined;

  return (
    <Element
      className={className}
      style={style}
      // Use dangerouslySetInnerHTML with encoded content
      // This is safe because we've encoded all HTML entities
      dangerouslySetInnerHTML={{ __html: encodedContent }}
    />
  );
}
