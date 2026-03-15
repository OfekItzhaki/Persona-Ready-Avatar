# Implementation Plan: Photorealistic Avatar System

## Overview

This plan implements the photorealistic avatar system in TypeScript/Next.js, covering server-side services (DIDService, PresenterStore, AdminAuthService, FileValidationService), API routes, client components (AvatarSystem, TalkingHeadPlayer, ThinkingAnimator, GLBVRMRenderer, AdminAuthGate, AdminAvatarPanel), and AppStore extensions. The implementation is incremental — each task builds on the previous and ends with all pieces wired together.

## Tasks

- [x] 1. Extend AppStore with avatar state fields
  - Add `avatarMode: 'did' | 'glb' | 'none'` and `setAvatarMode` action to `lib/store/useAppStore.ts`
  - Add `didVideoUrl: string | null` and `setDidVideoUrl` action
  - Extend `playbackState` semantics: `'loading'` = D-ID generating, `'playing'` = video/audio active, `'idle'` = no playback
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

  - [ ]\* 1.1 Write property test for AppStore avatarMode idempotence
    - **Property 9: AppStore avatarMode reflects last completed transition (idempotence)**
    - **Validates: Requirements 17.2, 17.7**
    - Generate random sequences of `setAvatarMode` calls; assert final value equals last argument; assert calling twice with same value produces same state as calling once

- [x] 2. Define core data models and types
  - Create `types/avatar.ts` with `AvatarAssignment` discriminated union (`mode: 'did'` | `mode: 'glb'`), `DIDError` union, `ValidationResult`, and `Result<T, E>` helper type
  - Define D-ID API request/response shapes (`CreatePresenterRequest/Response`, `CreateTalkRequest/Response`, `TalkStatusResponse`)
  - _Requirements: 4.1, 5.1, 6.1, 13.1_

- [x] 3. Implement PresenterStore service
  - Create `lib/services/PresenterStore.ts` implementing `IPresenterStore`
  - Read/write `config/avatar-assignments.json`; use atomic write via temp-file + `fs.rename`
  - In-memory cache invalidated on write; initialize empty map if file missing; log error and keep empty map if JSON invalid (do not overwrite corrupted file)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x]\* 3.1 Write property test for PresenterStore round-trip (file persistence)
    - **Property 4: Presenter assignment round-trip (file persistence)**
    - **Validates: Requirements 2.8, 4.3, 4.7**
    - Generate random `AvatarAssignment` records, write via `setAssignment`, read JSON from disk, assert deep equality

  - [x]\* 3.2 Write property test for AvatarAssignment serialization round-trip
    - **Property 5: AvatarAssignment serialization round-trip**
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.4**
    - Generate random `AvatarAssignment` records; serialize → deserialize → assert deep equality; deserialize → re-serialize → assert semantic equivalence

  - [x]\* 3.3 Write unit tests for PresenterStore edge cases
    - Test missing file initializes empty map (requirement 4.5)
    - Test invalid JSON initializes empty map without overwriting (requirement 4.6)
    - Test unrecognized `mode` value returns parse error (requirement 14.5)
    - _Requirements: 4.5, 4.6, 14.5_

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement AdminAuthService
  - Create `lib/services/AdminAuthService.ts` implementing `IAdminAuthService`
  - Compare passphrase using `crypto.timingSafeEqual` against `ADMIN_SECRET`; return `false` immediately if `ADMIN_SECRET` is not set
  - Generate session tokens as signed HMACs (key = `ADMIN_SECRET`); store active tokens in a server-side `Set` with TTL
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_

  - [x]\* 5.1 Write property test for passphrase rejection for non-matching inputs
    - **Property 1: Passphrase rejection for non-matching inputs**
    - **Validates: Requirements 1.1, 1.3**
    - `fc.assert(fc.property(fc.string(), (p) => { fc.pre(p !== process.env.ADMIN_SECRET); return adminAuthService.validatePassphrase(p) === false; }), { numRuns: 100 })`

  - [x]\* 5.2 Write unit tests for AdminAuthService
    - Test correct passphrase grants access (requirement 1.2)
    - Test missing `ADMIN_SECRET` denies all access (requirement 1.5)
    - Test `ADMIN_SECRET` value never appears in any return value (requirement 1.6)
    - _Requirements: 1.2, 1.5, 1.6_

- [x] 6. Implement FileValidationService
  - Create `lib/services/FileValidationService.ts` implementing `IFileValidationService`
  - `validatePhoto`: check magic bytes `FF D8 FF` (JPEG) or `89 50 4E 47` (PNG); ignore `Content-Type` header
  - `validateModel`: check GLB magic bytes `67 6C 54 46`; or valid VRM JSON with `extensionsUsed` containing `"VRM"`
  - `sanitizeFilename`: strip path separators and `..`; replace non-`[a-zA-Z0-9._-]` with `_`
  - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x]\* 6.1 Write property test for photo upload accepts valid types and rejects invalid types
    - **Property 2: Photo upload accepts valid types and rejects invalid types**
    - **Validates: Requirements 2.2, 2.3, 16.1**
    - Generate buffers with JPEG/PNG magic bytes (valid) and arbitrary bytes (invalid); assert `validatePhoto` returns `valid: true` / `valid: false` accordingly

  - [x]\* 6.2 Write property test for model upload accepts valid types and rejects invalid types
    - **Property 3: Model upload accepts valid types and rejects invalid types**
    - **Validates: Requirements 3.2, 3.3, 16.2**
    - Generate buffers with GLB magic bytes or valid VRM JSON (valid) and arbitrary bytes (invalid); assert `validateModel` returns correct result

  - [x]\* 6.3 Write property test for filename sanitization
    - **Property 8: Filename sanitization removes path traversal and invalid characters**
    - **Validates: Requirements 16.3, 16.4**
    - Generate arbitrary filename strings; assert sanitized output contains no `/`, `\`, `..` and only `[a-zA-Z0-9._-]` characters

- [x] 7. Implement DIDService
  - Create `lib/services/DIDService.ts` implementing `IDIDService`
  - Read `DID_API_KEY` from env; return `CONFIG_ERROR` on any call if missing; log missing variable name once at startup
  - `createPresenter`: POST to D-ID `/presenters` with photo buffer as data URI; return presenter ID or `DIDError`
  - `generateTalk`: POST to D-ID `/talks`; poll `/talks/{id}` at 1-second intervals; timeout at 30 s; return video URL or `DIDError`
  - Never instantiate in client components
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 13.1, 13.2, 13.4, 15.2_

  - [x]\* 7.1 Write unit tests for DIDService
    - Test successful presenter creation (requirement 2.5)
    - Test D-ID API error does not write to store (requirement 2.7)
    - Test poll returns video URL on `"done"` status (requirement 6.4)
    - Test poll returns error on `"error"` status (requirement 6.5)
    - Test timeout after 30 s (requirement 6.6)
    - Test `CONFIG_ERROR` when `DID_API_KEY` missing (requirement 13.4)
    - _Requirements: 2.5, 2.7, 6.4, 6.5, 6.6, 13.4_

- [x] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement API routes — public avatar assignment endpoint
  - Create `app/api/avatar/assignment/route.ts` (GET)
  - Accept `agentId` query param; return `AvatarAssignment` JSON (HTTP 200), HTTP 404 if not found, HTTP 400 if param missing/empty
  - No admin auth required; never expose `ADMIN_SECRET` or `DID_API_KEY` in response
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [ ]\* 9.1 Write unit tests for `/api/avatar/assignment`
    - Test returns 404 for unknown `agentId` (requirement 12.3)
    - Test returns 400 for missing `agentId` (requirement 12.4)
    - Test returns 200 with assignment for known `agentId` (requirement 12.2)
    - _Requirements: 12.2, 12.3, 12.4_

- [x] 10. Implement API routes — admin auth endpoint
  - Create `app/api/admin/avatar/auth/route.ts` (POST)
  - Validate passphrase via `AdminAuthService`; return session token on success (HTTP 200) or HTTP 401 on failure
  - Never include `ADMIN_SECRET` in response body or logs
  - _Requirements: 1.1, 1.2, 1.3, 1.6_

- [x] 11. Implement API routes — photo upload endpoint
  - Create `app/api/admin/avatar/upload-photo/route.ts` (POST)
  - Require valid admin session token (HTTP 401 if missing/invalid)
  - Validate file via `FileValidationService` magic bytes check; reject non-JPEG/PNG with HTTP 422; reject > 10 MB with HTTP 413
  - On valid file: call `DIDService.createPresenter`; on success write presenter ID to `PresenterStore`; on D-ID error return HTTP 502 without writing to store
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 16.1, 16.5, 16.6_

- [x] 12. Implement API routes — model upload endpoint
  - Create `app/api/admin/avatar/upload-model/route.ts` (POST)
  - Require valid admin session token (HTTP 401 if missing/invalid)
  - Validate file via `FileValidationService`; reject non-GLB/VRM with HTTP 422; reject > 50 MB with HTTP 413
  - Sanitize filename; write to `public/models/`; overwrite if exists; write model path to `PresenterStore` with `mode: "glb"`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 16.2, 16.3, 16.4, 16.5, 16.6_

  - [x]\* 12.1 Write property test for model upload overwrite idempotence
    - **Property 12: Model upload overwrite is idempotent**
    - **Validates: Requirements 3.7**
    - Upload same valid model file twice with same filename; assert `Model_Store` contains exactly one file and its content equals the uploaded file

- [x] 13. Implement API route — D-ID talk generation endpoint
  - Create `app/api/did/generate-talk/route.ts` (POST)
  - Accept `{ presenterId, audioBuffer }` in request body
  - Call `DIDService.generateTalk`; return `{ videoUrl }` on success or error details on failure
  - Do not call D-ID API when `presenterId` is absent (return HTTP 400)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]\* 13.1 Write property test for D-ID API not called without presenter ID
    - **Property 7: D-ID API not called without presenter ID**
    - **Validates: Requirements 6.7**
    - For any agent with no assignment or `mode !== "did"`, assert no HTTP request is made to the D-ID API

- [x] 14. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement ThinkingAnimator component
  - Create `components/ThinkingAnimator.tsx` with CSS/canvas looping animation
  - Minimum 24 FPS; does not block audio playback or UI interaction
  - Accept `fallbackImageUrl?: string` and `className?: string` props
  - Display static fallback image when `fallbackImageUrl` is provided and animation stops
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 16. Implement TalkingHeadPlayer component
  - Create `components/TalkingHeadPlayer.tsx`
  - Render `<video>` element; mute video's own audio track; read `didVideoUrl` from `AppStore`
  - Show `ThinkingAnimator` while `playbackState === "loading"`
  - On video end: display last frame as static image; set `playbackState` to `"idle"`
  - On video load failure: display static fallback image; log error; set `playbackState` to `"idle"`
  - Begin loading/playing within 500 ms of receiving URL; support MP4/H.264
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x]\* 16.1 Write unit tests for TalkingHeadPlayer
    - Test displays `ThinkingAnimator` when `playbackState === "loading"` (requirement 7.1)
    - Test displays static fallback on video load failure (requirement 8.5)
    - Test video audio track is muted (requirement 8.4)
    - _Requirements: 7.1, 8.4, 8.5_

- [x] 17. Implement GLBVRMRenderer component
  - Create `components/GLBVRMRenderer.tsx` as a thin wrapper around existing `AvatarCanvas`
  - Pass `modelPath` as `modelUrl` to `AvatarCanvas`; show loading indicator while model loads
  - Display error state and log failure if model cannot be loaded
  - Release WebGL resources on unmount to prevent memory leaks
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x]\* 17.1 Write unit tests for GLBVRMRenderer
    - Test displays loading indicator while model loads (requirement 9.3)
    - Test displays error state on model load failure (requirement 9.4)
    - Test WebGL resources released on unmount (requirement 9.6)
    - _Requirements: 9.3, 9.4, 9.6_

- [x] 18. Extend VisemeCoordinator for GLB/VRM lip sync
  - Update `lib/services/VisemeCoordinator.ts` to expose blendshape morph targets from loaded GLB/VRM model
  - Apply each viseme blendshape within 50 ms of its scheduled `audioOffset` timestamp
  - On `stop()`: reset all mouth blendshapes to neutral (zero) values
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x]\* 18.1 Write property test for VisemeCoordinator resets to neutral on stop
    - **Property 10: VisemeCoordinator resets to neutral on stop**
    - **Validates: Requirements 10.3**
    - Generate random `VisemeEvent` arrays; start coordinator; call `stop()`; assert all blendshape morph target influences are 0

  - [x]\* 18.2 Write property test for VisemeCoordinator confluence
    - **Property 11: VisemeCoordinator confluence — scheduling order does not affect outcome**
    - **Validates: Requirements 10.5**
    - Generate random `VisemeEvent` arrays; shuffle; assert same sequence of blendshape values applied regardless of input order

- [x] 19. Implement AvatarSystem orchestrator component
  - Create `components/AvatarSystem.tsx`
  - Subscribe to `selectedAgentId` in `AppStore`; on change fetch `/api/avatar/assignment?agentId=`
  - Show loading indicator while fetching; show error state on fetch failure
  - If `mode === "did"`: set `AppStore.avatarMode = "did"`, mount `TalkingHeadPlayer`, unmount `GLBVRMRenderer`
  - If `mode === "glb"`: set `AppStore.avatarMode = "glb"`, mount `GLBVRMRenderer`, unmount `TalkingHeadPlayer`
  - If no assignment: fall back to `config/avatars.ts` static mapping; set `AppStore.avatarMode = "none"`
  - On AI response with D-ID mode: call `/api/did/generate-talk`; set `playbackState = "loading"` during poll; set `didVideoUrl` and `playbackState = "playing"` on success; show `ThinkingAnimator` static fallback on error without interrupting TTS audio
  - Log all D-ID failures with error type, HTTP status, `agentId`, and timestamp
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 15.1, 15.3, 15.4, 17.2, 17.3, 17.4, 17.5_

  - [ ]\* 19.1 Write property test for correct renderer activated for assignment mode
    - **Property 6: Correct renderer activated for assignment mode**
    - **Validates: Requirements 5.2, 5.3**
    - For any `AvatarAssignment`, assert `TalkingHeadPlayer` mounted and `GLBVRMRenderer` unmounted when `mode === "did"`, and vice versa when `mode === "glb"`

  - [ ]\* 19.2 Write unit tests for AvatarSystem
    - Test falls back to `config/avatars.ts` when no assignment exists (requirement 5.4)
    - Test shows loading indicator while fetching assignment (requirement 5.5)
    - Test shows error state on fetch failure (requirement 5.6)
    - Test D-ID failure shows `ThinkingAnimator` fallback without interrupting audio (requirement 15.1)
    - _Requirements: 5.4, 5.5, 5.6, 15.1_

- [x] 20. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. Implement AdminAuthGate and AdminAvatarPanel components
  - Create `components/AdminAuthGate.tsx`: render passphrase form when unauthenticated; store session state in `sessionStorage` (not cookie or localStorage); call `/api/admin/avatar/auth` to validate; render `AdminAvatarPanel` on success
  - Create `components/AdminAvatarPanel.tsx`: list all agents with current `AvatarAssignment`; provide photo upload and GLB/VRM upload controls per agent; call upload endpoints on submit; refresh assignment display on success without full page reload; display API error messages on failure
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [ ]\* 21.1 Write unit tests for AdminAuthGate
    - Test renders no upload controls while unauthenticated (requirement 1.4)
    - Test renders `AdminAvatarPanel` after successful authentication (requirement 1.2)
    - Test displays error message on wrong passphrase (requirement 1.3)
    - _Requirements: 1.2, 1.3, 1.4_

- [x] 22. Create admin route page
  - Create `app/admin/avatar/page.tsx` rendering `AdminAuthGate`
  - Ensure route is not linked from any public navigation
  - _Requirements: 11.7_

- [x] 23. Wire AvatarSystem into the main chat UI
  - Import and render `AvatarSystem` in the avatar panel area of the chat UI (e.g., `app/page.tsx` or the relevant layout component)
  - Ensure `AvatarSystem` replaces or wraps the existing avatar panel so `selectedAgentId` changes drive avatar switching
  - _Requirements: 5.1, 5.2, 5.3, 17.1, 17.2_

- [x] 24. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with `numRuns: 100` minimum; each must include the comment tag `// Feature: photorealistic-avatar, Property {N}: {property_text}`
- `DIDService` and `PresenterStore` are server-side only — never import them in client components
- Atomic writes in `PresenterStore` use a `.tmp` file + `fs.rename` to prevent partial-write corruption
- `ADMIN_SECRET` and `DID_API_KEY` must never appear in client bundles, API responses, or logs
