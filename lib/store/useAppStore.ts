import { create } from 'zustand';
import type { ChatMessage, VisemeData, PlaybackState, Notification } from '@/types';

/**
 * Application State Interface
 *
 * Manages client-side state for the Avatar Client application using Zustand.
 * This includes agent selection, conversation history, audio/viseme state,
 * and notifications.
 */
interface AppState {
  // Agent selection state
  selectedAgentId: string | null;
  setSelectedAgent: (agentId: string) => void;

  // Conversation state
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;

  // Audio/Viseme state
  currentViseme: VisemeData | null;
  setCurrentViseme: (viseme: VisemeData | null) => void;

  playbackState: PlaybackState;
  setPlaybackState: (state: PlaybackState) => void;

  // Notification state
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

/**
 * Zustand Store for Application State
 *
 * This store manages all client-side state for the Avatar Client application.
 * It provides a centralized state management solution for:
 * - Agent selection (Requirements 4.3)
 * - Conversation history (Requirements 9.3, 11.4)
 * - Audio/Viseme synchronization state
 * - User notifications
 *
 * The store is designed to be lightweight and performant, with minimal
 * boilerplate compared to Redux. State updates are immutable and trigger
 * React re-renders only for components that subscribe to the changed state.
 */
export const useAppStore = create<AppState>((set) => ({
  // Agent selection state
  selectedAgentId: null,
  setSelectedAgent: (agentId: string) => set({ selectedAgentId: agentId }),

  // Conversation state
  messages: [],
  addMessage: (message: ChatMessage) =>
    set((state) => {
      // Check if message with this ID already exists (prevent duplicates)
      const existingIndex = state.messages.findIndex((m) => m.id === message.id);

      let updatedMessages: ChatMessage[];
      if (existingIndex >= 0) {
        // Update existing message instead of adding duplicate
        updatedMessages = [...state.messages];
        updatedMessages[existingIndex] = message;
      } else {
        // Add new message
        updatedMessages = [...state.messages, message];
      }

      // Sort by timestamp to maintain chronological order (Requirement 9.3, 11.4)
      // This ensures messages display correctly even if they arrive out of order
      // Use stable sort: preserve original order for messages with identical timestamps
      updatedMessages.sort((a, b) => {
        const timeA = a.timestamp.getTime();
        const timeB = b.timestamp.getTime();

        // Handle invalid dates (NaN) by treating them as oldest
        if (isNaN(timeA) && isNaN(timeB)) return 0;
        if (isNaN(timeA)) return -1;
        if (isNaN(timeB)) return 1;

        // If timestamps are equal, maintain original order (stable sort)
        if (timeA === timeB) return 0;

        return timeA - timeB;
      });
      return { messages: updatedMessages };
    }),
  clearMessages: () => set({ messages: [] }),

  // Audio/Viseme state
  currentViseme: null,
  setCurrentViseme: (viseme: VisemeData | null) => set({ currentViseme: viseme }),

  playbackState: 'idle',
  setPlaybackState: (state: PlaybackState) => set({ playbackState: state }),

  // Notification state
  notifications: [],
  addNotification: (notification: Notification) =>
    set((state) => ({
      notifications: [...state.notifications, notification],
    })),
  removeNotification: (id: string) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
