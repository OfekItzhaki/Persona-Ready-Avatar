'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';

/**
 * TranscriptDisplay Component
 *
 * Displays real-time conversation text with synchronized highlighting based on audio playback.
 * Provides text alternatives for audio content to support accessibility.
 *
 * Features:
 * - Real-time conversation text display (Requirement 9.1)
 * - Highlight currently spoken text segment (Requirement 9.2)
 * - Chronological message ordering (Requirement 9.3)
 * - Auto-scroll to most recent message (Requirement 9.4)
 * - Visual distinction between user and agent messages (Requirement 9.5)
 * - ARIA live region for screen reader announcements (Requirement 13.6)
 * - Text alternatives for audio content (Requirement 13.4)
 *
 * Requirements: 9.1-9.5, 13.4, 13.6
 */

interface TranscriptDisplayProps {
  className?: string;
  audioManager?: {
    getCurrentTime: () => number;
    getDuration: () => number;
    subscribeToPlaybackState: (callback: (state: string) => void) => () => void;
  };
}

export function TranscriptDisplay({ className = '', audioManager }: TranscriptDisplayProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Get messages and playback state from Zustand store
  const messages = useAppStore((state) => state.messages);
  const playbackState = useAppStore((state) => state.playbackState);

  // Track playback state
  useEffect(() => {
    setIsPlaying(playbackState === 'playing');
  }, [playbackState]);

  // Subscribe to audio playback updates for highlighting
  useEffect(() => {
    if (!audioManager) {
      return;
    }

    let animationFrameId: number;
    let unsubscribe: (() => void) | undefined;

    const updatePlaybackTime = () => {
      if (isPlaying) {
        audioManager.getCurrentTime();
        animationFrameId = requestAnimationFrame(updatePlaybackTime);
      }
    };

    // Subscribe to playback state changes
    unsubscribe = audioManager.subscribeToPlaybackState((state) => {
      setIsPlaying(state === 'playing');
      if (state === 'playing') {
        updatePlaybackTime();
      } else {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      }
    });

    // Start tracking if already playing
    if (isPlaying) {
      updatePlaybackTime();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [audioManager, isPlaying]);

  // Auto-scroll to latest message (Requirement 9.4)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Format timestamp for display
   */
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  /**
   * Determine if a message should be highlighted based on playback position
   * Highlights the most recent agent message during playback
   */
  const shouldHighlight = (message: typeof messages[0]): boolean => {
    if (!isPlaying || message.role !== 'agent') {
      return false;
    }

    // Find the most recent agent message
    const agentMessages = messages.filter((m) => m.role === 'agent');
    const lastAgentMessage = agentMessages[agentMessages.length - 1];

    // Highlight only the most recent agent message during playback
    return message.id === lastAgentMessage?.id;
  };

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-300 px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">Transcript</h2>
        <p className="text-xs text-gray-600">Real-time conversation text</p>
      </div>

      {/* Transcript Content (Requirement 9.1, 9.3) */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions"
        aria-label="Conversation transcript"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Conversation transcript will appear here</p>
          </div>
        ) : (
          messages.map((message) => {
            const isHighlighted = shouldHighlight(message);

            return (
              <div
                key={message.id}
                className={`p-3 rounded-lg transition-all duration-300 ${
                  message.role === 'user'
                    ? 'bg-blue-50 border-l-4 border-blue-600' // User message styling (Requirement 9.5)
                    : isHighlighted
                    ? 'bg-yellow-100 border-l-4 border-yellow-600 shadow-md' // Highlighted agent message (Requirement 9.2)
                    : 'bg-gray-50 border-l-4 border-gray-400' // Agent message styling (Requirement 9.5)
                }`}
                role="article"
                aria-label={`${message.role === 'user' ? 'User' : 'Agent'} message at ${formatTime(message.timestamp)}`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      message.role === 'user' ? 'text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    {message.role === 'user' ? 'You' : 'Agent'}
                  </span>
                  <span className="text-xs text-gray-600">{formatTime(message.timestamp)}</span>
                </div>

                {/* Message Content */}
                <p
                  className={`text-sm whitespace-pre-wrap break-words ${
                    message.role === 'user' ? 'text-blue-900' : 'text-gray-900'
                  }`}
                >
                  {message.content}
                </p>

                {/* Speaking Indicator (Requirement 9.2) */}
                {isHighlighted && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full animate-pulse" />
                      <span
                        className="w-1.5 h-1.5 bg-yellow-600 rounded-full animate-pulse"
                        style={{ animationDelay: '0.2s' }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-yellow-600 rounded-full animate-pulse"
                        style={{ animationDelay: '0.4s' }}
                      />
                    </div>
                    <span className="text-xs text-yellow-700 font-medium">Speaking...</span>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Auto-scroll anchor (Requirement 9.4) */}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* Screen Reader Announcements (Requirement 13.6) */}
      <div className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
        {messages.length > 0 && (
          <span>
            {messages[messages.length - 1].role === 'user' ? 'You said: ' : 'Agent said: '}
            {messages[messages.length - 1].content}
          </span>
        )}
      </div>
    </div>
  );
}
