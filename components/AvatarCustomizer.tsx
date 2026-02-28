'use client';

import { memo } from 'react';
import { useAppStore } from '@/lib/store/useAppStore';
import type { AvatarCustomization } from '@/types';

/**
 * AvatarCustomizer Component
 *
 * A comprehensive avatar appearance customization panel with color swatches and expression triggers.
 * Allows real-time customization of avatar skin tone, eye color, hair color, and manual expression control.
 *
 * @component
 * @example
 * ```tsx
 * import AvatarCustomizer from '@/components/AvatarCustomizer';
 * 
 * function App() {
 *   const handleCustomizationChange = (customization: AvatarCustomization) => {
 *     console.log('Avatar customization changed:', customization);
 *     // Apply customization to 3D avatar
 *     applyAvatarCustomization(customization);
 *   };
 * 
 *   return (
 *     <div className="sidebar">
 *       <AvatarCustomizer onCustomizationChange={handleCustomizationChange} />
 *     </div>
 *   );
 * }
 * ```
 *
 * @features
 * - **Skin Tone Selection**: 6+ preset color swatches with smooth transitions (300ms)
 * - **Eye Color Selection**: 8+ preset color swatches maintaining shader effects
 * - **Hair Color Selection**: 8+ preset color swatches preserving highlights
 * - **Expression Triggers**: 5 emotion buttons (neutral, happy, sad, surprised, angry)
 * - **Real-time Preview**: Changes apply immediately to the 3D avatar
 * - **Auto-return**: Expressions automatically return to neutral after 2 seconds
 * - **Persistent Settings**: All customizations saved to localStorage
 * - **Visual Feedback**: Selected swatches highlighted with blue border
 *
 * @accessibility
 * - All color swatches have descriptive ARIA labels
 * - Expression buttons include both icon and text labels
 * - Keyboard navigation fully supported (Tab, Enter, Space)
 * - Focus indicators visible on all interactive elements
 * - aria-pressed states for selected options
 * - Disabled state announced when expressions unavailable during speech
 *
 * @behavior
 * - Expression triggers are disabled during active speech to prevent conflicts with visemes
 * - Color changes apply with smooth 300ms CSS transitions
 * - Expression animations blend smoothly over 300ms
 * - All changes persist to localStorage via PreferencesService
 * - Hover effects provide visual feedback on interactive elements
 *
 * @performance
 * - Wrapped with React.memo to prevent unnecessary re-renders
 * - Efficient state updates using Zustand store
 * - Optimized color swatch rendering
 *
 * @requirements 7, 8, 9, 10, 41
 */

/**
 * Props for the AvatarCustomizer component
 */
interface AvatarCustomizerProps {
  /** 
   * Callback fired when any customization changes (color or expression).
   * Receives the complete customization object with updated values.
   */
  onCustomizationChange?: (customization: AvatarCustomization) => void;
  
  /** Additional CSS classes to apply to the container */
  className?: string;
}

/**
 * Preset color options for avatar customization
 */
const SKIN_TONE_PRESETS = [
  { name: 'Fair', color: '#f5d5c5' },
  { name: 'Light', color: '#e8b89a' },
  { name: 'Medium', color: '#d4a574' },
  { name: 'Tan', color: '#c68642' },
  { name: 'Brown', color: '#8d5524' },
  { name: 'Deep', color: '#5c3317' },
];

const EYE_COLOR_PRESETS = [
  { name: 'Blue', color: '#4a90e2' },
  { name: 'Green', color: '#50c878' },
  { name: 'Brown', color: '#8b4513' },
  { name: 'Hazel', color: '#a67b5b' },
  { name: 'Gray', color: '#708090' },
  { name: 'Amber', color: '#ffbf00' },
  { name: 'Violet', color: '#8f00ff' },
  { name: 'Black', color: '#1a1a1a' },
];

const HAIR_COLOR_PRESETS = [
  { name: 'Black', color: '#1a1a1a' },
  { name: 'Dark Brown', color: '#3d2817' },
  { name: 'Brown', color: '#6f4e37' },
  { name: 'Light Brown', color: '#a0826d' },
  { name: 'Blonde', color: '#f5e6a8' },
  { name: 'Red', color: '#a52a2a' },
  { name: 'Auburn', color: '#a0522d' },
  { name: 'Gray', color: '#808080' },
];

/**
 * Expression options with icons
 */
const EXPRESSION_OPTIONS = [
  { name: 'neutral', label: 'Neutral', icon: '😐', ariaLabel: 'Neutral expression' },
  { name: 'happy', label: 'Happy', icon: '😊', ariaLabel: 'Happy expression' },
  { name: 'sad', label: 'Sad', icon: '😢', ariaLabel: 'Sad expression' },
  { name: 'surprised', label: 'Surprised', icon: '😮', ariaLabel: 'Surprised expression' },
  { name: 'angry', label: 'Angry', icon: '😠', ariaLabel: 'Angry expression' },
] as const;

/**
 * ColorSwatch Component
 * 
 * Displays a single color swatch with selection state
 */
interface ColorSwatchProps {
  color: string;
  name: string;
  isSelected: boolean;
  onClick: () => void;
  ariaLabel: string;
}

function ColorSwatch({ color, name, isSelected, onClick, ariaLabel }: ColorSwatchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-10 h-10 rounded-full border-2 transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        hover:scale-110 active:scale-95
        ${isSelected ? 'border-blue-600 ring-2 ring-blue-400' : 'border-gray-300'}
      `}
      style={{ backgroundColor: color }}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      title={name}
    />
  );
}

/**
 * AvatarCustomizer Component
 *
 * A comprehensive avatar appearance customization panel with color swatches and expression triggers.
 * Allows real-time customization of avatar skin tone, eye color, hair color, and manual expression control.
 *
 * @component
 * @example
 * ```tsx
 * import AvatarCustomizer from '@/components/AvatarCustomizer';
 * 
 * function App() {
 *   const handleCustomizationChange = (customization: AvatarCustomization) => {
 *     console.log('Avatar customization changed:', customization);
 *     // Apply customization to 3D avatar
 *     applyAvatarCustomization(customization);
 *   };
 * 
 *   return (
 *     <div className="sidebar">
 *       <AvatarCustomizer onCustomizationChange={handleCustomizationChange} />
 *     </div>
 *   );
 * }
 * ```
 *
 * @features
 * - **Skin Tone Selection**: 6+ preset color swatches with smooth transitions (300ms)
 * - **Eye Color Selection**: 8+ preset color swatches maintaining shader effects
 * - **Hair Color Selection**: 8+ preset color swatches preserving highlights
 * - **Expression Triggers**: 5 emotion buttons (neutral, happy, sad, surprised, angry)
 * - **Real-time Preview**: Changes apply immediately to the 3D avatar
 * - **Auto-return**: Expressions automatically return to neutral after 2 seconds
 * - **Persistent Settings**: All customizations saved to localStorage
 * - **Visual Feedback**: Selected swatches highlighted with blue border
 *
 * @accessibility
 * - All color swatches have descriptive ARIA labels
 * - Expression buttons include both icon and text labels
 * - Keyboard navigation fully supported (Tab, Enter, Space)
 * - Focus indicators visible on all interactive elements
 * - aria-pressed states for selected options
 * - Disabled state announced when expressions unavailable during speech
 *
 * @behavior
 * - Expression triggers are disabled during active speech to prevent conflicts with visemes
 * - Color changes apply with smooth 300ms CSS transitions
 * - Expression animations blend smoothly over 300ms
 * - All changes persist to localStorage via PreferencesService
 * - Hover effects provide visual feedback on interactive elements
 *
 * @performance
 * - Wrapped with React.memo to prevent unnecessary re-renders
 * - Efficient state updates using Zustand store
 * - Optimized color swatch rendering
 *
 * @requirements 7, 8, 9, 10, 41
 */
const AvatarCustomizer = memo(function AvatarCustomizer({
  onCustomizationChange,
  className = '',
}: AvatarCustomizerProps) {
  const avatarCustomization = useAppStore((state) => state.avatarCustomization);
  const updateAvatarCustomization = useAppStore((state) => state.updateAvatarCustomization);
  const playbackState = useAppStore((state) => state.playbackState);

  // Disable expression triggers during active speech
  const isExpressionDisabled = playbackState === 'playing';

  /**
   * Handle color selection for skin, eyes, or hair
   */
  const handleColorChange = (type: 'skinTone' | 'eyeColor' | 'hairColor', color: string) => {
    const updates = { [type]: color };
    updateAvatarCustomization(updates);
    
    if (onCustomizationChange) {
      onCustomizationChange({ ...avatarCustomization, ...updates });
    }
  };

  /**
   * Handle expression trigger
   * Expression will auto-return to neutral after 2 seconds (handled by Avatar component)
   */
  const handleExpressionTrigger = (
    expression: 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry'
  ) => {
    if (isExpressionDisabled) return;

    const updates = { currentExpression: expression };
    updateAvatarCustomization(updates);

    if (onCustomizationChange) {
      onCustomizationChange({ ...avatarCustomization, ...updates });
    }

    // Auto-return to neutral after 2 seconds
    if (expression !== 'neutral') {
      setTimeout(() => {
        updateAvatarCustomization({ currentExpression: null });
        if (onCustomizationChange) {
          onCustomizationChange({ ...avatarCustomization, currentExpression: null });
        }
      }, 2000);
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-6 space-y-6 ${className}`}
      role="region"
      aria-label="Avatar customization controls"
    >
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Customize Avatar</h2>

      {/* Skin Tone Section */}
      <section aria-labelledby="skin-tone-heading">
        <h3 id="skin-tone-heading" className="text-sm font-medium text-gray-700 mb-3">
          Skin Tone
        </h3>
        <div className="flex flex-wrap gap-3" role="group" aria-label="Skin tone options">
          {SKIN_TONE_PRESETS.map((preset) => (
            <ColorSwatch
              key={preset.color}
              color={preset.color}
              name={preset.name}
              isSelected={avatarCustomization.skinTone === preset.color}
              onClick={() => handleColorChange('skinTone', preset.color)}
              ariaLabel={`Select ${preset.name} skin tone`}
            />
          ))}
        </div>
      </section>

      {/* Eye Color Section */}
      <section aria-labelledby="eye-color-heading">
        <h3 id="eye-color-heading" className="text-sm font-medium text-gray-700 mb-3">
          Eye Color
        </h3>
        <div className="flex flex-wrap gap-3" role="group" aria-label="Eye color options">
          {EYE_COLOR_PRESETS.map((preset) => (
            <ColorSwatch
              key={preset.color}
              color={preset.color}
              name={preset.name}
              isSelected={avatarCustomization.eyeColor === preset.color}
              onClick={() => handleColorChange('eyeColor', preset.color)}
              ariaLabel={`Select ${preset.name} eye color`}
            />
          ))}
        </div>
      </section>

      {/* Hair Color Section */}
      <section aria-labelledby="hair-color-heading">
        <h3 id="hair-color-heading" className="text-sm font-medium text-gray-700 mb-3">
          Hair Color
        </h3>
        <div className="flex flex-wrap gap-3" role="group" aria-label="Hair color options">
          {HAIR_COLOR_PRESETS.map((preset) => (
            <ColorSwatch
              key={preset.color}
              color={preset.color}
              name={preset.name}
              isSelected={avatarCustomization.hairColor === preset.color}
              onClick={() => handleColorChange('hairColor', preset.color)}
              ariaLabel={`Select ${preset.name} hair color`}
            />
          ))}
        </div>
      </section>

      {/* Expression Triggers Section */}
      <section aria-labelledby="expressions-heading">
        <h3 id="expressions-heading" className="text-sm font-medium text-gray-700 mb-3">
          Expressions
        </h3>
        {isExpressionDisabled && (
          <p className="text-xs text-amber-600 mb-2" role="status">
            Expression controls are disabled during speech
          </p>
        )}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Expression triggers">
          {EXPRESSION_OPTIONS.map((option) => (
            <button
              key={option.name}
              type="button"
              onClick={() => handleExpressionTrigger(option.name)}
              disabled={isExpressionDisabled}
              className={`
                flex flex-col items-center justify-center
                px-4 py-3 rounded-lg border-2 transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                hover:scale-105 active:scale-95
                ${
                  avatarCustomization.currentExpression === option.name
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 bg-white'
                }
                ${
                  isExpressionDisabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:border-blue-400 hover:bg-blue-50'
                }
              `}
              aria-label={option.ariaLabel}
              aria-pressed={avatarCustomization.currentExpression === option.name}
              aria-disabled={isExpressionDisabled}
            >
              <span className="text-2xl mb-1" aria-hidden="true">
                {option.icon}
              </span>
              <span className="text-xs font-medium text-gray-700">{option.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
});

export default AvatarCustomizer;
