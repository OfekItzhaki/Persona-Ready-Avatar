import React from 'react';
import { PersonaSwitcher } from './PersonaSwitcher';
import { PersonaSwitcherErrorBoundary } from './ErrorBoundary';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  showAgentSelector?: boolean;
  className?: string;
}

export function Header({
  title = 'Avatar Client',
  subtitle = 'AI Avatar Chat Interface',
  showAgentSelector = true,
  className = '',
}: HeaderProps) {
  return (
    <header className={`bg-white border-b border-gray-200 shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          
          {showAgentSelector && (
            <div>
              <PersonaSwitcherErrorBoundary>
                <PersonaSwitcher />
              </PersonaSwitcherErrorBoundary>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
