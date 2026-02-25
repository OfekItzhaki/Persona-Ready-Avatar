# Implementation Plan: Avatar Client

## Overview

This implementation plan creates a Next.js 14+ web application with a 3D animated avatar interface for conversational AI interactions. The application uses react-three-fiber for 3D rendering, Azure Neural TTS for speech synthesis with viseme-driven lip synchronization, and connects to a remote Brain API for conversational logic. The implementation follows The Horizon Standard architectural principles with clean separation of concerns, comprehensive TypeScript types, and a dual testing approach combining unit tests and property-based tests.

## Tasks

- [x] 1. Project initialization and configuration
  - Initialize Next.js 14+ project with TypeScript and App Router
  - Configure Tailwind CSS for styling
  - Set up ESLint and Prettier with strict rules
  - Configure Husky and lint-staged for pre-commit hooks
  - Create .env.example file with all required environment variables (AZURE*SPEECH_KEY, AZURE_SPEECH_REGION, BRAIN_API_URL, NEXT_PUBLIC*\* variables)
  - Configure TypeScript with strict mode (strictNullChecks, noImplicitAny, zero `any` types)
  - Set up Vitest for testing with coverage configuration (minimum 80% for business logic)
  - Install dependencies: @tanstack/react-query, zustand, @microsoft/cognitiveservices-speech-sdk, @react-three/fiber, @react-three/drei, three
  - Configure security headers in next.config.js (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security)
  - Set up structured logging utility with JSON format and ISO 8601 timestamps
  - _Requirements: 8.1-8.8, 14.1-14.4, 15.5, 17.1-17.3, 19.1, 19.5, 20.4-20.5_

- [x] 2. Core type definitions and interfaces
  - Define TypeScript interfaces for domain models (Agent, ChatMessage, VisemeData, VisemeEvent, BlendshapeMapping, Notification)
  - Define API request/response types (SendMessageRequest, ChatResponse, AgentsResponse)
  - Define Azure Speech types (SpeechConfig, SynthesisResult, AudioFormat)
  - Define error types (Result<T, E>, ApiError, TTSError, SpeechError, ValidationError)
  - Define service interfaces (ITTSService, IVisemeCoordinator, IAudioManager, IBrainApiRepository, IAzureSpeechRepository)
  - Create viseme-to-blendshape mapping constant (VISEME_BLENDSHAPE_MAP for viseme IDs 0-21)
  - _Requirements: 15.2, 15.3_

- [x] 3. Environment configuration and validation
  - Create environment configuration loader that reads from process.env
  - Implement validation function to check required environment variables at startup
  - Log error with specific missing variable names if validation fails
  - Prevent application startup when required variables are missing
  - Export typed configuration object for use throughout application
  - _Requirements: 8.7, 8.8_

- [x]\* 3.1 Write property test for environment validation
  - **Property 18: Environment Variable Validation**
  - **Validates: Requirements 8.7, 8.8**

- [x] 4. Data access layer - Brain API Repository
  - Implement BrainApiRepository class with sendMessage and getAgents methods
  - Use fetch API with 30-second timeout wrapper
  - Include proper HTTP headers (Content-Type: application/json) in all requests
  - Parse JSON responses and transform to typed Result<T, E> objects
  - Transform HTTP errors to domain ApiError types with context
  - Implement retry logic with exponential backoff (3 attempts for network errors)
  - Log all API requests with endpoint, method, and response status
  - _Requirements: 6.1-6.7, 19.2_

- [x]\* 4.1 Write unit tests for BrainApiRepository
  - Test successful sendMessage and getAgents calls
  - Test error handling for network errors, timeouts, and server errors
  - Test retry logic with exponential backoff
  - _Requirements: 6.1-6.7_

- [x]\* 4.2 Write property test for API request headers
  - **Property 15: HTTP Headers in API Requests**
  - **Validates: Requirements 6.4**

- [x]\* 4.3 Write property test for request timeout handling
  - **Property 17: Request Timeout Handling**
  - **Validates: Requirements 6.7**

- [x] 5. Data access layer - Azure Speech Repository
  - Implement AzureSpeechRepository class wrapping Azure Speech SDK
  - Create SpeechSynthesizer with API key and region from environment config
  - Implement synthesize method that converts text to audio using Azure Neural TTS
  - Subscribe to VisemeReceived events and collect viseme data during synthesis
  - Convert Azure audio output to Web Audio API AudioBuffer format
  - Transform SDK errors to domain SpeechError types
  - Manage SDK lifecycle (create synthesizer, dispose after use)
  - _Requirements: 2.1, 2.2, 3.1_

- [x]\* 5.1 Write unit tests for AzureSpeechRepository
  - Test successful speech synthesis with viseme collection
  - Test error handling for invalid credentials and synthesis failures
  - Test SDK lifecycle management
  - _Requirements: 2.1, 2.2, 3.1_

- [x] 6. Business logic layer - Audio Manager Service
  - Implement AudioManager class using Web Audio API (AudioContext)
  - Implement play method that creates AudioBufferSourceNode and starts playback
  - Implement pause, resume, and stop methods
  - Implement getCurrentTime and getDuration methods using AudioContext.currentTime
  - Emit playback state changes ('idle', 'playing', 'paused', 'stopped') via event emitter
  - Handle browser autoplay policies gracefully
  - Clean up AudioBufferSourceNode on stop
  - _Requirements: 3.5_

- [x]\* 6.1 Write unit tests for AudioManager
  - Test play, pause, resume, and stop functionality
  - Test playback state transitions
  - Test timing accuracy (getCurrentTime, getDuration)
  - _Requirements: 3.5_

- [x] 7. Business logic layer - Viseme Coordinator Service
  - Implement VisemeCoordinator class for synchronizing viseme animations with audio
  - Implement start method that schedules viseme animations based on audio timing
  - Use requestAnimationFrame for smooth 60 FPS updates
  - Synchronize viseme timing with AudioContext.currentTime
  - Implement getCurrentViseme method that returns current VisemeData based on playback position
  - Emit viseme change events to subscribers
  - Implement stop method that cleans up timers and resets state
  - Ensure synchronization accuracy within 50 milliseconds
  - _Requirements: 3.2, 3.5_

- [x]\* 7.1 Write unit tests for VisemeCoordinator
  - Test viseme scheduling and timing
  - Test getCurrentViseme at various playback positions
  - Test cleanup on stop
  - _Requirements: 3.2, 3.5_

- [x]\* 7.2 Write property test for audio-viseme synchronization
  - **Property 8: Audio-Viseme Synchronization Timing**
  - **Validates: Requirements 3.5**

- [x] 8. Business logic layer - Language Voice Mapper
  - Create LanguageVoiceMapper utility with mapping of language codes to Azure Neural TTS voice identifiers
  - Support minimum languages: en-US, es-ES, fr-FR, de-DE, ja-JP, zh-CN
  - Implement getVoiceForLanguage method that returns voice identifier for language code
  - Implement default fallback to English voice (en-US-JennyNeural) when language not provided or unsupported
  - Log warning when unsupported language code is received
  - _Requirements: 2.5, 7.1-7.5_

- [x]\* 8.1 Write unit tests for LanguageVoiceMapper
  - Test voice selection for all supported languages
  - Test default fallback for unsupported languages
  - Test warning logging for unsupported languages
  - _Requirements: 2.5, 7.1-7.5_

- [x]\* 8.2 Write property test for language-based voice selection
  - **Property 4: Language-Based Voice Selection**
  - **Validates: Requirements 2.5, 7.5**

- [x] 9. Business logic layer - TTS Service
  - Implement TTSService class that orchestrates text-to-speech synthesis
  - Inject AzureSpeechRepository, AudioManager, VisemeCoordinator, and LanguageVoiceMapper as dependencies
  - Implement synthesizeSpeech method that takes text, voice, and language parameters
  - Use LanguageVoiceMapper to select appropriate voice based on language
  - Call AzureSpeechRepository to synthesize speech and get audio buffer with visemes
  - Forward viseme events to VisemeCoordinator
  - Start audio playback via AudioManager
  - Implement stop method to halt synthesis and playback
  - Handle synthesis errors and emit notifications
  - _Requirements: 2.2-2.6, 3.2, 5.6_

- [x]\* 9.1 Write unit tests for TTSService
  - Test successful synthesis flow with viseme forwarding
  - Test voice selection via LanguageVoiceMapper
  - Test error handling and notification emission
  - Test stop functionality
  - _Requirements: 2.2-2.6, 3.2, 5.6_

- [x]\* 9.2 Write property test for text-to-speech synthesis
  - **Property 2: Text-to-Speech Synthesis**
  - **Validates: Requirements 2.2, 2.3**

- [x]\* 9.3 Write property test for voice selection by configuration
  - **Property 3: Voice Selection by Configuration**
  - **Validates: Requirements 2.4**

- [x]\* 9.4 Write property test for viseme event forwarding
  - **Property 5: Viseme Event Forwarding**
  - **Validates: Requirements 3.2**

- [x] 10. Business logic layer - Notification Service
  - Implement NotificationService class for centralized error and status notifications
  - Integrate with Zustand store to add/remove notifications
  - Implement methods: info, success, warning, error
  - Auto-generate unique notification IDs
  - Support configurable auto-dismiss duration
  - Implement manual dismiss functionality
  - _Requirements: 10.1, 10.2_

- [x]\* 10.1 Write unit tests for NotificationService
  - Test notification creation with different types
  - Test auto-dismiss functionality
  - Test manual dismiss
  - _Requirements: 10.1, 10.2_

- [x] 11. State management - Zustand store
  - Create Zustand store with AppState interface
  - Implement agent selection state (selectedAgentId, setSelectedAgent)
  - Implement conversation state (messages, addMessage, clearMessages)
  - Implement audio/viseme state (currentViseme, setCurrentViseme, playbackState, setPlaybackState)
  - Implement notification state (notifications, addNotification, removeNotification)
  - Export useAppStore hook for component access
  - _Requirements: 4.3, 9.3, 11.4_

- [x]\* 11.1 Write unit tests for Zustand store
  - Test state updates for all actions
  - Test message persistence in session
  - Test notification queue management
  - _Requirements: 4.3, 9.3, 11.4_

- [x]\* 11.2 Write property test for agent selection state management
  - **Property 9: Agent Selection State Management**
  - **Validates: Requirements 4.3**

- [x]\* 11.3 Write property test for session conversation persistence
  - **Property 27: Session Conversation Persistence**
  - **Validates: Requirements 11.4**

- [x] 12. State management - React Query setup
  - Configure QueryClient with default options (staleTime, retry, cacheTime)
  - Create useAgents query hook that fetches from BrainApiRepository.getAgents()
  - Set staleTime to 5 minutes for agent list caching
  - Create useSendMessage mutation hook that calls BrainApiRepository.sendMessage()
  - Implement onSuccess handler in mutation to trigger TTS synthesis
  - Implement optimistic UI updates for message submission
  - Export hooks for component usage
  - _Requirements: 4.1, 5.3, 11.2, 11.3_

- [x]\* 12.1 Write integration tests for React Query hooks
  - Test useAgents query with caching behavior
  - Test useSendMessage mutation with optimistic updates
  - Test error handling in queries and mutations
  - _Requirements: 4.1, 5.3, 11.2, 11.3_

- [x]\* 12.2 Write property test for agent list caching
  - **Property 25: Agent List Caching**
  - **Validates: Requirements 11.2**

- [x]\* 12.3 Write property test for optimistic UI updates
  - **Property 26: Optimistic UI Updates**
  - **Validates: Requirements 11.3**

- [x] 13. Presentation layer - AvatarCanvas component
  - Create AvatarCanvas component using react-three-fiber Canvas
  - Implement GLB model loading using useGLTF hook from @react-three/drei
  - Extract blendshape data from loaded model
  - Subscribe to currentViseme from Zustand store
  - Map viseme IDs to blendshape targets using VISEME_BLENDSHAPE_MAP
  - Animate blendshapes using lerp interpolation for smooth transitions
  - Implement 60 FPS animation loop using useFrame hook
  - Return mouth to neutral position (viseme ID 0) when no viseme data available
  - Implement camera controls (OrbitControls) for rotation and zoom
  - Display loading state during model load
  - Display error message and log details when model load fails
  - Make canvas responsive to viewport size changes while maintaining aspect ratio
  - _Requirements: 1.1-1.5, 3.3, 3.4, 3.6, 3.7, 12.4_

- [x]\* 13.1 Write unit tests for AvatarCanvas component
  - Test component rendering with valid model URL
  - Test loading state display
  - Test error state display when model fails to load
  - Test neutral mouth position when no viseme data
  - _Requirements: 1.1-1.5, 3.3, 3.4, 3.6, 3.7_

- [x]\* 13.2 Write property test for viseme-to-blendshape mapping
  - **Property 6: Viseme-to-Blendshape Mapping**
  - **Validates: Requirements 3.3**

- [x]\* 13.3 Write property test for blendshape interpolation
  - **Property 7: Blendshape Interpolation**
  - **Validates: Requirements 3.4**

- [x]\* 13.4 Write property test for avatar aspect ratio maintenance
  - **Property 29: Avatar Aspect Ratio Maintenance**
  - **Validates: Requirements 12.4**

- [x] 14. Presentation layer - PersonaSwitcher component
  - Create PersonaSwitcher dropdown component
  - Use useAgents hook to fetch available agents
  - Display agent name and description in dropdown options
  - Handle agent selection and call setSelectedAgent from Zustand store
  - Display loading state while fetching agents
  - Display error message when agent fetch fails
  - Implement retry logic (retry after 5 seconds on failure)
  - Add ARIA labels for accessibility
  - Support keyboard navigation (arrow keys, Enter to select)
  - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 13.1, 13.3_

- [x]\* 14.1 Write unit tests for PersonaSwitcher component
  - Test agent list display
  - Test agent selection updates state
  - Test loading and error states
  - Test retry logic on fetch failure
  - Test keyboard navigation
  - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 13.3_

- [x]\* 14.2 Write property test for agent display information
  - **Property 11: Agent Display Information**
  - **Validates: Requirements 4.6**

- [x] 15. Presentation layer - ChatInterface component
  - Create ChatInterface component with text input field and conversation history
  - Use useSendMessage mutation hook for message submission
  - Display messages from Zustand store (messages array)
  - Implement message submission on Enter key press
  - Disable input field while mutation is pending
  - Add user message to store immediately (optimistic update)
  - Display agent response in conversation history when received
  - Implement auto-scroll to latest message
  - Distinguish user and agent messages with different styling
  - Display error notification when API request fails and re-enable input
  - Add ARIA labels for accessibility
  - Support touch input for mobile devices
  - _Requirements: 5.1-5.8, 9.3, 9.4, 9.5, 12.5, 13.2_

- [x]\* 15.1 Write unit tests for ChatInterface component
  - Test message input and submission
  - Test input disabling during pending request
  - Test optimistic UI updates
  - Test error handling and input re-enabling
  - Test auto-scroll behavior
  - Test keyboard shortcuts (Enter to send)
  - _Requirements: 5.1-5.8, 9.3, 9.4, 9.5, 13.2_

- [x]\* 15.2 Write property test for chat message submission
  - **Property 12: Chat Message Submission**
  - **Validates: Requirements 5.3, 5.4**

- [x]\* 15.3 Write property test for input disabling during request
  - **Property 14: Input Disabling During Request**
  - **Validates: Requirements 5.7**

- [x]\* 15.4 Write property test for message chronological ordering
  - **Property 19: Message Chronological Ordering**
  - **Validates: Requirements 9.3**

- [x]\* 15.5 Write property test for visual message distinction
  - **Property 21: Visual Message Distinction**
  - **Validates: Requirements 9.5**

- [x] 16. Presentation layer - TranscriptDisplay component
  - Create TranscriptDisplay component that shows conversation text in real-time
  - Display messages from Zustand store with timestamps
  - Highlight currently spoken text segment based on audio playback position
  - Distinguish user and agent messages with different styling
  - Implement auto-scroll to most recent message
  - Add ARIA live region for screen reader announcements
  - _Requirements: 9.1-9.5, 13.4, 13.6_

- [x]\* 16.1 Write unit tests for TranscriptDisplay component
  - Test message display with timestamps
  - Test visual distinction between user and agent messages
  - Test auto-scroll functionality
  - Test ARIA live region announcements
  - _Requirements: 9.1-9.5, 13.4, 13.6_

- [x]\* 16.2 Write property test for auto-scroll to latest message
  - **Property 20: Auto-Scroll to Latest Message**
  - **Validates: Requirements 9.4**

- [x] 17. Presentation layer - NotificationToast component
  - Create NotificationToast component that displays notifications from Zustand store
  - Render notification queue with type-based styling (info, success, warning, error)
  - Implement auto-dismiss after configurable duration
  - Implement manual dismiss button
  - Add ARIA live region for accessibility
  - Position toasts in corner of viewport (top-right or bottom-right)
  - Animate toast entrance and exit
  - _Requirements: 10.1, 10.2_

- [x]\* 17.1 Write unit tests for NotificationToast component
  - Test notification display with different types
  - Test auto-dismiss functionality
  - Test manual dismiss
  - Test ARIA live region
  - _Requirements: 10.1, 10.2_

- [x]\* 17.2 Write property test for network error notifications
  - **Property 22: Network Error Notifications**
  - **Validates: Requirements 10.2**

- [x] 18. Presentation layer - Error Boundary components
  - Create root ErrorBoundary component that wraps entire application
  - Create component-specific error boundaries for AvatarCanvas, ChatInterface, and PersonaSwitcher
  - Implement fallback UI with error message and "Reload" button
  - Log errors with stack traces to structured logger
  - Maintain application state to allow unaffected features to continue working
  - _Requirements: 10.6, 10.7_

- [x]\* 18.1 Write unit tests for Error Boundary components
  - Test error catching and fallback UI display
  - Test error logging
  - Test reload functionality
  - _Requirements: 10.6, 10.7_

- [x]\* 18.2 Write property test for error boundary protection
  - **Property 24: Error Boundary Protection**
  - **Validates: Requirements 10.6**

- [x] 19. Main application layout and responsive design
  - Create main App layout component with responsive grid using Tailwind CSS
  - On desktop (≥1024px): display 3D viewport, chat interface, and persona switcher in organized layout
  - On mobile (<1024px): stack components vertically
  - Implement QueryClientProvider wrapper for React Query
  - Implement root error boundary
  - Add global styles and Tailwind configuration
  - Ensure sufficient color contrast ratios (WCAG AA 4.5:1 minimum)
  - _Requirements: 12.1-12.5, 13.5_

- [x]\* 19.1 Write integration tests for responsive layout
  - Test desktop layout organization
  - Test mobile vertical stacking
  - Test color contrast ratios
  - _Requirements: 12.1-12.5, 13.5_

- [x] 20. Integration and wiring
  - Wire all components together in main page component
  - Initialize services with dependency injection (repositories → services → components)
  - Set up React Query client with proper configuration
  - Initialize Zustand store
  - Preload GLB model during application initialization
  - Implement application startup sequence with environment validation
  - Connect TTS Service to useSendMessage mutation onSuccess handler
  - Connect VisemeCoordinator to Avatar Component via Zustand store
  - Test complete conversation flow: select agent → send message → receive response → play audio → animate avatar
  - _Requirements: 4.3, 5.6, 11.5_

- [x]\* 20.1 Write integration tests for complete conversation flow
  - Test end-to-end flow from agent selection to avatar animation
  - Test error recovery scenarios
  - Test state synchronization across components
  - _Requirements: 4.3, 5.6, 11.5_

- [x]\* 20.2 Write property test for agent ID in chat requests
  - **Property 10: Agent ID in Chat Requests**
  - **Validates: Requirements 4.4, 5.4**

- [x]\* 20.3 Write property test for response display and TTS trigger
  - **Property 13: Response Display and TTS Trigger**
  - **Validates: Requirements 5.5, 5.6**

- [x] 21. Checkpoint - Ensure all tests pass
  - Run all unit tests, property tests, and integration tests
  - Verify test coverage meets minimum 80% for business logic
  - Fix any failing tests
  - Ensure all tests pass, ask the user if questions arise

- [x] 22. Input validation and security
  - Implement input validation for user messages (sanitize before sending to API)
  - Validate environment variables at startup
  - Ensure no sensitive data (API keys, tokens) in logs
  - Verify security headers are properly configured
  - Test Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security headers
  - _Requirements: 14.5, 14.6, 14.7_

- [x]\* 22.1 Write unit tests for input validation
  - Test sanitization of user input
  - Test prevention of injection attacks
  - _Requirements: 14.5_

- [x]\* 22.2 Write property test for input validation and sanitization
  - **Property 33: Input Validation and Sanitization**
  - **Validates: Requirements 14.5**

- [x]\* 22.3 Write property test for sensitive data protection in logs
  - **Property 34: Sensitive Data Protection in Logs**
  - **Validates: Requirements 14.6**

- [x] 23. Accessibility enhancements
  - Add ARIA labels to all interactive components (verified in component tasks)
  - Implement keyboard navigation for all interactive elements
  - Add screen reader announcements for new messages and status changes
  - Verify color contrast ratios meet WCAG AA standards
  - Test with screen reader (manual testing recommended)
  - _Requirements: 13.1-13.6_

- [x]\* 23.1 Write property test for ARIA labels
  - **Property 30: ARIA Labels for Interactive Components**
  - **Validates: Requirements 13.1**

- [x]\* 23.2 Write property test for text alternatives for audio
  - **Property 31: Text Alternatives for Audio**
  - **Validates: Requirements 13.4**

- [x]\* 23.3 Write property test for screen reader announcements
  - **Property 32: Screen Reader Announcements**
  - **Validates: Requirements 13.6**

- [x] 24. Documentation and README
  - Create comprehensive README.md with project overview and purpose
  - Document installation instructions (step-by-step)
  - Document all required environment variables and their purposes
  - Document development mode instructions (npm run dev)
  - Document production build and deployment instructions (npm run build)
  - Document technology stack and architecture overview
  - Add troubleshooting guidance for common issues
  - Document git workflow and branching strategy
  - _Requirements: 18.1-18.7, 20.3_

- [x] 25. Commit message validation and git workflow
  - Configure commitlint for conventional commit format validation
  - Update Husky hooks to run commitlint on commit-msg
  - Verify pre-commit hooks run linting, formatting, and tests
  - Verify lint-staged runs only on staged files
  - Test commit workflow with sample commits
  - _Requirements: 20.1, 20.2_

- [x] 26. Final checkpoint - Ensure all tests pass and build succeeds
  - Run full test suite (unit, property, integration tests)
  - Verify test coverage meets requirements (80% for business logic)
  - Run production build (npm run build) and verify zero errors
  - Run linting (npm run lint) and verify zero errors
  - Run TypeScript type checking (tsc --noEmit) and verify zero errors
  - Verify all environment variables are documented in .env.example
  - Test application in development mode
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout with strict type checking
- All services use dependency injection for testability
- State management uses a hybrid approach: React Query for server state, Zustand for client state
- Real-time audio-viseme synchronization must maintain 50ms accuracy
