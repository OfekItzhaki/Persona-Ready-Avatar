# Design Document: Avatar Shaders

## Overview

This design implements professional-quality shader systems for a 3D avatar in a Next.js application using react-three-fiber. The system enhances visual realism through custom GLSL shaders for skin (with subsurface scattering), eyes (with cornea refraction), hair (with anisotropic highlights), advanced lighting with shadows, and post-processing effects.

### Design Goals

1. **Visual Realism**: Implement physically-based rendering techniques for skin, eyes, and hair
2. **Performance**: Maintain 30+ FPS on target hardware through optimized shader code and quality presets
3. **Compatibility**: Support WebGL 1.0 and 2.0 with graceful degradation
4. **Integration**: Seamlessly integrate with existing morph target animation system
5. **Configurability**: Expose shader parameters for runtime customization

### Key Technical Decisions

- **Custom ShaderMaterial over Standard Materials**: Use Three.js ShaderMaterial to implement custom GLSL shaders for full control over rendering
- **Subsurface Scattering Approximation**: Use texture-space diffusion or screen-space techniques rather than full volumetric SSS for performance
- **Post-processing via EffectComposer**: Leverage @react-three/postprocessing for anti-aliasing, bloom, and color grading
- **Material Replacement Strategy**: Automatically detect and replace materials from GLB model based on mesh names
- **Quality Presets**: Implement low/medium/high quality tiers that adjust shader complexity and texture resolution

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      AvatarCanvas                            │
│  (Existing Component - Modified)                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├──────────────────────────────────────┐
                     │                                      │
         ┌───────────▼──────────┐              ┌──────────▼─────────┐
         │  ShaderManager       │              │  LightingSystem    │
         │  - Material setup    │              │  - Directional     │
         │  - Shader compilation│              │  - Ambient         │
         │  - Parameter updates │              │  - Shadow maps     │
         └───────────┬──────────┘              └────────────────────┘
                     │
         ┌───────────┴──────────────────────────┐
         │                                       │
┌────────▼────────┐  ┌──────────────┐  ┌───────▼────────┐
│  SkinShader     │  │  EyeShader   │  │  HairShader    │
│  - SSS          │  │  - Refraction│  │  - Anisotropic │
│  - Morph support│  │  - Wetness   │  │  - Highlights  │
└─────────────────┘  └──────────────┘  └────────────────┘
                     │
         ┌───────────▼──────────┐
         │  PostProcessing      │
         │  - FXAA/SMAA         │
         │  - Bloom             │
         │  - Color grading     │
         └──────────────────────┘
```

### Component Responsibilities

**ShaderManager**

- Detects WebGL capabilities
- Loads and compiles shader programs
- Replaces GLB materials with custom shaders
- Manages shader parameter updates
- Handles quality preset switching
- Provides fallback for shader compilation failures

**SkinShader**

- Implements subsurface scattering approximation
- Preserves morph target functionality
- Supports configurable skin tone
- Handles normal mapping and specular highlights

**EyeShader**

- Renders cornea with refraction
- Creates iris depth illusion
- Simulates eye wetness with specular highlights
- Supports iris color customization

**HairShader**

- Implements anisotropic lighting model (Kajiya-Kay or Marschner)
- Supports hair color configuration
- Preserves morph target animations

**LightingSystem**

- Configures directional lights with shadow casting
- Implements ambient occlusion (SSAO via post-processing)
- Provides dynamic light parameter adjustment

**PostProcessing**

- Anti-aliasing (FXAA or SMAA)
- Bloom for highlight enhancement
- Color grading for consistent tone
- Performance-aware effect toggling

## Components and Interfaces

### ShaderManager

```typescript
interface ShaderConfig {
  quality: 'low' | 'medium' | 'high';
  skinTone: { r: number; g: number; b: number };
  irisColor: { r: number; g: number; b: number };
  hairColor: { r: number; g: number; b: number };
  enableBloom: boolean;
  enableColorGrading: boolean;
  shadowMapSize: 512 | 1024 | 2048;
}

interface WebGLCapabilities {
  version: 1 | 2;
  maxTextureSize: number;
  maxVertexUniforms: number;
  supportsFloatTextures: boolean;
  supportsDerivatives: boolean;
}

class ShaderManager {
  private capabilities: WebGLCapabilities;
  private config: ShaderConfig;
  private materials: Map<string, THREE.ShaderMaterial>;

  constructor(renderer: THREE.WebGLRenderer, config: Partial<ShaderConfig>);

  // Detect WebGL capabilities
  detectCapabilities(): WebGLCapabilities;

  // Replace materials in loaded GLB model
  replaceMaterials(scene: THREE.Scene): void;

  // Update shader parameters at runtime
  updateConfig(config: Partial<ShaderConfig>): void;

  // Handle quality preset changes
  setQuality(quality: 'low' | 'medium' | 'high'): void;

  // Get shader compilation status
  getStatus(): { compiled: boolean; errors: string[] };
}
```

### Shader Implementations

**SkinShader**

```typescript
interface SkinShaderUniforms {
  // Textures
  map: THREE.Texture | null;
  normalMap: THREE.Texture | null;

  // Subsurface scattering
  sssColor: THREE.Color;
  sssIntensity: number;
  sssScale: number;

  // Lighting
  lightDirection: THREE.Vector3;
  lightColor: THREE.Color;
  ambientColor: THREE.Color;

  // Morph targets (passed through from Three.js)
  morphTargetInfluences: number[];
}

function createSkinShader(
  capabilities: WebGLCapabilities,
  quality: 'low' | 'medium' | 'high'
): THREE.ShaderMaterial;
```

**EyeShader**

```typescript
interface EyeShaderUniforms {
  // Iris
  irisColor: THREE.Color;
  irisTexture: THREE.Texture | null;
  pupilSize: number;

  // Cornea
  corneaIOR: number; // Index of refraction (typically 1.376)
  corneaThickness: number;

  // Wetness
  specularIntensity: number;
  specularPower: number;

  // Lighting
  lightDirection: THREE.Vector3;
  lightColor: THREE.Color;
}

function createEyeShader(
  capabilities: WebGLCapabilities,
  quality: 'low' | 'medium' | 'high'
): THREE.ShaderMaterial;
```

**HairShader**

```typescript
interface HairShaderUniforms {
  // Color
  hairColor: THREE.Color;
  hairTexture: THREE.Texture | null;

  // Anisotropic highlights
  shiftTangent: number;
  primarySpecular: number;
  secondarySpecular: number;
  specularPower: number;

  // Lighting
  lightDirection: THREE.Vector3;
  lightColor: THREE.Color;

  // Morph targets
  morphTargetInfluences: number[];
}

function createHairShader(
  capabilities: WebGLCapabilities,
  quality: 'low' | 'medium' | 'high'
): THREE.ShaderMaterial;
```

### React Component Integration

```typescript
// Hook for shader management
function useShaderManager(config: Partial<ShaderConfig>): {
  shaderManager: ShaderManager | null;
  status: { compiled: boolean; errors: string[] };
  updateConfig: (config: Partial<ShaderConfig>) => void;
};

// Modified AvatarCanvas component
interface AvatarCanvasProps {
  modelUrl: string;
  className?: string;
  shaderConfig?: Partial<ShaderConfig>;
  onShaderError?: (errors: string[]) => void;
}
```

## Data Models

### Shader Configuration Schema

```typescript
// Default configuration
const DEFAULT_SHADER_CONFIG: ShaderConfig = {
  quality: 'medium',
  skinTone: { r: 0.92, g: 0.78, b: 0.71 }, // Fair skin tone
  irisColor: { r: 0.4, g: 0.6, b: 0.8 }, // Blue eyes
  hairColor: { r: 0.3, g: 0.2, b: 0.1 }, // Brown hair
  enableBloom: true,
  enableColorGrading: true,
  shadowMapSize: 1024,
};

// Quality preset definitions
const QUALITY_PRESETS = {
  low: {
    shadowMapSize: 512,
    enableBloom: false,
    enableColorGrading: false,
    sssQuality: 'fast', // Single-pass SSS approximation
    aaMethod: 'fxaa',
  },
  medium: {
    shadowMapSize: 1024,
    enableBloom: true,
    enableColorGrading: true,
    sssQuality: 'balanced', // Dual-pass SSS
    aaMethod: 'fxaa',
  },
  high: {
    shadowMapSize: 2048,
    enableBloom: true,
    enableColorGrading: true,
    sssQuality: 'quality', // Multi-pass SSS with blur
    aaMethod: 'smaa',
  },
};
```

### Material Identification

```typescript
// Material naming conventions in GLB model
const MATERIAL_PATTERNS = {
  skin: /skin|face|body/i,
  eyes: /eye|iris|cornea/i,
  hair: /hair|scalp/i,
};

interface MaterialMapping {
  meshName: string;
  originalMaterial: THREE.Material;
  shaderMaterial: THREE.ShaderMaterial;
  type: 'skin' | 'eyes' | 'hair' | 'other';
}
```

### Performance Monitoring

```typescript
interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  shaderCompileTime: number;
}

// Adaptive quality adjustment
class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private targetFPS: number = 30;

  update(renderer: THREE.WebGLRenderer): void;
  shouldReduceQuality(): boolean;
  getRecommendedQuality(): 'low' | 'medium' | 'high';
}
```

### Shader Source Management

```typescript
// Shader code organization
interface ShaderSource {
  vertexShader: string;
  fragmentShader: string;
  uniforms: { [key: string]: THREE.IUniform };
  defines?: { [key: string]: string | number };
}

// Shader variants for different quality levels
interface ShaderVariants {
  low: ShaderSource;
  medium: ShaderSource;
  high: ShaderSource;
}

// Store shaders as separate files for maintainability
// - lib/shaders/skin.vert.glsl
// - lib/shaders/skin.frag.glsl
// - lib/shaders/eye.vert.glsl
// - lib/shaders/eye.frag.glsl
// - lib/shaders/hair.vert.glsl
// - lib/shaders/hair.frag.glsl
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Morph Target Preservation

_For any_ mesh with morph targets and any set of morph target influence values, applying custom shaders should preserve the morph target deformation behavior identically to the original Three.js material.

**Validates: Requirements 1.2, 3.3, 6.2**

### Property 2: Shader Parameter Configuration

_For any_ valid shader parameter (skin tone, iris color, hair color, light intensity, light color), updating the configuration should result in the corresponding shader uniform being updated to the specified value.

**Validates: Requirements 1.4, 2.3, 3.2, 4.4**

### Property 3: Light Parameter Updates

_For any_ valid light direction vector, updating the light direction should propagate to all shader uniforms that depend on lighting calculations.

**Validates: Requirements 3.4**

### Property 4: Shadow Map Configuration

_For any_ valid shadow map resolution (512, 1024, 2048), setting the resolution should update the shadow map size for all shadow-casting lights.

**Validates: Requirements 4.2**

### Property 5: Post-Processing Effect Toggling

_For any_ post-processing effect (bloom, color grading, anti-aliasing), the system should support enabling or disabling that effect at runtime without affecting other effects.

**Validates: Requirements 5.2, 5.3, 5.5**

### Property 6: Material Replacement

_For any_ loaded GLB model containing meshes with materials matching the naming patterns (skin, eyes, hair), the Material_System should automatically replace those materials with the corresponding custom ShaderMaterials.

**Validates: Requirements 6.1, 6.3**

### Property 7: Shader Reuse

_For any_ sequence of render frames, shader programs should be compiled once during initialization and reused across all subsequent frames without recompilation.

**Validates: Requirements 7.4**

### Property 8: Configuration Persistence and Validation

_For any_ shader configuration update (valid or invalid), the system should validate the input, use defaults for invalid values, and persist valid configuration across React component re-renders.

**Validates: Requirements 8.2, 8.3, 8.4**

### Property 9: WebGL Version Adaptation

_For any_ detected WebGL version (1.0 or 2.0), the Material_System should select and compile shader variants appropriate for that WebGL version's capabilities.

**Validates: Requirements 9.2, 9.3**

## Error Handling

### Shader Compilation Failures

**Detection**: Catch shader compilation errors during initialization
**Response**:

- Log descriptive error message with shader type and error details
- Fall back to basic Three.js MeshStandardMaterial
- Set shader status to indicate compilation failure
- Continue rendering with fallback materials

```typescript
try {
  const shader = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  });
  // Test compilation
  renderer.compile(scene, camera);
} catch (error) {
  console.error(`Shader compilation failed for ${shaderType}:`, error);
  return new THREE.MeshStandardMaterial({
    /* fallback config */
  });
}
```

### WebGL Context Loss

**Detection**: Listen for 'webglcontextlost' event on canvas
**Response**:

- Prevent default behavior to allow context restoration
- Display user-facing error message
- Attempt context restoration
- Reinitialize shaders after context restoration

### Invalid Configuration Values

**Detection**: Validate configuration inputs against expected ranges
**Response**:

- Log warning with invalid parameter name and value
- Use default value from DEFAULT_SHADER_CONFIG
- Continue execution with valid configuration

```typescript
function validateConfig(config: Partial<ShaderConfig>): ShaderConfig {
  const validated = { ...DEFAULT_SHADER_CONFIG };

  if (config.skinTone) {
    if (isValidColor(config.skinTone)) {
      validated.skinTone = config.skinTone;
    } else {
      console.warn('Invalid skinTone value, using default');
    }
  }

  return validated;
}
```

### Missing Textures

**Detection**: Check texture loading status
**Response**:

- Use solid color fallback for missing textures
- Log warning about missing texture
- Continue rendering with color-only shading

### Performance Degradation

**Detection**: Monitor FPS via PerformanceMonitor
**Response**:

- If FPS < 30 for sustained period (2 seconds), reduce quality preset
- Disable expensive effects (bloom, SSAO) first
- Reduce shadow map resolution
- Switch to lower quality shader variants
- Log quality adjustment to console

## Testing Strategy

### Unit Testing Approach

Unit tests will focus on specific examples, edge cases, and integration points:

**Configuration Management**

- Test default configuration values are applied correctly
- Test configuration validation rejects invalid inputs
- Test configuration persistence across re-renders
- Test quality preset switching updates all relevant parameters

**Material Identification**

- Test material pattern matching for skin/eyes/hair
- Test handling of models with missing material types
- Test handling of models with unexpected material names

**WebGL Capability Detection**

- Test WebGL 1.0 detection and shader variant selection
- Test WebGL 2.0 detection and advanced feature enablement
- Test fallback behavior when WebGL is unavailable

**Error Handling**

- Test shader compilation failure triggers fallback
- Test invalid configuration triggers warning and defaults
- Test missing textures use color fallback

### Property-Based Testing Approach

Property tests will verify universal behaviors across all inputs using fast-check library (minimum 100 iterations per test):

**Property 1: Morph Target Preservation**

- Generate random morph target influence arrays
- Apply to mesh with custom shader
- Verify vertex positions match expected morph target deformation
- Tag: **Feature: avatar-shaders, Property 1: For any mesh with morph targets and any set of morph target influence values, applying custom shaders should preserve the morph target deformation behavior identically to the original Three.js material**

**Property 2: Shader Parameter Configuration**

- Generate random valid color values (RGB in [0,1])
- Update shader configuration
- Verify shader uniforms contain the specified values
- Tag: **Feature: avatar-shaders, Property 2: For any valid shader parameter, updating the configuration should result in the corresponding shader uniform being updated to the specified value**

**Property 3: Light Parameter Updates**

- Generate random normalized direction vectors
- Update light direction
- Verify all shader uniforms receive updated light direction
- Tag: **Feature: avatar-shaders, Property 3: For any valid light direction vector, updating the light direction should propagate to all shader uniforms that depend on lighting calculations**

**Property 4: Shadow Map Configuration**

- Generate random shadow map sizes from valid set [512, 1024, 2048]
- Update shadow map configuration
- Verify shadow map texture size matches configuration
- Tag: **Feature: avatar-shaders, Property 4: For any valid shadow map resolution, setting the resolution should update the shadow map size for all shadow-casting lights**

**Property 5: Post-Processing Effect Toggling**

- Generate random combinations of effect enable/disable states
- Apply configuration
- Verify each effect's enabled state matches configuration
- Verify other effects are unaffected
- Tag: **Feature: avatar-shaders, Property 5: For any post-processing effect, the system should support enabling or disabling that effect at runtime without affecting other effects**

**Property 6: Material Replacement**

- Generate GLB models with various material naming patterns
- Load model and apply material replacement
- Verify materials matching patterns are replaced with ShaderMaterials
- Verify material types match expected shader types
- Tag: **Feature: avatar-shaders, Property 6: For any loaded GLB model containing meshes with materials matching the naming patterns, the Material_System should automatically replace those materials with the corresponding custom ShaderMaterials**

**Property 7: Shader Reuse**

- Render multiple frames
- Track shader compilation calls
- Verify shaders are compiled only once during initialization
- Tag: **Feature: avatar-shaders, Property 7: For any sequence of render frames, shader programs should be compiled once during initialization and reused across all subsequent frames without recompilation**

**Property 8: Configuration Persistence and Validation**

- Generate random configuration updates (mix of valid and invalid)
- Apply configuration
- Trigger React re-render
- Verify valid values persist and invalid values use defaults
- Tag: **Feature: avatar-shaders, Property 8: For any shader configuration update, the system should validate the input, use defaults for invalid values, and persist valid configuration across React component re-renders**

**Property 9: WebGL Version Adaptation**

- Mock different WebGL versions (1.0, 2.0)
- Initialize Material_System
- Verify shader variants match WebGL version capabilities
- Tag: **Feature: avatar-shaders, Property 9: For any detected WebGL version, the Material_System should select and compile shader variants appropriate for that WebGL version's capabilities**

### Integration Testing

- Test complete avatar rendering pipeline with all shaders enabled
- Test quality preset switching during runtime
- Test morph target animations with custom shaders
- Test post-processing effect combinations
- Test performance monitoring and adaptive quality adjustment

### Testing Tools

- **Unit Tests**: Vitest with @testing-library/react
- **Property Tests**: fast-check with @fast-check/vitest (already in project)
- **3D Testing**: Three.js test utilities for shader compilation and rendering
- **Mocking**: Mock WebGL contexts for capability testing
