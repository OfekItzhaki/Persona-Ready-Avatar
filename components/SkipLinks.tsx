'use client';

/**
 * SkipLinks Component
 * 
 * Provides skip navigation links to bypass repetitive content and jump to main sections.
 * These links are visually hidden but become visible when focused via keyboard navigation.
 * 
 * Features:
 * - Skip to main content
 * - Skip to chat interface
 * - Skip to avatar controls
 * - Visually hidden until focused (WCAG 2.1 Level AA)
 * - Keyboard accessible
 * 
 * Requirements: 35.8
 */

export function SkipLinks() {
  return (
    <div className="skip-links">
      <a
        href="#main-content"
        className="skip-link"
      >
        Skip to main content
      </a>
      <a
        href="#chat-interface"
        className="skip-link"
      >
        Skip to chat
      </a>
      <a
        href="#avatar-canvas"
        className="skip-link"
      >
        Skip to avatar
      </a>
      <a
        href="#agent-selector"
        className="skip-link"
      >
        Skip to agent selector
      </a>

      <style jsx>{`
        .skip-links {
          position: relative;
          z-index: 9999;
        }

        .skip-link {
          position: absolute;
          top: -40px;
          left: 0;
          background: #000;
          color: #fff;
          padding: 8px 16px;
          text-decoration: none;
          font-weight: 600;
          border-radius: 0 0 4px 0;
          z-index: 100;
          transition: top 0.2s ease-in-out;
        }

        .skip-link:focus {
          top: 0;
          outline: 3px solid #3b82f6;
          outline-offset: 2px;
        }

        .skip-link:hover {
          background: #1a1a1a;
        }
      `}</style>
    </div>
  );
}
