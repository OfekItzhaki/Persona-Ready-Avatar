import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PreferencesService, type IPreferencesStore } from '../PreferencesService';
import { LocalStorageRepository, type UserPreferences } from '../../repositories/LocalStorageRepository';
import type {
  AudioPreferences,
  AvatarCustomization,
  UIPreferences,
  OfflineQueueItem,
} from '@/types';

/**
 * Mock implementation of IPreferencesStore for testing
 */
class MockPreferencesStore implements IPreferencesStore {
  audioPreferences: AudioPreferences = {
    volume: 100,
    isMuted: false,
    playbackSpeed: 1.0,
    speechRate: 1.0,
    speechPitch: 0,
    audioQuality: 'high',
  };

  avatarCustomization: AvatarCustomization = {
    skinTone: '#f5d5c5',
    eyeColor: '#4a90e2',
    hairColor: '#3d2817',
    currentExpression: null,
  };

  uiPreferences: UIPreferences = {
    theme: 'system',
    graphicsQuality: 'high',
    performanceMonitorVisible: false,
    performanceMonitorExpanded: false,
    highContrastMode: false,
  };

  offlineQueue: OfflineQueueItem[] = [];

  updateAudioPreferences = vi.fn((updates: Partial<AudioPreferences>) => {
    this.audioPreferences = { ...this.audioPreferences, ...updates };
  });

  updateAvatarCustomization = vi.fn((updates: Partial<AvatarCustomization>) => {
    this.avatarCustomization = { ...this.avatarCustomization, ...updates };
  });

  updateUIPreferences = vi.fn((updates: Partial<UIPreferences>) => {
    this.uiPreferences = { ...this.uiPreferences, ...updates };
  });

  addToOfflineQueue = vi.fn((item: OfflineQueueItem) => {
    this.offlineQueue.push(item);
  });

  updateOfflineQueueItem = vi.fn((id: string, updates: Partial<OfflineQueueItem>) => {
    const index = this.offlineQueue.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.offlineQueue[index] = { ...this.offlineQueue[index], ...updates };
    }
  });

  removeFromOfflineQueue = vi.fn((id: string) => {
    this.offlineQueue = this.offlineQueue.filter((item) => item.id !== id);
  });

  clearOfflineQueue = vi.fn(() => {
    this.offlineQueue = [];
  });
}

describe('PreferencesService', () => {
  let mockStore: MockPreferencesStore;
  let mockRepository: LocalStorageRepository;
  let service: PreferencesService;

  beforeEach(() => {
    // Reset singleton before each test
    PreferencesService.reset();

    // Create fresh mocks
    mockStore = new MockPreferencesStore();
    mockRepository = new LocalStorageRepository();

    // Initialize service
    service = PreferencesService.initialize(mockStore, mockRepository);
  });

  afterEach(() => {
    // Clean up
    PreferencesService.reset();
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when getInstance is called', () => {
      const instance1 = PreferencesService.getInstance();
      const instance2 = PreferencesService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should throw error when getInstance is called before initialize', () => {
      PreferencesService.reset();

      expect(() => PreferencesService.getInstance()).toThrow(
        'PreferencesService not initialized. Call initialize() first.'
      );
    });

    it('should not create a new instance if already initialized', () => {
      const instance1 = PreferencesService.initialize(mockStore, mockRepository);
      const instance2 = PreferencesService.initialize(mockStore, mockRepository);

      expect(instance1).toBe(instance2);
    });
  });

  describe('loadPreferences', () => {
    it('should load preferences from repository and apply to store', () => {
      // Setup: Save some preferences first
      const preferences: UserPreferences = {
        audioPreferences: {
          volume: 75,
          isMuted: true,
          playbackSpeed: 1.5,
          speechRate: 1.2,
          speechPitch: 10,
          audioQuality: 'medium',
        },
        avatarCustomization: {
          skinTone: '#aabbcc',
          eyeColor: '#112233',
          hairColor: '#445566',
          currentExpression: 'happy',
        },
        uiPreferences: {
          theme: 'dark',
          graphicsQuality: 'low',
          performanceMonitorVisible: true,
          performanceMonitorExpanded: true,
          highContrastMode: true,
        },
        offlineQueue: [],
      };
      
      // Create a fresh repository and save preferences
      const freshRepository = new LocalStorageRepository();
      freshRepository.save(preferences);

      // Reset store to defaults and create new service with the repository that has saved data
      PreferencesService.reset();
      mockStore = new MockPreferencesStore();
      service = PreferencesService.initialize(mockStore, freshRepository);

      // The service automatically loads on initialization
      // Verify store was updated
      expect(mockStore.audioPreferences.volume).toBe(75);
      expect(mockStore.audioPreferences.isMuted).toBe(true);
      expect(mockStore.avatarCustomization.skinTone).toBe('#aabbcc');
      expect(mockStore.uiPreferences.theme).toBe('dark');
    });

    it('should restore offline queue items', () => {
      const queueItem: OfflineQueueItem = {
        id: 'test-1',
        agentId: 'agent-1',
        message: 'Test message',
        timestamp: new Date(),
        status: 'pending',
        retryCount: 0,
      };

      const preferences: UserPreferences = {
        audioPreferences: mockStore.audioPreferences,
        avatarCustomization: mockStore.avatarCustomization,
        uiPreferences: mockStore.uiPreferences,
        offlineQueue: [queueItem],
      };
      
      // Create a fresh repository and save preferences
      const freshRepository = new LocalStorageRepository();
      freshRepository.save(preferences);

      // Reset and reload with fresh repository
      PreferencesService.reset();
      mockStore = new MockPreferencesStore();
      service = PreferencesService.initialize(mockStore, freshRepository);

      expect(mockStore.offlineQueue).toHaveLength(1);
      expect(mockStore.offlineQueue[0].id).toBe('test-1');
    });

    it('should use defaults when no preferences exist', () => {
      // Clear any existing preferences
      mockRepository.clear();

      // Create new service
      mockStore = new MockPreferencesStore();
      service = PreferencesService.initialize(mockStore, mockRepository);

      // Should have default values
      expect(mockStore.audioPreferences.volume).toBe(100);
      expect(mockStore.audioPreferences.audioQuality).toBe('high');
      expect(mockStore.uiPreferences.theme).toBe('system');
    });

    it('should return false when repository load fails', () => {
      // Mock repository to fail
      vi.spyOn(mockRepository, 'load').mockReturnValue({
        success: false,
        error: 'Load failed',
      });

      const result = service.loadPreferences();

      expect(result).toBe(false);
    });
  });

  describe('savePreferences', () => {
    it('should save current store state to repository', () => {
      // Update store
      mockStore.audioPreferences.volume = 50;
      mockStore.avatarCustomization.skinTone = '#123456';
      mockStore.uiPreferences.theme = 'light';

      // Save
      const result = service.savePreferences();

      expect(result).toBe(true);

      // Verify by loading in a new instance
      const loadResult = mockRepository.load();
      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.data.audioPreferences.volume).toBe(50);
        expect(loadResult.data.avatarCustomization.skinTone).toBe('#123456');
        expect(loadResult.data.uiPreferences.theme).toBe('light');
      }
    });

    it('should return false when validation fails', () => {
      // Set invalid value
      mockStore.audioPreferences.volume = 150; // Invalid: > 100

      const result = service.savePreferences();

      expect(result).toBe(false);
    });

    it('should return false when repository save fails', () => {
      // Mock repository to fail
      vi.spyOn(mockRepository, 'save').mockReturnValue({
        success: false,
        error: 'Save failed',
      });

      const result = service.savePreferences();

      expect(result).toBe(false);
    });
  });

  describe('resetPreferences', () => {
    it('should reset all preferences to defaults', () => {
      // Set custom values
      mockStore.audioPreferences.volume = 50;
      mockStore.avatarCustomization.skinTone = '#123456';
      mockStore.uiPreferences.theme = 'light';
      service.savePreferences();

      // Reset
      const result = service.resetPreferences();

      expect(result).toBe(true);
      expect(mockStore.audioPreferences.volume).toBe(100);
      expect(mockStore.avatarCustomization.skinTone).toBe('#f5d5c5');
      expect(mockStore.uiPreferences.theme).toBe('system');
    });

    it('should clear offline queue', () => {
      // Add items to queue
      const queueItem: OfflineQueueItem = {
        id: 'test-1',
        agentId: 'agent-1',
        message: 'Test',
        timestamp: new Date(),
        status: 'pending',
        retryCount: 0,
      };
      mockStore.addToOfflineQueue(queueItem);

      // Reset
      service.resetPreferences();

      expect(mockStore.offlineQueue).toHaveLength(0);
    });

    it('should return false when clear fails', () => {
      // Mock repository to fail
      vi.spyOn(mockRepository, 'clear').mockReturnValue({
        success: false,
        error: 'Clear failed',
      });

      const result = service.resetPreferences();

      expect(result).toBe(false);
    });
  });

  describe('updateAudioPreferences', () => {
    it('should update audio preferences and save', () => {
      const result = service.updateAudioPreferences({ volume: 75, isMuted: true });

      expect(result).toBe(true);
      expect(mockStore.updateAudioPreferences).toHaveBeenCalledWith({
        volume: 75,
        isMuted: true,
      });

      // Verify saved to repository
      const loadResult = mockRepository.load();
      if (loadResult.success) {
        expect(loadResult.data.audioPreferences.volume).toBe(75);
        expect(loadResult.data.audioPreferences.isMuted).toBe(true);
      }
    });

    it('should reject invalid volume', () => {
      // Reset mocks to ensure clean state
      vi.clearAllMocks();
      
      const result = service.updateAudioPreferences({ volume: 150 });

      expect(result).toBe(false);
      expect(mockStore.updateAudioPreferences).not.toHaveBeenCalled();
    });

    it('should reject invalid playback speed', () => {
      const result = service.updateAudioPreferences({ playbackSpeed: 3.0 });

      expect(result).toBe(false);
    });

    it('should reject invalid speech rate', () => {
      const result = service.updateAudioPreferences({ speechRate: 0.3 });

      expect(result).toBe(false);
    });

    it('should reject invalid speech pitch', () => {
      const result = service.updateAudioPreferences({ speechPitch: 100 });

      expect(result).toBe(false);
    });

    it('should reject invalid audio quality', () => {
      const result = service.updateAudioPreferences({
        audioQuality: 'ultra' as any,
      });

      expect(result).toBe(false);
    });
  });

  describe('updateAvatarCustomization', () => {
    it('should update avatar customization and save', () => {
      const result = service.updateAvatarCustomization({
        skinTone: '#aabbcc',
        currentExpression: 'happy',
      });

      expect(result).toBe(true);
      expect(mockStore.updateAvatarCustomization).toHaveBeenCalledWith({
        skinTone: '#aabbcc',
        currentExpression: 'happy',
      });

      // Verify saved to repository
      const loadResult = mockRepository.load();
      if (loadResult.success) {
        expect(loadResult.data.avatarCustomization.skinTone).toBe('#aabbcc');
        expect(loadResult.data.avatarCustomization.currentExpression).toBe('happy');
      }
    });

    it('should reject invalid skin tone color', () => {
      const result = service.updateAvatarCustomization({ skinTone: 'invalid' });

      expect(result).toBe(false);
    });

    it('should reject invalid eye color', () => {
      const result = service.updateAvatarCustomization({ eyeColor: '#12345' }); // Too short

      expect(result).toBe(false);
    });

    it('should reject invalid hair color', () => {
      const result = service.updateAvatarCustomization({ hairColor: '#gggggg' }); // Invalid hex

      expect(result).toBe(false);
    });

    it('should reject invalid expression', () => {
      const result = service.updateAvatarCustomization({
        currentExpression: 'confused' as any,
      });

      expect(result).toBe(false);
    });

    it('should accept null expression', () => {
      const result = service.updateAvatarCustomization({ currentExpression: null });

      expect(result).toBe(true);
    });
  });

  describe('updateUIPreferences', () => {
    it('should update UI preferences and save', () => {
      const result = service.updateUIPreferences({
        theme: 'dark',
        graphicsQuality: 'ultra',
      });

      expect(result).toBe(true);
      expect(mockStore.updateUIPreferences).toHaveBeenCalledWith({
        theme: 'dark',
        graphicsQuality: 'ultra',
      });

      // Verify saved to repository
      const loadResult = mockRepository.load();
      if (loadResult.success) {
        expect(loadResult.data.uiPreferences.theme).toBe('dark');
        expect(loadResult.data.uiPreferences.graphicsQuality).toBe('ultra');
      }
    });

    it('should reject invalid theme', () => {
      const result = service.updateUIPreferences({ theme: 'blue' as any });

      expect(result).toBe(false);
    });

    it('should reject invalid graphics quality', () => {
      const result = service.updateUIPreferences({
        graphicsQuality: 'maximum' as any,
      });

      expect(result).toBe(false);
    });

    it('should accept boolean preferences', () => {
      const result = service.updateUIPreferences({
        performanceMonitorVisible: true,
        performanceMonitorExpanded: true,
        highContrastMode: true,
      });

      expect(result).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate complete preferences object', () => {
      const validPreferences: UserPreferences = {
        audioPreferences: {
          volume: 50,
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
        },
        offlineQueue: [],
      };

      const result = mockRepository.save(validPreferences);

      expect(result.success).toBe(true);
    });

    it('should reject offline queue exceeding 50 items', () => {
      const largeQueue: OfflineQueueItem[] = Array.from({ length: 51 }, (_, i) => ({
        id: `item-${i}`,
        agentId: 'agent-1',
        message: 'Test',
        timestamp: new Date(),
        status: 'pending' as const,
        retryCount: 0,
      }));

      mockStore.offlineQueue = largeQueue;

      const result = service.savePreferences();

      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle partial updates correctly', () => {
      // Update only volume
      service.updateAudioPreferences({ volume: 80 });

      // Other audio preferences should remain unchanged
      expect(mockStore.audioPreferences.isMuted).toBe(false);
      expect(mockStore.audioPreferences.playbackSpeed).toBe(1.0);
    });

    it('should handle multiple rapid updates', () => {
      service.updateAudioPreferences({ volume: 50 });
      service.updateAudioPreferences({ volume: 60 });
      service.updateAudioPreferences({ volume: 70 });

      expect(mockStore.audioPreferences.volume).toBe(70);
    });

    it('should handle boundary values for volume', () => {
      expect(service.updateAudioPreferences({ volume: 0 })).toBe(true);
      expect(service.updateAudioPreferences({ volume: 100 })).toBe(true);
      expect(service.updateAudioPreferences({ volume: -1 })).toBe(false);
      expect(service.updateAudioPreferences({ volume: 101 })).toBe(false);
    });

    it('should handle boundary values for playback speed', () => {
      expect(service.updateAudioPreferences({ playbackSpeed: 0.5 })).toBe(true);
      expect(service.updateAudioPreferences({ playbackSpeed: 2.0 })).toBe(true);
      expect(service.updateAudioPreferences({ playbackSpeed: 0.49 })).toBe(false);
      expect(service.updateAudioPreferences({ playbackSpeed: 2.01 })).toBe(false);
    });

    it('should handle boundary values for speech pitch', () => {
      expect(service.updateAudioPreferences({ speechPitch: -50 })).toBe(true);
      expect(service.updateAudioPreferences({ speechPitch: 50 })).toBe(true);
      expect(service.updateAudioPreferences({ speechPitch: -51 })).toBe(false);
      expect(service.updateAudioPreferences({ speechPitch: 51 })).toBe(false);
    });
  });
});
