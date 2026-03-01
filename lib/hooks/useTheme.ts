/**
 * useTheme Hook
 * 
 * React hook for theme management that provides theme switching functionality,
 * theme state access, and integration with the design token system.
 * 
 * Features:
 * - Get current theme and effective theme
 * - Switch between light, dark, and high-contrast themes
 * - Theme persistence to localStorage
 * - Theme change event handling
 * - CSS variable application
 * - Theme validation with fallback
 * 
 * Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9
 */

import { useState, useEffect, useCallback } from 'react';
import type { ThemeVariant } from '@/lib/design-tokens/types';
import { 
  getThemeConfigWithFallback,
  applyThemeVariables,
  applyThemeClass 
} from '@/lib/design-tokens/loader';

const THEME_STORAGE_KEY = 'app-theme';

/**
 * Theme change event for cross-component communication
 */
const THEME_CHANGE_EVENT = 'themeChanged';

/**
 * Emit theme change event
 */
function emitThemeChangeEvent(theme: ThemeVariant): void {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme } });
    window.dispatchEvent(event);
  }
}

/**
 * Apply theme to the document
 * 
 * This function:
 * 1. Validates the theme configuration
 * 2. Falls back to light theme if invalid
 * 3. Applies CSS variables to document root
 * 4. Updates theme class on root element
 * 5. Persists theme to localStorage
 * 6. Emits theme change event
 * 
 * @param themeName - The theme to apply
 * @returns The theme that was actually applied (may be fallback)
 */
export function applyTheme(themeName: ThemeVariant): ThemeVariant {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return themeName;
  }

  try {
    // Load theme configuration with validation and fallback
    const themeConfig = getThemeConfigWithFallback(themeName);
    const appliedTheme = themeConfig.name as ThemeVariant;

    // Apply CSS variables
    applyThemeVariables(themeConfig);

    // Apply theme class
    applyThemeClass(appliedTheme);

    // Persist to localStorage
    try {
      localStorage.setItem(THEME_STORAGE_KEY, appliedTheme);
    } catch (error) {
      console.warn('Failed to persist theme to localStorage:', error);
    }

    // Emit theme change event
    emitThemeChangeEvent(appliedTheme);

    return appliedTheme;
  } catch (error) {
    console.error('Failed to apply theme:', error);
    
    // Fall back to light theme on error
    const fallbackTheme = 'light';
    const themeConfig = getThemeConfigWithFallback(fallbackTheme);
    
    applyThemeVariables(themeConfig);
    applyThemeClass(fallbackTheme);
    
    try {
      localStorage.setItem(THEME_STORAGE_KEY, fallbackTheme);
    } catch (e) {
      // Ignore localStorage errors in fallback
    }
    
    emitThemeChangeEvent(fallbackTheme);
    
    return fallbackTheme;
  }
}

/**
 * Load theme from localStorage
 * 
 * @returns The saved theme or null if not found
 */
function loadThemeFromStorage(): ThemeVariant | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && (saved === 'light' || saved === 'dark' || saved === 'high-contrast')) {
      return saved as ThemeVariant;
    }
  } catch (error) {
    console.warn('Failed to load theme from localStorage:', error);
  }

  return null;
}

/**
 * useTheme Hook
 * 
 * Provides theme management functionality for React components.
 * 
 * @returns Object with theme state and control functions
 */
export function useTheme() {
  // Initialize with saved theme or default to light
  const [theme, setThemeState] = useState<ThemeVariant>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }
    return loadThemeFromStorage() || 'light';
  });

  /**
   * Set theme and apply it to the document
   */
  const setTheme = useCallback((newTheme: ThemeVariant) => {
    const appliedTheme = applyTheme(newTheme);
    setThemeState(appliedTheme);
  }, []);

  /**
   * Toggle between light and dark themes
   */
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [theme, setTheme]);

  /**
   * Initialize theme on mount
   */
  useEffect(() => {
    // Apply the initial theme
    applyTheme(theme);

    // Listen for theme change events from other components
    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ theme: ThemeVariant }>;
      if (customEvent.detail?.theme && customEvent.detail.theme !== theme) {
        setThemeState(customEvent.detail.theme);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
      }
    };
  }, []); // Only run on mount

  return {
    theme,
    setTheme,
    toggleTheme,
  };
}
