# Shader System

This directory contains the shader infrastructure for the avatar rendering system.

## Structure

- `types.ts` - TypeScript interfaces and type definitions
- `ShaderManager.ts` - Main shader management class
- `index.ts` - Module exports
- `*.vert.glsl` - Vertex shader files (GLSL)
- `*.frag.glsl` - Fragment shader files (GLSL)

## Features

### WebGL Capability Detection

The `ShaderManager` automatically detects:

- WebGL version (1.0 or 2.0)
- Maximum texture size
- Maximum vertex uniforms
- Float texture support
- Derivatives support (for advanced shader effects)

### Material Replacement

The system automatically identifies and replaces materials based on mesh naming patterns:

- **Skin**: `/skin|face|body/i`
- **Eyes**: `/eye|iris|cornea/i`
- **Hair**: `/hair|scalp/i`

### Error Handling

- Shader compilation errors are caught and logged
- Automatic fallback to `MeshStandardMaterial` if shader compilation fails
- Detailed error messages for debugging

## Usage

```typescript
import { ShaderManager } from '@/lib/shaders';

// Create shader manager
const shaderManager = new ShaderManager(renderer, {
  quality: 'medium',
  skinTone: { r: 0.92, g: 0.78, b: 0.71 },
  irisColor: { r: 0.4, g: 0.6, b: 0.8 },
  hairColor: { r: 0.3, g: 0.2, b: 0.1 },
});

// Replace materials in loaded model
shaderManager.replaceMaterials(scene);

// Update configuration at runtime
shaderManager.updateConfig({
  skinTone: { r: 0.85, g: 0.7, b: 0.65 },
});

// Check shader status
const status = shaderManager.getStatus();
console.log('Shaders compiled:', status.compiled);
```

## Implementation Status

- ✅ Task 1: Infrastructure and WebGL capability detection
- ⏳ Task 2: Skin shader with subsurface scattering
- ⏳ Task 3: Eye shader with cornea refraction
- ⏳ Task 5: Hair shader with anisotropic highlights

## Requirements

- Requirements: 6.1, 6.3, 6.4, 6.5, 9.1, 9.2, 9.3, 9.5
