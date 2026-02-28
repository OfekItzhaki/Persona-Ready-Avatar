# Internationalization (i18n) Module

This module provides comprehensive internationalization support for the Avatar Client application.

## Quick Start

```typescript
import { UI_STRINGS, interpolate, formatDate, formatNumber, useRTL } from '@/lib/i18n';

// Use externalized strings
const placeholder = UI_STRINGS.inputArea.placeholder;

// String interpolation
const charCount = interpolate(UI_STRINGS.inputArea.charCount, {
  current: '100',
  max: '5000'
});

// Locale-aware date formatting
const formattedDate = formatDate(new Date(), { dateStyle: 'medium' });

// Locale-aware number formatting
const formattedNumber = formatNumber(1234567.89);

// RTL support
const { isRTL, rtlClass } = useRTL();
```

## Module Structure

### `strings.ts`
- **Purpose**: Externalized UI strings for all user-facing text
- **Exports**: `UI_STRINGS`, `interpolate()`, `pluralize()`
- **Usage**: Import strings instead of hardcoding text

### `formatting.ts`
- **Purpose**: Locale-aware formatting for dates, times, and numbers
- **Exports**: `formatDate()`, `formatTime()`, `formatNumber()`, etc.
- **Usage**: Format all user-visible data with locale awareness

### `rtl.ts`
- **Purpose**: RTL (Right-to-Left) language support utilities
- **Exports**: `rtlClass()`, `rtlValue()`, `useRTL()`, etc.
- **Usage**: Support RTL languages like Arabic and Hebrew

### `index.ts`
- **Purpose**: Main export file for the i18n module
- **Exports**: All utilities from strings, formatting, and rtl
- **Usage**: Import from `@/lib/i18n` for convenience

## Examples

### Basic String Usage

```tsx
import { UI_STRINGS } from '@/lib/i18n';

function MyComponent() {
  return (
    <div>
      <h1>{UI_STRINGS.settingsPanel.title}</h1>
      <button>{UI_STRINGS.common.save}</button>
    </div>
  );
}
```

### String Interpolation

```tsx
import { UI_STRINGS, interpolate } from '@/lib/i18n';

function CharCounter({ current, max }: { current: number; max: number }) {
  const text = interpolate(UI_STRINGS.inputArea.charCount, {
    current: current.toString(),
    max: max.toString()
  });
  
  return <span>{text}</span>; // "100 / 5000"
}
```

### Pluralization

```tsx
import { UI_STRINGS, pluralize } from '@/lib/i18n';

function SearchResults({ count }: { count: number }) {
  const text = pluralize(UI_STRINGS.messageList.searchResults, { count });
  
  return <p>{text}</p>; // "5 results found" or "1 result found"
}
```

### Date Formatting

```tsx
import { formatDate, formatTime, formatRelativeTime } from '@/lib/i18n';

function DateDisplay({ date }: { date: Date }) {
  return (
    <div>
      <p>{formatDate(date, { dateStyle: 'long' })}</p>
      <p>{formatTime(date, { timeStyle: 'short' })}</p>
      <p>{formatRelativeTime(date)}</p>
    </div>
  );
}
```

### Number Formatting

```tsx
import { formatNumber, formatPercent, formatFileSize } from '@/lib/i18n';

function MetricsDisplay() {
  return (
    <div>
      <p>Users: {formatNumber(1234567)}</p>
      <p>Success Rate: {formatPercent(0.95)}</p>
      <p>File Size: {formatFileSize(1536000)}</p>
    </div>
  );
}
```

### RTL Support

```tsx
import { useRTL } from '@/lib/i18n';

function RTLAwareComponent() {
  const { isRTL, rtlClass, rtlTextAlign } = useRTL();
  
  return (
    <div 
      className={rtlClass('ml-4', 'mr-4')}
      style={{ textAlign: rtlTextAlign('left') }}
    >
      <p>This component adapts to RTL languages</p>
    </div>
  );
}
```

## Best Practices

1. **Always use `UI_STRINGS`** for user-facing text
2. **Use formatting utilities** for dates, times, and numbers
3. **Use RTL utilities** for layout and styling
4. **Never hardcode text** in JSX components
5. **Test with different locales** during development

## Future Integration

This module is designed to integrate seamlessly with i18n libraries like:
- **next-intl** (recommended for Next.js)
- **react-i18next** (popular React i18n library)

See `docs/INTERNATIONALIZATION.md` for detailed migration guide.

## Requirements

This module addresses Requirement 56: Internationalization Preparation
- 56.1: Externalize all user-facing text strings
- 56.2: Use locale-aware date and time formatting
- 56.3: Use locale-aware number formatting
- 56.4: Structure components to support RTL languages
- 56.5: Avoid hardcoded text in JSX
- 56.6: Use i18n-friendly string interpolation
- 56.7: Document internationalization approach
- 56.8: Prepare translation key structure
