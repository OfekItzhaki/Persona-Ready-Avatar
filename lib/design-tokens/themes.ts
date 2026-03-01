/**
 * Theme Configurations
 * 
 * This module defines theme-specific configurations for light, dark, and high-contrast themes.
 * Each theme provides color mappings, gradients, and shadows optimized for different viewing conditions.
 * 
 * Requirements: 2.1, 2.8, 2.9
 */

import type { ThemeConfig } from './types';

/**
 * Light theme configuration
 * Optimized for bright environments with high contrast on white backgrounds
 */
export const lightTheme: ThemeConfig = {
  name: 'light',
  colors: {
    background: {
      primary: '#ffffff',
      secondary: '#f5f5f5',
      tertiary: '#e8e8e8',
      glass: 'rgba(255, 255, 255, 0.8)',
    },
    foreground: {
      primary: '#1a1a1a',
      secondary: '#4a4a4a',
      tertiary: '#6b6b6b',
    },
    border: {
      primary: '#d4d4d4',
      secondary: '#e8e8e8',
      focus: '#2563eb',
    },
    interactive: {
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      primaryActive: '#1e40af',
      secondary: '#6b7280',
      secondaryHover: '#4b5563',
    },
  },
  gradients: {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    secondary: 'linear-gradient(to right, #f5f5f5, #ffffff, #f5f5f5)',
    mesh: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(168, 85, 247, 0.05) 50%, rgba(236, 72, 153, 0.05) 100%)',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    glow: '0 0 20px rgba(59, 130, 246, 0.3)',
  },
};

/**
 * Dark theme configuration
 * Optimized for low-light environments with reduced eye strain
 */
export const darkTheme: ThemeConfig = {
  name: 'dark',
  colors: {
    background: {
      primary: '#0a0a0a',
      secondary: '#1a1a1a',
      tertiary: '#2a2a2a',
      glass: 'rgba(26, 26, 26, 0.8)',
    },
    foreground: {
      primary: '#f5f5f5',
      secondary: '#d4d4d4',
      tertiary: '#a3a3a3',
    },
    border: {
      primary: '#3a3a3a',
      secondary: '#2a2a2a',
      focus: '#60a5fa',
    },
    interactive: {
      primary: '#60a5fa',
      primaryHover: '#3b82f6',
      primaryActive: '#2563eb',
      secondary: '#9ca3af',
      secondaryHover: '#d1d5db',
    },
  },
  gradients: {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    secondary: 'linear-gradient(to right, #0a0a0a, #1a1a1a, #0a0a0a)',
    mesh: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1) 0%, rgba(168, 85, 247, 0.1) 50%, rgba(236, 72, 153, 0.1) 100%)',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.4)',
    glow: '0 0 20px rgba(96, 165, 250, 0.5)',
  },
};

/**
 * High-contrast theme configuration
 * Optimized for maximum contrast and accessibility for users with visual impairments
 */
export const highContrastTheme: ThemeConfig = {
  name: 'high-contrast',
  colors: {
    background: {
      primary: '#000000',
      secondary: '#000000',
      tertiary: '#1a1a1a',
      glass: 'rgba(0, 0, 0, 0.95)',
    },
    foreground: {
      primary: '#ffffff',
      secondary: '#ffffff',
      tertiary: '#ffffff',
    },
    border: {
      primary: '#ffffff',
      secondary: '#666666',
      focus: '#ffff00',
    },
    interactive: {
      primary: '#00ffff',
      primaryHover: '#00cccc',
      primaryActive: '#009999',
      secondary: '#ffffff',
      secondaryHover: '#cccccc',
    },
  },
  gradients: {
    primary: 'linear-gradient(135deg, #00ffff 0%, #0099ff 100%)',
    secondary: 'linear-gradient(to right, #000000, #1a1a1a, #000000)',
    mesh: 'none',
  },
  shadows: {
    sm: 'none',
    md: 'none',
    lg: 'none',
    glow: '0 0 10px #ffff00',
  },
};

/**
 * Theme registry
 * Maps theme names to their configurations
 */
export const themes: Record<string, ThemeConfig> = {
  light: lightTheme,
  dark: darkTheme,
  'high-contrast': highContrastTheme,
};
