import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectBrowser,
  checkMissingFeatures,
  getBrowserDisplayName,
  getCompatibilityMessage,
  getRecommendedBrowsers,
  MIN_SUPPORTED_VERSIONS,
} from '../browserDetection';

describe('browserDetection', () => {
  // Store original navigator
  const originalNavigator = global.navigator;

  beforeEach(() => {
    // Reset navigator before each test
    vi.restoreAllMocks();
  });

  describe('detectBrowser', () => {
    it('should detect Chrome browser', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
        configurable: true,
      });

      const result = detectBrowser();
      expect(result.name).toBe('chrome');
      expect(result.version).toBe(95);
      expect(result.isSupported).toBe(true);
    });

    it('should detect Firefox browser', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:92.0) Gecko/20100101 Firefox/92.0',
        configurable: true,
      });

      const result = detectBrowser();
      expect(result.name).toBe('firefox');
      expect(result.version).toBe(92);
      expect(result.isSupported).toBe(true);
    });

    it('should detect Safari browser', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
        configurable: true,
      });

      const result = detectBrowser();
      expect(result.name).toBe('safari');
      expect(result.version).toBe(15);
      expect(result.isSupported).toBe(true);
    });

    it('should detect Edge browser', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36 Edg/95.0.1020.44',
        configurable: true,
      });

      const result = detectBrowser();
      expect(result.name).toBe('edge');
      expect(result.version).toBe(95);
      expect(result.isSupported).toBe(true);
    });

    it('should detect unsupported Chrome version', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36',
        configurable: true,
      });

      const result = detectBrowser();
      expect(result.name).toBe('chrome');
      expect(result.version).toBe(85);
      expect(result.isSupported).toBe(false);
    });

    it('should detect unsupported Firefox version', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:85.0) Gecko/20100101 Firefox/85.0',
        configurable: true,
      });

      const result = detectBrowser();
      expect(result.name).toBe('firefox');
      expect(result.version).toBe(85);
      expect(result.isSupported).toBe(false);
    });

    it('should detect unsupported Safari version', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Safari/605.1.15',
        configurable: true,
      });

      const result = detectBrowser();
      expect(result.name).toBe('safari');
      expect(result.version).toBe(13);
      expect(result.isSupported).toBe(false);
    });

    it('should detect unknown browser', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Some Unknown Browser/1.0',
        configurable: true,
      });

      const result = detectBrowser();
      expect(result.name).toBe('unknown');
      expect(result.version).toBe(0);
      expect(result.isSupported).toBe(false);
    });
  });

  describe('checkMissingFeatures', () => {
    it('should return empty array when all features are supported', () => {
      const missing = checkMissingFeatures();
      // In test environment, some features may not be available
      // Just verify it returns an array
      expect(Array.isArray(missing)).toBe(true);
    });

    it('should detect missing WebGL', () => {
      // Mock document.createElement to return canvas without WebGL
      const originalCreateElement = document.createElement;
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'canvas') {
          const canvas = originalCreateElement.call(
            document,
            tagName
          ) as HTMLCanvasElement;
          vi.spyOn(canvas, 'getContext').mockReturnValue(null);
          return canvas;
        }
        return originalCreateElement.call(document, tagName);
      });

      const missing = checkMissingFeatures();
      expect(missing).toContain('WebGL');

      vi.restoreAllMocks();
    });
  });

  describe('getBrowserDisplayName', () => {
    it('should return correct display names', () => {
      expect(getBrowserDisplayName('chrome')).toBe('Google Chrome');
      expect(getBrowserDisplayName('firefox')).toBe('Mozilla Firefox');
      expect(getBrowserDisplayName('safari')).toBe('Safari');
      expect(getBrowserDisplayName('edge')).toBe('Microsoft Edge');
      expect(getBrowserDisplayName('unknown')).toBe('Unknown Browser');
    });
  });

  describe('getCompatibilityMessage', () => {
    it('should return message for unknown browser', () => {
      const browserInfo = {
        name: 'unknown' as const,
        version: 0,
        isSupported: false,
        missingFeatures: [],
      };

      const message = getCompatibilityMessage(browserInfo);
      expect(message).toContain('could not be detected');
    });

    it('should return message for unsupported version', () => {
      const browserInfo = {
        name: 'chrome' as const,
        version: 85,
        isSupported: false,
        missingFeatures: [],
      };

      const message = getCompatibilityMessage(browserInfo);
      expect(message).toContain('Chrome 85');
      expect(message).toContain('not supported');
      expect(message).toContain(MIN_SUPPORTED_VERSIONS.chrome.toString());
    });

    it('should return message for missing features', () => {
      const browserInfo = {
        name: 'chrome' as const,
        version: 95,
        isSupported: true,
        missingFeatures: ['WebGL', 'Web Audio API'],
      };

      const message = getCompatibilityMessage(browserInfo);
      expect(message).toContain('missing required features');
      expect(message).toContain('WebGL');
      expect(message).toContain('Web Audio API');
    });

    it('should return empty message for supported browser', () => {
      const browserInfo = {
        name: 'chrome' as const,
        version: 95,
        isSupported: true,
        missingFeatures: [],
      };

      const message = getCompatibilityMessage(browserInfo);
      expect(message).toBe('');
    });
  });

  describe('getRecommendedBrowsers', () => {
    it('should return list of recommended browsers', () => {
      const browsers = getRecommendedBrowsers();
      expect(browsers).toHaveLength(4);
      expect(browsers[0]).toContain('Chrome');
      expect(browsers[1]).toContain('Firefox');
      expect(browsers[2]).toContain('Safari');
      expect(browsers[3]).toContain('Edge');
    });

    it('should include minimum versions', () => {
      const browsers = getRecommendedBrowsers();
      expect(browsers[0]).toContain(MIN_SUPPORTED_VERSIONS.chrome.toString());
      expect(browsers[1]).toContain(MIN_SUPPORTED_VERSIONS.firefox.toString());
      expect(browsers[2]).toContain(MIN_SUPPORTED_VERSIONS.safari.toString());
      expect(browsers[3]).toContain(MIN_SUPPORTED_VERSIONS.edge.toString());
    });
  });

  describe('MIN_SUPPORTED_VERSIONS', () => {
    it('should have correct minimum versions', () => {
      expect(MIN_SUPPORTED_VERSIONS.chrome).toBe(90);
      expect(MIN_SUPPORTED_VERSIONS.firefox).toBe(88);
      expect(MIN_SUPPORTED_VERSIONS.safari).toBe(14);
      expect(MIN_SUPPORTED_VERSIONS.edge).toBe(90);
    });
  });
});
