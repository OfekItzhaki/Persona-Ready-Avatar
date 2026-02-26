# Implementation Plan: Avatar Shaders

## Overview

This implementation plan breaks down the avatar shader system into incremental steps, starting with core infrastructure, then implementing individual shader types, integrating lighting and post-processing, and finally adding configuration and optimization features. Each task builds on previous work to ensure continuous integration and early validation.

## Tasks

- [x] 1. Set up shader infrastructure and WebGL capability detection
  - Create `lib/shaders/` directory structure for GLSL shader files
  - Implement WebGL capability detection (version, texture support, derivatives)
  - Create ShaderManager class with material replacement logic
  - Set up shader compilation error handling and fallback to MeshStandardMaterial
  - Create material identification patterns for skin/eyes/hair
  - _Requirements: 6.1, 6.3, 6.4, 6.5, 9.1, 9.2, 9.3, 9.5_

- [x]\* 1.1 Write property test for WebGL version adaptation
  - **Property 9: WebGL Version Adaptation**
  - **Validates: Requirements 9.2, 9.3**

- [x] 2. Implement skin shader with subsurface scattering
  - [x] 2.1 Create skin vertex and fragment shaders (GLSL)
    - Write `lib/shaders/skin.vert.glsl` with morph target support
    - Write `lib/shaders/skin.frag.glsl` with SSS approximation
    - Implement quality variants (low/medium/high) for SSS complexity
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  - [x] 2.2 Create SkinShader TypeScript wrapper
    - Implement `createSkinShader()` function with uniforms setup
    - Add support for skin tone configuration
    - Add normal mapping and specular highlights
    - _Requirements: 1.4, 8.1, 8.2_
  - [x]\* 2.3 Write property test for morph target preservation (skin)
    - **Property 1: Morph Target Preservation**
    - **Validates: Requirements 1.2, 6.2**
  - [x]\* 2.4 Write property test for shader parameter configuration (skin tone)
    - **Property 2: Shader Parameter Configuration**
    - **Validates: Requirements 1.4, 8.2**

- [x] 3. Implement eye shader with cornea refraction
  - [x] 3.1 Create eye vertex and fragment shaders (GLSL)
    - Write `lib/shaders/eye.vert.glsl`
    - Write `lib/shaders/eye.frag.glsl` with cornea refraction and iris depth
    - Implement wetness specular highlights
    - Implement sclera rendering with subtle color variation
    - _Requirements: 2.1, 2.2, 2.5_
  - [x] 3.2 Create EyeShader TypeScript wrapper
    - Implement `createEyeShader()` function with uniforms setup
    - Add iris color and pupil size configuration
    - Add cornea IOR and thickness parameters
    - _Requirements: 2.3, 8.1, 8.2_
  - [x]\* 3.3 Write property test for shader parameter configuration (iris color)
    - **Property 2: Shader Parameter Configuration**
    - **Validates: Requirements 2.3, 8.2**

- [x] 4. Checkpoint - Verify skin and eye shaders render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement hair shader with anisotropic highlights
  - [x] 5.1 Create hair vertex and fragment shaders (GLSL)
    - Write `lib/shaders/hair.vert.glsl` with morph target support
    - Write `lib/shaders/hair.frag.glsl` with Kajiya-Kay anisotropic model
    - _Requirements: 3.1, 3.3_
  - [x] 5.2 Create HairShader TypeScript wrapper
    - Implement `createHairShader()` function with uniforms setup
    - Add hair color configuration
    - Add tangent shift and specular power parameters
    - _Requirements: 3.2, 8.1, 8.2_
  - [x]\* 5.3 Write property test for morph target preservation (hair)
    - **Property 1: Morph Target Preservation**
    - **Validates: Requirements 3.3, 6.2**
  - [x]\* 5.4 Write property test for shader parameter configuration (hair color)
    - **Property 2: Shader Parameter Configuration**
    - **Validates: Requirements 3.2, 8.2**

- [x] 6. Implement lighting system with shadows
  - [x] 6.1 Create LightingSystem component
    - Set up directional light with shadow casting
    - Configure shadow map resolution (512/1024/2048)
    - Add ambient light configuration
    - _Requirements: 4.1, 4.2, 4.5_
  - [x] 6.2 Integrate lighting uniforms with all shaders
    - Update skin/eye/hair shaders to receive light direction and color
    - Add dynamic light intensity and color adjustment
    - _Requirements: 4.4_
  - [x]\* 6.3 Write property test for light parameter updates
    - **Property 3: Light Parameter Updates**
    - **Validates: Requirements 3.4, 4.4**
  - [x]\* 6.4 Write property test for shadow map configuration
    - **Property 4: Shadow Map Configuration**
    - **Validates: Requirements 4.2**

- [x] 7. Implement post-processing effects
  - [x] 7.1 Set up EffectComposer with @react-three/postprocessing
    - Add FXAA or SMAA anti-aliasing pass
    - Add bloom effect with configurable intensity
    - Add color grading pass
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 7.2 Add SSAO (Screen Space Ambient Occlusion) for depth
    - Integrate SSAO pass into post-processing pipeline
    - Configure SSAO parameters for facial features
    - _Requirements: 4.3_
  - [x] 7.3 Implement effect toggling interface
    - Add enable/disable controls for each effect
    - Ensure effects can be toggled independently
    - _Requirements: 5.5_
  - [x]\* 7.4 Write property test for post-processing effect toggling
    - **Property 5: Post-Processing Effect Toggling**
    - **Validates: Requirements 5.2, 5.3, 5.5**

- [x] 8. Checkpoint - Verify complete rendering pipeline
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement shader configuration system
  - [x] 9.1 Create ShaderConfig interface and defaults
    - Define ShaderConfig TypeScript interface
    - Create DEFAULT_SHADER_CONFIG with sensible defaults
    - Create QUALITY_PRESETS for low/medium/high
    - _Requirements: 7.2, 8.1, 8.3_
  - [x] 9.2 Implement configuration validation
    - Add validation functions for color values, shadow map sizes
    - Add error logging for invalid inputs
    - Use defaults for invalid values
    - _Requirements: 8.3, 8.5_
  - [x] 9.3 Create useShaderManager React hook
    - Implement hook with config state management
    - Add updateConfig function for runtime parameter updates
    - Ensure configuration persists across re-renders
    - _Requirements: 8.2, 8.4_
  - [x]\* 9.4 Write property test for configuration persistence and validation
    - **Property 8: Configuration Persistence and Validation**
    - **Validates: Requirements 8.2, 8.3, 8.4**

- [x] 10. Implement material replacement and integration
  - [x] 10.1 Implement automatic material replacement in ShaderManager
    - Add replaceMaterials() method to detect and replace materials
    - Use MATERIAL_PATTERNS to identify skin/eyes/hair meshes
    - Preserve original material properties where applicable
    - _Requirements: 6.1, 6.3_
  - [x] 10.2 Integrate ShaderManager with AvatarCanvas component
    - Modify AvatarCanvas to accept shaderConfig prop
    - Call replaceMaterials() after GLB model loads
    - Add onShaderError callback for compilation failures
    - _Requirements: 6.1, 6.4, 6.5_
  - [x]\* 10.3 Write property test for material replacement
    - **Property 6: Material Replacement**
    - **Validates: Requirements 6.1, 6.3**

- [x] 11. Implement performance optimization and monitoring
  - [x] 11.1 Create PerformanceMonitor class
    - Track FPS, frame time, draw calls, triangles
    - Implement shouldReduceQuality() logic (FPS < 30 for 2 seconds)
    - Implement getRecommendedQuality() based on metrics
    - _Requirements: 7.1, 7.3_
  - [x] 11.2 Implement quality preset switching
    - Add setQuality() method to ShaderManager
    - Update shader variants, shadow map size, and effects based on quality
    - Add automatic quality reduction when performance degrades
    - _Requirements: 7.2, 7.3_
  - [x] 11.3 Optimize shader compilation and reuse
    - Ensure shaders compile once during initialization
    - Reuse shader programs across frames
    - Optimize texture memory usage
    - _Requirements: 7.4, 7.5_
  - [x]\* 11.4 Write property test for shader reuse
    - **Property 7: Shader Reuse**
    - **Validates: Requirements 7.4**

- [x] 12. Add error handling and fallbacks
  - [x] 12.1 Implement shader compilation error handling
    - Wrap shader creation in try-catch blocks
    - Fall back to MeshStandardMaterial on compilation failure
    - Log descriptive error messages with shader type
    - _Requirements: 6.4, 6.5_
  - [x] 12.2 Implement WebGL context loss handling
    - Listen for 'webglcontextlost' event
    - Prevent default and attempt context restoration
    - Reinitialize shaders after restoration
    - _Requirements: 9.4_
  - [x] 12.3 Implement missing texture fallbacks
    - Check texture loading status
    - Use solid color fallback for missing textures
    - Log warnings for missing textures
    - _Requirements: 6.4_

- [x] 13. Final checkpoint - Integration testing and validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties across all inputs
- Unit tests (not listed) should be added for specific examples and edge cases
- GLSL shader files should be kept separate from TypeScript for maintainability
- All shader parameters should be configurable at runtime without recompilation
