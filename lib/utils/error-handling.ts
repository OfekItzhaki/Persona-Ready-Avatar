/**
 * Error handling utilities for UI/UX enhancement features
 * Provides graceful degradation and fallback mechanisms
 */

export interface ErrorHandlingConfig {
  retryAttempts?: number;
  retryDelay?: number;
  logErrors?: boolean;
}

export interface ThemeLoadError {
  type: 'theme-load';
  message: string;
  themeName: string;
  timestamp: number;
}

export interface AnimationPerformanceError {
  type: 'animation-performance';
  message: string;
  frameRate: number;
  timestamp: number;
}

export interface FeatureSupportError {
  type: 'feature-support';
  message: string;
  feature: string;
  timestamp: number;
}

export type UIError = ThemeLoadError | AnimationPerformanceError | FeatureSupportError;

/**
 * Theme loading error handler with retry logic
 */
export async function handleThemeLoadError(
  themeName: string,
  error: Error,
  config: ErrorHandlingConfig = {}
): Promise<void> {
  const { retryAttempts = 1, retryDelay = 5000, logErrors = true } = config;

  if (logErrors) {
    console.error(`[Theme Load Error] Failed to load theme "${themeName}":`, error);
  }

  // Fall back to default light theme
  applyDefaultTheme();

  // Retry after delay
  if (retryAttempts > 0) {
    setTimeout(() => {
      if (logErrors) {
        console.log(`[Theme Load] Retrying theme load for "${themeName}"...`);
      }
      // Retry logic would be implemented by the caller
    }, retryDelay);
  }
}

/**
 * Apply default light theme as fallback
 */
function applyDefaultTheme(): void {
  const root = document.documentElement;
  root.classList.remove('dark', 'high-contrast');
  root.classList.add('light');
}

/**
 * Animation performance degradation detector and handler
 */
export class AnimationPerformanceMonitor {
  private frameRates: number[] = [];
  private readonly threshold = 30; // fps
  private readonly sampleSize = 60; // frames
  private degraded = false;

  /**
   * Record a frame time
   */
  recordFrame(deltaTime: number): void {
    const fps = 1000 / deltaTime;
    this.frameRates.push(fps);

    if (this.frameRates.length > this.sampleSize) {
      this.frameRates.shift();
    }

    this.checkPerformance();
  }

  /**
   * Check if performance has degraded
   */
  private checkPerformance(): void {
    if (this.frameRates.length < this.sampleSize) return;

    const avgFps = this.frameRates.reduce((a, b) => a + b, 0) / this.frameRates.length;

    if (avgFps < this.threshold && !this.degraded) {
      this.degraded = true;
      this.handleDegradation(avgFps);
    } else if (avgFps >= this.threshold && this.degraded) {
      this.degraded = false;
      console.log('[Animation Performance] Performance recovered, re-enabling full animations');
    }
  }

  /**
   * Handle performance degradation
   */
  private handleDegradation(avgFps: number): void {
    console.warn(`[Animation Performance] Frame rate dropped to ${avgFps.toFixed(1)}fps, reducing animation complexity`);
    
    // Disable non-essential animations
    document.documentElement.classList.add('reduced-animations');
    
    // Log performance metrics
    console.log('[Animation Performance] Performance metrics:', {
      averageFps: avgFps.toFixed(1),
      minFps: Math.min(...this.frameRates).toFixed(1),
      maxFps: Math.max(...this.frameRates).toFixed(1),
    });
  }

  /**
   * Check if animations are degraded
   */
  isDegraded(): boolean {
    return this.degraded;
  }

  /**
   * Reset the monitor
   */
  reset(): void {
    this.frameRates = [];
    this.degraded = false;
    document.documentElement.classList.remove('reduced-animations');
  }
}

/**
 * Detect glassmorphism support and provide fallback
 */
export function detectGlassmorphismSupport(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return (
      CSS.supports('backdrop-filter', 'blur(10px)') ||
      CSS.supports('-webkit-backdrop-filter', 'blur(10px)')
    );
  } catch {
    return false;
  }
}

/**
 * Apply glassmorphism fallback for unsupported browsers
 */
export function applyGlassmorphismFallback(element: HTMLElement): void {
  if (!detectGlassmorphismSupport()) {
    // Remove backdrop-filter and use solid background with opacity
    element.style.backdropFilter = 'none';
    element.style.webkitBackdropFilter = 'none';
    
    // Increase opacity for better readability without blur
    const currentBg = getComputedStyle(element).backgroundColor;
    if (currentBg.includes('rgba')) {
      const parts = currentBg.match(/[\d.]+/g);
      if (parts && parts.length >= 4) {
        const [r, g, b] = parts;
        element.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.95)`;
      }
    }
  }
}

/**
 * Validate color contrast and automatically adjust if needed
 */
export function validateAndAdjustContrast(
  backgroundColor: string,
  textColor: string,
  minRatio: number = 4.5
): { adjusted: boolean; newTextColor?: string; ratio: number } {
  const ratio = calculateContrastRatio(backgroundColor, textColor);

  if (ratio >= minRatio) {
    return { adjusted: false, ratio };
  }

  // Adjust text color to meet minimum contrast
  const newTextColor = adjustColorForContrast(backgroundColor, textColor, minRatio);
  const newRatio = calculateContrastRatio(backgroundColor, newTextColor);

  console.warn(
    `[Contrast Validation] Adjusted text color from ${textColor} to ${newTextColor} ` +
    `(ratio: ${ratio.toFixed(2)} → ${newRatio.toFixed(2)})`
  );

  return { adjusted: true, newTextColor, ratio: newRatio };
}

/**
 * Calculate contrast ratio between two colors
 */
function calculateContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get relative luminance of a color
 */
function getRelativeLuminance(color: string): number {
  const rgb = parseColor(color);
  const [r, g, b] = rgb.map(val => {
    const sRGB = val / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Parse color string to RGB values
 */
function parseColor(color: string): [number, number, number] {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return [r, g, b];
  }

  // Handle rgb/rgba colors
  const match = color.match(/\d+/g);
  if (match && match.length >= 3) {
    return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
  }

  // Default to black
  return [0, 0, 0];
}

/**
 * Adjust color to meet minimum contrast ratio
 */
function adjustColorForContrast(
  backgroundColor: string,
  textColor: string,
  minRatio: number
): string {
  const bgLum = getRelativeLuminance(backgroundColor);
  const textRgb = parseColor(textColor);

  // Determine if we need lighter or darker text
  const needsLighter = bgLum < 0.5;

  // Adjust brightness
  let factor = needsLighter ? 1.2 : 0.8;
  let adjusted = textRgb.map(val => Math.min(255, Math.max(0, Math.round(val * factor)))) as [number, number, number];
  let ratio = calculateContrastRatio(backgroundColor, rgbToHex(adjusted));

  // Keep adjusting until we meet the minimum ratio
  let iterations = 0;
  while (ratio < minRatio && iterations < 10) {
    factor = needsLighter ? factor * 1.1 : factor * 0.9;
    adjusted = textRgb.map(val => Math.min(255, Math.max(0, Math.round(val * factor)))) as [number, number, number];
    ratio = calculateContrastRatio(backgroundColor, rgbToHex(adjusted));
    iterations++;
  }

  return rgbToHex(adjusted);
}

/**
 * Convert RGB to hex color
 */
function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Animation conflict resolver
 */
export class AnimationConflictResolver {
  private activeAnimations = new Map<string, Animation>();

  /**
   * Register an animation and cancel any conflicting animations
   */
  registerAnimation(element: HTMLElement, property: string, animation: Animation): void {
    const key = `${this.getElementKey(element)}-${property}`;

    // Cancel previous animation on same property
    const existing = this.activeAnimations.get(key);
    if (existing) {
      console.warn(`[Animation Conflict] Cancelling previous animation on ${property}`);
      existing.cancel();
    }

    // Register new animation
    this.activeAnimations.set(key, animation);

    // Clean up when animation finishes
    animation.onfinish = () => {
      this.activeAnimations.delete(key);
    };

    animation.oncancel = () => {
      this.activeAnimations.delete(key);
    };
  }

  /**
   * Get a unique key for an element
   */
  private getElementKey(element: HTMLElement): string {
    if (!element.dataset.animationKey) {
      element.dataset.animationKey = `anim-${Math.random().toString(36).slice(2, 11)}`;
    }
    return element.dataset.animationKey;
  }

  /**
   * Cancel all animations for an element
   */
  cancelAnimations(element: HTMLElement): void {
    const elementKey = this.getElementKey(element);
    for (const [key, animation] of this.activeAnimations.entries()) {
      if (key.startsWith(elementKey)) {
        animation.cancel();
        this.activeAnimations.delete(key);
      }
    }
  }

  /**
   * Clear all animations
   */
  clear(): void {
    for (const animation of this.activeAnimations.values()) {
      animation.cancel();
    }
    this.activeAnimations.clear();
  }
}

/**
 * Global error logger for debugging
 */
export function logUIError(error: UIError): void {
  console.error(`[UI Error] ${error.type}:`, {
    message: error.message,
    timestamp: new Date(error.timestamp).toISOString(),
    ...error,
  });

  // In production, you might want to send this to an error tracking service
  if (typeof window !== 'undefined' && (window as any).errorTracker) {
    (window as any).errorTracker.log(error);
  }
}

/**
 * Ensure application remains functional with degraded features
 */
export function ensureGracefulDegradation(): void {
  // Check for glassmorphism support
  if (!detectGlassmorphismSupport()) {
    console.log('[Graceful Degradation] Glassmorphism not supported, using fallback styles');
    document.documentElement.classList.add('no-backdrop-filter');
  }

  // Check for animation support
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    console.log('[Graceful Degradation] Reduced motion preferred, disabling animations');
    document.documentElement.classList.add('reduced-motion');
  }

  // Check for CSS Grid support
  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && !CSS.supports('display', 'grid')) {
    console.log('[Graceful Degradation] CSS Grid not supported, using flexbox fallback');
    document.documentElement.classList.add('no-grid');
  }
}
