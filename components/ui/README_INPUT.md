# Enhanced Input Component

A modern, accessible input field component with focus effects and smooth transitions.

## Features

- **Glowing Border Effect**: Beautiful gradient glow effect on focus (blue to purple)
- **Scale Transition**: Smooth scale animation (1.0 to 1.01) when focused
- **Dynamic Border**: 2px border that changes color on focus (gray to blue)
- **Focus Ring**: 4px focus ring with 20% opacity for clear visual feedback
- **Auto-Resize**: Automatically adjusts height based on content
- **Error States**: Clear error messaging with visual feedback
- **Dark Mode**: Full support for light and dark themes
- **Accessibility**: WCAG AA compliant with proper ARIA attributes

## Requirements

Implements requirements: 8.1, 8.2, 8.3, 8.4, 8.5

## Usage

### Basic Input

```tsx
import { Input } from '@/components/ui/Input';

function MyForm() {
  const [value, setValue] = useState('');

  return (
    <Input
      placeholder="Enter text..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
```

### Input with Label and Helper Text

```tsx
<Input
  label="Email Address"
  placeholder="you@example.com"
  helperText="We'll never share your email"
  required
/>
```

### Input with Validation

```tsx
const [email, setEmail] = useState('');
const [error, setError] = useState('');

const validateEmail = (value: string) => {
  if (!value) {
    setError('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    setError('Please enter a valid email address');
  } else {
    setError('');
  }
};

<Input
  label="Email"
  value={email}
  onChange={(e) => {
    setEmail(e.target.value);
    validateEmail(e.target.value);
  }}
  error={error}
  required
/>
```

### Auto-Resize Input

```tsx
<Input
  label="Message"
  placeholder="Type your message..."
  autoResize
  minRows={2}
  maxRows={8}
  helperText="This input grows as you type"
/>
```

### Disabled Input

```tsx
<Input
  label="Read-only Field"
  value="Cannot edit this"
  disabled
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `autoResize` | `boolean` | `false` | Enable automatic height adjustment based on content |
| `maxRows` | `number` | `10` | Maximum number of rows for auto-resize |
| `minRows` | `number` | `1` | Minimum number of rows for auto-resize |
| `error` | `string` | - | Error message to display below input |
| `helperText` | `string` | - | Helper text to display below input |
| `label` | `string` | - | Label text for the input |
| `required` | `boolean` | `false` | Whether the input is required |
| `disabled` | `boolean` | `false` | Whether the input is disabled |
| `className` | `string` | `''` | Additional CSS classes |

All standard HTML textarea attributes are also supported.

## Focus Effects

When the input receives focus, the following effects are applied:

1. **Glowing Border**: A gradient glow effect (blue to purple) appears behind the input
2. **Scale Transition**: The input smoothly scales to 1.01x
3. **Border Color**: The border changes from gray to blue
4. **Focus Ring**: A 4px ring with 20% opacity appears around the input

These effects are disabled when:
- The input is disabled
- An error is present (error styling takes precedence)

## Auto-Resize Behavior

When `autoResize` is enabled:

1. The input automatically adjusts its height based on content
2. Height is constrained between `minRows` and `maxRows`
3. Transitions are smooth with CSS animations
4. Height calculation respects line height and padding

## Accessibility

The Input component follows WCAG AA guidelines:

- **Keyboard Navigation**: Full keyboard support
- **Focus Indicators**: Clear visual focus indicators
- **ARIA Attributes**: Proper `aria-invalid`, `aria-describedby`, and `aria-label` attributes
- **Error Messaging**: Errors are announced to screen readers with `role="alert"`
- **Label Association**: Labels are properly linked to inputs
- **Required Fields**: Required fields are clearly marked

## Styling

The component uses Tailwind CSS classes and supports:

- Light and dark mode
- Custom className prop for additional styling
- Smooth transitions (200ms ease-in-out)
- GPU-accelerated animations (transform, opacity)

## Examples

See `Input.example.tsx` for comprehensive usage examples including:

- Basic input
- Input with label
- Required input
- Input with validation
- Auto-resize input
- Disabled input
- Multi-line input
- Focus effects demo
- Dark mode support
- Custom styling

## Testing

The component includes comprehensive unit tests covering:

- Basic rendering
- Focus effects (Requirements 8.1, 8.2, 8.3, 8.4)
- Auto-resize functionality (Requirement 8.5)
- Error states
- Disabled states
- Accessibility
- Event handlers
- Styling
- Glow effects

Run tests with:

```bash
npm test -- components/ui/__tests__/Input.test.tsx
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Uses GPU-accelerated properties (transform, opacity)
- Smooth 60fps animations
- Minimal re-renders with proper React optimization
- Efficient auto-resize calculation

## Related Components

- [Button](./Button.tsx) - Enhanced button component
- [GlassCard](./GlassCard.tsx) - Glassmorphism card component
