# Avatar Images Folder

Place your avatar images here.

## Supported formats:
- PNG
- JPG/JPEG
- WebP
- GIF

## Recommended specs:
- Size: 512x512px (square)
- File size: < 500KB
- Style: Portrait/headshot

## Example:
```
public/avatars/agent1.png
public/avatars/sarah.jpg
public/avatars/alex.webp
```

Then configure in `config/avatars.ts`:
```typescript
'agent-1': {
  imageUrl: '/avatars/agent1.png',
  name: 'Agent 1'
}
```
