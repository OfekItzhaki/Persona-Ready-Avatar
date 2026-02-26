/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
/**
 * Property-Based Test: Material Replacement
 *
 * **Validates: Requirements 6.1, 6.3**
 *
 * Property 6: Material Replacement
 * For any loaded GLB model containing meshes with materials matching the naming
 * patterns (skin, eyes, hair), the Material_System should automatically replace
 * those materials with the corresponding custom ShaderMaterials.
 */

import { describe, expect, beforeEach, vi } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import * as THREE from 'three';
import { ShaderManager } from '../ShaderManager';
import { MATERIAL_PATTERNS } from '../types';

describe('Property 6: Material Replacement', () => {
  let mockRenderer: THREE.WebGLRenderer;
  let mockCanvas: HTMLCanvasElement;

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

    // Create a mock renderer with WebGL 2.0 context
    const mockContext = createMockWebGLContext(2, 4096, 256);

    mockRenderer = {
      domElement: mockCanvas,
      getContext: vi.fn().mockReturnValue(mockContext),
    } as unknown as THREE.WebGLRenderer;
  });

  /**
   * Property Test: Material Replacement by Naming Pattern
   *
   * For any mesh with a name matching the material patterns (skin, eyes, hair),
   * the ShaderManager should replace the original material with a ShaderMaterial.
   */
  test.prop([
    // Generate mesh names that match different patterns
    fc.oneof(
      // Skin pattern variations
      fc.constantFrom(
        'skin',
        'Skin',
        'SKIN',
        'face',
        'Face',
        'body',
        'Body',
        'skin_mesh',
        'face_01'
      ),
      // Eye pattern variations
      fc.constantFrom(
        'eye',
        'Eye',
        'EYE',
        'eyes',
        'iris',
        'Iris',
        'cornea',
        'left_eye',
        'right_eye'
      ),
      // Hair pattern variations
      fc.constantFrom('hair', 'Hair', 'HAIR', 'scalp', 'Scalp', 'hair_mesh', 'hair_01')
    ),
  ])('should replace materials for meshes matching naming patterns', (meshName) => {
    // Create a scene with a mesh
    const scene = new THREE.Scene();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const originalMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const mesh = new THREE.Mesh(geometry, originalMaterial);
    mesh.name = meshName;
    scene.add(mesh);

    // Create ShaderManager and replace materials
    const shaderManager = new ShaderManager(mockRenderer);
    shaderManager.replaceMaterials(scene);

    // Verify material was replaced with ShaderMaterial
    expect(mesh.material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(mesh.material).not.toBe(originalMaterial);

    // Verify the material is a ShaderMaterial with uniforms
    const shaderMaterial = mesh.material as THREE.ShaderMaterial;
    expect(shaderMaterial.uniforms).toBeDefined();
    expect(shaderMaterial.vertexShader).toBeDefined();
    expect(shaderMaterial.fragmentShader).toBeDefined();

    // Determine expected material type based on mesh name
    const lowerName = meshName.toLowerCase();
    let expectedType: 'skin' | 'eyes' | 'hair' | null = null;

    if (MATERIAL_PATTERNS.skin.test(lowerName)) {
      expectedType = 'skin';
      // Verify skin-specific uniforms
      expect(shaderMaterial.uniforms.skinTone).toBeDefined();
      expect(shaderMaterial.uniforms.sssIntensity).toBeDefined();
    } else if (MATERIAL_PATTERNS.eyes.test(lowerName)) {
      expectedType = 'eyes';
      // Verify eye-specific uniforms
      expect(shaderMaterial.uniforms.irisColor).toBeDefined();
      expect(shaderMaterial.uniforms.pupilSize).toBeDefined();
    } else if (MATERIAL_PATTERNS.hair.test(lowerName)) {
      expectedType = 'hair';
      // Verify hair-specific uniforms
      expect(shaderMaterial.uniforms.hairColor).toBeDefined();
      expect(shaderMaterial.uniforms.shiftTangent).toBeDefined();
    }

    expect(expectedType).not.toBeNull();

    // Clean up
    shaderManager.dispose();
  });

  /**
   * Property Test: Preserve Original Material Properties
   *
   * When replacing materials, the ShaderManager should preserve original
   * material properties where applicable (textures, etc.).
   */
  test.prop([
    fc.constantFrom('skin', 'face', 'body'),
    fc.boolean(), // Has texture map
    fc.boolean(), // Has normal map
  ])(
    'should preserve original material textures when replacing skin materials',
    (meshName, hasMap, hasNormalMap) => {
      // Create a scene with a mesh
      const scene = new THREE.Scene();
      const geometry = new THREE.BoxGeometry(1, 1, 1);

      // Create original material with optional textures
      const originalMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });

      let textureMap: THREE.Texture | null = null;
      let normalMap: THREE.Texture | null = null;

      if (hasMap) {
        textureMap = new THREE.Texture();
        textureMap.name = 'diffuse_map';
        originalMaterial.map = textureMap;
      }

      if (hasNormalMap) {
        normalMap = new THREE.Texture();
        normalMap.name = 'normal_map';
        originalMaterial.normalMap = normalMap;
      }

      const mesh = new THREE.Mesh(geometry, originalMaterial);
      mesh.name = meshName;
      scene.add(mesh);

      // Create ShaderManager and replace materials
      const shaderManager = new ShaderManager(mockRenderer);
      shaderManager.replaceMaterials(scene);

      // Verify material was replaced
      expect(mesh.material).toBeInstanceOf(THREE.ShaderMaterial);

      const shaderMaterial = mesh.material as THREE.ShaderMaterial;

      // Verify textures are preserved in uniforms
      if (hasMap) {
        expect(shaderMaterial.uniforms.map).toBeDefined();
        expect(shaderMaterial.uniforms.map.value).toBe(textureMap);
      }

      if (hasNormalMap) {
        expect(shaderMaterial.uniforms.normalMap).toBeDefined();
        expect(shaderMaterial.uniforms.normalMap.value).toBe(normalMap);
      }

      // Clean up
      shaderManager.dispose();
    }
  );

  /**
   * Property Test: Multiple Meshes with Different Material Types
   *
   * For a scene with multiple meshes of different types (skin, eyes, hair),
   * each should be replaced with the appropriate shader material.
   */
  test.prop([
    fc.record({
      skinName: fc.constantFrom('skin', 'face', 'body'),
      eyeName: fc.constantFrom('eye', 'eyes', 'left_eye'),
      hairName: fc.constantFrom('hair', 'scalp', 'hair_mesh'),
    }),
  ])(
    'should replace multiple materials with correct shader types',
    ({ skinName, eyeName, hairName }) => {
      // Create a scene with multiple meshes
      const scene = new THREE.Scene();
      const geometry = new THREE.BoxGeometry(1, 1, 1);

      // Create skin mesh
      const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xffccaa });
      const skinMesh = new THREE.Mesh(geometry, skinMaterial);
      skinMesh.name = skinName;
      scene.add(skinMesh);

      // Create eye mesh
      const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x4488ff });
      const eyeMesh = new THREE.Mesh(geometry, eyeMaterial);
      eyeMesh.name = eyeName;
      scene.add(eyeMesh);

      // Create hair mesh
      const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x332211 });
      const hairMesh = new THREE.Mesh(geometry, hairMaterial);
      hairMesh.name = hairName;
      scene.add(hairMesh);

      // Create ShaderManager and replace materials
      const shaderManager = new ShaderManager(mockRenderer);
      shaderManager.replaceMaterials(scene);

      // Verify all materials were replaced
      expect(skinMesh.material).toBeInstanceOf(THREE.ShaderMaterial);
      expect(eyeMesh.material).toBeInstanceOf(THREE.ShaderMaterial);
      expect(hairMesh.material).toBeInstanceOf(THREE.ShaderMaterial);

      // Verify each has the correct shader type uniforms
      const skinShader = skinMesh.material as THREE.ShaderMaterial;
      expect(skinShader.uniforms.skinTone).toBeDefined();
      expect(skinShader.uniforms.sssIntensity).toBeDefined();

      const eyeShader = eyeMesh.material as THREE.ShaderMaterial;
      expect(eyeShader.uniforms.irisColor).toBeDefined();
      expect(eyeShader.uniforms.pupilSize).toBeDefined();

      const hairShader = hairMesh.material as THREE.ShaderMaterial;
      expect(hairShader.uniforms.hairColor).toBeDefined();
      expect(hairShader.uniforms.shiftTangent).toBeDefined();

      // Clean up
      shaderManager.dispose();
    }
  );

  /**
   * Property Test: Non-Matching Meshes Are Not Replaced
   *
   * For meshes with names that don't match any pattern, the original
   * material should be preserved.
   */
  test.prop([
    // Generate mesh names that don't match any pattern
    fc.constantFrom('cube', 'sphere', 'plane', 'mesh_01', 'geometry', 'object', 'model'),
  ])('should not replace materials for meshes with non-matching names', (meshName) => {
    // Create a scene with a mesh
    const scene = new THREE.Scene();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const originalMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const mesh = new THREE.Mesh(geometry, originalMaterial);
    mesh.name = meshName;
    scene.add(mesh);

    // Create ShaderManager and replace materials
    const shaderManager = new ShaderManager(mockRenderer);
    shaderManager.replaceMaterials(scene);

    // Verify material was NOT replaced (still the original)
    expect(mesh.material).toBe(originalMaterial);
    expect(mesh.material).toBeInstanceOf(THREE.MeshStandardMaterial);

    // Clean up
    shaderManager.dispose();
  });

  /**
   * Property Test: Morph Target Support Preservation
   *
   * When replacing materials on meshes with morph targets, the shader
   * material should have morph target support enabled.
   */
  test.prop([
    fc.constantFrom('skin', 'hair'), // Only skin and hair support morph targets
    fc.array(fc.float({ min: 0, max: 1, noNaN: true }), { minLength: 2, maxLength: 4 }),
  ])(
    'should enable morph target support when replacing materials on morphed meshes',
    (meshName, morphInfluences) => {
      // Create a scene with a mesh that has morph targets
      const scene = new THREE.Scene();
      const geometry = new THREE.BoxGeometry(1, 1, 1);

      // Add morph target attributes
      const vertexCount = geometry.attributes.position.count;
      for (let i = 0; i < morphInfluences.length; i++) {
        const morphPositions = new Float32Array(vertexCount * 3);
        for (let j = 0; j < vertexCount * 3; j++) {
          morphPositions[j] = (Math.random() - 0.5) * 0.2;
        }
        geometry.morphAttributes.position = geometry.morphAttributes.position || [];
        geometry.morphAttributes.position[i] = new THREE.BufferAttribute(morphPositions, 3);
      }

      const originalMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
      const mesh = new THREE.Mesh(geometry, originalMaterial);
      mesh.name = meshName;
      mesh.morphTargetInfluences = morphInfluences;
      scene.add(mesh);

      // Create ShaderManager and replace materials
      const shaderManager = new ShaderManager(mockRenderer);
      shaderManager.replaceMaterials(scene);

      // Verify material was replaced with ShaderMaterial
      expect(mesh.material).toBeInstanceOf(THREE.ShaderMaterial);

      const shaderMaterial = mesh.material as THREE.ShaderMaterial;

      // Verify morph target support is enabled
      expect(shaderMaterial.defines?.USE_MORPHTARGETS).toBe(true);
      expect(shaderMaterial.vertexShader).toContain('USE_MORPHTARGETS');
      expect(shaderMaterial.vertexShader).toContain('morphTarget');

      // Verify morph target influences are still accessible
      expect(mesh.morphTargetInfluences).toBeDefined();
      expect(mesh.morphTargetInfluences).toHaveLength(morphInfluences.length);

      // Clean up
      shaderManager.dispose();
    }
  );

  /**
   * Property Test: Case-Insensitive Pattern Matching
   *
   * Material replacement should work regardless of the case of the mesh name.
   */
  test.prop([
    fc.record({
      baseName: fc.constantFrom('skin', 'eye', 'hair'),
      caseVariant: fc.constantFrom('lower', 'upper', 'title', 'mixed'),
    }),
  ])('should match patterns case-insensitively', ({ baseName, caseVariant }) => {
    // Apply case variant to base name
    let meshName = baseName;
    switch (caseVariant) {
      case 'lower':
        meshName = baseName.toLowerCase();
        break;
      case 'upper':
        meshName = baseName.toUpperCase();
        break;
      case 'title':
        meshName = baseName.charAt(0).toUpperCase() + baseName.slice(1).toLowerCase();
        break;
      case 'mixed':
        meshName = baseName
          .split('')
          .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
          .join('');
        break;
    }

    // Create a scene with a mesh
    const scene = new THREE.Scene();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const originalMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const mesh = new THREE.Mesh(geometry, originalMaterial);
    mesh.name = meshName;
    scene.add(mesh);

    // Create ShaderManager and replace materials
    const shaderManager = new ShaderManager(mockRenderer);
    shaderManager.replaceMaterials(scene);

    // Verify material was replaced regardless of case
    expect(mesh.material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(mesh.material).not.toBe(originalMaterial);

    // Clean up
    shaderManager.dispose();
  });

  /**
   * Property Test: Nested Meshes in Scene Hierarchy
   *
   * Material replacement should work for meshes at any level of the scene hierarchy.
   */
  test.prop([
    fc.constantFrom('skin', 'eye', 'hair'),
    fc.integer({ min: 0, max: 3 }), // Nesting depth
  ])('should replace materials for meshes at any hierarchy depth', (meshName, nestingDepth) => {
    // Create a scene with nested groups
    const scene = new THREE.Scene();
    let parent: THREE.Object3D = scene;

    // Create nested groups
    for (let i = 0; i < nestingDepth; i++) {
      const group = new THREE.Group();
      group.name = `group_${i}`;
      parent.add(group);
      parent = group;
    }

    // Add mesh at the deepest level
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const originalMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const mesh = new THREE.Mesh(geometry, originalMaterial);
    mesh.name = meshName;
    parent.add(mesh);

    // Create ShaderManager and replace materials
    const shaderManager = new ShaderManager(mockRenderer);
    shaderManager.replaceMaterials(scene);

    // Verify material was replaced even at nested depth
    expect(mesh.material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(mesh.material).not.toBe(originalMaterial);

    // Clean up
    shaderManager.dispose();
  });

  /**
   * Property Test: Empty Scene Handling
   *
   * Material replacement should handle empty scenes gracefully without errors.
   */
  test.prop([fc.constant(undefined)])('should handle empty scenes without errors', () => {
    // Create an empty scene
    const scene = new THREE.Scene();

    // Create ShaderManager and replace materials
    const shaderManager = new ShaderManager(mockRenderer);

    // Should not throw any errors
    expect(() => {
      shaderManager.replaceMaterials(scene);
    }).not.toThrow();

    // Verify status is still valid
    const status = shaderManager.getStatus();
    expect(status.compiled).toBe(true);

    // Clean up
    shaderManager.dispose();
  });

  /**
   * Property Test: Material Replacement Idempotency
   *
   * Calling replaceMaterials multiple times should not cause issues
   * (though materials may be replaced again).
   */
  test.prop([
    fc.constantFrom('skin', 'eye', 'hair'),
    fc.integer({ min: 1, max: 3 }), // Number of times to call replaceMaterials
  ])('should handle multiple replaceMaterials calls without errors', (meshName, callCount) => {
    // Create a scene with a mesh
    const scene = new THREE.Scene();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const originalMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    const mesh = new THREE.Mesh(geometry, originalMaterial);
    mesh.name = meshName;
    scene.add(mesh);

    // Create ShaderManager
    const shaderManager = new ShaderManager(mockRenderer);

    // Call replaceMaterials multiple times
    for (let i = 0; i < callCount; i++) {
      expect(() => {
        shaderManager.replaceMaterials(scene);
      }).not.toThrow();
    }

    // Verify material is still a ShaderMaterial
    expect(mesh.material).toBeInstanceOf(THREE.ShaderMaterial);

    // Clean up
    shaderManager.dispose();
  });
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
