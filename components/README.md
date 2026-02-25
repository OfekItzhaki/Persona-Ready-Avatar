# Avatar Client Components

This directory contains the presentation layer components for the Avatar Client application.

## Components

### AvatarCanvas

3D rendering component that displays and animates the avatar using react-three-fiber.

**Features:**
- GLB model loading with blendshapes
- Viseme-driven lip synchronization
- Camera controls (orbit, zoom)
- Responsive canvas sizing
- Loading and error states

**Requirements:** 1.1-1.5, 3.3, 3.4, 3.6, 3.7, 12.4

### PersonaSwitcher

Dropdown component for selecting different AI agents.

**Features:**
- Agent list fetching from Brain API
- Agent name and description display
- Keyboard navigation support
- Loading and error states with retry logic
- ARIA labels for accessibility

**Requirements:** 4.1, 4.2, 4.3, 4.5, 4.6, 13.1, 13.3

### ChatInterface

Message input and conversation history component for user-agent interactions.

**Features:**
- Text input with Enter key submission
- Scrollable conversation history
- Message submission to Brain API
- Optimistic UI updates
- Input disabling during pending requests
- Error handling with notifications
- Auto-scroll to latest message
- Visual distinction between user and agent messages
- ARIA labels for accessibility
- Touch input support for mobile

**Requirements:** 5.1-5.8, 9.3, 9.4, 9.5, 12.5, 13.2

**Usage:**
```tsx
import { ChatInterface } from '@/components/ChatInterface';
import { useAgents } from '@/lib/hooks/useReactQuery';
import { TTSService } from '@/lib/services/TTSService';

function App() {
  const { data: agents } = useAgents();
  const selectedAgent = agents?.[0];
  const ttsService = new TTSService(/* dependencies */);

  return (
    <ChatInterface
      ttsService={ttsService}
      selectedAgent={selectedAgent}
    />
  );
}
```

### TranscriptDisplay

Real-time conversation transcript component that displays messages as they are spoken.

**Features:**
- Real-time message display with timestamps
- Highlighting of currently spoken text
- Visual distinction between user and agent messages
- Auto-scroll to most recent message
- ARIA live region for screen reader announcements

**Requirements:** 9.1-9.5, 13.4, 13.6

### NotificationToast

Global notification system that displays user feedback messages.

**Features:**
- Type-based styling (info, success, warning, error)
- Auto-dismiss after configurable duration
- Manual dismiss button
- ARIA live region for accessibility
- Positioned in corner of viewport (top-right or bottom-right)
- Animated entrance and exit
- Queue management for multiple notifications

**Requirements:** 10.1, 10.2

**Usage:**
```tsx
import { NotificationToast } from '@/components/NotificationToast';
import { NotificationService } from '@/lib/services/NotificationService';

// Add to root layout or providers
function Providers({ children }) {
  return (
    <>
      {children}
      <NotificationToast position="top-right" />
    </>
  );
}

// Trigger notifications from anywhere in the app
NotificationService.getInstance().success('Operation completed!');
NotificationService.getInstance().error('Something went wrong');
NotificationService.getInstance().warning('Please check your input');
NotificationService.getInstance().info('New message received');
```

## Testing

All components have comprehensive unit tests covering:
- Component rendering
- User interactions
- State management
- Error handling
- Accessibility features

Run tests with:
```bash
npm test
```

## Architecture

Components follow these principles:
- **Presentational**: Components focus on UI rendering and delegate logic to services
- **Type-safe**: All props and state are typed with TypeScript interfaces
- **Accessible**: ARIA labels and keyboard navigation support
- **Responsive**: Mobile-friendly with touch input support
- **Testable**: Dependency injection for easy mocking in tests

## State Management

Components use a hybrid state management approach:
- **Server State (React Query)**: API data, caching, background refetching
- **Client State (Zustand)**: UI state, real-time coordination, conversation history

## Styling

Components use Tailwind CSS for styling with:
- Responsive design (mobile-first)
- WCAG AA color contrast ratios
- Consistent spacing and typography
- Hover and focus states for interactive elements
