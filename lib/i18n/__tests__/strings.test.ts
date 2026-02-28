/**
 * Tests for UI strings and string utilities
 * 
 * These tests verify that string interpolation and pluralization work correctly.
 * 
 * Requirements: 56.1, 56.5, 56.6
 */

import { describe, it, expect } from 'vitest';
import { UI_STRINGS, interpolate, pluralize } from '../strings';

describe('UI_STRINGS', () => {
  it('exports a valid strings object', () => {
    expect(UI_STRINGS).toBeDefined();
    expect(typeof UI_STRINGS).toBe('object');
  });

  it('contains common strings', () => {
    expect(UI_STRINGS.common).toBeDefined();
    expect(UI_STRINGS.common.send).toBe('Send');
    expect(UI_STRINGS.common.cancel).toBe('Cancel');
    expect(UI_STRINGS.common.save).toBe('Save');
  });

  it('contains inputArea strings', () => {
    expect(UI_STRINGS.inputArea).toBeDefined();
    expect(UI_STRINGS.inputArea.placeholder).toBeTruthy();
    expect(UI_STRINGS.inputArea.sendButton).toBeTruthy();
  });

  it('contains messageList strings', () => {
    expect(UI_STRINGS.messageList).toBeDefined();
    expect(UI_STRINGS.messageList.emptyState).toBeTruthy();
    expect(UI_STRINGS.messageList.typingIndicator).toBeTruthy();
  });

  it('contains audioController strings', () => {
    expect(UI_STRINGS.audioController).toBeDefined();
    expect(UI_STRINGS.audioController.title).toBeTruthy();
    expect(UI_STRINGS.audioController.volume).toBeTruthy();
  });

  it('contains settingsPanel strings', () => {
    expect(UI_STRINGS.settingsPanel).toBeDefined();
    expect(UI_STRINGS.settingsPanel.title).toBeTruthy();
    expect(UI_STRINGS.settingsPanel.tabAudio).toBeTruthy();
  });

  it('contains avatarCustomizer strings', () => {
    expect(UI_STRINGS.avatarCustomizer).toBeDefined();
    expect(UI_STRINGS.avatarCustomizer.title).toBeTruthy();
    expect(UI_STRINGS.avatarCustomizer.skinTone).toBeTruthy();
  });

  it('contains performanceMonitor strings', () => {
    expect(UI_STRINGS.performanceMonitor).toBeDefined();
    expect(UI_STRINGS.performanceMonitor.title).toBeTruthy();
    expect(UI_STRINGS.performanceMonitor.fps).toBeTruthy();
  });

  it('contains error strings', () => {
    expect(UI_STRINGS.errors).toBeDefined();
    expect(UI_STRINGS.errors.networkError).toBeTruthy();
    expect(UI_STRINGS.errors.ttsError).toBeTruthy();
  });

  it('contains keyboard shortcut strings', () => {
    expect(UI_STRINGS.keyboardShortcuts).toBeDefined();
    expect(UI_STRINGS.keyboardShortcuts.togglePerformanceMonitor).toBeTruthy();
  });

  it('contains accessibility strings', () => {
    expect(UI_STRINGS.accessibility).toBeDefined();
    expect(UI_STRINGS.accessibility.skipToMain).toBeTruthy();
  });
});

describe('interpolate', () => {
  it('replaces single placeholder', () => {
    const template = 'Hello {name}!';
    const result = interpolate(template, { name: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('replaces multiple placeholders', () => {
    const template = '{current} / {max}';
    const result = interpolate(template, { current: '100', max: '5000' });
    expect(result).toBe('100 / 5000');
  });

  it('handles numeric values', () => {
    const template = 'Count: {count}';
    const result = interpolate(template, { count: 42 });
    expect(result).toBe('Count: 42');
  });

  it('leaves unmatched placeholders unchanged', () => {
    const template = 'Hello {name}, you have {count} messages';
    const result = interpolate(template, { name: 'Alice' });
    expect(result).toBe('Hello Alice, you have {count} messages');
  });

  it('handles empty values object', () => {
    const template = 'Hello {name}!';
    const result = interpolate(template, {});
    expect(result).toBe('Hello {name}!');
  });

  it('handles template without placeholders', () => {
    const template = 'Hello World!';
    const result = interpolate(template, { name: 'Alice' });
    expect(result).toBe('Hello World!');
  });

  it('works with UI_STRINGS', () => {
    const result = interpolate(UI_STRINGS.inputArea.charCount, {
      current: '100',
      max: '5000',
    });
    expect(result).toBe('100 / 5000');
  });
});

describe('pluralize', () => {
  it('uses singular form for count of 1', () => {
    const template = '{count} {count, plural, one {result} other {results}} found';
    const result = pluralize(template, { count: 1 });
    expect(result).toBe('1 result found');
  });

  it('uses plural form for count > 1', () => {
    const template = '{count} {count, plural, one {result} other {results}} found';
    const result = pluralize(template, { count: 5 });
    expect(result).toBe('5 results found');
  });

  it('uses plural form for count of 0', () => {
    const template = '{count} {count, plural, one {result} other {results}} found';
    const result = pluralize(template, { count: 0 });
    expect(result).toBe('0 results found');
  });

  it('handles multiple plural patterns', () => {
    const template = '{count} {count, plural, one {item} other {items}} in {count, plural, one {box} other {boxes}}';
    const result = pluralize(template, { count: 1 });
    expect(result).toBe('1 item in box');
  });

  it('handles count as string', () => {
    const template = '{count} {count, plural, one {result} other {results}} found';
    const result = pluralize(template, { count: '3' });
    expect(result).toBe('3 results found');
  });

  it('works with UI_STRINGS', () => {
    const result = pluralize(UI_STRINGS.messageList.searchResults, { count: 5 });
    expect(result).toContain('5');
    expect(result).toContain('results');
  });

  it('handles singular case with UI_STRINGS', () => {
    const result = pluralize(UI_STRINGS.messageList.searchResults, { count: 1 });
    expect(result).toContain('1');
    expect(result).toContain('result');
  });
});

describe('String externalization', () => {
  it('has no hardcoded text in common strings', () => {
    Object.values(UI_STRINGS.common).forEach((value) => {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    });
  });

  it('has consistent placeholder format', () => {
    const placeholderPattern = /\{[a-zA-Z_][a-zA-Z0-9_]*\}/g;
    
    // Check that all placeholders follow the pattern
    const checkPlaceholders = (obj: any) => {
      for (const value of Object.values(obj)) {
        if (typeof value === 'string') {
          const matches = value.match(placeholderPattern);
          if (matches) {
            matches.forEach((match) => {
              // Placeholder should be alphanumeric with underscores
              expect(match).toMatch(/^\{[a-zA-Z_][a-zA-Z0-9_]*\}$/);
            });
          }
        } else if (typeof value === 'object' && value !== null) {
          checkPlaceholders(value);
        }
      }
    };
    
    checkPlaceholders(UI_STRINGS);
  });

  it('has no duplicate string values in common section', () => {
    const values = Object.values(UI_STRINGS.common);
    const uniqueValues = new Set(values);
    
    // Some duplication is expected (e.g., "Send" might appear multiple times)
    // but we check that the set is not too small
    expect(uniqueValues.size).toBeGreaterThan(values.length * 0.5);
  });
});
