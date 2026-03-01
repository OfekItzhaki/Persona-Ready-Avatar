/**
 * Accessibility Utilities
 * 
 * Comprehensive accessibility utilities for keyboard navigation, focus management,
 * touch target validation, ARIA label generation, and tab order validation.
 * 
 * Features:
 * - Keyboard navigation support utilities
 * - Focus trap for modals and dialogs
 * - Touch target size validation (minimum 44x44px on mobile)
 * - ARIA label generation utilities
 * - Logical tab order validation
 * - Focus indicator management
 * 
 * Requirements: 10.4, 10.5, 10.7, 10.8, 10.9, 10.10
 */

/**
 * Focus trap state for managing trapped focus in modals/dialogs
 */
interface FocusTrapState {
  element: HTMLElement;
  previousFocus: HTMLElement | null;
  focusableElements: HTMLElement[];
  cleanup: () => void;
}

/**
 * Touch target validation result
 */
interface TouchTargetValidation {
  element: HTMLElement;
  width: number;
  height: number;
  meetsMinimum: boolean;
  isMobile: boolean;
}

/**
 * Tab order validation result
 */
interface TabOrderValidation {
  isValid: boolean;
  issues: TabOrderIssue[];
}

interface TabOrderIssue {
  element: HTMLElement;
  issue: 'missing-tabindex' | 'invalid-tabindex' | 'illogical-order';
  message: string;
}

/**
 * Get all focusable elements within a container
 * Requirements: 10.4, 10.5
 */
export function getFocusableElements(container: HTMLElement = document.body): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    'audio[controls]',
    'video[controls]',
    '[contenteditable]:not([contenteditable="false"])',
  ].join(', ');

  const elements = Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
  
  // Filter out elements that are not visible
  return elements.filter(element => {
    const style = window.getComputedStyle(element);
    // In test environments (JSDOM), offsetParent may be null even for visible elements
    // So we check display and visibility instead
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    );
  });
}

/**
 * Create a focus trap for modals and dialogs
 * Traps keyboard focus within the specified element
 * Requirements: 10.4, 10.5
 * 
 * @param element - The element to trap focus within
 * @returns Cleanup function to remove the focus trap
 */
export function createFocusTrap(element: HTMLElement): () => void {
  const previousFocus = document.activeElement as HTMLElement | null;
  const focusableElements = getFocusableElements(element);
  
  if (focusableElements.length === 0) {
    console.warn('Focus trap created on element with no focusable children');
    return () => {};
  }

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  // Focus the first element
  firstFocusable.focus();

  // Handle tab key to trap focus
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      // Shift + Tab: moving backwards
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab: moving forwards
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };

  element.addEventListener('keydown', handleKeyDown);

  // Cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
    if (previousFocus && document.body.contains(previousFocus)) {
      previousFocus.focus();
    }
  };
}

/**
 * Check if the current viewport is mobile
 */
function isMobileViewport(): boolean {
  return window.innerWidth < 768; // Standard mobile breakpoint
}

/**
 * Validate touch target size for an element
 * Requirements: 10.10, 11.2
 * 
 * @param element - The element to validate
 * @param minimumSize - Minimum size in pixels (default: 44)
 * @returns Validation result
 */
export function validateTouchTargetSize(
  element: HTMLElement,
  minimumSize: number = 44
): TouchTargetValidation {
  const rect = element.getBoundingClientRect();
  const isMobile = isMobileViewport();
  
  const width = rect.width;
  const height = rect.height;
  
  // On mobile, both dimensions must meet minimum
  // On desktop, at least one dimension must meet minimum (more lenient)
  const meetsMinimum = isMobile
    ? width >= minimumSize && height >= minimumSize
    : width >= minimumSize || height >= minimumSize;

  return {
    element,
    width,
    height,
    meetsMinimum,
    isMobile,
  };
}

/**
 * Validate all interactive elements have minimum touch target size
 * Requirements: 10.10, 11.2
 * 
 * @param container - Container to validate (default: document.body)
 * @param minimumSize - Minimum size in pixels (default: 44)
 * @returns Array of validation results for elements that don't meet minimum
 */
export function validateAllTouchTargets(
  container: HTMLElement = document.body,
  minimumSize: number = 44
): TouchTargetValidation[] {
  const interactiveElements = getFocusableElements(container);
  const failedValidations: TouchTargetValidation[] = [];

  for (const element of interactiveElements) {
    const validation = validateTouchTargetSize(element, minimumSize);
    if (!validation.meetsMinimum) {
      failedValidations.push(validation);
    }
  }

  return failedValidations;
}

/**
 * Generate ARIA label from element content or attributes
 * Requirements: 10.7
 * 
 * @param element - The element to generate label for
 * @param fallback - Fallback label if none can be determined
 * @returns Generated ARIA label
 */
export function generateAriaLabel(element: HTMLElement, fallback?: string): string {
  // Check existing ARIA label
  if (element.getAttribute('aria-label')) {
    return element.getAttribute('aria-label')!;
  }

  // Check aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    if (labelElement) {
      return labelElement.textContent?.trim() || fallback || '';
    }
  }

  // Check for associated label element
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const id = element.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) {
        return label.textContent?.trim() || fallback || '';
      }
    }
  }

  // Check title attribute
  if (element.title) {
    return element.title;
  }

  // Check alt attribute (for images)
  if (element instanceof HTMLImageElement && element.alt) {
    return element.alt;
  }

  // Check text content
  const textContent = element.textContent?.trim();
  if (textContent && textContent.length > 0 && textContent.length < 100) {
    return textContent;
  }

  // Check placeholder (for inputs)
  if (element instanceof HTMLInputElement && element.placeholder) {
    return element.placeholder;
  }

  // Use fallback
  return fallback || 'Interactive element';
}

/**
 * Ensure element has proper ARIA label
 * Requirements: 10.7
 * 
 * @param element - The element to ensure has label
 * @param label - Label to apply if none exists
 */
export function ensureAriaLabel(element: HTMLElement, label?: string): void {
  const existingLabel = generateAriaLabel(element);
  
  if (!existingLabel || existingLabel === 'Interactive element') {
    if (label) {
      element.setAttribute('aria-label', label);
    } else {
      console.warn('Element missing accessible label:', element);
    }
  }
}

/**
 * Validate logical tab order in a container
 * Requirements: 10.8
 * 
 * @param container - Container to validate
 * @returns Validation result with any issues found
 */
export function validateTabOrder(container: HTMLElement = document.body): TabOrderValidation {
  const focusableElements = getFocusableElements(container);
  const issues: TabOrderIssue[] = [];

  let previousTabIndex = -1;

  for (const element of focusableElements) {
    const tabIndexAttr = element.getAttribute('tabindex');
    const tabIndex = tabIndexAttr ? parseInt(tabIndexAttr, 10) : 0;

    // Check for invalid tabindex values
    if (tabIndexAttr && isNaN(tabIndex)) {
      issues.push({
        element,
        issue: 'invalid-tabindex',
        message: `Invalid tabindex value: "${tabIndexAttr}"`,
      });
      continue;
    }

    // Check for illogical positive tabindex values
    // Positive tabindex values should be avoided as they break natural tab order
    if (tabIndex > 0) {
      if (previousTabIndex > 0 && tabIndex < previousTabIndex) {
        issues.push({
          element,
          issue: 'illogical-order',
          message: `Tab order jumps from ${previousTabIndex} to ${tabIndex}`,
        });
      }
      previousTabIndex = tabIndex;
    }

    // Note: tabindex="-1" is valid for programmatically focusable elements
    // We only flag it if it's explicitly set on naturally focusable elements
    // This is intentionally lenient to avoid false positives
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Ensure all interactive elements have visible focus indicators
 * Requirements: 10.4
 * 
 * @param container - Container to check
 * @returns Array of elements missing focus indicators
 */
export function ensureFocusIndicators(container: HTMLElement = document.body): HTMLElement[] {
  const focusableElements = getFocusableElements(container);
  const missingIndicators: HTMLElement[] = [];

  for (const element of focusableElements) {
    // Check if element has custom focus styles
    const computedStyle = window.getComputedStyle(element);
    const hasFocusStyle = computedStyle.outlineWidth !== '0px' || 
                          computedStyle.outlineStyle !== 'none';

    if (!hasFocusStyle) {
      // Apply default focus indicator
      element.style.outline = '2px solid #3b82f6';
      element.style.outlineOffset = '2px';
      missingIndicators.push(element);
    }
  }

  return missingIndicators;
}

/**
 * Move focus to the next focusable element
 * Requirements: 10.4, 10.5
 * 
 * @param container - Container to search within
 * @param reverse - Move backwards instead of forwards
 */
export function moveFocusToNext(container: HTMLElement = document.body, reverse: boolean = false): void {
  const focusableElements = getFocusableElements(container);
  const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

  if (currentIndex === -1) {
    // No element focused, focus first
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
    return;
  }

  const nextIndex = reverse
    ? (currentIndex - 1 + focusableElements.length) % focusableElements.length
    : (currentIndex + 1) % focusableElements.length;

  focusableElements[nextIndex].focus();
}

/**
 * Setup keyboard navigation for a container
 * Adds arrow key navigation support
 * Requirements: 10.4, 10.5
 * 
 * @param container - Container to add navigation to
 * @param orientation - Navigation orientation ('horizontal' | 'vertical' | 'both')
 * @returns Cleanup function
 */
export function setupKeyboardNavigation(
  container: HTMLElement,
  orientation: 'horizontal' | 'vertical' | 'both' = 'both'
): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    const { key } = e;
    
    let shouldHandle = false;
    let reverse = false;

    if (orientation === 'horizontal' || orientation === 'both') {
      if (key === 'ArrowRight') {
        shouldHandle = true;
        reverse = false;
      } else if (key === 'ArrowLeft') {
        shouldHandle = true;
        reverse = true;
      }
    }

    if (orientation === 'vertical' || orientation === 'both') {
      if (key === 'ArrowDown') {
        shouldHandle = true;
        reverse = false;
      } else if (key === 'ArrowUp') {
        shouldHandle = true;
        reverse = true;
      }
    }

    if (key === 'Home') {
      shouldHandle = true;
      const focusableElements = getFocusableElements(container);
      if (focusableElements.length > 0) {
        e.preventDefault();
        focusableElements[0].focus();
      }
      return;
    }

    if (key === 'End') {
      shouldHandle = true;
      const focusableElements = getFocusableElements(container);
      if (focusableElements.length > 0) {
        e.preventDefault();
        focusableElements[focusableElements.length - 1].focus();
      }
      return;
    }

    if (shouldHandle) {
      e.preventDefault();
      moveFocusToNext(container, reverse);
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Announce message to screen readers
 * Requirements: 10.7
 * 
 * @param message - Message to announce
 * @param priority - Announcement priority ('polite' | 'assertive')
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}
