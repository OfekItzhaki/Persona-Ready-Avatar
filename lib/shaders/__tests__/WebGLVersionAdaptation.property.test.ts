/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
/**
 * Property-Based Test: WebGL Version Adaptation
 *
 * **Validates: Requirements 9.2, 9.3**
 *
 * Property 9: WebGL Version Adaptation
 * For any detected WebGL version (1.0 or 2.0), the Material_System should select
 * and compile shader variants appropriate for that WebGL version's capabilities.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import * as THREE from 'three';
import { ShaderManager } from '../ShaderManager';
import type { WebGLCapabilities } from '../types';

describe('Property 9: WebGL Version Adaptation', () => {
  let mockRenderer: THREE.WebGLRenderer;
  let mockCanvas: HTMLCanvasElement;

  // Set up global WebGL context constructors before all tests
  beforeEach(() => {
    // Set up global WebGL constructors if not defined
    if (typeof global.WebGLRenderingContext === 'undefined') {
      (global as any).WebGLRenderingContext = function WebGLRenderingContext() {};
    }
    if (typeof global.WebGL2RenderingContext === 'undefined') {
      (global as any).WebGL2RenderingContext = function WebGL2RenderingContext() {};
    }

    // Create a mock canvas
    mockCanvas = document.createElement('canvas');

    // Create a mock renderer
    mockRenderer = {
      domElement: mockCanvas,
      getContext: vi.fn(),
    } as unknown as THREE.WebGLRenderer;
  });

  /**
   * Property Test: WebGL Version Adaptation
   *
   * For any detected WebGL version (1.0 or 2.0), the Material_System should
   * select and compile shader variants appropriate for that WebGL version's capabilities.
   */
  test.prop([
    // Generate WebGL version (1 or 2)
    fc.constantFrom(1, 2),
    // Generate max texture size (common values)
    fc.constantFrom(2048, 4096, 8192, 16384),
    // Generate max vertex uniforms (typical range)
    fc.integer({ min: 128, max: 1024 }),
  ])(
    'should detect WebGL capabilities and select appropriate shader variants',
    (webglVersion, maxTextureSize, maxVertexUniforms) => {
      // Mock WebGL context based on version
      const mockContext = createMockWebGLContext(
        webglVersion as 1 | 2,
        maxTextureSize,
        maxVertexUniforms
      );

      // Set up the mock renderer to return our mock context
      vi.mocked(mockRenderer.getContext).mockReturnValue(mockContext as any);

      // Create ShaderManager (this will call detectCapabilities)
      const shaderManager = new ShaderManager(mockRenderer);

      // Get detected capabilities
      const capabilities = shaderManager.getCapabilities();

      // Verify WebGL version is correctly detected
      expect(capabilities.version).toBe(webglVersion);

      // Verify max texture size is correctly detected
      expect(capabilities.maxTextureSize).toBe(maxTextureSize);

      // Verify max vertex uniforms is correctly detected
      expect(capabilities.maxVertexUniforms).toBe(maxVertexUniforms);

      // Verify WebGL 2.0 specific capabilities
      if (webglVersion === 2) {
        // WebGL 2.0 should have built-in float texture support
        expect(capabilities.supportsFloatTextures).toBe(true);
        // WebGL 2.0 should have built-in derivatives support
        expect(capabilities.supportsDerivatives).toBe(true);
      }

      // Verify WebGL 1.0 capabilities depend on extensions
      if (webglVersion === 1) {
        // Float texture support depends on OES_texture_float extension
        expect(typeof capabilities.supportsFloatTextures).toBe('boolean');
        // Derivatives support depends on OES_standard_derivatives extension
        expect(typeof capabilities.supportsDerivatives).toBe('boolean');
      }

      // Verify shader compilation status
      const status = shaderManager.getStatus();
      expect(status.compiled).toBe(true);
      expect(status.errors).toHaveLength(0);

      // Clean up
      shaderManager.dispose();
    }
  );

  /**
   * Property Test: WebGL 1.0 Extension Support
   *
   * For WebGL 1.0, capabilities should correctly reflect extension availability.
   */
  test.prop([
    // Generate whether float texture extension is available
    fc.boolean(),
    // Generate whether derivatives extension is available
    fc.boolean(),
  ])(
    'should correctly detect WebGL 1.0 extension support',
    (hasFloatTextureExt, hasDerivativesExt) => {
      // Mock WebGL 1.0 context with specific extension support
      const mockContext = createMockWebGL1Context(hasFloatTextureExt, hasDerivativesExt);

      // Set up the mock renderer to return our mock context
      vi.mocked(mockRenderer.getContext).mockReturnValue(mockContext as any);

      // Create ShaderManager
      const shaderManager = new ShaderManager(mockRenderer);

      // Get detected capabilities
      const capabilities = shaderManager.getCapabilities();

      // Verify WebGL version is 1
      expect(capabilities.version).toBe(1);

      // Verify extension support is correctly detected
      expect(capabilities.supportsFloatTextures).toBe(hasFloatTextureExt);
      expect(capabilities.supportsDerivatives).toBe(hasDerivativesExt);

      // Clean up
      shaderManager.dispose();
    }
  );

  /**
   * Property Test: Shader Material Creation with Different WebGL Versions
   *
   * Shaders should be created successfully regardless of WebGL version.
   */
  test.prop([fc.constantFrom(1, 2), fc.constantFrom('low', 'medium', 'high')])(
    'should create shader materials successfully for any WebGL version and quality',
    (webglVersion, quality) => {
      // Mock WebGL context
      const mockContext = createMockWebGLContext(webglVersion as 1 | 2, 4096, 256);

      vi.mocked(mockRenderer.getContext).mockReturnValue(mockContext as any);

      // Create ShaderManager with quality preset
      const shaderManager = new ShaderManager(mockRenderer, {
        quality: quality as 'low' | 'medium' | 'high',
      });

      // Create a test scene with meshes
      const scene = new THREE.Scene();

      // Create skin mesh
      const skinGeometry = new THREE.BoxGeometry(1, 1, 1);
      const skinMesh = new THREE.Mesh(skinGeometry, new THREE.MeshStandardMaterial());
      skinMesh.name = 'skin_mesh';
      scene.add(skinMesh);

      // Create eye mesh
      const eyeGeometry = new THREE.SphereGeometry(0.5);
      const eyeMesh = new THREE.Mesh(eyeGeometry, new THREE.MeshStandardMaterial());
      eyeMesh.name = 'eye_left';
      scene.add(eyeMesh);

      // Create hair mesh
      const hairGeometry = new THREE.BoxGeometry(1, 1, 1);
      const hairMesh = new THREE.Mesh(hairGeometry, new THREE.MeshStandardMaterial());
      hairMesh.name = 'hair_mesh';
      scene.add(hairMesh);

      // Replace materials
      shaderManager.replaceMaterials(scene);

      // Verify materials were replaced with ShaderMaterials
      expect(skinMesh.material).toBeInstanceOf(THREE.ShaderMaterial);
      expect(eyeMesh.material).toBeInstanceOf(THREE.ShaderMaterial);
      expect(hairMesh.material).toBeInstanceOf(THREE.ShaderMaterial);

      // Verify shader materials have required properties
      const skinMaterial = skinMesh.material as THREE.ShaderMaterial;
      expect(skinMaterial.vertexShader).toBeTruthy();
      expect(skinMaterial.fragmentShader).toBeTruthy();
      expect(skinMaterial.uniforms).toBeDefined();

      // Verify quality defines are present in fragment shader
      const qualityDefine = `QUALITY_${quality.toUpperCase()}`;
      expect(skinMaterial.fragmentShader).toContain(qualityDefine);

      // Verify shader compilation status
      const status = shaderManager.getStatus();
      expect(status.compiled).toBe(true);

      // Clean up
      shaderManager.dispose();
    }
  );
});

/**
 * Helper: Create Mock WebGL Context
 *
 * Creates a mock WebGL context with specified version and capabilities.
 */
function createMockWebGLContext(
  version: 1 | 2,
  maxTextureSize: number,
  maxVertexUniforms: number
): any {
  const isWebGL2 = version === 2;

  // Create a mock constructor function for instanceof checks
  const MockWebGL2RenderingContext = function () {};
  const MockWebGLRenderingContext = function () {};

  // Base context properties
  const baseContext = {
    MAX_TEXTURE_SIZE: 0x0d33,
    MAX_VERTEX_UNIFORM_VECTORS: 0x8dfb,
    getParameter: vi.fn((param: number) => {
      if (param === 0x0d33) return maxTextureSize; // MAX_TEXTURE_SIZE
      if (param === 0x8dfb) return maxVertexUniforms; // MAX_VERTEX_UNIFORM_VECTORS
      return null;
    }),
    getExtension: vi.fn((name: string) => {
      // WebGL 1.0 extensions
      if (version === 1) {
        if (name === 'OES_texture_float') {
          // Randomly support or not support (for property testing)
          return {}; // Return non-null to indicate support
        }
        if (name === 'OES_standard_derivatives') {
          return {}; // Return non-null to indicate support
        }
      }
      return null;
    }),
  };

  // Create context with proper prototype chain for instanceof checks
  if (isWebGL2) {
    // Set up global WebGL2RenderingContext if not defined
    if (typeof global.WebGL2RenderingContext === 'undefined') {
      (global as any).WebGL2RenderingContext = MockWebGL2RenderingContext;
    }
    const context = Object.create(global.WebGL2RenderingContext.prototype);
    return Object.assign(context, baseContext);
  } else {
    // Set up global WebGLRenderingContext if not defined
    if (typeof global.WebGLRenderingContext === 'undefined') {
      (global as any).WebGLRenderingContext = MockWebGLRenderingContext;
    }
    const context = Object.create(global.WebGLRenderingContext.prototype);
    return Object.assign(context, baseContext);
  }
}

/**
 * Helper: Create Mock WebGL 1.0 Context with Specific Extension Support
 *
 * Creates a mock WebGL 1.0 context with configurable extension support.
 */
function createMockWebGL1Context(hasFloatTextureExt: boolean, hasDerivativesExt: boolean): any {
  // Set up global WebGLRenderingContext if not defined
  const MockWebGLRenderingContext = function () {};
  if (typeof global.WebGLRenderingContext === 'undefined') {
    (global as any).WebGLRenderingContext = MockWebGLRenderingContext;
  }

  const baseContext = {
    MAX_TEXTURE_SIZE: 0x0d33,
    MAX_VERTEX_UNIFORM_VECTORS: 0x8dfb,
    getParameter: vi.fn((param: number) => {
      if (param === 0x0d33) return 4096; // MAX_TEXTURE_SIZE
      if (param === 0x8dfb) return 256; // MAX_VERTEX_UNIFORM_VECTORS
      return null;
    }),
    getExtension: vi.fn((name: string) => {
      if (name === 'OES_texture_float') {
        return hasFloatTextureExt ? {} : null;
      }
      if (name === 'OES_standard_derivatives') {
        return hasDerivativesExt ? {} : null;
      }
      return null;
    }),
  };

  const context = Object.create(global.WebGLRenderingContext.prototype);
  return Object.assign(context, baseContext);
}
