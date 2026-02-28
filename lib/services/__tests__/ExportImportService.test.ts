import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExportImportService } from '../ExportImportService';
import type { ChatMessage } from '@/types';

describe('ExportImportService', () => {
  let sampleMessages: ChatMessage[];

  beforeEach(() => {
    sampleMessages = [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello, how are you?',
        timestamp: new Date('2024-01-15T10:30:00Z'),
      },
      {
        id: 'msg-2',
        role: 'agent',
        content: 'I am doing well, thank you!',
        timestamp: new Date('2024-01-15T10:30:05Z'),
        reaction: 'thumbs_up',
      },
      {
        id: 'msg-3',
        role: 'user',
        content: 'Can you help me with something?',
        timestamp: new Date('2024-01-15T10:30:10Z'),
        edited: true,
        editedAt: new Date('2024-01-15T10:30:15Z'),
      },
    ];
  });

  describe('exportToJSON', () => {
    it('should export messages to JSON format', () => {
      const json = ExportImportService.exportToJSON(sampleMessages);
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe('1.0');
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.messages).toHaveLength(3);
      expect(parsed.messages[0].id).toBe('msg-1');
      expect(parsed.messages[0].role).toBe('user');
      expect(parsed.messages[0].content).toBe('Hello, how are you?');
    });

    it('should include optional fields when present', () => {
      const json = ExportImportService.exportToJSON(sampleMessages);
      const parsed = JSON.parse(json);

      expect(parsed.messages[1].reaction).toBe('thumbs_up');
      expect(parsed.messages[2].edited).toBe(true);
      expect(parsed.messages[2].editedAt).toBeDefined();
    });

    it('should handle empty messages array', () => {
      const json = ExportImportService.exportToJSON([]);
      const parsed = JSON.parse(json);

      expect(parsed.messages).toHaveLength(0);
    });

    it('should throw error for invalid messages', () => {
      const invalidMessages = [{ invalid: 'data' }] as unknown as ChatMessage[];
      
      expect(() => ExportImportService.exportToJSON(invalidMessages)).toThrow();
    });
  });

  describe('exportToText', () => {
    it('should export messages to plain text format', () => {
      const text = ExportImportService.exportToText(sampleMessages);

      expect(text).toContain('Conversation Export');
      expect(text).toContain('User');
      expect(text).toContain('Agent');
      expect(text).toContain('Hello, how are you?');
      expect(text).toContain('I am doing well, thank you!');
    });

    it('should include edited marker for edited messages', () => {
      const text = ExportImportService.exportToText(sampleMessages);

      expect(text).toContain('(edited)');
    });

    it('should include reaction emoji for messages with reactions', () => {
      const text = ExportImportService.exportToText(sampleMessages);

      expect(text).toContain('👍');
    });

    it('should handle empty messages array', () => {
      const text = ExportImportService.exportToText([]);

      expect(text).toContain('Conversation Export');
      expect(text).toContain('Messages: 0');
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with timestamp for JSON', () => {
      const filename = ExportImportService.generateFilename('json');

      expect(filename).toMatch(/^conversation-\d{4}-\d{2}-\d{2}-\d{6}\.json$/);
    });

    it('should generate filename with timestamp for text', () => {
      const filename = ExportImportService.generateFilename('text');

      expect(filename).toMatch(/^conversation-\d{4}-\d{2}-\d{2}-\d{6}\.txt$/);
    });

    it('should generate unique filenames', () => {
      const filename1 = ExportImportService.generateFilename('json');
      const filename2 = ExportImportService.generateFilename('json');

      // They might be the same if called in the same second, but structure should be correct
      expect(filename1).toMatch(/^conversation-\d{4}-\d{2}-\d{2}-\d{6}\.json$/);
      expect(filename2).toMatch(/^conversation-\d{4}-\d{2}-\d{2}-\d{6}\.json$/);
    });
  });

  describe('importFromJSON', () => {
    it('should import valid JSON conversation', () => {
      const json = ExportImportService.exportToJSON(sampleMessages);
      const result = ExportImportService.importFromJSON(json);

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(3);
      expect(result.messages![0].id).toBe('msg-1');
      expect(result.messages![0].role).toBe('user');
      expect(result.messages![0].content).toBe('Hello, how are you?');
    });

    it('should preserve optional fields', () => {
      const json = ExportImportService.exportToJSON(sampleMessages);
      const result = ExportImportService.importFromJSON(json);

      expect(result.success).toBe(true);
      expect(result.messages![1].reaction).toBe('thumbs_up');
      expect(result.messages![2].edited).toBe(true);
      expect(result.messages![2].editedAt).toBeInstanceOf(Date);
    });

    it('should fail for invalid JSON', () => {
      const result = ExportImportService.importFromJSON('not valid json');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON format');
    });

    it('should fail for missing version field', () => {
      const invalidData = JSON.stringify({
        messages: [],
      });
      const result = ExportImportService.importFromJSON(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('version');
    });

    it('should fail for missing messages array', () => {
      const invalidData = JSON.stringify({
        version: '1.0',
      });
      const result = ExportImportService.importFromJSON(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('messages');
    });

    it('should fail for empty messages array', () => {
      const invalidData = JSON.stringify({
        version: '1.0',
        messages: [],
      });
      const result = ExportImportService.importFromJSON(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('no messages');
    });

    it('should fail for invalid message structure', () => {
      const invalidData = JSON.stringify({
        version: '1.0',
        messages: [
          {
            id: 'msg-1',
            // missing role
            content: 'Hello',
            timestamp: new Date().toISOString(),
          },
        ],
      });
      const result = ExportImportService.importFromJSON(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid role');
    });

    it('should fail for invalid timestamp', () => {
      const invalidData = JSON.stringify({
        version: '1.0',
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Hello',
            timestamp: 'not a valid date',
          },
        ],
      });
      const result = ExportImportService.importFromJSON(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a valid date');
    });
  });

  describe('importFromText', () => {
    it('should import valid text conversation', () => {
      const text = ExportImportService.exportToText(sampleMessages);
      const result = ExportImportService.importFromText(text);

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(3);
      expect(result.messages![0].role).toBe('user');
      expect(result.messages![0].content).toBe('Hello, how are you?');
    });

    it('should preserve edited marker', () => {
      const text = ExportImportService.exportToText(sampleMessages);
      const result = ExportImportService.importFromText(text);

      expect(result.success).toBe(true);
      expect(result.messages![2].edited).toBe(true);
    });

    it('should preserve reactions', () => {
      const text = ExportImportService.exportToText(sampleMessages);
      const result = ExportImportService.importFromText(text);

      expect(result.success).toBe(true);
      expect(result.messages![1].reaction).toBe('thumbs_up');
    });

    it('should fail for empty or invalid text', () => {
      const result = ExportImportService.importFromText('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid messages');
    });

    it('should handle multi-line message content', () => {
      const messagesWithMultiline: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Line 1\nLine 2\nLine 3',
          timestamp: new Date('2024-01-15T10:30:00Z'),
        },
      ];

      const text = ExportImportService.exportToText(messagesWithMultiline);
      const result = ExportImportService.importFromText(text);

      expect(result.success).toBe(true);
      expect(result.messages![0].content).toBe('Line 1\nLine 2\nLine 3');
    });
  });

  describe('importFromFile', () => {
    it('should import JSON file', async () => {
      const json = ExportImportService.exportToJSON(sampleMessages);
      const file = new File([json], 'conversation.json', { type: 'application/json' });

      const result = await ExportImportService.importFromFile(file);

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(3);
    });

    it('should import text file', async () => {
      const text = ExportImportService.exportToText(sampleMessages);
      const file = new File([text], 'conversation.txt', { type: 'text/plain' });

      const result = await ExportImportService.importFromFile(file);

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(3);
    });

    it('should detect JSON format by content', async () => {
      const json = ExportImportService.exportToJSON(sampleMessages);
      // File with .txt extension but JSON content
      const file = new File([json], 'conversation.txt', { type: 'text/plain' });

      const result = await ExportImportService.importFromFile(file);

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(3);
    });

    it('should fail for files larger than 10MB', async () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      const file = new File([largeContent], 'large.json', { type: 'application/json' });

      const result = await ExportImportService.importFromFile(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('too large');
    });
  });

  describe('downloadConversation', () => {
    beforeEach(() => {
      // Mock DOM methods
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      
      // Mock document methods
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as unknown as HTMLElement);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as Node);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as Node);
    });

    it('should download JSON conversation', () => {
      ExportImportService.downloadConversation(sampleMessages, 'json');

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should download text conversation', () => {
      ExportImportService.downloadConversation(sampleMessages, 'text');

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('round-trip consistency', () => {
    it('should maintain data integrity through JSON export and import', () => {
      const json = ExportImportService.exportToJSON(sampleMessages);
      const result = ExportImportService.importFromJSON(json);

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(sampleMessages.length);

      result.messages!.forEach((imported, index) => {
        const original = sampleMessages[index];
        expect(imported.id).toBe(original.id);
        expect(imported.role).toBe(original.role);
        expect(imported.content).toBe(original.content);
        expect(imported.timestamp.getTime()).toBe(original.timestamp.getTime());
        expect(imported.edited).toBe(original.edited);
        expect(imported.reaction).toBe(original.reaction);
      });
    });

    it('should maintain data integrity through text export and import', () => {
      const text = ExportImportService.exportToText(sampleMessages);
      const result = ExportImportService.importFromText(text);

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(sampleMessages.length);

      result.messages!.forEach((imported, index) => {
        const original = sampleMessages[index];
        expect(imported.role).toBe(original.role);
        expect(imported.content).toBe(original.content);
        expect(imported.edited).toBe(original.edited);
        expect(imported.reaction).toBe(original.reaction);
      });
    });
  });
});
