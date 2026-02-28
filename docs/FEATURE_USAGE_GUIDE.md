# Avatar Client - Feature Usage Guide

Welcome to the Avatar Client! This guide will help you understand and use all the features available in the application.

**Quick Access**: Press `Ctrl+Shift+H` (Windows/Linux) or `Cmd+Shift+H` (Mac) to open this guide anytime.

---

## Table of Contents

1. [Audio Controls](#audio-controls)
2. [Avatar Customization](#avatar-customization)
3. [Message Operations](#message-operations)
4. [Conversation Management](#conversation-management)
5. [Settings Panel](#settings-panel)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Performance Monitoring](#performance-monitoring)
8. [Offline Mode](#offline-mode)

---

## Audio Controls

The Audio Controller provides comprehensive control over the avatar's speech output.

### Volume Control

- **Location**: Audio control panel (left side of interface)
- **Adjust Volume**: Use the volume slider to set audio level from 0% to 100%
- **Keyboard**: Use arrow keys (↑/↓) when the slider is focused
- **Persistence**: Your volume setting is automatically saved

### Mute/Unmute

- **Toggle Mute**: Click the speaker icon button
- **Keyboard**: Press `Space` or `Enter` when the mute button is focused
- **Visual Indicator**: Icon changes to show mute status (🔇 when muted, 🔊 when unmuted)
- **Behavior**: Muting preserves your volume level; unmuting restores it

### Playback Speed

- **Location**: Speed selector dropdown in audio controls
- **Options**: 0.5x, 0.75x, 1.0x (normal), 1.25x, 1.5x, 2.0x
- **Usage**: Select your preferred speed from the dropdown
- **Keyboard**: Use arrow keys (↑/↓) to navigate options when focused
- **Note**: This affects playback speed, not the speech synthesis rate

### Pause and Resume

- **Pause Speech**: Click the pause button (⏸) during playback
- **Resume Speech**: Click the play button (▶) to continue from where you paused
- **Keyboard**: Press `Space` or `Enter` when the button is focused
- **Avatar Behavior**: Avatar freezes lip movements when paused

### Stop and Skip

- **Stop**: Click the stop button (⏹) to cancel current speech
- **Skip**: Click the skip button (⏭) to move to the next queued message
- **Availability**: Skip button only appears when multiple messages are queued

### Audio Level Indicator

- **Location**: Visual waveform display in audio controls
- **Purpose**: Shows real-time audio activity
- **Behavior**: Animates during speech, shows flat line when idle
- **Accessibility**: Includes ARIA labels for screen readers

---

## Avatar Customization

Personalize your avatar's appearance with various customization options.

### Accessing Customization

- **Location**: Avatar customization panel (typically on the left side)
- **Sections**: Skin tone, eye color, hair color, and expressions

### Skin Tone

- **Options**: 6+ preset skin tone swatches
- **Usage**: Click on a color swatch to apply
- **Effect**: Changes avatar's skin material in real-time
- **Transition**: Smooth color transition over 300ms

### Eye Color

- **Options**: 8+ preset eye color swatches
- **Usage**: Click on a color swatch to apply
- **Effect**: Updates avatar's eye material while preserving cornea effects
- **Features**: Maintains realistic eye wetness and refraction

### Hair Color

- **Options**: 8+ preset hair color swatches
- **Usage**: Click on a color swatch to apply
- **Effect**: Changes hair material while preserving highlights
- **Note**: Only available if avatar model includes hair geometry

### Manual Expressions

- **Available Expressions**: Neutral, Happy, Sad, Surprised, Angry
- **Usage**: Click an expression button to trigger
- **Duration**: Expression displays for 2 seconds then returns to neutral
- **Keyboard**: Press `Space` or `Enter` when button is focused
- **Limitation**: Disabled during active speech (visemes take priority)

### Persistence

All customization choices are automatically saved to your browser and restored when you return.

---

## Message Operations

Manage your conversation with powerful message editing and organization features.

### Editing Messages

- **Availability**: Your 5 most recent messages
- **Activate**: Hover over a message and click the edit button (✏️)
- **Edit Mode**: Message text becomes editable
- **Save**: Click the save button (✓) or press `Enter`
- **Cancel**: Click the cancel button (✗) or press `Escape`
- **Indicator**: Edited messages show an "edited" label with timestamp
- **Validation**: Messages must not be empty and under 5000 characters

### Deleting Messages

- **Activate**: Hover over any message and click the delete button (🗑️)
- **Confirmation**: A dialog appears asking you to confirm
- **Keyboard**: Navigate with `Tab`, confirm with `Enter`, cancel with `Escape`
- **Scope**: Can delete both user and agent messages
- **Effect**: Message is permanently removed from conversation

### Message Search

- **Location**: Search bar above message list
- **Usage**: Type your search query
- **Behavior**: 
  - Case-insensitive search
  - Matches are highlighted in yellow
  - Shows count of matching messages
  - Debounced for smooth performance
- **Clear**: Click the X button or press `Escape`
- **No Results**: Displays "No messages found" when no matches

### Message Filtering

- **Location**: Filter dropdown next to search bar
- **Options**: All messages, User only, Agent only
- **Usage**: Select filter to show only messages from that role
- **Combination**: Works together with search functionality

### Message Reactions

- **Availability**: Agent messages only
- **Options**: Thumbs up (👍) or thumbs down (👎)
- **Activate**: Hover over agent message to reveal reaction buttons
- **Usage**: Click a reaction button to add your feedback
- **Change**: Click a different reaction to change your feedback
- **Remove**: Click the same reaction again to remove it
- **Keyboard**: Press `Space` or `Enter` when button is focused
- **Export**: Reactions are included in conversation exports

### Typing Indicator

- **Appearance**: Animated "..." appears when agent is processing
- **Location**: Displays as a temporary agent message
- **Accessibility**: Announces "Agent is typing" to screen readers
- **Removal**: Replaced by actual response or removed on error

### Enhanced Timestamps

- **Recent Messages**: Shows relative time ("just now", "2 minutes ago", "1 hour ago")
- **Older Messages**: Shows absolute time ("Jan 15, 2:30 PM")
- **Tooltip**: Hover over any timestamp to see full date and time
- **Updates**: Relative timestamps update every minute
- **Locale**: Respects your system's locale settings

---

## Conversation Management

Export, import, and manage your conversation history.

### Exporting Conversations

- **Location**: Export button in chat interface toolbar
- **Formats**: 
  - JSON (includes all metadata, reactions, timestamps)
  - Plain text (readable format)
- **Filename**: Automatically includes timestamp (e.g., `conversation-2024-01-15-143022.json`)
- **Content**: Includes all messages in chronological order
- **Availability**: Disabled when conversation is empty
- **Keyboard**: Press `Space` or `Enter` when button is focused

### Importing Conversations

- **Location**: Import button in chat interface toolbar
- **Supported Formats**: JSON and plain text
- **Process**:
  1. Click import button
  2. Select file from your computer
  3. Choose to replace current conversation or append to it
  4. Conversation loads with original timestamps
- **Validation**: Invalid files show error notification
- **Error Handling**: Displays clear error messages for unsupported formats

### Conversation Limits

- **In-Memory**: Up to 500 messages stored in memory
- **Archival**: Older messages automatically archived to local storage
- **Performance**: Virtual scrolling maintains smooth performance with 100+ messages

---

## Settings Panel

Centralized control for all application preferences.

### Opening Settings

- **Location**: Settings button (⚙️) in main interface
- **Keyboard Shortcut**: `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac)
- **Close**: Click X button, press `Escape`, or click outside panel

### Audio Settings

#### Speech Rate
- **Range**: 0.5x to 2.0x
- **Effect**: Controls how fast the avatar speaks (synthesis level)
- **Default**: 1.0x (normal speed)
- **Note**: Different from playback speed (which affects already-synthesized audio)

#### Speech Pitch
- **Range**: -50% to +50%
- **Effect**: Adjusts voice pitch higher or lower
- **Default**: 0% (natural pitch)
- **Reset**: Click reset button to return to default

#### Audio Quality
- **Presets**:
  - Low (16kHz) - Lower bandwidth, reduced fidelity
  - Medium (24kHz) - Balanced quality and bandwidth
  - High (48kHz) - Maximum quality, higher bandwidth
- **Bandwidth**: Estimated usage shown for each preset
- **Effect**: Applies to subsequent TTS requests
- **Warning**: Low quality shows fidelity warning

### Graphics Settings

#### Quality Presets
- **Low**: Disables post-processing, reduces shadow quality
- **Medium**: Basic post-processing, medium shadows
- **High**: All post-processing effects, high-quality shadows
- **Ultra**: Maximum quality settings
- **Effect**: Changes apply immediately to 3D rendering
- **Performance**: Lower settings improve FPS on slower devices

### Appearance Settings

#### Theme
- **Options**:
  - Light: Light color scheme
  - Dark: Dark color scheme
  - System: Matches your operating system preference
- **Contrast**: All themes maintain WCAG AA contrast ratios
- **Transition**: Smooth CSS transitions between themes

#### High Contrast Mode
- **Purpose**: Maximum contrast for visual accessibility
- **Effect**: Uses high-contrast colors while remaining comfortable
- **Accessibility**: Helps users with visual impairments

### Accessibility Settings

#### Keyboard Shortcuts
- **View**: Displays complete keyboard shortcuts reference
- **Customization**: Currently uses standard shortcuts

#### Screen Reader Optimizations
- **Toggle**: Enable/disable screen reader enhancements
- **Features**: Enhanced ARIA labels and announcements
- **Compatibility**: Tested with NVDA and JAWS

#### Focus Indicators
- **Toggle**: Show/hide visible focus indicators
- **Purpose**: Helps keyboard navigation users see current focus
- **Recommendation**: Keep enabled for accessibility

### Data Management

#### Clear All Data
- **Location**: Bottom of settings panel
- **Effect**: Removes all stored preferences and conversation history
- **Warning**: Action cannot be undone
- **Confirmation**: Requires confirmation before proceeding

#### Reset to Defaults
- **Location**: Each settings section has a reset button
- **Effect**: Restores that section's settings to default values
- **Scope**: Only affects the specific section

---

## Keyboard Shortcuts

Master these shortcuts for efficient navigation and control.

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+H` / `Cmd+Shift+H` | Open this help guide |
| `Ctrl+,` / `Cmd+,` | Open settings panel |
| `Ctrl+Shift+P` / `Cmd+Shift+P` | Toggle performance monitor |
| `Escape` | Close modals and dialogs |
| `Tab` | Navigate to next interactive element |
| `Shift+Tab` | Navigate to previous interactive element |

### Message Input

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | Insert newline |

### Message List

| Shortcut | Action |
|----------|--------|
| `Escape` | Clear search / Cancel edit |
| `Enter` | Save edited message |

### Audio Controls

| Shortcut | Action |
|----------|--------|
| `Space` / `Enter` | Activate focused button (mute, pause, etc.) |
| `↑` / `↓` | Adjust volume slider |
| `←` / `→` | Navigate speed selector options |

### Settings Panel

| Shortcut | Action |
|----------|--------|
| `Escape` | Close settings panel |
| `Tab` | Navigate between settings |
| `↑` / `↓` | Adjust sliders |
| `Space` / `Enter` | Toggle switches and buttons |

### Accessibility

| Shortcut | Action |
|----------|--------|
| `Tab` | Move focus forward |
| `Shift+Tab` | Move focus backward |
| `Enter` / `Space` | Activate buttons and controls |
| `Escape` | Close dialogs and return focus |
| `Arrow Keys` | Navigate within components |

---

## Performance Monitoring

Track application performance and diagnose issues.

### Toggling Performance Monitor

- **Keyboard**: Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
- **Location**: Appears as overlay in corner of screen
- **Persistence**: Visibility state is saved

### Metrics Displayed

#### FPS (Frames Per Second)
- **Display**: Large number with color coding
- **Colors**:
  - Green: ≥60 FPS (excellent)
  - Yellow: 30-59 FPS (acceptable)
  - Red: <30 FPS (poor)
- **Average**: Shows average over last 60 frames

#### Detailed Metrics (Expanded View)
- **Frame Time**: Milliseconds per frame
- **Memory Usage**: JavaScript heap usage in MB (if available)
- **Draw Calls**: Number of draw calls per frame
- **Triangles**: Number of triangles being rendered

#### Network Latency
- **Brain API**: Round-trip time for conversation requests
- **Azure TTS**: Round-trip time for speech synthesis
- **Colors**:
  - Green: <200ms (fast)
  - Yellow: 200-500ms (moderate)
  - Red: >500ms (slow)
- **Average**: Shows average over last 10 requests

### Expand/Collapse

- **Collapsed**: Shows only FPS
- **Expanded**: Shows all detailed metrics
- **Toggle**: Click the monitor to expand/collapse

---

## Offline Mode

Continue working when network connectivity is lost.

### Offline Detection

- **Indicator**: Persistent banner appears at top when offline
- **Message**: "You are offline. Messages will be queued."
- **Dismissal**: Automatically dismissed when connectivity restored

### Message Queuing

- **Behavior**: Messages sent while offline are added to a queue
- **Visual**: Queued messages show "pending" indicator
- **Persistence**: Queue survives page refreshes (stored locally)
- **Limit**: Maximum 50 messages in queue
- **Warning**: Displays warning when queue limit reached

### Automatic Sending

- **Trigger**: When connectivity is restored
- **Process**: Messages sent sequentially in order
- **Status**: Updates from "pending" to "sent" as processed
- **Errors**: Failed messages show error with retry option

### Limitations While Offline

- **Disabled**: Cannot send new messages when queue is full
- **No TTS**: Speech synthesis unavailable offline
- **No Avatar**: 3D avatar may not load if not cached

---

## Tips and Best Practices

### Performance Tips

1. **Lower Graphics Quality**: If experiencing low FPS, reduce graphics quality in settings
2. **Close Other Tabs**: Free up browser resources for better performance
3. **Clear Cache**: Use "Clear Cache" in settings if memory usage is high
4. **Limit Messages**: Export and clear old conversations to reduce memory usage

### Accessibility Tips

1. **Keyboard Navigation**: Use Tab key to navigate without a mouse
2. **Screen Readers**: Enable screen reader optimizations in settings
3. **High Contrast**: Use high contrast mode for better visibility
4. **Focus Indicators**: Keep focus indicators enabled to see current position

### Audio Tips

1. **Adjust Speech Rate**: Slow down speech if avatar talks too fast
2. **Use Pause**: Pause speech to take notes or process information
3. **Quality vs Bandwidth**: Use lower audio quality on slow connections
4. **Mute Shortcut**: Quickly mute with keyboard for interruptions

### Conversation Management Tips

1. **Regular Exports**: Export important conversations regularly
2. **Use Search**: Find specific information quickly with search
3. **React to Messages**: Provide feedback with reactions for better responses
4. **Edit Mistakes**: Fix typos in recent messages instead of resending

---

## Troubleshooting

### Audio Not Playing

1. Check volume slider is not at 0%
2. Verify mute button is not active
3. Check browser audio permissions
4. Try different audio quality setting
5. Check browser console for TTS errors

### Avatar Not Loading

1. Check network connectivity
2. Verify WebGL is supported in your browser
3. Try reloading the page
4. Check browser console for error messages
5. Ensure graphics drivers are up to date

### Performance Issues

1. Open performance monitor to identify bottleneck
2. Lower graphics quality preset
3. Close other browser tabs
4. Clear browser cache
5. Restart browser

### Messages Not Sending

1. Check network connectivity (look for offline banner)
2. Verify message is not empty
3. Check message length (max 5000 characters)
4. Look for error notifications
5. Try refreshing the page

### Settings Not Saving

1. Check browser allows local storage
2. Verify not in private/incognito mode
3. Check browser storage quota
4. Try clearing all data and reconfiguring
5. Check browser console for errors

---

## Browser Compatibility

### Supported Browsers

- **Chrome**: Version 90 and above
- **Firefox**: Version 88 and above
- **Safari**: Version 14 and above
- **Edge**: Version 90 and above

### Required Features

- WebGL 1.0 (WebGL 2.0 preferred)
- Web Audio API
- Local Storage
- ES6+ JavaScript support

### Compatibility Warnings

The application will display a warning if your browser is not supported or missing required features.

---

## Privacy and Security

### Data Storage

- **Local Only**: All conversation data stored in browser local storage
- **No Cloud**: Conversations not transmitted to analytics services
- **Deletion**: Use "Delete All Data" to remove all stored information

### API Communications

- **HTTPS**: All API requests use secure HTTPS
- **No Credentials**: API keys not stored in local storage
- **Privacy**: No sensitive data logged in production

### Input Validation

- **Sanitization**: All user input sanitized to prevent XSS attacks
- **Validation**: File uploads validated for type and size
- **Length Limits**: Message length limited to 5000 characters

---

## Getting Help

### In-App Help

- Press `Ctrl+Shift+H` / `Cmd+Shift+H` to open this guide anytime
- Check tooltips by hovering over UI elements
- Look for info icons (ℹ️) for contextual help

### Error Messages

- Read error notifications carefully for specific guidance
- Check browser console for detailed error information
- Note error codes when reporting issues

### Additional Resources

- Check the README.md for developer documentation
- Review keyboard shortcuts reference in settings
- Consult browser compatibility documentation

---

## Feedback and Reactions

Your feedback helps improve the Avatar Client experience!

### Providing Feedback

- Use message reactions (👍/👎) on agent responses
- Reactions are stored with your conversation
- Reactions included in conversation exports

### Purpose of Reactions

- Help identify helpful vs unhelpful responses
- Improve future interactions
- Track response quality over time

---

*Last Updated: 2024*
*Version: 1.0*

**Quick Reminder**: Press `Ctrl+Shift+H` (Windows/Linux) or `Cmd+Shift+H` (Mac) to access this guide anytime!
