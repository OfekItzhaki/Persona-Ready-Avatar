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
          w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-lg
          shadow-sm hover:shadow-md hover:border-blue-400 focus:outline-none focus:ring-2
          focus:ring-blue-500 focus:border-transparent transition-all duration-200
          ${isLoading || error ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Agent Icon */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {selectedAgent ? selectedAgent.name.charAt(0).toUpperCase() : '?'}
            </div>

            {/* Agent Info */}
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <span className="text-gray-500 text-sm">Loading agents...</span>
              ) : error ? (
                <span className="text-red-600 text-sm">Error loading agents. Retrying...</span>
              ) : selectedAgent ? (
                <div>
                  <div className="font-medium text-gray-900 text-sm">{selectedAgent.name}</div>
                </div>
              ) : (
                <span className="text-gray-500 text-sm">Select an agent...</span>
              )}
            </div>
          </div>

          {/* Dropdown Arrow */}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && agents && agents.length > 0 && (
        <ul
          id="agent-listbox"
          role="listbox"
          aria-label="Available AI agents"
          className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-80 overflow-auto"
        >
          {agents.map((agent, index) => (
            <li
              key={agent.id}
              role="option"
              aria-selected={agent.id === selectedAgentId}
              onClick={() => handleSelectAgent(agent.id)}
              onMouseEnter={() => setFocusedIndex(index)}
              className={`
                px-4 py-3 cursor-pointer transition-colors border-b-2 border-gray-200 last:border-b-0
                ${agent.id === selectedAgentId ? 'bg-blue-100 font-semibold' : 'hover:bg-gray-50'}
                ${focusedIndex === index ? 'bg-gray-100' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                {/* Agent Avatar */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {agent.name.charAt(0).toUpperCase()}
                </div>

                {/* Agent Details */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm flex items-center gap-2">
                    {agent.name}
                    {agent.id === selectedAgentId && (
                      <span className="text-blue-600 font-bold">✓</span>
                    )}
                  </div>
                  {agent.description && (
                    <div className="text-xs text-gray-600 truncate">{agent.description}</div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
