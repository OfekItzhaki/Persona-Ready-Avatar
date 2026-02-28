# Internationalization (i18n) Preparation

This document describes the internationalization preparation implemented in the Avatar Client application. The codebase is now structured to support future multi-language implementation with minimal refactoring.

## Overview

The application has been prepared for internationalization by:

1. **Externalizing all user-facing text strings** into a centralized constants file
2. **Implementing locale-aware formatting** for dates, times, and numbers
3. **Structuring components to support RTL languages** with utilities and helpers
4. **Avoiding hardcoded text in JSX** components
5. **Using i18n-friendly string interpolation** patterns
6. **Documenting the approach** for future i18n library integration

**Requirements Addressed:** 56.1, 56.2, 56.3, 56.4, 56.5, 56.6, 56.7, 56.8

## Architecture

### File Structure

```
lib/i18n/
├── index.ts           # Main export file
├── strings.ts         # All UI strings externalized
├── formatting.ts      # Locale-aware formatting utilities
└── rtl.ts            # RTL language support utilities
```

### Key Components

#### 1. UI Strings (`lib/i18n/strings.ts`)

All user-facing text has been externalized into the `UI_STRINGS` constant, organized by component/feature:

```typescript
import { UI_STRINGS } from '@/lib/i18n/strings';

// Usage
const placeholder = UI_STRINGS.inputArea.placeholder;
const sendButton = UI_STRINGS.common.send;
```

**Features:**
- Organized by component/feature area
- Nested objects for logical grouping
- Type-safe with TypeScript
- Ready for i18n library integration

**String Interpolation:**

```typescript
import { interpolate } from '@/lib/i18n/strings';

const text = interpolate(UI_STRINGS.inputArea.charCount, {
  current: '100',
  max: '5000'
});
// Result: "100 / 5000"
```

**Pluralization:**

```typescript
import { pluralize } from '@/lib/i18n/strings';

const text = pluralize(UI_STRINGS.messageList.searchResults, {
  count: 5
});
// Result: "5 results found"
```

#### 2. Locale-Aware Formatting (`lib/i18n/formatting.ts`)

All date, time, and number formatting uses the browser's `Intl` API to respect user locale settings:

**Date and Time Formatting:**

```typescript
import { formatDate, formatTime, formatDateTime, formatRelativeTime } from '@/lib/i18n/formatting';

// Format date
formatDate(new Date(), { dateStyle: 'medium' });
// en-US: "Jan 15, 2024"
// de-DE: "15. Jan. 2024"

// Format time
formatTime(new Date(), { timeStyle: 'short' });
// en-US: "2:30 PM"
// de-DE: "14:30"

// Format relative time
formatRelativeTime(new Date(Date.now() - 120000));
// en-US: "2 minutes ago"
// de-DE: "vor 2 Minuten"
```

**Number Formatting:**

```typescript
import { formatNumber, formatPercent, formatFileSize } from '@/lib/i18n/formatting';

// Format number with grouping
formatNumber(1234567.89);
// en-US: "1,234,567.89"
// de-DE: "1.234.567,89"

// Format percentage
formatPercent(0.75);
// en-US: "75%"
// de-DE: "75 %"

// Format file size
formatFileSize(1536);
// en-US: "1.5 KB"
// de-DE: "1,5 KB"
```

**List Formatting:**

```typescript
import { formatList } from '@/lib/i18n/formatting';

formatList(['apples', 'oranges', 'bananas']);
// en-US: "apples, oranges, and bananas"
// de-DE: "apples, oranges und bananas"
```

#### 3. RTL Language Support (`lib/i18n/rtl.ts`)

Utilities for supporting Right-to-Left languages (Arabic, Hebrew, etc.):

**Text Direction Detection:**

```typescript
import { getTextDirection, isRTL } from '@/lib/i18n/formatting';

const direction = getTextDirection(); // 'ltr' or 'rtl'
const isRightToLeft = isRTL(); // true or false
```

**RTL-Aware Styling:**

```typescript
import { rtlClass, rtlValue, useRTL } from '@/lib/i18n/rtl';

// Conditional class names
<div className={rtlClass('ml-4', 'mr-4')}>
  // Margin-left in LTR, margin-right in RTL
</div>

// Conditional values
const padding = rtlValue('0 0 0 16px', '0 16px 0 0');

// React hook
const { isRTL, direction, rtlClass } = useRTL();
```

**CSS Custom Properties:**

```typescript
import { getRTLCSSVars } from '@/lib/i18n/rtl';

const rtlVars = getRTLCSSVars();
<div style={rtlVars}>
  // Use var(--text-align-start) in CSS
</div>
```

**Document Direction:**

```typescript
import { applyRTLDirection } from '@/lib/i18n/rtl';

// Set dir="rtl" or dir="ltr" on <html> element
applyRTLDirection();
```

## Component Guidelines

### 1. Using Externalized Strings

**Before:**
```tsx
<button>Send</button>
<p>Type your message...</p>
```

**After:**
```tsx
import { UI_STRINGS } from '@/lib/i18n/strings';

<button>{UI_STRINGS.common.send}</button>
<p>{UI_STRINGS.inputArea.placeholder}</p>
```

### 2. String Interpolation

**Before:**
```tsx
<p>{charCount} / {maxLength}</p>
```

**After:**
```tsx
import { UI_STRINGS, interpolate } from '@/lib/i18n/strings';

<p>{interpolate(UI_STRINGS.inputArea.charCount, {
  current: charCount.toString(),
  max: maxLength.toString()
})}</p>
```

### 3. Locale-Aware Formatting

**Before:**
```tsx
<span>{new Date().toLocaleString()}</span>
<span>{value.toLocaleString()}</span>
```

**After:**
```tsx
import { formatDateTime, formatNumber } from '@/lib/i18n/formatting';

<span>{formatDateTime(new Date())}</span>
<span>{formatNumber(value)}</span>
```

### 4. RTL Support

**Before:**
```tsx
<div className="ml-4 text-left">
  <span>→</span>
</div>
```

**After:**
```tsx
import { useRTL } from '@/lib/i18n/rtl';

const { rtlClass, rtlTextAlign } = useRTL();

<div className={rtlClass('ml-4', 'mr-4')} style={{ textAlign: rtlTextAlign('left') }}>
  <span>{rtlValue('→', '←')}</span>
</div>
```

## Current Implementation Status

### ✅ Completed

1. **String Externalization**
   - All UI strings moved to `lib/i18n/strings.ts`
   - Organized by component/feature
   - Type-safe with TypeScript
   - Interpolation and pluralization helpers

2. **Locale-Aware Formatting**
   - Date and time formatting using `Intl.DateTimeFormat`
   - Number formatting using `Intl.NumberFormat`
   - Relative time formatting using `Intl.RelativeTimeFormat`
   - List formatting using `Intl.ListFormat`
   - File size and duration formatting

3. **RTL Language Support**
   - Text direction detection
   - RTL-aware styling utilities
   - CSS custom properties for RTL
   - React hooks for RTL support
   - Tailwind CSS RTL utility classes

4. **Documentation**
   - Comprehensive i18n documentation
   - Usage examples and guidelines
   - Migration path for future i18n library

### 🔄 Components Using Locale-Aware Formatting

The following components already use locale-aware formatting:

- **MessageList**: Uses `Intl.DateTimeFormat` for timestamps
- **PerformanceMonitor**: Uses `toLocaleString()` for number formatting
- **ExportImportService**: Uses `toLocaleString()` for export timestamps

### 📋 Future Integration Steps

When ready to implement full i18n support:

1. **Choose an i18n Library**
   - Recommended: `next-intl` (for Next.js) or `react-i18next`
   - Both integrate well with the current structure

2. **Create Translation Files**
   - Convert `UI_STRINGS` to JSON translation files
   - Structure: `locales/en.json`, `locales/es.json`, etc.
   - Use existing string keys as translation keys

3. **Update Components**
   - Replace `UI_STRINGS` imports with i18n hooks
   - Example: `const t = useTranslations(); t('inputArea.placeholder')`
   - Minimal changes needed due to current structure

4. **Add Locale Selector**
   - Add UI for language selection
   - Store preference in `PreferencesService`
   - Apply locale to formatting functions

5. **Test RTL Languages**
   - Test with Arabic (`ar`) and Hebrew (`he`)
   - Verify layout and text direction
   - Adjust styling as needed

## Translation Key Structure

The current string structure is designed to map directly to i18n translation keys:

```typescript
// Current structure
UI_STRINGS.inputArea.placeholder

// Future i18n key
t('inputArea.placeholder')

// Translation file (locales/en.json)
{
  "inputArea": {
    "placeholder": "Type your message..."
  }
}
```

## Best Practices

### DO ✅

- Use `UI_STRINGS` for all user-facing text
- Use formatting utilities for dates, times, and numbers
- Use RTL utilities for layout and styling
- Use `interpolate()` for dynamic text
- Use `pluralize()` for count-based text
- Test with different locales during development

### DON'T ❌

- Hardcode user-facing text in JSX
- Use `toLocaleString()` without locale parameter
- Assume left-to-right layout
- Concatenate strings for dynamic text
- Use English-specific pluralization logic
- Rely on string length for layout

## Testing i18n Preparation

### Manual Testing

1. **Change Browser Locale**
   - Chrome: Settings → Languages → Add language
   - Firefox: Settings → Language → Choose language
   - Safari: System Preferences → Language & Region

2. **Verify Formatting**
   - Check date/time formats match locale
   - Check number formats use correct separators
   - Check relative times use correct language

3. **Test RTL Support**
   - Use browser extension to force RTL
   - Verify layout mirrors correctly
   - Check text alignment and direction

### Automated Testing

```typescript
import { formatDate, formatNumber, getTextDirection } from '@/lib/i18n/formatting';

describe('i18n formatting', () => {
  it('formats dates according to locale', () => {
    const date = new Date('2024-01-15T14:30:00');
    
    const enUS = formatDate(date, { locale: 'en-US', dateStyle: 'medium' });
    expect(enUS).toBe('Jan 15, 2024');
    
    const deDE = formatDate(date, { locale: 'de-DE', dateStyle: 'medium' });
    expect(deDE).toBe('15. Jan. 2024');
  });
  
  it('detects RTL languages', () => {
    expect(getTextDirection('en-US')).toBe('ltr');
    expect(getTextDirection('ar-SA')).toBe('rtl');
    expect(getTextDirection('he-IL')).toBe('rtl');
  });
});
```

## Performance Considerations

1. **Intl API Caching**
   - `Intl.DateTimeFormat` and `Intl.NumberFormat` instances are cached by the browser
   - Creating formatters is relatively expensive, but reusing them is fast
   - Consider memoizing formatter instances for frequently used formats

2. **String Externalization**
   - No runtime performance impact
   - Strings are loaded once at module initialization
   - Tree-shaking removes unused strings in production builds

3. **RTL Utilities**
   - Minimal overhead for direction detection
   - CSS custom properties have no runtime cost
   - Consider memoizing RTL state in components

## Migration Checklist

When migrating to a full i18n solution:

- [ ] Choose i18n library (next-intl or react-i18next)
- [ ] Install and configure i18n library
- [ ] Convert `UI_STRINGS` to translation JSON files
- [ ] Create translation files for target languages
- [ ] Update components to use i18n hooks
- [ ] Add locale selector UI
- [ ] Integrate with `PreferencesService`
- [ ] Update formatting functions to use selected locale
- [ ] Test all languages and RTL support
- [ ] Update documentation

## Resources

### i18n Libraries

- **next-intl**: https://next-intl-docs.vercel.app/
  - Recommended for Next.js applications
  - Server-side rendering support
  - Type-safe translations

- **react-i18next**: https://react.i18next.com/
  - Popular React i18n library
  - Extensive ecosystem
  - Flexible configuration

### Browser APIs

- **Intl.DateTimeFormat**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
- **Intl.NumberFormat**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat
- **Intl.RelativeTimeFormat**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat
- **Intl.ListFormat**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/ListFormat

### RTL Resources

- **RTL Styling Guide**: https://rtlstyling.com/
- **Bidirectional Text**: https://www.w3.org/International/questions/qa-bidi-css-markup
- **CSS Logical Properties**: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties

## Support

For questions or issues related to internationalization:

1. Review this documentation
2. Check the inline code comments in `lib/i18n/`
3. Refer to the browser Intl API documentation
4. Consult the chosen i18n library documentation (when implemented)

---

**Last Updated:** 2024
**Requirements:** 56.1, 56.2, 56.3, 56.4, 56.5, 56.6, 56.7, 56.8
