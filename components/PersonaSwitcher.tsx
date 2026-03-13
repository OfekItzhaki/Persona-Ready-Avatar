'use client';

import { useEffect, useRef, useState } from 'react';
import { useAgents } from '@/lib/hooks/useReactQuery';
import { useAppStore } from '@/lib/store/useAppStore';
import { logger } from '@/lib/logger';

/**
 * PersonaSwitcher Component
 *
 * A dropdown component for selecting different AI agents/personas.
 *
 * Features:
 * - Fetches available agents from Brain API (Requirement 4.1)
 * - Displays agent name and description (Requirement 4.6)
 * - Updates Zustand store on selection (Requirement 4.3)
 * - Loading state while fetching (Requirement 4.5)
 * - Error handling with retry logic (Requirement 4.5)
 * - ARIA labels for accessibility (Requirement 13.1)
 * - Keyboard navigation support (Requirement 13.3)
 *
 * @example
 * ```tsx
 * <PersonaSwitcher />
 * ```
 */
export function PersonaSwitcher() {
  const { data: agents, isLoading, error, refetch } = useAgents();
  const selectedAgentId = useAppStore((state) => state.selectedAgentId);
  const setSelectedAgent = useAppStore((state) => state.setSelectedAgent);

  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(null);

  // eslint-disable-next-line no-undef
  const dropdownRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-undef
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Retry logic: retry after 5 seconds on failure (Requirement 4.5)
  useEffect(() => {
    if (error && !retryTimeout) {
      logger.warn('Agent fetch failed, retrying in 5 seconds', {
        component: 'PersonaSwitcher',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      const timeout = setTimeout(() => {
        logger.info('Retrying agent fetch', {
          component: 'PersonaSwitcher',
        });
        refetch();

        setRetryTimeout(null);
      }, 5000);

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRetryTimeout(timeout);
    }

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [error, refetch, retryTimeout]);

  // Close dropdown when clicking outside
  useEffect(() => {
    // eslint-disable-next-line no-undef
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        // eslint-disable-next-line no-undef
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle agent selection
  const handleSelectAgent = (agentId: string) => {
    logger.info('Agent selected', {
      component: 'PersonaSwitcher',
      agentId,
    });

    setSelectedAgent(agentId);
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  // Keyboard navigation (Requirement 13.3)
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!agents || agents.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex((prev) => (prev < agents.length - 1 ? prev + 1 : prev));
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
        break;

      case 'Enter':
        event.preventDefault();
        if (isOpen && focusedIndex >= 0 && agents[focusedIndex]) {
          handleSelectAgent(agents[focusedIndex].id);
        } else if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        }
        break;

      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        break;

      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
          setFocusedIndex(-1);
        }
        break;
    }
  };

  // Get selected agent details
  const selectedAgent = agents?.find((agent) => agent.id === selectedAgentId);

  return (
    <div ref={dropdownRef} className="relative w-full max-w-md" onKeyDown={handleKeyDown}>
      {/* Dropdown Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || !!error}
        aria-label="Select AI agent"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="agent-listbox"
        className={`
          w-full px-5 py-4 text-left bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl
          shadow-md hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500 focus:outline-none focus:ring-2
          focus:ring-blue-500 focus:border-transparent transition-all duration-200
          ${isLoading || error ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Agent Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
              {selectedAgent ? selectedAgent.name.charAt(0).toUpperCase() : '?'}
            </div>

            {/* Agent Info */}
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <span className="text-gray-500 dark:text-gray-400 text-base">
                  Loading agents...
                </span>
              ) : error ? (
                <span className="text-red-600 dark:text-red-400 text-base">
                  Error loading agents. Retrying...
                </span>
              ) : selectedAgent ? (
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                    {selectedAgent.name}
                  </div>
                  {selectedAgent.description && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">
                      {selectedAgent.description}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-gray-500 dark:text-gray-400 text-base">
                  Select an agent...
                </span>
              )}
            </div>
          </div>

          {/* Dropdown Arrow */}
          <svg
            className={`w-6 h-6 text-gray-400 dark:text-gray-500 transition-transform duration-200 flex-shrink-0 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && agents && agents.length > 0 && (
        <ul
          id="agent-listbox"
          role="listbox"
          aria-label="Available AI agents"
          className="absolute z-20 w-full mt-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-96 overflow-auto"
        >
          {agents.map((agent, index) => (
            <li
              key={agent.id}
              role="option"
              aria-selected={agent.id === selectedAgentId}
              onClick={() => handleSelectAgent(agent.id)}
              onMouseEnter={() => setFocusedIndex(index)}
              className={`
                px-5 py-4 cursor-pointer transition-all duration-150 border-b border-gray-100 dark:border-gray-700 last:border-b-0
                ${
                  agent.id === selectedAgentId
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }
                ${focusedIndex === index ? 'bg-gray-100 dark:bg-gray-700' : ''}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Agent Avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {agent.name.charAt(0).toUpperCase()}
                </div>

                {/* Agent Details */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                    {agent.name}
                    {agent.id === selectedAgentId && (
                      <span className="ml-2 text-blue-600 dark:text-blue-400">✓</span>
                    )}
                  </div>
                  {agent.description && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {agent.description}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500 mt-2">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
                      {agent.language}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
                      🎤 {agent.voice.split('-')[1] || 'Voice'}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
