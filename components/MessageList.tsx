'use client';

import { useEffect, useRef, useState, useMemo, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ChatMessage } from '@/types';
import { MessageBubble } from './ui/MessageBubble';
import { TypingIndicator } from './ui/TypingIndicator';

/**
 * MessageList Component
 *
 * A comprehensive message display component that shows conversation history with advanced features
 * including search, filtering, editing, deletion, and reactions. Optimized for performance with
 * virtual scrolling for large conversations.
 *
 * @component
 * @example
 * ```tsx
 * import { MessageList } from '@/components/MessageList';
 * 
 * function ChatInterface() {
 *   const messages = useAppStore((state) => state.messages);
 *   const [isPending, setIsPending] = useState(false);
 * 
 *   const handleEditMessage = (messageId: string, newContent: string) => {
 *     // Update message in store
 *     updateMessage(messageId, { content: newContent, edited: true, editedAt: new Date() });
 *   };
 * 
 *   const handleDeleteMessage = (messageId: string) => {
 *     // Remove message from store
 *     removeMessage(messageId);
 *   };
 * 
 *   const handleReaction = (messageId: string, reaction: 'thumbs_up' | 'thumbs_down' | null) => {
 *     // Update message reaction in store
 *     updateMessage(messageId, { reaction });
 *   };
 * 
 *   return (
 *     <MessageList
 *       messages={messages}
 *       onEditMessage={handleEditMessage}
 *       onDeleteMessage={handleDeleteMessage}
 *       onReactToMessage={handleReaction}
 *       isPending={isPending}
 *       showTypingIndicator={isPending}
 *     />
 *   );
 * }
 * ```
 *
 * @features
 * - **Message Display**: Shows all messages in chronological order with visual distinction between user and agent messages
 * - **Virtual Scrolling**: Automatically enables for conversations with 100+ messages for optimal performance
 * - **Search & Filter**: Real-time search with text highlighting and role-based filtering (all/user/agent)
 * - **Message Editing**: Inline editing for the 5 most recent user messages with validation
 * - **Message Deletion**: Delete any message with confirmation dialog
 * - **Reactions**: Thumbs up/down reactions on agent messages
 * - **Enhanced Timestamps**: Relative timestamps for recent messages, absolute for older ones
 * - **Typing Indicator**: Animated indicator when agent is processing
 * - **Auto-scroll**: Automatically scrolls to latest message when new messages arrive
 * - **Empty State**: Friendly placeholder when no messages exist
 *
 * @accessibility
 * - Uses semantic HTML with role="log" for message container
 * - ARIA live regions announce new messages to screen readers
 * - All interactive elements have ARIA labels and keyboard support
 * - Focus management for edit mode and delete confirmation
 * - Visible focus indicators on all interactive elements
 * - Screen reader announcements for message actions
 *
 * @performance
 * - Wrapped with React.memo to prevent unnecessary re-renders
 * - Virtual scrolling with @tanstack/react-virtual for 100+ messages
 * - Debounced search input (300ms) to reduce re-renders
 * - Optimized message rendering with memoized filtering
 *
 * @requirements 1, 11, 12, 15, 16, 17, 18, 41
 */

/**
 * Props for the MessageList component
 */
interface MessageListProps {
  /** Array of chat messages to display in chronological order */
  messages: ChatMessage[];
  
  /** Callback fired when a message is edited. Receives messageId and new content. */
  onEditMessage?: (messageId: string, newContent: string) => void;
  
  /** Callback fired when a message is deleted. Receives messageId. */
  onDeleteMessage?: (messageId: string) => void;
  
  /** Callback fired when a message reaction is added/changed/removed. Receives messageId and reaction (or null to remove). */
  onReactToMessage?: (messageId: string, reaction: 'thumbs_up' | 'thumbs_down' | null) => void;
  
  /** Whether the component is in a loading state */
  isLoading?: boolean;
  
  /** Whether a request is pending (disables edit/delete actions) */
  isPending?: boolean;
  
  /** Additional CSS classes to apply to the container */
  className?: string;
  
  /** Whether to show the typing indicator (typically when agent is processing) */
  showTypingIndicator?: boolean;
}

// Threshold for enabling virtual scrolling (Requirement 1.5)
const VIRTUAL_SCROLL_THRESHOLD = 100;

// Maximum message length for editing (Requirement 11.6)
const MAX_MESSAGE_LENGTH = 5000;

// Maximum number of recent user messages that can be edited (Requirement 11.7)
const MAX_EDITABLE_MESSAGES = 5;

// Debounce delay for search input (Requirement 15.2)
const SEARCH_DEBOUNCE_MS = 300;

// Role filter options (Requirement 15.6)
type RoleFilter = 'all' | 'user' | 'agent';

// Wrap with React.memo to prevent unnecessary re-renders (Requirement 41.2)
export const MessageList = memo(function MessageList({ 
  messages, 
  onEditMessage,
  onDeleteMessage,
  onReactToMessage,
  isLoading = false, 
  isPending = false,
  showTypingIndicator = false, // Requirement 16.1
  className = '' 
}: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // State for message editing (Requirement 11.2)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  
  // State for message deletion (Requirement 12.2)
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);

  // State for search functionality (Requirement 15.1, 15.2)
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // State for role filter (Requirement 15.6)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  // State for forcing timestamp updates (Requirement 17.4)
  const [, setTimestampTick] = useState(0);

  // Update relative timestamps every minute (Requirement 17.4)
  useEffect(() => {
    const interval = setInterval(() => {
      setTimestampTick((tick) => tick + 1);
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  // Debounce search query (Requirement 15.2)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter messages based on search query and role filter (Requirement 15.2, 15.6, 15.7)
  const filteredMessages = useMemo(() => {
    let filtered = messages;

    // Apply role filter (Requirement 15.6)
    if (roleFilter !== 'all') {
      filtered = filtered.filter((msg) => msg.role === roleFilter);
    }

    // Apply search filter (Requirement 15.2, 15.4)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter((msg) =>
        msg.content.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [messages, debouncedSearchQuery, roleFilter]);

  const shouldUseVirtualization = filteredMessages.length > VIRTUAL_SCROLL_THRESHOLD;

  // Configure virtual scrolling with appropriate overscan (Requirement 2.3)
  const virtualizer = useVirtualizer({
    count: filteredMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated message height in pixels
    overscan: 5, // Render 5 extra items above and below viewport for smooth scrolling
    enabled: shouldUseVirtualization,
  });

  // Auto-scroll to latest message when new messages are added (Requirement 1.4)
  // Maintain auto-scroll behavior with virtualization (Requirement 2.3)
  useEffect(() => {
    if (filteredMessages.length === 0) return;

    if (shouldUseVirtualization) {
      // For virtualized list, scroll to the last item
      virtualizer.scrollToIndex(filteredMessages.length - 1, {
        align: 'end',
        behavior: 'smooth',
      });
    } else {
      // For non-virtualized list, scroll to bottom
      if (parentRef.current) {
        // Use scrollTop for better compatibility with test environments
        parentRef.current.scrollTop = parentRef.current.scrollHeight;
      }
    }
  }, [messages.length, shouldUseVirtualization, virtualizer, filteredMessages.length]);

  /**
   * Format timestamp for display
   * - Relative timestamps for recent messages: "just now", "2 minutes ago" (Requirement 17.1)
   * - Absolute timestamps for messages older than 24 hours (Requirement 17.2)
   * - Handles invalid dates gracefully (Requirement 17.7)
   */
  const formatTimestamp = (date: Date): string => {
    // Handle invalid dates gracefully (Requirement 17.7)
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    // Relative timestamps for recent messages (Requirement 17.1)
    if (diffMinutes < 1) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }

    // Absolute timestamps for messages older than 24 hours (Requirement 17.2)
    // Respect user's locale settings (Requirement 17.5)
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  /**
   * Get full absolute timestamp for tooltip
   * Used when hovering over a timestamp (Requirement 17.3)
   */
  const getFullTimestamp = (date: Date): string => {
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    // Respect user's locale settings (Requirement 17.5)
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  };

  /**
   * Check if a message can be edited (Requirement 11.7)
   * Only the 5 most recent user messages can be edited
   */
  const canEditMessage = (messageId: string): boolean => {
    // Find all user messages
    const userMessages = messages.filter((m) => m.role === 'user');
    
    // Get the 5 most recent user messages
    const recentUserMessages = userMessages.slice(-MAX_EDITABLE_MESSAGES);
    
    // Check if this message is in the recent list
    return recentUserMessages.some((m) => m.id === messageId);
  };

  /**
   * Start editing a message (Requirement 11.2)
   */
  const handleStartEdit = (message: ChatMessage) => {
    if (isPending) return; // Disable during pending requests (Requirement 11.8)
    if (!canEditMessage(message.id)) return;
    
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  /**
   * Cancel editing (Requirement 11.5)
   */
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  /**
   * Save edited message (Requirement 11.3, 11.6)
   */
  const handleSaveEdit = (messageId: string) => {
    // Validate: non-empty message (Requirement 11.6)
    const trimmedContent = editContent.trim();
    if (!trimmedContent) {
      return; // Don't save empty messages
    }

    // Validate: max length (Requirement 11.6)
    if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
      return; // Don't save messages exceeding max length
    }

    // Call the onEditMessage callback (Requirement 11.3)
    if (onEditMessage) {
      onEditMessage(messageId, trimmedContent);
    }

    // Clear edit state
    setEditingMessageId(null);
    setEditContent('');
  };

  /**
   * Handle keyboard events in edit mode (Requirement 11.5)
   */
  const handleEditKeyDown = (e: React.KeyboardEvent, messageId: string) => {
    if (e.key === 'Escape') {
      // Cancel edit on Escape (Requirement 11.5)
      e.preventDefault();
      handleCancelEdit();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Save on Enter (without Shift)
      e.preventDefault();
      handleSaveEdit(messageId);
    }
    // Shift+Enter allows newline
  };

  /**
   * Start delete confirmation (Requirement 12.2)
   */
  const handleStartDelete = (messageId: string) => {
    if (isPending) return; // Disable during pending requests (Requirement 12.8)
    setDeletingMessageId(messageId);
  };

  /**
   * Cancel delete operation
   */
  const handleCancelDelete = () => {
    setDeletingMessageId(null);
  };

  /**
   * Confirm and execute delete (Requirement 12.3)
   */
  const handleConfirmDelete = () => {
    if (deletingMessageId && onDeleteMessage) {
      onDeleteMessage(deletingMessageId);
    }
    setDeletingMessageId(null);
  };

  /**
   * Handle keyboard events in delete confirmation dialog (Requirement 12.5)
   */
  const handleDeleteDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelDelete();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmDelete();
    }
  };

  /**
   * Clear search query (Requirement 15.8)
   */
  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
  };

  /**
   * Handle search input keyboard events (Requirement 15.8)
   */
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClearSearch();
    }
  };

  /**
   * Highlight matching text in message content (Requirement 15.3)
   */
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) {
      return text;
    }

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    let index = lowerText.indexOf(lowerQuery);
    while (index !== -1) {
      // Add text before match
      if (index > lastIndex) {
        parts.push(text.substring(lastIndex, index));
      }
      
      // Add highlighted match
      parts.push(
        <mark
          key={`${index}-${lastIndex}`}
          className="bg-yellow-300 text-gray-900"
        >
          {text.substring(index, index + query.length)}
        </mark>
      );
      
      lastIndex = index + query.length;
      index = lowerText.indexOf(lowerQuery, lastIndex);
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  /**
   * Handle message reaction (Requirement 18.2, 18.4, 18.5)
   * - Record reaction with message
   * - Allow changing reaction by clicking different button
   * - Allow removing reaction by clicking same button again
   */
  const handleReaction = (messageId: string, reaction: 'thumbs_up' | 'thumbs_down') => {
    if (!onReactToMessage) return;

    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    // If clicking the same reaction, remove it (Requirement 18.5)
    if (message.reaction === reaction) {
      onReactToMessage(messageId, null);
    } else {
      // Otherwise, set or change the reaction (Requirement 18.2, 18.4)
      onReactToMessage(messageId, reaction);
    }
  };

  /**
   * Render a single message item
   * Extracted for reuse in both virtualized and non-virtualized rendering
   */
  const renderMessage = (message: ChatMessage) => {
    const isEditing = editingMessageId === message.id;
    const isHovered = hoveredMessageId === message.id;
    const isUserMessage = message.role === 'user';
    const canEdit = isUserMessage && canEditMessage(message.id) && !isPending;

    return (
      <MessageBubble
        key={message.id}
        message={message}
        isUser={isUserMessage}
        onMouseEnter={() => setHoveredMessageId(message.id)}
        onMouseLeave={() => setHoveredMessageId(null)}
      >
        {isEditing ? (
          // Edit mode (Requirement 11.2)
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => handleEditKeyDown(e, message.id)}
              className="w-full min-h-[60px] px-2 py-1 text-sm text-gray-900 bg-white border border-gray-300 rounded resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={MAX_MESSAGE_LENGTH}
              aria-label="Edit message"
              autoFocus
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-blue-200">
                {editContent.length}/{MAX_MESSAGE_LENGTH}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  aria-label="Cancel editing"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveEdit(message.id)}
                  disabled={!editContent.trim() || editContent.length > MAX_MESSAGE_LENGTH}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500"
                  aria-label="Save edited message"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Display mode
          <>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm whitespace-pre-wrap break-words flex-1">
                {highlightText(message.content, debouncedSearchQuery)}
              </p>
              {/* Action buttons (Requirement 11.1, 12.1, 18.1) - shown on hover/focus */}
              {isHovered && !isPending && (
                <div className="flex gap-1 flex-shrink-0">
                  {/* Edit button for user messages */}
                  {canEdit && (
                    <button
                      onClick={() => handleStartEdit(message)}
                      className={`p-1 ${
                        isUserMessage
                          ? 'text-blue-200 hover:text-white focus:ring-blue-300'
                          : 'text-gray-500 hover:text-gray-700 focus:ring-gray-400'
                      } focus:outline-none focus:ring-2 rounded`}
                      aria-label="Edit message"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                  )}
                  {/* Reaction buttons for agent messages (Requirement 18.1) */}
                  {!isUserMessage && onReactToMessage && (
                    <>
                      <button
                        onClick={() => handleReaction(message.id, 'thumbs_up')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleReaction(message.id, 'thumbs_up');
                          }
                        }}
                        className={`p-1 ${
                          message.reaction === 'thumbs_up'
                            ? 'text-green-600'
                            : 'text-gray-500 hover:text-green-600'
                        } focus:outline-none focus:ring-2 focus:ring-green-400 rounded`}
                        aria-label="Thumbs up"
                        aria-pressed={message.reaction === 'thumbs_up'}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill={message.reaction === 'thumbs_up' ? 'currentColor' : 'none'}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleReaction(message.id, 'thumbs_down')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleReaction(message.id, 'thumbs_down');
                          }
                        }}
                        className={`p-1 ${
                          message.reaction === 'thumbs_down'
                            ? 'text-red-600'
                            : 'text-gray-500 hover:text-red-600'
                        } focus:outline-none focus:ring-2 focus:ring-red-400 rounded`}
                        aria-label="Thumbs down"
                        aria-pressed={message.reaction === 'thumbs_down'}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill={message.reaction === 'thumbs_down' ? 'currentColor' : 'none'}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                  {/* Delete button for all messages (Requirement 12.1, 12.4) */}
                  <button
                    onClick={() => handleStartDelete(message.id)}
                    className={`p-1 ${
                      isUserMessage
                        ? 'text-blue-200 hover:text-white focus:ring-blue-300'
                        : 'text-gray-500 hover:text-gray-700 focus:ring-gray-400'
                    } focus:outline-none focus:ring-2 rounded`}
                    aria-label="Delete message"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p
                className={`text-xs ${
                  isUserMessage ? 'text-blue-200' : 'text-gray-600 dark:text-gray-400'
                }`}
                title={getFullTimestamp(message.timestamp)}
                aria-label={`Sent ${getFullTimestamp(message.timestamp)}`}
              >
                {formatTimestamp(message.timestamp)}
              </p>
              {/* Edited indicator (Requirement 11.4) */}
              {message.edited && message.editedAt && (
                <span
                  className={`text-xs italic ${
                    isUserMessage ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
                  }`}
                  title={`Edited ${getFullTimestamp(message.editedAt)}`}
                  aria-label={`Edited ${getFullTimestamp(message.editedAt)}`}
                >
                  (edited)
                </span>
              )}
              {/* Queue status indicator (Requirement 33.2) */}
              {message.queueStatus && (
                <span
                  className={`text-xs italic flex items-center gap-1 ${
                    isUserMessage ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
                  }`}
                  aria-label={`Message status: ${message.queueStatus}`}
                >
                  {message.queueStatus === 'pending' && (
                    <>
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>(pending)</span>
                    </>
                  )}
                  {message.queueStatus === 'sending' && (
                    <>
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>(sending)</span>
                    </>
                  )}
                  {message.queueStatus === 'failed' && (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>(failed)</span>
                    </>
                  )}
                </span>
              )}
              {/* Reaction display (Requirement 18.3) */}
              {message.reaction && (
                <span
                  className={`text-xs ${
                    message.reaction === 'thumbs_up' ? 'text-green-600' : 'text-red-600'
                  }`}
                  aria-label={`Reacted with ${message.reaction === 'thumbs_up' ? 'thumbs up' : 'thumbs down'}`}
                >
                  {message.reaction === 'thumbs_up' ? '👍' : '👎'}
                </span>
              )}
            </div>
          </>
        )}
      </MessageBubble>
    );
  };

  /**
   * Render typing indicator (Requirement 16)
   * - Display animated typing indicator when request is pending (Requirement 16.1)
   * - Show as agent message placeholder (Requirement 16.3)
   * - Animated "..." visual cue (Requirement 16.2)
   * - ARIA label "Agent is typing" (Requirement 16.5)
   * - Smooth and not distracting animation (Requirement 16.6)
   */
  const renderTypingIndicator = () => {
    return <TypingIndicator />;
  };

  // Screen reader announcement for new messages (Requirement 36.3)
  const [announcement, setAnnouncement] = useState('');

  // Announce new messages to screen readers (Requirement 36.3)
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      const role = latestMessage.role === 'user' ? 'You' : 'Agent';
      setAnnouncement(`${role} said: ${latestMessage.content}`);
      
      // Clear announcement after a short delay to allow for new announcements
      const timer = setTimeout(() => setAnnouncement(''), 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Screen reader announcement region (Requirement 36.3) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Search and Filter UI (Requirement 15.1, 15.6) */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        {/* Search input (Requirement 15.1) */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search messages..."
            className="search-input w-full px-4 py-2 pr-20 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search messages"
          />
          {/* Clear button (Requirement 15.8) */}
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="search-clear-button absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label="Clear search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Role filter and message count (Requirement 15.5, 15.6) */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="role-filter" className="text-sm text-gray-600">
              Filter:
            </label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              className="filter-select px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filter messages by role"
            >
              <option value="all">All messages</option>
              <option value="user">User only</option>
              <option value="agent">Agent only</option>
            </select>
          </div>

          {/* Message count (Requirement 15.5) */}
          {(debouncedSearchQuery || roleFilter !== 'all') && (
            <span className="text-sm text-gray-600">
              {filteredMessages.length} {filteredMessages.length === 1 ? 'message' : 'messages'}
            </span>
          )}
        </div>
      </div>

      {/* Message display area */}
      <div
        ref={parentRef}
        className={`message-list-container flex-1 overflow-y-auto p-4 ${className}`}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-atomic="false"
        aria-label="Conversation history"
      >
      {/* Empty state placeholder (Requirement 1.7) */}
      {messages.length === 0 && !isLoading ? (
        <div className="text-center text-gray-500 mt-8">
          <p>No messages yet. Start a conversation!</p>
        </div>
      ) : filteredMessages.length === 0 ? (
        // No results message (Requirement 15.7)
        <div className="text-center text-gray-500 mt-8">
          <p>No messages match your search.</p>
        </div>
      ) : shouldUseVirtualization ? (
        // Virtual scrolling for 100+ messages (Requirement 1.5, 41.1)
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const message = filteredMessages[virtualItem.index];
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="mb-4"
              >
                {renderMessage(message)}
              </div>
            );
          })}
          {/* Typing indicator for virtualized list (Requirement 16) */}
          {showTypingIndicator && (
            <div className="mb-4">
              {renderTypingIndicator()}
            </div>
          )}
        </div>
      ) : (
        // Standard rendering for < 100 messages
        <div className="space-y-4">
          {filteredMessages.map((message) => renderMessage(message))}
          {/* Typing indicator (Requirement 16.1, 16.3, 16.4) */}
          {showTypingIndicator && renderTypingIndicator()}
        </div>
      )}
      </div>

      {/* Delete confirmation dialog (Requirement 12.2, 12.5, 12.6) */}
      {deletingMessageId && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCancelDelete}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
        >
          <div
            className="delete-dialog bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleDeleteDialogKeyDown}
          >
            <h2
              id="delete-dialog-title"
              className="text-lg font-semibold text-gray-900 mb-2"
            >
              Delete Message
            </h2>
            <p
              id="delete-dialog-description"
              className="text-sm text-gray-600 mb-6"
            >
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                className="delete-dialog-button px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                aria-label="Cancel deletion"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="delete-dialog-button px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Confirm deletion"
                autoFocus
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
