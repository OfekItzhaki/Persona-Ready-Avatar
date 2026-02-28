import { logger } from '../logger';
import { LocalStorageRepository, UserPreferences } from '../repositories/LocalStorageRepository';
import type {
  AudioPreferences,
  AvatarCustomization,
  UIPreferences,
  OfflineQueueItem,
  AvatarPreferences,
} from '@/types';

/**
 * Store interface for preferences management
 * This allows the PreferencesService to work with any store implementation
 * (Zustand, Redux, etc.) as long as it provides these methods
 */
export interface IPreferencesStore {
  audioPreferences: AudioPreferences;
  updateAudioPreferences: (updates: Partial<AudioPreferences>) => void;
  
  avatarCustomization: AvatarCustomization;
  updateAvatarCustomization: (updates: Partial<AvatarCustomization>) => void;
  
  uiPreferences: UIPreferences;
  updateUIPreferences: (updates: Partial<UIPreferences>) => void;
  
  offlineQueue: OfflineQueueItem[];
  addToOfflineQueue: (item: OfflineQueueItem) => void;
  updateOfflineQueueItem: (id: string, updates: Partial<OfflineQueueItem>) => void;
  removeFromOfflineQueue: (id: string) => void;
  clearOfflineQueue: () => void;
}

/**
 * PreferencesService
 * 
 * Coordinates between Zustand store and LocalStorageRepository to manage user preferences.
 * Provides methods for loading, saving, and resetting preferences with validation.
 * 
 * Features:
 * - Loads preferences from localStorage on initialization
 * - Saves preferences to localStorage with validation
 * - Resets preferences to defaults
 * - Validates preference values before applying
 * - Provides type-safe operations
 * - Structured logging for debugging
 * 
 * Requirements: 24, 34
 */
export class PreferencesService {
  private static instance: PreferencesService | null = null;
  private store: IPreferencesStore;
  private repository: LocalStorageRepository;

  private constructor(store: IPreferencesStore, repository: LocalStorageRepository) {
    this.store = store;
    this.repository = repository;
  }

  /**
   * Get the singleton instance of PreferencesService
   * Must call initialize() first
   */
  static getInstance(): PreferencesService {
    if (!PreferencesService.instance) {
      throw new Error('PreferencesService not initialized. Call initialize() first.');
    }
    return PreferencesService.instance;
  }

  /**
   * Initialize the PreferencesService with a store and repository
   * Should be called once at application startup
   * 
   * @param store - The preferences store (typically Zustand store)
   * @param repository - The localStorage repository (optional, creates new instance if not provided)
   * @returns The initialized PreferencesService instance
   */
  static initialize(
    store: IPreferencesStore,
    repository?: LocalStorageRepository
  ): PreferencesService {
    if (!PreferencesService.instance) {
      const repo = repository || new LocalStorageRepository();
      PreferencesService.instance = new PreferencesService(store, repo);
      
      // Automatically load preferences on initialization
      PreferencesService.instance.loadPreferences();
    }
    return PreferencesService.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static reset(): void {
    PreferencesService.instance = null;
  }

  /**
   * Load preferences from localStorage and apply to store
   * 
   * This method is called automatically during initialization.
   * It can also be called manually to reload preferences.
   * 
   * @returns True if preferences were loaded successfully, false otherwise
   */
  loadPreferences(): boolean {
    try {
      logger.info('Loading preferences from localStorage', {
        component: 'PreferencesService',
        operation: 'loadPreferences',
      });

      const result = this.repository.load();

      if (!result.success) {
        logger.error('Failed to load preferences from repository', {
          component: 'PreferencesService',
          operation: 'loadPreferences',
          error: result.error,
        });
        return false;
      }

      const preferences = result.data;

      // Validate preferences before applying
      const validationError = this.validatePreferences(preferences);
      if (validationError) {
        logger.error('Loaded preferences failed validation', {
          component: 'PreferencesService',
          operation: 'loadPreferences',
          error: validationError,
        });
        return false;
      }

      // Apply preferences to store
      this.store.updateAudioPreferences(preferences.audioPreferences);
      this.store.updateAvatarCustomization(preferences.avatarCustomization);
      this.store.updateUIPreferences(preferences.uiPreferences);

      // Restore offline queue
      this.store.clearOfflineQueue();
      preferences.offlineQueue.forEach((item) => {
        this.store.addToOfflineQueue(item);
      });

      logger.info('Preferences loaded and applied successfully', {
        component: 'PreferencesService',
        operation: 'loadPreferences',
      });

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during load';

      logger.error('Failed to load preferences', {
        component: 'PreferencesService',
        operation: 'loadPreferences',
        error: errorMessage,
      });

      return false;
    }
  }

  /**
   * Save current preferences from store to localStorage
   * 
   * @returns True if preferences were saved successfully, false otherwise
   */
  savePreferences(): boolean {
    try {
      logger.info('Saving preferences to localStorage', {
        component: 'PreferencesService',
        operation: 'savePreferences',
      });

      // Gather current preferences from store
      const preferences: UserPreferences = {
        audioPreferences: this.store.audioPreferences,
        avatarCustomization: this.store.avatarCustomization,
        uiPreferences: this.store.uiPreferences,
        offlineQueue: this.store.offlineQueue,
      };

      // Validate preferences before saving
      const validationError = this.validatePreferences(preferences);
      if (validationError) {
        logger.error('Preferences validation failed before save', {
          component: 'PreferencesService',
          operation: 'savePreferences',
          error: validationError,
        });
        return false;
      }

      // Save to repository
      const result = this.repository.save(preferences);

      if (!result.success) {
        logger.error('Failed to save preferences to repository', {
          component: 'PreferencesService',
          operation: 'savePreferences',
          error: result.error,
        });
        return false;
      }

      logger.info('Preferences saved successfully', {
        component: 'PreferencesService',
        operation: 'savePreferences',
      });

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during save';

      logger.error('Failed to save preferences', {
        component: 'PreferencesService',
        operation: 'savePreferences',
        error: errorMessage,
      });

      return false;
    }
  }

  /**
   * Reset all preferences to defaults
   * 
   * This clears localStorage and resets the store to default values.
   * 
   * @returns True if preferences were reset successfully, false otherwise
   */
  resetPreferences(): boolean {
    try {
      logger.info('Resetting preferences to defaults', {
        component: 'PreferencesService',
        operation: 'resetPreferences',
      });

      // Clear localStorage
      const clearResult = this.repository.clear();
      if (!clearResult.success) {
        logger.error('Failed to clear preferences from repository', {
          component: 'PreferencesService',
          operation: 'resetPreferences',
          error: clearResult.error,
        });
        return false;
      }

      // Load defaults (repository.load() returns defaults when no data exists)
      const loadResult = this.repository.load();
      if (!loadResult.success) {
        logger.error('Failed to load default preferences', {
          component: 'PreferencesService',
          operation: 'resetPreferences',
          error: loadResult.error,
        });
        return false;
      }

      const defaults = loadResult.data;

      // Apply defaults to store
      this.store.updateAudioPreferences(defaults.audioPreferences);
      this.store.updateAvatarCustomization(defaults.avatarCustomization);
      this.store.updateUIPreferences(defaults.uiPreferences);
      this.store.clearOfflineQueue();

      logger.info('Preferences reset to defaults successfully', {
        component: 'PreferencesService',
        operation: 'resetPreferences',
      });

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during reset';

      logger.error('Failed to reset preferences', {
        component: 'PreferencesService',
        operation: 'resetPreferences',
        error: errorMessage,
      });

      return false;
    }
  }

  /**
   * Update audio preferences and save to localStorage
   * 
   * @param updates - Partial audio preferences to update
   * @returns True if update was successful, false otherwise
   */
  updateAudioPreferences(updates: Partial<AudioPreferences>): boolean {
    try {
      // Create updated preferences object for validation
      const updated = { ...this.store.audioPreferences, ...updates };

      // Validate updated preferences BEFORE applying to store
      const validationError = this.validateAudioPreferences(updated);
      if (validationError) {
        logger.error('Audio preferences validation failed', {
          component: 'PreferencesService',
          operation: 'updateAudioPreferences',
          error: validationError,
        });
        return false;
      }

      // Apply to store only after validation passes
      this.store.updateAudioPreferences(updates);

      // Save to localStorage
      return this.savePreferences();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during update';

      logger.error('Failed to update audio preferences', {
        component: 'PreferencesService',
        operation: 'updateAudioPreferences',
        error: errorMessage,
      });

      return false;
    }
  }

  /**
   * Update avatar customization and save to localStorage
   * 
   * @param updates - Partial avatar customization to update
   * @returns True if update was successful, false otherwise
   */
  updateAvatarCustomization(updates: Partial<AvatarCustomization>): boolean {
    try {
      // Create updated customization object
      const updated = { ...this.store.avatarCustomization, ...updates };

      // Validate updated customization
      const validationError = this.validateAvatarCustomization(updated);
      if (validationError) {
        logger.error('Avatar customization validation failed', {
          component: 'PreferencesService',
          operation: 'updateAvatarCustomization',
          error: validationError,
        });
        return false;
      }

      // Apply to store
      this.store.updateAvatarCustomization(updates);

      // Save to localStorage
      return this.savePreferences();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during update';

      logger.error('Failed to update avatar customization', {
        component: 'PreferencesService',
        operation: 'updateAvatarCustomization',
        error: errorMessage,
      });

      return false;
    }
  }

  /**
   * Update UI preferences and save to localStorage
   * 
   * @param updates - Partial UI preferences to update
   * @returns True if update was successful, false otherwise
   */
  updateUIPreferences(updates: Partial<UIPreferences>): boolean {
    try {
      // Create updated preferences object
      const updated = { ...this.store.uiPreferences, ...updates };

      // Validate updated preferences
      const validationError = this.validateUIPreferences(updated);
      if (validationError) {
        logger.error('UI preferences validation failed', {
          component: 'PreferencesService',
          operation: 'updateUIPreferences',
          error: validationError,
        });
        return false;
      }

      // Apply to store
      this.store.updateUIPreferences(updates);

      // Save to localStorage
      return this.savePreferences();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during update';

      logger.error('Failed to update UI preferences', {
        component: 'PreferencesService',
        operation: 'updateUIPreferences',
        error: errorMessage,
      });

      return false;
    }
  }

  /**
   * Validate all preferences
   * 
   * @param preferences - The preferences to validate
   * @returns Error message if validation fails, null if valid
   */
  private validatePreferences(preferences: UserPreferences): string | null {
    // Validate each preference section
    const audioError = this.validateAudioPreferences(preferences.audioPreferences);
    if (audioError) return audioError;

    const avatarError = this.validateAvatarCustomization(preferences.avatarCustomization);
    if (avatarError) return avatarError;

    const uiError = this.validateUIPreferences(preferences.uiPreferences);
    if (uiError) return uiError;

    // Validate offline queue
    if (!Array.isArray(preferences.offlineQueue)) {
      return 'Offline queue must be an array';
    }
    if (preferences.offlineQueue.length > 50) {
      return 'Offline queue cannot exceed 50 items';
    }

    return null;
  }

  /**
   * Validate audio preferences
   * 
   * @param audio - The audio preferences to validate
   * @returns Error message if validation fails, null if valid
   */
  private validateAudioPreferences(audio: AudioPreferences): string | null {
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
    return null;
  }

  /**
   * Validate avatar customization
   * 
   * @param avatar - The avatar customization to validate
   * @returns Error message if validation fails, null if valid
   */
  private validateAvatarCustomization(avatar: AvatarCustomization): string | null {
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
      !['neutral', 'happy', 'sad', 'surprised', 'angry'].includes(avatar.currentExpression)
    ) {
      return 'Invalid expression value';
    }
    return null;
  }

  /**
   * Validate UI preferences
   * 
   * @param ui - The UI preferences to validate
   * @returns Error message if validation fails, null if valid
   */
  private validateUIPreferences(ui: UIPreferences): string | null {
    if (!['light', 'dark', 'system'].includes(ui.theme)) {
      return 'Theme must be light, dark, or system';
    }
    if (!['low', 'medium', 'high', 'ultra'].includes(ui.graphicsQuality)) {
      return 'Graphics quality must be low, medium, high, or ultra';
    }
    return null;
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
   * Save avatar preference to localStorage
   * 
   * @param avatarId - The ID of the selected avatar
   */
  saveAvatarPreference(avatarId: string): void {
    try {
      const preferences = this.loadAvatarPreferencesFromStorage();
      preferences.selectedAvatarId = avatarId;
      preferences.lastUpdated = new Date();

      localStorage.setItem('avatar-preferences', JSON.stringify(preferences));

      logger.info('Avatar preference saved', {
        component: 'PreferencesService',
        operation: 'saveAvatarPreference',
        avatarId,
      });
    } catch (error) {
      logger.error('Failed to save avatar preference', {
        component: 'PreferencesService',
        operation: 'saveAvatarPreference',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Load avatar preference from localStorage
   * 
   * @returns The selected avatar ID, or null if not found
   */
  loadAvatarPreference(): string | null {
    try {
      const preferences = this.loadAvatarPreferencesFromStorage();
      return preferences.selectedAvatarId;
    } catch (error) {
      logger.error('Failed to load avatar preference', {
        component: 'PreferencesService',
        operation: 'loadAvatarPreference',
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get avatar load history
   * 
   * @returns Array of avatar load history entries
   */
  getAvatarLoadHistory(): AvatarPreferences['loadHistory'] {
    try {
      const preferences = this.loadAvatarPreferencesFromStorage();
      return preferences.loadHistory;
    } catch (error) {
      logger.error('Failed to get avatar load history', {
        component: 'PreferencesService',
        operation: 'getAvatarLoadHistory',
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Record an avatar load attempt in history
   * 
   * @param avatarId - The ID of the avatar that was loaded
   * @param success - Whether the load was successful
   * @param loadTimeMs - Optional load time in milliseconds
   */
  recordAvatarLoad(avatarId: string, success: boolean, loadTimeMs?: number): void {
    try {
      const preferences = this.loadAvatarPreferencesFromStorage();

      // Add new history entry
      preferences.loadHistory.push({
        avatarId,
        timestamp: new Date(),
        success,
        loadTimeMs,
      });

      // Keep only last 50 entries
      if (preferences.loadHistory.length > 50) {
        preferences.loadHistory = preferences.loadHistory.slice(-50);
      }

      localStorage.setItem('avatar-preferences', JSON.stringify(preferences));

      logger.info('Avatar load recorded in history', {
        component: 'PreferencesService',
        operation: 'recordAvatarLoad',
        avatarId,
        success,
        loadTimeMs,
      });
    } catch (error) {
      logger.error('Failed to record avatar load', {
        component: 'PreferencesService',
        operation: 'recordAvatarLoad',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Load avatar preferences from localStorage
   * 
   * @returns Avatar preferences with defaults if not found
   */
  private loadAvatarPreferencesFromStorage(): AvatarPreferences {
    try {
      const stored = localStorage.getItem('avatar-preferences');
      if (!stored) {
        return {
          selectedAvatarId: 'default-1',
          lastUpdated: new Date(),
          loadHistory: [],
        };
      }

      const parsed = JSON.parse(stored);
      
      // Convert date strings back to Date objects
      return {
        selectedAvatarId: parsed.selectedAvatarId || 'default-1',
        lastUpdated: new Date(parsed.lastUpdated),
        loadHistory: (parsed.loadHistory || []).map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        })),
      };
    } catch (error) {
      logger.error('Failed to parse avatar preferences from localStorage', {
        component: 'PreferencesService',
        operation: 'loadAvatarPreferencesFromStorage',
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        selectedAvatarId: 'default-1',
        lastUpdated: new Date(),
        loadHistory: [],
      };
    }
  }
}
