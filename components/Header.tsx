import React from 'react';
import { PersonaSwitcher } from './PersonaSwitcher';
import { PersonaSwitcherErrorBoundary } from './ErrorBoundary';

export interface HeaderProps {
  /**
   * Application title
   */
  title?: string;
  
  /**
   * Subtitle text
   */
  subtitle?: string;
  
  /**
   * Whether to show the agent selector
   */
  showAgentSelector?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Enhanced Header Component
 * 
 * Modern header with gradient background and improved layout.
 * 
 * Features:
 * - Gradient text effect for title (blue to purple to pink)
 * - Proper typographic hierarchy with subtitle
 * - Gradient background with subtle overlay
 * - Backdrop blur effect for depth
 * - Responsive layout (hides agent selector on small screens)
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 11.7
 */
export function Header({
  title = 'Avatar Client',
  subtitle = '3D animated avatar interface for conversational AI',
  showAgentSelector = true,
  className = '',
}: HeaderProps) {
  return (
    <header
      className={`
        relative
        bg-gradient-to-r from-gray-50 via-white to-gray-50
        dark:from-gray-900 dark:via-gray-800 dark:to-gray-900
        border-b border-gray-200/50 dark:border-gray-700/50
        shadow-sm
        backdrop-blur-xl
        ${className}
      `}
    >
      {/* Gradient overlay for visual depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            {/* Title with gradient text effect */}
            <h1
              className="
                text-2xl sm:text-3xl font-bold
                bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600
                bg-clip-text text-transparent
                animate-gradient-shift
                bg-[length:200%_auto]
              "
            >
              {title}
            </h1>
            
            {/* Subtitle with proper hierarchy */}
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          
          {/* Agent Selector - Desktop only */}
          {showAgentSelector && (
            <div id="agent-selector" className="hidden lg:block">
              <PersonaSwitcherErrorBoundary>
                <PersonaSwitcher />
              </PersonaSwitcherErrorBoundary>
            </div>
          )}
        </div>

        {/* Agent Selector - Mobile */}
        {showAgentSelector && (
          <div className="lg:hidden mt-4">
            <PersonaSwitcherErrorBoundary>
              <PersonaSwitcher />
            </PersonaSwitcherErrorBoundary>
          </div>
        )}
      </div>
    </header>
  );
}
