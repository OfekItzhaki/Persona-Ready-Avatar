/**
 * Locale-Aware Formatting Utilities
 * 
 * This file provides utilities for formatting dates, times, numbers, and other
 * locale-sensitive data. All functions respect the user's browser locale settings.
 * 
 * These utilities are designed to work with the browser's Intl API and can be
 * easily extended to support explicit locale selection when i18n is fully implemented.
 * 
 * Requirements: 56.2, 56.3
 */

/**
 * Format options for date/time formatting
 */
export interface DateTimeFormatOptions {
  locale?: string | string[];
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  year?: 'numeric' | '2-digit';
  month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
  hour?: 'numeric' | '2-digit';
  minute?: 'numeric' | '2-digit';
  second?: 'numeric' | '2-digit';
  hour12?: boolean;
}

/**
 * Format options for number formatting
 */
export interface NumberFormatOptions {
  locale?: string | string[];
  style?: 'decimal' | 'currency' | 'percent' | 'unit';
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  minimumIntegerDigits?: number;
  useGrouping?: boolean;
}

/**
 * Get the user's preferred locale from browser settings
 * Falls back to 'en-US' if not available
 */
export function getUserLocale(): string {
  if (typeof navigator === 'undefined') {
    return 'en-US';
  }
  
  return navigator.language || 'en-US';
}

/**
 * Format a date using locale-aware formatting
 * 
 * @param date - Date to format
 * @param options - Formatting options (optional)
 * @returns Formatted date string
 * 
 * @example
 * formatDate(new Date(), { dateStyle: 'medium' })
 * // Returns: "Jan 15, 2024" (in en-US locale)
 * 
 * Requirements: 56.2
 */
export function formatDate(
  date: Date,
  options?: DateTimeFormatOptions
): string {
  try {
    const locale = options?.locale || getUserLocale();
    const formatter = new Intl.DateTimeFormat(locale, options);
    return formatter.format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    // Fallback for invalid dates
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    // Fallback to ISO string for other errors
    return date.toISOString().split('T')[0];
  }
}

/**
 * Format a time using locale-aware formatting
 * 
 * @param date - Date object containing the time
 * @param options - Formatting options (optional)
 * @returns Formatted time string
 * 
 * @example
 * formatTime(new Date(), { timeStyle: 'short' })
 * // Returns: "2:30 PM" (in en-US locale)
 * 
 * Requirements: 56.2
 */
export function formatTime(
  date: Date,
  options?: DateTimeFormatOptions
): string {
  try {
    const locale = options?.locale || getUserLocale();
    const formatter = new Intl.DateTimeFormat(locale, {
      ...options,
      timeStyle: options?.timeStyle || 'short',
    });
    return formatter.format(date);
  } catch (error) {
    console.error('Error formatting time:', error);
    // Fallback to simple format
    return date.toLocaleTimeString();
  }
}

/**
 * Format a date and time using locale-aware formatting
 * 
 * @param date - Date to format
 * @param options - Formatting options (optional)
 * @returns Formatted date and time string
 * 
 * @example
 * formatDateTime(new Date(), { dateStyle: 'medium', timeStyle: 'short' })
 * // Returns: "Jan 15, 2024, 2:30 PM" (in en-US locale)
 * 
 * Requirements: 56.2
 */
export function formatDateTime(
  date: Date,
  options?: DateTimeFormatOptions
): string {
  try {
    const locale = options?.locale || getUserLocale();
    const formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: options?.dateStyle || 'medium',
      timeStyle: options?.timeStyle || 'short',
      ...options,
    });
    return formatter.format(date);
  } catch (error) {
    console.error('Error formatting date/time:', error);
    // Fallback to locale string
    return date.toLocaleString();
  }
}

/**
 * Format a relative time (e.g., "2 minutes ago", "in 3 hours")
 * 
 * @param date - Date to format relative to now
 * @param baseDate - Base date to compare against (defaults to now)
 * @param options - Formatting options (optional)
 * @returns Formatted relative time string
 * 
 * @example
 * formatRelativeTime(new Date(Date.now() - 120000))
 * // Returns: "2 minutes ago" (in en-US locale)
 * 
 * Requirements: 56.2
 */
export function formatRelativeTime(
  date: Date,
  baseDate: Date = new Date(),
  options?: { locale?: string | string[] }
): string {
  try {
    const locale = options?.locale || getUserLocale();
    const diffMs = date.getTime() - baseDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    // Use Intl.RelativeTimeFormat if available
    if (typeof Intl !== 'undefined' && 'RelativeTimeFormat' in Intl) {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      
      if (Math.abs(diffSeconds) < 60) {
        return rtf.format(diffSeconds, 'second');
      } else if (Math.abs(diffMinutes) < 60) {
        return rtf.format(diffMinutes, 'minute');
      } else if (Math.abs(diffHours) < 24) {
        return rtf.format(diffHours, 'hour');
      } else {
        return rtf.format(diffDays, 'day');
      }
    }
    
    // Fallback for browsers without RelativeTimeFormat
    const absSeconds = Math.abs(diffSeconds);
    const absMinutes = Math.abs(diffMinutes);
    const absHours = Math.abs(diffHours);
    const absDays = Math.abs(diffDays);
    
    if (absSeconds < 60) {
      return 'just now';
    } else if (absMinutes < 60) {
      return `${absMinutes} minute${absMinutes !== 1 ? 's' : ''} ago`;
    } else if (absHours < 24) {
      return `${absHours} hour${absHours !== 1 ? 's' : ''} ago`;
    } else {
      return `${absDays} day${absDays !== 1 ? 's' : ''} ago`;
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return date.toLocaleString();
  }
}

/**
 * Format a number using locale-aware formatting
 * 
 * @param value - Number to format
 * @param options - Formatting options (optional)
 * @returns Formatted number string
 * 
 * @example
 * formatNumber(1234567.89)
 * // Returns: "1,234,567.89" (in en-US locale)
 * 
 * formatNumber(1234567.89, { style: 'currency', currency: 'USD' })
 * // Returns: "$1,234,567.89" (in en-US locale)
 * 
 * Requirements: 56.3
 */
export function formatNumber(
  value: number,
  options?: NumberFormatOptions
): string {
  try {
    const locale = options?.locale || getUserLocale();
    const formatter = new Intl.NumberFormat(locale, options);
    return formatter.format(value);
  } catch (error) {
    console.error('Error formatting number:', error);
    // Fallback to toString
    return value.toString();
  }
}

/**
 * Format a percentage using locale-aware formatting
 * 
 * @param value - Number to format as percentage (0-1 range)
 * @param options - Formatting options (optional)
 * @returns Formatted percentage string
 * 
 * @example
 * formatPercent(0.75)
 * // Returns: "75%" (in en-US locale)
 * 
 * Requirements: 56.3
 */
export function formatPercent(
  value: number,
  options?: Omit<NumberFormatOptions, 'style'>
): string {
  try {
    const locale = options?.locale || getUserLocale();
    const formatter = new Intl.NumberFormat(locale, {
      ...options,
      style: 'percent',
    });
    return formatter.format(value);
  } catch (error) {
    console.error('Error formatting percent:', error);
    // Fallback
    return `${Math.round(value * 100)}%`;
  }
}

/**
 * Format a file size using locale-aware formatting
 * 
 * @param bytes - File size in bytes
 * @param options - Formatting options (optional)
 * @returns Formatted file size string
 * 
 * @example
 * formatFileSize(1536)
 * // Returns: "1.5 KB" (in en-US locale)
 * 
 * Requirements: 56.3
 */
export function formatFileSize(
  bytes: number,
  options?: { locale?: string | string[]; decimals?: number }
): string {
  try {
    const locale = options?.locale || getUserLocale();
    const decimals = options?.decimals ?? 1;
    
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
    
    return `${formatter.format(value)} ${sizes[i]}`;
  } catch (error) {
    console.error('Error formatting file size:', error);
    return `${bytes} bytes`;
  }
}

/**
 * Format a duration in milliseconds to a human-readable string
 * 
 * @param ms - Duration in milliseconds
 * @param options - Formatting options (optional)
 * @returns Formatted duration string
 * 
 * @example
 * formatDuration(125000)
 * // Returns: "2:05" (2 minutes, 5 seconds)
 * 
 * Requirements: 56.3
 */
export function formatDuration(
  ms: number,
  options?: { locale?: string | string[]; showHours?: boolean }
): string {
  try {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const locale = options?.locale || getUserLocale();
    const formatter = new Intl.NumberFormat(locale, {
      minimumIntegerDigits: 2,
    });
    
    if (options?.showHours || hours > 0) {
      return `${hours}:${formatter.format(minutes)}:${formatter.format(seconds)}`;
    }
    
    return `${minutes}:${formatter.format(seconds)}`;
  } catch (error) {
    console.error('Error formatting duration:', error);
    return `${Math.floor(ms / 1000)}s`;
  }
}

/**
 * Format a list of items using locale-aware list formatting
 * 
 * @param items - Array of items to format
 * @param options - Formatting options (optional)
 * @returns Formatted list string
 * 
 * @example
 * formatList(['apples', 'oranges', 'bananas'])
 * // Returns: "apples, oranges, and bananas" (in en-US locale)
 * 
 * Requirements: 56.3
 */
export function formatList(
  items: string[],
  options?: {
    locale?: string | string[];
    type?: 'conjunction' | 'disjunction' | 'unit';
    style?: 'long' | 'short' | 'narrow';
  }
): string {
  try {
    const locale = options?.locale || getUserLocale();
    
    // Use Intl.ListFormat if available
    if (typeof Intl !== 'undefined' && 'ListFormat' in Intl) {
      const formatter = new Intl.ListFormat(locale, {
        type: options?.type || 'conjunction',
        style: options?.style || 'long',
      });
      return formatter.format(items);
    }
    
    // Fallback for browsers without ListFormat
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    
    const lastItem = items[items.length - 1];
    const otherItems = items.slice(0, -1);
    return `${otherItems.join(', ')}, and ${lastItem}`;
  } catch (error) {
    console.error('Error formatting list:', error);
    return items.join(', ');
  }
}

/**
 * Get the text direction for a given locale
 * 
 * @param locale - Locale to check (defaults to user locale)
 * @returns 'ltr' or 'rtl'
 * 
 * Requirements: 56.4
 */
export function getTextDirection(locale?: string): 'ltr' | 'rtl' {
  const localeToCheck = locale || getUserLocale();
  
  // List of RTL language codes
  const rtlLanguages = [
    'ar', // Arabic
    'arc', // Aramaic
    'dv', // Divehi
    'fa', // Persian
    'ha', // Hausa
    'he', // Hebrew
    'khw', // Khowar
    'ks', // Kashmiri
    'ku', // Kurdish
    'ps', // Pashto
    'ur', // Urdu
    'yi', // Yiddish
  ];
  
  const languageCode = localeToCheck.split('-')[0].toLowerCase();
  return rtlLanguages.includes(languageCode) ? 'rtl' : 'ltr';
}

/**
 * Check if a locale uses RTL text direction
 * 
 * @param locale - Locale to check (defaults to user locale)
 * @returns true if RTL, false if LTR
 * 
 * Requirements: 56.4
 */
export function isRTL(locale?: string): boolean {
  return getTextDirection(locale) === 'rtl';
}
