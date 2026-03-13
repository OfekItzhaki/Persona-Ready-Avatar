# Voice Input Quick Start Guide

## How to Use Voice Input

### Step 1: Select an Agent

1. Look at the top of the page for the **agent dropdown**
2. Click on it to see available agents:
   - General Assistant
   - Technical Expert
   - Creative Writer
   - Technical Support Agent
3. Select the agent you want to chat with

### Step 2: Switch to Voice Mode

1. Look at the **bottom of the chat interface**
2. Find the "Input Mode:" section with two buttons: **[Text]** and **[Voice]**
3. Click the **[Voice]** button to switch to voice mode

### Step 3: Use the Microphone

Once in Voice mode, you'll see:

- A **blue microphone button** (Push to Talk)
- An **audio level indicator** (shows when you're speaking)
- **Mode selector** (Push-to-Talk or Continuous)

#### Push-to-Talk Mode (Default)

1. **Press and hold** the microphone button
2. **Speak** your message while holding
3. **Release** the button to stop recording and send

#### Continuous Mode

1. Click the mode selector and choose "Continuous"
2. **Click once** to start listening
3. Speak your message
4. **Click again** to stop and send

### Keyboard Shortcuts

- **Ctrl+Shift+V** (or Cmd+Shift+V on Mac): Start push-to-talk
- **Ctrl+Shift+L** (or Cmd+Shift+L on Mac): Toggle continuous listening
- **Escape**: Cancel recording

## Visual Feedback

### Button States

- **Blue button**: Ready to record (idle)
- **Red pulsing button**: Currently recording
- **Yellow button**: Processing your speech
- **Red button with warning icon**: Error occurred

### Audio Level Indicator

- Shows a visual bar that moves when you speak
- Helps confirm your microphone is working

## Troubleshooting

### "Loading agents" Error

✅ **FIXED** - Refresh your browser (Ctrl+R or F5)

### Microphone Button Not Visible

1. Make sure you've **selected an agent** first
2. Check that you've **switched to Voice mode** (click the [Voice] button)
3. Verify your browser is supported:
   - Chrome 90+
   - Edge 90+
   - Safari 14+

### Microphone Permission Denied

1. Click the **lock icon** in your browser's address bar
2. Find "Microphone" permissions
3. Change to "Allow"
4. Refresh the page

### No Audio Level Indicator

1. Check your microphone is connected
2. Try speaking louder
3. Check Windows sound settings (right-click speaker icon in taskbar)

### Speech Not Recognized

1. Speak clearly and at a normal pace
2. Reduce background noise
3. Check your internet connection (Azure Speech requires internet)

## Requirements

### Browser Support

- ✅ Chrome 90 or later
- ✅ Microsoft Edge 90 or later
- ✅ Safari 14 or later
- ❌ Firefox (not supported)

### System Requirements

- Working microphone
- Internet connection (for Azure Speech Service)
- Microphone permissions granted

## Tips for Best Results

1. **Speak clearly** - Enunciate your words
2. **Reduce noise** - Find a quiet environment
3. **Normal pace** - Don't speak too fast or too slow
4. **Short messages** - Break long messages into smaller chunks
5. **Check audio level** - Make sure the indicator shows activity when you speak

## Still Having Issues?

1. **Check browser console** (F12) for error messages
2. **Verify Azure credentials** are configured in `.env.local`
3. **Test microphone** in Windows settings or another app
4. **Try text mode** as a fallback

---

**Need Help?** Check the browser console (F12) for detailed error messages.
