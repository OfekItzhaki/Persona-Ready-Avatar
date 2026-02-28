# Browser Compatibility Guide

## Overview

This document outlines browser compatibility requirements, known issues, and workarounds for the Avatar Client application.

**Requirement 55: Browser Compatibility**

## Supported Browsers

The Avatar Client supports the following browsers and versions:

| Browser | Minimum Version | Recommended Version |
|---------|----------------|---------------------|
| Google Chrome | 90+ | Latest |
| Mozilla Firefox | 88+ | Latest |
| Safari | 14+ | Latest |
| Microsoft Edge | 90+ | Latest |

## Required Features

The application requires the following browser features:

### Essential Features
- **WebGL 1.0+**: Required for 3D avatar rendering
- **Web Audio API**: Required for TTS audio playback
- **Local Storage**: Required for preferences persistence
- **Fetch API**: Required for API communications
- **ES6 Support**: Required for modern JavaScript features
- **Promise Support**: Required for async operations

### Optional Features
- **WebGL 2.0**: Recommended for better performance
- **IndexedDB**: Recommended for large data storage
- **Service Workers**: Recommended for offline functionality

## Browser Detection

The application automatically detects the browser and version on load. If an unsupported browser or missing features are detected, a warning banner is displayed with:

- Current browser name and version
- List of missing features
- Recommended browsers and versions
- Option to dismiss the warning (stored in session storage)

## Known Browser-Specific Issues

### Safari

#### Issue: Audio Playback Requires User Interaction
**Affected Versions**: All versions  
**Description**: Safari requires user interaction before playing audio due to autoplay policies.  
**Workaround**: The application automatically unlocks audio on first user interaction using `browserWorkarounds.safariAudioUnlock()`.

#### Issue: WebKit Prefix Required for AudioContext
**Affected Versions**: Safari 14.0 - 14.5  
**Description**: Older Safari versions require `webkitAudioContext` instead of `AudioContext`.  
**Workaround**: Automatic fallback implemented in `initializeWebAudioFallback()`.

#### Issue: WebGL Performance
**Affected Versions**: Safari 14.0 - 14.5  
**Description**: WebGL performance may be slower compared to Chrome/Firefox.  
**Workaround**: Use graphics quality presets (Low/Medium) for better performance.

### Firefox

#### Issue: WebGL Context Loss
**Affected Versions**: Firefox 88 - 92  
**Description**: WebGL context may be lost during tab switching or memory pressure.  
**Workaround**: Automatic context loss handling implemented in `browserWorkarounds.firefoxWebGLContextLoss()`.

#### Issue: Audio Playback Speed
**Affected Versions**: Firefox 88 - 90  
**Description**: Audio playback speed changes may not apply immediately.  
**Workaround**: Stop and restart audio when changing playback speed.

### Chrome

#### Issue: Memory Usage with Long Sessions
**Affected Versions**: Chrome 90 - 95  
**Description**: Memory usage may increase during extended sessions with many messages.  
**Workaround**: Use "Clear Cache" option in settings to free memory. Message archiving automatically limits in-memory messages to 500.

### Edge

#### Issue: Chromium-Based Edge
**Affected Versions**: Edge 90+  
**Description**: Edge 90+ is Chromium-based and has similar behavior to Chrome.  
**Note**: Legacy Edge (EdgeHTML) is not supported.

## Fallback Implementations

The application provides fallback implementations for missing features:

### Web Audio API Fallback
```typescript
// Automatically uses webkit prefix if standard API unavailable
if (!window.AudioContext && window.webkitAudioContext) {
  window.AudioContext = window.webkitAudioContext;
}
```

### Fetch API Fallback
```typescript
// Basic XMLHttpRequest fallback for very old browsers
// See lib/utils/browserFallbacks.ts for implementation
```

### RequestAnimationFrame Fallback
```typescript
// Falls back to setTimeout for 60 FPS
const raf = getRequestAnimationFrame();
```

### WebGL Context Fallback
```typescript
// Tries 'webgl' first, then 'experimental-webgl'
const gl = getWebGLContext(canvas);
```

## Testing Across Browsers

### Manual Testing Checklist

Test the following features on each supported browser:

- [ ] 3D avatar loads and renders correctly
- [ ] TTS audio plays with correct volume and speed
- [ ] Lip sync visemes animate smoothly
- [ ] Message input and display work correctly
- [ ] Settings persist across page refreshes
- [ ] Theme switching works correctly
- [ ] Offline mode detects connectivity changes
- [ ] Performance monitor displays accurate metrics
- [ ] Keyboard navigation works throughout the app
- [ ] Screen reader announces content correctly

### Automated Testing

The test suite includes browser compatibility checks:

```bash
# Run tests in different browsers using Vitest
npm run test

# Check for browser-specific issues
npm run test -- browserDetection.test.ts
```

## Performance Considerations

### Chrome 90+
- Excellent WebGL performance
- Good memory management
- Recommended for development

### Firefox 88+
- Good WebGL performance
- May require context loss handling
- Good for testing cross-browser compatibility

### Safari 14+
- Moderate WebGL performance
- Requires audio unlock workaround
- Important for iOS/macOS users

### Edge 90+
- Similar to Chrome (Chromium-based)
- Good overall performance
- Good for Windows users

## Graphics Quality Recommendations

Based on browser and device capabilities:

| Browser | Recommended Quality | Notes |
|---------|-------------------|-------|
| Chrome 100+ | High/Ultra | Best performance |
| Chrome 90-99 | Medium/High | Good performance |
| Firefox 95+ | High | Good performance |
| Firefox 88-94 | Medium | May have context loss |
| Safari 15+ | Medium/High | Good performance |
| Safari 14 | Low/Medium | Limited performance |
| Edge 100+ | High/Ultra | Best performance |
| Edge 90-99 | Medium/High | Good performance |

## Troubleshooting

### Avatar Not Loading
1. Check browser console for WebGL errors
2. Verify WebGL is enabled in browser settings
3. Try reducing graphics quality in settings
4. Update graphics drivers
5. Try a different browser

### Audio Not Playing
1. Check browser console for audio errors
2. Verify audio is not muted in browser
3. Try clicking anywhere on the page (Safari)
4. Check audio permissions in browser settings
5. Try a different browser

### Performance Issues
1. Reduce graphics quality in settings
2. Close other browser tabs
3. Clear browser cache
4. Use "Clear Cache" in app settings
5. Update browser to latest version

### Settings Not Persisting
1. Check if Local Storage is enabled
2. Check if browser is in private/incognito mode
3. Clear browser data and try again
4. Check browser storage quota

## Future Compatibility

### Planned Support
- WebRTC for future video features
- WebGPU for improved graphics performance
- Service Workers for better offline support
- Progressive Web App (PWA) capabilities

### Deprecation Notice
- Internet Explorer: Not supported (EOL)
- Legacy Edge (EdgeHTML): Not supported (replaced by Chromium Edge)
- Chrome < 90: May work but not officially supported
- Firefox < 88: May work but not officially supported
- Safari < 14: May work but not officially supported

## Resources

- [Can I Use](https://caniuse.com/) - Browser feature compatibility tables
- [MDN Web Docs](https://developer.mozilla.org/) - Browser API documentation
- [WebGL Report](https://webglreport.com/) - Check WebGL support
- [Browserslist](https://browserslist.dev/) - Browser version statistics

## Reporting Issues

If you encounter browser-specific issues:

1. Check this document for known issues
2. Check browser console for errors
3. Try the troubleshooting steps above
4. Report the issue with:
   - Browser name and version
   - Operating system
   - Steps to reproduce
   - Console error messages
   - Screenshots if applicable

## Updates

This document is updated as new browser versions are released and new issues are discovered. Last updated: 2024.
