/**
 * Tests for locale-aware formatting utilities
 * 
 * These tests verify that formatting functions work correctly with different locales
 * and handle edge cases gracefully.
 * 
 * Requirements: 56.2, 56.3
 */

import { describe, it, expect } from 'vitest';
import {
  getUserLocale,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatNumber,
  formatPercent,
  formatFileSize,
  formatDuration,
  formatList,
  getTextDirection,
  isRTL,
} from '../formatting';

describe('getUserLocale', () => {
  it('returns a valid locale string', () => {
    const locale = getUserLocale();
    expect(locale).toBeTruthy();
    expect(typeof locale).toBe('string');
    expect(locale).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
  });
});

describe('formatDate', () => {
  const testDate = new Date('2024-01-15T14:30:00Z');

  it('formats date with default options', () => {
    const formatted = formatDate(testDate);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });

  it('formats date with specific locale', () => {
    const enUS = formatDate(testDate, { locale: 'en-US', dateStyle: 'medium' });
    const deDE = formatDate(testDate, { locale: 'de-DE', dateStyle: 'medium' });
    
    expect(enUS).toBeTruthy();
    expect(deDE).toBeTruthy();
    expect(enUS).not.toBe(deDE);
  });

  it('handles invalid dates gracefully', () => {
    const invalidDate = new Date('invalid');
    const formatted = formatDate(invalidDate);
    expect(formatted).toBeTruthy();
  });
});

describe('formatTime', () => {
  const testDate = new Date('2024-01-15T14:30:00Z');

  it('formats time with default options', () => {
    const formatted = formatTime(testDate);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });

  it('formats time with specific locale', () => {
    const enUS = formatTime(testDate, { locale: 'en-US', timeStyle: 'short' });
    const deDE = formatTime(testDate, { locale: 'de-DE', timeStyle: 'short' });
    
    expect(enUS).toBeTruthy();
    expect(deDE).toBeTruthy();
  });
});

describe('formatDateTime', () => {
  const testDate = new Date('2024-01-15T14:30:00Z');

  it('formats date and time together', () => {
    const formatted = formatDateTime(testDate);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });

  it('formats with specific locale', () => {
    const enUS = formatDateTime(testDate, { locale: 'en-US' });
    const deDE = formatDateTime(testDate, { locale: 'de-DE' });
    
    expect(enUS).toBeTruthy();
    expect(deDE).toBeTruthy();
  });
});

describe('formatRelativeTime', () => {
  it('formats recent times as "just now"', () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 30000); // 30 seconds ago
    const formatted = formatRelativeTime(recent);
    
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });

  it('formats times in minutes', () => {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 120000); // 2 minutes ago
    const formatted = formatRelativeTime(twoMinutesAgo);
    
    expect(formatted).toBeTruthy();
    expect(formatted.toLowerCase()).toContain('minute');
  });

  it('formats times in hours', () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 7200000); // 2 hours ago
    const formatted = formatRelativeTime(twoHoursAgo);
    
    expect(formatted).toBeTruthy();
    expect(formatted.toLowerCase()).toContain('hour');
  });
});

describe('formatNumber', () => {
  it('formats numbers with grouping', () => {
    const formatted = formatNumber(1234567.89);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });

  it('formats with specific locale', () => {
    const enUS = formatNumber(1234567.89, { locale: 'en-US' });
    const deDE = formatNumber(1234567.89, { locale: 'de-DE' });
    
    expect(enUS).toBeTruthy();
    expect(deDE).toBeTruthy();
    expect(enUS).not.toBe(deDE);
  });

  it('formats currency', () => {
    const formatted = formatNumber(1234.56, {
      style: 'currency',
      currency: 'USD',
    });
    
    expect(formatted).toBeTruthy();
    expect(formatted).toContain('$');
  });

  it('handles zero', () => {
    const formatted = formatNumber(0);
    expect(formatted).toBe('0');
  });

  it('handles negative numbers', () => {
    const formatted = formatNumber(-1234.56);
    expect(formatted).toBeTruthy();
    expect(formatted).toContain('-');
  });
});

describe('formatPercent', () => {
  it('formats percentages', () => {
    const formatted = formatPercent(0.75);
    expect(formatted).toBeTruthy();
    expect(formatted).toContain('%');
  });

  it('formats with specific locale', () => {
    const enUS = formatPercent(0.75, { locale: 'en-US' });
    const deDE = formatPercent(0.75, { locale: 'de-DE' });
    
    expect(enUS).toBeTruthy();
    expect(deDE).toBeTruthy();
  });

  it('handles zero percent', () => {
    const formatted = formatPercent(0);
    expect(formatted).toBeTruthy();
    expect(formatted).toContain('0');
  });

  it('handles 100 percent', () => {
    const formatted = formatPercent(1);
    expect(formatted).toBeTruthy();
    expect(formatted).toContain('100');
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    const formatted = formatFileSize(500);
    expect(formatted).toBe('500 Bytes');
  });

  it('formats kilobytes', () => {
    const formatted = formatFileSize(1536);
    expect(formatted).toContain('KB');
  });

  it('formats megabytes', () => {
    const formatted = formatFileSize(1536000);
    expect(formatted).toContain('MB');
  });

  it('formats gigabytes', () => {
    const formatted = formatFileSize(1536000000);
    expect(formatted).toContain('GB');
  });

  it('handles zero bytes', () => {
    const formatted = formatFileSize(0);
    expect(formatted).toBe('0 Bytes');
  });
});

describe('formatDuration', () => {
  it('formats seconds', () => {
    const formatted = formatDuration(45000); // 45 seconds
    expect(formatted).toBe('0:45');
  });

  it('formats minutes and seconds', () => {
    const formatted = formatDuration(125000); // 2 minutes 5 seconds
    expect(formatted).toBe('2:05');
  });

  it('formats hours when showHours is true', () => {
    const formatted = formatDuration(3665000, { showHours: true }); // 1 hour 1 minute 5 seconds
    expect(formatted).toContain(':');
    expect(formatted.split(':').length).toBe(3);
  });

  it('handles zero duration', () => {
    const formatted = formatDuration(0);
    expect(formatted).toBe('0:00');
  });
});

describe('formatList', () => {
  it('formats a list of items', () => {
    const formatted = formatList(['apples', 'oranges', 'bananas']);
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });

  it('handles single item', () => {
    const formatted = formatList(['apples']);
    expect(formatted).toBe('apples');
  });

  it('handles two items', () => {
    const formatted = formatList(['apples', 'oranges']);
    expect(formatted).toBeTruthy();
    expect(formatted).toContain('apples');
    expect(formatted).toContain('oranges');
  });

  it('handles empty array', () => {
    const formatted = formatList([]);
    expect(formatted).toBe('');
  });
});

describe('getTextDirection', () => {
  it('returns ltr for English', () => {
    expect(getTextDirection('en-US')).toBe('ltr');
  });

  it('returns rtl for Arabic', () => {
    expect(getTextDirection('ar-SA')).toBe('rtl');
  });

  it('returns rtl for Hebrew', () => {
    expect(getTextDirection('he-IL')).toBe('rtl');
  });

  it('returns ltr for German', () => {
    expect(getTextDirection('de-DE')).toBe('ltr');
  });

  it('returns ltr for Spanish', () => {
    expect(getTextDirection('es-ES')).toBe('ltr');
  });
});

describe('isRTL', () => {
  it('returns false for LTR languages', () => {
    expect(isRTL('en-US')).toBe(false);
    expect(isRTL('de-DE')).toBe(false);
    expect(isRTL('es-ES')).toBe(false);
  });

  it('returns true for RTL languages', () => {
    expect(isRTL('ar-SA')).toBe(true);
    expect(isRTL('he-IL')).toBe(true);
    expect(isRTL('fa-IR')).toBe(true);
  });
});
