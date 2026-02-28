/**
 * Browser detection and compatibility checking utilities
 * Detects browser type and version to ensure compatibility with application requirements
 */

export interface BrowserInfo {
  name: 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown';
  version: number;
  isSupported: boolean;
  missingFeatures: string[];
}

/**
 * Minimum supported browser versions
 * Based on Requirement 55
 */
export const MIN_SUPPORTED_VERSIONS = {
  chrome: 90,
  firefox: 88,
  safari: 14,
  edge: 90,
} as const;

/**
 * Detects the current browser and version
 * @returns BrowserInfo object with browser details and support status
 */
export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent;
  let name: BrowserInfo['name'] = 'unknown';
  let version = 0;

  // Detect Edge (must check before Chrome as Edge includes Chrome in UA)
  if (/Edg\/(\d+)/.test(userAgent)) {
    name = 'edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  }
  // Detect Chrome (must check before Safari as Chrome includes Safari in UA)
  else if (/Chrome\/(\d+)/.test(userAgent) && !/Edg\//.test(userAgent)) {
    name = 'chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  }
  // Detect Firefox
  else if (/Firefox\/(\d+)/.test(userAgent)) {
    name = 'firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  }
  // Detect Safari
  else if (/Safari\//.test(userAgent) && !/Chrome/.test(userAgent)) {
    name = 'safari';
    // Safari version is in Version/X.Y format
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? parseInt(match[1], 10) : 0;
  }

  const missingFeatures = checkMissingFeatures();
  const isSupported = checkBrowserSupport(name, version);

  return {
    name,
    version,
    isSupported,
    missingFeatures,
  };
}

/**
 * Checks if the browser meets minimum version requirements
 */
function checkBrowserSupport(
  name: BrowserInfo['name'],
  version: number
): boolean {
  if (name === 'unknown') return false;

  const minVersion = MIN_SUPPORTED_VERSIONS[name];
  return version >= minVersion;
}

/**
 * Checks for missing browser features required by the application
 * @returns Array of missing feature names
 */
export function checkMissingFeatures(): string[] {
  const missing: string[] = [];

  // Check for WebGL support (required for 3D avatar)
  if (!checkWebGLSupport()) {
    missing.push('WebGL');
  }

  // Check for Web Audio API (required for TTS playback)
  if (!window.AudioContext && !(window as any).webkitAudioContext) {
    missing.push('Web Audio API');
  }

  // Check for Local Storage (required for preferences)
  if (!checkLocalStorageSupport()) {
    missing.push('Local Storage');
  }

  // Check for Fetch API (required for API calls)
  if (!window.fetch) {
    missing.push('Fetch API');
  }

  // Check for Promise support (required for async operations)
  if (!window.Promise) {
    missing.push('Promise');
  }

  // Check for ES6 features
  if (!checkES6Support()) {
    missing.push('ES6 Features');
  }

  return missing;
}

/**
 * Checks for WebGL support
 */
function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}

/**
 * Checks for Local Storage support
 */
function checkLocalStorageSupport(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Checks for basic ES6 support
 */
function checkES6Support(): boolean {
  try {
    // Check for arrow functions, const/let, template literals
    eval('const test = () => `test`');
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Gets a user-friendly browser name for display
 */
export function getBrowserDisplayName(name: BrowserInfo['name']): string {
  const names: Record<BrowserInfo['name'], string> = {
    chrome: 'Google Chrome',
    firefox: 'Mozilla Firefox',
    safari: 'Safari',
    edge: 'Microsoft Edge',
    unknown: 'Unknown Browser',
  };
  return names[name];
}

/**
 * Generates a compatibility message for unsupported browsers
 */
export function getCompatibilityMessage(browserInfo: BrowserInfo): string {
  const displayName = getBrowserDisplayName(browserInfo.name);

  if (browserInfo.name === 'unknown') {
    return 'Your browser could not be detected. This application requires a modern browser to function properly.';
  }

  if (!browserInfo.isSupported) {
    const minVersion = MIN_SUPPORTED_VERSIONS[browserInfo.name];
    return `${displayName} ${browserInfo.version} is not supported. Please upgrade to ${displayName} ${minVersion} or later.`;
  }

  if (browserInfo.missingFeatures.length > 0) {
    return `Your browser is missing required features: ${browserInfo.missingFeatures.join(', ')}. Please upgrade your browser or use a different one.`;
  }

  return '';
}

/**
 * Gets recommended browsers list
 */
export function getRecommendedBrowsers(): string[] {
  return [
    `Google Chrome ${MIN_SUPPORTED_VERSIONS.chrome}+`,
    `Mozilla Firefox ${MIN_SUPPORTED_VERSIONS.firefox}+`,
    `Safari ${MIN_SUPPORTED_VERSIONS.safari}+`,
    `Microsoft Edge ${MIN_SUPPORTED_VERSIONS.edge}+`,
  ];
}
