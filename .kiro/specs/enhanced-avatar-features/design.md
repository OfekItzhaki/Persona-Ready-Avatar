# Design Document: Enhanced Avatar Features

## Overview

This design document specifies the technical architecture for enhancing the Avatar Client application with 56 new requirements covering missing UI components, audio controls, avatar customization, enhanced chat features, performance monitoring, settings management, advanced TTS capabilities, offline support, accessibility, security, and comprehensive testing.

### Design Goals

1. **Maintain Compatibility**: All enhancements must integrate seamlessly with the existing Avatar Client architecture
2. **Follow The Horizon Standard**: Adhere to established architectural principles including dependency injection, separation of concerns, and type safety
3. **Enhance User Experience**: Provide intuitive controls and feedback mechanisms for all new features
4. **Ensure Accessibility**: Meet WCAG AA standards for all new components
5. **Optimize Performance**: Maintain 60 FPS rendering and responsive UI interactions
6. **Enable Testability**: Design components for comprehensive unit, integration, and property-based testing

### Existing Architecture Context

The Avatar Client is built with:
- **Frontend**: Next.js 14 with React 18, TypeScript, Tailwind CSS
- **3D Rendering**: Three.js with react-three-fiber and @react-three/drei
- **State Management**: Zustand for global state
- **Data Fetching**: @tanstack/react-query for API calls with caching
- **TTS**: Azure Neural TTS with viseme synchronization
- **Audio**: Web Audio API for precise playback control
- **Testing**: Vitest with React Testing Library

Key existing components:
- `ChatInterface`: Handles conversation display and message input (to be refactored)
- `AvatarCanvas`: Renders 3D avatar with viseme-driven lip sync
- `useAppStore`: Zustand store managing messages, visemes, and playback state
- `TTSService`: Orchestrates speech synthesis with audio and viseme coordination
- `AudioManager`: Manages Web Audio API playback with precise timing

## Architecture

### High-Level Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      App Layout (Next.js)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │                  │  │                                  │ │
│  │  AvatarCanvas    │  │      ChatInterface               │ │
│  │  (3D Rendering)  │  │  ┌────────────────────────────┐ │ │
│  │                  │  │  │   MessageList (NEW)        │ │ │
│  │  - Avatar Model  │  │  │   - Message Display        │ │ │
│  │  - Viseme Sync   │  │  │   - Search & Filter        │ │ │
│  │  - Expressions   │  │  │   - Edit/Delete/Reactions  │ │ │
│  │                  │  │  └────────────────────────────┘ │ │
│  │                  │  │  ┌────────────────────────────┐ │ │
│  └──────────────────┘  │  │   InputArea (NEW)          │ │ │
│                        │  │   - Text Input             │ │ │
│  ┌──────────────────┐  │  │   - Send Button            │ │ │
│  │ AudioController  │  │  │   - Validation             │ │ │
│  │ (NEW)            │  │  └────────────────────────────┘ │ │
│  │ - Volume         │  └──────────────────────────────────┘ │
│  │ - Mute           │                                        │
│  │ - Speed          │  ┌──────────────────────────────────┐ │
│  │ - Pause/Resume   │  │   SettingsPanel (NEW)            │ │
│  │ - Audio Levels   │  │   - Theme Switching              │ │
│  └──────────────────┘  │   - Audio Quality                │ │
│                        │   - Graphics Quality             │ │
│  ┌──────────────────┐  │   - TTS Controls                 │ │
│  │ AvatarCustomizer │  │   - Preferences                  │ │
│  │ (NEW)            │  └──────────────────────────────────┘ │
│  │ - Skin Tone      │                                        │
│  │ - Eye Color      │  ┌──────────────────────────────────┐ │
│  │ - Hair Color     │  │   PerformanceMonitor (NEW)       │ │
│  │ - Expressions    │  │   - FPS Counter                  │ │
│  └──────────────────┘  │   - Metrics Display              │ │
│                        │   - Network Latency              │ │
│                        └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    State Management Layer                    │
├─────────────────────────────────────────────────────────────┤
│  useAppStore (Zustand) - Extended with new slices:          │
│  - messages (existing)                                       │
│  - visemes (existing)                                        │
│  - playbackState (existing)                                  │
│  - audioPreferences (NEW)                                    │
│  - avatarCustomization (NEW)                                 │
│  - uiPreferences (NEW)                                       │
│  - offlineQueue (NEW)                                        │
│  - performanceMetrics (NEW)                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Existing Services:                                          │
│  - TTSService (Enhanced)                                     │
│  - AudioManager (Enhanced)                                   │
│  - VisemeCoordinator                                         │
│  - NotificationService                                       │
│                                                              │
│  New Services:                                               │
│  - ThemeManager                                              │
│  - PreferencesService                                        │
│  - OfflineQueueService                                       │
│  - PerformanceMonitorService                                 │
│  - ExportImportService                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Repository Layer                          │
├─────────────────────────────────────────────────────────────┤
│  - BrainApiRepository (existing)                             │
│  - AzureSpeechRepository (existing)                          │
│  - LocalStorageRepository (NEW)                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Diagrams

#### Message Send-Receive-Speak Flow

```
User Input → InputArea → Validation → ChatInterface
                                           ↓
                                    useSendMessage (React Query)
                                           ↓
                                    BrainApiRepository
                                           ↓
                                    Brain API (External)
                                           ↓
                                    Response Received
                                           ↓
                        ┌──────────────────┴──────────────────┐
                        ↓                                      ↓
                useAppStore.addMessage              TTSService.synthesizeSpeech
                        ↓                                      ↓
                MessageList Display              AzureSpeechRepository
                                                              ↓
                                                    Azure TTS API
                                                              ↓
                                                    AudioBuffer + Visemes
                                                              ↓
                                        ┌─────────────────────┴─────────────────┐
                                        ↓                                       ↓
                                AudioManager.play                    VisemeCoordinator.start
                                        ↓                                       ↓
                                Web Audio API                        useAppStore.setCurrentViseme
                                        ↓                                       ↓
                                Audio Output                         AvatarCanvas (Lip Sync)
```

#### Settings Change Flow

```
User Interaction → SettingsPanel → PreferencesService
                                           ↓
                        ┌──────────────────┴──────────────────┐
                        ↓                                      ↓
                useAppStore.updatePreferences      LocalStorageRepository.save
                        ↓                                      ↓
                Affected Components                    Browser Local Storage
                (AudioManager, AvatarCanvas, etc.)
                        ↓
                Apply Changes Immediately
```

#### Offline Message Queue Flow

```
Network Offline → User Sends Message → InputArea
                                           ↓
                                    OfflineQueueService.enqueue
                                           ↓
                        ┌──────────────────┴──────────────────┐
                        ↓                                      ↓
                useAppStore.addToQueue          LocalStorageRepository.save
                        ↓                                      ↓
                MessageList (Pending Indicator)     Persist Queue
                        ↓
                Network Online Event
                        ↓
                OfflineQueueService.processQueue
                        ↓
                Send Messages Sequentially
                        ↓
                Update Message Status
```

## Components and Interfaces

### 1. MessageList Component

**Purpose**: Display conversation history with search, filter, edit, delete, and reaction capabilities.

**Props Interface**:
```typescript
interface MessageListProps {
  messages: ChatMessage[];
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReactToMessage?: (messageId: string, reaction: 'thumbs_up' | 'thumbs_down') => void;
  isLoading?: boolean;
  className?: string;
}
```

**Key Features**:
- Virtual scrolling for 100+ messages using `react-window` or `@tanstack/react-virtual`
- Search and filter functionality with debounced input
- Message editing with inline input field
- Message deletion with confirmation dialog
- Reaction buttons (thumbs up/down) on agent messages
- Enhanced timestamps (relative for recent, absolute for old)
- Typing indicator during agent response
- Auto-scroll to latest message
- ARIA labels and keyboard navigation

**State Management**:
- Receives messages from `useAppStore`
- Local state for search query, filter settings, and edit mode
- Optimistic updates for edit/delete operations

**Validation**:
- Edit: Non-empty message content, max 5000 characters
- Delete: Confirmation required
- Search: Debounced to avoid excessive re-renders

### 2. InputArea Component

**Purpose**: Handle message input with validation and submission.

**Props Interface**:
```typescript
interface InputAreaProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}
```

**Key Features**:
- Text input with character counter (shown at 80% of max length)
- Send button with loading state
- Enter to submit, Shift+Enter for newline
- Input validation (non-empty, max length)
- Disabled state during pending requests
- ARIA labels for accessibility
- Contextual placeholder based on agent selection

**Validation Rules**:
- Minimum: 1 character (after trim)
- Maximum: 5000 characters
- Sanitization: Remove HTML tags, prevent XSS

### 3. AudioController Component

**Purpose**: Provide comprehensive audio playback controls.

**Props Interface**:
```typescript
interface AudioControllerProps {
  audioManager: IAudioManager;
  className?: string;
}
```

**Key Features**:
- Volume slider (0-100%) with numeric display
- Mute/unmute toggle button
- Playback speed selector (0.5x, 0.75x, 1.0x, 1.25x, 1.5x, 2.0x)
- Pause/resume button
- Stop button
- Skip button (when queue exists)
- Audio level indicator (waveform visualization)
- All controls keyboard accessible
- Settings persisted to local storage

**State Management**:
- Subscribes to `AudioManager` playback state
- Stores preferences in `useAppStore.audioPreferences`
- Syncs with `LocalStorageRepository`

**Audio Level Visualization**:
- Uses Web Audio API `AnalyserNode` for real-time frequency data
- Canvas-based waveform rendering at 30 FPS
- Smooth animations with `requestAnimationFrame`

### 4. AvatarCustomizer Component

**Purpose**: Enable runtime avatar appearance customization.

**Props Interface**:
```typescript
interface AvatarCustomizerProps {
  onCustomizationChange?: (customization: AvatarCustomization) => void;
  className?: string;
}

interface AvatarCustomization {
  skinTone: string;
  eyeColor: string;
  hairColor: string;
  expression?: 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry';
}
```

**Key Features**:
- Color swatches for skin tone (6+ options)
- Color swatches for eye color (8+ options)
- Color swatches for hair color (8+ options)
- Expression trigger buttons (5 emotions)
- Real-time preview on avatar
- Settings persisted to local storage
- Smooth color transitions (300ms)
- Expression animations with auto-return to neutral

**Implementation Details**:
- Updates Three.js material properties directly
- Uses `material.color.set()` for color changes
- Blendshape animations for expressions
- Disabled during active speech (visemes take priority)

### 5. SettingsPanel Component

**Purpose**: Centralized settings management interface.

**Props Interface**:
```typescript
interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}
```

**Sections**:
1. **Audio Settings**
   - Volume, mute, playback speed
   - Speech rate, pitch
   - Audio quality presets (Low 16kHz, Medium 24kHz, High 48kHz)

2. **Graphics Settings**
   - Quality presets (Low, Medium, High, Ultra)
   - Post-processing effects toggle
   - Shadow quality

3. **Appearance Settings**
   - Theme selector (Light, Dark, System)
   - Avatar customization
   - High contrast mode

4. **Accessibility Settings**
   - Keyboard shortcuts reference
   - Screen reader optimizations
   - Focus indicators

**Key Features**:
- Modal dialog with backdrop
- Tabbed sections for organization
- Immediate application of changes (no save button)
- Reset to defaults per section
- Clear all data option
- Keyboard navigation and focus trap
- ARIA labels throughout

### 6. PerformanceMonitor Component

**Purpose**: Display real-time performance metrics.

**Props Interface**:
```typescript
interface PerformanceMonitorProps {
  visible?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  className?: string;
}
```

**Metrics Displayed**:
- FPS (color-coded: green ≥60, yellow 30-59, red <30)
- Average FPS (last 60 frames)
- Frame render time (ms)
- Memory usage (if available)
- Draw calls per frame
- Triangle count
- Brain API latency (last 10 requests)
- Azure TTS latency (last 10 requests)

**Key Features**:
- Toggle visibility with Ctrl+Shift+P
- Expand/collapse for detailed metrics
- Non-intrusive corner overlay
- Updates every second (FPS) or per request (latency)
- Persisted visibility state

**Implementation**:
- Uses `useFrame` hook for FPS calculation
- Performance API for memory and timing
- Three.js renderer info for draw calls and triangles
- Request interceptors for API latency tracking



## Data Models

### Extended Zustand Store Schema

```typescript
// Existing state (from useAppStore.ts)
interface ExistingAppState {
  selectedAgentId: string | null;
  messages: ChatMessage[];
  currentViseme: VisemeData | null;
  playbackState: PlaybackState;
  notifications: Notification[];
}

// New state slices to be added
interface AudioPreferences {
  volume: number; // 0-100
  isMuted: boolean;
  playbackSpeed: number; // 0.5-2.0
  speechRate: number; // 0.5-2.0
  speechPitch: number; // -50 to +50
  audioQuality: 'low' | 'medium' | 'high';
}

interface AvatarCustomization {
  skinTone: string; // hex color
  eyeColor: string; // hex color
  hairColor: string; // hex color
  currentExpression: 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry' | null;
}

interface UIPreferences {
  theme: 'light' | 'dark' | 'system';
  graphicsQuality: 'low' | 'medium' | 'high' | 'ultra';
  performanceMonitorVisible: boolean;
  performanceMonitorExpanded: boolean;
  highContrastMode: boolean;
}

interface OfflineQueueItem {
  id: string;
  agentId: string;
  message: string;
  timestamp: Date;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  retryCount: number;
}

interface PerformanceMetrics {
  fps: number;
  averageFps: number;
  frameTime: number;
  memoryUsage: number | null;
  drawCalls: number;
  triangles: number;
  brainApiLatency: number[];
  ttsLatency: number[];
}

// Extended ChatMessage with new fields
interface EnhancedChatMessage extends ChatMessage {
  edited?: boolean;
  editedAt?: Date;
  reaction?: 'thum