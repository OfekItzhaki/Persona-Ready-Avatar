import { useEffect, useRef } from 'react';

/**
 * useFocusTrap Hook
 * 
 * Traps keyboard focus within a container element (e.g., modal dialog).
 * Ensures Tab and Shift+Tab cycle through focusable elements within the container.
 * 
 * Features:
 * - Traps focus within container
 * - Handles Tab and Shift+Tab navigation
 * - Returns focus to trigger element when trap is released
 * - Supports dynamic content changes
 * 
 * Requirements: 35.6, 35.7
 * 
 * @param isActive - Whether the focus trap should be active
 * @param returnFocusRef - Optional ref to element that should receive focus when trap is released
 * @returns Ref to attach to the container element
 */
export function useFocusTrap<T extends HTMLElement>(
  isActive: boolean,
  returnFocusRef?: React.RefObject<HTMLElement>
) {
  const containerRef = useRef<T>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store the currently focused element to return focus later (Requirement 35.7)
    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    const container = containerRef.current;

    // Get all focusable elements within the container
    const getFocusableElements = (): HTMLElement[] => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      return Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelectors)
      ).filter((el) => {
        // Filter out elements that are not visible
        return el.offsetParent !== null;
      });
    };

    // Focus the first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle Tab key navigation to trap focus (Requirement 35.6)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      if (e.shiftKey) {
        // Shift+Tab: Move focus backwards
        if (activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: Move focus forwards
        if (activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Cleanup: Return focus to trigger element (Requirement 35.7)
    return () => {
      container.removeEventListener('keydown', handleKeyDown);

      // Return focus to the element that opened the modal
      const elementToFocus = returnFocusRef?.current || previouslyFocusedElement.current;
      if (elementToFocus && document.body.contains(elementToFocus)) {
        elementToFocus.focus();
      }
    };
  }, [isActive, returnFocusRef]);

  return containerRef;
}
