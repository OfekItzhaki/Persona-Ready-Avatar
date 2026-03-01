/**
 * Design Tokens Module
 * 
 * This module provides a centralized design token system for the application.
 * It exports types, tokens, themes, validators, and loaders.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.8, 2.9
 */

// Types
export type {
  ColorScale,
  SemanticColors,
  ColorTokens,
  SpacingTokens,
  TypographyTokens,
  ShadowTokens,
  AnimationTokens,
  GradientTokens,
  DesignTokens,
  ThemeConfig,
  ThemeVariant,
} from './types';

// Design tokens
export { designTokens } from './tokens';

// Themes
export { lightTheme, darkTheme, highContrastTheme, themes } from './themes';

// Validators
export {
  isValidCSSColor,
  isValidCSSGradient,
  isValidCSSShadow,
  validateThemeConfig,
  sanitizeThemeConfig,
} from './validator';

// Loaders
export {
  loadThemeConfig,
  getThemeConfigWithFallback,
  applyThemeVariables,
  applyThemeClass,
  getAvailableThemes,
} from './loader';
