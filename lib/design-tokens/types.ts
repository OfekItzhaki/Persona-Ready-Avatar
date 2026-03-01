/**
 * Design Token Type Definitions
 * 
 * This module defines TypeScript interfaces for the design token system.
 * Design tokens provide a centralized source of truth for all design values
 * including colors, spacing, typography, shadows, animations, and gradients.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

/**
 * Color scale with 11 values from lightest (50) to darkest (950)
 */
export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

/**
 * Semantic colors for status states
 */
export interface SemanticColors {
  success: string;
  warning: string;
  error: string;
  info: string;
}

/**
 * Color tokens including scales and semantic colors
 */
export interface ColorTokens {
  primary: ColorScale;
  secondary: ColorScale;
  accent: ColorScale;
  neutral: ColorScale;
  semantic: SemanticColors;
}

/**
 * Spacing tokens from extra small to 3xl
 */
export interface SpacingTokens {
  xs: string;    // 0.25rem (4px)
  sm: string;    // 0.5rem (8px)
  md: string;    // 1rem (16px)
  lg: string;    // 1.5rem (24px)
  xl: string;    // 2rem (32px)
  '2xl': string; // 3rem (48px)
  '3xl': string; // 4rem (64px)
}

/**
 * Typography tokens including font families, sizes, weights, and line heights
 */
export interface TypographyTokens {
  fontFamily: {
    sans: string;
    mono: string;
    display: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

/**
 * Shadow tokens from small to 2xl including special effects
 */
export interface ShadowTokens {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
  glow: string;
}

/**
 * Animation tokens for duration and easing functions
 */
export interface AnimationTokens {
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  easing: {
    linear: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
    spring: string;
  };
}

/**
 * Gradient tokens for various gradient types
 */
export interface GradientTokens {
  primary: string;
  secondary: string;
  accent: string;
  mesh: string;
}

/**
 * Complete design token system
 */
export interface DesignTokens {
  colors: ColorTokens;
  spacing: SpacingTokens;
  typography: TypographyTokens;
  shadows: ShadowTokens;
  animations: AnimationTokens;
  gradients: GradientTokens;
}

/**
 * Theme-specific configuration
 */
export interface ThemeConfig {
  name: string;
  colors: {
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
      glass: string;
    };
    foreground: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    border: {
      primary: string;
      secondary: string;
      focus: string;
    };
    interactive: {
      primary: string;
      primaryHover: string;
      primaryActive: string;
      secondary: string;
      secondaryHover: string;
    };
  };
  gradients: {
    primary: string;
    secondary: string;
    mesh: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    glow: string;
  };
}

/**
 * Theme variant types
 */
export type ThemeVariant = 'light' | 'dark' | 'high-contrast';
