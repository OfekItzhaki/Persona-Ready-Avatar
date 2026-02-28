/**
 * Focus Indicators Utility
 * 
 * Provides utilities for managing visible focus indicators across the application.
 * Ensures all focusable elements have clear, visible focus indicators that meet WCAG AA standards.
 * 
 * Features:
 * - Detects keyboard vs mouse navigation
 * - Applies enhanced focus styles only for keyboard navigation
 * - Prevents focus indicators on mouse clicks
 * - Supports enhanced focus mode for accessibility
 * 
 * Requirements: 35.2
 */

let isUsingKeyboard = false;

/**
 * Initialize focus indicator management
 * Adds event listeners to detect keyboard vs mouse navigation
 */
export function initializeFocusIndicators() {
  // Detect keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      isUsingKeyboard = true;
      document.body.classList.add('keyboard-navigation');
    }
  });

  // Detect mouse navigation
  document.addEventListener('mousedown', () => {
    isUsingKeyboard = false;
    document.body.classList.remove('keyboard-navigation');
  });

  // Add global focus indicator styles
  addGlobalFocusStyles();
}

/**
 * Add global CSS for focus indicators
 * Ensures all focusable elements have visible focus indicators (Requirement 35.2)
 */
function addGlobalFocusStyles() {
  const styleId = 'focus-indicator-styles';
  
  // Check if styles already exist
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Base focus styles for all focusable elements (Requirement 35.2) */
    *:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    /* Enhanced focus styles for keyboard navigation */
    body.keyboard-navigation *:focus {
      outline: 3px solid #3b82f6;
      outline-offset: 3px;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
    }

    /* Remove focus outline for mouse clicks (but keep for keyboard) */
    body:not(.keyboard-navigation) *:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    /* Specific focus styles for buttons */
    button:focus,
    a:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    body.keyboard-navigation button:focus,
    body.keyboard-navigation a:focus {
      outline: 3px solid #3b82f6;
      outline-offset: 3px;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
    }

    /* Focus styles for form inputs */
    input:focus,
    textarea:focus,
    select:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 0;
      border-color: #3b82f6;
    }

    body.keyboard-navigation input:focus,
    body.keyboard-navigation textarea:focus,
    body.keyboard-navigation select:focus {
      outline: 3px solid #3b82f6;
      outline-offset: 0;
      border-color: #3b82f6;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
    }

    /* Focus styles for custom controls (sliders, etc.) */
    input[type="range"]:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }

    body.keyboard-navigation input[type="range"]:focus {
      outline: 3px solid #3b82f6;
      outline-offset: 3px;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
    }

    /* Ensure focus is visible in dark mode */
    .dark *:focus {
      outline-color: #60a5fa;
    }

    .dark body.keyboard-navigation *:focus {
      outline-color: #60a5fa;
      box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.2);
    }

    /* Skip links visibility */
    .skip-link:focus {
      outline: 3px solid #3b82f6;
      outline-offset: 2px;
    }
  `;

  document.head.appendChild(style);
}

/**
 * Check if keyboard navigation is currently active
 */
export function isKeyboardNavigation(): boolean {
  return isUsingKeyboard;
}

/**
 * Manually set keyboard navigation mode
 * Useful for testing or programmatic control
 */
export function setKeyboardNavigation(enabled: boolean) {
  isUsingKeyboard = enabled;
  if (enabled) {
    document.body.classList.add('keyboard-navigation');
  } else {
    document.body.classList.remove('keyboard-navigation');
  }
}
