# Avatar Setup Guide

## Current Configuration: Fallback Avatar Mode

Since Ready Player Me has been discontinued, this application is configured to use a **built-in fallback avatar system** that works without any external 3D models.

### What You'll See

The application now displays a **pulsing blue sphere** as the avatar. This is a fully functional fallback that:
- ✅ Requires no external files or downloads
- ✅ Works immediately without setup
- ✅ Animates smoothly (pulsing animation)
- ✅ Uses minimal GPU resources
- ✅ Never fails to load

### Fallback Avatar Features

**Type:** Sphere (configurable to cube)  
**Color:** #4A90E2 (blue)  
**Animation:** Pulsing scale effect  
**Performance:** Minimal GPU usage

### Configuration

The fallback avatar is configured in `.env.local`:

```env
# Avatar Configuration
NEXT_PUBLIC_AVATAR_MODEL_URL=
NEXT_PUBLIC_AVATAR_FALLBACK_TYPE=sphere
NEXT_PUBLIC_AVATAR_FALLBACK_COLOR=#4A90E2
NEXT_PUBLIC_USE_FALLBACK_BY_DEFAULT=true
```

### Customization Options

You can customize the fallback avatar by changing these environment variables:

**Fallback Type:**
- `sphere` - Pulsing sphere (default)
- `cube` - Rotating cube

**Fallback Color:**
- Any hex color code (e.g., `#FF5733` for orange, `#00FF00` for green)

### Using a Custom 3D Avatar (Optional)

If you want to use a custom 3D avatar model instead of the fallback:

1. **Obtain a GLB Model:**
   - Download from [Sketchfab](https://sketchfab.com/) (free models available)
   - Download from [Poly Haven](https://polyhaven.com/) (CC0 licensed)
   - Create your own using Blender or other 3D software
   - Use [VRoid Studio](https://vroid.com/en/studio) to create anime-style avatars

2. **Place the Model:**
   - Put your GLB file in `public/models/avatar.glb`

3. **Update Configuration:**
   ```env
   NEXT_PUBLIC_AVATAR_MODEL_URL=/models/avatar.glb
   ```

4. **Restart the Server:**
   - Stop the dev server (Ctrl+C)
   - Run `npm run dev` again

### Avatar Requirements (for custom models)

If using a custom 3D model, it should ideally have:
- **Format:** GLB (GLTF Binary)
- **Viseme Blendshapes:** For lip-sync animation (optional but recommended)
- **Size:** < 10MB for optimal loading
- **Polygons:** < 50K triangles for good performance

### Troubleshooting

**Q: I see an error message instead of the avatar**  
A: Click the "Use Fallback" button to switch to the geometric fallback avatar.

**Q: Can I change the fallback color?**  
A: Yes! Update `NEXT_PUBLIC_AVATAR_FALLBACK_COLOR` in `.env.local` and restart the server.

**Q: The avatar isn't animating**  
A: Make sure your browser supports WebGL. Try Chrome, Firefox, Safari, or Edge (version 90+).

**Q: I want to use a different shape**  
A: Change `NEXT_PUBLIC_AVATAR_FALLBACK_TYPE` to `cube` for a rotating cube instead of a pulsing sphere.

### All Features Work Without a 3D Model

The application is fully functional with the fallback avatar:
- ✅ Audio controls (volume, mute, playback speed)
- ✅ Message operations (send, edit, delete, search)
- ✅ Conversation export/import
- ✅ Settings panel with themes
- ✅ Performance monitoring
- ✅ Offline support
- ✅ Full accessibility (keyboard navigation, screen readers)

The only difference is the visual representation - all other features work identically.

### Next Steps

1. **Refresh your browser** at http://localhost:3001
2. You should now see a blue pulsing sphere as the avatar
3. Try sending a message to test the full application
4. Explore the features using the help dialog (Ctrl+Shift+H)

Enjoy your enhanced avatar application! 🎉
