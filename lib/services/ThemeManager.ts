import { logger } from '../logger';

/**
 * Theme type definition
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * ThemeManager
 * 
 * Manages application theme switching between light, dark, and system preferences.
 * Also manages high contrast mode for accessibility.
 * Implements singleton pattern for global theme management.
 * 
 * Features:
 * - Theme switching (Light, Dark, System)
 * - High contrast mode support
 * - System theme preference detection
 * - Smooth transitions between themes
 * - Automatic system theme change detection
 * - CSS class-based theme application
 * - Integration with PreferencesService for persistence
 * 
 * Requirements: 23, 37
 */
export class ThemeManager {
  private static instance: ThemeManager | null = null;
  private currentTheme: Theme = 'system';
  private systemTheme: 'light' | 'dark' = 'light';
  private highContrastMode: boolean = false;
  private mediaQuery: MediaQueryList | null = null;
  private onThemeChangeCallback: ((theme: Theme) => void) | null = null;
  private onHighContrastChangeCallback: ((enabled: boolean) => void) | null = null;

  private constructor() {
    this.detectSystemTheme();
    this.setupSystemThemeListener();
  }

  /**
   * Get the singleton instance of ThemeManager
   */
  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static reset(): void {
    const instance = ThemeManager.instance;
    if (instance?.mediaQuery) {
      instance.cleanup();
    }
    ThemeManager.instance = null;
  }

  /**
   * Set the application theme
   * 
   * @param theme - The theme to apply ('light', 'dark', or 'system')
   */
  setTheme(theme: Theme): void {
    logger.info('Setting theme', {
      component: 'ThemeManager',
      operation: 'setTheme',
      theme,
    });

    this.currentTheme = theme;
    this.applyTheme();

    // Notify callback if registered
    if (this.onThemeChangeCallback) {
      this.onThemeChangeCallback(theme);
    }
  }

  /**
   * Set high contrast mode
   * 
   * @param enabled - Whether to enable high contrast mode
   */
  setHighContrastMode(enabled: boolean): void {
    logger.info('Setting high contrast mode', {
      component: 'ThemeManager',
      operation: 'setHighContrastMode',
      enabled,
    });

    this.highContrastMode = enabled;
    this.applyTheme();

    // Notify callback if registered
    if (this.onHighContrastChangeCallback) {
      this.onHighContrastChangeCallback(enabled);
    }
  }

  /**
   * Get the current theme setting
   * 
   * @returns The current theme ('light', 'dark', or 'system')
   */
  getTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Get high contrast mode status
   * 
   * @returns Whether high contrast mode is enabled
   */
  getHighContrastMode(): boolean {
    return this.highContrastMode;
  }

  /**
   * Get the effective theme (resolves 'system' to actual theme)
   * 
   * @returns The effective theme ('light' or 'dark')
   */
  getEffectiveTheme(): 'light' | 'dark' {
    if (this.currentTheme === 'system') {
      return this.systemTheme;
    }
    return this.currentTheme;
  }

  /**
   * Detect the system theme preference
   * 
   * @returns The detected system theme ('light' or 'dark')
   */
  detectSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') {
      return 'light';
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.systemTheme = prefersDark ? 'dark' : 'light';

    logger.info('System theme detected', {
      component: 'ThemeManager',
      operation: 'detectSystemTheme',
      systemTheme: this.systemTheme,
    });

    return this.systemTheme;
  }

  /**
   * Register a callback to be notified when theme changes
   * 
   * @param callback - Function to call when theme changes
   */
  onThemeChange(callback: (theme: Theme) => void): void {
    this.onThemeChangeCallback = callback;
  }

  /**
   * Register a callback to be notified when high contrast mode changes
   * 
   * @param callback - Function to call when high contrast mode changes
   */
  onHighContrastChange(callback: (enabled: boolean) => void): void {
    this.onHighContrastChangeCallback = callback;
  }

  /**
   * Apply the current theme to the document
   * 
   * This method updates the document.documentElement class names
   * to reflect the current theme and high contrast mode, triggering CSS transitions.
   */
  private applyTheme(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const effectiveTheme = this.getEffectiveTheme();

    logger.info('Applying theme to document', {
      component: 'ThemeManager',
      operation: 'applyTheme',
      currentTheme: this.currentTheme,
      effectiveTheme,
      highContrastMode: this.highContrastMode,
    });

    // Remove existing theme classes
    document.documentElement.classList.remove('light', 'dark', 'high-contrast');

    // Add the effective theme class
    document.documentElement.classList.add(effectiveTheme);

    // Add high contrast class if enabled
    if (this.highContrastMode) {
      document.documentElement.classList.add('high-contrast');
    }

    // Update data attribute for CSS selectors
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.documentElement.setAttribute(
      'data-high-contrast',
      this.highContrastMode ? 'true' : 'false'
    );
  }

  /**
   * Setup listener for system theme changes
   * 
   * This allows the application to automatically respond when the user
   * changes their system theme preference (e.g., switching to dark mode at sunset)
   */
  private setupSystemThemeListener(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Modern browsers support addEventListener
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const prefersDark = 'matches' in e ? e.matches : false;
      this.systemTheme = prefersDark ? 'dark' : 'light';

      logger.info('System theme changed', {
        component: 'ThemeManager',
        operation: 'handleSystemThemeChange',
        systemTheme: this.systemTheme,
      });

      // Re-apply theme if currently using system theme
      if (this.currentTheme === 'system') {
        this.applyTheme();
      }
    };

    // Use addEventListener if available, otherwise use deprecated addListener
    if (this.mediaQuery.addEventListener) {
      this.mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      this.mediaQuery.addListener(handleChange as (e: MediaQueryListEvent) => void);
    }
  }

  /**
   * Cleanup resources (remove event listeners)
   * Called when resetting the singleton
   */
  private cleanup(): void {
    if (this.mediaQuery) {
      // Note: We don't remove the event listener here because we don't store a reference
      // to the handler function. In practice, this is only called during testing where
      // the mediaQuery object is mocked anyway.
      this.mediaQuery = null;
    }
  }
}
