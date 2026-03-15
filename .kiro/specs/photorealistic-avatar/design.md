# Design Document: Photorealistic Avatar System

## Overview

The Photorealistic Avatar System adds two rendering modes to the existing Next.js application:

1. **D-ID Talking Head** — a real photo is uploaded once, a persistent D-ID presenter is created, and each AI response triggers a lip-synced video clip via the D-ID `/talks` API.
2. **GLB/VRM 3D Avatar** — a 3D model file is uploaded once, stored in `public/models/`, and rendered in real time using the existing `AvatarCanvas` / react-three-fiber pipeline with PBR shaders and `VisemeCoordinator` lip sync.

An admin-gated UI (protected by `ADMIN_SECRET`) lets administrators upload assets and assign them to agents. At runtime, when `selectedAgentId` changes in the Zustand `AppStore`, the system reads `config/avatar-assignments.json`, selects the correct mode, and activates the appropriate renderer. The D-ID API key and admin secret never leave the server.

### Key Design Decisions

- **Server-side config file** (`config/avatar-assignments.json`) rather than a database — keeps the deployment simple and consistent with the existing `config/avatars.ts` pattern.
- **Atomic writes** via a temp-file-then-rename strategy to prevent partial-write corruption.
- **Mode isolation** — `TalkingHeadPlayer` and `GLBVRMRenderer` are mutually exclusive; only one mounts at a time, ensuring WebGL resources are released when switching.
- **Graceful degradation** — D-ID failures fall back to a static image + `ThinkingAnimator` without interrupting TTS audio.
- **No client-side secrets** — all D-ID and admin API calls are proxied through Next.js API routes.

---

## Architecture

```mermaid
graph TD
    subgraph Browser
        UI[Chat UI / Agent Selector]
        AS[AvatarSystem component]
        THP[TalkingHeadPlayer]
        TA[ThinkingAnimator]
        GR[GLBVRMRenderer → AvatarCanvas]
        Store[AppStore / Zustand]
    end

    subgraph Next.js API Routes
        AA[/api/avatar/assignment]
        UP[/api/admin/avatar/upload-photo]
        UM[/api/admin/avatar/upload-model]
        DT[/api/did/generate-talk]
    end

    subgraph Server Services
        DS[DIDService]
        PS[PresenterStore]
        FS[FileStore - public/models/]
    end

    subgraph External
        DID[D-ID REST API]
    end

    UI -->|setSelectedAgent| Store
    Store -->|selectedAgentId| AS
    AS -->|GET agentId| AA
    AA --> PS
    PS -->|AvatarAssignment| AA
    AA -->|AvatarAssignment JSON| AS
    AS -->|mode=did| THP
    AS -->|mode=glb| GR
    THP -->|POST audio+presenterId| DT
    DT --> DS
    DS --> DID
    DID -->|talkId| DS
    DS -->|poll /talks/{id}| DID
    DID -->|videoUrl| DS
    DS -->|videoUrl| DT
    DT -->|videoUrl| THP
    THP -->|didVideoUrl| Store
    UP --> DS
    DS --> DID
    DID -->|presenterId| DS
    DS --> PS
    UM --> FS
    UM --> PS
```

### Data Flow: D-ID Mode

1. User selects agent → `AppStore.setSelectedAgent(agentId)`
2. `AvatarSystem` fetches `/api/avatar/assignment?agentId=X` → receives `{ mode: "did", presenterId: "..." }`
3. `AppStore.avatarMode` set to `"did"`, `TalkingHeadPlayer` mounts
4. AI response arrives → `TTSService.synthesizeSpeech()` returns `AudioBuffer`
5. `AvatarSystem` calls `/api/did/generate-talk` with audio + presenterId
6. Server polls D-ID until `"done"` → returns `videoUrl`
7. `AppStore.didVideoUrl` set, `playbackState` → `"playing"`
8. `TalkingHeadPlayer` plays video (muted) in sync with `AudioManager`

### Data Flow: GLB/VRM Mode

1. User selects agent → `AppStore.setSelectedAgent(agentId)`
2. `AvatarSystem` fetches assignment → `{ mode: "glb", modelPath: "/models/agent.glb" }`
3. `AppStore.avatarMode` set to `"glb"`, `GLBVRMRenderer` mounts with `modelPath`
4. `AvatarCanvas` loads model, `ShaderManager` applies PBR shaders
5. AI response → `TTSService` synthesizes, `VisemeCoordinator` drives blendshapes

---

## Components and Interfaces

### New Client Components

#### `AvatarSystem`

Top-level orchestrator. Subscribes to `selectedAgentId` in `AppStore`, fetches the assignment, and conditionally renders either `TalkingHeadPlayer` or `GLBVRMRenderer`.

```typescript
interface AvatarSystemProps {
  className?: string;
}
```

Responsibilities:

- Fetch `AvatarAssignment` on agent change
- Update `AppStore.avatarMode`
- Render loading/error states
- Fall back to `config/avatars.ts` when no assignment exists

#### `TalkingHeadPlayer`

Renders a `<video>` element. Receives `didVideoUrl` from `AppStore`. Mutes the video's own audio track. Displays `ThinkingAnimator` while `playbackState === "loading"`.

```typescript
interface TalkingHeadPlayerProps {
  presenterId: string;
  className?: string;
}
```

#### `ThinkingAnimator`

CSS/canvas looping animation shown while D-ID generates. Minimum 24 FPS. Does not block audio.

```typescript
interface ThinkingAnimatorProps {
  fallbackImageUrl?: string;
  className?: string;
}
```

#### `GLBVRMRenderer`

Thin wrapper around the existing `AvatarCanvas`. Passes `modelPath` as `modelUrl`. Releases WebGL resources on unmount.

```typescript
interface GLBVRMRendererProps {
  modelPath: string;
  className?: string;
}
```

#### `AdminAvatarPanel`

Protected admin UI. Renders only when `isAuthenticated` is true. Lists agents with their current assignments and provides upload controls.

```typescript
interface AdminAvatarPanelProps {
  agents: Agent[];
}
```

#### `AdminAuthGate`

Wraps `AdminAvatarPanel`. Renders a passphrase form when unauthenticated. Stores session state in `sessionStorage` (never in a cookie or localStorage).

### New API Routes

| Route                            | Method | Auth            | Purpose                                    |
| -------------------------------- | ------ | --------------- | ------------------------------------------ |
| `/api/avatar/assignment`         | GET    | None            | Return `AvatarAssignment` for `?agentId=`  |
| `/api/admin/avatar/upload-photo` | POST   | Admin           | Upload photo → create D-ID presenter       |
| `/api/admin/avatar/upload-model` | POST   | Admin           | Upload GLB/VRM → store in `public/models/` |
| `/api/admin/avatar/auth`         | POST   | None            | Validate passphrase, return session token  |
| `/api/did/generate-talk`         | POST   | None (internal) | Generate D-ID talk, poll, return video URL |

### Server Services

#### `DIDService` (`lib/services/DIDService.ts`)

```typescript
interface IDIDService {
  createPresenter(
    photoBuffer: Buffer,
    mimeType: 'image/jpeg' | 'image/png'
  ): Promise<Result<string, DIDError>>;
  generateTalk(
    presenterId: string,
    audioBuffer: Buffer,
    audioMimeType: string
  ): Promise<Result<string, DIDError>>;
}

type DIDError =
  | { type: 'NETWORK_ERROR'; message: string }
  | { type: 'API_ERROR'; status: number; details: string }
  | { type: 'TIMEOUT'; durationMs: number }
  | { type: 'CONFIG_ERROR'; message: string };
```

- Reads `DID_API_KEY` from env; returns `CONFIG_ERROR` if missing
- `generateTalk` polls `/talks/{id}` at 1-second intervals, times out at 30 s
- Never instantiated in client components

#### `PresenterStore` (`lib/services/PresenterStore.ts`)

```typescript
interface IPresenterStore {
  getAssignment(agentId: string): AvatarAssignment | null;
  setAssignment(agentId: string, assignment: AvatarAssignment): Promise<void>;
  getAllAssignments(): Record<string, AvatarAssignment>;
}
```

- Reads/writes `config/avatar-assignments.json`
- Atomic writes via `fs.rename` after writing to a `.tmp` file
- In-memory cache; invalidated on write
- Initializes empty map if file missing; logs error and keeps empty map if JSON is invalid

#### `AdminAuthService` (`lib/services/AdminAuthService.ts`)

```typescript
interface IAdminAuthService {
  validatePassphrase(passphrase: string): boolean;
  generateSessionToken(): string;
  validateSessionToken(token: string): boolean;
}
```

- Compares against `ADMIN_SECRET` env var using `crypto.timingSafeEqual`
- Session tokens are signed HMACs (using `ADMIN_SECRET` as key), stored server-side in a `Set` with TTL
- Returns `false` immediately if `ADMIN_SECRET` is not set

#### `FileValidationService` (`lib/services/FileValidationService.ts`)

```typescript
interface IFileValidationService {
  validatePhoto(buffer: Buffer, contentType: string): ValidationResult;
  validateModel(buffer: Buffer, filename: string): ValidationResult;
  sanitizeFilename(filename: string): string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: string;
}
```

- Photo: checks magic bytes `FF D8 FF` (JPEG) or `89 50 4E 47` (PNG)
- GLB: checks magic bytes `67 6C 54 46` (`glTF`)
- VRM: checks for valid JSON with `extensionsUsed` containing `"VRM"`
- `sanitizeFilename`: strips path separators, replaces non-`[a-zA-Z0-9._-]` with `_`

---

## Data Models

### `AvatarAssignment`

```typescript
type AvatarAssignment =
  | { mode: 'did'; presenterId: string; agentId: string; createdAt: string }
  | { mode: 'glb'; modelPath: string; agentId: string; createdAt: string };
```

### `config/avatar-assignments.json` schema

```json
{
  "agent-1": {
    "mode": "did",
    "presenterId": "prs_abc123",
    "agentId": "agent-1",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "agent-2": {
    "mode": "glb",
    "modelPath": "/models/agent-2.glb",
    "agentId": "agent-2",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### AppStore additions

```typescript
// New fields added to AppState
avatarMode: 'did' | 'glb' | 'none';
setAvatarMode: (mode: 'did' | 'glb' | 'none') => void;

didVideoUrl: string | null;
setDidVideoUrl: (url: string | null) => void;

// playbackState already exists; extended semantics:
// 'loading' = D-ID clip generating
// 'playing' = video/audio playing
// 'idle'    = no active playback
```

### Environment Variables

| Variable           | Required        | Description                        |
| ------------------ | --------------- | ---------------------------------- |
| `DID_API_KEY`      | Yes (D-ID mode) | D-ID REST API key                  |
| `ADMIN_SECRET`     | Yes             | Passphrase for admin UI            |
| `DID_API_BASE_URL` | No              | Defaults to `https://api.d-id.com` |

### D-ID API Shapes (relevant subset)

```typescript
// POST /presenters
interface CreatePresenterRequest {
  source_url: string; // data URI or uploaded URL
}
interface CreatePresenterResponse {
  id: string; // presenter ID
}

// POST /talks
interface CreateTalkRequest {
  source_url: string; // presenter ID
  script: { type: 'audio'; audio_url: string };
}
interface CreateTalkResponse {
  id: string;
}

// GET /talks/{id}
interface TalkStatusResponse {
  id: string;
  status: 'created' | 'started' | 'done' | 'error';
  result_url?: string;
  error?: { kind: string; description: string };
}
```

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Passphrase rejection for non-matching inputs

_For any_ string that is not equal to `ADMIN_SECRET`, submitting it as a passphrase to `AdminAuthService.validatePassphrase` SHALL return `false` and no session token SHALL be issued.

**Validates: Requirements 1.1, 1.3**

### Property 2: Photo upload accepts valid types and rejects invalid types

_For any_ file buffer, if its magic bytes identify it as JPEG (`FF D8 FF`) or PNG (`89 50 4E 47`) and its size is ≤ 10 MB, the `/api/admin/avatar/upload-photo` endpoint SHALL accept it (HTTP 200/201); for any buffer whose magic bytes do not match JPEG or PNG, the endpoint SHALL return HTTP 422 regardless of the `Content-Type` header value.

**Validates: Requirements 2.2, 2.3, 16.1**

### Property 3: Model upload accepts valid types and rejects invalid types

_For any_ file buffer, if it begins with the GLB magic bytes (`67 6C 54 46`) or is valid VRM JSON and its size is ≤ 50 MB, the `/api/admin/avatar/upload-model` endpoint SHALL accept it; for any buffer that fails both checks, the endpoint SHALL return HTTP 422.

**Validates: Requirements 3.2, 3.3, 16.2**

### Property 4: Presenter assignment round-trip (file persistence)

_For any_ `AvatarAssignment` record written to `PresenterStore`, reading `config/avatar-assignments.json` from disk and parsing it SHALL produce a record that is deeply equal to the original.

**Validates: Requirements 2.8, 4.3, 4.7**

### Property 5: AvatarAssignment serialization round-trip

_For any_ valid `AvatarAssignment` record, serializing it to JSON and then deserializing the result SHALL produce a record that is deeply equal to the original, and deserializing then re-serializing SHALL produce a semantically equivalent JSON string.

**Validates: Requirements 14.1, 14.2, 14.3, 14.4**

### Property 6: Correct renderer activated for assignment mode

_For any_ `AvatarAssignment`, when `AvatarSystem` processes it: if `mode === "did"` then `TalkingHeadPlayer` SHALL be mounted and `GLBVRMRenderer` SHALL be unmounted; if `mode === "glb"` then `GLBVRMRenderer` SHALL be mounted and `TalkingHeadPlayer` SHALL be unmounted.

**Validates: Requirements 5.2, 5.3**

### Property 7: D-ID API not called without presenter ID

_For any_ agent with no `AvatarAssignment` (or with `mode !== "did"`), calling the talk-generation flow SHALL not result in any HTTP request to the D-ID API.

**Validates: Requirements 6.7**

### Property 8: Filename sanitization removes path traversal and invalid characters

_For any_ input filename string, `FileValidationService.sanitizeFilename` SHALL return a string that (a) contains no path separator characters (`/`, `\`, `..`), and (b) contains only characters matching `[a-zA-Z0-9._-]` plus the original file extension.

**Validates: Requirements 16.3, 16.4**

### Property 9: AppStore avatarMode reflects last completed transition (idempotence)

_For any_ sequence of `setAvatarMode` calls, the final value of `AppStore.avatarMode` SHALL equal the argument of the last call in the sequence; calling `setAvatarMode(m)` twice in succession SHALL produce the same state as calling it once.

**Validates: Requirements 17.2, 17.7**

### Property 10: VisemeCoordinator resets to neutral on stop

_For any_ sequence of `VisemeEvent` arrays passed to `VisemeCoordinator.start`, calling `stop()` SHALL result in all blendshape morph target influences being set to their neutral (zero) values.

**Validates: Requirements 10.3**

### Property 11: VisemeCoordinator confluence — scheduling order does not affect outcome

_For any_ array of `VisemeEvent` objects with the same content, the sequence of blendshape values applied to the model SHALL be identical regardless of the order in which the events are passed to `VisemeCoordinator.start`.

**Validates: Requirements 10.5**

### Property 12: Model upload overwrite is idempotent

_For any_ valid model file uploaded twice with the same filename, the final state of the `Model_Store` SHALL be identical to the state after a single upload (the second upload overwrites the first, leaving exactly one file).

**Validates: Requirements 3.7**

---

## Error Handling

### D-ID API Failures

| Failure                  | Behavior                                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Network unreachable      | `DIDService` returns `NETWORK_ERROR` within 10 s; `AvatarSystem` shows `ThinkingAnimator` static fallback; TTS audio continues uninterrupted |
| API returns error status | `DIDService` returns `API_ERROR` with status + details; same fallback                                                                        |
| Poll timeout (30 s)      | `DIDService` returns `TIMEOUT`; same fallback                                                                                                |
| Missing `DID_API_KEY`    | `DIDService` returns `CONFIG_ERROR` on every call; logged once at startup                                                                    |

All D-ID failures are logged with: error type, HTTP status (if available), affected `agentId`, and timestamp.

### File Upload Failures

| Failure                                  | HTTP Status | Behavior                                    |
| ---------------------------------------- | ----------- | ------------------------------------------- |
| Wrong MIME / magic bytes                 | 422         | No file written; descriptive error returned |
| File too large                           | 413         | No file written                             |
| Path traversal in filename               | 422         | No file written                             |
| Unauthenticated request                  | 401         | No file written                             |
| D-ID API error during presenter creation | 502         | No store write; error forwarded to Admin UI |

### PresenterStore Failures

| Failure                 | Behavior                                                               |
| ----------------------- | ---------------------------------------------------------------------- |
| File missing on startup | Initialize empty map; create file on first write                       |
| Invalid JSON on startup | Log parse error; initialize empty map; do NOT overwrite corrupted file |
| Write failure           | Return error to caller; log with path and OS error code                |

### Video Playback Failures

| Failure                  | Behavior                                 |
| ------------------------ | ---------------------------------------- |
| Video URL fails to load  | Display static fallback image; log error |
| Video format unsupported | Display static fallback image; log error |

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:

- Unit tests cover specific examples, integration points, and error conditions
- Property tests verify universal correctness across all valid inputs

### Property-Based Testing Library

**Target language**: TypeScript  
**Library**: [`fast-check`](https://github.com/dubzzz/fast-check) — mature, well-typed, runs in Node.js and browser environments.

Each property test MUST run a minimum of **100 iterations** (`numRuns: 100` in `fc.assert`).

Each property test MUST include a comment tag in the format:

```
// Feature: photorealistic-avatar, Property {N}: {property_text}
```

Each correctness property from this document MUST be implemented by exactly one property-based test.

### Property Test Implementations

**Property 1** — `AdminAuthService.validatePassphrase` rejects non-matching strings

```typescript
// Feature: photorealistic-avatar, Property 1: passphrase rejection for non-matching inputs
fc.assert(
  fc.property(fc.string(), (passphrase) => {
    fc.pre(passphrase !== process.env.ADMIN_SECRET);
    return adminAuthService.validatePassphrase(passphrase) === false;
  }),
  { numRuns: 100 }
);
```

**Property 2** — Photo upload accepts valid / rejects invalid magic bytes

```typescript
// Feature: photorealistic-avatar, Property 2: photo upload accepts valid types and rejects invalid types
// Generate random buffers with JPEG/PNG magic bytes (valid) and arbitrary bytes (invalid)
```

**Property 4** — PresenterStore round-trip

```typescript
// Feature: photorealistic-avatar, Property 4: presenter assignment round-trip
// Generate random AvatarAssignment, write to store, read from disk, assert deep equality
```

**Property 5** — AvatarAssignment serialization round-trip

```typescript
// Feature: photorealistic-avatar, Property 5: AvatarAssignment serialization round-trip
// Generate random AvatarAssignment, serialize → deserialize, assert deep equality
```

**Property 8** — Filename sanitization

```typescript
// Feature: photorealistic-avatar, Property 8: filename sanitization removes path traversal and invalid characters
// Generate arbitrary strings as filenames, assert sanitized output matches allowed charset
```

**Property 9** — AppStore avatarMode idempotence

```typescript
// Feature: photorealistic-avatar, Property 9: AppStore avatarMode idempotence
// Generate random sequences of mode values, assert final state equals last value
```

**Property 10** — VisemeCoordinator resets on stop

```typescript
// Feature: photorealistic-avatar, Property 10: VisemeCoordinator resets to neutral on stop
// Generate random VisemeEvent arrays, start coordinator, stop, assert all influences are 0
```

**Property 11** — VisemeCoordinator confluence

```typescript
// Feature: photorealistic-avatar, Property 11: VisemeCoordinator confluence
// Generate random VisemeEvent arrays, shuffle, assert same blendshape sequence
```

### Unit Test Coverage

Unit tests (using Jest / Vitest) should cover:

- `AdminAuthService`: correct passphrase grants access (example 1.2), missing `ADMIN_SECRET` denies all (edge case 1.5)
- `DIDService`: successful presenter creation (example 2.5), D-ID API error does not write to store (example 2.7), poll returns video URL on "done" (example 6.4), poll returns error on "error" status (example 6.5)
- `PresenterStore`: missing file initializes empty map (edge case 4.5), invalid JSON initializes empty map without overwriting (edge case 4.6)
- `FileValidationService`: unrecognized mode value returns parse error (example 14.5)
- `/api/avatar/assignment`: returns 404 for unknown agentId (requirement 12.3), returns 400 for missing agentId (requirement 12.4)
- `AvatarSystem`: falls back to `config/avatars.ts` when no assignment exists (edge case 5.4)
- `TalkingHeadPlayer`: displays static fallback on video load failure (requirement 8.5)
- `GLBVRMRenderer`: displays error state on model load failure (requirement 9.4)
