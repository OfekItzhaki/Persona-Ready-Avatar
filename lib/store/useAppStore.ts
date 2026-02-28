import { create } from 'zustand';
import type {
  ChatMessage,
  VisemeData,
  PlaybackState,
  Notification,
  AudioPreferences,
  AvatarCustomization,
  UIPreferences,
  OfflineQueueItem,
  PerformanceMetrics,
} from '@/types';

/**
 * Application State Interface
 *
 * Manages client-side state for the Avatar Client application using Zustand.
 * This includes agent selection, conversation history, audio/viseme state,
 * notifications, and enhanced features (audio preferences, avatar customization,
 * UI preferences, offline queue, and performance metrics).
 */
interface AppState {
  // Agent selection state
  selectedAgentId: string | null;
  setSelectedAgent: (agentId: string) => void;

  // Conversation state
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  deleteMessage: (messageId: string) => void;
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

  // Audio preferences state (Requirements 3, 4, 5)
  audioPreferences: AudioPreferences;
  updateAudioPreferences: (updates: Partial<AudioPreferences>) => void;

  // Avatar customization state (Requirements 7, 8, 9)
  avatarCustomization: AvatarCustomization;
  updateAvatarCustomization: (updates: Partial<AvatarCustomization>) => void;

  // UI preferences state (Requirements 22, 23)
  uiPreferences: UIPreferences;
  updateUIPreferences: (updates: Partial<UIPreferences>) => void;

  // Offline queue state (Requirements 32, 33)
  offlineQueue: OfflineQueueItem[];
  addToOfflineQueue: (item: OfflineQueueItem) => void;
  updateOfflineQueueItem: (id: string, updates: Partial<OfflineQueueItem>) => void;
  removeFromOfflineQueue: (id: string) => void;
  clearOfflineQueue: () => void;

  // Performance metrics state (Requirements 34)
  performanceMetrics: PerformanceMetrics;
  updatePerformanceMetrics: (updates: Partial<PerformanceMetrics>) => void;

  // TTS error tracking state (Requirement 39)
  consecutiveTTSFailures: number;
  ttsTextOnlyMode: boolean;
  incrementTTSFailures: () => void;
  resetTTSFailures: () => void;
  setTTSTextOnlyMode: (enabled: boolean) => void;
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
 * - Audio preferences (Requirements 3, 4, 5)
 * - Avatar customization (Requirements 7, 8, 9)
 * - UI preferences (Requirements 22, 23)
 * - Offline message queue (Requirements 32, 33)
 * - Performance metrics (Requirements 34)
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

      // Memory management: Limit stored messages to 500 (Requirement 42.3)
      // Archive older messages to local storage when limit reached (Requirement 42.4)
      if (updatedMessages.length > 500) {
        const messagesToArchive = updatedMessages.slice(0, updatedMessages.length - 500);
        updatedMessages = updatedMessages.slice(updatedMessages.length - 500);

        // Archive older messages to localStorage
        try {
          const { LocalStorageRepository } = require('@/lib/repositories/LocalStorageRepository');
          const repo = new LocalStorageRepository();
          repo.archiveMessages(messagesToArchive);
          console.log(`Archived ${messagesToArchive.length} older messages to localStorage`);
        } catch (error) {
          console.error('Failed to archive messages:', error);
        }
      }

      return { messages: updatedMessages };
    }),
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    })),
  deleteMessage: (messageId: string) =>
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== messageId),
    })),
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

  // Audio preferences state (Requirements 3, 4, 5)
  audioPreferences: {
    volume: 100,
    isMuted: false,
    playbackSpeed: 1.0,
    speechRate: 1.0,
    speechPitch: 0,
    audioQuality: 'high',
  },
  updateAudioPreferences: (updates: Partial<AudioPreferences>) =>
    set((state) => ({
      audioPreferences: { ...state.audioPreferences, ...updates },
    })),

  // Avatar customization state (Requirements 7, 8, 9)
  avatarCustomization: {
    skinTone: '#f5d5c5',
    eyeColor: '#4a90e2',
    hairColor: '#3d2817',
    currentExpression: null,
  },
  updateAvatarCustomization: (updates: Partial<AvatarCustomization>) =>
    set((state) => ({
      avatarCustomization: { ...state.avatarCustomization, ...updates },
    })),

  // UI preferences state (Requirements 22, 23)
  uiPreferences: {
    theme: 'system',
    graphicsQuality: 'high',
    performanceMonitorVisible: false,
    performanceMonitorExpanded: false,
    highContrastMode: false,
    screenReaderOptimizations: false,
    enhancedFocusIndicators: true,
  },
  updateUIPreferences: (updates: Partial<UIPreferences>) =>
    set((state) => ({
      uiPreferences: { ...state.uiPreferences, ...updates },
    })),

  // Offline queue state (Requirements 32, 33)
  offlineQueue: [],
  addToOfflineQueue: (item: OfflineQueueItem) =>
    set((state) => ({
      offlineQueue: [...state.offlineQueue, item],
    })),
  updateOfflineQueueItem: (id: string, updates: Partial<OfflineQueueItem>) =>
    set((state) => ({
      offlineQueue: state.offlineQueue.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),
  removeFromOfflineQueue: (id: string) =>
    set((state) => ({
      offlineQueue: state.offlineQueue.filter((item) => item.id !== id),
    })),
  clearOfflineQueue: () => set({ offlineQueue: [] }),

  // Performance metrics state (Requirements 34)
  performanceMetrics: {
    fps: 0,
    averageFps: 0,
    frameTime: 0,
    memoryUsage: null,
    drawCalls: 0,
    triangles: 0,
    brainApiLatency: [],
    ttsLatency: [],
  },
  updatePerformanceMetrics: (updates: Partial<PerformanceMetrics>) =>
    set((state) => ({
      performanceMetrics: { ...state.performanceMetrics, ...updates },
    })),

  // TTS error tracking state (Requirement 39)
  consecutiveTTSFailures: 0,
  ttsTextOnlyMode: false,
  incrementTTSFailures: () =>
    set((state) => {
      const newCount = state.consecutiveTTSFailures + 1;
      // Fall back to text-only mode after 3+ consecutive failures (Requirement 39.8)
      const shouldEnableTextOnly = newCount >= 3;
      return {
        consecutiveTTSFailures: newCount,
        ttsTextOnlyMode: shouldEnableTextOnly,
      };
    }),
  resetTTSFailures: () =>
    set({
      consecutiveTTSFailures: 0,
      ttsTextOnlyMode: false,
    }),
  setTTSTextOnlyMode: (enabled: boolean) =>
    set({ ttsTextOnlyMode: enabled }),
}));
