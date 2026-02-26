/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
/**
 * Property-Based Test: Light Parameter Updates
 *
 * **Validates: Requirements 3.4, 4.4**
 *
 * Property 3: Light Parameter Updates
 * For any valid light direction vector, updating the light direction should
 * propagate to all shader uniforms that depend on lighting calculations.
 */

import { describe, expect, beforeEach, vi } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import * as THREE from 'three';
import { ShaderManager } from '../ShaderManager';
import { LightingSystem } from '../LightingSystem';
import type { WebGLCapabilities } from '../types';

describe('Property 3: Light Parameter Updates', () => {
  let mockRenderer: THREE.WebGLRenderer;
  let mockCanvas: HTMLCanvasElement;
  let shaderManager: ShaderManager;
  let lightingSystem: LightingSystem;
  let scene: THREE.Scene;

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

    // Create a mock WebGL context
    const mockContext = createMockWebGLContext();

    // Create a mock renderer
    mockRenderer = {
      domElement: mockCanvas,
      getContext: vi.fn().mockReturnValue(mockContext),
    } as unknown as THREE.WebGLRenderer;

    // Create shader manager
    shaderManager = new ShaderManager(mockRenderer);

    // Create a test scene with skin, eye, and hair meshes
    scene = new THREE.Scene();

    // Create skin mesh
    const skinGeometry = new THREE.BoxGeometry(1, 1, 1);
    const skinMesh = new THREE.Mesh(skinGeometry);
    skinMesh.name = 'skin_mesh';
    scene.add(skinMesh);

    // Create eye mesh
    const eyeGeometry = new THREE.SphereGeometry(0.5);
    const eyeMesh = new THREE.Mesh(eyeGeometry);
    eyeMesh.name = 'eye_left';
    scene.add(eyeMesh);

    // Create hair mesh
    const hairGeometry = new THREE.BoxGeometry(1, 1, 1);
    const hairMesh = new THREE.Mesh(hairGeometry);
    hairMesh.name = 'hair_mesh';
    scene.add(hairMesh);

    // Replace materials with shaders
    shaderManager.replaceMaterials(scene);

    // Create lighting system
    lightingSystem = new LightingSystem();
    shaderManager.setLightingSystem(lightingSystem);
  });

  /**
   * Property Test: Light Direction Propagation
   *
   * For any valid normalized light direction vector, updating the light direction
   * should propagate to all shader uniforms (skin, eyes, hair).
   */
  test.prop([
    // Generate random normalized direction vectors
    fc
      .record({
        x: fc.float({ min: -1, max: 1, noNaN: true }),
        y: fc.float({ min: -1, max: 1, noNaN: true }),
        z: fc.float({ min: -1, max: 1, noNaN: true }),
      })
      .filter(({ x, y, z }) => {
        // Filter out zero vectors (can't be normalized)
        const length = Math.sqrt(x * x + y * y + z * z);
        return length > 0.01;
      })
      .map(({ x, y, z }) => {
        // Normalize the vector
        const length = Math.sqrt(x * x + y * y + z * z);
        return new THREE.Vector3(x / length, y / length, z / length);
      }),
  ])('should propagate light direction to all shader uniforms', (lightDirection) => {
    // Update lighting system with new light direction
    lightingSystem.updateConfig({
      directionalLightPosition: lightDirection.clone().multiplyScalar(5),
    });

    // Update shader uniforms
    shaderManager.updateLightingUniforms();

    // Get the normalized light direction from lighting system
    const expectedDirection = lightingSystem.getLightDirection();

    // Verify all shader materials have the updated light direction
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial) {
        const material = object.material;

        // Check if material has lightDirection uniform
        if (material.uniforms.lightDirection) {
          const uniformDirection = material.uniforms.lightDirection.value as THREE.Vector3;

          // Verify the direction matches (with floating point tolerance)
          expect(uniformDirection.x).toBeCloseTo(expectedDirection.x, 5);
          expect(uniformDirection.y).toBeCloseTo(expectedDirection.y, 5);
          expect(uniformDirection.z).toBeCloseTo(expectedDirection.z, 5);
        }
      }
    });
  });

  /**
   * Property Test: Light Color Propagation
   *
   * For any valid RGB color values, updating the light color should
   * propagate to all shader uniforms that use lighting.
   */
  test.prop([
    // Generate valid RGB color values in range [0, 1]
    fc.record({
      r: fc.float({ min: 0, max: 1, noNaN: true }),
      g: fc.float({ min: 0, max: 1, noNaN: true }),
      b: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
  ])('should propagate light color to all shader uniforms', (lightColor) => {
    // Update lighting system with new light color
    const color = new THREE.Color(lightColor.r, lightColor.g, lightColor.b);
    lightingSystem.updateConfig({
      directionalLightColor: color,
    });

    // Update shader uniforms
    shaderManager.updateLightingUniforms();

    // Verify all shader materials have the updated light color
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial) {
        const material = object.material;

        // Check if material has lightColor uniform
        if (material.uniforms.lightColor) {
          const uniformColor = material.uniforms.lightColor.value as THREE.Color;

          // Verify the color matches (with floating point tolerance)
          expect(uniformColor.r).toBeCloseTo(lightColor.r, 5);
          expect(uniformColor.g).toBeCloseTo(lightColor.g, 5);
          expect(uniformColor.b).toBeCloseTo(lightColor.b, 5);
        }
      }
    });
  });

  /**
   * Property Test: Ambient Color Propagation
   *
   * For any valid RGB color values, updating the ambient color should
   * propagate to shader uniforms that use ambient lighting (skin and hair).
   */
  test.prop([
    // Generate valid RGB color values in range [0, 1]
    fc.record({
      r: fc.float({ min: 0, max: 1, noNaN: true }),
      g: fc.float({ min: 0, max: 1, noNaN: true }),
      b: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
  ])('should propagate ambient color to shader uniforms', (ambientColor) => {
    // Update lighting system with new ambient color
    const color = new THREE.Color(ambientColor.r, ambientColor.g, ambientColor.b);
    lightingSystem.updateConfig({
      ambientLightColor: color,
    });

    // Update shader uniforms
    shaderManager.updateLightingUniforms();

    // Verify shader materials have the updated ambient color
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial) {
        const material = object.material;

        // Check if material has ambientColor uniform (skin and hair have this)
        if (material.uniforms.ambientColor) {
          const uniformColor = material.uniforms.ambientColor.value as THREE.Color;

          // Verify the color matches (with floating point tolerance)
          expect(uniformColor.r).toBeCloseTo(ambientColor.r, 5);
          expect(uniformColor.g).toBeCloseTo(ambientColor.g, 5);
          expect(uniformColor.b).toBeCloseTo(ambientColor.b, 5);
        }
      }
    });
  });

  /**
   * Property Test: Multiple Light Parameter Updates
   *
   * When updating multiple light parameters simultaneously, all parameters
   * should be propagated correctly without interfering with each other.
   */
  test.prop([
    // Generate light direction
    fc
      .record({
        x: fc.float({ min: -1, max: 1, noNaN: true }),
        y: fc.float({ min: -1, max: 1, noNaN: true }),
        z: fc.float({ min: -1, max: 1, noNaN: true }),
      })
      .filter(({ x, y, z }) => {
        const length = Math.sqrt(x * x + y * y + z * z);
        return length > 0.01;
      })
      .map(({ x, y, z }) => {
        const length = Math.sqrt(x * x + y * y + z * z);
        return new THREE.Vector3(x / length, y / length, z / length);
      }),
    // Generate light color
    fc.record({
      r: fc.float({ min: 0, max: 1, noNaN: true }),
      g: fc.float({ min: 0, max: 1, noNaN: true }),
      b: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
    // Generate ambient color
    fc.record({
      r: fc.float({ min: 0, max: 1, noNaN: true }),
      g: fc.float({ min: 0, max: 1, noNaN: true }),
      b: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
  ])(
    'should propagate multiple light parameters correctly',
    (lightDirection, lightColor, ambientColor) => {
      // Update lighting system with all parameters
      lightingSystem.updateConfig({
        directionalLightPosition: lightDirection.clone().multiplyScalar(5),
        directionalLightColor: new THREE.Color(lightColor.r, lightColor.g, lightColor.b),
        ambientLightColor: new THREE.Color(ambientColor.r, ambientColor.g, ambientColor.b),
      });

      // Update shader uniforms
      shaderManager.updateLightingUniforms();

      const expectedDirection = lightingSystem.getLightDirection();

      // Verify all parameters were updated correctly
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial) {
          const material = object.material;

          // Check light direction
          if (material.uniforms.lightDirection) {
            const uniformDirection = material.uniforms.lightDirection.value as THREE.Vector3;
            expect(uniformDirection.x).toBeCloseTo(expectedDirection.x, 5);
            expect(uniformDirection.y).toBeCloseTo(expectedDirection.y, 5);
            expect(uniformDirection.z).toBeCloseTo(expectedDirection.z, 5);
          }

          // Check light color
          if (material.uniforms.lightColor) {
            const uniformColor = material.uniforms.lightColor.value as THREE.Color;
            expect(uniformColor.r).toBeCloseTo(lightColor.r, 5);
            expect(uniformColor.g).toBeCloseTo(lightColor.g, 5);
            expect(uniformColor.b).toBeCloseTo(lightColor.b, 5);
          }

          // Check ambient color
          if (material.uniforms.ambientColor) {
            const uniformColor = material.uniforms.ambientColor.value as THREE.Color;
            expect(uniformColor.r).toBeCloseTo(ambientColor.r, 5);
            expect(uniformColor.g).toBeCloseTo(ambientColor.g, 5);
            expect(uniformColor.b).toBeCloseTo(ambientColor.b, 5);
          }
        }
      });
    }
  );

  /**
   * Property Test: Light Intensity Updates
   *
   * For any valid light intensity value, updating the intensity should
   * be reflected in the lighting system.
   */
  test.prop([fc.float({ min: 0, max: 5, noNaN: true })])(
    'should update light intensity correctly',
    (intensity) => {
      // Update lighting system with new intensity
      lightingSystem.updateConfig({
        directionalLightIntensity: intensity,
      });

      // Verify the intensity was updated
      const directionalLight = lightingSystem.getDirectionalLight();
      expect(directionalLight.intensity).toBeCloseTo(intensity, 5);
    }
  );

  /**
   * Property Test: Idempotent Light Updates
   *
   * Updating the same light parameters multiple times should result in
   * the same final uniform values.
   */
  test.prop([
    fc
      .record({
        x: fc.float({ min: -1, max: 1, noNaN: true }),
        y: fc.float({ min: -1, max: 1, noNaN: true }),
        z: fc.float({ min: -1, max: 1, noNaN: true }),
      })
      .filter(({ x, y, z }) => {
        const length = Math.sqrt(x * x + y * y + z * z);
        return length > 0.01;
      })
      .map(({ x, y, z }) => {
        const length = Math.sqrt(x * x + y * y + z * z);
        return new THREE.Vector3(x / length, y / length, z / length);
      }),
    fc.integer({ min: 1, max: 5 }), // Number of times to update
  ])(
    'should produce consistent results when updating the same light direction multiple times',
    (lightDirection, updateCount) => {
      // Update the same light direction multiple times
      for (let i = 0; i < updateCount; i++) {
        lightingSystem.updateConfig({
          directionalLightPosition: lightDirection.clone().multiplyScalar(5),
        });
        shaderManager.updateLightingUniforms();
      }

      const expectedDirection = lightingSystem.getLightDirection();

      // Verify the final values match the input
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial) {
          const material = object.material;

          if (material.uniforms.lightDirection) {
            const uniformDirection = material.uniforms.lightDirection.value as THREE.Vector3;
            expect(uniformDirection.x).toBeCloseTo(expectedDirection.x, 5);
            expect(uniformDirection.y).toBeCloseTo(expectedDirection.y, 5);
            expect(uniformDirection.z).toBeCloseTo(expectedDirection.z, 5);
          }
        }
      });
    }
  );

  /**
   * Property Test: Boundary Light Directions
   *
   * Test that extreme but valid light direction values are handled correctly.
   */
  test.prop([
    fc.constantFrom(
      new THREE.Vector3(1, 0, 0), // Right
      new THREE.Vector3(-1, 0, 0), // Left
      new THREE.Vector3(0, 1, 0), // Up
      new THREE.Vector3(0, -1, 0), // Down
      new THREE.Vector3(0, 0, 1), // Forward
      new THREE.Vector3(0, 0, -1), // Backward
      new THREE.Vector3(1, 1, 1).normalize(), // Diagonal
      new THREE.Vector3(-1, -1, -1).normalize() // Opposite diagonal
    ),
  ])('should handle boundary light direction values correctly', (lightDirection) => {
    // Update lighting system with boundary value
    lightingSystem.updateConfig({
      directionalLightPosition: lightDirection.clone().multiplyScalar(5),
    });

    // Update shader uniforms
    shaderManager.updateLightingUniforms();

    const expectedDirection = lightingSystem.getLightDirection();

    // Verify all shader materials have the updated light direction
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial) {
        const material = object.material;

        if (material.uniforms.lightDirection) {
          const uniformDirection = material.uniforms.lightDirection.value as THREE.Vector3;
          expect(uniformDirection.x).toBeCloseTo(expectedDirection.x, 5);
          expect(uniformDirection.y).toBeCloseTo(expectedDirection.y, 5);
          expect(uniformDirection.z).toBeCloseTo(expectedDirection.z, 5);
        }
      }
    });
  });

  /**
   * Property Test: All Shader Types Receive Updates
   *
   * Verify that skin, eye, and hair shaders all receive light parameter updates.
   */
  test.prop([
    fc
      .record({
        x: fc.float({ min: -1, max: 1, noNaN: true }),
        y: fc.float({ min: -1, max: 1, noNaN: true }),
        z: fc.float({ min: -1, max: 1, noNaN: true }),
      })
      .filter(({ x, y, z }) => {
        const length = Math.sqrt(x * x + y * y + z * z);
        return length > 0.01;
      })
      .map(({ x, y, z }) => {
        const length = Math.sqrt(x * x + y * y + z * z);
        return new THREE.Vector3(x / length, y / length, z / length);
      }),
  ])('should update light direction for all shader types (skin, eyes, hair)', (lightDirection) => {
    // Update lighting system
    lightingSystem.updateConfig({
      directionalLightPosition: lightDirection.clone().multiplyScalar(5),
    });
    shaderManager.updateLightingUniforms();

    const expectedDirection = lightingSystem.getLightDirection();

    // Track which shader types received updates
    const updatedShaderTypes = new Set<string>();

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.ShaderMaterial) {
        const material = object.material;
        const meshName = object.name.toLowerCase();

        if (material.uniforms.lightDirection) {
          const uniformDirection = material.uniforms.lightDirection.value as THREE.Vector3;

          // Verify the direction matches
          expect(uniformDirection.x).toBeCloseTo(expectedDirection.x, 5);
          expect(uniformDirection.y).toBeCloseTo(expectedDirection.y, 5);
          expect(uniformDirection.z).toBeCloseTo(expectedDirection.z, 5);

          // Track which type of shader was updated
          if (meshName.includes('skin')) {
            updatedShaderTypes.add('skin');
          } else if (meshName.includes('eye')) {
            updatedShaderTypes.add('eyes');
          } else if (meshName.includes('hair')) {
            updatedShaderTypes.add('hair');
          }
        }
      }
    });

    // Verify all three shader types received updates
    expect(updatedShaderTypes.has('skin')).toBe(true);
    expect(updatedShaderTypes.has('eyes')).toBe(true);
    expect(updatedShaderTypes.has('hair')).toBe(true);
  });
});

/**
 * Helper: Create Mock WebGL Context
 *
 * Creates a mock WebGL 2.0 context for testing.
 */
function createMockWebGLContext(): any {
  // Set up global WebGL2RenderingContext if not defined
  const MockWebGL2RenderingContext = function () {};
  if (typeof global.WebGL2RenderingContext === 'undefined') {
    (global as any).WebGL2RenderingContext = MockWebGL2RenderingContext;
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
