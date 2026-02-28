import { logger } from '../logger';
import type {
  AudioPreferences,
  AvatarCustomization,
  UIPreferences,
  OfflineQueueItem,
} from '@/types';

/**
 * Versioned schema for stored preferences
 * 
 * This allows for graceful schema migrations when the preference structure changes.
 * When adding new fields or changing structure, increment the version and add migration logic.
 */
const SCHEMA_VERSION = 1;

/**
 * All user preferences that can be persisted
 */
export interface UserPreferences {
  audioPreferences: AudioPreferences;
  avatarCustomization: AvatarCustomization;
  uiPreferences: UIPreferences;
  offlineQueue: OfflineQueueItem[];
}

/**
 * Versioned preference data structure stored in localStorage
 */
interface StoredPreferences {
  version: number;
  data: UserPreferences;
  timestamp: string;
}

/**
 * Result type for repository operations
 */
export type RepositoryResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * LocalStorageRepository
 * 
 * Handles persistence of user preferences to browser localStorage with:
 * - Versioned schema support for future migrations
 * - Validation and error handling for corrupted data
 * - Graceful fallback to defaults when data is missing
 * - Type-safe operations
 * - Structured logging
 * 
 * Requirements: 34, 43
 */
export class LocalStorageRepository {
  private readonly storageKey = 'avatar-client-preferences';
  private readonly archivedMessagesKey = 'avatar-client-archived-messages';

  /**
   * Default preferences used when no saved data exists or data is corrupted
   */
  private readonly defaultPreferences: UserPreferences = {
    audioPreferences: {
      volume: 100,
      isMuted: false,
      playbackSpeed: 1.0,
      speechRate: 1.0,
      speechPitch: 0,
      audioQuality: 'high',
    },
    avatarCustomization: {
      skinTone: '#f5d5c5',
      eyeColor: '#4a90e2',
      hairColor: '#3d2817',
      currentExpression: null,
    },
    uiPreferences: {
      theme: 'system',
      graphicsQuality: 'high',
      performanceMonitorVisible: false,
      performanceMonitorExpanded: false,
      highContrastMode: false,
      screenReaderOptimizations: false,
      enhancedFocusIndicators: true,
    },
    offlineQueue: [],
  };

  /**
   * Save user preferences to localStorage
   * 
   * @param preferences - The preferences to save
   * @returns Result indicating success or failure with error message
   */
  save(preferences: UserPreferences): RepositoryResult<void> {
    try {
      // Validate preferences before saving
      const validationError = this.validatePreferences(preferences);
      if (validationError) {
        logger.error('Preference validation failed', {
          component: 'LocalStorageRepository',
          operation: 'save',
          error: validationError,
        });
        return {
          success: false,
          error: validationError,
        };
      }

      // Create versioned storage structure
      const storedData: StoredPreferences = {
        version: SCHEMA_VERSION,
        data: preferences,
        timestamp: new Date().toISOString(),
      };

      // Serialize and save to localStorage
      const serialized = JSON.stringify(storedData);
      localStorage.setItem(this.storageKey, serialized);

      logger.info('Preferences saved successfully', {
        component: 'LocalStorageRepository',
        operation: 'save',
        version: SCHEMA_VERSION,
      });

      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during save';

      logger.error('Failed to save preferences', {
        component: 'LocalStorageRepository',
        operation: 'save',
        error: errorMessage,
      });

      return {
        success: false,
        error: `Failed to save preferences: ${errorMessage}`,
      };
    }
  }

  /**
   * Load user preferences from localStorage
   * 
   * @returns Result containing preferences or error message
   * Falls back to default preferences if data is missing or corrupted
   */
  load(): RepositoryResult<UserPreferences> {
    try {
      // Attempt to retrieve data from localStorage
      const stored = localStorage.getItem(this.storageKey);

      // Return defaults if no data exists
      if (!stored) {
        logger.info('No stored preferences found, using defaults', {
          component: 'LocalStorageRepository',
          operation: 'load',
        });
        return { success: true, data: this.defaultPreferences };
      }

      // Parse stored data
      const parsed = JSON.parse(stored) as StoredPreferences;

      // Validate schema version
      if (parsed.version !== SCHEMA_VERSION) {
        logger.warn('Schema version mismatch, migrating data', {
          component: 'LocalStorageRepository',
          operation: 'load',
          storedVersion: parsed.version,
          currentVersion: SCHEMA_VERSION,
        });

        // Migrate data to current schema version
        const migrated = this.migrateSchema(parsed);
        if (!migrated.success) {
          logger.error('Schema migration failed, using defaults', {
            component: 'LocalStorageRepository',
            operation: 'load',
            error: migrated.error,
          });
          return { success: true, data: this.defaultPreferences };
        }

        // Save migrated data
        this.save(migrated.data);
        return { success: true, data: migrated.data };
      }

      // Validate loaded data structure
      const validationError = this.validatePreferences(parsed.data);
      if (validationError) {
        logger.error('Loaded preferences are invalid, using defaults', {
          component: 'LocalStorageRepository',
          operation: 'load',
          error: validationError,
        });
        return { success: true, data: this.defaultPreferences };
      }

      logger.info('Preferences loaded successfully', {
        component: 'LocalStorageRepository',
        operation: 'load',
        version: parsed.version,
      });

      return { success: true, data: parsed.data };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during load';

      logger.error('Failed to load preferences, using defaults', {
        component: 'LocalStorageRepository',
        operation: 'load',
        error: errorMessage,
      });

      // Return defaults on any error (corrupted data, parse error, etc.)
      return { success: true, data: this.defaultPreferences };
    }
  }

  /**
   * Clear all stored preferences
   * 
   * @returns Result indicating success or failure
   */
  clear(): RepositoryResult<void> {
    try {
      localStorage.removeItem(this.storageKey);

      logger.info('Preferences cleared successfully', {
        component: 'LocalStorageRepository',
        operation: 'clear',
      });

      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during clear';

      logger.error('Failed to clear preferences', {
        component: 'LocalStorageRepository',
        operation: 'clear',
        error: errorMessage,
      });

      return {
        success: false,
        error: `Failed to clear preferences: ${errorMessage}`,
      };
    }
  }

  /**
   * Validate preference values are within acceptable ranges
   * 
   * @param preferences - The preferences to validate
   * @returns Error message if validation fails, null if valid
   */
  private validatePreferences(preferences: UserPreferences): string | null {
    try {
      // Validate audio preferences
      const audio = preferences.audioPreferences;
      if (audio.volume < 0 || audio.volume > 100) {
        return 'Volume must be between 0 and 100';
      }
      if (audio.playbackSpeed < 0.5 || audio.playbackSpeed > 2.0) {
        return 'Playback speed must be between 0.5 and 2.0';
      }
      if (audio.speechRate < 0.5 || audio.speechRate > 2.0) {
        return 'Speech rate must be between 0.5 and 2.0';
      }
      if (audio.speechPitch < -50 || audio.speechPitch > 50) {
        return 'Speech pitch must be between -50 and 50';
      }
      if (!['low', 'medium', 'high'].includes(audio.audioQuality)) {
        return 'Audio quality must be low, medium, or high';
      }

      // Validate avatar customization
      const avatar = preferences.avatarCustomization;
      if (!this.isValidHexColor(avatar.skinTone)) {
        return 'Skin tone must be a valid hex color';
      }
      if (!this.isValidHexColor(avatar.eyeColor)) {
        return 'Eye color must be a valid hex color';
      }
      if (!this.isValidHexColor(avatar.hairColor)) {
        return 'Hair color must be a valid hex color';
      }
      if (
        avatar.currentExpression !== null &&
        !['neutral', 'happy', 'sad', 'surprised', 'angry'].includes(
          avatar.currentExpression
        )
      ) {
        return 'Invalid expression value';
      }

      // Validate UI preferences
      const ui = preferences.uiPreferences;
      if (!['light', 'dark', 'system'].includes(ui.theme)) {
        return 'Theme must be light, dark, or system';
      }
      if (!['low', 'medium', 'high', 'ultra'].includes(ui.graphicsQuality)) {
        return 'Graphics quality must be low, medium, high, or ultra';
      }

      // Validate offline queue
      if (!Array.isArray(preferences.offlineQueue)) {
        return 'Offline queue must be an array';
      }
      if (preferences.offlineQueue.length > 50) {
        return 'Offline queue cannot exceed 50 items';
      }

      return null;
    } catch (error) {
      return 'Preference structure is invalid';
    }
  }

  /**
   * Validate hex color format
   * 
   * @param color - Color string to validate
   * @returns True if valid hex color
   */
  private isValidHexColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }

  /**
   * Migrate preferences from older schema versions to current version
   * 
   * @param stored - The stored preferences with old schema version
   * @returns Result containing migrated preferences or error
   */
  private migrateSchema(
    stored: StoredPreferences
  ): RepositoryResult<UserPreferences> {
    // Currently only version 1 exists, so no migrations needed yet
    // Future versions would add migration logic here
    // Example:
    // if (stored.version === 1) {
    //   // Migrate from v1 to v2
    //   return { success: true, data: migratedData };
    // }

    return {
      success: false,
      error: `Unsupported schema version: ${stored.version}`,
    };
  }

  /**
   * Archive messages to localStorage (Requirement 42.4)
   * Stores older messages when the in-memory limit is reached
   * 
   * @param messages - Array of messages to archive
   * @returns Result indicating success or failure
   */
  archiveMessages(messages: any[]): RepositoryResult<void> {
    try {
      const existingArchived = this.loadArchivedMessages();
      const allArchived = existingArchived.success ? [...existingArchived.data, ...messages] : messages;

      const archivedData = {
        version: SCHEMA_VERSION,
        messages: allArchived,
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem(this.archivedMessagesKey, JSON.stringify(archivedData));

      logger.info('Messages archived successfully', {
        component: 'LocalStorageRepository',
        operation: 'archiveMessages',
        count: messages.length,
        totalArchived: allArchived.length,
      });

      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during archiving';

      logger.error('Failed to archive messages', {
        component: 'LocalStorageRepository',
        operation: 'archiveMessages',
        error: errorMessage,
      });

      return {
        success: false,
        error: `Failed to archive messages: ${errorMessage}`,
      };
    }
  }

  /**
   * Load archived messages from localStorage (Requirement 42.4)
   * 
   * @returns Result containing archived messages or error
   */
  loadArchivedMessages(): RepositoryResult<any[]> {
    try {
      const stored = localStorage.getItem(this.archivedMessagesKey);

      if (!stored) {
        return { success: true, data: [] };
      }

      const parsed = JSON.parse(stored);

      if (!parsed.messages || !Array.isArray(parsed.messages)) {
        logger.warn('Invalid archived messages format, returning empty array');
        return { success: true, data: [] };
      }

      logger.info('Archived messages loaded successfully', {
        component: 'LocalStorageRepository',
        operation: 'loadArchivedMessages',
        count: parsed.messages.length,
      });

      return { success: true, data: parsed.messages };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during load';

      logger.error('Failed to load archived messages', {
        component: 'LocalStorageRepository',
        operation: 'loadArchivedMessages',
        error: errorMessage,
      });

      return {
        success: false,
        error: `Failed to load archived messages: ${errorMessage}`,
      };
    }
  }

  /**
   * Clear all data including preferences and archived messages (Requirement 42.6)
   * 
   * @returns Result indicating success or failure
   */
  clearAllData(): RepositoryResult<void> {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.archivedMessagesKey);

      logger.info('All data cleared successfully', {
        component: 'LocalStorageRepository',
        operation: 'clearAllData',
      });

      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during clear';

      logger.error('Failed to clear all data', {
        component: 'LocalStorageRepository',
        operation: 'clearAllData',
        error: errorMessage,
      });

      return {
        success: false,
        error: `Failed to clear all data: ${errorMessage}`,
      };
    }
  }
}
