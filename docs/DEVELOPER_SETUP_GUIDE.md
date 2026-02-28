# Developer Setup Guide - Enhanced Avatar Features

This guide provides comprehensive information for developers working on the Avatar Client application with enhanced features. It covers environment configuration, local storage schema, preferences system, theme system, testing requirements, troubleshooting, browser compatibility, and performance optimization.

**Last Updated:** 2024  
**Requirements:** 52.1, 52.2, 52.3, 52.4, 52.5, 52.6, 52.7, 52.8

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Local Storage Schema](#local-storage-schema)
3. [Preferences System](#preferences-system)
4. [Theme System](#theme-system)
5. [Testing Requirements](#testing-requirements)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Browser Compatibility](#browser-compatibility)
8. [Performance Optimization](#performance-optimization)

---

## Environment Variables

### Required Variables

The following environment variables are **required** for the application to function:

#### `AZURE_SPEECH_KEY`
- **Type:** String (Server-side only)
- **Purpose:** Azure Speech Services subscription key for TTS synthesis
- **Example:** `"your_azure_speech_key_here"`
- **Where to get:** Azure Portal → Speech Services → Keys and Endpoint
- **Security:** Never commit to version control, server-side only

#### `AZURE_SPEECH_REGION`
- **Type:** String (Server-side only)
- **Purpose:** Azure Speech Services region (e.g., "eastus", "westeurope")
- **Example:** `"eastus"`
- **Where to get:** Azure Portal → Speech Services → Keys and Endpoint
- **Note:** Must match your subscription region

#### `BRAIN_API_URL`
- **Type:** String (Server-side only)
- **Purpose:** Base URL for the Brain API backend
- **Example:** `"https://your-brain-api.com"`
- **Note:** Used for server-side API calls

### Optional Variables

#### `NEXT_PUBLIC_AVATAR_MODEL_URL`
- **Type:** String (Client-side accessible)
- **Purpose:** Path or URL to the 3D avatar GLB model file
- **Default:** `"/models/avatar.glb"`
- **Example:** `"/models/custom-avatar.glb"` or `"https://cdn.example.com/avatar.glb"`
- **Note:** Model must contain viseme blendshape targets matching Azure viseme IDs

#### `NEXT_PUBLIC_LOG_LEVEL`
- **Type:** String (Client-side accessible)
- **Purpose:** Logging level for client-side logs
- **Default:** `"info"`
- **Options:** `"debug"`, `"info"`, `"warn"`, `"error"`
- **Note:** Automatically set to `"warn"` in production builds

#### `NODE_ENV`
- **Type:** String (Automatically set by Next.js)
- **Purpose:** Environment mode
- **Values:** `"development"`, `"production"`, `"test"`
- **Note:** Affects logging behavior and security features

### Environment File Setup

Create a `.env` file in the project root (never commit this file):

```env
# Azure Speech Services (Required)
AZURE_SPEECH_KEY=your_azure_speech_key_here
AZURE_SPEECH_REGION=eastus

# Brain API (Required)
BRAIN_API_URL=https://your-brain-api.com

# Avatar Model (Optional)
NEXT_PUBLIC_AVATAR_MODEL_URL=/models/avatar.glb

# Logging (Optional)
NEXT_PUBLIC_LOG_LEVEL=info
```

### Environment Validation

The application validates required environment variables at startup using `lib/env.ts`:

- **Build Time:** Logs warnings for missing variables but continues build
- **Runtime (Browser):** Throws error and prevents application from starting
- **Test Environment:** Skips validation (uses mock values from `vitest.setup.ts`)

To check environment configuration:

```typescript
import { getEnvConfig } from '@/lib/env';

const config = getEnvConfig();
console.log('Azure Region:', config.azureSpeechRegion);
```

---

## Local Storage Schema

The application uses browser localStorage to persist user preferences and data. All data is stored client-side only and never transmitted to external services.

### Storage Keys

#### `avatar-client-preferences`

**Purpose:** Stores all user preferences (audio, avatar, UI, offline queue)

**Schema Version:** 1 (versioned for future migrations)

**Structure:**
```typescript
{
  version: 1,
  timestamp: "2024-01-15T14:30:00.000Z",
  data: {
    audioPreferences: {
      volume: 100,              // 0-100
      isMuted: false,           // boolean
      playbackSpeed: 1.0,       // 0.5-2.0
      speechRate: 1.0,          // 0.5-2.0
      speechPitch: 0,           // -50 to +50
      audioQuality: "high"      // "low" | "medium" | "high"
    },
    avatarCustomization: {
      skinTone: "#f5d5c5",      // hex color
      eyeColor: "#4a90e2",      // hex color
      hairColor: "#3d2817",     // hex color
      currentExpression: null   // null | "neutral" | "happy" | "sad" | "surprised" | "angry"
    },
    uiPreferences: {
      theme: "system",                      // "light" | "dark" | "system"
      graphicsQuality: "high",              // "low" | "medium" | "high" | "ultra"
      performanceMonitorVisible: false,     // boolean
      performanceMonitorExpanded: false,    // boolean
      highContrastMode: false,              // boolean
      screenReaderOptimizations: false,     // boolean
      enhancedFocusIndicators: true         // boolean
    },
    offlineQueue: [
      {
        id: "uuid-string",
        agentId: "agent-id",
        message: "user message text",
        timestamp: "2024-01-15T14:30:00.000Z",
        status: "pending",      // "pending" | "sending" | "sent" | "failed"
        retryCount: 0
      }
    ]
  }
}
```

#### `avatar-client-archived-messages`

**Purpose:** Stores archived messages when in-memory limit (500 messages) is reached

**Structure:**
```typescript
{
  version: 1,
  timestamp: "2024-01-15T14:30:00.000Z",
  messages: [
    {
      id: "message-id",
      role: "user" | "agent",
      content: "message text",
      timestamp: "2024-01-15T14:30:00.000Z",
      // ... other message properties
    }
  ]
}
```

### Default Values

When no stored preferences exist or data is corrupted, the application uses these defaults:


```typescript
{
  audioPreferences: {
    volume: 100,
    isMuted: false,
    playbackSpeed: 1.0,
    speechRate: 1.0,
    speechPitch: 0,
    audioQuality: 'high'
  },
  avatarCustomization: {
    skinTone: '#f5d5c5',
    eyeColor: '#4a90e2',
    hairColor: '#3d2817',
    currentExpression: null
  },
  uiPreferences: {
    theme: 'system',
    graphicsQuality: 'high',
    performanceMonitorVisible: false,
    performanceMonitorExpanded: false,
    highContrastMode: false,
    screenReaderOptimizations: false,
    enhancedFocusIndicators: true
  },
  offlineQueue: []
}
```

### Validation Rules

All stored preferences are validated before being applied:

**Audio Preferences:**
- `volume`: 0-100 (integer)
- `playbackSpeed`: 0.5-2.0 (float)
- `speechRate`: 0.5-2.0 (float)
- `speechPitch`: -50 to +50 (integer)
- `audioQuality`: Must be "low", "medium", or "high"

**Avatar Customization:**
- `skinTone`, `eyeColor`, `hairColor`: Must be valid hex colors (#RRGGBB)
- `currentExpression`: Must be null or one of the valid expression values

**UI Preferences:**
- `theme`: Must be "light", "dark", or "system"
- `graphicsQuality`: Must be "low", "medium", "high", or "ultra"
- Boolean fields: Must be true or false

**Offline Queue:**
- Must be an array
- Maximum 50 items
- Each item must have required fields (id, agentId, message, timestamp, status, retryCount)

### Schema Versioning

The schema version allows for future migrations when the preference structure changes:

1. **Current Version:** 1
2. **Migration Logic:** Located in `LocalStorageRepository.migrateSchema()`
3. **Adding New Fields:** Increment version, add migration logic, update validation
4. **Backward Compatibility:** Old data is migrated automatically on load

### Accessing Local Storage

**Via LocalStorageRepository:**
```typescript
import { LocalStorageRepository } from '@/lib/repositories/LocalStorageRepository';

const repository = new LocalStorageRepository();

// Load preferences
const result = repository.load();
if (result.success) {
  console.log('Preferences:', result.data);
}

// Save preferences
const saveResult = repository.save(preferences);
if (saveResult.success) {
  console.log('Saved successfully');
}

// Clear all data
repository.clearAllData();
```

**Via PreferencesService (Recommended):**
```typescript
import { PreferencesService } from '@/lib/services/PreferencesService';

const service = PreferencesService.getInstance();

// Load preferences (automatically called on initialization)
service.loadPreferences();

// Update specific preferences
service.updateAudioPreferences({ volume: 75 });

// Reset to defaults
service.resetPreferences();
```

---

## Preferences System

The preferences system coordinates between the Zustand store and localStorage to manage user settings.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Components                      │
│  (SettingsPanel, AudioController, AvatarCustomizer)     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                  PreferencesService                      │
│  - Coordinates store and repository                      │
│  - Validates preferences before applying                 │
│  - Provides type-safe operations                         │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ↓                       ↓
┌──────────────────┐    ┌──────────────────────┐
│  Zustand Store   │    │ LocalStorageRepository│
│  (useAppStore)   │    │  (localStorage API)   │
│  - In-memory     │    │  - Persistent storage │
│  - Fast access   │    │  - Versioned schema   │
└──────────────────┘    └──────────────────────┘
```

### Initialization

The PreferencesService must be initialized at application startup:


```typescript
// In your app initialization (e.g., _app.tsx or layout.tsx)
import { PreferencesService } from '@/lib/services/PreferencesService';
import { useAppStore } from '@/lib/store/useAppStore';
import { LocalStorageRepository } from '@/lib/repositories/LocalStorageRepository';

// Initialize once at startup
const store = useAppStore.getState();
const repository = new LocalStorageRepository();
PreferencesService.initialize(store, repository);
```

The service automatically loads saved preferences on initialization.

### Using PreferencesService

**Get the singleton instance:**
```typescript
import { PreferencesService } from '@/lib/services/PreferencesService';

const preferencesService = PreferencesService.getInstance();
```

**Update audio preferences:**
```typescript
// Update volume
preferencesService.updateAudioPreferences({ volume: 75 });

// Update multiple properties
preferencesService.updateAudioPreferences({
  volume: 75,
  isMuted: false,
  playbackSpeed: 1.5
});
```

**Update avatar customization:**
```typescript
preferencesService.updateAvatarCustomization({
  skinTone: '#f5d5c5',
  eyeColor: '#4a90e2'
});
```

**Update UI preferences:**
```typescript
preferencesService.updateUIPreferences({
  theme: 'dark',
  graphicsQuality: 'high'
});
```

**Save current preferences:**
```typescript
const success = preferencesService.savePreferences();
if (!success) {
  console.error('Failed to save preferences');
}
```

**Reset to defaults:**
```typescript
const success = preferencesService.resetPreferences();
if (success) {
  console.log('Preferences reset to defaults');
}
```

### Adding New Preferences

To add a new preference field:

1. **Update TypeScript types** in `types/index.ts`:
```typescript
export interface AudioPreferences {
  // ... existing fields
  newField: string; // Add new field
}
```

2. **Update default values** in `LocalStorageRepository.ts`:
```typescript
private readonly defaultPreferences: UserPreferences = {
  audioPreferences: {
    // ... existing fields
    newField: 'default-value'
  }
}
```

3. **Add validation** in `LocalStorageRepository.validatePreferences()`:
```typescript
if (!isValidValue(audio.newField)) {
  return 'New field must be valid';
}
```

4. **Increment schema version** if structure changes significantly:
```typescript
const SCHEMA_VERSION = 2; // Increment version
```

5. **Add migration logic** in `LocalStorageRepository.migrateSchema()`:
```typescript
if (stored.version === 1) {
  // Migrate from v1 to v2
  return {
    success: true,
    data: {
      ...stored.data,
      audioPreferences: {
        ...stored.data.audioPreferences,
        newField: 'default-value'
      }
    }
  };
}
```

### Validation

All preference updates are validated before being applied:

- **Pre-validation:** Values checked before updating store
- **Type safety:** TypeScript ensures correct types
- **Range validation:** Numeric values checked against min/max
- **Enum validation:** String values checked against allowed options
- **Format validation:** Colors validated as hex format

If validation fails:
- Update is rejected
- Error is logged
- Store remains unchanged
- User is notified (if applicable)

---

## Theme System

The theme system manages light/dark themes and high contrast mode for accessibility.

### ThemeManager Service

The ThemeManager is a singleton service that handles theme switching:


```typescript
import { ThemeManager } from '@/lib/services/ThemeManager';

const themeManager = ThemeManager.getInstance();

// Set theme
themeManager.setTheme('dark');        // 'light' | 'dark' | 'system'

// Get current theme
const theme = themeManager.getTheme(); // Returns user's selection

// Get effective theme (resolves 'system' to actual theme)
const effective = themeManager.getEffectiveTheme(); // Returns 'light' or 'dark'

// Enable high contrast mode
themeManager.setHighContrastMode(true);

// Listen for theme changes
themeManager.onThemeChange((theme) => {
  console.log('Theme changed to:', theme);
});

// Listen for high contrast changes
themeManager.onHighContrastChange((enabled) => {
  console.log('High contrast mode:', enabled);
});
```

### Theme Application

Themes are applied via CSS classes on the `<html>` element:

**Classes:**
- `.light` - Light theme
- `.dark` - Dark theme
- `.high-contrast` - High contrast mode

**Data Attributes:**
- `data-theme="light"` or `data-theme="dark"`
- `data-high-contrast="true"` or `data-high-contrast="false"`

### CSS Theme Variables

Define theme-specific CSS variables in your global CSS:

```css
/* Light theme (default) */
:root {
  --color-background: #ffffff;
  --color-text: #1a1a1a;
  --color-primary: #4a90e2;
  --color-border: #e0e0e0;
}

/* Dark theme */
.dark {
  --color-background: #1a1a1a;
  --color-text: #ffffff;
  --color-primary: #6ab0ff;
  --color-border: #333333;
}

/* High contrast mode */
.high-contrast {
  --color-background: #000000;
  --color-text: #ffffff;
  --color-primary: #ffff00;
  --color-border: #ffffff;
}

/* Dark + High contrast */
.dark.high-contrast {
  --color-background: #000000;
  --color-text: #ffffff;
  --color-primary: #ffff00;
  --color-border: #ffffff;
}
```

### System Theme Detection

The ThemeManager automatically detects and responds to system theme changes:

```typescript
// Detects system preference
const systemTheme = themeManager.detectSystemTheme(); // 'light' or 'dark'

// Automatically updates when system theme changes
// (e.g., when user enables dark mode at sunset)
```

### Theme Transitions

Smooth transitions between themes are handled via CSS:

```css
html {
  transition: background-color 0.3s ease, color 0.3s ease;
}

* {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
```

### WCAG AA Contrast Requirements

All themes must maintain WCAG AA contrast ratios:

- **Normal text:** Minimum 4.5:1 contrast ratio
- **Large text (18pt+ or 14pt+ bold):** Minimum 3:1 contrast ratio
- **UI components:** Minimum 3:1 contrast ratio

Use the color contrast audit script to verify:

```bash
npm run audit:contrast
```

Or manually with the utility:

```typescript
import { checkContrast, getContrastRatio } from '@/lib/utils/colorContrast';

const ratio = getContrastRatio('#ffffff', '#1a1a1a');
console.log('Contrast ratio:', ratio); // Should be >= 4.5

const passes = checkContrast('#ffffff', '#1a1a1a', 'AA', 'normal');
console.log('Passes WCAG AA:', passes);
```

### Customizing Themes

To add a new theme or customize existing ones:

1. **Add theme option** to TypeScript types:
```typescript
export type Theme = 'light' | 'dark' | 'system' | 'custom';
```

2. **Define CSS variables** for the new theme:
```css
.custom {
  --color-background: #f0f0f0;
  --color-text: #2a2a2a;
  /* ... other variables */
}
```

3. **Update ThemeManager** if needed for special handling

4. **Verify contrast ratios** meet WCAG AA standards

---

## Testing Requirements

The enhanced features include comprehensive testing requirements across multiple testing strategies.

### Test Types

#### 1. Unit Tests

**Purpose:** Test individual components and functions in isolation

**Framework:** Vitest + React Testing Library

**Coverage Target:** 80%+ for new components

**Location:** `__tests__` directories or `.test.ts` files

**Run tests:**
```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report
```

**Example unit test:**
```typescript
import { render, screen } from '@testing-library/react';
import { AudioController } from '@/components/AudioController';

describe('AudioController', () => {
  it('displays volume slider', () => {
    render(<AudioController audioManager={mockAudioManager} />);
    expect(screen.getByRole('slider', { name: /volume/i })).toBeInTheDocument();
  });
});
```

#### 2. Integration Tests

**Purpose:** Test feature workflows across multiple components

**Framework:** Vitest + React Testing Library

**Location:** `__tests__/integration/` directories

**Example integration test:**
```typescript
describe('Message send-receive-speak workflow', () => {
  it('sends message, receives response, and plays TTS', async () => {
    // Test complete workflow from input to audio playback
  });
});
```

#### 3. Property-Based Tests

**Purpose:** Verify properties hold across randomized inputs

**Framework:** fast-check

**Iterations:** Minimum 100 test cases per property

**Location:** Files with `.properties.test.ts` suffix

**Run property tests:**
```bash
npm test -- --grep "property"
```

**Example property test:**
```typescript
import fc from 'fast-check';

describe('Audio controls properties', () => {
  it('volume changes are idempotent', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (volume) => {
        audioManager.setVolume(volume);
        const result1 = audioManager.getVolume();
        audioManager.setVolume(volume);
        const result2 = audioManager.getVolume();
        return result1 === result2;
      }),
      { numRuns: 100 }
    );
  });
});
```


#### 4. Accessibility Tests

**Purpose:** Verify WCAG AA compliance

**Tools:** 
- axe-core (automated accessibility testing)
- Manual testing with screen readers (NVDA, JAWS)
- Keyboard navigation testing

**Run accessibility tests:**
```bash
npm run test:a11y
```

### Test Organization

```
__tests__/
├── unit/                           # Unit tests
│   ├── components/
│   ├── services/
│   └── utils/
├── integration/                    # Integration tests
│   ├── message-workflow.test.tsx
│   ├── settings-changes.test.tsx
│   └── offline-mode.test.tsx
├── properties/                     # Property-based tests
│   ├── audio-controls.properties.test.ts
│   ├── message-operations.properties.test.ts
│   └── preferences.properties.test.ts
└── accessibility/                  # Accessibility tests
    ├── keyboard-navigation.test.tsx
    └── screen-reader.test.tsx
```

### Writing Tests for New Features

When adding a new feature, include:

1. **Unit tests** for the component/service
2. **Integration tests** if it interacts with other components
3. **Property-based tests** for critical operations
4. **Accessibility tests** for UI components

**Example test checklist for a new component:**

- [ ] Renders correctly with default props
- [ ] Handles user interactions (clicks, keyboard)
- [ ] Updates state correctly
- [ ] Calls callbacks with correct arguments
- [ ] Handles error states
- [ ] Displays loading states
- [ ] Includes ARIA labels
- [ ] Supports keyboard navigation
- [ ] Maintains focus management
- [ ] Passes accessibility audit

### Mocking

**Mock services in tests:**
```typescript
import { vi } from 'vitest';

const mockAudioManager = {
  setVolume: vi.fn(),
  getVolume: vi.fn(() => 100),
  play: vi.fn(),
  pause: vi.fn(),
};
```

**Mock API calls:**
```typescript
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ message: 'Response' }),
  })
);
```

**Mock localStorage:**
```typescript
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;
```

### Test Coverage

View coverage report:
```bash
npm run test:coverage
```

Coverage is reported for:
- **Statements:** Lines of code executed
- **Branches:** Conditional paths taken
- **Functions:** Functions called
- **Lines:** Individual lines executed

**Target:** 80%+ coverage for new code

### Continuous Integration

Tests run automatically in CI/CD pipeline:

1. **Pre-commit:** Unit tests for changed files (via Husky)
2. **Pull Request:** Full test suite including integration and property tests
3. **Pre-deployment:** All tests must pass

---

## Troubleshooting Guide

Common issues and solutions for developers working with enhanced features.

### Environment Issues

#### Issue: "Missing required environment variables"

**Symptoms:** Application fails to start with environment variable error

**Solutions:**
1. Verify `.env` file exists in project root
2. Check all required variables are set (AZURE_SPEECH_KEY, AZURE_SPEECH_REGION, BRAIN_API_URL)
3. Restart development server after adding variables
4. Ensure no typos in variable names
5. Check `.env` file is not in `.gitignore` (it should be)

#### Issue: Azure TTS fails with authentication error

**Symptoms:** TTS synthesis fails with 401 or 403 errors

**Solutions:**
1. Verify AZURE_SPEECH_KEY is correct
2. Check AZURE_SPEECH_REGION matches your subscription
3. Ensure Azure subscription is active
4. Check API key hasn't expired
5. Verify network connectivity to Azure services

### Local Storage Issues

#### Issue: Preferences not persisting

**Symptoms:** Settings reset after page refresh

**Solutions:**
1. Check browser allows localStorage (not in private/incognito mode)
2. Verify localStorage quota not exceeded
3. Check browser console for localStorage errors
4. Try clearing localStorage and reconfiguring
5. Ensure PreferencesService is initialized

**Clear localStorage manually:**
```javascript
// In browser console
localStorage.removeItem('avatar-client-preferences');
localStorage.removeItem('avatar-client-archived-messages');
```

#### Issue: "Preference validation failed"

**Symptoms:** Preferences fail to save with validation error

**Solutions:**
1. Check values are within acceptable ranges
2. Verify color values are valid hex format (#RRGGBB)
3. Ensure enum values match allowed options
4. Check browser console for specific validation error
5. Reset to defaults if data is corrupted

### Theme Issues

#### Issue: Theme not applying correctly

**Symptoms:** Colors don't change when switching themes

**Solutions:**
1. Check ThemeManager is initialized
2. Verify CSS classes are applied to `<html>` element
3. Ensure CSS variables are defined for all themes
4. Check for CSS specificity conflicts
5. Clear browser cache and reload

#### Issue: System theme not detected

**Symptoms:** "System" theme option doesn't match OS preference

**Solutions:**
1. Verify browser supports `prefers-color-scheme` media query
2. Check OS has dark mode enabled/disabled
3. Try manually selecting light or dark theme
4. Restart browser
5. Check browser console for ThemeManager errors

### Performance Issues

#### Issue: Low FPS during avatar rendering

**Symptoms:** Performance monitor shows <30 FPS

**Solutions:**
1. Lower graphics quality in settings (Medium or Low)
2. Disable post-processing effects
3. Check GPU acceleration is enabled in browser
4. Update graphics drivers
5. Close other browser tabs
6. Check CPU/GPU usage in task manager

#### Issue: Memory usage increasing over time

**Symptoms:** Browser becomes slow after extended use

**Solutions:**
1. Check for memory leaks in browser DevTools
2. Use "Clear Cache" option in settings
3. Verify Three.js resources are disposed properly
4. Check audio buffers are released after playback
5. Limit conversation history (export and clear old messages)

### Audio Issues

#### Issue: No audio playback

**Symptoms:** TTS synthesis succeeds but no sound

**Solutions:**
1. Check volume slider is not at 0%
2. Verify mute button is not active
3. Check browser audio permissions
4. Ensure system volume is not muted
5. Try different audio quality setting
6. Check browser console for Web Audio API errors

#### Issue: Audio stuttering or crackling

**Symptoms:** Audio playback is choppy

**Solutions:**
1. Lower audio quality (Medium or Low)
2. Check network latency in performance monitor
3. Disable other audio-intensive applications
4. Try different playback speed
5. Check CPU usage is not maxed out

### Testing Issues

#### Issue: Tests failing with timeout errors

**Symptoms:** Property-based tests timeout

**Solutions:**
1. Reduce number of test iterations temporarily
2. Check for infinite loops in test code
3. Increase test timeout in vitest.config.ts
4. Mock slow operations (API calls, animations)
5. Run tests individually to isolate issue

#### Issue: Mock not working correctly

**Symptoms:** Tests fail because mocks aren't called

**Solutions:**
1. Verify mock is created before component renders
2. Check mock is passed to component correctly
3. Ensure mock methods match actual interface
4. Use `vi.fn()` for function mocks
5. Check mock is not being overridden

### Build Issues

#### Issue: TypeScript errors during build

**Symptoms:** Build fails with type errors

**Solutions:**
1. Run `npm run type-check` to see all errors
2. Ensure all dependencies are installed
3. Check TypeScript version matches project requirements
4. Verify types are imported correctly
5. Clear node_modules and reinstall

#### Issue: Build succeeds but runtime errors

**Symptoms:** Application crashes in production

**Solutions:**
1. Check environment variables are set in production
2. Verify all dependencies are in `dependencies` (not `devDependencies`)
3. Test production build locally: `npm run build && npm start`
4. Check browser console for specific errors
5. Ensure code doesn't rely on development-only features

---

## Browser Compatibility

The application supports modern browsers with specific version requirements.

### Supported Browsers

| Browser | Minimum Version | Recommended | Notes |
|---------|----------------|-------------|-------|
| Chrome | 90+ | Latest | Best performance |
| Firefox | 88+ | Latest | Good performance |
| Safari | 14+ | Latest | iOS support |
| Edge | 90+ | Latest | Chromium-based |

### Required Browser Features


- **WebGL 1.0** (minimum) or **WebGL 2.0** (preferred) for 3D rendering
- **Web Audio API** for audio playback and analysis
- **localStorage** for preferences persistence
- **ES6+ JavaScript** support
- **CSS Grid and Flexbox** for layout
- **Media Queries** for responsive design
- **Intl API** for internationalization

### Browser Detection

The application automatically detects browser compatibility:

```typescript
import { detectBrowser, isSupported } from '@/lib/utils/browserDetection';

const browser = detectBrowser();
console.log('Browser:', browser.name, browser.version);

if (!isSupported()) {
  // Display compatibility warning
}
```

### Compatibility Warnings

Unsupported browsers see a warning banner with:
- Browser name and version
- List of supported browsers
- Recommendation to upgrade
- Option to continue anyway (at own risk)

### Feature Detection

Use feature detection instead of browser detection:

```typescript
// Check WebGL support
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
if (!gl) {
  console.error('WebGL not supported');
}

// Check Web Audio API
if (!window.AudioContext && !window.webkitAudioContext) {
  console.error('Web Audio API not supported');
}

// Check localStorage
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
} catch (e) {
  console.error('localStorage not available');
}
```

### Fallback Implementations

The application provides fallbacks for missing features:

**WebGL Fallback:**
- Display error message in 3D viewport
- Continue in text-only mode
- Provide troubleshooting steps

**Web Audio API Fallback:**
- Display TTS error notification
- Show text transcript only
- Suggest browser upgrade

**localStorage Fallback:**
- Use in-memory storage (session-only)
- Warn user preferences won't persist
- Suggest enabling localStorage

### Testing Across Browsers

**Manual Testing:**
1. Test on Chrome (primary development browser)
2. Test on Firefox (different rendering engine)
3. Test on Safari (WebKit, iOS compatibility)
4. Test on Edge (Chromium-based, Windows compatibility)

**Automated Testing:**
- Use Playwright for cross-browser E2E tests
- Configure test matrix in CI/CD pipeline

**Browser-Specific Issues:**

**Safari:**
- Audio autoplay restrictions (require user interaction)
- WebGL performance differences
- localStorage quota limits

**Firefox:**
- Different Web Audio API behavior
- CSS rendering differences
- Performance characteristics

**Mobile Browsers:**
- Touch event handling
- Viewport sizing
- Performance constraints
- Audio playback restrictions

### Polyfills

The application uses minimal polyfills for modern browsers:

```javascript
// next.config.js
module.exports = {
  // Next.js includes necessary polyfills automatically
  // for supported browsers based on browserslist
};
```

**Browserslist configuration** (package.json):
```json
{
  "browserslist": [
    "chrome >= 90",
    "firefox >= 88",
    "safari >= 14",
    "edge >= 90"
  ]
}
```

---

## Performance Optimization

Guidelines for maintaining optimal performance in the enhanced Avatar Client.

### Performance Targets

- **FPS:** Maintain 60 FPS during normal operation
- **Lighthouse Score:** 90+ on desktop
- **Time to Interactive:** <3 seconds
- **First Contentful Paint:** <1.5 seconds
- **Memory Usage:** Stable, no leaks during extended sessions

### Component Optimization

#### 1. React.memo for Expensive Components

Wrap components that render frequently with React.memo:

```typescript
import { memo } from 'react';

export const MessageList = memo(({ messages, onEdit, onDelete }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison function (optional)
  return prevProps.messages === nextProps.messages;
});
```

**Components to memoize:**
- MessageList
- AvatarCustomizer
- AudioController
- PerformanceMonitor

#### 2. Virtual Scrolling

Use virtual scrolling for long lists:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80, // Estimated item height
  overscan: 5, // Render 5 extra items above/below viewport
});
```

**When to use:**
- Message lists with 100+ items
- Any scrollable list with dynamic content

#### 3. Debouncing and Throttling

Debounce expensive operations:

```typescript
import { debounce } from 'lodash';

// Debounce search input (300ms)
const debouncedSearch = debounce((query: string) => {
  performSearch(query);
}, 300);

// Throttle audio level updates (30 FPS = ~33ms)
const throttledUpdate = throttle(() => {
  updateAudioLevels();
}, 33);
```

**When to use:**
- Search input
- Slider changes
- Scroll events
- Resize events
- Audio level updates

#### 4. Lazy Loading

Lazy load components not needed immediately:

```typescript
import { lazy, Suspense } from 'react';

const SettingsPanel = lazy(() => import('@/components/SettingsPanel'));
const PerformanceMonitor = lazy(() => import('@/components/PerformanceMonitor'));

// Usage
<Suspense fallback={<LoadingSpinner />}>
  {showSettings && <SettingsPanel />}
</Suspense>
```

**Components to lazy load:**
- SettingsPanel
- PerformanceMonitor
- HelpDialog
- Export/Import dialogs

### 3D Rendering Optimization

#### 1. Graphics Quality Presets

Implement quality presets that adjust rendering settings:

```typescript
const graphicsPresets = {
  low: {
    shadows: false,
    postProcessing: false,
    antialiasing: false,
    pixelRatio: 1,
  },
  medium: {
    shadows: true,
    shadowMapSize: 512,
    postProcessing: true,
    antialiasing: false,
    pixelRatio: 1,
  },
  high: {
    shadows: true,
    shadowMapSize: 1024,
    postProcessing: true,
    antialiasing: true,
    pixelRatio: Math.min(window.devicePixelRatio, 2),
  },
  ultra: {
    shadows: true,
    shadowMapSize: 2048,
    postProcessing: true,
    antialiasing: true,
    pixelRatio: window.devicePixelRatio,
  },
};
```

#### 2. Resource Management

Dispose Three.js resources properly:

```typescript
useEffect(() => {
  // Create resources
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(geometry, material);

  return () => {
    // Cleanup
    geometry.dispose();
    material.dispose();
    mesh.clear();
  };
}, []);
```

#### 3. Reuse Materials and Geometries

Share materials and geometries across meshes:

```typescript
// Create once, reuse many times
const sharedMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const sharedGeometry = new THREE.SphereGeometry(1, 32, 32);

// Use for multiple meshes
const mesh1 = new THREE.Mesh(sharedGeometry, sharedMaterial);
const mesh2 = new THREE.Mesh(sharedGeometry, sharedMaterial);
```

### Memory Management

#### 1. Message Archival

Limit in-memory messages to 500:

```typescript
const MAX_MESSAGES = 500;

if (messages.length > MAX_MESSAGES) {
  const toArchive = messages.slice(0, messages.length - MAX_MESSAGES);
  localStorageRepository.archiveMessages(toArchive);
  setMessages(messages.slice(-MAX_MESSAGES));
}
```

#### 2. Audio Buffer Cleanup

Release audio buffers after playback:

```typescript
audioManager.on('playbackEnded', (buffer) => {
  // Release buffer reference
  buffer = null;
});
```

#### 3. Clear Cache Option

Provide user option to clear cached data:

```typescript
const clearCache = () => {
  // Clear archived messages
  localStorageRepository.clearAllData();
  
  // Clear in-memory caches
  queryClient.clear();
  
  // Force garbage collection (if available)
  if (global.gc) {
    global.gc();
  }
};
```

### Network Optimization

#### 1. Audio Quality Selection

Allow users to choose audio quality based on bandwidth:

```typescript
const audioQualitySettings = {
  low: {
    format: 'audio-16khz-32kbitrate-mono-mp3',
    bandwidth: '32 kbps',
  },
  medium: {
    format: 'audio-24khz-48kbitrate-mono-mp3',
    bandwidth: '48 kbps',
  },
  high: {
    format: 'audio-48khz-96kbitrate-mono-mp3',
    bandwidth: '96 kbps',
  },
};
```

#### 2. Request Caching

Use React Query for intelligent caching:

```typescript
const { data } = useQuery({
  queryKey: ['agents'],
  queryFn: fetchAgents,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

### Performance Monitoring

#### 1. Use PerformanceMonitor Component

Enable performance monitoring during development:

```typescript
// Press Ctrl+Shift+P to toggle
<PerformanceMonitor visible={isDevelopment} />
```

#### 2. Browser DevTools

Use Chrome DevTools Performance tab:
1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Interact with application
5. Stop recording
6. Analyze flame graph for bottlenecks

#### 3. React DevTools Profiler

Profile React component renders:
1. Install React DevTools extension
2. Open Profiler tab
3. Click Record
4. Interact with application
5. Stop recording
6. Analyze render times

### Performance Checklist

When adding new features:

- [ ] Use React.memo for expensive components
- [ ] Implement virtual scrolling for long lists
- [ ] Debounce/throttle frequent updates
- [ ] Lazy load non-critical components
- [ ] Dispose Three.js resources in cleanup
- [ ] Limit in-memory data (archive old messages)
- [ ] Release audio buffers after playback
- [ ] Use appropriate graphics quality presets
- [ ] Cache API responses with React Query
- [ ] Test performance with PerformanceMonitor
- [ ] Profile with Chrome DevTools
- [ ] Verify 60 FPS during normal operation
- [ ] Check memory usage remains stable

---

## Additional Resources

### Documentation

- [Feature Usage Guide](./FEATURE_USAGE_GUIDE.md) - User-facing feature documentation
- [Internationalization](./INTERNATIONALIZATION.md) - i18n preparation and guidelines
- [Browser Compatibility](./BROWSER_COMPATIBILITY.md) - Detailed browser support information
- [Keyboard Navigation](./KEYBOARD_NAVIGATION.md) - Keyboard shortcuts and navigation
- [Screen Reader Support](./SCREEN_READER_SUPPORT.md) - Accessibility for screen readers
- [The Horizon Standard](./THE_HORIZON_STANDARD.md) - Architectural principles

### External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [Three.js Documentation](https://threejs.org/docs/)
- [Azure Speech Services](https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

### Getting Help

1. Check this documentation first
2. Review inline code comments
3. Check browser console for errors
4. Search existing issues in repository
5. Ask team members
6. Create new issue with detailed information

---

**Last Updated:** 2024  
**Version:** 1.0  
**Requirements:** 52.1, 52.2, 52.3, 52.4, 52.5, 52.6, 52.7, 52.8
