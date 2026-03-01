# LoadingSkeleton Component

A modern, accessible loading skeleton component with shimmer animation effects. Provides visual feedback during content loading with support for multiple variants, animations, and accessibility features.

## Features

- ✨ **Shimmer Animation**: Smooth gradient shimmer effect using CSS animations
- 🎨 **Multiple Variants**: Default, avatar, text, and circle variants
- 🎭 **Animation Types**: Shimmer, pulse, and wave animations
- ♿ **Accessibility**: Full ARIA support with `aria-busy`, `aria-label`, and `role="status"`
- 🎯 **Reduced Motion**: Respects `prefers-reduced-motion` user preference
- 📐 **Configurable**: Customizable dimensions, count, and styling
- 🌓 **Theme Support**: Automatic light/dark mode gradient backgrounds

## Requirements Validation

This component validates the following requirements from the UI Enhancement spec:

- **Requirement 9.1**: Shimmer animation effect using CSS gradients
- **Requirement 9.2**: Configurable dimensions (width, height, count)
- **Requirement 9.3**: Gradient backgrounds (gray-200 to gray-300 in light mode)
- **Requirement 9.4**: `aria-busy="true"` attribute
- **Requirement 9.5**: Descriptive `aria-label`
- **Requirement 9.6**: Disabled shimmer animation when `prefers-reduced-motion` is enabled
- **Requirement 9.7**: Avatar-specific loading skeleton variant

## Basic Usage

```tsx
import { LoadingSkeleton, AvatarLoadingSkeleton } from '@/components/ui/LoadingSkeleton';

// Basic skeleton
<LoadingSkeleton width="full" height="2rem" />

// Multiple skeletons
<LoadingSkeleton width="full" height="1.5rem" count={3} />

// Avatar skeleton
<AvatarLoadingSkeleton />
```

## Props

### LoadingSkeleton

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | `string \| 'full'` | `'full'` | Width of the skeleton (CSS value or 'full') |
| `height` | `string` | `'1rem'` | Height of the skeleton (CSS value) |
| `count` | `number` | `1` | Number of skeleton elements to render |
| `animation` | `'pulse' \| 'wave' \| 'shimmer'` | `'shimmer'` | Animation type |
| `className` | `string` | `''` | Additional CSS classes |
| `ariaLabel` | `string` | `'Loading content'` | Accessible label for screen readers |
| `variant` | `'default' \| 'avatar' \| 'text' \| 'circle'` | `'default'` | Variant for specific use cases |

### AvatarLoadingSkeleton

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `''` | Additional CSS classes |

## Variants

### Default
Rounded corners (`rounded-md`) for general content loading.

```tsx
<LoadingSkeleton variant="default" width="full" height="4rem" />
```

### Avatar
Larger rounded corners (`rounded-lg`) for avatar containers.

```tsx
<LoadingSkeleton variant="avatar" width="full" height="600px" />
// Or use the preset component
<AvatarLoadingSkeleton />
```

### Text
Subtle rounded corners (`rounded`) for text content.

```tsx
<LoadingSkeleton variant="text" width="full" height="1rem" count={3} />
```

### Circle
Fully rounded (`rounded-full`) for circular avatars or icons.

```tsx
<LoadingSkeleton variant="circle" width="4rem" height="4rem" />
```

## Animation Types

### Shimmer (Default)
Smooth gradient shimmer effect that slides across the skeleton.

```tsx
<LoadingSkeleton animation="shimmer" />
```

### Pulse
Gentle opacity pulsing effect.

```tsx
<LoadingSkeleton animation="pulse" />
```

### Wave
Wave-like animation effect.

```tsx
<LoadingSkeleton animation="wave" />
```

## Accessibility

The component includes comprehensive accessibility features:

- **`aria-busy="true"`**: Indicates content is loading
- **`aria-label`**: Provides descriptive label for screen readers
- **`role="status"`**: Announces loading state to assistive technologies
- **Reduced Motion**: Automatically disables animations when user has `prefers-reduced-motion` enabled

```tsx
<LoadingSkeleton 
  ariaLabel="Loading user profile"
  width="full" 
  height="2rem" 
/>
```

## Examples

### Message List Loading

```tsx
<div className="space-y-3">
  <div className="flex justify-start">
    <LoadingSkeleton width="60%" height="4rem" />
  </div>
  <div className="flex justify-end">
    <LoadingSkeleton width="70%" height="3rem" />
  </div>
  <div className="flex justify-start">
    <LoadingSkeleton width="55%" height="5rem" />
  </div>
</div>
```

### Profile Card Loading

```tsx
<div className="border border-gray-200 rounded-lg p-6 space-y-4">
  <div className="flex items-center gap-4">
    <LoadingSkeleton width="4rem" height="4rem" variant="circle" />
    <div className="flex-1 space-y-2">
      <LoadingSkeleton width="60%" height="1.5rem" variant="text" />
      <LoadingSkeleton width="40%" height="1rem" variant="text" />
    </div>
  </div>
  <LoadingSkeleton width="full" height="6rem" />
</div>
```

### Avatar Canvas Loading

```tsx
<div className="max-w-2xl">
  <AvatarLoadingSkeleton />
</div>
```

## Theme Support

The component automatically adapts to light and dark themes:

- **Light Mode**: Gradient from `gray-200` to `gray-300`
- **Dark Mode**: Gradient from `gray-700` to `gray-800`

The shimmer overlay also adjusts opacity for optimal visibility in both themes.

## Performance

- Uses GPU-accelerated CSS animations (`transform`, `opacity`)
- Minimal DOM manipulation
- Efficient rendering with React keys for multiple skeletons
- Respects user's motion preferences for better performance

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- Tailwind CSS v4.0+ required
- Automatic fallback for browsers without `backdrop-filter` support

## Testing

The component includes comprehensive test coverage:

- **Unit Tests**: 32 tests covering all features and edge cases
- **Property-Based Tests**: 5 tests validating accessibility properties
- **Coverage**: 100% of component functionality

Run tests:
```bash
npm test -- components/ui/__tests__/LoadingSkeleton
```

## Related Components

- `Button` - Enhanced button with loading states
- `Input` - Enhanced input with focus effects
- `GlassCard` - Glassmorphism card component

## Design Tokens

The component uses the following design tokens:

- **Colors**: `gray-200`, `gray-300`, `gray-700`, `gray-800`
- **Animations**: `animate-shimmer`, `animate-shimmer-slide`, `animate-pulse`
- **Spacing**: `space-y-3` for multiple skeletons

## Implementation Notes

- The component checks for `prefers-reduced-motion` on mount
- Shimmer overlay is only rendered when animation is `'shimmer'` and motion is not reduced
- Multiple skeletons are wrapped in a container with vertical spacing
- Single skeletons render without a wrapper for cleaner DOM structure

## Future Enhancements

Potential improvements for future versions:

- [ ] Custom gradient colors
- [ ] Configurable animation speed
- [ ] More animation variants
- [ ] Skeleton composition utilities
- [ ] Auto-detection of content dimensions
