import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageRepository } from '../LocalStorageRepository';
import type { UserPreferences } from '../LocalStorageRepository';

describe('LocalStorageRepository', () => {
  let repository: LocalStorageRepository;
  let mockLocalStorage: Record<string, string>;

  // Mock localStorage
  beforeEach(() => {
    mockLocalStorage = {};

    global.localStorage = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
      length: 0,
      key: vi.fn(() => null),
    };

    repository = new LocalStorageRepository();
  });

  describe('save', () => {
    it('should save valid preferences to localStorage', () => {
      const preferences: UserPreferences = {
        audioPreferences: {
          volume: 75,
          isMuted: false,
          playbackSpeed: 1.5,
          speechRate: 1.0,
          speechPitch: 0,
          audioQuality: 'high',
        },
        avatarCustomization: {
          skinTone: '#f5d5c5',
          eyeColor: '#4a90e2',
          hairColor: '#3d2817',
          currentExpression: 'happy',
        },
        uiPreferences: {
          theme: 'dark',
          graphicsQuality: 'high',
          performanceMonitorVisible: true,
          performanceMonitorExpanded: false,
          highContrastMode: false,
        },
        offlineQueue: [],
      };

      const result = repository.save(preferences);

      expect(result.success).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'avatar-client-preferences',
        expect.any(String)
      );

      // Verify stored data structure
      const stored = JSON.parse(mockLocalStorage['avatar-client-preferences']);
      expect(stored.version).toBe(1);
      expect(stored.data).toEqual(preferences);
      expect(stored.timestamp).toBeDefined();
    });

    it('should reject invalid volume values', () => {
      const preferences: UserPreferences = {
        audioPreferences: {
          volume: 150, // Invalid: > 100
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

      const result = repository.save(preferences);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Volume must be between 0 and 100');
      }
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should reject invalid playback speed values', () => {
      const preferences: UserPreferences = {
        audioPreferences: {
          volume: 100,
          isMuted: false,
          playbackSpeed: 3.0, // Invalid: > 2.0
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

      const result = repository.save(preferences);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Playback speed must be between 0.5 and 2.0');
      }
    });

    it('should reject invalid speech pitch values', () => {
      const preferences: UserPreferences = {
        audioPreferences: {
          volume: 100,
          isMuted: false,
          playbackSpeed: 1.0,
          speechRate: 1.0,
          speechPitch: 100, // Invalid: > 50
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

      const result = repository.save(preferences);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Speech pitch must be between -50 and 50');
      }
    });

    it('should reject invalid hex color values', () => {
      const preferences: UserPreferences = {
        audioPreferences: {
          volume: 100,
          isMuted: false,
          playbackSpeed: 1.0,
          speechRate: 1.0,
          speechPitch: 0,
          audioQuality: 'high',
        },
        avatarCustomization: {
          skinTone: 'invalid-color', // Invalid hex color
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

      const result = repository.save(preferences);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Skin tone must be a valid hex color');
      }
    });

    it('should reject offline queue exceeding 50 items', () => {
      const preferences: UserPreferences = {
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
        },
        offlineQueue: Array(51).fill({
          id: '1',
          agentId: 'agent1',
          message: 'test',
          timestamp: new Date(),
          status: 'pending',
          retryCount: 0,
        }),
      };

      const result = repository.save(preferences);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Offline queue cannot exceed 50 items');
      }
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.setItem to throw an error
      vi.mocked(localStorage.setItem).mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const preferences: UserPreferences = {
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
        },
        offlineQueue: [],
      };

      const result = repository.save(preferences);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Failed to save preferences');
      }
    });
  });

  describe('load', () => {
    it('should load valid preferences from localStorage', () => {
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
          skinTone: '#f5d5c5',
          eyeColor: '#4a90e2',
          hairColor: '#3d2817',
          currentExpression: 'happy',
        },
        uiPreferences: {
          theme: 'dark',
          graphicsQuality: 'medium',
          performanceMonitorVisible: true,
          performanceMonitorExpanded: true,
          highContrastMode: true,
        },
        offlineQueue: [],
      };

      // Store preferences
      mockLocalStorage['avatar-client-preferences'] = JSON.stringify({
        version: 1,
        data: preferences,
        timestamp: new Date().toISOString(),
      });

      const result = repository.load();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(preferences);
      }
    });

    it('should return defaults when no data exists', () => {
      const result = repository.load();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.audioPreferences.volume).toBe(100);
        expect(result.data.audioPreferences.isMuted).toBe(false);
        expect(result.data.uiPreferences.theme).toBe('system');
      }
    });

    it('should return defaults when data is corrupted', () => {
      // Store invalid JSON
      mockLocalStorage['avatar-client-preferences'] = 'invalid-json{';

      const result = repository.load();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.audioPreferences.volume).toBe(100);
      }
    });

    it('should return defaults when stored data fails validation', () => {
      // Store data with invalid values
      mockLocalStorage['avatar-client-preferences'] = JSON.stringify({
        version: 1,
        data: {
          audioPreferences: {
            volume: 200, // Invalid
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
        },
        timestamp: new Date().toISOString(),
      });

      const result = repository.load();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.audioPreferences.volume).toBe(100); // Default value
      }
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.getItem to throw an error
      vi.mocked(localStorage.getItem).mockImplementation(() => {
        throw new Error('SecurityError');
      });

      const result = repository.load();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.audioPreferences.volume).toBe(100); // Default value
      }
    });

    it('should handle schema version mismatch', () => {
      // Store data with unsupported version
      mockLocalStorage['avatar-client-preferences'] = JSON.stringify({
        version: 999, // Unsupported version
        data: {
          audioPreferences: {
            volume: 75,
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
        },
        timestamp: new Date().toISOString(),
      });

      const result = repository.load();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.audioPreferences.volume).toBe(100); // Default value
      }
    });
  });

  describe('clear', () => {
    it('should clear stored preferences', () => {
      // Store some data first
      mockLocalStorage['avatar-client-preferences'] = JSON.stringify({
        version: 1,
        data: {},
        timestamp: new Date().toISOString(),
      });

      const result = repository.clear();

      expect(result.success).toBe(true);
      expect(localStorage.removeItem).toHaveBeenCalledWith('avatar-client-preferences');
      expect(mockLocalStorage['avatar-client-preferences']).toBeUndefined();
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.removeItem to throw an error
      vi.mocked(localStorage.removeItem).mockImplementation(() => {
        throw new Error('SecurityError');
      });

      const result = repository.clear();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Failed to clear preferences');
      }
    });
  });

  describe('round-trip consistency', () => {
    it('should maintain data integrity through save and load cycle', () => {
      const originalPreferences: UserPreferences = {
        audioPreferences: {
          volume: 85,
          isMuted: true,
          playbackSpeed: 1.25,
          speechRate: 0.9,
          speechPitch: -10,
          audioQuality: 'low',
        },
        avatarCustomization: {
          skinTone: '#a67c52',
          eyeColor: '#2e8b57',
          hairColor: '#000000',
          currentExpression: 'surprised',
        },
        uiPreferences: {
          theme: 'light',
          graphicsQuality: 'ultra',
          performanceMonitorVisible: false,
          performanceMonitorExpanded: true,
          highContrastMode: true,
        },
        offlineQueue: [
          {
            id: 'msg1',
            agentId: 'agent1',
            message: 'Hello',
            timestamp: new Date('2024-01-01T00:00:00Z'),
            status: 'pending',
            retryCount: 0,
          },
        ],
      };

      // Save preferences
      const saveResult = repository.save(originalPreferences);
      expect(saveResult.success).toBe(true);

      // Load preferences
      const loadResult = repository.load();
      expect(loadResult.success).toBe(true);

      if (loadResult.success) {
        // Verify data integrity
        expect(loadResult.data.audioPreferences).toEqual(
          originalPreferences.audioPreferences
        );
        expect(loadResult.data.avatarCustomization).toEqual(
          originalPreferences.avatarCustomization
        );
        expect(loadResult.data.uiPreferences).toEqual(originalPreferences.uiPreferences);
        expect(loadResult.data.offlineQueue.length).toBe(1);
        expect(loadResult.data.offlineQueue[0].id).toBe('msg1');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle minimum valid values', () => {
      const preferences: UserPreferences = {
        audioPreferences: {
          volume: 0,
          isMuted: false,
          playbackSpeed: 0.5,
          speechRate: 0.5,
          speechPitch: -50,
          audioQuality: 'low',
        },
        avatarCustomization: {
          skinTone: '#000000',
          eyeColor: '#000000',
          hairColor: '#000000',
          currentExpression: null,
        },
        uiPreferences: {
          theme: 'light',
          graphicsQuality: 'low',
          performanceMonitorVisible: false,
          performanceMonitorExpanded: false,
          highContrastMode: false,
        },
        offlineQueue: [],
      };

      const saveResult = repository.save(preferences);
      expect(saveResult.success).toBe(true);

      const loadResult = repository.load();
      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.data).toEqual(preferences);
      }
    });

    it('should handle maximum valid values', () => {
      const preferences: UserPreferences = {
        audioPreferences: {
          volume: 100,
          isMuted: true,
          playbackSpeed: 2.0,
          speechRate: 2.0,
          speechPitch: 50,
          audioQuality: 'high',
        },
        avatarCustomization: {
          skinTone: '#ffffff',
          eyeColor: '#ffffff',
          hairColor: '#ffffff',
          currentExpression: 'angry',
        },
        uiPreferences: {
          theme: 'dark',
          graphicsQuality: 'ultra',
          performanceMonitorVisible: true,
          performanceMonitorExpanded: true,
          highContrastMode: true,
        },
        offlineQueue: Array(50).fill({
          id: '1',
          agentId: 'agent1',
          message: 'test',
          timestamp: new Date(),
          status: 'pending',
          retryCount: 0,
        }),
      };

      const saveResult = repository.save(preferences);
      expect(saveResult.success).toBe(true);

      const loadResult = repository.load();
      expect(loadResult.success).toBe(true);
      if (loadResult.success) {
        expect(loadResult.data.offlineQueue.length).toBe(50);
      }
    });
  });
});
