'use client';

import { useEffect, useState } from 'react';
import {
  detectBrowser,
  getCompatibilityMessage,
  getRecommendedBrowsers,
  getBrowserDisplayName,
  type BrowserInfo,
} from '@/lib/utils/browserDetection';

/**
 * BrowserCompatibilityWarning Component
 *
 * Displays a warning banner when the user's browser is not supported
 * or is missing required features.
 *
 * Requirements:
 * - Requirement 55: Browser Compatibility
 *   - Detects browser version on application load
 *   - Displays compatibility warning for unsupported browsers
 *   - Lists missing features
 */
export default function BrowserCompatibilityWarning() {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Detect browser on mount
    const info = detectBrowser();
    setBrowserInfo(info);

    // Check if warning was previously dismissed (session storage)
    const dismissed = sessionStorage.getItem('browser-warning-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('browser-warning-dismissed', 'true');
  };

  // Don't show warning if browser is supported and has all features
  if (
    !browserInfo ||
    (browserInfo.isSupported && browserInfo.missingFeatures.length === 0) ||
    isDismissed
  ) {
    return null;
  }

  const message = getCompatibilityMessage(browserInfo);
  const recommendedBrowsers = getRecommendedBrowsers();

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-yellow-600 dark:bg-yellow-700 text-white shadow-lg"
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-6 h-6 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h2 className="font-semibold text-lg">
                Browser Compatibility Warning
              </h2>
            </div>

            <p className="mb-2">{message}</p>

            {browserInfo.missingFeatures.length > 0 && (
              <div className="mb-2">
                <p className="font-medium mb-1">Missing Features:</p>
                <ul className="list-disc list-inside ml-4">
                  {browserInfo.missingFeatures.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3">
              <p className="font-medium mb-1">Recommended Browsers:</p>
              <ul className="list-disc list-inside ml-4">
                {recommendedBrowsers.map((browser) => (
                  <li key={browser}>{browser}</li>
                ))}
              </ul>
            </div>

            {browserInfo.name !== 'unknown' && (
              <p className="mt-3 text-sm opacity-90">
                Current Browser: {getBrowserDisplayName(browserInfo.name)}{' '}
                {browserInfo.version}
              </p>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-yellow-700 dark:hover:bg-yellow-800 rounded transition-colors"
            aria-label="Dismiss browser compatibility warning"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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
      </div>
    </div>
  );
}
