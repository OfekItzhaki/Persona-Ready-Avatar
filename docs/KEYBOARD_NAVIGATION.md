# Keyboard Navigation Guide

This document describes the comprehensive keyboard navigation support implemented in the Avatar Client application, ensuring WCAG 2.1 Level AA compliance.

## Overview

The Avatar Client provides full keyboard accessibility, allowing users to navigate and interact with all features without requiring a mouse. This implementation addresses Requirement 35 from the enhanced-avatar-features specification.

## Features Implemented

### 1. Skip Links (Requirement 35.8)

Skip links allow keyboard users to bypass repetitive navigation and jump directly to main content areas.

**Available Skip Links:**
- Skip to main content
- Skip to chat interface
- Skip to avatar canvas
- Skip to agent selector

**Usage:**
- Press `Tab` when the page loads to reveal skip links
- Press `Enter` to jump to the selected section

**Implementation:**
- Located in `components/SkipLinks.tsx`
- Visually hidden until focused
- Positioned at the top of the page for immediate access

### 2. Visible Focus Indicators (Requirement 35.2)

All interactive elements display clear, visible focus indicators when navigated via keyboard.

**Features:**
- 2px blue outline with 2px offset for all focusable elements
- Enhanced 3px outline with box-shadow for keyboard navigation mode
- Automatic detection of keyboard vs. mouse navigation
- Dark mode support with adjusted colors

**Implementation:**
- Utility: `lib/utils/focusIndicators.ts`
- Automatically initialized on app load
- Global CSS styles injected dynamically

### 3. Focus Trap in Modals (Requirement 35.6)

Modal dialogs trap keyboard focus to prevent navigation outside the modal.

**Affected Components:**
- SettingsPanel
- Delete confirmation dialog in MessageList
- Import mode dialog in ChatInterface

**Behavior:**
- Focus moves to the first focusable element when modal opens
- `Tab` cycles forward through focusable elements
- `Shift+Tab` cycles backward through focusable elements
- Focus wraps from last to first element and vice versa

**Implementation:**
- Hook: `lib/hooks/useFocusTrap.ts`
- Integrated into modal components

### 4. Focus Return (Requirement 35.7)

When a modal closes, focus returns to the element that triggered it.

**Behavior:**
- Opening element is stored when modal opens
- Focus is restored when modal closes
- Handles cases where trigger element is removed from DOM

**Implementation:**
- Managed by `useFocusTrap` hook
- Automatic focus restoration in modal cleanup

### 5. Escape Key Support (Requirement 35.3)

The `Escape` key closes modals and cancels operations.

**Supported Actions:**
- Close SettingsPanel
- Close delete confirmation dialog
- Cancel message editing
- Clear search query in MessageList

**Implementation:**
- Event listeners in each component
- Consistent behavior across all modals

### 6. Button Activation (Requirement 35.4)

Buttons can be activated using both `Enter` and `Space` keys.

**Supported Elements:**
- All `<button>` elements
- Custom button components
- Toggle switches
- Action buttons in messages

**Implementation:**
- Native browser behavior for standard buttons
- Custom `onKeyDown` handlers for special cases

### 7. Slider Controls (Requirement 35.5)

Sliders support arrow key navigation for precise control.

**Keyboard Controls:**
- `Arrow Up` / `Arrow Right`: Increase value
- `Arrow Down` / `Arrow Left`: Decrease value
- `Home`: Set to minimum value
- `End`: Set to maximum value

**Affected Sliders:**
- Volume control
- Playback speed
- Speech rate
- Speech pitch

**Implementation:**
- Custom `onKeyDown` handlers in AudioController and SettingsPanel
- Increment/decrement by 5% for volume
- Increment/decrement by 0.05x for speed controls

### 8. Dropdown Navigation (Requirement 35.5)

Dropdowns support arrow key navigation through options.

**Keyboard Controls:**
- `Arrow Up` / `Arrow Down`: Navigate options
- `Home`: Jump to first option
- `End`: Jump to last option
- `Enter`: Select current option

**Affected Dropdowns:**
- Playback speed selector
- Audio quality selector
- Role filter in MessageList
- Theme selector

**Implementation:**
- Native `<select>` behavior
- Custom navigation for playback speed in AudioController

## Tab Navigation Order

The application follows a logical tab order that matches the visual layout:

### Main Page
1. Skip links (when focused)
2. Agent selector
3. Avatar canvas controls (if interactive)
4. Transcript display (if scrollable)
5. Message search input
6. Role filter dropdown
7. Message list (focusable messages)
8. Message input textarea
9. Send button
10. Export/Import buttons

### SettingsPanel
1. Close button
2. Tab navigation (Audio, Graphics, Appearance, Accessibility)
3. Section-specific controls (sliders, toggles, buttons)
4. Reset to Defaults button

### AudioController
1. Volume slider
2. Mute toggle
3. Playback speed selector
4. Pause/Resume button
5. Stop button
6. Skip button

### AvatarCustomizer
1. Skin tone swatches
2. Eye color swatches
3. Hair color swatches
4. Expression buttons

## ARIA Labels and Semantic HTML

All interactive elements include appropriate ARIA labels and use semantic HTML:

- `role="dialog"` for modals
- `aria-modal="true"` for modal dialogs
- `aria-label` for all buttons and controls
- `aria-live` regions for dynamic content
- `role="slider"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow` for sliders
- `role="switch"` with `aria-checked` for toggles
- Semantic `<button>`, `<input>`, `<select>` elements

## Testing Keyboard Navigation

### Manual Testing Checklist

1. **Skip Links**
   - [ ] Press Tab on page load - skip links appear
   - [ ] Press Enter on each skip link - jumps to correct section

2. **Focus Indicators**
   - [ ] Tab through all interactive elements - visible focus indicator on each
   - [ ] Focus indicators are clearly visible in both light and dark themes

3. **Modal Focus Trap**
   - [ ] Open SettingsPanel - focus moves to close button
   - [ ] Tab through modal - focus stays within modal
   - [ ] Tab from last element - focus wraps to first element
   - [ ] Shift+Tab from first element - focus wraps to last element

4. **Escape Key**
   - [ ] Press Escape in SettingsPanel - modal closes
   - [ ] Press Escape in delete confirmation - dialog closes
   - [ ] Press Escape while editing message - edit mode cancels
   - [ ] Press Escape in search field - search clears

5. **Button Activation**
   - [ ] Focus button, press Enter - button activates
   - [ ] Focus button, press Space - button activates

6. **Slider Controls**
   - [ ] Focus volume slider, press Arrow Up - volume increases
   - [ ] Focus volume slider, press Arrow Down - volume decreases
   - [ ] Focus volume slider, press Home - volume sets to 0%
   - [ ] Focus volume slider, press End - volume sets to 100%

7. **Dropdown Navigation**
   - [ ] Focus dropdown, press Arrow Down - next option selected
   - [ ] Focus dropdown, press Arrow Up - previous option selected

8. **Focus Return**
   - [ ] Open modal from button - modal opens
   - [ ] Close modal - focus returns to button

### Automated Testing

Run the keyboard navigation test suite:

```bash
npm test KeyboardNavigation.test.tsx
```

## Browser Compatibility

Keyboard navigation is tested and supported in:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Accessibility Standards Compliance

This implementation meets the following WCAG 2.1 Level AA success criteria:

- **2.1.1 Keyboard**: All functionality is available via keyboard
- **2.1.2 No Keyboard Trap**: Users can navigate away from any component using keyboard
- **2.4.3 Focus Order**: Focus order is logical and meaningful
- **2.4.7 Focus Visible**: Keyboard focus indicator is visible
- **3.2.1 On Focus**: No unexpected context changes on focus
- **4.1.2 Name, Role, Value**: All UI components have accessible names and roles

## Future Enhancements

Potential improvements for keyboard navigation:

1. **Keyboard Shortcuts**
   - Global shortcuts for common actions (e.g., Ctrl+/ for help)
   - Customizable keyboard shortcuts

2. **Spatial Navigation**
   - Arrow key navigation for grid layouts
   - Vim-style navigation (h, j, k, l)

3. **Quick Navigation**
   - Jump to specific sections with number keys
   - Search-based navigation

4. **Voice Commands**
   - Integration with voice control for hands-free navigation

## Support

For issues or questions about keyboard navigation:
1. Check this documentation
2. Review the test suite in `components/__tests__/KeyboardNavigation.test.tsx`
3. Examine component implementations for specific behaviors
4. File an issue in the project repository

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Keyboard Accessibility](https://webaim.org/techniques/keyboard/)
