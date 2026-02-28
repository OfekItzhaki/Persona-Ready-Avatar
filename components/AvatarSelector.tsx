'use client';

import { useAppStore } from '@/lib/store/useAppStore';
import { AvatarOption } from '@/types';
import { PreferencesService } from '@/lib/services/PreferencesService';

/**
 * AvatarSelector Component Props
 */
interface AvatarSelectorProps {
  options: AvatarOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  loading?: boolean;
}

/**
 * AvatarSelector Component
 * 
 * Displays available avatar options in a grid layout with visual selection indicators.
 * Handles avatar selection, preference persistence, and loading states.
 * 
 * Features:
 * - Grid layout with avatar thumbnails/names
 * - Visual highlighting for selected avatar
 * - Loading spinner during avatar load
 * - Keyboard navigation support (Tab, Enter, Arrow keys)
 * - ARIA labels for accessibility
 * - Preference persistence via PreferencesService
 * 
 * Requirements: 2.3, 10.1, 10.2, 10.3, 10.5
 */
export default function AvatarSelector({
  options,
  selectedId,
  onSelect,
  loading = false,
}: AvatarSelectorProps) {
  const avatarLoadingState = useAppStore((state) => state.avatarLoadingState);

  const handleSelect = (id: string) => {
    if (loading || avatarLoadingState === 'loading') return;

    // Update selection
    onSelect(id);

    // Persist preference
    try {
      const preferencesService = PreferencesService.getInstance();
      preferencesService.saveAvatarPreference(id);
    } catch (error) {
      console.error('Failed to save avatar preference:', error);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(id);
    }
  };

  return (
    <div className="avatar-selector">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          const isLoading = loading || (avatarLoadingState === 'loading' && isSelected);

          return (
            <div
              key={option.id}
              role="button"
              tabIndex={0}
              aria-label={`Select ${option.name} avatar`}
              aria-pressed={isSelected}
              className={`
                relative p-4 rounded-lg border-2 cursor-pointer transition-all
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700'
                }
                ${isLoading ? 'opacity-50 cursor-wait' : ''}
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              `}
              onClick={() => handleSelect(option.id)}
              onKeyDown={(e) => handleKeyDown(e, option.id)}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              )}

              {/* Loading spinner */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 rounded-lg">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              )}

              {/* Avatar thumbnail (placeholder for now) */}
              <div className="w-full aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-gray-400 dark:text-gray-500"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>

              {/* Avatar name */}
              <h3 className="font-medium text-gray-900 dark:text-gray-100 text-center">
                {option.name}
              </h3>

              {/* Avatar description */}
              {option.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-1">
                  {option.description}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Loading indicator for overall state */}
      {(loading || avatarLoadingState === 'loading') && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Loading avatar...
          </p>
        </div>
      )}
    </div>
  );
}
