# Implementation Plan: Ready Player Me Avatar Integration

## Overview

This implementation plan converts the Ready Player Me avatar integration design into actionable coding tasks. The system will integrate professional 3D avatars from Ready Player Me with robust fallback mechanisms, error handling, and WebGL context management while maintaining compatibility with the existing viseme-based lip synchronization system.

The implementation uses TypeScript with React, react-three-fiber, and Next.js, building on the existing avatar infrastructure in the codebase.

## Tasks

- [x] 1. Set up environment configuration and directory structure
  - Create `.env.local` entries for avatar URLs (NEXT_PUBLIC_AVATAR_DEFAULT_1, NEXT_PUBLIC_AVATAR_DEFAULT_2, NEXT_PUBLIC_AVATAR_DEFAULT_3)
  - Add fallback configuration variables (NEXT_PUBLIC_AVATAR_FALLBACK_TYPE, NEXT_PUBLIC_AVATAR_FALLBACK_COLOR)
  - Add loading configuration variables (NEXT_PUBLIC_AVATAR_LOAD_TIMEOUT, NEXT_PUBLIC_AVATAR_MAX_RETRIES)
  - Create `public/models/` directory structure for local avatar storage
  - Update `.env.example` with avatar configuration template
  - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.5_

- [ ] 2. Create core avatar data models and types
  - [x] 2.1 Define avatar configuration interfaces in `types/index.ts`
    - Add `AvatarConfig` interface with id, name, url, thumbnailUrl, description, source, metadata
    - Add `AvatarOption` interface for UI display
    - Add `AvatarPreferences` interface for localStorage persistence
    - Add `AvatarLoadError` discriminated union type (NETWORK_ERROR, TIMEOUT, INVALID_FORMAT, NOT_FOUND, WEBGL_ERROR)
    - Add `AvatarLoadResult` interface with success, model, error, fromCache fields
    - Add `ValidationResult`, `AvatarMetadata`, `ValidationError`, `ValidationWarning` interfaces
    - Add `WebGLContextState` interface for context loss tracking
    - _Requirements: 2.1, 2.2, 4.1, 4.2, 9.1, 11.1_

  - [ ]* 2.2 Write property test for avatar configuration round-trip
    - **Property 5: Avatar Preference Persistence Round-Trip**
    - **Validates: Requirements 2.4**
    - Test that saving any avatar selection to localStorage then loading it returns the same avatar ID

- [ ] 3. Extend Zustand store with avatar state management
  - [x] 3.1 Add avatar state to `lib/store/useAppStore.ts`
    - Add `selectedAvatarId`, `avatarLoadingState`, `avatarError`, `availableAvatars` to state
    - Add `setSelectedAvatar`, `setAvatarLoadingState`, `setAvatarError`, `retryAvatarLoad` actions
    - Initialize `availableAvatars` from environment configuration on store creation
    - _Requirements: 2.1, 2.4, 4.1_

  - [ ]* 3.2 Write unit tests for avatar store actions
    - Test `setSelectedAvatar` updates state correctly
    - Test `setAvatarLoadingState` transitions through loading states
    - Test `setAvatarError` stores error information
    - Test `retryAvatarLoad` clears error and resets loading state
    - _Requirements: 2.4, 4.1_

- [ ] 4. Implement AvatarValidatorService
  - [x] 4.1 Create `lib/services/AvatarValidatorService.ts`
    - Implement `validateModel(gltf: GLTF): ValidationResult` method
    - Implement `checkVisemeCompatibility(gltf: GLTF): string[]` to find missing blendshapes
    - Implement `extractMetadata(gltf: GLTF): AvatarMetadata` to extract mesh, triangle, blendshape counts
    - Validate GLB format, mesh presence, and morph target availability
    - Log warnings for missing viseme blendshapes from VISEME_BLENDSHAPE_MAP
    - _Requirements: 1.3, 8.1, 8.3, 11.1, 11.2, 11.3, 11.4_

  - [ ]* 4.2 Write property test for blendshape name recognition
    - **Property 2: Blendshape Name Recognition**
    - **Validates: Requirements 1.2**
    - Test that all standard viseme blendshape names present in a model are correctly identified

  - [ ]* 4.3 Write property test for viseme compatibility validation
    - **Property 3: Viseme Compatibility Validation**
    - **Validates: Requirements 1.3, 8.1**
    - Test that validation returns list of missing viseme blendshapes from VISEME_BLENDSHAPE_MAP

  - [ ]* 4.4 Write property test for metadata extraction
    - **Property 30: Metadata Extraction**
    - **Validates: Requirements 11.1**
    - Test that metadata extraction returns mesh count, triangle count, blendshape count, and blendshape names

  - [ ]* 4.5 Write unit tests for AvatarValidatorService
    - Test validation with valid GLB file
    - Test validation with invalid format
    - Test validation with missing meshes
    - Test validation with missing blendshapes
    - Test metadata extraction accuracy
    - _Requirements: 11.2, 11.3, 11.4_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement AvatarLoaderService with retry logic
  - [x] 6.1 Create `lib/services/AvatarLoaderService.ts`
    - Implement `loadAvatar(url: string): Promise<AvatarLoadResult>` with exponential backoff retry
    - Implement retry logic: 3 attempts with 1s, 2s, 4s delays for transient errors
    - Implement timeout handling (default 10000ms from environment config)
    - Integrate with AvatarValidatorService for model validation
    - Implement in-memory cache using Map for loaded models
    - Implement `clearCache(url?: string): void` method
    - Implement `preloadAvatar(url: string): Promise<void>` method
    - Distinguish retryable errors (NETWORK_ERROR, TIMEOUT) from non-retryable (INVALID_FORMAT, NOT_FOUND)
    - _Requirements: 1.1, 1.5, 4.7, 5.3, 5.4, 6.3, 6.4, 7.1, 7.4_

  - [ ]* 6.2 Write property test for Ready Player Me GLB loading
    - **Property 1: Ready Player Me GLB Loading**
    - **Validates: Requirements 1.1, 1.5**
    - Test that any valid Ready Player Me GLB URL loads successfully without errors

  - [ ]* 6.3 Write property test for retry exponential backoff
    - **Property 14: Retry Exponential Backoff**
    - **Validates: Requirements 4.7**
    - Test that transient failures trigger retries with approximately 1s, 2s, 4s delays

  - [ ]* 6.4 Write property test for avatar caching
    - **Property 21: Avatar Caching**
    - **Validates: Requirements 7.4**
    - Test that loading the same URL twice results in only one network request

  - [ ]* 6.5 Write property test for local and remote URL support
    - **Property 15: Local and Remote URL Support**
    - **Validates: Requirements 5.3, 5.4**
    - Test that both local file paths and remote HTTP/HTTPS URLs are correctly parsed and loaded

  - [ ]* 6.6 Write unit tests for AvatarLoaderService
    - Test successful model loading
    - Test network error handling
    - Test timeout handling
    - Test invalid format error
    - Test 404 not found error
    - Test cache hit behavior
    - Test cache miss behavior
    - Test retry logic with mock delays
    - _Requirements: 4.1, 4.2, 7.4_

- [ ] 7. Implement FallbackAvatar component
  - [x] 7.1 Create `components/FallbackAvatar.tsx`
    - Implement cube variant using BoxGeometry with MeshStandardMaterial
    - Implement sphere variant using SphereGeometry with MeshStandardMaterial
    - Add rotation animation for cube (Y-axis rotation in useFrame)
    - Add scale pulsing animation for sphere (scale oscillation in useFrame)
    - Accept `type`, `animated`, `color` props
    - Ensure no external dependencies or network requests
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 8.4_

  - [ ]* 7.2 Write property test for fallback avatar independence
    - **Property 7: Fallback Avatar Independence**
    - **Validates: Requirements 3.2**
    - Test that FallbackAvatar renders successfully in any network state without external requests

  - [ ]* 7.3 Write property test for fallback avatar animation
    - **Property 9: Fallback Avatar Animation**
    - **Validates: Requirements 3.4**
    - Test that FallbackAvatar transform changes over time to indicate activity

  - [ ]* 7.4 Write property test for fallback blendshape independence
    - **Property 10: Fallback Avatar Blendshape Independence**
    - **Validates: Requirements 3.5, 8.4**
    - Test that FallbackAvatar never accesses morphTargetInfluences or blendshape data

  - [ ]* 7.5 Write unit tests for FallbackAvatar
    - Test cube variant renders correctly
    - Test sphere variant renders correctly
    - Test animation is active when animated=true
    - Test animation is disabled when animated=false
    - Test custom color is applied
    - _Requirements: 3.1, 3.4_

- [ ] 8. Implement PreferencesService for avatar persistence
  - [x] 8.1 Extend `lib/services/PreferencesService.ts` with avatar methods
    - Add `saveAvatarPreference(avatarId: string): void` method
    - Add `loadAvatarPreference(): string | null` method
    - Add `getAvatarLoadHistory(): AvatarPreferences['loadHistory']` method
    - Add `recordAvatarLoad(avatarId: string, success: boolean, loadTimeMs?: number): void` method
    - Store preferences under `avatar-preferences` localStorage key
    - _Requirements: 2.4, 2.5_

  - [ ]* 8.2 Write property test for preference persistence round-trip
    - **Property 5: Avatar Preference Persistence Round-Trip**
    - **Validates: Requirements 2.4**
    - Test that saving then loading any avatar ID returns the same value

  - [ ]* 8.3 Write property test for startup avatar loading
    - **Property 6: Startup Avatar Loading**
    - **Validates: Requirements 2.5**
    - Test that saved preference causes correct avatar URL to be loaded on startup

  - [ ]* 8.4 Write unit tests for avatar preference methods
    - Test saving and loading avatar preference
    - Test load history recording
    - Test handling of missing preferences
    - _Requirements: 2.4, 2.5_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Update AvatarCanvas with error handling and fallback logic
  - [x] 10.1 Modify `components/AvatarCanvas.tsx`
    - Add WebGL context loss event listeners (webglcontextlost, webglcontextrestored)
    - Implement context restoration with retry limit (max 3 attempts)
    - Add state for tracking context restoration attempts
    - Integrate FallbackAvatar component for error states
    - Update error handling to use AvatarLoadError types
    - Add error notification creation using Zustand store
    - Implement automatic fallback display after max retries exceeded
    - Add loading state indicator during avatar fetch
    - _Requirements: 3.3, 4.2, 4.3, 4.4, 4.5, 4.6, 7.2, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 10.2 Write property test for error-to-fallback transition
    - **Property 8: Error-to-Fallback Transition**
    - **Validates: Requirements 3.3, 4.2, 4.4, 4.5**
    - Test that any avatar loading error results in FallbackAvatar display

  - [ ]* 10.3 Write property test for WebGL context recovery
    - **Property 12: WebGL Context Recovery**
    - **Validates: Requirements 4.3, 9.2, 9.4**
    - Test that context loss triggers preventDefault and restoration attempt

  - [ ]* 10.4 Write property test for context restoration limit
    - **Property 25: Context Restoration Limit**
    - **Validates: Requirements 9.5**
    - Test that after 3 failed restoration attempts, FallbackAvatar is displayed permanently

  - [ ]* 10.5 Write property test for WebGL event listener registration
    - **Property 24: WebGL Event Listener Registration**
    - **Validates: Requirements 9.1, 9.3**
    - Test that webglcontextlost and webglcontextrestored listeners are registered on Canvas creation

  - [ ]* 10.6 Write unit tests for AvatarCanvas error handling
    - Test network error displays fallback
    - Test WebGL context loss handling
    - Test context restoration success
    - Test context restoration failure after 3 attempts
    - Test error notification creation
    - Test retry button functionality
    - _Requirements: 4.2, 4.3, 4.4, 9.2, 9.4, 9.5_

- [ ] 11. Update AvatarModel component with validation and lip sync
  - [ ] 11.1 Modify AvatarModel in `components/AvatarCanvas.tsx`
    - Integrate AvatarValidatorService to validate loaded models
    - Check for missing viseme blendshapes and log warnings
    - Add flag to disable lip sync when blendshapes are missing
    - Ensure VISEME_BLENDSHAPE_MAP consistency across restarts
    - Implement real-time blendshape animation on viseme changes
    - Ensure animation occurs within one frame of viseme change
    - _Requirements: 1.3, 1.4, 8.1, 8.2, 8.3, 8.5_

  - [ ]* 11.2 Write property test for viseme blendshape mapping consistency
    - **Property 4: Viseme Blendshape Mapping Consistency**
    - **Validates: Requirements 1.4, 8.2**
    - Test that any viseme ID (0-21) returns consistent blendshape name across restarts

  - [ ]* 11.3 Write property test for incomplete model warning
    - **Property 22: Incomplete Model Warning**
    - **Validates: Requirements 8.3**
    - Test that models lacking required viseme blendshapes trigger warning and disable lip sync

  - [ ]* 11.4 Write property test for viseme-to-blendshape animation
    - **Property 23: Viseme-to-Blendshape Animation**
    - **Validates: Requirements 8.5**
    - Test that viseme changes update morphTargetInfluence within next animation frame

  - [ ]* 11.5 Write unit tests for AvatarModel validation
    - Test validation is called on model load
    - Test warning logged for missing blendshapes
    - Test lip sync disabled when blendshapes missing
    - Test lip sync active when blendshapes present
    - Test blendshape animation on viseme change
    - _Requirements: 8.1, 8.3, 8.5_

- [ ] 12. Create AvatarSelector UI component
  - [x] 12.1 Create `components/AvatarSelector.tsx`
    - Display available avatars in grid layout with thumbnails/names
    - Highlight currently selected avatar with visual styling
    - Handle avatar selection click events
    - Update Zustand store on selection
    - Call PreferencesService to persist selection
    - Display loading spinner during avatar load
    - Show avatar names and descriptions
    - Implement keyboard navigation (Tab, Enter, Arrow keys)
    - Add ARIA labels for accessibility
    - _Requirements: 2.3, 10.1, 10.2, 10.3, 10.5_

  - [ ]* 12.2 Write property test for avatar selector completeness
    - **Property 26: Avatar Selector Completeness**
    - **Validates: Requirements 10.1, 2.3**
    - Test that any list of avatars renders UI element for each avatar

  - [ ]* 12.3 Write property test for selected avatar visual indication
    - **Property 27: Selected Avatar Visual Indication**
    - **Validates: Requirements 10.2**
    - Test that selected avatar ID has distinct styling applied

  - [ ]* 12.4 Write property test for avatar selection interaction
    - **Property 28: Avatar Selection Interaction**
    - **Validates: Requirements 10.3**
    - Test that clicking any avatar option triggers load operation

  - [ ]* 12.5 Write property test for loading feedback during selection
    - **Property 29: Loading Feedback During Selection**
    - **Validates: Requirements 10.5**
    - Test that avatar loading displays visual loading indicator

  - [ ]* 12.6 Write unit tests for AvatarSelector
    - Test renders all avatar options
    - Test highlights selected avatar
    - Test click handler updates store
    - Test preference persistence on selection
    - Test loading indicator display
    - Test keyboard navigation
    - Test accessibility attributes
    - _Requirements: 2.3, 10.1, 10.2, 10.3, 10.5_

- [ ] 13. Integrate AvatarSelector into SettingsPanel
  - [x] 13.1 Update `components/SettingsPanel.tsx`
    - Add "Avatar Selection" section to settings panel
    - Import and render AvatarSelector component
    - Pass available avatars from Zustand store
    - Pass selected avatar ID from Zustand store
    - Wire up onSelect handler to update store
    - Add section header and description
    - _Requirements: 10.4_

  - [ ]* 13.2 Write unit tests for SettingsPanel avatar integration
    - Test AvatarSelector is rendered in settings
    - Test avatar selection updates store
    - Test settings panel displays current selection
    - _Requirements: 10.4_

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Implement error notification system
  - [ ] 15.1 Create error notification helper in `lib/utils/errorMessages.ts`
    - Add `getAvatarErrorMessage(error: AvatarLoadError): string` function
    - Map error types to user-friendly messages
    - Add troubleshooting suggestions for each error type
    - _Requirements: 4.6, 12.1_

  - [ ] 15.2 Update notification system to support avatar errors
    - Extend existing NotificationToast to handle avatar error notifications
    - Add retry action button to notifications
    - Add fallback action button to notifications
    - Add dismiss action button to notifications
    - Wire up action buttons to Zustand store actions
    - _Requirements: 4.6, 12.1, 12.2, 12.3_

  - [ ]* 15.3 Write property test for error notification creation
    - **Property 13: Error Notification Creation**
    - **Validates: Requirements 4.6, 12.1, 12.2, 12.3**
    - Test that any avatar loading error creates notification with error type, message, and action buttons

  - [ ]* 15.4 Write property test for error logging completeness
    - **Property 11: Error Logging Completeness**
    - **Validates: Requirements 4.1**
    - Test that any avatar loading failure creates log entry with error type, message, timestamp, and URL

  - [ ]* 15.5 Write unit tests for error notifications
    - Test notification created on network error
    - Test notification created on timeout
    - Test notification created on invalid format
    - Test notification created on WebGL error
    - Test retry button triggers retry action
    - Test fallback button switches to fallback avatar
    - Test dismiss button closes notification
    - _Requirements: 4.6, 12.1, 12.2, 12.3_

- [ ] 16. Add fallback explanation display
  - [ ] 16.1 Update FallbackAvatar component with explanation overlay
    - Add optional `errorReason` prop to FallbackAvatar
    - Display explanation message when fallback is shown due to error
    - Style explanation as overlay or banner
    - Include error reason and basic troubleshooting
    - _Requirements: 12.4_

  - [ ]* 16.2 Write property test for fallback explanation display
    - **Property 33: Fallback Explanation Display**
    - **Validates: Requirements 12.4**
    - Test that any error causing fallback display shows explanation message

  - [ ]* 16.3 Write unit tests for fallback explanation
    - Test explanation displayed when error provided
    - Test no explanation when no error
    - Test explanation includes error reason
    - _Requirements: 12.4_

- [ ] 17. Implement environment configuration reading
  - [x] 17.1 Create `lib/env.ts` helper for avatar configuration
    - Add `getAvatarConfig()` function to read environment variables
    - Parse NEXT_PUBLIC_AVATAR_DEFAULT_* variables into AvatarOption array
    - Parse NEXT_PUBLIC_AVATAR_FALLBACK_TYPE and NEXT_PUBLIC_AVATAR_FALLBACK_COLOR
    - Parse NEXT_PUBLIC_AVATAR_LOAD_TIMEOUT and NEXT_PUBLIC_AVATAR_MAX_RETRIES
    - Provide hardcoded defaults when environment variables are missing
    - Support both development and production configurations
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 17.2 Write property test for environment configuration reading
    - **Property 17: Environment Configuration Reading**
    - **Validates: Requirements 6.3**
    - Test that environment variable changes are read and used at runtime

  - [ ]* 17.3 Write property test for missing environment variable fallback
    - **Property 18: Missing Environment Variable Fallback**
    - **Validates: Requirements 6.4**
    - Test that missing avatar environment variables use hardcoded defaults without crashing

  - [ ]* 17.4 Write property test for environment-specific configuration
    - **Property 19: Environment-Specific Configuration**
    - **Validates: Requirements 6.5**
    - Test that development and production environments load correct avatar URLs

  - [ ]* 17.5 Write property test for environment configuration structure
    - **Property 34: Environment Configuration Structure**
    - **Validates: Requirements 2.2, 6.1, 6.2**
    - Test that all required environment variables are defined with valid values

  - [ ]* 17.6 Write unit tests for environment configuration
    - Test parsing of avatar URLs
    - Test parsing of fallback configuration
    - Test parsing of loading configuration
    - Test default values when variables missing
    - Test development vs production configuration
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 18. Implement missing directory graceful handling
  - [ ] 18.1 Update AvatarLoaderService to handle missing directories
    - Check if URL is local file path vs remote URL
    - Attempt to load from public/models/ if local path
    - Fall back to remote URL if local file not found
    - Log warning when Model_Directory is missing but continue with remote URLs
    - Ensure no errors thrown when directory doesn't exist
    - _Requirements: 5.5_

  - [ ]* 18.2 Write property test for missing directory graceful handling
    - **Property 16: Missing Directory Graceful Handling**
    - **Validates: Requirements 5.5**
    - Test that missing Model_Directory doesn't cause errors and system functions with remote URLs

  - [ ]* 18.3 Write unit tests for directory handling
    - Test loading from local directory when it exists
    - Test fallback to remote URL when directory missing
    - Test no errors when directory doesn't exist
    - _Requirements: 5.5_

- [ ] 19. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Add loading state indication
  - [ ] 20.1 Update AvatarCanvas to show loading indicator
    - Display loading spinner when avatarLoadingState is 'loading'
    - Show loading message with avatar name
    - Ensure loading indicator is accessible (ARIA labels)
    - Position loading indicator over canvas area
    - _Requirements: 7.2_

  - [ ]* 20.2 Write property test for loading state indication
    - **Property 20: Loading State Indication**
    - **Validates: Requirements 7.2**
    - Test that any avatar loading operation displays loading indicator

  - [ ]* 20.3 Write unit tests for loading indicator
    - Test loading indicator shown when loading
    - Test loading indicator hidden when loaded
    - Test loading indicator hidden on error
    - Test loading message includes avatar name
    - _Requirements: 7.2_

- [ ] 21. Wire up avatar system initialization
  - [ ] 21.1 Update application initialization in `app/page.tsx` or `app/providers.tsx`
    - Initialize Zustand store with available avatars from environment config
    - Load saved avatar preference from PreferencesService on mount
    - Trigger initial avatar load based on preference or default
    - Preload default avatars for faster switching
    - Set up error boundary for avatar system
    - _Requirements: 2.5, 6.3, 7.4_

  - [ ]* 21.2 Write property test for startup avatar loading
    - **Property 6: Startup Avatar Loading**
    - **Validates: Requirements 2.5**
    - Test that saved preference causes correct avatar to load on startup

  - [ ]* 21.3 Write integration tests for avatar system initialization
    - Test application loads with default avatar when no preference
    - Test application loads with saved preference
    - Test preloading of default avatars
    - Test error boundary catches avatar errors
    - _Requirements: 2.5, 7.4_

- [ ] 22. Add avatar metadata round-trip validation
  - [ ]* 22.1 Write property test for metadata round-trip
    - **Property 32: Metadata Round-Trip**
    - **Validates: Requirements 11.5**
    - Test that extracting metadata then using it to configure rendering produces equivalent output

- [ ] 23. Add comprehensive property test for avatar selector rendering
  - [ ]* 23.1 Write property test for avatar selector rendering
    - **Property 35: Avatar Selector Rendering**
    - **Validates: Requirements 2.1**
    - Test that any list of avatar options with at least 3 items renders all options with names or thumbnails

- [ ] 24. Update documentation
  - [ ] 24.1 Create `docs/READY_PLAYER_ME_INTEGRATION.md`
    - Document avatar system architecture
    - Document environment configuration options
    - Document how to add new avatar options
    - Document error handling and fallback behavior
    - Document WebGL context management
    - Document testing strategy
    - Include troubleshooting guide
    - _Requirements: All_

  - [ ] 24.2 Update `README.md` with avatar feature information
    - Add section on avatar customization
    - Link to detailed documentation
    - Include screenshots of avatar selector
    - _Requirements: All_

- [ ] 25. Final checkpoint - Ensure all tests pass and manual testing
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all 3 default avatars load correctly
  - Verify avatar selection persists across page reloads
  - Verify fallback avatar displays when network is offline
  - Verify retry button successfully reloads failed avatar
  - Verify WebGL context loss recovery works
  - Verify lip synchronization works with all avatars
  - Verify loading indicators display during avatar fetch
  - Verify error notifications are user-friendly and actionable
  - Verify settings panel avatar selector is accessible
  - Verify performance is acceptable on low-end devices

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at reasonable breaks
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and edge cases
- The implementation builds on existing infrastructure (AvatarCanvas, Zustand store, PreferencesService)
- All avatar URLs should use Ready Player Me CDN or local public/models/ directory
- WebGL context management is critical for handling GPU issues gracefully
- Error handling should always provide clear user feedback and recovery options
