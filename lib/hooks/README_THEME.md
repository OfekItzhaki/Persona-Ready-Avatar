# Theme Management System

This document describes the theme management system implemented for the UI/UX Enhancement feature.

## Overview

The theme management system provides a centralized way to manage application themes with support for:
- Light, dark, and high-contrast themes
- CSS variable-based theming
- Theme persistence to localStorage
- Theme validation with fallback
- Theme change events for cross-component communication

## Architecture

The theme system consists of several components:

1. **Design Tokens** (`lib/design-tokens/`)
   - `types.ts`: TypeScript interfaces for theme configuration
   - `tokens.ts`: Design token values (colors, spacing, typography, etc.)
   - `themes.ts`: Theme configurations (light, dark, high-contrast)
   - `loader.ts`: Theme loading and CSS variable application
   - `validator.ts`: Theme configuration validation

2. **useTheme Hook** (`lib/hooks/useTheme.ts`)
   - React hook for theme management
   - Provides theme state and control functions
   - Handles theme persistence and events

3. **ThemeProvider Component** (`components/ThemeProvider.tsx`)
   - Initializes theme system on app mount
   - Integrates with existing ThemeManager service
   - Syncs with Zustand store

## Usage

### Using the useTheme Hook

```typescript
import { useTheme } from '@/lib/hooks';

function MyComponent() {
  const { theme, setTheme, toggleTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={() => setTheme('dark')}>Dark Mode</button>
      <button onClick={() => setTheme('light')}>Light Mode</button>
      <button onClick={() => setTheme('high-contrast')}>High Contrast</button>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}
```

### Applying Theme Programmatically

```typescript
import { applyTheme } from '@/lib/hooks';

// Apply a theme directly
applyTheme('dark');

// The function returns the theme that was actually applied
// (may be fallback if validation fails)
const appliedTheme = applyTheme('dark');
console.log(`Applied theme: ${appliedTheme}`);
```

### Listening to Theme Changes

```typescript
useEffect(() => {
  const handleThemeChange = (event: Event) => {
    const customEvent = event as CustomEvent<{ theme: ThemeVariant }>;
    console.log(`Theme changed to: ${customEvent.detail.theme}`);
  };

  window.addEventListener('themeChanged', handleThemeChange);

  return () => {
    window.removeEventListener('themeChanged', handleThemeChange);
  };
}, []);
```

## CSS Variables

The theme system applies the following CSS variables to `document.documentElement`:

### Background Colors
- `--bg-primary`: Primary background color
- `--bg-secondary`: Secondary background color
- `--bg-tertiary`: Tertiary background color
- `--bg-glass`: Glass effect background (semi-transparent)

### Foreground Colors
- `--fg-primary`: Primary text color
- `--fg-secondary`: Secondary text color
- `--fg-tertiary`: Tertiary text color

### Border Colors
- `--border-primary`: Primary border color
- `--border-secondary`: Secondary border color
- `--border-focus`: Focus state border color

### Interactive Colors
- `--interactive-primary`: Primary interactive element color
- `--interactive-primary-hover`: Primary hover state color
- `--interactive-primary-active`: Primary active state color
- `--interactive-secondary`: Secondary interactive element color
- `--interactive-secondary-hover`: Secondary hover state color

### Gradients
- `--gradient-primary`: Primary gradient
- `--gradient-secondary`: Secondary gradient
- `--gradient-mesh`: Mesh gradient for backgrounds

### Shadows
- `--shadow-sm`: Small shadow
- `--shadow-md`: Medium shadow
- `--shadow-lg`: Large shadow
- `--shadow-glow`: Glow effect shadow

## Using CSS Variables in Components

```css
.my-component {
  background-color: var(--bg-primary);
  color: var(--fg-primary);
  border: 1px solid var(--border-primary);
  box-shadow: var(--shadow-md);
}

.my-button {
  background-color: var(--interactive-primary);
  transition: background-color 0.2s;
}

.my-button:hover {
  background-color: var(--interactive-primary-hover);
}

.my-button:active {
  background-color: var(--interactive-primary-active);
}
```

## Theme Configuration

Themes are defined in `lib/design-tokens/themes.ts`. Each theme must conform to the `ThemeConfig` interface:

```typescript
interface ThemeConfig {
  name: string;
  colors: {
    background: { primary, secondary, tertiary, glass };
    foreground: { primary, secondary, tertiary };
    border: { primary, secondary, focus };
    interactive: { primary, primaryHover, primaryActive, secondary, secondaryHover };
  };
  gradients: { primary, secondary, mesh };
  shadows: { sm, md, lg, glow };
}
```

## Theme Validation

The theme system validates theme configurations before applying them:

1. **Structure Validation**: Ensures all required properties exist
2. **Color Validation**: Validates color values are valid CSS colors
3. **Fallback**: Falls back to light theme if validation fails

## Theme Persistence

Themes are automatically persisted to localStorage with the key `app-theme`. The theme is restored on application mount.

## Integration with Existing Systems

The theme system integrates with:

1. **ThemeManager Service**: Existing theme management service
2. **PreferencesService**: Persists theme preferences
3. **Zustand Store**: Syncs theme state with global store

## Requirements Satisfied

This implementation satisfies the following requirements:

- **2.2**: Apply theme-specific CSS variables to document root
- **2.3**: Update color, gradient, and shadow variables
- **2.4**: Add appropriate theme class to root element
- **2.5**: Persist theme preference to localStorage
- **2.6**: Restore saved theme preference on load
- **2.7**: Emit themeChanged event
- **2.8**: Validate theme configurations
- **2.9**: Fall back to default light theme on validation failure

## Testing

The theme system includes comprehensive tests in `lib/hooks/__tests__/useTheme.test.ts`:

- Theme initialization
- Theme switching
- Theme persistence
- CSS variable application
- Theme validation and fallback
- Theme change events

Run tests with:
```bash
npm test -- lib/hooks/__tests__/useTheme.test.ts
```
