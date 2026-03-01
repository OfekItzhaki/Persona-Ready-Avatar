'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { ThemeManager } from '@/lib/services/ThemeManager';
import { PreferencesService } from '@/lib/services/PreferencesService';
import { applyTheme } from '@/lib/hooks/useTheme';
import type { ThemeVariant } from '@/lib/design-tokens/types';

/**
 * ThemeProvider Component
 * 
 * Initializes and manages the theme system for the application.
 * Integrates the new design token-based theme system with the existing ThemeManager.
 * 
 * Features:
 * - Initializes ThemeManager on mount
 * - Loads saved theme preference from PreferencesService
 * - Applies theme with CSS variables and design tokens
 * - Listens for theme changes and persists them
 * - Syncs theme changes with Zustand store
 * - Theme validation with fallback to default light theme
 * - Theme change event emission
 * 
 * Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 23
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((state) => state.uiPreferences.theme);
  const updateUIPreferences = useAppStore((state) => state.updateUIPreferences);

  /**
   * Initialize ThemeManager and load saved theme on mount
   */
  useEffect(() => {
    const themeManager = ThemeManager.getInstance();

    // Map ThemeManager theme types to ThemeVariant
    const mapThemeToVariant = (themeType: 'light' | 'dark' | 'system'): ThemeVariant => {
      if (themeType === 'system') {
        // Detect system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
      }
      return themeType;
    };

    // Apply initial theme using the new theme system
    const initialVariant = mapThemeToVariant(theme);
    applyTheme(initialVariant);

    // Set theme in ThemeManager
    themeManager.setTheme(theme);

    // Register callback to persist theme changes
    themeManager.onThemeChange((newTheme) => {
      // Apply theme using new system
      const variant = mapThemeToVariant(newTheme);
      applyTheme(variant);

      // Update store
      updateUIPreferences({ theme: newTheme });

      // Persist to localStorage
      try {
        const prefsService = PreferencesService.getInstance();
        prefsService.updateUIPreferences({ theme: newTheme });
      } catch (error) {
        console.warn('Failed to persist theme preference:', error);
      }
    });

    // Register high contrast mode callback
    themeManager.onHighContrastChange((enabled) => {
      if (enabled) {
        // Apply high-contrast theme
        applyTheme('high-contrast');
      } else {
        // Revert to current theme
        const variant = mapThemeToVariant(theme);
        applyTheme(variant);
      }
    });
  }, []); // Only run on mount

  /**
   * Apply theme changes from store to ThemeManager
   * This handles theme changes from SettingsPanel
   */
  useEffect(() => {
    const themeManager = ThemeManager.getInstance();
    themeManager.setTheme(theme);

    // Also apply using new theme system
    const mapThemeToVariant = (themeType: 'light' | 'dark' | 'system'): ThemeVariant => {
      if (themeType === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
      }
      return themeType;
    };

    const variant = mapThemeToVariant(theme);
    applyTheme(variant);
  }, [theme]);

  return <>{children}</>;
}
