/**
 * Browser feature fallbacks and polyfills
 * Provides fallback implementations for features not supported in older browsers
 */

/**
 * Initializes all browser fallbacks
 * Should be called early in the application lifecycle
 */
export function initializeBrowserFallbacks(): void {
  initializeWebAudioFallback();
  initializeFetchFallback();
  initializePromiseFallback();
}

/**
 * Provides fallback for Web Audio API
 * Uses webkit prefix if standard API is not available
 */
function initializeWebAudioFallback(): void {
  if (!window.AudioContext && (window as any).webkitAudioContext) {
    (window as any).AudioContext = (window as any).webkitAudioContext;
    console.warn(
      'Using webkit-prefixed AudioContext. Consider upgrading your browser.'
    );
  }
}

/**
 * Provides basic fetch polyfill using XMLHttpRequest
 * Only for very old browsers that don't support fetch
 */
function initializeFetchFallback(): void {
  if (!window.fetch) {
    console.warn(
      'Fetch API not supported. Using XMLHttpRequest fallback. Consider upgrading your browser.'
    );

    (window as any).fetch = function (
      url: string,
      options: RequestInit = {}
    ): Promise<Response> {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(options.method || 'GET', url);

        // Set headers
        if (options.headers) {
          const headers = options.headers as Record<string, string>;
          Object.keys(headers).forEach((key) => {
            xhr.setRequestHeader(key, headers[key]);
          });
        }

        xhr.onload = () => {
          const response = {
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Headers(),
            url: xhr.responseURL,
            json: () => Promise.resolve(JSON.parse(xhr.responseText)),
            text: () => Promise.resolve(xhr.responseText),
            blob: () => Promise.resolve(new Blob([xhr.response])),
            arrayBuffer: () => Promise.resolve(xhr.response),
          } as Response;

          resolve(response);
        };

        xhr.onerror = () => reject(new TypeError('Network request failed'));
        xhr.ontimeout = () => reject(new TypeError('Network request timeout'));

        xhr.send(options.body as any);
      });
    };
  }
}

/**
 * Provides basic Promise polyfill
 * Only for very old browsers that don't support Promises
 */
function initializePromiseFallback(): void {
  if (!window.Promise) {
    console.error(
      'Promise not supported. This browser is too old to run this application.'
    );
    // Note: A full Promise polyfill would be too large to include here
    // In production, consider using a polyfill service like polyfill.io
  }
}

/**
 * Checks if requestAnimationFrame is available and provides fallback
 */
export function getRequestAnimationFrame(): (callback: FrameRequestCallback) => number {
  return (
    window.requestAnimationFrame ||
    (window as any).webkitRequestAnimationFrame ||
    (window as any).mozRequestAnimationFrame ||
    function (callback: FrameRequestCallback) {
      return window.setTimeout(callback, 1000 / 60);
    }
  );
}

/**
 * Checks if cancelAnimationFrame is available and provides fallback
 */
export function getCancelAnimationFrame(): (handle: number) => void {
  return (
    window.cancelAnimationFrame ||
    (window as any).webkitCancelAnimationFrame ||
    (window as any).mozCancelAnimationFrame ||
    function (handle: number) {
      window.clearTimeout(handle);
    }
  );
}

/**
 * Provides fallback for performance.now()
 */
export function getPerformanceNow(): () => number {
  if (window.performance && window.performance.now) {
    return () => window.performance.now();
  }
  return () => Date.now();
}

/**
 * Checks if a feature is supported and logs a warning if not
 */
export function checkFeatureSupport(
  featureName: string,
  isSupported: boolean
): boolean {
  if (!isSupported) {
    console.warn(
      `Feature "${featureName}" is not supported in this browser. Some functionality may be limited.`
    );
  }
  return isSupported;
}

/**
 * Gets WebGL context with fallback to experimental-webgl
 */
export function getWebGLContext(
  canvas: HTMLCanvasElement
): WebGLRenderingContext | null {
  try {
    const gl =
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext);

    if (!gl) {
      console.error('WebGL not supported in this browser');
      return null;
    }

    // Check for experimental-webgl usage
    if (!canvas.getContext('webgl')) {
      console.warn(
        'Using experimental-webgl. Consider upgrading your browser for better performance.'
      );
    }

    return gl;
  } catch (e) {
    console.error('Error initializing WebGL:', e);
    return null;
  }
}

/**
 * Checks for IndexedDB support with fallback warning
 */
export function checkIndexedDBSupport(): boolean {
  const supported = !!(
    window.indexedDB ||
    (window as any).mozIndexedDB ||
    (window as any).webkitIndexedDB ||
    (window as any).msIndexedDB
  );

  if (!supported) {
    console.warn(
      'IndexedDB not supported. Large data storage may be limited.'
    );
  }

  return supported;
}

/**
 * Checks for Service Worker support
 */
export function checkServiceWorkerSupport(): boolean {
  const supported = 'serviceWorker' in navigator;

  if (!supported) {
    console.warn(
      'Service Workers not supported. Offline functionality will be limited.'
    );
  }

  return supported;
}

/**
 * Checks for WebRTC support (for future features)
 */
export function checkWebRTCSupport(): boolean {
  const supported = !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );

  if (!supported) {
    console.warn('WebRTC not supported. Media features will be unavailable.');
  }

  return supported;
}

/**
 * Browser-specific workarounds
 */
export const browserWorkarounds = {
  /**
   * Safari-specific workaround for audio playback
   * Safari requires user interaction before playing audio
   */
  safariAudioUnlock: async (): Promise<void> => {
    if (
      /Safari/.test(navigator.userAgent) &&
      !/Chrome/.test(navigator.userAgent)
    ) {
      try {
        const AudioContext =
          window.AudioContext || (window as any).webkitAudioContext;
        const context = new AudioContext();

        // Create and play a silent buffer to unlock audio
        const buffer = context.createBuffer(1, 1, 22050);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);

        await context.resume();
        console.log('Safari audio unlocked');
      } catch (e) {
        console.warn('Failed to unlock Safari audio:', e);
      }
    }
  },

  /**
   * Firefox-specific workaround for WebGL context loss
   */
  firefoxWebGLContextLoss: (canvas: HTMLCanvasElement): void => {
    if (/Firefox/.test(navigator.userAgent)) {
      canvas.addEventListener(
        'webglcontextlost',
        (event) => {
          event.preventDefault();
          console.warn('WebGL context lost in Firefox. Attempting recovery...');
        },
        false
      );

      canvas.addEventListener(
        'webglcontextrestored',
        () => {
          console.log('WebGL context restored in Firefox');
        },
        false
      );
    }
  },
};
