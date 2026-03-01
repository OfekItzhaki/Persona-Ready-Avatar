# UI Components

This directory contains the enhanced UI component library for the avatar client application, implementing modern design patterns with accessibility and performance in mind.

## Button Component

The Button component is a modern, accessible button with multiple variants, sizes, and states.

### Features

- **Four Variants**: primary, secondary, ghost, danger
- **Three Sizes**: sm, md, lg
- **Loading State**: Displays spinner and disables interaction
- **Disabled State**: Reduced opacity and non-interactive
- **Icon Support**: Icons can be placed on left or right
- **Full-Width Layout**: Optional full-width display
- **Smooth Transitions**: Hover, active, and focus effects
- **WCAG AA Accessibility**: Focus rings and proper ARIA attributes

### Usage

```tsx
import { Button } from '@/components/ui';

// Basic usage
<Button>Click Me</Button>

// With variant and size
<Button variant="primary" size="lg">
  Large Primary Button
</Button>

// With loading state
<Button loading>Processing...</Button>

// With icon
<Button icon={<SendIcon />} iconPosition="left">
  Send Message
</Button>

// Full width
<Button fullWidth>Full Width Button</Button>

// Disabled
<Button disabled>Disabled Button</Button>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | Visual variant of the button |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size of the button |
| `loading` | `boolean` | `false` | Shows spinner and disables interaction |
| `disabled` | `boolean` | `false` | Disables the button |
| `icon` | `React.ReactNode` | `undefined` | Icon to display in the button |
| `iconPosition` | `'left' \| 'right'` | `'left'` | Position of the icon |
| `fullWidth` | `boolean` | `false` | Whether button should take full width |
| `children` | `React.ReactNode` | required | Button content |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML button type |
| `onClick` | `() => void` | `undefined` | Click handler |
| `className` | `string` | `''` | Additional CSS classes |

### Variants

#### Primary
The main call-to-action button with blue background.

```tsx
<Button variant="primary">Primary Action</Button>
```

#### Secondary
A less prominent button with gray background.

```tsx
<Button variant="secondary">Secondary Action</Button>
```

#### Ghost
A transparent button for subtle actions.

```tsx
<Button variant="ghost">Ghost Action</Button>
```

#### Danger
A red button for destructive actions.

```tsx
<Button variant="danger">Delete</Button>
```

### Sizes

```tsx
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

### States

#### Loading
Shows a spinner and prevents interaction.

```tsx
<Button loading>Loading...</Button>
```

#### Disabled
Reduces opacity and prevents interaction.

```tsx
<Button disabled>Disabled</Button>
```

### Accessibility

The Button component follows WCAG AA accessibility standards:

- **Keyboard Navigation**: Fully keyboard accessible
- **Focus Indicators**: Visible focus rings on all variants
- **ARIA Attributes**: Proper `aria-busy` and `aria-disabled` attributes
- **Screen Reader Support**: Icons are marked with `aria-hidden`
- **Color Contrast**: All variants meet WCAG AA contrast requirements

### Examples

See `Button.example.tsx` for comprehensive usage examples.

### Testing

The Button component has 40 unit tests covering:
- All variants and sizes
- Loading and disabled states
- Icon placement
- Full-width layout
- Accessibility features
- Click handling
- Transitions and effects

Run tests with:
```bash
npm test -- components/ui/__tests__/Button.test.tsx
```

### Requirements

This component satisfies the following requirements from the UI Enhancement spec:
- 4.1: Four variants (primary, secondary, ghost, danger)
- 4.2: Three sizes (sm, md, lg)
- 4.3: Loading state with spinner
- 4.4: Disabled state with reduced opacity
- 4.5: Icon support
- 4.6: Full-width layout option
- 4.7: Smooth hover effects
- 4.8: Active state effects
- 4.9: Visible focus rings
- 4.10: WCAG AA accessibility standards
