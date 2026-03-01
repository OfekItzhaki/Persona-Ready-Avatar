/**
 * Theme Configuration Loader
 * 
 * This module provides functions to load and apply theme configurations.
 * It handles theme validation, fallback to default themes, and CSS variable application.
 * 
 * Requirements: 2.2, 2.3, 2.4, 2.8, 2.9
 */

import type { ThemeConfig, ThemeVariant } from './types';
import { themes, lightTheme } from './themes';
import { validateThemeConfig } from './validator';

/**
 * Loads a theme configuration by name
 * 
 * @param themeName - The name of the theme to load
 * @returns The theme configuration or null if not found
 */
export function loadThemeConfig(themeName: ThemeVariant): ThemeConfig | null {
  const theme = themes[themeName];
  
  if (!theme) {
    console.error(`Theme "${themeName}" not found`);
    return null;
  }
  
  // Validate the theme configuration
  if (!validateThemeConfig(theme)) {
    console.error(`Theme "${themeName}" failed validation`);
    return null;
  }
  
  return theme;
}

/**
 * Gets a theme configuration with fallback to light theme
 * 
 * @param themeName - The name of the theme to load
 * @returns The theme configuration (never null, falls back to light theme)
 */
export function getThemeConfigWithFallback(themeName: ThemeVariant): ThemeConfig {
  const theme = loadThemeConfig(themeName);
  
  if (!theme) {
    console.warn(`Falling back to light theme`);
    return lightTheme;
  }
  
  return theme;
}

/**
 * Applies theme CSS variables to the document root
 * 
 * @param themeConfig - The theme configuration to apply
 */
export function applyThemeVariables(themeConfig: ThemeConfig): void {
  const root = document.documentElement;
  
  // Apply background colors
  root.style.setProperty('--bg-primary', themeConfig.colors.background.primary);
  root.style.setProperty('--bg-secondary', themeConfig.colors.background.secondary);
  root.style.setProperty('--bg-tertiary', themeConfig.colors.background.tertiary);
  root.style.setProperty('--bg-glass', themeConfig.colors.background.glass);
  
  // Apply foreground colors
  root.style.setProperty('--fg-primary', themeConfig.colors.foreground.primary);
  root.style.setProperty('--fg-secondary', themeConfig.colors.foreground.secondary);
  root.style.setProperty('--fg-tertiary', themeConfig.colors.foreground.tertiary);
  
  // Apply border colors
  root.style.setProperty('--border-primary', themeConfig.colors.border.primary);
  root.style.setProperty('--border-secondary', themeConfig.colors.border.secondary);
  root.style.setProperty('--border-focus', themeConfig.colors.border.focus);
  
  // Apply interactive colors
  root.style.setProperty('--interactive-primary', themeConfig.colors.interactive.primary);
  root.style.setProperty('--interactive-primary-hover', themeConfig.colors.interactive.primaryHover);
  root.style.setProperty('--interactive-primary-active', themeConfig.colors.interactive.primaryActive);
  root.style.setProperty('--interactive-secondary', themeConfig.colors.interactive.secondary);
  root.style.setProperty('--interactive-secondary-hover', themeConfig.colors.interactive.secondaryHover);
  
  // Apply gradients
  root.style.setProperty('--gradient-primary', themeConfig.gradients.primary);
  root.style.setProperty('--gradient-secondary', themeConfig.gradients.secondary);
  root.style.setProperty('--gradient-mesh', themeConfig.gradients.mesh);
  
  // Apply shadows
  root.style.setProperty('--shadow-sm', themeConfig.shadows.sm);
  root.style.setProperty('--shadow-md', themeConfig.shadows.md);
  root.style.setProperty('--shadow-lg', themeConfig.shadows.lg);
  root.style.setProperty('--shadow-glow', themeConfig.shadows.glow);
}

/**
 * Applies theme class to the document root
 * 
 * @param themeName - The name of the theme
 */
export function applyThemeClass(themeName: ThemeVariant): void {
  const root = document.documentElement;
  
  // Remove all theme classes
  root.classList.remove('light', 'dark', 'high-contrast');
  
  // Add the new theme class
  root.classList.add(themeName);
}

/**
 * Gets all available theme names
 * 
 * @returns Array of theme names
 */
export function getAvailableThemes(): ThemeVariant[] {
  return Object.keys(themes) as ThemeVariant[];
}
