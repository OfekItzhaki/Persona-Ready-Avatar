'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import { PreferencesService } from '@/lib/services/PreferencesService';
import { LocalStorageRepository } from '@/lib/repositories/LocalStorageRepository';
import { ThemeManager } from '@/lib/services/ThemeManager';
import AvatarSelector from './AvatarSelector';

/**
 * GraphicsSettingsSection Component
 * 
 * Provides graphics quality control settings within the SettingsPanel.
 * 
 * Features:
 * - Quality presets (Low, Medium, High, Ultra)
 * - Descriptions of what each quality level affects
 * - Immediate application of changes
 * - Persists to PreferencesService
 * - Keyboard navigation support
 * - ARIA labels for accessibility
 * 
 * Requirements: 26
 */
function GraphicsSettingsSection() {
  const graphicsQuality = useAppStore((state) => state.uiPreferences.graphicsQuality);
  const updateUIPreferences = useAppStore((state) => state.updateUIPreferences);

  /**
   * Update preferences in store and persist to localStorage
   */
  const persistPreference = useCallback((quality: 'low' | 'medium' | 'high' | 'ultra') => {
    updateUIPreferences({ graphicsQuality: quality });
    try {
      const prefsService = PreferencesService.getInstance();
      prefsService.updateUIPreferences({ graphicsQuality: quality });
    } catch (error) {
      console.warn('PreferencesService not available:', error);
    }
  }, [updateUIPreferences]);

  /**
   * Handle quality preset change with screen reader announcement (Requirement 36.5)
   */
  const handleQualityChange = useCallback((quality: 'low' | 'medium' | 'high' | 'ultra') => {
    persistPreference(quality);
    // Announce to screen readers
    const qualityLabel = quality.charAt(0).toUpperCase() + quality.slice(1);
    const announcement = `Graphics quality changed to ${qualityLabel}`;
    // This will be picked up by parent component's announcement region
    const event = new CustomEvent('settingChanged', { detail: announcement });
    window.dispatchEvent(event);
  }, [persistPreference]);

  /**
   * Get description for quality preset
   */
  const getQualityDescription = (quality: 'low' | 'medium' | 'high' | 'ultra'): string => {
    switch (quality) {
      case 'low':
        return 'Basic rendering, no post-processing effects, low shadow quality. Best for older devices.';
      case 'medium':
        return 'Balanced rendering with basic post-processing and medium shadow quality. Good for most devices.';
      case 'high':
        return 'Full post-processing effects with high shadow quality. Recommended for modern devices.';
      case 'ultra':
        return 'Maximum quality with all effects enabled. Requires powerful hardware.';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Quality Presets */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">
          Graphics Quality
        </label>
        <p className="text-xs text-gray-500">
          Adjust graphics quality to optimize performance on your device. Changes apply immediately to the 3D avatar rendering.
        </p>

        {/* Quality Preset Options */}
        <div className="space-y-2" role="radiogroup" aria-label="Graphics quality presets">
          {/* Low Quality */}
          <button
            onClick={() => handleQualityChange('low')}
            className={`quality-preset-button w-full text-left p-4 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              graphicsQuality === 'low'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            role="radio"
            aria-checked={graphicsQuality === 'low'}
            aria-label="Low graphics quality"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">Low</span>
                  {graphicsQuality === 'low' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-blue-600"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {getQualityDescription('low')}
                </p>
              </div>
            </div>
          </button>

          {/* Medium Quality */}
          <button
            onClick={() => handleQualityChange('medium')}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              graphicsQuality === 'medium'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            role="radio"
            aria-checked={graphicsQuality === 'medium'}
            aria-label="Medium graphics quality"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">Medium</span>
                  {graphicsQuality === 'medium' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-blue-600"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {getQualityDescription('medium')}
                </p>
              </div>
            </div>
          </button>

          {/* High Quality */}
          <button
            onClick={() => handleQualityChange('high')}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              graphicsQuality === 'high'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            role="radio"
            aria-checked={graphicsQuality === 'high'}
            aria-label="High graphics quality"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">High</span>
                  {graphicsQuality === 'high' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-blue-600"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {getQualityDescription('high')}
                </p>
              </div>
            </div>
          </button>

          {/* Ultra Quality */}
          <button
            onClick={() => handleQualityChange('ultra')}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              graphicsQuality === 'ultra'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            role="radio"
            aria-checked={graphicsQuality === 'ultra'}
            aria-label="Ultra graphics quality"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">Ultra</span>
                  {graphicsQuality === 'ultra' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-blue-600"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {getQualityDescription('ultra')}
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Additional Info */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mt-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-xs text-blue-800">
            Graphics quality affects post-processing effects (bloom, ambient occlusion) and shadow rendering quality. Changes apply immediately to the 3D avatar.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * AppearanceSettingsSection Component
 * 
 * Provides appearance control settings within the SettingsPanel.
 * 
 * Features:
 * - Theme selector (Light, Dark, System)
 * - High contrast mode toggle
 * - Reference to AvatarCustomizer for avatar appearance
 * - Immediate application of changes
 * - Persists to PreferencesService
 * - Keyboard navigation support
 * - ARIA labels for accessibility
 * 
 * Requirements: 23, 37
 */
function AppearanceSettingsSection() {
  const theme = useAppStore((state) => state.uiPreferences.theme);
  const highContrastMode = useAppStore((state) => state.uiPreferences.highContrastMode);
  const updateUIPreferences = useAppStore((state) => state.updateUIPreferences);

  /**
   * Update preferences in store and persist to localStorage
   */
  const persistPreference = useCallback((updates: Partial<{ theme: 'light' | 'dark' | 'system'; highContrastMode: boolean }>) => {
    updateUIPreferences(updates);
    try {
      const prefsService = PreferencesService.getInstance();
      prefsService.updateUIPreferences(updates);
    } catch (error) {
      console.warn('PreferencesService not available:', error);
    }
  }, [updateUIPreferences]);

  /**
   * Handle theme change (Requirement 23) with screen reader announcement (Requirement 36.5)
   */
  const handleThemeChange = useCallback((newTheme: 'light' | 'dark' | 'system') => {
    persistPreference({ theme: newTheme });
    // Announce to screen readers
    const themeLabel = newTheme.charAt(0).toUpperCase() + newTheme.slice(1);
    const announcement = `Theme changed to ${themeLabel}`;
    const event = new CustomEvent('settingChanged', { detail: announcement });
    window.dispatchEvent(event);
  }, [persistPreference]);

  /**
   * Handle high contrast mode toggle (Requirement 37) with screen reader announcement (Requirement 36.5)
   */
  const handleHighContrastToggle = useCallback(() => {
    const newValue = !highContrastMode;
    persistPreference({ highContrastMode: newValue });
    
    // Apply high contrast mode via ThemeManager
    const themeManager = ThemeManager.getInstance();
    themeManager.setHighContrastMode(newValue);
    
    // Announce to screen readers
    const announcement = `High contrast mode ${newValue ? 'enabled' : 'disabled'}`;
    const event = new CustomEvent('settingChanged', { detail: announcement });
    window.dispatchEvent(event);
  }, [highContrastMode, persistPreference]);

  /**
   * Get description for theme option
   */
  const getThemeDescription = (themeOption: 'light' | 'dark' | 'system'): string => {
    switch (themeOption) {
      case 'light':
        return 'Use light color scheme for all UI components';
      case 'dark':
        return 'Use dark color scheme for all UI components';
      case 'system':
        return 'Automatically match your operating system\'s theme preference';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Theme Selector */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">
          Theme
        </label>
        <p className="text-xs text-gray-500">
          Choose your preferred color scheme. Changes apply immediately with smooth transitions.
        </p>

        {/* Theme Options */}
        <div className="space-y-2" role="radiogroup" aria-label="Theme selection">
          {/* Light Theme */}
          <button
            onClick={() => handleThemeChange('light')}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              theme === 'light'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            role="radio"
            aria-checked={theme === 'light'}
            aria-label="Light theme"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">Light</span>
                  {theme === 'light' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-blue-600"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {getThemeDescription('light')}
                </p>
              </div>
            </div>
          </button>

          {/* Dark Theme */}
          <button
            onClick={() => handleThemeChange('dark')}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              theme === 'dark'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            role="radio"
            aria-checked={theme === 'dark'}
            aria-label="Dark theme"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">Dark</span>
                  {theme === 'dark' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-blue-600"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {getThemeDescription('dark')}
                </p>
              </div>
            </div>
          </button>

          {/* System Theme */}
          <button
            onClick={() => handleThemeChange('system')}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              theme === 'system'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            role="radio"
            aria-checked={theme === 'system'}
            aria-label="System theme"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">System</span>
                  {theme === 'system' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-blue-600"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {getThemeDescription('system')}
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* High Contrast Mode Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label htmlFor="high-contrast-toggle" className="text-sm font-medium text-gray-700">
              High Contrast Mode
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Increase contrast for better visibility and readability
            </p>
          </div>
          <button
            id="high-contrast-toggle"
            onClick={handleHighContrastToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              highContrastMode ? 'bg-blue-600' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={highContrastMode}
            aria-label="High contrast mode toggle"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                highContrastMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {highContrastMode && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs text-blue-800">
              High contrast mode uses maximum contrast colors while maintaining visual comfort. This helps users with visual impairments read text and distinguish UI elements more easily.
            </p>
          </div>
        )}
      </div>

      {/* Avatar Customization Reference */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">
          Avatar Customization
        </label>
        <p className="text-xs text-gray-500">
          Customize your avatar's appearance including skin tone, eye color, and hair color.
        </p>

        <div className="flex items-start gap-2 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-gray-700 font-medium">
              Avatar customization is available via the AvatarCustomizer component
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Use the AvatarCustomizer component to adjust skin tone, eye color, hair color, and trigger manual expressions. These controls are separate from the settings panel to provide real-time visual feedback alongside the 3D avatar.
            </p>
          </div>
        </div>
      </div>

      {/* WCAG Compliance Note */}
      <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-xs text-green-800">
          All themes maintain WCAG AA contrast ratios: 4.5:1 for normal text and 3:1 for UI components. Theme changes apply smoothly with CSS transitions.
        </p>
      </div>
    </div>
  );
}

/**
 * AccessibilitySettingsSection Component
 * 
 * Provides accessibility control settings within the SettingsPanel.
 * 
 * Features:
 * - Keyboard shortcuts reference display
 * - Screen reader optimizations toggle
 * - Enhanced focus indicators toggle
 * - Comprehensive keyboard shortcuts documentation
 * - Keyboard navigation support
 * - ARIA labels for accessibility
 * 
 * Requirements: 35, 51
 */
function AccessibilitySettingsSection() {
  const screenReaderOptimizations = useAppStore((state) => state.uiPreferences.screenReaderOptimizations);
  const enhancedFocusIndicators = useAppStore((state) => state.uiPreferences.enhancedFocusIndicators);
  const updateUIPreferences = useAppStore((state) => state.updateUIPreferences);

  /**
   * Update preferences in store and persist to localStorage
   */
  const persistPreference = useCallback((updates: Partial<{ screenReaderOptimizations: boolean; enhancedFocusIndicators: boolean }>) => {
    updateUIPreferences(updates);
    try {
      const prefsService = PreferencesService.getInstance();
      prefsService.updateUIPreferences(updates);
    } catch (error) {
      console.warn('PreferencesService not available:', error);
    }
  }, [updateUIPreferences]);

  /**
   * Handle screen reader optimizations toggle (Requirement 35) with announcement (Requirement 36.5)
   */
  const handleScreenReaderToggle = useCallback(() => {
    const newValue = !screenReaderOptimizations;
    persistPreference({ screenReaderOptimizations: newValue });
    // Announce to screen readers
    const announcement = `Screen reader optimizations ${newValue ? 'enabled' : 'disabled'}`;
    const event = new CustomEvent('settingChanged', { detail: announcement });
    window.dispatchEvent(event);
  }, [screenReaderOptimizations, persistPreference]);

  /**
   * Handle enhanced focus indicators toggle (Requirement 35) with announcement (Requirement 36.5)
   */
  const handleFocusIndicatorsToggle = useCallback(() => {
    const newValue = !enhancedFocusIndicators;
    persistPreference({ enhancedFocusIndicators: newValue });
    // Announce to screen readers
    const announcement = `Enhanced focus indicators ${newValue ? 'enabled' : 'disabled'}`;
    const event = new CustomEvent('settingChanged', { detail: announcement });
    window.dispatchEvent(event);
  }, [enhancedFocusIndicators, persistPreference]);

  /**
   * Keyboard shortcuts reference data (Requirement 51)
   */
  const keyboardShortcuts = [
    {
      category: 'General',
      shortcuts: [
        { keys: 'Ctrl+Shift+P', description: 'Toggle Performance Monitor' },
        { keys: 'Ctrl+Shift+H', description: 'Open Help / Keyboard Shortcuts' },
        { keys: 'Escape', description: 'Close modals and dialogs' },
        { keys: 'Tab', description: 'Navigate between elements' },
        { keys: 'Shift+Tab', description: 'Navigate backwards between elements' },
      ],
    },
    {
      category: 'Message Input',
      shortcuts: [
        { keys: 'Enter', description: 'Submit message' },
        { keys: 'Shift+Enter', description: 'New line in message' },
      ],
    },
    {
      category: 'Audio Controls',
      shortcuts: [
        { keys: 'Space', description: 'Pause/Resume audio (when focused on audio controls)' },
        { keys: 'Arrow Up/Down', description: 'Adjust volume slider' },
        { keys: 'Arrow Left/Right', description: 'Adjust playback speed slider' },
      ],
    },
    {
      category: 'Settings & Customization',
      shortcuts: [
        { keys: 'Arrow Keys', description: 'Navigate sliders and dropdowns' },
        { keys: 'Enter/Space', description: 'Activate buttons and toggles' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Screen Reader Optimizations Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label htmlFor="screen-reader-toggle" className="text-sm font-medium text-gray-700">
              Screen Reader Optimizations
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Enable additional ARIA announcements and descriptions for screen reader users
            </p>
          </div>
          <button
            id="screen-reader-toggle"
            onClick={handleScreenReaderToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              screenReaderOptimizations ? 'bg-blue-600' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={screenReaderOptimizations}
            aria-label="Screen reader optimizations toggle"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                screenReaderOptimizations ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {screenReaderOptimizations && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs text-blue-800">
              Screen reader optimizations provide additional context and announcements for users relying on assistive technologies like NVDA and JAWS.
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Focus Indicators Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label htmlFor="focus-indicators-toggle" className="text-sm font-medium text-gray-700">
              Enhanced Focus Indicators
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Show prominent visual indicators when navigating with keyboard
            </p>
          </div>
          <button
            id="focus-indicators-toggle"
            onClick={handleFocusIndicatorsToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              enhancedFocusIndicators ? 'bg-blue-600' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={enhancedFocusIndicators}
            aria-label="Enhanced focus indicators toggle"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enhancedFocusIndicators ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {enhancedFocusIndicators && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs text-blue-800">
              Enhanced focus indicators make it easier to see which element is currently focused when navigating with the keyboard.
            </p>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Reference (Requirement 51) */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">
          Keyboard Shortcuts Reference
        </label>
        <p className="text-xs text-gray-500">
          All interactive elements are keyboard accessible. Use these shortcuts to navigate efficiently.
        </p>

        <div className="space-y-4 mt-4">
          {keyboardShortcuts.map((category) => (
            <div key={category.category} className="space-y-2">
              <h4 className="text-sm font-medium text-gray-800">{category.category}</h4>
              <div className="space-y-1.5">
                {category.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between gap-4 p-2 bg-gray-50 rounded border border-gray-200"
                  >
                    <span className="text-xs text-gray-600 flex-1">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-white border border-gray-300 rounded shadow-sm text-gray-700 whitespace-nowrap">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Additional Keyboard Navigation Info */}
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mt-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <p className="text-xs text-green-800 font-medium">
              Full Keyboard Navigation Support
            </p>
            <p className="text-xs text-green-700 mt-1">
              All interactive elements support Tab navigation in logical order. Visible focus indicators show your current position. Press Escape to close modals, and Enter or Space to activate buttons.
            </p>
          </div>
        </div>
      </div>

      {/* WCAG Compliance Note */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <p className="text-xs text-blue-800 font-medium">
            WCAG AA Compliance
          </p>
          <p className="text-xs text-blue-700 mt-1">
            This application follows WCAG AA accessibility guidelines including keyboard navigation, screen reader support, and color contrast requirements. All interactive elements include ARIA labels and semantic HTML.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * PrivacySettingsSection Component
 * 
 * Provides privacy and data management settings within the SettingsPanel.
 * 
 * Features:
 * - Privacy policy information
 * - Data storage explanation
 * - Delete All Data button
 * - Information about data handling practices
 * - HTTPS communication confirmation
 * - No analytics tracking confirmation
 * - Keyboard navigation support
 * - ARIA labels for accessibility
 * 
 * Requirements: 44
 */
interface PrivacySettingsSectionProps {
  onDeleteAllData: () => void;
}

function PrivacySettingsSection({ onDeleteAllData }: PrivacySettingsSectionProps) {
  return (
    <div className="space-y-6">
      {/* Privacy Policy Information */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">
          Privacy Policy
        </label>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <p className="text-sm text-gray-800">
            Your privacy is important to us. This application is designed with privacy-first principles:
          </p>
          <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
            <li>All conversation data is stored locally in your browser only</li>
            <li>No conversation history is transmitted to analytics services</li>
            <li>All API communications use HTTPS encryption</li>
            <li>No API keys or credentials are stored in local storage</li>
            <li>Sensitive data is not logged in production builds</li>
          </ul>
        </div>
      </div>

      {/* Voice Input Privacy Notice (Requirements 12.4, 12.5) */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">
          Voice Input Privacy Notice
        </label>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
          <p className="text-sm text-gray-800">
            When you use voice input, your audio is transmitted to Microsoft Azure Speech Service for speech recognition:
          </p>
          <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
            <li>Audio is processed in real-time and is not stored locally on your device</li>
            <li>Audio data is transmitted over encrypted connections (HTTPS/WSS)</li>
            <li>Microphone access is released immediately when recording stops</li>
            <li>Microsoft's privacy policy applies to audio processing</li>
          </ul>
          <div className="pt-2">
            <a
              href="https://privacy.microsoft.com/en-us/privacystatement"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label="Learn more about Azure Speech Service privacy policy (opens in new tab)"
            >
              Learn more about Azure Speech Service privacy
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Data Storage Information */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">
          Data Storage
        </label>
        <p className="text-xs text-gray-600">
          All your data is stored locally in your browser using localStorage. This includes:
        </p>
        <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside ml-2">
          <li>Conversation history and messages</li>
          <li>User preferences and settings</li>
          <li>Avatar customization choices</li>
          <li>Offline message queue</li>
        </ul>
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mt-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-xs text-green-800">
            Your data never leaves your device unless you explicitly send a message to the AI agent. Conversation history is not shared with third parties.
          </p>
        </div>
      </div>

      {/* No Analytics Tracking */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">
          Analytics & Tracking
        </label>
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <p className="text-xs text-blue-800 font-medium">
              No Conversation Tracking
            </p>
            <p className="text-xs text-blue-700 mt-1">
              This application does not send your conversation data to any analytics services. Your conversations remain private and are only stored locally in your browser.
            </p>
          </div>
        </div>
      </div>

      {/* Security Information */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">
          Security
        </label>
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <p className="text-xs text-green-800 font-medium">
              HTTPS Encryption
            </p>
            <p className="text-xs text-green-700 mt-1">
              All API communications use HTTPS encryption to protect your data in transit. No API keys or credentials are stored in your browser's local storage.
            </p>
          </div>
        </div>
      </div>

      {/* Delete All Data */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">
          Delete All Data
        </label>
        <p className="text-xs text-gray-600">
          Permanently delete all stored data including conversations, preferences, and cached content. This action cannot be undone.
        </p>
        <button
          onClick={onDeleteAllData}
          className="w-full px-4 py-3 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          aria-label="Delete all data permanently"
        >
          Delete All Data
        </button>
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-xs text-yellow-800">
            Warning: This will remove all your conversations, preferences, and settings. The page will reload after deletion.
          </p>
        </div>
      </div>

      {/* Production Logging Information */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">
          Logging & Debugging
        </label>
        <div className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <p className="text-xs text-gray-700">
              In production builds, sensitive user data is not logged to the browser console. Debug logging is only enabled in development mode.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * AudioSettingsSection Component
 * 
 * Provides audio control settings within the SettingsPanel.
 * 
 * Features:
 * - Volume slider (0-100%)
 * - Mute toggle
 * - Playback speed control (0.5x-2.0x)
 * - Speech rate control (0.5x-2.0x)
 * - Pitch adjustment control (-50% to +50%)
 * - Audio quality presets (Low 16kHz, Medium 24kHz, High 48kHz)
 * - Bandwidth estimates for each quality preset
 * - Keyboard navigation support
 * - ARIA labels for accessibility
 * - Slider inputs debounced to 300ms (Requirement 41.3)
 * 
 * Requirements: 25, 27, 28, 41
 */
function AudioSettingsSection() {
  const audioPreferences = useAppStore((state) => state.audioPreferences);
  const updateAudioPreferences = useAppStore((state) => state.updateAudioPreferences);

  // Local state for immediate UI updates
  const [volume, setVolume] = useState(audioPreferences.volume);
  const [isMuted, setIsMuted] = useState(audioPreferences.isMuted);
  const [playbackSpeed, setPlaybackSpeed] = useState(audioPreferences.playbackSpeed);
  const [speechRate, setSpeechRate] = useState(audioPreferences.speechRate);
  const [speechPitch, setSpeechPitch] = useState(audioPreferences.speechPitch);
  const [audioQuality, setAudioQuality] = useState(audioPreferences.audioQuality);

  // Debounce timers for slider inputs (Requirement 41.3)
  const volumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pitchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state with store when preferences change
  useEffect(() => {
    setVolume(audioPreferences.volume);
    setIsMuted(audioPreferences.isMuted);
    setPlaybackSpeed(audioPreferences.playbackSpeed);
    setSpeechRate(audioPreferences.speechRate);
    setSpeechPitch(audioPreferences.speechPitch);
    setAudioQuality(audioPreferences.audioQuality);
  }, [audioPreferences]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current);
      if (speedTimerRef.current) clearTimeout(speedTimerRef.current);
      if (rateTimerRef.current) clearTimeout(rateTimerRef.current);
      if (pitchTimerRef.current) clearTimeout(pitchTimerRef.current);
    };
  }, []);

  /**
   * Update preferences in store and persist to localStorage
   */
  const persistPreference = useCallback((updates: Partial<typeof audioPreferences>) => {
    updateAudioPreferences(updates);
    try {
      const prefsService = PreferencesService.getInstance();
      prefsService.updateAudioPreferences(updates);
    } catch (error) {
      console.warn('PreferencesService not available:', error);
    }
  }, [updateAudioPreferences]);

  /**
   * Handle volume change with debouncing (Requirement 41.3)
   */
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value, 10);
    setVolume(newVolume); // Update UI immediately
    
    // Debounce persistence (300ms)
    if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current);
    volumeTimerRef.current = setTimeout(() => {
      persistPreference({ volume: newVolume });
    }, 300);
  }, [persistPreference]);

  /**
   * Handle mute toggle
   */
  const handleMuteToggle = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    persistPreference({ isMuted: newMuted });
  }, [isMuted, persistPreference]);

  /**
   * Handle playback speed change with debouncing (Requirement 41.3)
   */
  const handlePlaybackSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(e.target.value);
    setPlaybackSpeed(newSpeed); // Update UI immediately
    
    // Debounce persistence (300ms)
    if (speedTimerRef.current) clearTimeout(speedTimerRef.current);
    speedTimerRef.current = setTimeout(() => {
      persistPreference({ playbackSpeed: newSpeed });
    }, 300);
  }, [persistPreference]);

  /**
   * Handle speech rate change with debouncing (Requirement 27, 41.3)
   */
  const handleSpeechRateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newRate = parseFloat(e.target.value);
    setSpeechRate(newRate); // Update UI immediately
    
    // Debounce persistence (300ms)
    if (rateTimerRef.current) clearTimeout(rateTimerRef.current);
    rateTimerRef.current = setTimeout(() => {
      persistPreference({ speechRate: newRate });
    }, 300);
  }, [persistPreference]);

  /**
   * Handle pitch adjustment change with debouncing (Requirement 28, 41.3)
   */
  const handlePitchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newPitch = parseInt(e.target.value, 10);
    setSpeechPitch(newPitch); // Update UI immediately
    
    // Debounce persistence (300ms)
    if (pitchTimerRef.current) clearTimeout(pitchTimerRef.current);
    pitchTimerRef.current = setTimeout(() => {
      persistPreference({ speechPitch: newPitch });
    }, 300);
  }, [persistPreference]);

  /**
   * Handle pitch reset to default (Requirement 28)
   */
  const handlePitchReset = useCallback(() => {
    setSpeechPitch(0);
    persistPreference({ speechPitch: 0 });
  }, [persistPreference]);

  /**
   * Handle audio quality change (Requirement 25)
   */
  const handleQualityChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newQuality = e.target.value as 'low' | 'medium' | 'high';
    setAudioQuality(newQuality);
    persistPreference({ audioQuality: newQuality });
  }, [persistPreference]);

  /**
   * Get bandwidth estimate for quality preset (Requirement 25)
   */
  const getBandwidthEstimate = (quality: 'low' | 'medium' | 'high'): string => {
    switch (quality) {
      case 'low':
        return '~16 kbps';
      case 'medium':
        return '~24 kbps';
      case 'high':
        return '~48 kbps';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      {/* Volume Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="settings-volume" className="text-sm font-medium text-gray-700">
            Volume
          </label>
          <span className="text-sm text-gray-600" aria-live="polite">
            {volume}%
          </span>
        </div>
        <input
          id="settings-volume"
          type="range"
          min="0"
          max="100"
          step="1"
          value={volume}
          onChange={handleVolumeChange}
          disabled={isMuted}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Volume slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={volume}
          aria-valuetext={`${volume} percent`}
          role="slider"
        />
      </div>

      {/* Mute Toggle */}
      <div className="flex items-center justify-between">
        <label htmlFor="settings-mute" className="text-sm font-medium text-gray-700">
          Mute Audio
        </label>
        <button
          id="settings-mute"
          onClick={handleMuteToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isMuted ? 'bg-red-600' : 'bg-gray-200'
          }`}
          role="switch"
          aria-checked={isMuted}
          aria-label="Mute audio toggle"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isMuted ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Playback Speed Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="settings-playback-speed" className="text-sm font-medium text-gray-700">
            Playback Speed
          </label>
          <span className="text-sm text-gray-600" aria-live="polite">
            {playbackSpeed.toFixed(2)}x
          </span>
        </div>
        <input
          id="settings-playback-speed"
          type="range"
          min="0.5"
          max="2.0"
          step="0.05"
          value={playbackSpeed}
          onChange={handlePlaybackSpeedChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Playback speed slider"
          aria-valuemin={0.5}
          aria-valuemax={2.0}
          aria-valuenow={playbackSpeed}
          aria-valuetext={`${playbackSpeed.toFixed(2)} times speed`}
          role="slider"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>0.5x</span>
          <span>1.0x</span>
          <span>2.0x</span>
        </div>
      </div>

      {/* Speech Rate Control (Requirement 27) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="settings-speech-rate" className="text-sm font-medium text-gray-700">
            Speech Rate
          </label>
          <span className="text-sm text-gray-600" aria-live="polite">
            {speechRate.toFixed(2)}x
          </span>
        </div>
        <input
          id="settings-speech-rate"
          type="range"
          min="0.5"
          max="2.0"
          step="0.05"
          value={speechRate}
          onChange={handleSpeechRateChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Speech rate slider"
          aria-valuemin={0.5}
          aria-valuemax={2.0}
          aria-valuenow={speechRate}
          aria-valuetext={`${speechRate.toFixed(2)} times speed`}
          role="slider"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>0.5x</span>
          <span>1.0x</span>
          <span>2.0x</span>
        </div>
        <p className="text-xs text-gray-500">
          Controls how fast the avatar speaks (affects TTS synthesis)
        </p>
      </div>

      {/* Pitch Adjustment Control (Requirement 28) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="settings-pitch" className="text-sm font-medium text-gray-700">
            Speech Pitch
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600" aria-live="polite">
              {speechPitch > 0 ? '+' : ''}{speechPitch}%
            </span>
            <button
              onClick={handlePitchReset}
              className="text-xs text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
              aria-label="Reset pitch to default"
            >
              Reset
            </button>
          </div>
        </div>
        <input
          id="settings-pitch"
          type="range"
          min="-50"
          max="50"
          step="1"
          value={speechPitch}
          onChange={handlePitchChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Speech pitch slider"
          aria-valuemin={-50}
          aria-valuemax={50}
          aria-valuenow={speechPitch}
          aria-valuetext={`${speechPitch > 0 ? 'plus' : speechPitch < 0 ? 'minus' : ''} ${Math.abs(speechPitch)} percent`}
          role="slider"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>-50%</span>
          <span>0%</span>
          <span>+50%</span>
        </div>
        <p className="text-xs text-gray-500">
          Adjusts the pitch of the avatar's voice (affects TTS synthesis)
        </p>
      </div>

      {/* Audio Quality Presets (Requirement 25) */}
      <div className="space-y-2">
        <label htmlFor="settings-audio-quality" className="text-sm font-medium text-gray-700">
          Audio Quality
        </label>
        <select
          id="settings-audio-quality"
          value={audioQuality}
          onChange={handleQualityChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
          aria-label="Audio quality selector"
        >
          <option value="low">Low (16 kHz)</option>
          <option value="medium">Medium (24 kHz)</option>
          <option value="high">High (48 kHz)</option>
        </select>
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Estimated bandwidth: {getBandwidthEstimate(audioQuality)}</span>
        </div>
        {audioQuality === 'low' && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs text-yellow-800">
              Low quality may result in reduced audio fidelity and clarity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * SettingsPanel Component
 *
 * A comprehensive centralized settings management interface with tabbed sections for audio, graphics,
 * appearance, accessibility, and privacy settings. Provides a modal overlay with focus trap and
 * keyboard navigation support.
 *
 * @component
 * @example
 * ```tsx
 * import { SettingsPanel } from '@/components/SettingsPanel';
 * 
 * function App() {
 *   const [isSettingsOpen, setIsSettingsOpen] = useState(false);
 * 
 *   return (
 *     <div>
 *       <button onClick={() => setIsSettingsOpen(true)}>
 *         Open Settings
 *       </button>
 *       
 *       <SettingsPanel
 *         isOpen={isSettingsOpen}
 *         onClose={() => setIsSettingsOpen(false)}
 *       />
 *     </div>
 *   );
 * }
 * ```
 *
 * @features
 * - **Tabbed Sections**: Audio, Graphics, Appearance, Accessibility, Privacy & Data
 * - **Audio Settings**: Volume, mute, playback speed, speech rate, pitch, audio quality
 * - **Graphics Settings**: Quality presets (Low, Medium, High, Ultra)
 * - **Appearance Settings**: Theme selection (Light, Dark, System), high contrast mode
 * - **Accessibility Settings**: Screen reader optimizations, focus indicators, keyboard shortcuts reference
 * - **Privacy Settings**: Data storage info, delete all data, privacy policy
 * - **Reset to Defaults**: Per-section reset buttons
 * - **Clear Cache**: Remove all stored data including preferences and messages
 * - **Immediate Application**: Changes apply instantly without save button
 * - **Persistent State**: All settings saved to localStorage
 *
 * @accessibility
 * - Modal dialog with proper ARIA attributes (role="dialog", aria-modal="true")
 * - Focus trap keeps keyboard navigation within modal
 * - Escape key closes the panel
 * - Backdrop click closes the panel
 * - Tab navigation between sections
 * - All controls have ARIA labels and roles
 * - Screen reader announcements for setting changes
 * - Focus returns to trigger element on close
 * - Visible focus indicators on all interactive elements
 *
 * @keyboard-shortcuts
 * - **Escape**: Close settings panel
 * - **Tab**: Navigate between controls
 * - **Shift+Tab**: Navigate backwards
 * - **Arrow Keys**: Adjust sliders
 * - **Enter/Space**: Activate buttons and toggles
 *
 * @performance
 * - Slider inputs debounced to 300ms to reduce localStorage writes
 * - Efficient state management with Zustand
 * - Only active section rendered
 * - Optimized re-renders with useCallback hooks
 *
 * @sections
 * 1. **Audio**: Volume, mute, playback speed, speech rate, pitch, audio quality with bandwidth estimates
 * 2. **Graphics**: Quality presets affecting post-processing and shadows
 * 3. **Appearance**: Theme selection and high contrast mode with WCAG AA compliance
 * 4. **Accessibility**: Screen reader optimizations, focus indicators, keyboard shortcuts reference
 * 5. **Privacy & Data**: Privacy policy, data storage info, delete all data functionality
 *
 * @requirements 22, 23, 25, 26, 27, 28, 35, 37, 41, 42, 44, 51
 */

/**
 * Props for the SettingsPanel component
 */
interface SettingsPanelProps {
  /** Whether the settings panel is currently open and visible */
  isOpen: boolean;
  
  /** 
   * Callback function invoked when the panel should close.
   * Triggered by close button, Escape key, or backdrop click.
   */
  onClose: () => void;
}

type SettingsSection = 'audio' | 'graphics' | 'appearance' | 'accessibility' | 'privacy';

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Get preferences from store
  const updateAudioPreferences = useAppStore((state) => state.updateAudioPreferences);
  const uiPreferences = useAppStore((state) => state.uiPreferences);
  const updateUIPreferences = useAppStore((state) => state.updateUIPreferences);

  // Active section state (using tabs)
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    uiPreferences.settingsPanelActiveSection || 'audio'
  );

  // Screen reader announcement for setting changes (Requirement 36.5)
  const [settingAnnouncement, setSettingAnnouncement] = useState('');

  // Helper function to announce setting changes (Requirement 36.5)
  const announceSettingChange = useCallback((message: string) => {
    setSettingAnnouncement(message);
    // Clear announcement after a short delay to allow for new announcements
    setTimeout(() => setSettingAnnouncement(''), 100);
  }, []);

  // Listen for setting change events from child components (Requirement 36.5)
  useEffect(() => {
    const handleSettingChanged = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      announceSettingChange(customEvent.detail);
    };

    window.addEventListener('settingChanged', handleSettingChanged);
    return () => window.removeEventListener('settingChanged', handleSettingChanged);
  }, [announceSettingChange]);

  // Update store when active section changes
  useEffect(() => {
    updateUIPreferences({ settingsPanelActiveSection: activeSection });
  }, [activeSection, updateUIPreferences]);

  /**
   * Handle Escape key to close panel (Requirement 22)
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  /**
   * Focus trap implementation (Requirement 22)
   * Keeps focus within modal when open
   */
  useEffect(() => {
    if (!isOpen) return;

    // Store the element that had focus before opening
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus the close button when modal opens
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: moving backwards
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);

    // Restore focus when modal closes
    return () => {
      document.removeEventListener('keydown', handleTabKey);
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  /**
   * Handle backdrop click to close (Requirement 22)
   */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  /**
   * Reset Audio settings to defaults (Requirement 22)
   */
  const handleResetAudio = useCallback(() => {
    updateAudioPreferences({
      volume: 100,
      isMuted: false,
      playbackSpeed: 1.0,
      speechRate: 1.0,
      speechPitch: 0,
      audioQuality: 'high',
    });
  }, [updateAudioPreferences]);

  /**
   * Reset Graphics settings to defaults (Requirement 22)
   */
  const handleResetGraphics = useCallback(() => {
    updateUIPreferences({
      graphicsQuality: 'high',
    });
  }, [updateUIPreferences]);

  /**
   * Reset Appearance settings to defaults (Requirement 22)
   */
  const handleResetAppearance = useCallback(() => {
    updateUIPreferences({
      theme: 'system',
      highContrastMode: false,
    });
  }, [updateUIPreferences]);

  /**
   * Reset Accessibility settings to defaults (Requirement 22)
   */
  const handleResetAccessibility = useCallback(() => {
    updateUIPreferences({
      highContrastMode: false,
      screenReaderOptimizations: false,
      enhancedFocusIndicators: true,
    });
  }, [updateUIPreferences]);

  /**
   * Clear all cached data including preferences and messages (Requirement 42.6)
   */
  const handleClearCache = useCallback(() => {
    // Confirm with user before clearing
    const confirmed = window.confirm(
      'Are you sure you want to clear all cached data? This will remove all preferences, messages, and cached content. This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    try {
      // Clear all data from localStorage
      const repo = new LocalStorageRepository();
      const result = repo.clearAllData();

      if (!result.success) {
        console.error('Failed to clear cache:', result.error);
        alert('Failed to clear cache. Please try again.');
        return;
      }

      // Clear messages from store
      useAppStore.getState().clearMessages();

      // Reset all preferences to defaults
      handleResetAudio();
      handleResetGraphics();
      handleResetAppearance();
      handleResetAccessibility();

      // Show success message
      alert('Cache cleared successfully. The page will now reload.');

      // Reload page to apply changes
      window.location.reload();
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('An error occurred while clearing cache. Please try again.');
    }
  }, [handleResetAudio, handleResetGraphics, handleResetAppearance, handleResetAccessibility]);

  if (!isOpen) return null;

  return (
    <div
      className="settings-panel-overlay fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-panel-title"
    >
      {/* Screen reader announcement region for setting changes (Requirement 36.5) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {settingAnnouncement}
      </div>

      <div
        ref={modalRef}
        className="settings-panel bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="settings-panel-header flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="settings-panel-title" className="text-xl font-semibold text-gray-900">
            Settings
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="settings-panel-close p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            aria-label="Close settings panel"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="settings-panel-tabs flex -mb-px" aria-label="Settings sections">
            <button
              onClick={() => setActiveSection('audio')}
              className={`settings-panel-tab px-6 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                activeSection === 'audio'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              role="tab"
              aria-selected={activeSection === 'audio'}
              aria-controls="audio-panel"
            >
              Audio
            </button>
            <button
              onClick={() => setActiveSection('graphics')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                activeSection === 'graphics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              role="tab"
              aria-selected={activeSection === 'graphics'}
              aria-controls="graphics-panel"
            >
              Graphics
            </button>
            <button
              onClick={() => setActiveSection('appearance')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                activeSection === 'appearance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              role="tab"
              aria-selected={activeSection === 'appearance'}
              aria-controls="appearance-panel"
            >
              Appearance
            </button>
            <button
              onClick={() => setActiveSection('accessibility')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                activeSection === 'accessibility'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              role="tab"
              aria-selected={activeSection === 'accessibility'}
              aria-controls="accessibility-panel"
            >
              Accessibility
            </button>
            <button
              onClick={() => setActiveSection('privacy')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${
                activeSection === 'privacy'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              role="tab"
              aria-selected={activeSection === 'privacy'}
              aria-controls="privacy-panel"
            >
              Privacy & Data
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Audio Section */}
          {activeSection === 'audio' && (
            <div id="audio-panel" role="tabpanel" aria-labelledby="audio-tab">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Audio Settings</h3>
                  <button
                    onClick={handleResetAudio}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    aria-label="Reset audio settings to defaults"
                  >
                    Reset to Defaults
                  </button>
                </div>

                <AudioSettingsSection />
              </div>
            </div>
          )}

          {/* Graphics Section */}
          {activeSection === 'graphics' && (
            <div id="graphics-panel" role="tabpanel" aria-labelledby="graphics-tab">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Graphics Settings</h3>
                  <button
                    onClick={handleResetGraphics}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    aria-label="Reset graphics settings to defaults"
                  >
                    Reset to Defaults
                  </button>
                </div>

                <GraphicsSettingsSection />
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <div id="appearance-panel" role="tabpanel" aria-labelledby="appearance-tab">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Appearance Settings</h3>
                  <button
                    onClick={handleResetAppearance}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    aria-label="Reset appearance settings to defaults"
                  >
                    Reset to Defaults
                  </button>
                </div>

                {/* Avatar Selection Section */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-2">Avatar Selection</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Choose your preferred 3D avatar. Your selection will be saved and loaded automatically.
                    </p>
                  </div>
                  <AvatarSelector
                    options={useAppStore.getState().availableAvatars}
                    selectedId={useAppStore.getState().selectedAvatarId}
                    onSelect={(id) => {
                      useAppStore.getState().setSelectedAvatar(id);
                      useAppStore.getState().setAvatarLoadingState('loading');
                    }}
                  />
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <AppearanceSettingsSection />
                </div>
              </div>
            </div>
          )}

          {/* Accessibility Section */}
          {activeSection === 'accessibility' && (
            <div id="accessibility-panel" role="tabpanel" aria-labelledby="accessibility-tab">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Accessibility Settings</h3>
                  <button
                    onClick={handleResetAccessibility}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    aria-label="Reset accessibility settings to defaults"
                  >
                    Reset to Defaults
                  </button>
                </div>

                <AccessibilitySettingsSection />
              </div>
            </div>
          )}

          {/* Privacy & Data Section */}
          {activeSection === 'privacy' && (
            <div id="privacy-panel" role="tabpanel" aria-labelledby="privacy-tab">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Privacy & Data Settings</h3>
                </div>

                <PrivacySettingsSection onDeleteAllData={handleClearCache} />
              </div>
            </div>
          )}
        </div>

        {/* Footer with Clear Cache button (Requirement 42.6) */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Clear Cache</p>
              <p className="text-xs text-gray-500 mt-1">
                Remove all stored data including preferences, messages, and cached content
              </p>
            </div>
            <button
              onClick={handleClearCache}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              aria-label="Clear all cached data"
            >
              Clear Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
