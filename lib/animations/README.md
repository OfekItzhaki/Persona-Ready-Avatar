# Animation System

A comprehensive animation system that orchestrates smooth transitions, micro-interactions, and loading states throughout the application using the Web Animations API.

## Features

- **GPU-Accelerated**: Only animates `transform` and `opacity` properties for optimal performance
- **Performance Monitoring**: Automatically tracks frame rates and reduces complexity when needed
- **Accessibility**: Respects `prefers-reduced-motion` user preference
- **Conflict Resolution**: Automatically cancels conflicting animations on the same properties
- **Automatic Cleanup**: Cleans up animations when components unmount
- **Type-Safe**: Full TypeScript support with comprehensive type definitions

## Installation

The animation system is already integrated into the project. Import from `@/lib/animations`:

```typescript
import { orchestrateAnimation, fadeIn, slideIn } from '@/lib/animations';
```

## Basic Usage

### Using Utility Functions

The easiest way to use animations is through the provided utility functions:

```typescript
import { fadeIn, slideIn, scale } from '@/lib/animations';

// Fade in an element
const [promise, cleanup] = fadeIn(element);
await promise; // Wait for animation to complete

// Slide in from the right
const [promise, cleanup] = slideIn(element, 'right');

// Scale with fade
const [promise, cleanup] = scale(element, 0.95, 1, true);
```

### Custom Animations

For custom animations, use `orchestrateAnimation`:

```typescript
import { orchestrateAnimation } from '@/lib/animations';

const [promise, cleanup] = orchestrateAnimation(
  element,
  [
    { opacity: 0, transform: 'translateY(-20px)' },
    { opacity: 1, transform: 'translateY(0)' }
  ],
  {
    name: 'slideDown',
    duration: 300,
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    fillMode: 'forwards'
  }
);

// Wait for animation to complete
await promise;

// Clean up if needed (automatic on component unmount)
cleanup();
```

## React Integration

### Using the Hook

```typescript
import { useAnimation } from '@/lib/animations/useAnimation';

function MyComponent() {
  const { elementRef, animate, cancelAnimations } = useAnimation();

  useEffect(() => {
    if (elementRef.current) {
      animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { name: 'fadeIn', duration: 300, easing: 'ease-out' }
      );
    }
  }, [animate]);

  return <div ref={elementRef}>Content</div>;
}
```

### Mount Animations

```typescript
import { useAnimationOnMount } from '@/lib/animations/useAnimation';

function MyComponent() {
  const ref = useAnimationOnMount(
    [{ opacity: 0 }, { opacity: 1 }],
    { name: 'fadeIn', duration: 300, easing: 'ease-out' }
  );

  return <div ref={ref}>Content</div>;
}
```

## Available Utility Functions

### `fadeIn(element, duration?)`
Fades an element in from 0 to 1 opacity.

### `fadeOut(element, duration?)`
Fades an element out from 1 to 0 opacity.

### `slideIn(element, direction, distance?, duration?)`
Slides an element in from a direction ('left', 'right', 'top', 'bottom').

### `scale(element, from?, to?, withFade?, duration?)`
Scales an element with optional fade effect.

### `pulse(element, minOpacity?, maxOpacity?, duration?)`
Creates an infinite pulsing animation (useful for loading indicators).

### `animateMessageEntry(element, isUser, duration?)`
Animates a message bubble entering the chat (slides from appropriate direction with fade and scale).

### `cleanupAnimations(element)`
Cancels all active animations on an element.

## Animation Configuration

```typescript
interface AnimationConfig {
  name: string;              // Animation identifier
  duration: number;          // Duration in milliseconds
  easing: string;            // CSS timing function
  delay?: number;            // Delay before starting (ms)
  iterations?: number | 'infinite'; // Number of iterations
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}
```

## Easing Presets

```typescript
import { ANIMATION_EASINGS } from '@/lib/animations';

ANIMATION_EASINGS.linear      // 'linear'
ANIMATION_EASINGS.easeIn       // 'ease-in'
ANIMATION_EASINGS.easeOut      // 'ease-out'
ANIMATION_EASINGS.easeInOut    // 'ease-in-out'
ANIMATION_EASINGS.spring       // 'cubic-bezier(0.34, 1.56, 0.64, 1)'
ANIMATION_EASINGS.smooth       // 'cubic-bezier(0.4, 0.0, 0.2, 1)'
```

## Duration Presets

```typescript
import { ANIMATION_DURATIONS } from '@/lib/animations';

ANIMATION_DURATIONS.fast    // 150ms
ANIMATION_DURATIONS.normal  // 300ms
ANIMATION_DURATIONS.slow    // 500ms
```

## Performance Monitoring

The animation system automatically monitors performance and reduces complexity when frame rates drop below 30fps:

```typescript
import { measureAnimationPerformance } from '@/lib/animations';

const metrics = await measureAnimationPerformance(async () => {
  // Your animation code here
});

console.log(metrics.averageFps);  // Average frame rate
console.log(metrics.minFps);      // Minimum frame rate
console.log(metrics.droppedFrames); // Number of dropped frames
```

## Accessibility

The animation system automatically respects the user's `prefers-reduced-motion` setting. When enabled, animations are disabled or significantly reduced.

```typescript
import { prefersReducedMotion } from '@/lib/animations';

if (prefersReducedMotion()) {
  // User prefers reduced motion
  // Animations will be automatically disabled
}
```

## Best Practices

### ✅ DO

- Use GPU-accelerated properties (`transform`, `opacity`)
- Clean up animations on component unmount (automatic with hooks)
- Use appropriate durations (150-500ms for UI transitions)
- Respect `prefers-reduced-motion` (automatic)
- Use semantic animation names for debugging

### ❌ DON'T

- Animate layout-triggering properties (`width`, `height`, `top`, `left`, `margin`, `padding`)
- Create animations longer than 1 second for UI interactions
- Ignore performance metrics
- Forget to handle animation cleanup

## Validation

The animation system validates configurations and keyframes before applying them:

```typescript
import { validateAnimationConfig, validateKeyframes } from '@/lib/animations';

// Throws error if invalid
validateAnimationConfig(config);
validateKeyframes(keyframes);
```

## Browser Support

The animation system requires the Web Animations API, which is supported in:

- Chrome 36+
- Firefox 48+
- Safari 13.1+
- Edge 79+

Check support at runtime:

```typescript
import { supportsWebAnimations } from '@/lib/animations';

if (!supportsWebAnimations()) {
  // Fallback to CSS animations or no animations
}
```

## Examples

### Message Entry Animation

```typescript
import { animateMessageEntry } from '@/lib/animations';

function MessageBubble({ message, isUser }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const [promise, cleanup] = animateMessageEntry(ref.current, isUser);
      return cleanup;
    }
  }, [isUser]);

  return <div ref={ref}>{message.content}</div>;
}
```

### Loading Indicator

```typescript
import { pulse } from '@/lib/animations';

function LoadingDot() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const cleanup = pulse(ref.current, 0.3, 1, 1000);
      return cleanup;
    }
  }, []);

  return <div ref={ref} className="w-2 h-2 bg-blue-500 rounded-full" />;
}
```

### Hover Effect

```typescript
import { orchestrateAnimation } from '@/lib/animations';

function HoverCard() {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (ref.current) {
      orchestrateAnimation(
        ref.current,
        [{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }],
        { name: 'scaleUp', duration: 200, easing: 'ease-out', fillMode: 'forwards' }
      );
    }
  };

  const handleMouseLeave = () => {
    if (ref.current) {
      orchestrateAnimation(
        ref.current,
        [{ transform: 'scale(1.05)' }, { transform: 'scale(1)' }],
        { name: 'scaleDown', duration: 200, easing: 'ease-in', fillMode: 'forwards' }
      );
    }
  };

  return (
    <div
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      Hover me!
    </div>
  );
}
```

## Troubleshooting

### Animations not working

1. Check browser support: `supportsWebAnimations()`
2. Verify element is in the DOM
3. Check console for validation errors
4. Ensure you're using GPU-accelerated properties

### Performance issues

1. Check frame rate: Use `measureAnimationPerformance()`
2. Reduce animation complexity
3. Shorten animation duration
4. Limit number of simultaneous animations

### Animations not cleaning up

1. Use React hooks for automatic cleanup
2. Call cleanup function returned by animation utilities
3. Use `cleanupAnimations(element)` on unmount

## API Reference

See the TypeScript definitions in `types.ts` for complete API documentation.
