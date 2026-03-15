# Requirements Document

## Introduction

This feature adds a photorealistic AI avatar system to the Persona-Ready-Avatar Next.js application. The system supports two rendering modes: a D-ID Talking Head mode that produces lip-synced video clips from a real photo using the D-ID API, and a GLB/VRM 3D Avatar mode that renders a real-time animated character using the existing react-three-fiber pipeline. An admin-gated UI allows uploading photos or 3D model files and assigning them to specific AI agents. The correct avatar loads automatically when an agent is selected in the chat UI.

---

## Glossary

- **Avatar_System**: The top-level orchestrator that selects and activates the correct rendering mode for the active agent.
- **DID_Service**: The server-side service responsible for communicating with the D-ID REST API to create presenters and generate lip-synced video clips.
- **DID_Presenter**: A persistent D-ID resource created from a photo upload, identified by a presenter ID string.
- **Presenter_Store**: The server-side JSON config file (`config/avatar-assignments.json`) that persists per-agent avatar assignments including presenter IDs and GLB/VRM model paths.
- **Admin_UI**: The password-protected interface through which an administrator uploads photos or 3D model files and assigns avatars to agents.
- **Admin_Auth**: The authentication mechanism that validates the ADMIN_SECRET passphrase before granting access to the Admin_UI.
- **Talking_Head_Player**: The client-side component that receives a D-ID video URL and plays the lip-synced video clip in the avatar panel.
- **Thinking_Animator**: The client-side component that displays a looping animation in the avatar panel while a D-ID clip is being generated.
- **GLB_VRM_Renderer**: The client-side component that loads and renders a GLB or VRM model using the existing AvatarCanvas / react-three-fiber pipeline.
- **Model_Store**: The server-side directory (`public/models/`) where uploaded GLB/VRM files are persisted.
- **VisemeCoordinator**: The existing `lib/services/VisemeCoordinator.ts` service that drives blendshape animation from Azure TTS viseme events.
- **TTSService**: The existing `lib/services/TTSService.ts` service that synthesizes speech and emits `VisemeEvent[]`.
- **AvatarCanvas**: The existing `components/AvatarCanvas.tsx` Three.js canvas with WebGL context management.
- **ShaderManager**: The existing `lib/shaders/ShaderManager.ts` that applies PBR skin, hair, and eye shaders to a loaded model.
- **AppStore**: The existing Zustand store in `lib/store/useAppStore.ts` that holds `selectedAgentId`, `playbackState`, and `currentViseme`.
- **Agent**: An AI persona identified by a unique `agentId` string.
- **ADMIN_SECRET**: An environment variable containing the passphrase required to access the Admin_UI.
- **AvatarAssignment**: A record that maps an `agentId` to either a `DID_Presenter` or a GLB/VRM model path, plus a `mode` field (`"did"` or `"glb"`).

---

## Requirements

### Requirement 1: Admin Authentication

**User Story:** As an administrator, I want to authenticate with a passphrase before accessing avatar management, so that regular users cannot upload or modify avatar configurations.

#### Acceptance Criteria

1. THE Admin_Auth SHALL accept a passphrase entered by the user and compare it against the ADMIN_SECRET environment variable.
2. WHEN the entered passphrase matches ADMIN_SECRET, THE Admin_Auth SHALL grant access to the Admin_UI for the duration of the browser session.
3. WHEN the entered passphrase does not match ADMIN_SECRET, THE Admin_Auth SHALL display an error message and deny access to the Admin_UI.
4. WHILE the user has not authenticated, THE Admin_UI SHALL render no upload controls, no agent assignment controls, and no existing assignment data.
5. IF ADMIN_SECRET is not set in the environment, THEN THE Admin_Auth SHALL deny all access attempts and log a configuration error.
6. THE Admin_Auth SHALL not expose the ADMIN_SECRET value in any client-side bundle, API response, or log output.

---

### Requirement 2: Photo Upload for D-ID Presenter Creation

**User Story:** As an administrator, I want to upload a photo once and have the system create a persistent D-ID presenter, so that I do not need to re-upload the photo for every conversation.

#### Acceptance Criteria

1. WHEN an authenticated admin submits a photo file via the Admin_UI, THE Admin_UI SHALL send the file to the `/api/admin/avatar/upload-photo` endpoint.
2. THE `/api/admin/avatar/upload-photo` endpoint SHALL accept JPEG and PNG files up to 10 MB in size.
3. IF the uploaded file is not JPEG or PNG, THEN THE `/api/admin/avatar/upload-photo` endpoint SHALL return HTTP 422 with a descriptive error message.
4. IF the uploaded file exceeds 10 MB, THEN THE `/api/admin/avatar/upload-photo` endpoint SHALL return HTTP 413 with a descriptive error message.
5. WHEN a valid photo is received, THE DID_Service SHALL call the D-ID `/presenters` API endpoint to create a new DID_Presenter.
6. WHEN the D-ID API returns a presenter ID, THE DID_Service SHALL write the presenter ID to the Presenter_Store under the specified `agentId`.
7. IF the D-ID API returns an error, THEN THE DID_Service SHALL return the error details to the Admin_UI without writing to the Presenter_Store.
8. THE Presenter_Store SHALL persist presenter assignments across server restarts.

---

### Requirement 3: GLB/VRM Model Upload

**User Story:** As an administrator, I want to upload a GLB or VRM file once and have it stored server-side, so that the 3D avatar is available for rendering without re-uploading.

#### Acceptance Criteria

1. WHEN an authenticated admin submits a GLB or VRM file via the Admin_UI, THE Admin_UI SHALL send the file to the `/api/admin/avatar/upload-model` endpoint.
2. THE `/api/admin/avatar/upload-model` endpoint SHALL accept files with `.glb` or `.vrm` extensions up to 50 MB in size.
3. IF the uploaded file does not have a `.glb` or `.vrm` extension, THEN THE `/api/admin/avatar/upload-model` endpoint SHALL return HTTP 422 with a descriptive error message.
4. IF the uploaded file exceeds 50 MB, THEN THE `/api/admin/avatar/upload-model` endpoint SHALL return HTTP 413 with a descriptive error message.
5. WHEN a valid model file is received, THE `/api/admin/avatar/upload-model` endpoint SHALL write the file to the Model_Store using a filename derived from the original filename.
6. WHEN the file is written successfully, THE `/api/admin/avatar/upload-model` endpoint SHALL write the public model path to the Presenter_Store under the specified `agentId` with `mode: "glb"`.
7. IF a file with the same name already exists in the Model_Store, THEN THE `/api/admin/avatar/upload-model` endpoint SHALL overwrite the existing file.

---

### Requirement 4: Per-Agent Avatar Assignment Persistence

**User Story:** As an administrator, I want each agent's avatar assignment to persist across server restarts, so that I do not need to reconfigure avatars after deployments.

#### Acceptance Criteria

1. THE Presenter_Store SHALL store AvatarAssignment records as a JSON object keyed by `agentId`.
2. THE Presenter_Store SHALL be written atomically to prevent partial writes from corrupting the config file.
3. WHEN the server starts, THE Avatar_System SHALL read the Presenter_Store and make all AvatarAssignment records available for lookup.
4. WHEN an AvatarAssignment is created or updated, THE Presenter_Store SHALL be written within 500 ms of the change.
5. IF the Presenter_Store file is missing on server start, THEN THE Avatar_System SHALL initialize an empty assignment map and create the file on the first write.
6. IF the Presenter_Store file contains invalid JSON on server start, THEN THE Avatar_System SHALL log a parse error, initialize an empty assignment map, and not overwrite the corrupted file.
7. FOR ALL valid AvatarAssignment records written to the Presenter_Store, reading the file and parsing the JSON SHALL produce an equivalent AvatarAssignment record (round-trip property).

---

### Requirement 5: Agent Avatar Selection at Runtime

**User Story:** As a user, I want the correct avatar to load automatically when I select an agent, so that I see the right persona without any manual configuration.

#### Acceptance Criteria

1. WHEN `selectedAgentId` changes in the AppStore, THE Avatar_System SHALL query the Presenter_Store for the AvatarAssignment associated with that `agentId`.
2. WHEN the AvatarAssignment has `mode: "did"`, THE Avatar_System SHALL activate the Talking_Head_Player and deactivate the GLB_VRM_Renderer.
3. WHEN the AvatarAssignment has `mode: "glb"`, THE Avatar_System SHALL activate the GLB_VRM_Renderer and deactivate the Talking_Head_Player.
4. WHEN no AvatarAssignment exists for the selected `agentId`, THE Avatar_System SHALL fall back to the existing `config/avatars.ts` static mapping.
5. WHILE the AvatarAssignment is being fetched, THE Avatar_System SHALL display a loading indicator in the avatar panel.
6. IF the AvatarAssignment fetch fails, THEN THE Avatar_System SHALL display an error state in the avatar panel and log the error.

---

### Requirement 6: D-ID Video Generation per AI Response

**User Story:** As a user, I want to see the avatar's lips move in sync with each AI response, so that the conversation feels natural and photorealistic.

#### Acceptance Criteria

1. WHEN the TTSService completes synthesis and returns an AudioBuffer, THE DID_Service SHALL receive the synthesized audio and the active presenter ID.
2. THE DID_Service SHALL call the D-ID `/talks` API endpoint with the audio data and presenter ID to request a lip-synced video clip.
3. WHEN the D-ID API returns a talk ID, THE DID_Service SHALL poll the D-ID `/talks/{id}` endpoint at 1-second intervals until the status is `"done"` or `"error"`.
4. WHEN the talk status is `"done"`, THE DID_Service SHALL return the video URL to the Talking_Head_Player.
5. IF the talk status is `"error"`, THEN THE DID_Service SHALL return an error result and the Talking_Head_Player SHALL display the Thinking_Animator fallback.
6. IF the D-ID API does not return a `"done"` status within 30 seconds, THEN THE DID_Service SHALL cancel the poll and return a timeout error.
7. THE DID_Service SHALL not call the D-ID API when no presenter ID is assigned to the active agent.

---

### Requirement 7: Thinking Animation During D-ID Generation

**User Story:** As a user, I want to see a visual indicator while the D-ID clip is being generated, so that I know the avatar is processing and the UI does not appear frozen.

#### Acceptance Criteria

1. WHEN the DID_Service begins polling for a talk result, THE Thinking_Animator SHALL start playing a looping animation in the avatar panel.
2. WHEN the DID_Service returns a video URL, THE Thinking_Animator SHALL stop and the Talking_Head_Player SHALL begin playing the video.
3. WHEN the DID_Service returns an error or timeout, THE Thinking_Animator SHALL stop and the avatar panel SHALL display a static fallback image.
4. THE Thinking_Animator SHALL not block audio playback or UI interaction while active.
5. WHILE the Thinking_Animator is active, THE avatar panel SHALL display a visible animation with a minimum frame rate of 24 frames per second.

---

### Requirement 8: D-ID Video Playback

**User Story:** As a user, I want the lip-synced video to play smoothly in the avatar panel, so that the avatar's speech matches the audio.

#### Acceptance Criteria

1. WHEN the Talking_Head_Player receives a video URL, THE Talking_Head_Player SHALL begin loading and playing the video within 500 ms of receiving the URL.
2. THE Talking_Head_Player SHALL play the video and the TTS audio in synchronization, with a maximum audio-to-video offset of 200 ms.
3. WHEN the video finishes playing, THE Talking_Head_Player SHALL display the last frame of the video as a static image.
4. THE Talking_Head_Player SHALL mute the video's own audio track and rely solely on the AudioManager for audio output.
5. IF the video URL fails to load, THEN THE Talking_Head_Player SHALL display a static fallback image and log the error.
6. THE Talking_Head_Player SHALL support video formats returned by the D-ID API, including MP4 with H.264 encoding.

---

### Requirement 9: GLB/VRM 3D Avatar Rendering

**User Story:** As a user, I want the 3D avatar to render in real time with PBR shading, so that the avatar looks visually consistent with the rest of the application.

#### Acceptance Criteria

1. WHEN the GLB_VRM_Renderer is activated with a model path, THE GLB_VRM_Renderer SHALL load the model from the Model_Store using the existing AvatarCanvas pipeline.
2. WHEN the model is loaded, THE ShaderManager SHALL apply the SkinShader, HairShader, and EyeShader to the corresponding mesh materials.
3. WHILE the model is loading, THE GLB_VRM_Renderer SHALL display a loading indicator in the avatar panel.
4. IF the model file cannot be loaded, THEN THE GLB_VRM_Renderer SHALL display an error state and log the failure.
5. THE GLB_VRM_Renderer SHALL render at a minimum of 30 frames per second on a device with a mid-range GPU.
6. THE GLB_VRM_Renderer SHALL release WebGL resources when deactivated to prevent memory leaks.

---

### Requirement 10: Lip Sync for GLB/VRM Mode

**User Story:** As a user, I want the 3D avatar's mouth to move in sync with the TTS audio, so that the avatar appears to be speaking.

#### Acceptance Criteria

1. WHEN the TTSService emits VisemeEvent data, THE VisemeCoordinator SHALL schedule blendshape updates on the loaded GLB/VRM model.
2. THE VisemeCoordinator SHALL apply each viseme blendshape within 50 ms of its scheduled `audioOffset` timestamp.
3. WHEN the TTSService stops playback, THE VisemeCoordinator SHALL reset all mouth blendshapes to their neutral (zero) values.
4. THE GLB_VRM_Renderer SHALL expose the model's blendshape morph targets to the VisemeCoordinator using the existing interface.
5. FOR ALL sequences of VisemeEvent arrays with the same content, the sequence of blendshape values applied to the model SHALL be identical regardless of the order in which the events are scheduled (confluence property).

---

### Requirement 11: Admin UI — Avatar Management Interface

**User Story:** As an administrator, I want a dedicated interface to manage avatar assignments for all agents, so that I can configure the system without editing config files manually.

#### Acceptance Criteria

1. THE Admin_UI SHALL display a list of all agents defined in the application alongside their current AvatarAssignment (if any).
2. THE Admin_UI SHALL provide a photo upload control and a GLB/VRM upload control for each agent.
3. WHEN an admin selects a photo file and submits it for an agent, THE Admin_UI SHALL call the `/api/admin/avatar/upload-photo` endpoint and display the result.
4. WHEN an admin selects a GLB/VRM file and submits it for an agent, THE Admin_UI SHALL call the `/api/admin/avatar/upload-model` endpoint and display the result.
5. WHEN an upload succeeds, THE Admin_UI SHALL refresh the displayed AvatarAssignment for the affected agent without a full page reload.
6. WHEN an upload fails, THE Admin_UI SHALL display the error message returned by the API endpoint.
7. THE Admin_UI SHALL be accessible only at a route protected by Admin_Auth and SHALL not be linked from any public navigation.

---

### Requirement 12: Avatar Assignment API

**User Story:** As an administrator, I want the avatar assignment to be readable via an API, so that the client can fetch the correct avatar configuration for the selected agent.

#### Acceptance Criteria

1. THE `/api/avatar/assignment` endpoint SHALL accept a `agentId` query parameter and return the AvatarAssignment for that agent.
2. WHEN a valid `agentId` is provided and an assignment exists, THE `/api/avatar/assignment` endpoint SHALL return HTTP 200 with the AvatarAssignment as JSON.
3. WHEN a valid `agentId` is provided but no assignment exists, THE `/api/avatar/assignment` endpoint SHALL return HTTP 404.
4. IF the `agentId` query parameter is missing or empty, THEN THE `/api/avatar/assignment` endpoint SHALL return HTTP 400 with a descriptive error message.
5. THE `/api/avatar/assignment` endpoint SHALL not require admin authentication and SHALL be accessible to all clients.
6. THE `/api/avatar/assignment` endpoint SHALL not expose the ADMIN_SECRET or any other server-side secret in its response.

---

### Requirement 13: D-ID API Key Security

**User Story:** As a developer, I want the D-ID API key to remain server-side only, so that it is never exposed to browser clients.

#### Acceptance Criteria

1. THE DID_Service SHALL read the D-ID API key exclusively from a server-side environment variable (`DID_API_KEY`).
2. THE DID_Service SHALL only be instantiated in Next.js API routes or server components, never in client components.
3. THE Avatar_System SHALL not include the D-ID API key in any client-side API response, HTML output, or JavaScript bundle.
4. IF `DID_API_KEY` is not set, THEN THE DID_Service SHALL return a configuration error on any call and log the missing variable name.

---

### Requirement 14: Presenter_Store Round-Trip Integrity

**User Story:** As a developer, I want the avatar assignment config file to be reliably serializable and deserializable, so that assignments are never silently corrupted.

#### Acceptance Criteria

1. THE Presenter_Store serializer SHALL produce valid JSON for any AvatarAssignment record.
2. THE Presenter_Store deserializer SHALL parse any JSON produced by the serializer back into an equivalent AvatarAssignment record.
3. FOR ALL AvatarAssignment records, serializing then deserializing SHALL produce a record that is deeply equal to the original (round-trip property).
4. FOR ALL AvatarAssignment records, deserializing then serializing SHALL produce a JSON string that is semantically equivalent to the original JSON (round-trip property).
5. IF the Presenter_Store JSON contains an unrecognized `mode` value, THEN THE deserializer SHALL return a parse error rather than silently producing an invalid AvatarAssignment.

---

### Requirement 15: Graceful Degradation

**User Story:** As a user, I want the application to remain functional when the D-ID API is unavailable, so that I can still have conversations even without the photorealistic video.

#### Acceptance Criteria

1. IF the DID_Service returns an error for a talk request, THEN THE Avatar_System SHALL display the Thinking_Animator static fallback and continue audio playback via the AudioManager.
2. IF the D-ID API is unreachable, THEN THE DID_Service SHALL return a network error result within 10 seconds.
3. WHEN the Avatar_System falls back to static display, THE Avatar_System SHALL not interrupt or delay TTS audio playback.
4. THE Avatar_System SHALL log each D-ID API failure with the error type, HTTP status code (if available), and the affected `agentId`.
5. WHERE the GLB/VRM mode is configured for an agent, THE GLB_VRM_Renderer SHALL continue rendering and lip-syncing independently of the D-ID API.

---

### Requirement 16: File Upload Security

**User Story:** As a developer, I want uploaded files to be validated and sanitized before storage, so that malicious files cannot compromise the server.

#### Acceptance Criteria

1. THE `/api/admin/avatar/upload-photo` endpoint SHALL validate the MIME type of the uploaded file by inspecting the file's magic bytes, not only the `Content-Type` header.
2. THE `/api/admin/avatar/upload-model` endpoint SHALL validate that the uploaded file begins with a valid GLB magic number (`0x676C5446`) or is a valid VRM JSON structure.
3. THE upload endpoints SHALL strip any path traversal sequences from the filename before writing to the Model_Store.
4. THE upload endpoints SHALL generate a sanitized filename that contains only alphanumeric characters, hyphens, underscores, and the original file extension.
5. IF a file fails validation, THEN THE upload endpoint SHALL return HTTP 422 and SHALL not write any data to the filesystem.
6. THE upload endpoints SHALL require a valid Admin_Auth session; requests without a valid session SHALL receive HTTP 401.

---

### Requirement 17: AppStore Integration

**User Story:** As a developer, I want the avatar rendering mode and playback state to be reflected in the AppStore, so that all UI components can react to avatar state changes consistently.

#### Acceptance Criteria

1. THE AppStore SHALL expose an `avatarMode` field with values `"did"`, `"glb"`, or `"none"`.
2. WHEN the Avatar_System activates a rendering mode, THE AppStore SHALL update `avatarMode` to the corresponding value.
3. WHEN the DID_Service begins generating a clip, THE AppStore SHALL set `playbackState` to `"loading"`.
4. WHEN the Talking_Head_Player begins playing a video, THE AppStore SHALL set `playbackState` to `"playing"`.
5. WHEN playback ends or an error occurs, THE AppStore SHALL set `playbackState` to `"idle"`.
6. THE AppStore SHALL expose a `didVideoUrl` field that holds the current video URL or `null` when no video is active.
7. FOR ALL sequences of avatar mode transitions, the final `avatarMode` value in the AppStore SHALL equal the mode of the last completed transition (idempotence property: applying the same mode transition twice SHALL produce the same state as applying it once).
