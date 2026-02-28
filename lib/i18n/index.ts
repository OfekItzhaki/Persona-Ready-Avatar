/**
 * Internationalization (i18n) Module
 * 
 * This module provides utilities and resources for internationalization support.
 * It includes:
 * - Externalized UI strings for all user-facing text
 * - Locale-aware formatting for dates, times, and numbers
 * - RTL (Right-to-Left) language support utilities
 * - String interpolation and pluralization helpers
 * 
 * The module is designed to work with the browser's native Intl API and can be
 * easily extended to integrate with i18n libraries like react-i18next or next-intl.
 * 
 * Requirements: 56
 */

// Export all strings and string utilities
export { UI_STRINGS, interpolate, pluralize } from './strings';

// Export all formatting utilities
export {
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
} from './formatting';

export type {
  DateTimeFormatOptions,
  NumberFormatOptions,
} from './formatting';

// Export all RTL utilities
export {
  rtlClass,
  rtlValue,
  rtlFlexDirection,
  rtlTextAlign,
  rtlTransform,
  getRTLCSSVars,
  applyRTLDirection,
  useRTL,
  RTL_TAILWIND_CLASSES,
} from './rtl';
