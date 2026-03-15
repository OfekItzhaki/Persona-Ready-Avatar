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

  useEffect(() => {
    if (error && !retryTimeout) {
      logger.warn('Agent fetch failed, retrying in 5 seconds', {
        component: 'PersonaSwitcher',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      const timeout = setTimeout(() => {
        logger.info('Retrying agent fetch', { component: 'PersonaSwitcher' });
        refetch();
        setRetryTimeout(null);
      }, 5000);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRetryTimeout(timeout);
    }
    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [error, refetch, retryTimeout]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectAgent = (agentId: string) => {
    logger.info('Agent selected', { component: 'PersonaSwitcher', agentId });
    setSelectedAgent(agentId);
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!agents || agents.length === 0) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else setFocusedIndex((prev) => (prev < agents.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        event.preventDefault();
        if (isOpen && focusedIndex >= 0 && agents[focusedIndex])
          handleSelectAgent(agents[focusedIndex].id);
        else if (!isOpen) {
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

  const selectedAgent = agents?.find((agent) => agent.id === selectedAgentId);

  return (
    <div
      ref={dropdownRef}
      style={{ position: 'relative', minWidth: '200px' }}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || !!error}
        aria-label="Select AI agent"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="agent-listbox"
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'var(--bg-card)',
          border: `1px solid ${isOpen ? 'var(--border-accent)' : 'var(--border)'}`,
          borderRadius: '10px',
          cursor: isLoading || error ? 'not-allowed' : 'pointer',
          opacity: isLoading || error ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          transition: 'border-color 0.15s, background 0.15s',
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              flexShrink: 0,
              background: 'linear-gradient(135deg, var(--accent) 0%, #818cf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '700',
              color: 'white',
            }}
          >
            {selectedAgent ? selectedAgent.name.charAt(0).toUpperCase() : '?'}
          </div>
          <span
            style={{
              fontSize: '13px',
              fontWeight: '500',
              color: isLoading || error ? 'var(--text-muted)' : 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {isLoading
              ? 'Loading...'
              : error
                ? 'Error loading agents'
                : selectedAgent
                  ? selectedAgent.name
                  : 'Select an agent'}
          </span>
        </div>
        <svg
          style={{
            width: '14px',
            height: '14px',
            color: 'var(--text-muted)',
            flexShrink: 0,
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'none',
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && agents && agents.length > 0 && (
        <ul
          id="agent-listbox"
          role="listbox"
          aria-label="Available AI agents"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: '100%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-accent)',
            borderRadius: '12px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            zIndex: 100,
            overflow: 'hidden',
            listStyle: 'none',
            padding: '4px',
          }}
        >
          {agents.map((agent, index) => (
            <li
              key={agent.id}
              role="option"
              aria-selected={agent.id === selectedAgentId}
              onClick={() => handleSelectAgent(agent.id)}
              onMouseEnter={() => setFocusedIndex(index)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                borderRadius: '8px',
                background:
                  agent.id === selectedAgentId
                    ? 'var(--accent-glow)'
                    : focusedIndex === index
                      ? 'rgba(255,255,255,0.04)'
                      : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'background 0.1s',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  flexShrink: 0,
                  background:
                    agent.id === selectedAgentId
                      ? 'linear-gradient(135deg, var(--accent) 0%, #818cf8 100%)'
                      : 'rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: agent.id === selectedAgentId ? 'white' : 'var(--text-secondary)',
                }}
              >
                {agent.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: agent.id === selectedAgentId ? '600' : '400',
                    color:
                      agent.id === selectedAgentId
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                  }}
                >
                  {agent.name}
                </div>
                {agent.description && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {agent.description}
                  </div>
                )}
              </div>
              {agent.id === selectedAgentId && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
