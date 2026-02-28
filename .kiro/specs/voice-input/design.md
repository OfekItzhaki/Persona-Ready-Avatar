# Design Document: Voice Input

## Overview

This design document specifies the technical architecture for implementing voice input (speech-to-text) functionality in the avatar client application. The feature enables users to speak to the avatar instead of typing messages, using Azure Speech Service for speech recognition.

### Goals

- Provide seamless voice input integration with the existing chat interface
- Support both push-to-talk and continuous listening modes
- Deliver real-time recognition feedback with low latency
- Ensure accessibility through keyboard controls and screen reader support
- Maintain browser compatibility across Chrome, Edge, and Safari
- Protect user privacy with secure audio transmission and no local storage

### Non-Goals

- Custom speech recognition model training
- Offline speech recognition (requires Azure Speech Service connectivity)
- Voice activity detection (VAD) for automatic speech segmentation
- Multi-language recognition in a single session
- Audio recording/playback of user voice

### Key Design Decisions

1. **Azure Speech Service Integration**: Use Azure Speech SDK for browser environments to leverage cloud-based speech recognition with high accuracy and language support
2. **Microphone Manager Pattern**: Separate microphone access and audio capture concerns from speech recognition logic for better testability and maintainability
3. **Dual Input Modes**: Support both push-to-talk (explicit control) and continuous listening (hands-free) to accommodate different user preferences
4. **Real-time Feedback**: Display interim recognition results within 200ms to provide immediate feedback and improve user confidence
5. **Input Mode Controller**: Centralize input mode switching logic to ensure consistent state management between voice and text input
6. **Browser Audio APIs**: Use Web Audio API for microphone access and audio level visualization
7. **No Local Audio Storage**: Audio data is transmitted directly to Azure Speech Service without local caching to protect user privacy

## Architecture

### System Context

The voice input feature integrates with the existing avatar client application architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     Avatar Client Application                │
│                                                               │
│  ┌──────────────┐         ┌─────────────────────────────┐   │
│  │              │         │                             │   │
│  │ ChatInterface│◄────────┤   VoiceInputService         │   │
│  │              │         │   (Orchestrator)            │   │
│  └──────────────┘         │                             │   │
│                           └─────────────┬───────────────┘   │
│                                         │                   │
│                           ┌─────────────┼───────────────┐   │
│                           │             │               │   │
│                  ┌────────▼──────┐  ┌──▼──────────┐  ┌─▼──────────┐
│                  │ MicrophoneManager│  │SpeechRecognizer│  │InputModeController│
│                  │                │  │                │  │            │
│                  └────────┬───────┘  └──┬─────────────┘  └────────────┘
│                           │             │                              │
└───────────────────────────┼─────────────┼──────────────────────────────┘
                            │             │
                    ┌───────▼─────┐   ┌──▼──────────────┐
                    │ Web Audio   │   │ Azure Speech    │
                    │ API         │   │ Service         │
                    │ (Browser)   │   │ (Cloud)         │
                    └─────────────┘   └─────────────────┘
```

### Component Responsibilities

#### VoiceInputService (Orchestrator)

The central service that coordinates all voice input functionality:

- Initialize and configure Azure Speech SDK
- Manage recognition session lifecycle
- Coordinate between MicrophoneManager, SpeechRecognizer, and InputModeController
- Handle recognition events (interim results, final results, errors)
- Forward recognized text to ChatInterface
- Synchronize speech recognizer language with TTS voice language
- Emit notifications for user feedback

**Key Methods:**

- `initialize(config: AzureSpeechConfig): Promise<void>` - Initialize Azure Speech SDK with credentials
- `startRecognition(mode: 'push-to-talk' | 'continuous'): Promise<void>` - Start a recognition session
- `stopRecognition(): Promise<void>` - Stop the current recognition session
- `updateLanguage(language: string): void` - Update speech recognizer language
- `subscribeToResults(callback: (result: RecognitionResult) => void): () => void` - Subscribe to recognition results

#### MicrophoneManager

Handles microphone access, permissions, and audio capture:

- Request microphone permission from browser
- Initialize audio capture from default microphone
- Monitor microphone availability and connection status
- Provide audio stream to SpeechRecognizer
- Calculate and expose audio input levels for visualization
- Release microphone access when not in use

**Key Methods:**

- `requestPermission(): Promise<PermissionResult>` - Request microphone permission
- `startCapture(): Promise<MediaStream>` - Start audio capture
- `stopCapture(): void` - Stop audio capture and release microphone
- `getAudioLevel(): number` - Get current audio input level (0-100)
- `isAvailable(): boolean` - Check if microphone is available

#### SpeechRecognizer

Wraps Azure Speech SDK for speech recognition:

- Configure Azure Speech SDK with credentials and settings
- Start/stop continuous recognition
- Process audio stream from MicrophoneManager
- Emit interim and final recognition results
- Handle recognition errors and network issues
- Support language configuration changes

**Key Methods:**

- `configure(config: SpeechConfig): void` - Configure speech recognizer
- `startContinuousRecognition(audioStream: MediaStream): Promise<void>` - Start continuous recognition
- `stopContinuousRecognition(): Promise<void>` - Stop continuous recognition
- `onRecognizing(callback: (result: InterimResult) => void): void` - Subscribe to interim results
- `onRecognized(callback: (result: FinalResult) => void): void` - Subscribe to final results
- `onError(callback: (error: RecognitionError) => void): void` - Subscribe to errors

#### InputModeController

Manages switching between voice and text input modes:

- Track current input mode (voice or text)
- Persist input mode preference to local storage
- Coordinate UI state changes when switching modes
- Ensure clean transitions (stop active recognition when switching to text)
- Provide keyboard shortcuts for mode switching

**Key Methods:**

- `setMode(mode: 'voice' | 'text'): void` - Switch input mode
- `getMode(): 'voice' | 'text'` - Get current input mode
- `subscribeToModeChanges(callback: (mode: 'voice' | 'text') => void): () => void` - Subscribe to mode changes

### Data Flow

#### Push-to-Talk Mode

```
User presses voice button
    │
    ▼
InputModeController.setMode('voice')
    │
    ▼
VoiceInputService.startRecognition('push-to-talk')
    │
    ├──► MicrophoneManager.startCapture()
    │        │
    │        ▼
    │    Browser requests microphone permission
    │        │
    │        ▼
    │    MediaStream created
    │
    └──► SpeechRecognizer.startContinuousRecognition(stream)
             │
             ▼
         Azure Speech Service processes audio
             │
             ├──► Interim results (every ~200ms)
             │        │
             │        ▼
             │    VoiceInputService emits interim result
             │        │
             │        ▼
             │    UI displays interim text
             │
             └──► Final result (when phrase complete)
                      │
                      ▼
                  VoiceInputService emits final result
                      │
                      ▼
User releases voice button
    │
    ▼
VoiceInputService.stopRecognition()
    │
    ├──► SpeechRecognizer.stopContinuousRecognition()
    │
    └──► MicrophoneManager.stopCapture()
             │
             ▼
         Final text sent to ChatInterface
```

#### Continuous Listening Mode

```
User clicks voice button
    │
    ▼
VoiceInputService.startRecognition('continuous')
    │
    ├──► MicrophoneManager.startCapture()
    │
    └──► SpeechRecognizer.startContinuousRecognition(stream)
             │
             ▼
         Continuous recognition loop:
             │
             ├──► Interim results → UI updates
             │
             └──► Final results → Sent to ChatInterface
                      │
                      ▼
                  Recognition continues until user clicks stop
                      │
                      ▼
User clicks stop button
    │
    ▼
VoiceInputService.stopRecognition()
    │
    ├──► SpeechRecognizer.stopContinuousRecognition()
    │
    └──► MicrophoneManager.stopCapture()
```

### Error Handling Flow

```
Error occurs (network, permission, synthesis)
    │
    ▼
SpeechRecognizer.onError() or MicrophoneManager error
    │
    ▼
VoiceInputService handles error
    │
    ├──► Stop recognition session
    │
    ├──► Release microphone
    │
    ├──► Emit error notification
    │
    └──► Log error details
             │
             ▼
         UI displays error message with recovery options
             │
             ├──► Retry button (for transient errors)
             │
             └──► Switch to text input button
```

## Components and Interfaces

### VoiceInputService

```typescript
interface VoiceInputService {
  // Initialization
  initialize(config: AzureSpeechConfig): Promise<void>;

  // Recognition control
  startRecognition(mode: RecognitionMode): Promise<void>;
  stopRecognition(): Promise<void>;

  // Configuration
  updateLanguage(language: string): void;

  // Event subscriptions
  subscribeToResults(callback: (result: RecognitionResult) => void): () => void;
  subscribeToErrors(callback: (error: RecognitionError) => void): () => void;

  // State queries
  isRecognizing(): boolean;
  getMode(): RecognitionMode;
}

type RecognitionMode = 'push-to-talk' | 'continuous';

interface AzureSpeechConfig {
  subscriptionKey: string;
  region: string;
  language: string;
}

interface RecognitionResult {
  type: 'interim' | 'final';
  text: string;
  confidence?: number;
  timestamp: number;
}

interface RecognitionError {
  type:
    | 'NETWORK_ERROR'
    | 'PERMISSION_DENIED'
    | 'MICROPHONE_UNAVAILABLE'
    | 'SYNTHESIS_FAILED'
    | 'AUTHENTICATION_ERROR'
    | 'TIMEOUT';
  message: string;
  recoverable: boolean;
}
```

### MicrophoneManager

```typescript
interface MicrophoneManager {
  // Permission management
  requestPermission(): Promise<PermissionResult>;
  checkPermission(): Promise<PermissionState>;

  // Audio capture
  startCapture(): Promise<MediaStream>;
  stopCapture(): void;

  // Status queries
  isAvailable(): boolean;
  isCapturing(): boolean;

  // Audio level monitoring
  getAudioLevel(): number;
  subscribeToAudioLevels(callback: (level: number) => void): () => void;
}

interface PermissionResult {
  granted: boolean;
  error?: string;
}

type PermissionState = 'granted' | 'denied' | 'prompt';
```

### SpeechRecognizer

```typescript
interface SpeechRecognizer {
  // Configuration
  configure(config: SpeechConfig): void;

  // Recognition control
  startContinuousRecognition(audioStream: MediaStream): Promise<void>;
  stopContinuousRecognition(): Promise<void>;

  // Event handlers
  onRecognizing(callback: (result: InterimResult) => void): void;
  onRecognized(callback: (result: FinalResult) => void): void;
  onError(callback: (error: RecognitionError) => void): void;
  onSessionStarted(callback: () => void): void;
  onSessionStopped(callback: () => void): void;

  // State queries
  isRecognizing(): boolean;
}

interface SpeechConfig {
  subscriptionKey: string;
  region: string;
  language: string;
  outputFormat: string;
}

interface InterimResult {
  text: string;
  offset: number;
}

interface FinalResult {
  text: string;
  confidence: number;
  offset: number;
  duration: number;
}
```

### InputModeController

```typescript
interface InputModeController {
  // Mode management
  setMode(mode: InputMode): void;
  getMode(): InputMode;

  // Persistence
  savePreference(): void;
  loadPreference(): InputMode;

  // Event subscriptions
  subscribeToModeChanges(callback: (mode: InputMode) => void): () => void;
}

type InputMode = 'voice' | 'text';
```

### UI Components

#### VoiceInputButton

```typescript
interface VoiceInputButtonProps {
  mode: RecognitionMode;
  isRecognizing: boolean;
  onPress: () => void;
  onRelease: () => void;
  disabled: boolean;
}
```

#### InterimResultDisplay

```typescript
interface InterimResultDisplayProps {
  text: string;
  visible: boolean;
}
```

#### AudioLevelIndicator

```typescript
interface AudioLevelIndicatorProps {
  level: number; // 0-100
  isActive: boolean;
}
```

#### InputModeToggle

```typescript
interface InputModeToggleProps {
  currentMode: InputMode;
  onModeChange: (mode: InputMode) => void;
  disabled: boolean;
}
```

## Data Models

### Recognition Session State

```typescript
interface RecognitionSession {
  id: string;
  mode: RecognitionMode;
  startTime: number;
  endTime?: number;
  status: SessionStatus;
  interimResults: InterimResult[];
  finalResults: FinalResult[];
  errors: RecognitionError[];
}

type SessionStatus = 'starting' | 'active' | 'stopping' | 'stopped' | 'error';
```

### Audio Configuration

```typescript
interface AudioConfig {
  sampleRate: number; // 16000 Hz for Azure Speech Service
  channelCount: number; // 1 (mono)
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}
```

### User Preferences

```typescript
interface VoiceInputPreferences {
  inputMode: InputMode;
  defaultRecognitionMode: RecognitionMode;
  showInterimResults: boolean;
  autoSendOnFinal: boolean;
}
```

## Integration Points

### ChatInterface Integration

The VoiceInputService integrates with the existing ChatInterface component:

1. **Message Submission**: Recognized text is sent to ChatInterface using the same `handleSubmit` method as typed messages
2. **Input Area Replacement**: When voice mode is active, the InputArea component is hidden and replaced with voice input controls
3. **Message History**: Recognized messages appear in the MessageList with the same formatting as typed messages
4. **Offline Support**: Voice input respects the offline queue system - if offline, recognized text is queued for later delivery

### TTS Service Synchronization

Voice input language must match the current TTS voice language:

1. **Language Detection**: VoiceInputService subscribes to language changes from the TTS system
2. **Automatic Reconfiguration**: When TTS language changes, SpeechRecognizer is reconfigured with the new language
3. **Voice Selection**: Use LanguageVoiceMapper to determine the appropriate speech recognition language based on the selected TTS voice

### Preferences Service Integration

Voice input preferences are persisted using the existing PreferencesService:

```typescript
interface AudioPreferences {
  // Existing TTS preferences
  volume: number;
  isMuted: boolean;
  playbackSpeed: number;
  speechRate: number;
  speechPitch: number;

  // New voice input preferences
  voiceInputMode: InputMode;
  defaultRecognitionMode: RecognitionMode;
  showInterimResults: boolean;
}
```

### Notification Service Integration

Voice input uses NotificationService for user feedback:

- Permission denied errors
- Network connectivity issues
- Recognition failures
- Session timeout notifications

## Browser Compatibility

### Supported Browsers

| Browser | Version | Support Level | Notes                                       |
| ------- | ------- | ------------- | ------------------------------------------- |
| Chrome  | 90+     | Full          | Best performance, all features supported    |
| Edge    | 90+     | Full          | Chromium-based, same as Chrome              |
| Safari  | 14+     | Full          | Requires user gesture for microphone access |
| Firefox | -       | Not Supported | Azure Speech SDK browser support limited    |

### Feature Detection

```typescript
function checkBrowserCompatibility(): CompatibilityResult {
  const checks = {
    mediaDevices: 'mediaDevices' in navigator,
    getUserMedia: 'getUserMedia' in navigator.mediaDevices,
    audioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
    mediaRecorder: 'MediaRecorder' in window,
  };

  const isCompatible = Object.values(checks).every((check) => check);

  return {
    isCompatible,
    checks,
    message: isCompatible
      ? 'Browser supports voice input'
      : 'Browser does not support required audio APIs',
  };
}
```

### Fallback Behavior

When browser compatibility check fails:

1. Display compatibility warning message
2. Disable voice input controls
3. Provide link to supported browsers list
4. Keep text input available as fallback

## Security and Privacy

### Audio Data Handling

1. **No Local Storage**: Audio data is never stored locally - transmitted directly to Azure Speech Service
2. **Encrypted Transmission**: All audio data sent over HTTPS/WSS (WebSocket Secure)
3. **Immediate Release**: Microphone access is released immediately when recognition session ends
4. **No Recording**: Audio is processed in real-time, not recorded to files

### Permission Management

1. **Explicit Permission**: Browser prompts user for microphone permission on first use
2. **Permission Persistence**: Browser remembers permission choice (can be revoked in browser settings)
3. **Permission Verification**: Check permission status before each recognition session
4. **Clear Error Messages**: Explain how to grant permission if denied

### Privacy Notice

Display privacy notice in settings panel:

```
Voice Input Privacy Notice:

When you use voice input, your audio is transmitted to Microsoft Azure Speech Service
for speech recognition. Audio is processed in real-time and is not stored locally on
your device. Microsoft's privacy policy applies to audio processing.

Learn more: [Link to Azure Speech Service Privacy Policy]
```

### Data Minimization

1. **Session-Only Data**: Recognition results are only kept for the duration of the session
2. **No Analytics**: Voice input does not collect usage analytics beyond error logging
3. **User Control**: Users can switch to text input at any time to avoid voice transmission

## Performance Considerations

### Latency Targets

| Metric            | Target  | Measurement                                   |
| ----------------- | ------- | --------------------------------------------- |
| Recognition Start | < 500ms | Time from button press to first audio capture |
| Interim Results   | < 200ms | Time from speech to interim result display    |
| Final Results     | < 1s    | Time from speech end to final result          |
| Mode Switch       | < 100ms | Time to switch between voice and text input   |

### Resource Management

1. **Microphone Release**: Release microphone immediately when not in use to free system resources
2. **Connection Pooling**: Reuse WebSocket connection to Azure Speech Service when possible
3. **Audio Buffer Size**: Use optimal buffer size (512-1024 samples) to balance latency and CPU usage
4. **Throttled Visualization**: Limit audio level visualization to 30 FPS to reduce CPU load

### Memory Management

1. **Session Cleanup**: Dispose of SpeechRecognizer instances after each session
2. **Event Unsubscription**: Properly unsubscribe from all event handlers to prevent memory leaks
3. **MediaStream Cleanup**: Stop all tracks and release MediaStream when session ends

### Network Optimization

1. **Audio Format**: Use compressed audio format (Opus) to reduce bandwidth
2. **Connection Reuse**: Keep WebSocket connection open for continuous listening mode
3. **Timeout Handling**: Implement 60-second timeout for continuous listening to prevent indefinite connections
4. **Retry Logic**: Implement exponential backoff for transient network errors

## Accessibility

### Keyboard Navigation

| Action                      | Keyboard Shortcut      | Description                         |
| --------------------------- | ---------------------- | ----------------------------------- |
| Activate Voice Input        | `Ctrl/Cmd + Shift + V` | Start push-to-talk recording        |
| Toggle Continuous Listening | `Ctrl/Cmd + Shift + L` | Toggle continuous listening mode    |
| Cancel Recognition          | `Escape`               | Stop current recognition session    |
| Switch Input Mode           | `Ctrl/Cmd + Shift + I` | Toggle between voice and text input |

### Screen Reader Support

All voice input controls include proper ARIA attributes:

```typescript
// Voice input button
<button
  aria-label={isRecognizing ? "Stop recording" : "Start voice input"}
  aria-pressed={isRecognizing}
  role="button"
>
  {/* Button content */}
</button>

// Interim results display
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {interimText}
</div>

// Audio level indicator
<div
  role="img"
  aria-label={`Audio level: ${audioLevel}%`}
>
  {/* Visualization */}
</div>

// Input mode toggle
<button
  aria-label={`Switch to ${currentMode === 'voice' ? 'text' : 'voice'} input`}
  aria-pressed={currentMode === 'voice'}
>
  {/* Toggle content */}
</button>
```

### Announcements

Screen reader announcements for key events:

- "Recording started" - When recognition session begins
- "Recording stopped" - When recognition session ends
- "Recognized: [text]" - When final result is received
- "[Error message]" - When recognition error occurs
- "Switched to voice input" / "Switched to text input" - When input mode changes

### Visual Feedback

All state changes include visual feedback that meets WCAG 2.1 Level AA:

1. **Recording State**: Pulsing animation on voice button (not relying on color alone)
2. **Audio Level**: Waveform visualization with sufficient contrast
3. **Error State**: Error icon + text message (not relying on color alone)
4. **Focus Indicators**: Visible focus outline on all interactive elements

### Color Contrast

All UI elements meet WCAG 2.1 Level AA contrast requirements:

- Normal text: 4.5:1 minimum contrast ratio
- Large text: 3:1 minimum contrast ratio
- Interactive elements: 3:1 minimum contrast ratio

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property Reflection

After analyzing all acceptance criteria, I identified several areas where properties can be consolidated to avoid redundancy:

1. **Session Lifecycle Properties**: Properties 3.1, 3.3, 4.1, and 4.4 all relate to starting/stopping recognition sessions. These can be consolidated into comprehensive session lifecycle properties.

2. **Text Forwarding Properties**: Properties 3.4, 4.3, and 8.1 all specify that recognized text should be sent to ChatInterface. These are redundant and can be combined into a single property.

3. **UI State Properties**: Properties 7.2 and 7.3 both specify UI state changes when switching modes. These can be combined into a single mode-switching property.

4. **Persistence Properties**: Properties 7.4 and 7.5 both relate to persisting and restoring input mode. These form a natural round-trip property.

5. **Screen Reader Announcements**: Properties 10.2, 10.3, 10.4, and 10.5 all specify screen reader announcements for different events. These can be consolidated into a single comprehensive announcement property.

6. **Performance Properties**: Properties 14.1-14.5 all specify timing constraints. While each has a different target, they can be grouped as a single comprehensive performance property with multiple timing checks.

After reflection, the following properties provide unique validation value without redundancy:

### Property 1: Microphone Access Lost During Session

For any active recognition session, if microphone access is lost, then the system should notify the user and stop the session.

**Validates: Requirements 1.4**

### Property 2: Microphone Availability Verification

For any recognition session start attempt, the system should verify microphone availability before initializing audio capture.

**Validates: Requirements 1.5**

### Property 3: Language Synchronization

For any TTS voice language configuration, the speech recognizer should be configured with the same language.

**Validates: Requirements 2.2, 2.3**

### Property 4: Push-to-Talk Session Lifecycle

For any voice input button press in push-to-talk mode, a recognition session should start, audio should be captured while the button is held, and the session should stop with finalized transcription when the button is released.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 5: Recognized Text Forwarding

For any finalized speech recognition result (in either push-to-talk or continuous mode), the recognized text should be sent to the ChatInterface.

**Validates: Requirements 3.4, 4.3, 8.1**

### Property 6: Recording Visual Feedback

For any active recognition session, the system should display visual feedback indicating that recording is active.

**Validates: Requirements 3.6, 4.5**

### Property 7: Continuous Listening Session Lifecycle

For any voice input button click in continuous listening mode, a recognition session should start and continue processing audio until the user explicitly stops it.

**Validates: Requirements 4.1, 4.2, 4.4**

### Property 8: Interim Results Display

For any active recognition session, interim recognition results should be displayed in real-time as the user speaks.

**Validates: Requirements 4.6, 5.1**

### Property 9: Interim Results Latency

For any partial recognition result produced by the speech recognizer, the system should update the displayed text within 200 milliseconds.

**Validates: Requirements 5.2, 14.2**

### Property 10: Final Results Replace Interim

For any finalized phrase from the speech recognizer, the system should replace interim results with the final recognized text.

**Validates: Requirements 5.3**

### Property 11: Interim vs Final Visual Distinction

For any displayed recognition result, interim results should be visually distinguished from final results using different text styling.

**Validates: Requirements 5.4**

### Property 12: Audio Level Indicator

For any active recognition session, the system should display a microphone activity indicator showing audio input levels.

**Validates: Requirements 5.5**

### Property 13: Error Recovery Options

For any recognition error that occurs, the system should provide options to retry voice input or switch to text input.

**Validates: Requirements 6.5**

### Property 14: Input Mode UI State Synchronization

For any input mode switch, the system should hide the controls for the previous mode and display the controls for the new mode (text input field for text mode, voice controls for voice mode).

**Validates: Requirements 7.2, 7.3**

### Property 15: Input Mode Persistence Round-Trip

For any input mode selection, if the mode is saved to local storage and the application is reloaded, then the restored mode should match the saved mode.

**Validates: Requirements 7.4, 7.5**

### Property 16: Mode Switching During Active Session

For any active recognition session, the user should be able to switch input modes, and the system should handle the transition gracefully.

**Validates: Requirements 7.6**

### Property 17: Message Format Consistency

For any recognized text sent to ChatInterface, it should be displayed in the same format as typed messages.

**Validates: Requirements 8.2**

### Property 18: Message Processing Flow Consistency

For any recognized text sent to ChatInterface, it should trigger the same message processing flow as typed messages (including validation, sanitization, and API submission).

**Validates: Requirements 8.3**

### Property 19: Conversation History Inclusion

For any recognized text sent to ChatInterface, it should be included in the conversation history.

**Validates: Requirements 8.4**

### Property 20: Whitespace Trimming

For any recognized text, whitespace should be trimmed before sending to ChatInterface.

**Validates: Requirements 8.5**

### Property 21: Escape Key Cancellation

For any active recognition session, pressing the Escape key should cancel the session.

**Validates: Requirements 9.3**

### Property 22: Focus Indicator Visibility

For any voice input control that receives keyboard focus, a visible focus indicator should be displayed.

**Validates: Requirements 9.5**

### Property 23: Tab Navigation Completeness

For all voice input controls, each control should be reachable via Tab key navigation.

**Validates: Requirements 9.6**

### Property 24: ARIA Labels Presence

For all voice input controls, each control should have an appropriate ARIA label describing its purpose.

**Validates: Requirements 10.1**

### Property 25: Screen Reader Announcements

For any recognition session state change (start, stop, interim result, final result, error), the system should announce the event to screen readers using appropriate ARIA attributes.

**Validates: Requirements 10.2, 10.3, 10.4, 10.5**

### Property 26: Input Mode ARIA Indication

For any input mode (voice or text), the system should provide ARIA labels indicating the current mode.

**Validates: Requirements 10.6**

### Property 27: Browser Compatibility Check Before Initialization

For any attempt to initialize the MicrophoneManager, the system should first detect browser compatibility and only proceed if compatible.

**Validates: Requirements 11.3**

### Property 28: Encrypted Audio Transmission

For any audio data transmitted to Azure Speech Service, the connection should use encrypted protocols (HTTPS/WSS).

**Validates: Requirements 12.1**

### Property 29: Immediate Microphone Release

For any recognition session end, the MicrophoneManager should release microphone access immediately.

**Validates: Requirements 12.2**

### Property 30: No Local Audio Storage

For any recognition session, audio data should not be stored or cached locally beyond the session duration.

**Validates: Requirements 12.3**

### Property 31: New Recognizer Instance Per Session

For any recognition session, a new SpeechRecognizer instance should be created at the start.

**Validates: Requirements 13.1**

### Property 32: Recognizer Instance Disposal

For any recognition session end, the SpeechRecognizer instance should be disposed.

**Validates: Requirements 13.2**

### Property 33: Navigation Cleanup

For any navigation away from the chat interface, any active recognition session should be canceled.

**Validates: Requirements 13.3**

### Property 34: Continuous Listening Timeout

For any continuous listening mode session, the session should automatically timeout after 60 seconds.

**Validates: Requirements 13.4**

### Property 35: Timeout Notification

For any session timeout, the system should automatically stop the recognition session and notify the user.

**Validates: Requirements 13.5**

### Property 36: Performance Latency Bounds

For any voice input operation, the system should meet the following latency requirements:

- Recognition session start: < 500ms from user activation
- Interim results display: < 200ms from speech detection
- Final recognition: < 1s from phrase completion
- Text processing and forwarding: < 100ms
- Microphone initialization: < 300ms from permission grant

**Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5**

### Property 37: Session State Visual Feedback

For any recognition session state (idle, recording, processing, error), the system should display appropriate visual feedback using distinct colors and animations.

**Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5**

## Error Handling

### Error Types and Recovery Strategies

#### Permission Errors

**Error**: `PERMISSION_DENIED`

- **Cause**: User denies microphone permission or revokes it
- **Detection**: Browser permission API returns 'denied' status
- **User Message**: "Microphone access denied. Please grant permission in your browser settings to use voice input."
- **Recovery**:
  - Display instructions for granting permission in browser settings
  - Provide "Try Again" button to re-request permission
  - Offer "Switch to Text Input" button as fallback
- **Logging**: Log permission denial with browser type and timestamp

**Error**: `MICROPHONE_UNAVAILABLE`

- **Cause**: No microphone device detected or microphone in use by another application
- **Detection**: `navigator.mediaDevices.enumerateDevices()` returns no audio input devices
- **User Message**: "No microphone detected. Please connect a microphone and try again."
- **Recovery**:
  - Display device connection instructions
  - Provide "Retry" button to check again
  - Offer "Switch to Text Input" button as fallback
- **Logging**: Log device enumeration results

#### Network Errors

**Error**: `NETWORK_ERROR`

- **Cause**: Network connectivity lost during recognition or unable to reach Azure Speech Service
- **Detection**: WebSocket connection failure, timeout, or disconnection
- **User Message**: "Network connection lost. Please check your internet connection and try again."
- **Recovery**:
  - Stop current recognition session
  - Release microphone
  - Provide "Retry" button with exponential backoff
  - Offer "Switch to Text Input" button as fallback
- **Logging**: Log network error details, connection state, and retry attempts

**Error**: `TIMEOUT`

- **Cause**: Recognition session exceeds 60-second timeout in continuous listening mode
- **Detection**: Session duration timer expires
- **User Message**: "Voice input session timed out after 60 seconds. Click to start a new session."
- **Recovery**:
  - Automatically stop recognition session
  - Release microphone
  - Provide "Start New Session" button
- **Logging**: Log session duration and timeout occurrence

#### Authentication Errors

**Error**: `AUTHENTICATION_ERROR`

- **Cause**: Invalid Azure Speech Service credentials or expired subscription
- **Detection**: Azure Speech SDK returns authentication failure
- **User Message**: "Voice input configuration error. Please contact support."
- **Recovery**:
  - Stop recognition session
  - Disable voice input controls
  - Offer "Switch to Text Input" button as fallback
  - Display support contact information
- **Logging**: Log authentication error details (without exposing credentials)

#### Recognition Errors

**Error**: `SYNTHESIS_FAILED`

- **Cause**: Azure Speech Service unable to process audio or recognize speech
- **Detection**: Azure Speech SDK returns recognition failure
- **User Message**: "Speech recognition failed. Please try again."
- **Recovery**:
  - Stop current recognition session
  - Release microphone
  - Provide "Retry" button
  - Offer "Switch to Text Input" button as fallback
- **Logging**: Log recognition error details and audio characteristics

**Error**: `NO_SPEECH_DETECTED`

- **Cause**: No speech detected during recognition session
- **Detection**: Recognition session completes with empty result
- **User Message**: "No speech detected. Please speak clearly and try again."
- **Recovery**:
  - Provide "Try Again" button
  - Display tips for better recognition (speak clearly, reduce background noise)
- **Logging**: Log session duration and audio level statistics

#### Browser Compatibility Errors

**Error**: `BROWSER_NOT_SUPPORTED`

- **Cause**: Browser does not support required Web Audio APIs
- **Detection**: Feature detection fails for MediaDevices, AudioContext, or MediaRecorder
- **User Message**: "Your browser does not support voice input. Please use Chrome, Edge, or Safari."
- **Recovery**:
  - Disable voice input controls
  - Display list of supported browsers with download links
  - Keep text input available
- **Logging**: Log browser type, version, and failed feature checks

### Error Handling Patterns

#### Graceful Degradation

```typescript
async function startVoiceInput(): Promise<void> {
  try {
    // Check browser compatibility first
    const compatibility = checkBrowserCompatibility();
    if (!compatibility.isCompatible) {
      throw new Error('BROWSER_NOT_SUPPORTED');
    }

    // Check microphone availability
    const isAvailable = await microphoneManager.isAvailable();
    if (!isAvailable) {
      throw new Error('MICROPHONE_UNAVAILABLE');
    }

    // Request permission
    const permission = await microphoneManager.requestPermission();
    if (!permission.granted) {
      throw new Error('PERMISSION_DENIED');
    }

    // Start recognition
    await voiceInputService.startRecognition('push-to-talk');
  } catch (error) {
    // Handle error and provide recovery options
    handleVoiceInputError(error);

    // Ensure cleanup
    await cleanupVoiceInput();
  }
}
```

#### Retry with Exponential Backoff

```typescript
async function retryWithBackoff(
  operation: () => Promise<void>,
  maxRetries: number = 3
): Promise<void> {
  let retries = 0;
  let delay = 1000; // Start with 1 second

  while (retries < maxRetries) {
    try {
      await operation();
      return; // Success
    } catch (error) {
      retries++;

      if (retries >= maxRetries) {
        throw error; // Max retries exceeded
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Exponential backoff
      delay *= 2;
    }
  }
}
```

#### Resource Cleanup

```typescript
async function cleanupVoiceInput(): Promise<void> {
  try {
    // Stop recognition if active
    if (voiceInputService.isRecognizing()) {
      await voiceInputService.stopRecognition();
    }

    // Release microphone
    if (microphoneManager.isCapturing()) {
      microphoneManager.stopCapture();
    }

    // Dispose recognizer instance
    if (speechRecognizer) {
      speechRecognizer.dispose();
    }
  } catch (error) {
    // Log cleanup errors but don't throw
    logger.error('Error during voice input cleanup', { error });
  }
}
```

### Error Logging

All errors should be logged with structured data for debugging:

```typescript
interface ErrorLog {
  timestamp: string;
  errorType: string;
  errorMessage: string;
  component: string;
  context: {
    sessionId?: string;
    mode?: RecognitionMode;
    duration?: number;
    audioLevel?: number;
    browserInfo?: BrowserInfo;
  };
}
```

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

Together, these approaches provide comprehensive coverage where unit tests catch concrete bugs and property tests verify general correctness.

### Property-Based Testing

#### Framework Selection

Use **fast-check** for property-based testing in TypeScript/JavaScript:

```typescript
import fc from 'fast-check';
```

#### Test Configuration

Each property test should run a minimum of 100 iterations to ensure adequate coverage through randomization:

```typescript
fc.assert(
  fc.property(/* generators */, (/* inputs */) => {
    // Property assertion
  }),
  { numRuns: 100 }
);
```

#### Property Test Examples

**Property 3: Language Synchronization**

```typescript
describe('Voice Input Properties', () => {
  it('Property 3: Language Synchronization - For any TTS voice language, speech recognizer should use same language', () => {
    // Feature: voice-input, Property 3: Language Synchronization

    fc.assert(
      fc.property(
        fc.constantFrom('en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'zh-CN'),
        async (language) => {
          // Configure TTS with language
          await ttsService.setLanguage(language);

          // Initialize voice input
          await voiceInputService.initialize({
            subscriptionKey: 'test-key',
            region: 'test-region',
            language: language,
          });

          // Verify speech recognizer uses same language
          const recognizerLanguage = speechRecognizer.getLanguage();
          expect(recognizerLanguage).toBe(language);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property 15: Input Mode Persistence Round-Trip**

```typescript
it('Property 15: Input Mode Persistence Round-Trip - Saved mode should be restored after reload', () => {
  // Feature: voice-input, Property 15: Input Mode Persistence Round-Trip

  fc.assert(
    fc.property(fc.constantFrom('voice', 'text'), (mode: InputMode) => {
      // Set input mode
      inputModeController.setMode(mode);

      // Save to local storage
      inputModeController.savePreference();

      // Simulate reload by creating new controller instance
      const newController = new InputModeController();

      // Load preference
      const restoredMode = newController.loadPreference();

      // Verify mode matches
      expect(restoredMode).toBe(mode);
    }),
    { numRuns: 100 }
  );
});
```

**Property 20: Whitespace Trimming**

```typescript
it('Property 20: Whitespace Trimming - Recognized text should have whitespace trimmed', () => {
  // Feature: voice-input, Property 20: Whitespace Trimming

  fc.assert(
    fc.property(
      fc.string().map((s) => `  ${s}  `), // Add whitespace around string
      async (textWithWhitespace) => {
        // Simulate recognition result
        const recognitionResult: RecognitionResult = {
          type: 'final',
          text: textWithWhitespace,
          confidence: 0.95,
          timestamp: Date.now(),
        };

        // Process result
        const processedText = voiceInputService.processRecognitionResult(recognitionResult);

        // Verify whitespace is trimmed
        expect(processedText).toBe(textWithWhitespace.trim());
        expect(processedText).not.toMatch(/^\s/);
        expect(processedText).not.toMatch(/\s$/);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 36: Performance Latency Bounds**

```typescript
it('Property 36: Performance Latency Bounds - Operations should meet latency requirements', () => {
  // Feature: voice-input, Property 36: Performance Latency Bounds

  fc.assert(
    fc.property(fc.constantFrom('push-to-talk', 'continuous'), async (mode: RecognitionMode) => {
      // Test recognition session start latency
      const startTime = performance.now();
      await voiceInputService.startRecognition(mode);
      const startLatency = performance.now() - startTime;

      expect(startLatency).toBeLessThan(500); // < 500ms

      // Test interim results latency
      const interimPromise = new Promise<number>((resolve) => {
        const interimStartTime = performance.now();
        voiceInputService.subscribeToResults((result) => {
          if (result.type === 'interim') {
            resolve(performance.now() - interimStartTime);
          }
        });
      });

      // Simulate speech
      await simulateSpeech();

      const interimLatency = await interimPromise;
      expect(interimLatency).toBeLessThan(200); // < 200ms

      // Cleanup
      await voiceInputService.stopRecognition();
    }),
    { numRuns: 100 }
  );
});
```

### Unit Testing

#### Component Tests

**MicrophoneManager Tests**

```typescript
describe('MicrophoneManager', () => {
  let microphoneManager: MicrophoneManager;

  beforeEach(() => {
    microphoneManager = new MicrophoneManager();
  });

  afterEach(() => {
    microphoneManager.stopCapture();
  });

  it('should request microphone permission on first use', async () => {
    // Requirement 1.1
    const mockGetUserMedia = jest.fn().mockResolvedValue({} as MediaStream);
    navigator.mediaDevices.getUserMedia = mockGetUserMedia;

    await microphoneManager.requestPermission();

    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
  });

  it('should display error message when permission denied', async () => {
    // Requirement 1.2
    const mockGetUserMedia = jest.fn().mockRejectedValue(new Error('Permission denied'));
    navigator.mediaDevices.getUserMedia = mockGetUserMedia;

    const result = await microphoneManager.requestPermission();

    expect(result.granted).toBe(false);
    expect(result.error).toContain('Permission denied');
  });

  it('should initialize audio capture when permission granted', async () => {
    // Requirement 1.3
    const mockStream = { id: 'test-stream' } as MediaStream;
    const mockGetUserMedia = jest.fn().mockResolvedValue(mockStream);
    navigator.mediaDevices.getUserMedia = mockGetUserMedia;

    const stream = await microphoneManager.startCapture();

    expect(stream).toBe(mockStream);
    expect(microphoneManager.isCapturing()).toBe(true);
  });

  it('should handle no speech detected edge case', async () => {
    // Requirement 3.5 - Edge case
    const recognitionResult: RecognitionResult = {
      type: 'final',
      text: '',
      confidence: 0,
      timestamp: Date.now(),
    };

    const message = voiceInputService.handleRecognitionResult(recognitionResult);

    expect(message).toContain('No speech detected');
  });
});
```

**SpeechRecognizer Tests**

```typescript
describe('SpeechRecognizer', () => {
  let speechRecognizer: SpeechRecognizer;

  beforeEach(() => {
    speechRecognizer = new SpeechRecognizer();
  });

  afterEach(() => {
    speechRecognizer.dispose();
  });

  it('should initialize with Azure Speech credentials', () => {
    // Requirement 2.1
    const config: SpeechConfig = {
      subscriptionKey: 'test-key',
      region: 'test-region',
      language: 'en-US',
      outputFormat: 'simple',
    };

    speechRecognizer.configure(config);

    expect(speechRecognizer.isConfigured()).toBe(true);
  });

  it('should use continuous recognition mode', () => {
    // Requirement 2.4
    const config: SpeechConfig = {
      subscriptionKey: 'test-key',
      region: 'test-region',
      language: 'en-US',
      outputFormat: 'simple',
    };

    speechRecognizer.configure(config);

    expect(speechRecognizer.getRecognitionMode()).toBe('continuous');
  });

  it('should handle initialization failure edge case', async () => {
    // Requirement 6.1 - Edge case
    const invalidConfig: SpeechConfig = {
      subscriptionKey: '',
      region: '',
      language: 'en-US',
      outputFormat: 'simple',
    };

    await expect(speechRecognizer.configure(invalidConfig)).rejects.toThrow();
  });

  it('should handle network error edge case', async () => {
    // Requirement 6.2 - Edge case
    const mockStream = {} as MediaStream;

    // Simulate network disconnection
    jest.spyOn(global, 'WebSocket').mockImplementation(() => {
      throw new Error('Network error');
    });

    await expect(speechRecognizer.startContinuousRecognition(mockStream)).rejects.toThrow(
      'Network error'
    );
  });
});
```

**InputModeController Tests**

```typescript
describe('InputModeController', () => {
  let inputModeController: InputModeController;

  beforeEach(() => {
    localStorage.clear();
    inputModeController = new InputModeController();
  });

  it('should provide toggle control for input modes', () => {
    // Requirement 7.1
    expect(inputModeController.getMode()).toBeDefined();
    expect(['voice', 'text']).toContain(inputModeController.getMode());
  });

  it('should support browser compatibility check', () => {
    // Requirement 11.1
    const compatibility = checkBrowserCompatibility();

    expect(compatibility).toHaveProperty('isCompatible');
    expect(compatibility).toHaveProperty('checks');
    expect(compatibility).toHaveProperty('message');
  });

  it('should display compatibility warning for unsupported browsers', () => {
    // Requirement 11.2 - Edge case
    // Mock unsupported browser
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
    });

    const compatibility = checkBrowserCompatibility();

    expect(compatibility.isCompatible).toBe(false);
    expect(compatibility.message).toContain('does not support');
  });
});
```

#### Integration Tests

**Voice Input to Chat Interface Integration**

```typescript
describe('Voice Input Integration', () => {
  it('should send recognized text to ChatInterface', async () => {
    // Requirement 8.1
    const mockChatInterface = {
      handleSubmit: jest.fn(),
    };

    const voiceInputService = new VoiceInputService(
      mockAzureSpeechRepository,
      mockMicrophoneManager,
      mockSpeechRecognizer,
      mockChatInterface
    );

    const recognitionResult: RecognitionResult = {
      type: 'final',
      text: 'Hello, avatar!',
      confidence: 0.95,
      timestamp: Date.now(),
    };

    await voiceInputService.handleRecognitionResult(recognitionResult);

    expect(mockChatInterface.handleSubmit).toHaveBeenCalledWith('Hello, avatar!');
  });

  it('should display privacy notice in settings', () => {
    // Requirement 12.4
    const settingsPanel = render(<SettingsPanel />);

    expect(settingsPanel.getByText(/Voice Input Privacy Notice/i)).toBeInTheDocument();
    expect(settingsPanel.getByText(/Azure Speech Service/i)).toBeInTheDocument();
  });

  it('should provide link to Azure privacy policy', () => {
    // Requirement 12.5
    const settingsPanel = render(<SettingsPanel />);

    const privacyLink = settingsPanel.getByRole('link', { name: /privacy policy/i });
    expect(privacyLink).toHaveAttribute('href');
    expect(privacyLink.getAttribute('href')).toContain('azure');
  });
});
```

#### Accessibility Tests

```typescript
describe('Voice Input Accessibility', () => {
  it('should support keyboard shortcut for voice input', () => {
    // Requirement 9.1
    const { container } = render(<VoiceInputButton />);

    fireEvent.keyDown(container, { key: 'v', ctrlKey: true, shiftKey: true });

    expect(voiceInputService.isRecognizing()).toBe(true);
  });

  it('should support keyboard shortcut for continuous listening', () => {
    // Requirement 9.2
    const { container } = render(<VoiceInputButton />);

    fireEvent.keyDown(container, { key: 'l', ctrlKey: true, shiftKey: true });

    expect(voiceInputService.getMode()).toBe('continuous');
  });

  it('should display keyboard shortcuts in help dialog', () => {
    // Requirement 9.4
    const { getByRole } = render(<HelpDialog />);

    expect(getByRole('dialog')).toHaveTextContent('Ctrl+Shift+V');
    expect(getByRole('dialog')).toHaveTextContent('Ctrl+Shift+L');
    expect(getByRole('dialog')).toHaveTextContent('Escape');
  });

  it('should use Azure Speech SDK for browser', () => {
    // Requirement 11.5
    const speechRecognizer = new SpeechRecognizer();

    expect(speechRecognizer.getSdkType()).toBe('azure-speech-sdk-browser');
  });
});
```

### Test Coverage Goals

- **Unit Test Coverage**: Minimum 80% code coverage
- **Property Test Coverage**: All 37 correctness properties implemented
- **Integration Test Coverage**: All major integration points tested
- **Accessibility Test Coverage**: All WCAG 2.1 Level AA requirements verified

### Continuous Integration

All tests should run automatically on:

- Pull request creation
- Commit to main branch
- Nightly builds

Test failures should block merges to main branch.
