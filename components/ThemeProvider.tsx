'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { ThemeManager } from '@/lib/services/ThemeManager';
import { PreferencesService } from '@/lib/services/PreferencesService';

/**
 * ThemeProvider Component
 * 
 * Initializes and manages the ThemeManager service for the application.
 * 
 * Features:
 * - Initializes ThemeManager on mount
 * - Loads saved theme preference from PreferencesService
 * - Applies theme on app start
 * - Listens for theme changes and persists them
 * - Syncs theme changes with Zustand store
 * 
 * Requirements: 23
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((state) => state.uiPreferences.theme);
  const updateUIPreferences = useAppStore((state) => state.updateUIPreferences);

  /**
   * Initialize ThemeManager and load saved theme on mount
   */
  useEffect(() => {
    const themeManager = ThemeManager.getInstance();

    // Load saved theme from store (already loaded by PreferencesService)
    themeManager.setTheme(theme);

    // Register callback to persist theme changes
    themeManager.onThemeChange((newTheme) => {
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
  }, []); // Only run on mount

  /**
   * Apply theme changes from store to ThemeManager
   * This handles theme changes from SettingsPanel
   */
  useEffect(() => {
    const themeManager = ThemeManager.getInstance();
    themeManager.setTheme(theme);
  }, [theme]);

  return <>{children}</>;
}
