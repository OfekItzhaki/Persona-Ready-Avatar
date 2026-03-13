# Avatar Images Setup Guide

## How to Add Avatar Images for Your AI Agents

### Option 1: Use Local Images (Recommended)

1. **Create an avatars folder** in the `public` directory:
   ```
   public/avatars/
   ```

2. **Add your images** (PNG, JPG, or WebP):
   ```
   public/avatars/agent1.png
   public/avatars/agent2.jpg
   public/avatars/sarah.png
   ```

3. **Configure in `config/avatars.ts`**:
   ```typescript
   export const avatarConfig: AvatarConfig = {
     'agent-1': {
       imageUrl: '/avatars/agent1.png',
       name: 'Sarah'
     },
     'agent-2': {
       imageUrl: '/avatars/agent2.jpg',
       name: 'Alex'
     }
   };
   ```

### Option 2: Use External URLs

```typescript
export const avatarConfig: AvatarConfig = {
  'agent-1': {
    imageUrl: 'https://example.com/avatar.jpg',
    name: 'Sarah'
  }
};
```

### Option 3: AI-Generated Avatars

Use AI services to generate realistic avatars:

- **This Person Does Not Exist**: https://thispersondoesnotexist.com/
- **Generated Photos**: https://generated.photos/
- **Midjourney**: Create custom AI avatars
- **DALL-E**: Generate avatars with prompts
- **Stable Diffusion**: Free AI image generation

### Finding Your Agent IDs

1. Open browser console (F12)
2. Go to Network tab
3. Look for `/api/agents` request
4. Check the response for agent IDs

### Image Requirements

- **Format**: PNG, JPG, or WebP
- **Size**: 512x512px or larger (square recommended)
- **File size**: Under 500KB for best performance
- **Style**: Portrait/headshot works best

### Example Setup

```typescript
// config/avatars.ts
export const avatarConfig: AvatarConfig = {
  'gpt-4': {
    imageUrl: '/avatars/gpt4-avatar.png',
    name: 'GPT-4'
  },
  'claude': {
    imageUrl: '/avatars/claude-avatar.png',
    name: 'Claude'
  },
  default: {
    imageUrl: undefined,
    name: 'AI Assistant'
  }
};
```
