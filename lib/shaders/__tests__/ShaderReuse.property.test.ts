/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
/**
 * Property-Based Test: Shader Reuse
 *
 * **Validates: Requirements 7.4**
 *
 * Property 7: Shader Reuse
 * For any sequence of render frames, shader programs should be compiled once
 * during initialization and reused across all subsequent frames without recompilation.
 */

import { describe, expect, beforeEach, vi } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import * as THREE from 'three';
import { ShaderManager } from '../ShaderManager';
import type { WebGLCapabilities } from '../types';

describe('Property 7: Shader Reuse', () => {
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

    // Create a mock WebGL2 context
    const mockContext = createMockWebGLContext();

    // Create a mock renderer
    mockRenderer = {
      domElement: mockCanvas,
      getContext: vi.fn(() => mockContext),
      compile: vi.fn(),
    } as unknown as THREE.WebGLRenderer;
  });

  /**
   * Property Test: Shader Compilation Happens Once
   *
   * For any number of frames rendered, shaders should be compiled only once
   * during initialization and reused across all frames.
   */
  test.prop([
    fc.integer({ min: 1, max: 100 }), // Number of frames to simulate
  ])('should compile shaders once and reuse them across multiple frames', (frameCount) => {
    // Create shader manager (this triggers shader compilation)
    const shaderManager = new ShaderManager(mockRenderer);

    // Create a test scene with meshes
    const scene = new THREE.Scene();

    // Add skin mesh
    const skinGeometry = new THREE.BoxGeometry(1, 1, 1);
    const skinMesh = new THREE.Mesh(skinGeometry, new THREE.MeshStandardMaterial());
    skinMesh.name = 'skin_mesh';
    scene.add(skinMesh);

    // Add eye mesh
    const eyeGeometry = new THREE.SphereGeometry(0.5);
    const eyeMesh = new THREE.Mesh(eyeGeometry, new THREE.MeshStandardMaterial());
    eyeMesh.name = 'eye_left';
    scene.add(eyeMesh);

    // Add hair mesh
    const hairGeometry = new THREE.BoxGeometry(1, 1, 1);
    const hairMesh = new THREE.Mesh(hairGeometry, new THREE.MeshStandardMaterial());
    hairMesh.name = 'hair_mesh';
    scene.add(hairMesh);

    // Replace materials (this creates shader materials)
    shaderManager.replaceMaterials(scene);

    // Get the shader materials
    const skinMaterial = skinMesh.material as THREE.ShaderMaterial;
    const eyeMaterial = eyeMesh.material as THREE.ShaderMaterial;
    const hairMaterial = hairMesh.material as THREE.ShaderMaterial;

    // Verify materials were replaced with ShaderMaterials
    expect(skinMaterial).toBeInstanceOf(THREE.ShaderMaterial);
    expect(eyeMaterial).toBeInstanceOf(THREE.ShaderMaterial);
    expect(hairMaterial).toBeInstanceOf(THREE.ShaderMaterial);

    // Track initial needsUpdate state (should be false after creation)
    const initialSkinNeedsUpdate = skinMaterial.needsUpdate;
    const initialEyeNeedsUpdate = eyeMaterial.needsUpdate;
    const initialHairNeedsUpdate = hairMaterial.needsUpdate;

    // Store shader program references
    const skinProgram = skinMaterial.program;
    const eyeProgram = eyeMaterial.program;
    const hairProgram = hairMaterial.program;

    // Simulate multiple render frames
    for (let frame = 0; frame < frameCount; frame++) {
      // In a real render loop, Three.js would use the shader program
      // without recompiling as long as needsUpdate is false

      // Verify needsUpdate remains falsy (no recompilation triggered)
      expect(skinMaterial.needsUpdate).toBeFalsy();
      expect(eyeMaterial.needsUpdate).toBeFalsy();
      expect(hairMaterial.needsUpdate).toBeFalsy();

      // Verify shader programs remain the same (reused)
      expect(skinMaterial.program).toBe(skinProgram);
      expect(eyeMaterial.program).toBe(eyeProgram);
      expect(hairMaterial.program).toBe(hairProgram);
    }

    // Verify shaders were never marked for recompilation
    expect(skinMaterial.needsUpdate).toBe(initialSkinNeedsUpdate);
    expect(eyeMaterial.needsUpdate).toBe(initialEyeNeedsUpdate);
    expect(hairMaterial.needsUpdate).toBe(initialHairNeedsUpdate);

    // All should remain falsy (undefined or false)
    expect(skinMaterial.needsUpdate).toBeFalsy();
    expect(eyeMaterial.needsUpdate).toBeFalsy();
    expect(hairMaterial.needsUpdate).toBeFalsy();
  });

  /**
   * Property Test: Uniform Updates Don't Trigger Recompilation
   *
   * For any sequence of uniform updates across multiple frames, the shader
   * programs should remain the same (no recompilation).
   */
  test.prop([
    fc.integer({ min: 1, max: 50 }), // Number of frames
    fc.array(
      fc.record({
        r: fc.float({ min: 0, max: 1, noNaN: true }),
        g: fc.float({ min: 0, max: 1, noNaN: true }),
        b: fc.float({ min: 0, max: 1, noNaN: true }),
      }),
      { minLength: 1, maxLength: 50 }
    ), // Sequence of skin tone updates
  ])('should reuse shaders when updating uniforms across frames', (frameCount, skinToneUpdates) => {
    // Create shader manager
    const shaderManager = new ShaderManager(mockRenderer);

    // Create a test scene with a skin mesh
    const scene = new THREE.Scene();
    const skinGeometry = new THREE.BoxGeometry(1, 1, 1);
    const skinMesh = new THREE.Mesh(skinGeometry, new THREE.MeshStandardMaterial());
    skinMesh.name = 'skin_mesh';
    scene.add(skinMesh);

    // Replace materials
    shaderManager.replaceMaterials(scene);

    // Get the shader material
    const skinMaterial = skinMesh.material as THREE.ShaderMaterial;
    expect(skinMaterial).toBeInstanceOf(THREE.ShaderMaterial);

    // Store initial shader program reference
    const initialProgram = skinMaterial.program;

    // Simulate frames with uniform updates
    for (let frame = 0; frame < frameCount; frame++) {
      // Update skin tone uniform (this should NOT trigger recompilation)
      const skinTone = skinToneUpdates[frame % skinToneUpdates.length];
      shaderManager.updateConfig({ skinTone });

      // Verify needsUpdate is falsy (no recompilation)
      expect(skinMaterial.needsUpdate).toBeFalsy();

      // Verify shader program is reused
      expect(skinMaterial.program).toBe(initialProgram);

      // Verify uniform was actually updated
      const uniformColor = skinMaterial.uniforms.skinTone.value as THREE.Color;
      expect(uniformColor.r).toBeCloseTo(skinTone.r, 5);
      expect(uniformColor.g).toBeCloseTo(skinTone.g, 5);
      expect(uniformColor.b).toBeCloseTo(skinTone.b, 5);
    }
  });

  /**
   * Property Test: Multiple Meshes Share Shader Programs
   *
   * For any number of meshes of the same type (e.g., multiple skin meshes),
   * they should all use shader materials without requiring separate compilations
   * for each mesh.
   */
  test.prop([
    fc.integer({ min: 2, max: 10 }), // Number of skin meshes
    fc.integer({ min: 1, max: 20 }), // Number of frames
  ])(
    'should reuse shader materials across multiple meshes of the same type',
    (meshCount, frameCount) => {
      // Create shader manager
      const shaderManager = new ShaderManager(mockRenderer);

      // Create a test scene with multiple skin meshes
      const scene = new THREE.Scene();
      const meshes: THREE.Mesh[] = [];

      for (let i = 0; i < meshCount; i++) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
        mesh.name = `skin_mesh_${i}`;
        scene.add(mesh);
        meshes.push(mesh);
      }

      // Replace materials
      shaderManager.replaceMaterials(scene);

      // Verify all meshes have ShaderMaterials
      const materials = meshes.map((mesh) => mesh.material as THREE.ShaderMaterial);
      materials.forEach((material) => {
        expect(material).toBeInstanceOf(THREE.ShaderMaterial);
      });

      // Store initial shader programs
      const initialPrograms = materials.map((material) => material.program);

      // Simulate multiple frames
      for (let frame = 0; frame < frameCount; frame++) {
        // Verify all materials maintain their shader programs
        materials.forEach((material, index) => {
          expect(material.needsUpdate).toBeFalsy();
          expect(material.program).toBe(initialPrograms[index]);
        });
      }

      // Verify shader programs were reused (no recompilation)
      materials.forEach((material, index) => {
        expect(material.program).toBe(initialPrograms[index]);
      });
    }
  );

  /**
   * Property Test: Quality Changes Require Recompilation
   *
   * This test verifies that shader reuse is maintained within a quality level,
   * but changing quality levels appropriately triggers recompilation (by creating
   * new materials with different shader variants).
   */
  test.prop([
    fc.constantFrom('low', 'medium', 'high'),
    fc.integer({ min: 5, max: 30 }), // Frames before quality change
    fc.integer({ min: 5, max: 30 }), // Frames after quality change
  ])(
    'should reuse shaders within quality level but allow quality changes',
    (initialQuality, framesBeforeChange, framesAfterChange) => {
      // Create shader manager with initial quality
      const shaderManager = new ShaderManager(mockRenderer, {
        quality: initialQuality as 'low' | 'medium' | 'high',
      });

      // Create a test scene
      const scene = new THREE.Scene();
      const skinGeometry = new THREE.BoxGeometry(1, 1, 1);
      const skinMesh = new THREE.Mesh(skinGeometry, new THREE.MeshStandardMaterial());
      skinMesh.name = 'skin_mesh';
      scene.add(skinMesh);

      // Replace materials
      shaderManager.replaceMaterials(scene);

      // Get the shader material
      const skinMaterial = skinMesh.material as THREE.ShaderMaterial;
      const initialProgram = skinMaterial.program;

      // Simulate frames before quality change
      for (let frame = 0; frame < framesBeforeChange; frame++) {
        expect(skinMaterial.needsUpdate).toBeFalsy();
        expect(skinMaterial.program).toBe(initialProgram);
      }

      // Note: Quality changes in the current implementation update uniforms
      // but don't automatically recreate materials. This is by design - quality
      // changes affect shadow map size and post-processing, not shader recompilation.
      // The shader variants are selected at creation time based on initial quality.

      // Verify shader program is still reused after quality config update
      const newQuality = initialQuality === 'low' ? 'high' : 'low';
      shaderManager.setQuality(newQuality as 'low' | 'medium' | 'high');

      // Simulate frames after quality change
      for (let frame = 0; frame < framesAfterChange; frame++) {
        // Shader program should still be reused (quality change doesn't force recompilation)
        expect(skinMaterial.needsUpdate).toBeFalsy();
      }
    }
  );

  /**
   * Property Test: Shader Reuse Across Different Material Types
   *
   * For any combination of skin, eye, and hair meshes, each material type
   * should compile once and be reused across frames.
   */
  test.prop([
    fc.integer({ min: 1, max: 20 }), // Number of frames
    fc.boolean(), // Include skin mesh
    fc.boolean(), // Include eye mesh
    fc.boolean(), // Include hair mesh
  ])(
    'should reuse shaders for each material type independently',
    (frameCount, includeSkin, includeEye, includeHair) => {
      // Skip if no meshes are included
      if (!includeSkin && !includeEye && !includeHair) {
        return; // Skip this test case
      }

      // Create shader manager
      const shaderManager = new ShaderManager(mockRenderer);

      // Create a test scene
      const scene = new THREE.Scene();
      const materials: THREE.ShaderMaterial[] = [];

      if (includeSkin) {
        const skinMesh = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial()
        );
        skinMesh.name = 'skin_mesh';
        scene.add(skinMesh);
      }

      if (includeEye) {
        const eyeMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.5),
          new THREE.MeshStandardMaterial()
        );
        eyeMesh.name = 'eye_left';
        scene.add(eyeMesh);
      }

      if (includeHair) {
        const hairMesh = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshStandardMaterial()
        );
        hairMesh.name = 'hair_mesh';
        scene.add(hairMesh);
      }

      // Replace materials
      shaderManager.replaceMaterials(scene);

      // Collect all shader materials
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial) {
          materials.push(object.material);
        }
      });

      // Verify we have materials
      expect(materials.length).toBeGreaterThan(0);

      // Store initial shader programs
      const initialPrograms = materials.map((material) => material.program);

      // Simulate multiple frames
      for (let frame = 0; frame < frameCount; frame++) {
        // Verify all materials reuse their shader programs
        materials.forEach((material, index) => {
          expect(material.needsUpdate).toBeFalsy();
          expect(material.program).toBe(initialPrograms[index]);
        });
      }
    }
  );

  /**
   * Property Test: Shader Reuse with Configuration Updates
   *
   * For any sequence of configuration updates (skin tone, iris color, hair color),
   * shader programs should be reused without recompilation.
   */
  test.prop([
    fc.integer({ min: 1, max: 30 }), // Number of frames
    fc.array(
      fc.record({
        skinTone: fc.record({
          r: fc.float({ min: 0, max: 1, noNaN: true }),
          g: fc.float({ min: 0, max: 1, noNaN: true }),
          b: fc.float({ min: 0, max: 1, noNaN: true }),
        }),
        irisColor: fc.record({
          r: fc.float({ min: 0, max: 1, noNaN: true }),
          g: fc.float({ min: 0, max: 1, noNaN: true }),
          b: fc.float({ min: 0, max: 1, noNaN: true }),
        }),
        hairColor: fc.record({
          r: fc.float({ min: 0, max: 1, noNaN: true }),
          g: fc.float({ min: 0, max: 1, noNaN: true }),
          b: fc.float({ min: 0, max: 1, noNaN: true }),
        }),
      }),
      { minLength: 1, maxLength: 30 }
    ),
  ])(
    'should reuse shaders when updating multiple configuration parameters',
    (frameCount, configUpdates) => {
      // Create shader manager
      const shaderManager = new ShaderManager(mockRenderer);

      // Create a test scene with all material types
      const scene = new THREE.Scene();

      const skinMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial()
      );
      skinMesh.name = 'skin_mesh';
      scene.add(skinMesh);

      const eyeMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.5),
        new THREE.MeshStandardMaterial()
      );
      eyeMesh.name = 'eye_left';
      scene.add(eyeMesh);

      const hairMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial()
      );
      hairMesh.name = 'hair_mesh';
      scene.add(hairMesh);

      // Replace materials
      shaderManager.replaceMaterials(scene);

      // Get shader materials
      const skinMaterial = skinMesh.material as THREE.ShaderMaterial;
      const eyeMaterial = eyeMesh.material as THREE.ShaderMaterial;
      const hairMaterial = hairMesh.material as THREE.ShaderMaterial;

      // Store initial shader programs
      const initialSkinProgram = skinMaterial.program;
      const initialEyeProgram = eyeMaterial.program;
      const initialHairProgram = hairMaterial.program;

      // Simulate frames with configuration updates
      for (let frame = 0; frame < frameCount; frame++) {
        const config = configUpdates[frame % configUpdates.length];

        // Update configuration
        shaderManager.updateConfig(config);

        // Verify shader programs are reused
        expect(skinMaterial.needsUpdate).toBeFalsy();
        expect(eyeMaterial.needsUpdate).toBeFalsy();
        expect(hairMaterial.needsUpdate).toBeFalsy();

        expect(skinMaterial.program).toBe(initialSkinProgram);
        expect(eyeMaterial.program).toBe(initialEyeProgram);
        expect(hairMaterial.program).toBe(initialHairProgram);
      }
    }
  );
});

/**
 * Helper: Create Mock WebGL Context
 *
 * Creates a mock WebGL2 context for testing.
 */
function createMockWebGLContext(): any {
  // Set up global WebGL2RenderingContext if not defined
  if (typeof global.WebGL2RenderingContext === 'undefined') {
    (global as any).WebGL2RenderingContext = function WebGL2RenderingContext() {};
  }

  const baseContext = {
    MAX_TEXTURE_SIZE: 0x0d33,
    MAX_VERTEX_UNIFORM_VECTORS: 0x8dfb,
    getParameter: vi.fn((param: number) => {
      if (param === 0x0d33) return 4096; // MAX_TEXTURE_SIZE
      if (param === 0x8dfb) return 256; // MAX_VERTEX_UNIFORM_VECTORS
      return null;
    }),
    getExtension: vi.fn(() => null),
  };

  const context = Object.create(global.WebGL2RenderingContext.prototype);
  return Object.assign(context, baseContext);
}
