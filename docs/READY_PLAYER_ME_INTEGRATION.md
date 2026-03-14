# Ready Player Me Avatar Integration

## Architecture Overview

The avatar system uses an image-based approach with a fallback letter avatar. The key components are:

- `components/ImageAvatar.tsx` — Displays an agent's avatar image with a speaking animation ring
- `components/FallbackAvatar.tsx` — 3D fallback (cube/sphere) rendered via react-three-fiber when WebGL is available
- `components/AvatarSelector.tsx` — Grid UI for selecting between available avatars
- `lib/services/AvatarLoaderService.ts` — Loads GLB models with retry logic and in-memory caching
- `lib/services/AvatarValidatorService.ts` — Validates GLB models and checks viseme blendshape compatibility
- `lib/services/PreferencesService.ts` — Persists avatar selection to localStorage
- `lib/store/useAppStore.ts` — Zustand store holding `selectedAvatarId`, `availableAvatars`, `avatarLoadingState`, `avatarError`
- `config/avatars.ts` — Maps agent IDs to image URLs
- `lib/env.ts` — Reads avatar environment variables

## Environment Configuration

Add these to your `.env.local`:

```env
# Ready Player Me avatar GLB URLs (optional, used by AvatarLoaderService)
NEXT_PUBLIC_AVATAR_DEFAULT_1=https://models.readyplayer.me/<id1>.glb
NEXT_PUBLIC_AVATAR_DEFAULT_2=https://models.readyplayer.me/<id2>.glb
NEXT_PUBLIC_AVATAR_DEFAULT_3=https://models.readyplayer.me/<id3>.glb

# Fallback 3D shape when avatar fails to load
NEXT_PUBLIC_AVATAR_FALLBACK_TYPE=cube   # cube | sphere
NEXT_PUBLIC_AVATAR_FALLBACK_COLOR=#4A90E2

# Loading behaviour
NEXT_PUBLIC_AVATAR_LOAD_TIMEOUT=10000  # ms
NEXT_PUBLIC_AVATAR_MAX_RETRIES=3
```

## Adding Avatar Images

1. Place images (512×512 px recommended) in `public/avatars/`.
2. Open `config/avatars.ts` and map your agent IDs:

```typescript
export const avatarConfig: AvatarConfig = {
  'agent-id-here': {
    imageUrl: '/avatars/agent1.png',
    name: 'Sarah',
  },
};
```

3. Find agent IDs via the browser Network tab → `/api/agents` response.

## Error Handling & Fallback Behaviour

| Condition | Behaviour |
|---|---|
| Image URL missing | Letter avatar (first letter of agent name) |
| GLB network error | Retry up to 3× with exponential backoff (1s, 2s, 4s), then FallbackAvatar |
| GLB invalid format | Immediate FallbackAvatar, no retry |
| WebGL context lost | Attempt restoration up to 3×, then permanent FallbackAvatar |
| All retries exhausted | Error notification with Retry / Use Fallback actions |

## WebGL Context Management

`AvatarCanvas` listens for `webglcontextlost` and `webglcontextrestored` events on the canvas element. On loss it calls `event.preventDefault()` to allow restoration. After 3 failed restoration attempts the component permanently switches to `FallbackAvatar`.

## Lip Synchronisation

`AvatarValidatorService.checkVisemeCompatibility()` checks the loaded GLB for the blendshapes listed in `VISEME_BLENDSHAPE_MAP`. If any are missing a warning is logged and lip sync is disabled for that model. The `VisemeCoordinator` drives `morphTargetInfluences` in the `useFrame` loop, targeting the update within one animation frame of each viseme event.

## Troubleshooting

- **"Loading agents" error** — Ensure the Brain API is running and `NEXT_PUBLIC_BRAIN_API_URL` is set.
- **Avatar not loading** — Check the browser Network tab for the GLB request; verify the URL is accessible.
- **Lip sync not working** — Open the console and look for "Missing viseme blendshapes" warnings; the model may not include the required morph targets.
- **WebGL crash** — Clear `.next` cache (`Remove-Item -Recurse -Force .next`) and restart the dev server.
