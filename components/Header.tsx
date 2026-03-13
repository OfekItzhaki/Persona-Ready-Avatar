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
 * Simple header with title and agent selector.
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
        bg-white dark:bg-gray-900
        border-b border-gray-200 dark:border-gray-700
        shadow-sm
        ${className}
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            
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
