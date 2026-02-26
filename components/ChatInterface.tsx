/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
'use client';

import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import { useSendMessage } from '@/lib/hooks/useReactQuery';
import { useAppStore } from '@/lib/store/useAppStore';
import { NotificationService } from '@/lib/services/NotificationService';
import { sanitizeAndValidate } from '@/lib/utils/sanitize';
import type { Agent } from '@/types';

/**
 * ChatInterface Component
 *
 * Provides a text input field and conversation history for user-agent interactions.
 *
 * Features:
 * - Text input with Enter key submission (Requirement 5.1)
 * - Scrollable conversation history (Requirement 5.2)
 * - Message submission to Brain API (Requirement 5.3)
 * - Optimistic UI updates (Requirement 11.3)
 * - Input disabling during pending requests (Requirement 5.7)
 * - Error handling with notifications (Requirement 5.8)
 * - Auto-scroll to latest message (Requirement 9.4)
 * - Visual distinction between user and agent messages (Requirement 9.5)
 * - ARIA labels for accessibility (Requirement 13.2)
 * - Touch input support for mobile (Requirement 12.5)
 *
 * Requirements: 5.1-5.8, 9.3, 9.4, 9.5, 12.5, 13.2
 */

interface ChatInterfaceProps {
  ttsService?: {
    synthesizeSpeech: (text: string, voice: string, language: string) => Promise<any>;
  };
  selectedAgent?: Agent | null;
  className?: string;
}

export function ChatInterface({ ttsService, selectedAgent, className = '' }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get messages from Zustand store
  const messages = useAppStore((state) => state.messages);

  // Use mutation hook for message submission
  const { mutate: sendMessage, isPending } = useSendMessage();

  // Auto-scroll to latest message (Requirement 9.4)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Handle message submission
   * - Validates input
   * - Sanitizes input to prevent injection attacks (Requirement 14.5)
   * - Sends message via mutation hook
   * - Clears input field
   * - Handles errors with notifications
   */
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedMessage = inputValue.trim();

    // Validate input
    if (!trimmedMessage) {
      return;
    }

    // Validate agent selection
    if (!selectedAgent) {
      NotificationService.getInstance().error('Please select an agent before sending a message');
      return;
    }

    // Sanitize and validate input (Requirement 14.5)
    const { sanitized, isValid, error } = sanitizeAndValidate(trimmedMessage);

    if (!isValid) {
      NotificationService.getInstance().error(
        error || 'Invalid input. Please check your message and try again.'
      );
      return;
    }

    // Send message with optimistic update (Requirement 11.3)
    sendMessage(
      {
        agentId: selectedAgent.id,
        message: sanitized, // Use sanitized message
        ttsService,
        selectedAgent,
      },
      {
        onError: (error) => {
          // Display error notification (Requirement 5.8)
          NotificationService.getInstance().error(
            error instanceof Error ? error.message : 'Failed to send message'
          );
        },
      }
    );

    // Clear input field
    setInputValue('');
  };

  /**
   * Handle Enter key press for message submission
   * - Submit on Enter (without Shift)
   * - Allow Shift+Enter for new lines (future enhancement)
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Trigger form submission
      e.currentTarget.form?.requestSubmit();
    }
  };

  /**
   * Format timestamp for display
   * Handles invalid dates gracefully
   */
  const formatTime = (date: Date) => {
    // Handle invalid dates
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Conversation History (Requirement 5.2, 9.3) */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        role="log"
        aria-live="polite"
        aria-label="Conversation history"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white' // User message styling (Requirement 9.5)
                    : 'bg-gray-200 text-gray-900' // Agent message styling (Requirement 9.5)
                }`}
                role="article"
                aria-label={`${message.role === 'user' ? 'Your' : 'Agent'} message`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-200' : 'text-gray-600'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
        {/* Auto-scroll anchor (Requirement 9.4) */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form (Requirement 5.1) */}
      <form onSubmit={handleSubmit} className="border-t border-gray-300 p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending} // Disable during pending request (Requirement 5.7)
            placeholder={
              selectedAgent ? 'Type your message...' : 'Select an agent to start chatting'
            }
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            aria-label="Message input"
            aria-describedby="message-input-help"
          />
          <button
            type="submit"
            disabled={isPending || !inputValue.trim() || !selectedAgent}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            {isPending ? 'Sending...' : 'Send'}
          </button>
        </div>
        <p id="message-input-help" className="text-xs text-gray-500 mt-2">
          Press Enter to send
          {!selectedAgent && ' (Select an agent first)'}
        </p>
      </form>
    </div>
  );
}
