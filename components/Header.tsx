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
 * Header Component
 * 
 * Modern header with gradient styling and clear instructions.
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
        bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50
        dark:from-gray-900 dark:via-gray-800 dark:to-gray-900
        border-b border-gray-200 dark:border-gray-700
        shadow-md
        ${className}
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              {title}
            </h1>
            
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {subtitle}
              </p>
            )}
            
            {/* Quick start instructions */}
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Start: Select an agent → Type a message → Press Enter
              </span>
            </div>
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
