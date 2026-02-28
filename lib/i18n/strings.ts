/**
 * Internationalization Strings
 * 
 * This file contains all user-facing text strings externalized for future i18n support.
 * 
 * Structure:
 * - Organized by component/feature area
 * - Uses nested objects for logical grouping
 * - Supports string interpolation with {placeholder} syntax
 * - Ready for integration with i18n libraries (e.g., react-i18next, next-intl)
 * 
 * Usage:
 * import { UI_STRINGS } from '@/lib/i18n/strings';
 * const text = UI_STRINGS.inputArea.placeholder;
 * 
 * For interpolation:
 * const text = UI_STRINGS.inputArea.charCount.replace('{current}', '100').replace('{max}', '5000');
 * 
 * Requirements: 56
 */

export const UI_STRINGS = {
  // Common/Shared strings
  common: {
    send: 'Send',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    confirm: 'Confirm',
    reset: 'Reset',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Info',
  },

  // InputArea component
  inputArea: {
    placeholder: 'Type your message...',
    placeholderOffline: 'You are offline. Messages will be queued.',
    sendButton: 'Send',
    sendingButton: 'Sending...',
    queueButton: 'Queue',
    helpText: 'Press Enter to send, Shift+Enter for new line',
    charCount: '{current} / {max}',
    errorEmpty: 'Message cannot be empty',
    errorTooLong: 'Message cannot exceed {max} characters',
    errorInvalid: 'Invalid input. Please check your message and try again.',
    ariaLabel: 'Message input',
    ariaLabelSend: 'Send message',
    titleSending: 'Sending...',
    titleSend: 'Send message',
  },

  // MessageList component
  messageList: {
    emptyState: 'Start a conversation by typing a message below',
    typingIndicator: 'Agent is typing...',
    editedLabel: '(edited)',
    searchPlaceholder: 'Search messages...',
    searchClear: 'Clear search',
    searchResults: '{count} {count, plural, one {result} other {results}} found',
    noResults: 'No messages found',
    filterAll: 'All messages',
    filterUser: 'User messages only',
    filterAgent: 'Agent messages only',
    deleteConfirmTitle: 'Delete Message',
    deleteConfirmMessage: 'Are you sure you want to delete this message? This action cannot be undone.',
    editButton: 'Edit message',
    deleteButton: 'Delete message',
    saveEdit: 'Save',
    cancelEdit: 'Cancel',
    reactionThumbsUp: 'Thumbs up',
    reactionThumbsDown: 'Thumbs down',
    ariaLabelLog: 'Conversation history',
    ariaLabelTyping: 'Agent is typing',
    timestampJustNow: 'just now',
    timestampMinutesAgo: '{minutes} {minutes, plural, one {minute} other {minutes}} ago',
    timestampHoursAgo: '{hours} {hours, plural, one {hour} other {hours}} ago',
  },

  // AudioController component
  audioController: {
    title: 'Audio Controls',
    volume: 'Volume',
    volumePercent: '{volume}%',
    mute: 'Mute',
    unmute: 'Unmute',
    playbackSpeed: 'Playback Speed',
    pause: 'Pause',
    resume: 'Resume',
    stop: 'Stop',
    skip: 'Skip',
    audioLevel: 'Audio Level',
    queueStatus: '{count} {count, plural, one {item} other {items}} in queue',
    ariaLabelControls: 'Audio controls',
    ariaLabelVolume: 'Volume slider',
    ariaLabelMute: 'Mute audio',
    ariaLabelUnmute: 'Unmute audio',
    ariaLabelSpeed: 'Playback speed selector',
    ariaLabelPause: 'Pause audio',
    ariaLabelResume: 'Resume audio',
    ariaLabelStop: 'Stop audio',
    ariaLabelSkip: 'Skip to next audio',
    ariaLabelAudioLevel: 'Audio is playing - waveform visualization active',
    ariaLabelAudioIdle: 'Audio is idle - no playback',
  },

  // SettingsPanel component
  settingsPanel: {
    title: 'Settings',
    closeButton: 'Close settings',
    resetToDefaults: 'Reset to Defaults',
    clearAllData: 'Clear All Data',
    clearAllDataConfirm: 'Are you sure you want to clear all data? This will delete all conversations, preferences, and settings. This action cannot be undone.',
    
    // Tabs
    tabAudio: 'Audio',
    tabGraphics: 'Graphics',
    tabAppearance: 'Appearance',
    tabAccessibility: 'Accessibility',
    
    // Audio settings
    audioQuality: 'Audio Quality',
    audioQualityDescription: 'Adjust audio quality to balance quality and bandwidth usage',
    audioQualityLow: 'Low',
    audioQualityMedium: 'Medium',
    audioQualityHigh: 'High',
    audioQualityLowDesc: '16kHz - Reduced audio fidelity, lower bandwidth',
    audioQualityMediumDesc: '24kHz - Balanced quality and bandwidth',
    audioQualityHighDesc: '48kHz - Maximum audio fidelity, higher bandwidth',
    audioQualityWarning: 'Low quality may result in reduced audio fidelity',
    speechRate: 'Speech Rate',
    speechRateDescription: 'Adjust how fast the avatar speaks',
    speechPitch: 'Speech Pitch',
    speechPitchDescription: 'Adjust the pitch of the avatar\'s voice',
    
    // Graphics settings
    graphicsQuality: 'Graphics Quality',
    graphicsQualityDescription: 'Adjust graphics quality to optimize performance on your device. Changes apply immediately to the 3D avatar rendering.',
    graphicsQualityLow: 'Low',
    graphicsQualityMedium: 'Medium',
    graphicsQualityHigh: 'High',
    graphicsQualityUltra: 'Ultra',
    graphicsQualityLowDesc: 'Basic rendering, no post-processing effects, low shadow quality. Best for older devices.',
    graphicsQualityMediumDesc: 'Balanced rendering with basic post-processing and medium shadow quality. Good for most devices.',
    graphicsQualityHighDesc: 'Full post-processing effects with high shadow quality. Recommended for modern devices.',
    graphicsQualityUltraDesc: 'Maximum quality with all effects enabled. Requires powerful hardware.',
    graphicsQualityInfo: 'Graphics quality affects post-processing effects (bloom, ambient occlusion) and shadow rendering quality. Changes apply immediately to the 3D avatar.',
    
    // Appearance settings
    theme: 'Theme',
    themeDescription: 'Choose your preferred color scheme. Changes apply immediately with smooth transitions.',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    themeLightDesc: 'Use light color scheme for all UI components',
    themeDarkDesc: 'Use dark color scheme for all UI components',
    themeSystemDesc: 'Automatically match your operating system\'s theme preference',
    highContrastMode: 'High Contrast Mode',
    highContrastModeDescription: 'Increase contrast for better visibility and readability',
    highContrastModeInfo: 'High contrast mode uses maximum contrast colors while maintaining visual comfort. This helps users with visual impairments read text and distinguish UI elements more easily.',
    avatarCustomization: 'Avatar Customization',
    avatarCustomizationDescription: 'Customize your avatar\'s appearance including skin tone, eye color, and hair color.',
    avatarCustomizationInfo: 'Avatar customization is available via the AvatarCustomizer component',
    avatarCustomizationDetails: 'Use the AvatarCustomizer component to adjust skin tone, eye color, hair color, and trigger manual expressions. These controls are separate from the settings panel to provide real-time visual feedback alongside the 3D avatar.',
    wcagCompliance: 'All themes maintain WCAG AA contrast ratios: 4.5:1 for normal text and 3:1 for UI components. Theme changes apply smoothly with CSS transitions.',
    
    // Accessibility settings
    keyboardShortcuts: 'Keyboard Shortcuts',
    screenReaderOptimizations: 'Screen Reader Optimizations',
    screenReaderOptimizationsDescription: 'Enable additional ARIA announcements and descriptions for screen reader users',
    screenReaderOptimizationsInfo: 'When enabled, the application provides more detailed announcements and descriptions for screen reader users, including state changes, dynamic content updates, and contextual information.',
    enhancedFocusIndicators: 'Enhanced Focus Indicators',
    enhancedFocusIndicatorsDescription: 'Show more prominent focus indicators for keyboard navigation',
    enhancedFocusIndicatorsInfo: 'Enhanced focus indicators make it easier to see which element has keyboard focus, improving navigation for keyboard-only users.',
    
    // Keyboard shortcuts categories
    shortcutsGeneral: 'General',
    shortcutsMessageInput: 'Message Input',
    shortcutsAudioControls: 'Audio Controls',
    shortcutsSettingsCustomization: 'Settings & Customization',
    
    // Announcements
    settingChanged: '{setting} changed to {value}',
    themeChanged: 'Theme changed to {theme}',
    highContrastEnabled: 'High contrast mode enabled',
    highContrastDisabled: 'High contrast mode disabled',
    screenReaderEnabled: 'Screen reader optimizations enabled',
    screenReaderDisabled: 'Screen reader optimizations disabled',
    focusIndicatorsEnabled: 'Enhanced focus indicators enabled',
    focusIndicatorsDisabled: 'Enhanced focus indicators disabled',
  },

  // AvatarCustomizer component
  avatarCustomizer: {
    title: 'Avatar Customization',
    skinTone: 'Skin Tone',
    eyeColor: 'Eye Color',
    hairColor: 'Hair Color',
    expressions: 'Expressions',
    expressionNeutral: 'Neutral',
    expressionHappy: 'Happy',
    expressionSad: 'Sad',
    expressionSurprised: 'Surprised',
    expressionAngry: 'Angry',
    ariaLabelSkinTone: 'Select skin tone',
    ariaLabelEyeColor: 'Select eye color',
    ariaLabelHairColor: 'Select hair color',
    ariaLabelExpression: 'Trigger {expression} expression',
  },

  // PerformanceMonitor component
  performanceMonitor: {
    title: 'Performance Monitor',
    fps: 'FPS',
    avgFps: 'Avg FPS',
    frameTime: 'Frame Time',
    memory: 'Memory',
    drawCalls: 'Draw Calls',
    triangles: 'Triangles',
    brainApiLatency: 'Brain API',
    ttsLatency: 'TTS API',
    expand: 'Expand',
    collapse: 'Collapse',
    notAvailable: 'N/A',
    milliseconds: '{value}ms',
    megabytes: '{value}MB',
  },

  // OfflineNotification component
  offlineNotification: {
    title: 'You are offline',
    message: 'Your internet connection is unavailable. Messages will be queued and sent when you reconnect.',
    dismiss: 'Dismiss',
    ariaLabel: 'Offline notification',
  },

  // BrowserCompatibilityWarning component
  browserCompatibility: {
    title: 'Browser Compatibility Warning',
    message: 'Your browser version may not be fully supported. For the best experience, please update to the latest version or use a supported browser.',
    supportedBrowsers: 'Supported browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+',
    dismiss: 'Continue Anyway',
    ariaLabel: 'Browser compatibility warning',
  },

  // Export/Import
  exportImport: {
    exportButton: 'Export Conversation',
    importButton: 'Import Conversation',
    exportFormatJSON: 'JSON',
    exportFormatText: 'Text',
    exportFilename: 'conversation-{timestamp}',
    importReplacePrompt: 'Replace existing conversation or append imported messages?',
    importReplace: 'Replace',
    importAppend: 'Append',
    importError: 'Failed to import conversation. Please check the file format and try again.',
    exportSuccess: 'Conversation exported successfully',
    importSuccess: 'Conversation imported successfully',
    exportedLabel: 'Exported',
    messagesLabel: 'Messages',
  },

  // Error messages
  errors: {
    networkError: 'Network error. Please check your connection and try again.',
    ttsError: 'Speech synthesis failed. The text is still available to read.',
    avatarLoadError: 'Failed to load avatar model. The application will continue in text-only mode.',
    genericError: 'An error occurred. Please try again.',
    retryButton: 'Retry',
    troubleshooting: 'Troubleshooting',
  },

  // Keyboard shortcuts
  keyboardShortcuts: {
    togglePerformanceMonitor: 'Toggle Performance Monitor',
    openHelp: 'Open Help / Keyboard Shortcuts',
    closeModal: 'Close modals and dialogs',
    navigateForward: 'Navigate between elements',
    navigateBackward: 'Navigate backwards between elements',
    submitMessage: 'Submit message',
    newLine: 'New line in message',
    pauseResume: 'Pause/Resume audio (when focused on audio controls)',
    adjustVolume: 'Adjust volume slider',
    adjustSpeed: 'Adjust playback speed slider',
    navigateControls: 'Navigate sliders and dropdowns',
    activateButton: 'Activate buttons and toggles',
  },

  // Accessibility
  accessibility: {
    skipToMain: 'Skip to main content',
    skipToChat: 'Skip to chat',
    skipToSettings: 'Skip to settings',
    ariaLivePolite: 'Polite announcement',
    ariaLiveAssertive: 'Important announcement',
  },
} as const;

/**
 * Type-safe string interpolation helper
 * 
 * Usage:
 * interpolate(UI_STRINGS.inputArea.charCount, { current: '100', max: '5000' })
 * // Returns: "100 / 5000"
 */
export function interpolate(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key]?.toString() ?? match;
  });
}

/**
 * Pluralization helper (basic implementation)
 * 
 * For full pluralization support, integrate with an i18n library.
 * This is a simple implementation for English.
 * 
 * Usage:
 * pluralize(UI_STRINGS.messageList.searchResults, { count: 5 })
 */
export function pluralize(
  template: string,
  values: Record<string, string | number>
): string {
  const count = typeof values.count === 'number' ? values.count : parseInt(values.count as string, 10);
  
  // Simple plural handling for English
  const pluralPattern = /\{(\w+),\s*plural,\s*one\s*\{([^}]+)\}\s*other\s*\{([^}]+)\}\}/g;
  
  let result = template.replace(pluralPattern, (match, key, one, other) => {
    if (key === 'count') {
      return count === 1 ? one : other;
    }
    return match;
  });
  
  // Replace remaining placeholders
  result = interpolate(result, values);
  
  return result;
}
