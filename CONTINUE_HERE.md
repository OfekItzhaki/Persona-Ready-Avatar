# How to Continue - Avatar Client Development

## ✅ What Was Done

### Changes Committed:
1. **Created ImageAvatar component** - Visual avatar with speaking animation
2. **Added avatar configuration system** - `config/avatars.ts` for easy image setup
3. **Simplified page layout** - 2-column design (avatar left, chat right)
4. **Fixed text overlapping** - Removed complex CSS causing layout issues
5. **Added PersonaSwitcher** - Agent selector in header
6. **Removed WebGL 3D avatar** - Was causing crashes and context loss
7. **Created avatar setup guide** - `AVATAR_IMAGES_GUIDE.md`

### Files Modified:
- `app/page.tsx` - Simplified layout with inline styles
- `components/Header.tsx` - Clean header with agent selector
- `components/MessageList.tsx` - Simplified empty state
- `components/ImageAvatar.tsx` - NEW: Image-based avatar component
- `config/avatars.ts` - NEW: Avatar configuration
- `public/avatars/` - NEW: Folder for avatar images

## 🐛 Known Issues to Fix

### Issue 1: Agent Loading Error
**Problem:** "Loading agents" error in dropdown - Brain API not connecting

**To Fix:**
1. Check if Brain API is running on port 3000:
   ```bash
   # In a separate terminal, navigate to your Brain API folder
   cd path/to/brain-api
   npm start  # or whatever command starts your Brain API
   ```

2. Verify the API is accessible:
   ```bash
   curl http://localhost:3000/api/agents
   ```

3. If Brain API is on a different port, update `.env.local`:
   ```
   BRAIN_API_URL=http://localhost:YOUR_PORT/api
   ```

### Issue 2: Microphone Button Not Visible
**Problem:** Voice input controls not showing even in voice mode

**To Fix:**
1. Check browser console (F12) for errors
2. Verify Azure Speech credentials in `.env.local`:
   ```
   NEXT_PUBLIC_AZURE_SPEECH_KEY=your-key-here
   NEXT_PUBLIC_AZURE_SPEECH_REGION=westeurope
   ```

3. Check if `VoiceInputButton` component is rendering:
   - Open `components/ChatInterface.tsx`
   - Look for the voice input section (around line 960)
   - Add console.log to debug:
   ```typescript
   console.log('Input mode:', inputMode);
   console.log('Is recognizing:', isRecognizing);
   ```

4. Verify browser compatibility:
   - Voice input requires Chrome 90+, Edge 90+, or Safari 14+
   - Check browser console for compatibility warnings

## 🎨 How to Add Avatar Images

### Quick Start:
1. **Get avatar images** (512x512px recommended):
   - Use AI generators: https://thispersondoesnotexist.com/
   - Or use Midjourney, DALL-E, Stable Diffusion
   - Or use your own photos

2. **Add images to project**:
   ```
   public/avatars/agent1.png
   public/avatars/agent2.jpg
   ```

3. **Configure in `config/avatars.ts`**:
   ```typescript
   export const avatarConfig: AvatarConfig = {
     'agent-id-here': {
       imageUrl: '/avatars/agent1.png',
       name: 'Sarah'
     },
     'another-agent-id': {
       imageUrl: '/avatars/agent2.jpg',
       name: 'Alex'
     }
   };
   ```

4. **Find your agent IDs**:
   - Open browser console (F12)
   - Go to Network tab
   - Look for `/api/agents` request
   - Check response for agent IDs

## 🚀 Next Steps

### Priority 1: Fix Brain API Connection
```bash
# Terminal 1: Start Brain API
cd path/to/brain-api
npm start

# Terminal 2: Start Next.js (already running)
npm run dev
```

### Priority 2: Debug Voice Input
1. Open browser console (F12)
2. Toggle to Voice mode
3. Check for errors
4. Verify microphone permissions

### Priority 3: Add Avatar Images
1. Get/generate avatar images
2. Add to `public/avatars/`
3. Configure in `config/avatars.ts`
4. Restart dev server

## 📝 Development Commands

```bash
# Start development server
npm run dev

# Check for errors
npm run lint

# Build for production
npm run build

# Run tests
npm test
```

## 🔍 Debugging Tips

### Check if services are running:
```bash
# Check Next.js
curl http://localhost:3001

# Check Brain API
curl http://localhost:3000/api/agents
```

### View logs:
- Browser console (F12) for client-side errors
- Terminal for server-side errors
- Network tab for API call failures

### Common fixes:
- Clear `.next` cache: `rm -rf .next`
- Restart dev server: Ctrl+C then `npm run dev`
- Clear browser cache: Ctrl+Shift+Delete

## 📚 Documentation

- **Avatar Setup**: See `AVATAR_IMAGES_GUIDE.md`
- **API Architecture**: See `API_ARCHITECTURE.md`
- **Avatar Setup (old)**: See `AVATAR_SETUP.md`

## 🆘 If Still Stuck

1. **Check the console** - Most errors show there
2. **Verify all services running** - Brain API + Next.js
3. **Check environment variables** - `.env.local` file
4. **Try a fresh start**:
   ```bash
   rm -rf .next
   npm run dev
   ```

## 📞 Contact

If you need help, check:
- Browser console errors
- Terminal errors
- Network tab in DevTools
- `.env.local` configuration

Good luck! 🚀
