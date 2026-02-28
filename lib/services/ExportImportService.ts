import { logger } from '../logger';
import { validateImportFile, detectMaliciousContent } from '../utils/validation';
import type { ChatMessage } from '@/types';

/**
 * Export format types
 */
export type ExportFormat = 'json' | 'text';

/**
 * Exported conversation data structure
 */
export interface ExportedConversation {
  version: string;
  exportedAt: string;
  messages: Array<{
    id: string;
    role: 'user' | 'agent';
    content: string;
    timestamp: string;
    edited?: boolean;
    editedAt?: string;
    reaction?: 'thumbs_up' | 'thumbs_down';
  }>;
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  messages?: ChatMessage[];
  error?: string;
}

/**
 * ExportImportService
 * 
 * Provides functionality to export conversations to JSON or plain text format
 * and import previously exported conversations.
 * 
 * Features:
 * - Export to JSON with full message metadata
 * - Export to plain text for readability
 * - Filename with timestamp: "conversation-YYYY-MM-DD-HHmmss.json"
 * - Import with file validation
 * - Support both JSON and plain text import
 * - Error handling for invalid files
 * 
 * Requirements: 13, 14
 */
export class ExportImportService {
  private static readonly EXPORT_VERSION = '1.0';

  /**
   * Export conversation to JSON format
   * 
   * @param messages - Array of chat messages to export
   * @returns JSON string containing the conversation
   */
  static exportToJSON(messages: ChatMessage[]): string {
    try {
      logger.info('Exporting conversation to JSON', {
        component: 'ExportImportService',
        operation: 'exportToJSON',
        messageCount: messages.length,
      });

      const exportData: ExportedConversation = {
        version: this.EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        messages: messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
          ...(msg.edited && { edited: msg.edited }),
          ...(msg.editedAt && { editedAt: msg.editedAt.toISOString() }),
          ...(msg.reaction && { reaction: msg.reaction }),
        })),
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during JSON export';

      logger.error('Failed to export conversation to JSON', {
        component: 'ExportImportService',
        operation: 'exportToJSON',
        error: errorMessage,
      });

      throw new Error(`Failed to export conversation: ${errorMessage}`);
    }
  }

  /**
   * Export conversation to plain text format
   * 
   * @param messages - Array of chat messages to export
   * @returns Plain text string containing the conversation
   */
  static exportToText(messages: ChatMessage[]): string {
    try {
      logger.info('Exporting conversation to plain text', {
        component: 'ExportImportService',
        operation: 'exportToText',
        messageCount: messages.length,
      });

      const lines: string[] = [
        'Conversation Export',
        `Exported: ${new Date().toLocaleString()}`,
        `Messages: ${messages.length}`,
        '',
        '=' .repeat(80),
        '',
      ];

      messages.forEach((msg, index) => {
        const timestamp = msg.timestamp.toLocaleString();
        const role = msg.role === 'user' ? 'User' : 'Agent';
        const editedMarker = msg.edited ? ' (edited)' : '';
        const reactionMarker = msg.reaction
          ? ` [${msg.reaction === 'thumbs_up' ? '👍' : '👎'}]`
          : '';

        lines.push(`[${timestamp}] ${role}${editedMarker}${reactionMarker}`);
        lines.push(msg.content);
        
        if (index < messages.length - 1) {
          lines.push('');
          lines.push('-'.repeat(80));
          lines.push('');
        }
      });

      return lines.join('\n');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during text export';

      logger.error('Failed to export conversation to text', {
        component: 'ExportImportService',
        operation: 'exportToText',
        error: errorMessage,
      });

      throw new Error(`Failed to export conversation: ${errorMessage}`);
    }
  }

  /**
   * Generate filename with timestamp
   * 
   * @param format - Export format (json or text)
   * @returns Filename in format "conversation-YYYY-MM-DD-HHmmss.{ext}"
   */
  static generateFilename(format: ExportFormat): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const timestamp = `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
    const extension = format === 'json' ? 'json' : 'txt';

    return `conversation-${timestamp}.${extension}`;
  }

  /**
   * Download conversation as a file
   * 
   * @param messages - Array of chat messages to export
   * @param format - Export format (json or text)
   */
  static downloadConversation(messages: ChatMessage[], format: ExportFormat): void {
    try {
      logger.info('Downloading conversation', {
        component: 'ExportImportService',
        operation: 'downloadConversation',
        format,
        messageCount: messages.length,
      });

      const content = format === 'json'
        ? this.exportToJSON(messages)
        : this.exportToText(messages);

      const blob = new Blob([content], {
        type: format === 'json' ? 'application/json' : 'text/plain',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = this.generateFilename(format);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);

      logger.info('Conversation downloaded successfully', {
        component: 'ExportImportService',
        operation: 'downloadConversation',
        filename: link.download,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during download';

      logger.error('Failed to download conversation', {
        component: 'ExportImportService',
        operation: 'downloadConversation',
        error: errorMessage,
      });

      throw new Error(`Failed to download conversation: ${errorMessage}`);
    }
  }

  /**
   * Import conversation from JSON file content
   * 
   * @param fileContent - JSON string content from file
   * @returns Import result with messages or error
   */
  static importFromJSON(fileContent: string): ImportResult {
    try {
      logger.info('Importing conversation from JSON', {
        component: 'ExportImportService',
        operation: 'importFromJSON',
      });

      // Check for malicious content before parsing - Requirement 43.3
      const maliciousCheck = detectMaliciousContent(fileContent);
      if (!maliciousCheck.isValid) {
        logger.warn('Malicious content detected in JSON import', {
          component: 'ExportImportService',
          operation: 'importFromJSON',
          error: maliciousCheck.error,
        });

        return {
          success: false,
          error: maliciousCheck.error || 'File contains potentially malicious content',
        };
      }

      // Parse JSON
      let data: unknown;
      try {
        data = JSON.parse(fileContent);
      } catch (parseError) {
        logger.warn('JSON parse error during import', {
          component: 'ExportImportService',
          operation: 'importFromJSON',
          error: parseError instanceof Error ? parseError.message : 'Unknown error',
        });

        return {
          success: false,
          error: 'Invalid JSON format. Please check the file and try again.',
        };
      }

      // Validate structure
      const validationError = this.validateImportedData(data);
      if (validationError) {
        logger.warn('Import data validation failed', {
          component: 'ExportImportService',
          operation: 'importFromJSON',
          error: validationError,
        });

        return {
          success: false,
          error: validationError,
        };
      }

      const exportedData = data as ExportedConversation;

      // Convert to ChatMessage format
      const messages: ChatMessage[] = exportedData.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        ...(msg.edited && { edited: msg.edited }),
        ...(msg.editedAt && { editedAt: new Date(msg.editedAt) }),
        ...(msg.reaction && { reaction: msg.reaction }),
      }));

      logger.info('Conversation imported successfully from JSON', {
        component: 'ExportImportService',
        operation: 'importFromJSON',
        messageCount: messages.length,
      });

      return {
        success: true,
        messages,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during import';

      logger.error('Failed to import conversation from JSON', {
        component: 'ExportImportService',
        operation: 'importFromJSON',
        error: errorMessage,
      });

      return {
        success: false,
        error: `Failed to import conversation: ${errorMessage}`,
      };
    }
  }

  /**
   * Import conversation from plain text file content
   * 
   * @param fileContent - Plain text content from file
   * @returns Import result with messages or error
   */
  static importFromText(fileContent: string): ImportResult {
    try {
      logger.info('Importing conversation from plain text', {
        component: 'ExportImportService',
        operation: 'importFromText',
      });

      const messages: ChatMessage[] = [];
      const lines = fileContent.split('\n');

      let currentMessage: Partial<ChatMessage> | null = null;
      let contentLines: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines and separators
        if (!line || line.match(/^[=-]+$/)) {
          continue;
        }

        // Skip header lines
        if (
          line.startsWith('Conversation Export') ||
          line.startsWith('Exported:') ||
          line.startsWith('Messages:')
        ) {
          continue;
        }

        // Check if this is a message header line: [timestamp] Role
        const headerMatch = line.match(/^\[(.*?)\]\s+(User|Agent)(\s+\(edited\))?(\s+\[.*?\])?$/);
        
        if (headerMatch) {
          // Save previous message if exists
          if (currentMessage && contentLines.length > 0) {
            messages.push({
              id: currentMessage.id!,
              role: currentMessage.role!,
              content: contentLines.join('\n'),
              timestamp: currentMessage.timestamp!,
              ...(currentMessage.edited && { edited: currentMessage.edited }),
              ...(currentMessage.reaction && { reaction: currentMessage.reaction }),
            });
          }

          // Start new message
          const timestamp = new Date(headerMatch[1]);
          const role = headerMatch[2].toLowerCase() as 'user' | 'agent';
          const edited = !!headerMatch[3];
          const reactionMatch = headerMatch[4]?.match(/\[(👍|👎)\]/);
          const reaction = reactionMatch
            ? reactionMatch[1] === '👍'
              ? 'thumbs_up'
              : 'thumbs_down'
            : undefined;

          currentMessage = {
            id: `imported-${Date.now()}-${messages.length}`,
            role,
            timestamp,
            edited,
            reaction: reaction as 'thumbs_up' | 'thumbs_down' | undefined,
          };
          contentLines = [];
        } else if (currentMessage) {
          // This is content for the current message
          contentLines.push(line);
        }
      }

      // Save last message
      if (currentMessage && contentLines.length > 0) {
        messages.push({
          id: currentMessage.id!,
          role: currentMessage.role!,
          content: contentLines.join('\n'),
          timestamp: currentMessage.timestamp!,
          ...(currentMessage.edited && { edited: currentMessage.edited }),
          ...(currentMessage.reaction && { reaction: currentMessage.reaction }),
        });
      }

      if (messages.length === 0) {
        return {
          success: false,
          error: 'No valid messages found in the text file.',
        };
      }

      logger.info('Conversation imported successfully from text', {
        component: 'ExportImportService',
        operation: 'importFromText',
        messageCount: messages.length,
      });

      return {
        success: true,
        messages,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during import';

      logger.error('Failed to import conversation from text', {
        component: 'ExportImportService',
        operation: 'importFromText',
        error: errorMessage,
      });

      return {
        success: false,
        error: `Failed to import conversation: ${errorMessage}`,
      };
    }
  }

  /**
   * Import conversation from file
   * Automatically detects format based on content
   * 
   * @param file - File object to import
   * @returns Promise with import result
   */
  static async importFromFile(file: File): Promise<ImportResult> {
    try {
      logger.info('Importing conversation from file', {
        component: 'ExportImportService',
        operation: 'importFromFile',
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      // Read file content first for validation
      let content: string;
      try {
        content = await file.text();
      } catch (error) {
        logger.error('Failed to read file content', {
          component: 'ExportImportService',
          operation: 'importFromFile',
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        return {
          success: false,
          error: 'Failed to read file content',
        };
      }

      // Validate file (type, size, malicious content) - Requirement 43.3, 43.7
      const validationResult = await validateImportFile(file, content);
      if (!validationResult.isValid) {
        logger.warn('Import file validation failed', {
          component: 'ExportImportService',
          operation: 'importFromFile',
          filename: file.name,
          error: validationResult.error,
        });

        return {
          success: false,
          error: validationResult.error || 'File validation failed',
        };
      }

      // Detect format and import
      const isJSON = file.name.endsWith('.json') || content.trim().startsWith('{');
      
      return isJSON
        ? this.importFromJSON(content)
        : this.importFromText(content);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during file import';

      logger.error('Failed to import conversation from file', {
        component: 'ExportImportService',
        operation: 'importFromFile',
        error: errorMessage,
      });

      return {
        success: false,
        error: `Failed to read file: ${errorMessage}`,
      };
    }
  }

  /**
   * Validate imported data structure
   * 
   * @param data - Data to validate
   * @returns Error message if invalid, null if valid
   */
  private static validateImportedData(data: unknown): string | null {
    if (!data || typeof data !== 'object') {
      return 'Invalid file format. Expected a conversation export file.';
    }

    const obj = data as Record<string, unknown>;

    if (!obj.version || typeof obj.version !== 'string') {
      return 'Invalid file format. Missing or invalid version field.';
    }

    if (!obj.messages || !Array.isArray(obj.messages)) {
      return 'Invalid file format. Missing or invalid messages array.';
    }

    if (obj.messages.length === 0) {
      return 'The conversation file contains no messages.';
    }

    // Validate each message
    for (let i = 0; i < obj.messages.length; i++) {
      const msg = obj.messages[i];
      
      if (!msg || typeof msg !== 'object') {
        return `Invalid message at index ${i}. Expected an object.`;
      }

      const message = msg as Record<string, unknown>;

      if (!message.id || typeof message.id !== 'string') {
        return `Invalid message at index ${i}. Missing or invalid id field.`;
      }

      if (!message.role || !['user', 'agent'].includes(message.role as string)) {
        return `Invalid message at index ${i}. Invalid role field.`;
      }

      if (!message.content || typeof message.content !== 'string') {
        return `Invalid message at index ${i}. Missing or invalid content field.`;
      }

      if (!message.timestamp || typeof message.timestamp !== 'string') {
        return `Invalid message at index ${i}. Missing or invalid timestamp field.`;
      }

      // Validate timestamp is parseable
      const timestamp = new Date(message.timestamp);
      if (isNaN(timestamp.getTime())) {
        return `Invalid message at index ${i}. Timestamp is not a valid date.`;
      }
    }

    return null;
  }
}
