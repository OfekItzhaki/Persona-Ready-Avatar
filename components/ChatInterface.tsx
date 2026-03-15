/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
'use client';

import { useState, useRef, useEffect } from 'react';
import { useSendMessage } from '@/lib/hooks/useReactQuery';
import { useAppStore } from '@/lib/store/useAppStore';
import { NotificationService } from '@/lib/services/NotificationService';
import { ExportImportService, type ExportFormat } from '@/lib/services/ExportImportService';
import { OfflineQueueService } from '@/lib/services/OfflineQueueService';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { VoiceInputButton } from './VoiceInputButton';
import { InterimResultDisplay } from './InterimResultDisplay';
import { AudioLevelIndicator } from './AudioLevelIndicator';
import { InputModeToggle } from './InputModeToggle';
import { VoiceInputService } from '@/lib/services/VoiceInputService';
import { InputModeController } from '@/lib/services/InputModeController';
import { checkBrowserCompatibility } from '@/lib/utils/browserCompatibility';
import type { Agent } from '@/types';
import type { InputMode, RecognitionMode } from '@/types';

/**
 * ChatInterface Component
 *
 * Provides conversation history and message input for user-agent interactions.
 *
 * Features:
 * - MessageList component for displaying conversation history (Requirement 1)
 * - InputArea component for message input and submission (Requirement 2)
 * - Message submission to Brain API (Requirement 5.3)
 * - Optimistic UI updates (Requirement 11.3)
 * - Message editing with "edited" indicator (Requirement 11)
 * - Message deletion with confirmation (Requirement 12)
 * - Message reactions (thumbs up/down) on agent messages (Requirement 18)
 * - Conversation export to JSON or plain text (Requirement 13)
 * - Conversation import with replace/append options (Requirement 14)
 * - Offline message queuing with automatic processing (Requirement 33)
 * - Error handling with notifications (Requirement 5.8)
 * - ARIA labels for accessibility (Requirement 13.2)
 *
 * Requirements: 1, 2, 5.3, 5.8, 11, 12, 13, 14, 13.2, 18, 33
 */

interface ChatInterfaceProps {
  ttsService?: {
    synthesizeSpeech: (text: string, voice: string, language: string) => Promise<any>;
  };
  selectedAgent?: Agent;
  className?: string;
}

export function ChatInterface({ ttsService, selectedAgent, className = '' }: ChatInterfaceProps) {
  // Get messages and update function from Zustand store
  const messages = useAppStore((state) => state.messages);
  const addMessage = useAppStore((state) => state.addMessage);
  const updateMessage = useAppStore((state) => state.updateMessage);
  const deleteMessage = useAppStore((state) => state.deleteMessage);
  const clearMessages = useAppStore((state) => state.clearMessages);
  const offlineQueue = useAppStore((state) => state.offlineQueue);

  // Get online status
  const isOnline = useOnlineStatus();

  // Local state for export/import UI
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');
  const [showQueueWarning, setShowQueueWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice input state
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [recognitionMode, setRecognitionMode] = useState<RecognitionMode>('push-to-talk');
  const [isBrowserCompatible, setIsBrowserCompatible] = useState(true);
  const [compatibilityMessage, setCompatibilityMessage] = useState('');
  const [voiceInputState, setVoiceInputState] = useState<
    'idle' | 'recording' | 'processing' | 'error'
  >('idle');

  // Voice input service refs
  const voiceInputServiceRef = useRef<VoiceInputService | null>(null);
  const inputModeControllerRef = useRef<InputModeController | null>(null);

  // Screen reader announcement state (Requirement 10.2, 10.3, 10.5)
  const [screenReaderAnnouncement, setScreenReaderAnnouncement] = useState('');

  // Use mutation hook for message submission
  const { mutate: sendMessage, isPending } = useSendMessage();

  /**
   * Initialize OfflineQueueService and set up message sending callback
   */
  useEffect(() => {
    try {
      const queueService = OfflineQueueService.getInstance();

      // Set up callback for sending messages from queue
      queueService.setSendMessageCallback(async (agentId: string, message: string) => {
        return new Promise((resolve) => {
          sendMessage(
            {
              agentId,
              message,
              ttsService,
              selectedAgent,
            },
            {
              onSuccess: () => {
                resolve(true);
              },
              onError: () => {
                resolve(false);
              },
            }
          );
        });
      });
    } catch {
      // OfflineQueueService not initialized yet - will be initialized in app setup
      console.warn('OfflineQueueService not initialized yet');
    }
  }, [sendMessage, ttsService, selectedAgent]);

  /**
   * Initialize voice input services (Requirement 7.5)
   * - Check browser compatibility first (Requirement 11.3)
   * - Initialize InputModeController and restore saved preference
   * - Initialize VoiceInputService with Azure Speech credentials
   */
  useEffect(() => {
    try {
      // Check browser compatibility before initializing (Requirement 11.3)
      const compatibilityResult = checkBrowserCompatibility();
      setIsBrowserCompatible(compatibilityResult.isCompatible);
      setCompatibilityMessage(compatibilityResult.message);

      if (!compatibilityResult.isCompatible) {
        // Browser not compatible - disable voice input (Requirement 11.2)
        console.warn('Browser compatibility check failed:', compatibilityResult.checks);
        NotificationService.getInstance().warning(
          'Voice input is not available in this browser. Please use Chrome 90+, Edge 90+, or Safari 14+.'
        );
        // Force text mode if browser is incompatible
        setInputMode('text');
        return;
      }

      // Initialize InputModeController
      const modeController = new InputModeController();
      inputModeControllerRef.current = modeController;

      // Restore saved input mode preference
      const savedMode = modeController.loadPreference();
      setInputMode(savedMode);

      // Subscribe to mode changes
      const unsubscribe = modeController.subscribeToModeChanges((mode) => {
        setInputMode(mode);
      });

      // Initialize VoiceInputService
      const voiceService = VoiceInputService.getInstance();
      voiceInputServiceRef.current = voiceService;

      // Subscribe to recognition results
      const unsubscribeResults = voiceService.subscribeToResults((result) => {
        if (result.type === 'interim') {
          setInterimText(result.text);
          setVoiceInputState('recording');
        } else if (result.type === 'final') {
          // Set processing state while finalizing (Requirement 15.3)
          setVoiceInputState('processing');
          setInterimText('');

          // Submit recognized text to chat
          handleSubmit(result.text);

          // Reset to idle after a brief delay
          setTimeout(() => {
            setVoiceInputState('idle');
          }, 500);
        }
      });

      // Subscribe to recognition state changes
      const unsubscribeState = voiceService.subscribeToRecognitionState((recognizing) => {
        setIsRecognizing(recognizing);
        if (!recognizing) {
          setInterimText('');
          setAudioLevel(0);
          // Reset to idle when not recognizing (unless in error state)
          setVoiceInputState((current) => (current === 'error' ? 'error' : 'idle'));
        } else {
          // Set to recording when recognition starts
          setVoiceInputState('recording');
        }

        // Announce session start/stop to screen readers (Requirement 10.2, 10.3)
        if (recognizing) {
          setScreenReaderAnnouncement('Recording started');
        } else {
          setScreenReaderAnnouncement('Recording stopped');
        }
      });

      // Subscribe to audio level updates
      const unsubscribeAudioLevel = voiceService.subscribeToAudioLevels((level) => {
        setAudioLevel(level);
      });

      // Subscribe to recognition errors (Requirement 6.1, 6.2, 6.3, 6.4, 6.5, 13.5)
      const unsubscribeErrors = voiceService.subscribeToErrors((error) => {
        // Set error state for visual feedback (Requirement 15.4)
        setVoiceInputState('error');

        // Reset error state after 3 seconds
        setTimeout(() => {
          setVoiceInputState('idle');
        }, 3000);

        // Announce error to screen readers (Requirement 10.5)
        let announcement = '';

        // Display appropriate notification based on error type
        switch (error.type) {
          case 'PERMISSION_DENIED':
            // Requirement 6.1: Permission denied with recovery instructions
            announcement =
              'Error: Microphone access denied. Please grant permission in your browser settings to use voice input.';
            NotificationService.getInstance().error(
              'Microphone access denied. Please grant permission in your browser settings to use voice input.',
              undefined, // No auto-dismiss
              {
                label: 'Switch to Text',
                onClick: () => {
                  handleModeChange('text');
                },
              }
            );
            break;

          case 'MICROPHONE_UNAVAILABLE':
            // Requirement 6.1: Microphone unavailable with retry option
            announcement =
              'Error: No microphone detected. Please connect a microphone and try again.';
            NotificationService.getInstance().error(
              'No microphone detected. Please connect a microphone and try again.',
              undefined,
              {
                label: 'Retry',
                onClick: () => {
                  handleVoicePress();
                },
              }
            );
            break;

          case 'NETWORK_ERROR':
            // Requirement 6.2: Network error with retry option
            announcement =
              'Error: Network connection lost. Please check your internet connection and try again.';
            NotificationService.getInstance().error(
              'Network connection lost. Please check your internet connection and try again.',
              undefined,
              {
                label: 'Retry',
                onClick: () => {
                  handleVoicePress();
                },
              }
            );
            break;

          case 'AUTHENTICATION_ERROR':
            // Requirement 6.3: Authentication error with fallback
            announcement = 'Error: Voice input configuration error. Please contact support.';
            NotificationService.getInstance().error(
              'Voice input configuration error. Please contact support.',
              undefined,
              {
                label: 'Switch to Text',
                onClick: () => {
                  handleModeChange('text');
                },
              }
            );
            break;

          case 'SYNTHESIS_FAILED':
            // Requirement 6.4: Recognition failure with retry and fallback
            announcement =
              'Error: Speech recognition failed. Please try again or switch to text input.';
            NotificationService.getInstance().error(
              'Speech recognition failed. Please try again or switch to text input.',
              undefined,
              {
                label: 'Retry',
                onClick: () => {
                  handleVoicePress();
                },
              }
            );
            break;

          case 'TIMEOUT':
            // Requirement 13.5: Session timeout notification
            announcement =
              'Voice input session timed out after 60 seconds. Click to start a new session.';
            NotificationService.getInstance().info(
              'Voice input session timed out after 60 seconds. Click to start a new session.',
              5000
            );
            break;

          default:
            // Generic error with fallback option (should never reach here due to exhaustive switch)
            announcement = `Error: ${(error as { message?: string }).message || 'An error occurred with voice input'}`;
            NotificationService.getInstance().error(
              (error as { message?: string }).message || 'An error occurred with voice input',
              undefined,
              {
                label: 'Switch to Text',
                onClick: () => {
                  handleModeChange('text');
                },
              }
            );
        }

        // Set screen reader announcement (Requirement 10.5)
        setScreenReaderAnnouncement(announcement);
      });

      // Cleanup on unmount
      return () => {
        unsubscribe();
        unsubscribeResults();
        unsubscribeState();
        unsubscribeAudioLevel();
        unsubscribeErrors();

        // Stop any active recognition session (Requirement 13.3)
        if (voiceService.isRecognizing()) {
          voiceService.stopRecognition().catch((err) => {
            console.error('Error stopping recognition on unmount:', err);
          });
        }
      };
    } catch (err) {
      console.error('Error initializing voice input services:', err);
      NotificationService.getInstance().error(
        'Failed to initialize voice input. Voice input features will be unavailable.'
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Process offline queue when connectivity is restored
   */
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      const queueService = OfflineQueueService.getInstance();
      const pendingCount = queueService.getPendingCount();

      if (pendingCount > 0) {
        NotificationService.getInstance().info(
          `Processing ${pendingCount} queued message${pendingCount > 1 ? 's' : ''}...`
        );

        queueService.processQueue().then((successCount) => {
          const failedCount = queueService.getFailedCount();

          if (successCount > 0) {
            NotificationService.getInstance().success(
              `Sent ${successCount} queued message${successCount > 1 ? 's' : ''}`
            );
          }

          if (failedCount > 0) {
            NotificationService.getInstance().error(
              `${failedCount} message${failedCount > 1 ? 's' : ''} failed to send. Click retry to try again.`
            );
          }
        });
      }
    }
  }, [isOnline, offlineQueue.length]);

  /**
   * Sync queue item status with message display (Requirement 33.2)
   * Updates message queueStatus based on offline queue item status
   */
  useEffect(() => {
    offlineQueue.forEach((queueItem) => {
      // Find corresponding message
      const message = messages.find((m) => m.id === queueItem.id);

      if (message && message.queueStatus !== queueItem.status) {
        // Update message status to match queue item
        updateMessage(queueItem.id, {
          queueStatus: queueItem.status,
        });
      }
    });
  }, [offlineQueue, messages, updateMessage]);

  /**
   * Show warning when queue approaches limit
   */
  useEffect(() => {
    const queueSize = offlineQueue.length;
    const MAX_QUEUE_SIZE = 50;

    if (queueSize >= MAX_QUEUE_SIZE * 0.9 && !isOnline) {
      setShowQueueWarning(true);
    } else {
      setShowQueueWarning(false);
    }
  }, [offlineQueue.length, isOnline]);

  /**
   * Handle message submission from InputArea
   * - Validates agent selection
   * - Enqueues message when offline (Requirement 33.1)
   * - Sends message via mutation hook when online
   * - Handles errors with notifications and retry button (Requirement 38)
   */
  const handleSubmit = (message: string) => {
    // Validate agent selection
    if (!selectedAgent) {
      NotificationService.getInstance().error('Please select an agent before sending a message');
      return;
    }

    // If offline, enqueue the message (Requirement 33.1)
    if (!isOnline) {
      try {
        const queueService = OfflineQueueService.getInstance();
        const itemId = queueService.enqueue(selectedAgent.id, message);

        if (itemId) {
          // Add message to display with pending status (Requirement 33.2)
          const queuedMessage = {
            id: itemId,
            role: 'user' as const,
            content: message,
            timestamp: new Date(),
            queueStatus: 'pending' as const,
          };
          addMessage(queuedMessage);

          NotificationService.getInstance().info(
            'Message queued. It will be sent when connection is restored.'
          );
        } else {
          // Queue is full (Requirement 33.5)
          NotificationService.getInstance().error(
            'Message queue is full (50 messages). Please wait for connection to be restored.'
          );
        }
      } catch {
        NotificationService.getInstance().error('Failed to queue message. Please try again.');
      }
      return;
    }

    // Send message with optimistic update (Requirement 11.3)
    sendMessage(
      {
        agentId: selectedAgent.id,
        message, // Message is already sanitized by InputArea
        ttsService,
        selectedAgent,
      },
      {
        onError: (error) => {
          // Log detailed error information to console (Requirement 38.8)
          console.error('Message send failed:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            apiError: (error as any).apiError,
            timestamp: new Date().toISOString(),
            agentId: selectedAgent.id,
            messageLength: message.length,
          });

          // Display error notification with retry button (Requirement 38.1, 38.2, 38.3, 38.7)
          NotificationService.getInstance().error(
            error instanceof Error ? error.message : 'Failed to send message',
            undefined, // No auto-dismiss for errors with retry
            {
              label: 'Retry',
              onClick: () => {
                // Retry the same message (Requirement 38.4)
                handleSubmit(message);
              },
            }
          );
        },
      }
    );
  };

  /**
   * Handle input mode change (Requirement 7.6)
   * - Stop active recognition session when switching to text mode
   * - Update mode in InputModeController
   */
  const handleModeChange = async (mode: InputMode) => {
    try {
      // Stop active recognition session when switching to text mode (Requirement 7.6)
      if (mode === 'text' && voiceInputServiceRef.current?.isRecognizing()) {
        await voiceInputServiceRef.current.stopRecognition();
      }

      // Update mode in controller (will trigger subscription callback)
      inputModeControllerRef.current?.setMode(mode);
    } catch (error) {
      console.error('Error changing input mode:', error);
      NotificationService.getInstance().error('Failed to switch input mode');
    }
  };

  /**
   * Handle voice input button press (push-to-talk mode)
   * - Start recognition session
   */
  const handleVoicePress = async () => {
    if (!selectedAgent) {
      NotificationService.getInstance().error('Please select an agent before using voice input');
      return;
    }

    try {
      if (recognitionMode === 'push-to-talk') {
        // Push-to-talk: start recognition on press
        await voiceInputServiceRef.current?.startRecognition('push-to-talk');
      } else {
        // Continuous: toggle recognition on press
        if (isRecognizing) {
          await voiceInputServiceRef.current?.stopRecognition();
        } else {
          await voiceInputServiceRef.current?.startRecognition('continuous');
        }
      }
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      NotificationService.getInstance().error(
        error instanceof Error ? error.message : 'Failed to start voice input'
      );
    }
  };

  /**
   * Handle voice input button release (push-to-talk mode)
   * - Stop recognition session and finalize transcription
   */
  const handleVoiceRelease = async () => {
    try {
      if (recognitionMode === 'push-to-talk') {
        // Only stop on release in push-to-talk mode
        await voiceInputServiceRef.current?.stopRecognition();
      }
      // In continuous mode, release does nothing (toggle happens on press)
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
      NotificationService.getInstance().error('Failed to stop voice input');
    }
  };

  /**
   * Handle message editing from MessageList (Requirement 11.3, 11.4)
   * - Updates message content in store
   * - Adds "edited" indicator and timestamp
   */
  const handleEditMessage = (messageId: string, newContent: string) => {
    updateMessage(messageId, {
      content: newContent,
      edited: true,
      editedAt: new Date(),
    });
  };

  /**
   * Handle message deletion from MessageList (Requirement 12.3, 12.7)
   * - Removes message from store
   * - Maintains chronological order of remaining messages
   */
  const handleDeleteMessage = (messageId: string) => {
    deleteMessage(messageId);
  };

  /**
   * Handle message reaction from MessageList (Requirement 18.2, 18.3, 18.4, 18.5, 18.8)
   * - Records reaction with message in store
   * - Allows changing or removing reactions
   * - Reactions stored in conversation history for export
   */
  const handleReactToMessage = (
    messageId: string,
    reaction: 'thumbs_up' | 'thumbs_down' | null
  ) => {
    updateMessage(messageId, {
      reaction: reaction || undefined,
    });
  };

  /**
   * Handle retry of failed queued messages (Requirement 33.4)
   * - Resets failed messages to pending status
   * - Attempts to process queue again
   */
  const handleRetryFailedMessages = () => {
    try {
      const queueService = OfflineQueueService.getInstance();

      // Get failed messages from store
      const failedMessages = offlineQueue.filter((item) => item.status === 'failed');

      if (failedMessages.length > 0) {
        // Reset each failed message to pending in the store
        failedMessages.forEach((item) => {
          useAppStore.getState().updateOfflineQueueItem(item.id, {
            status: 'pending',
          });
        });

        NotificationService.getInstance().info(
          `Retrying ${failedMessages.length} failed message${failedMessages.length > 1 ? 's' : ''}...`
        );

        if (isOnline) {
          queueService.processQueue().then((successCount) => {
            if (successCount > 0) {
              NotificationService.getInstance().success(
                `Sent ${successCount} message${successCount > 1 ? 's' : ''}`
              );
            }
          });
        }
      } else {
        NotificationService.getInstance().info('No failed messages to retry');
      }
    } catch (err) {
      console.error(
        'Failed to retry messages:',
        err instanceof Error ? err.message : 'Unknown error'
      );
      NotificationService.getInstance().error('Failed to retry messages');
    }
  };

  /**
   * Handle conversation export (Requirement 13)
   * - Exports conversation to JSON or plain text format
   * - Generates filename with timestamp
   * - Downloads file to user's device
   */
  const handleExport = (format: ExportFormat) => {
    try {
      ExportImportService.downloadConversation(messages, format);
      NotificationService.getInstance().success(`Conversation exported as ${format.toUpperCase()}`);
      setShowExportMenu(false);
    } catch (error) {
      NotificationService.getInstance().error(
        error instanceof Error ? error.message : 'Failed to export conversation'
      );
    }
  };

  /**
   * Handle file selection for import (Requirement 14)
   * - Opens file picker
   * - Shows import mode dialog if conversation exists
   */
  const handleImportClick = () => {
    if (messages.length > 0) {
      setShowImportDialog(true);
    } else {
      // No existing messages, directly open file picker
      fileInputRef.current?.click();
    }
  };

  /**
   * Handle import mode selection (Requirement 14.7)
   * - User chooses to replace or append to existing conversation
   */
  const handleImportModeSelect = (mode: 'replace' | 'append') => {
    setImportMode(mode);
    setShowImportDialog(false);
    fileInputRef.current?.click();
  };

  /**
   * Handle file import (Requirement 14)
   * - Validates and imports conversation file
   * - Supports both JSON and plain text formats
   * - Replaces or appends based on user selection
   */
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await ExportImportService.importFromFile(file);

      if (!result.success) {
        NotificationService.getInstance().error(result.error || 'Failed to import conversation');
        return;
      }

      if (importMode === 'replace') {
        clearMessages();
      }

      result.messages?.forEach((message) => {
        addMessage(message);
      });

      NotificationService.getInstance().success(
        `Conversation imported successfully (${result.messages?.length} messages)`
      );
    } catch (error) {
      NotificationService.getInstance().error(
        error instanceof Error ? error.message : 'Failed to import conversation'
      );
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Screen Reader Announcements (Requirement 10.2, 10.3, 10.5) */}
      <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">
        {screenReaderAnnouncement}
      </div>

      {/* Queue Warning Banner (Requirement 33.5) */}
      {showQueueWarning && (
        <div
          role="alert"
          aria-live="polite"
          className="border-b px-4 py-2"
          style={{background:'rgba(251,146,60,0.1)',borderColor:'rgba(251,146,60,0.2)'}}
        >
          <p className="text-xs" style={{color:'#fdba74'}}>
            <span className="font-semibold">Warning:</span> Message queue is nearly full (
            {offlineQueue.length}/50). Messages will be sent when connection is restored.
          </p>
        </div>
      )}

      {/* Failed Messages Retry Banner (Requirement 33.4) */}
      {offlineQueue.some((item) => item.status === 'failed') && (
        <div
          role="alert"
          aria-live="polite"
          className="border-b px-4 py-2 flex items-center justify-between"
          style={{background:'rgba(239,68,68,0.1)',borderColor:'rgba(239,68,68,0.2)'}}
        >
          <p className="text-xs" style={{color:'#fca5a5'}}>
            <span className="font-semibold">Error:</span> Some messages failed to send.
          </p>
          <button
            onClick={handleRetryFailedMessages}
            className="px-2 py-1 text-xs font-medium text-white rounded focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{background:'rgba(239,68,68,0.6)'}}
            aria-label="Retry failed messages"
          >
            Retry
          </button>
        </div>
      )}

      {/* Export/Import Controls (Requirements 13, 14) */}
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{background:'var(--bg-secondary)',borderColor:'var(--border)'}}>
        {/* Export Button with Format Selection */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={messages.length === 0}
            className="px-3 py-1.5 text-xs font-medium rounded-md disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            style={{background:'rgba(255,255,255,0.06)',border:'1px solid var(--border)',color:'var(--text-primary)'}}
            aria-label="Export conversation"
            aria-expanded={showExportMenu}
            aria-haspopup="menu"
          >
            ↓ Export
          </button>

          {/* Export Format Menu */}
          {showExportMenu && (
            <div className="absolute top-full left-0 mt-1 w-36 rounded-lg shadow-xl z-10 overflow-hidden" style={{background:'var(--bg-card-hover)',border:'1px solid var(--border)'}}>
              <button
                onClick={() => handleExport('json')}
                className="w-full px-3 py-2 text-left text-xs focus:outline-none transition-colors"
                style={{color:'var(--text-primary)'}}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.06)')}
                onMouseLeave={e=>(e.currentTarget.style.background='')}
                role="menuitem"
              >
                JSON
              </button>
              <button
                onClick={() => handleExport('text')}
                className="w-full px-3 py-2 text-left text-xs focus:outline-none transition-colors"
                style={{color:'var(--text-primary)'}}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.06)')}
                onMouseLeave={e=>(e.currentTarget.style.background='')}
                role="menuitem"
              >
                Plain Text
              </button>
            </div>
          )}
        </div>

        {/* Import Button */}
        <button
          onClick={handleImportClick}
          className="px-3 py-1.5 text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          style={{background:'rgba(255,255,255,0.06)',border:'1px solid var(--border)',color:'var(--text-primary)'}}
          aria-label="Import conversation"
        >
          ↑ Import
        </button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.txt"
          onChange={handleFileImport}
          className="hidden"
          aria-label="Select conversation file to import"
        />
      </div>

      {/* Import Mode Dialog (Requirement 14.7) */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" style={{background:'var(--bg-card)',border:'1px solid var(--border)'}}>
            <h3 className="text-lg font-semibold mb-4" style={{color:'var(--text-primary)'}}>
              Import Conversation
            </h3>
            <p className="text-sm mb-6" style={{color:'var(--text-secondary)'}}>
              You have an existing conversation. How would you like to import?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleImportModeSelect('append')}
                className="px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{background:'var(--accent)'}}
              >
                Append to Current Conversation
              </button>
              <button
                onClick={() => handleImportModeSelect('replace')}
                className="px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{background:'rgba(255,255,255,0.05)',border:'1px solid var(--border)',color:'var(--text-secondary)'}}
              >
                Replace Current Conversation
              </button>
              <button
                onClick={() => setShowImportDialog(false)}
                className="px-4 py-2 text-sm font-medium focus:outline-none"
                style={{color:'var(--text-muted)'}}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Conversation History - Using MessageList component (Requirement 1, 11, 12, 16, 18) */}
      <MessageList
        messages={messages}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onReactToMessage={handleReactToMessage}
        isLoading={isPending}
        isPending={isPending}
        showTypingIndicator={isPending}
      />

      {/* Input Mode Toggle (Requirement 7.1) */}
      <div className="border-t px-3 py-2" style={{background:'var(--bg-secondary)',borderColor:'var(--border)'}}>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{color:'var(--text-muted)'}}>Mode:</span>
          <InputModeToggle
            currentMode={inputMode}
            onModeChange={handleModeChange}
            disabled={isPending || !isBrowserCompatible}
          />
        </div>
      </div>

      {/* Browser Compatibility Warning (Requirement 11.2, 11.4) */}
      {!isBrowserCompatible && (
        <div
          role="alert"
          aria-live="polite"
          className="border-t p-4"
          style={{background:'rgba(234,179,8,0.08)',borderColor:'rgba(234,179,8,0.2)'}}
        >
          <div className="flex items-start gap-3">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true" style={{color:'#fbbf24'}}>
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-xs font-semibold mb-1" style={{color:'#fde68a'}}>Voice Input Not Available</p>
              <p className="text-xs" style={{color:'#fcd34d'}}>{compatibilityMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Voice Input Controls - Shown when voice mode is active (Requirement 7.2) */}
      {inputMode === 'voice' && isBrowserCompatible && (
        <div className="border-t p-6 space-y-4" style={{background:'var(--bg-card)',borderColor:'var(--border)'}}>
          {/* Interim Results Display (Requirement 5.1, 15.3) */}
          <InterimResultDisplay
            text={interimText}
            visible={isRecognizing || voiceInputState === 'processing'}
            isProcessing={voiceInputState === 'processing'}
          />

          {/* Voice Input Controls Row */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Voice Input Button (Requirement 3.1, 4.1, 15.1, 15.2, 15.3, 15.4) */}
            <VoiceInputButton
              mode={recognitionMode}
              isRecognizing={isRecognizing}
              state={voiceInputState}
              onPress={handleVoicePress}
              onRelease={handleVoiceRelease}
              disabled={isPending || !selectedAgent}
            />

            {/* Audio Level Indicator (Requirement 5.5) */}
            <div className="flex-1 min-w-[200px]">
              <AudioLevelIndicator level={audioLevel} isActive={isRecognizing} />
            </div>

            {/* Recognition Mode Toggle */}
            <div className="flex items-center gap-3">
              <label
                htmlFor="recognition-mode"
                className="text-sm font-medium"
                style={{color:'var(--text-secondary)'}}
              >
                Mode:
              </label>
              <select
                id="recognition-mode"
                value={recognitionMode}
                onChange={(e) => setRecognitionMode(e.target.value as RecognitionMode)}
                disabled={isRecognizing}
                className="px-3 py-2 text-sm border rounded-lg disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{background:'rgba(255,255,255,0.05)',border:'1px solid var(--border)',color:'var(--text-primary)'}}
              >
                <option value="push-to-talk">🎤 Push-to-Talk</option>
                <option value="continuous">🔄 Continuous</option>
              </select>
            </div>
          </div>

          {/* Voice Input Instructions */}
          <div className="text-sm p-3 rounded-lg" style={{color:'var(--text-muted)',background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.15)'}}>
            {recognitionMode === 'push-to-talk' ? (
              <p>
                💡 <strong>Tip:</strong> Hold the button to speak, release to send your message.
              </p>
            ) : (
              <p>
                💡 <strong>Tip:</strong> Click to start listening. Click again to stop.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Text Input - Shown when text mode is active (Requirement 7.3) */}
      {inputMode === 'text' && (
        <InputArea
          onSubmit={handleSubmit}
          disabled={isPending || !selectedAgent}
          placeholder={selectedAgent ? 'Type your message...' : 'Select an agent to start chatting'}
        />
      )}
    </div>
  );
}
