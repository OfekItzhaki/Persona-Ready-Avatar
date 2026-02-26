/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
/**
 * Property-Based Test: Shadow Map Configuration
 *
 * **Validates: Requirements 4.2**
 *
 * Property 4: Shadow Map Configuration
 * For any valid shadow map resolution (512, 1024, 2048), setting the resolution
 * should update the shadow map size for all shadow-casting lights.
 */

import { describe, expect, beforeEach, vi } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import * as THREE from 'three';
import { ShaderManager } from '../ShaderManager';
import { LightingSystem } from '../LightingSystem';

describe('Property 4: Shadow Map Configuration', () => {
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

    // Create a test scene
    scene = new THREE.Scene();

    // Create lighting system
    lightingSystem = new LightingSystem();
    shaderManager.setLightingSystem(lightingSystem);
  });

  /**
   * Property Test: Shadow Map Size Configuration
   *
   * For any valid shadow map resolution (512, 1024, 2048), setting the resolution
   * should update the shadow map size for the directional light.
   */
  test.prop([fc.constantFrom(512, 1024, 2048)])(
    'should update shadow map size to specified resolution',
    (shadowMapSize) => {
      // Update lighting system with new shadow map size
      lightingSystem.updateConfig({
        shadowMapSize,
      });

      // Get the directional light
      const directionalLight = lightingSystem.getDirectionalLight();

      // Verify the shadow map size was updated
      expect(directionalLight.shadow.mapSize.width).toBe(shadowMapSize);
      expect(directionalLight.shadow.mapSize.height).toBe(shadowMapSize);
    }
  );

  /**
   * Property Test: Shadow Map Size at Initialization
   *
   * For any valid shadow map resolution, creating a lighting system with
   * that resolution should initialize the shadow map with the correct size.
   */
  test.prop([fc.constantFrom(512, 1024, 2048)])(
    'should initialize shadow map with specified resolution',
    (shadowMapSize) => {
      // Create a new lighting system with specified shadow map size
      const newLightingSystem = new LightingSystem({
        shadowMapSize,
      });

      // Get the directional light
      const directionalLight = newLightingSystem.getDirectionalLight();

      // Verify the shadow map size was set correctly
      expect(directionalLight.shadow.mapSize.width).toBe(shadowMapSize);
      expect(directionalLight.shadow.mapSize.height).toBe(shadowMapSize);
    }
  );

  /**
   * Property Test: Shadow Map Size Updates via ShaderManager
   *
   * For any valid shadow map resolution, updating the shader configuration
   * should propagate to the lighting system's shadow map size.
   */
  test.prop([fc.constantFrom(512, 1024, 2048)])(
    'should update shadow map size through shader manager configuration',
    (shadowMapSize) => {
      // Update shader manager configuration with new shadow map size
      shaderManager.updateConfig({
        shadowMapSize,
      });

      // Get the directional light from lighting system
      const directionalLight = lightingSystem.getDirectionalLight();

      // Verify the shadow map size was updated
      expect(directionalLight.shadow.mapSize.width).toBe(shadowMapSize);
      expect(directionalLight.shadow.mapSize.height).toBe(shadowMapSize);
    }
  );

  /**
   * Property Test: Shadow Map Size Across Quality Presets
   *
   * For each quality preset (low, medium, high), the shadow map size
   * should match the expected resolution for that quality level.
   */
  test.prop([
    fc.constantFrom(
      { quality: 'low' as const, expectedSize: 512 },
      { quality: 'medium' as const, expectedSize: 1024 },
      { quality: 'high' as const, expectedSize: 2048 }
    ),
  ])('should set correct shadow map size for quality preset', ({ quality, expectedSize }) => {
    // Set quality preset
    shaderManager.setQuality(quality);

    // Get the directional light
    const directionalLight = lightingSystem.getDirectionalLight();

    // Verify the shadow map size matches the quality preset
    expect(directionalLight.shadow.mapSize.width).toBe(expectedSize);
    expect(directionalLight.shadow.mapSize.height).toBe(expectedSize);
  });

  /**
   * Property Test: Multiple Shadow Map Size Updates
   *
   * Updating the shadow map size multiple times should result in the
   * final size matching the last update.
   */
  test.prop([fc.array(fc.constantFrom(512, 1024, 2048), { minLength: 2, maxLength: 5 })])(
    'should apply the last shadow map size when updated multiple times',
    (shadowMapSizes) => {
      // Apply multiple shadow map size updates
      for (const size of shadowMapSizes) {
        lightingSystem.updateConfig({
          shadowMapSize: size,
        });
      }

      // Get the directional light
      const directionalLight = lightingSystem.getDirectionalLight();

      // Verify the final shadow map size matches the last update
      const lastSize = shadowMapSizes[shadowMapSizes.length - 1];
      expect(directionalLight.shadow.mapSize.width).toBe(lastSize);
      expect(directionalLight.shadow.mapSize.height).toBe(lastSize);
    }
  );

  /**
   * Property Test: Shadow Casting Enabled with Shadow Map Configuration
   *
   * For any valid shadow map resolution, when shadows are enabled,
   * the directional light should have castShadow set to true.
   */
  test.prop([fc.constantFrom(512, 1024, 2048)])(
    'should enable shadow casting when configuring shadow map size',
    (shadowMapSize) => {
      // Create lighting system with shadows enabled and specified shadow map size
      const newLightingSystem = new LightingSystem({
        enableShadows: true,
        shadowMapSize,
      });

      // Get the directional light
      const directionalLight = newLightingSystem.getDirectionalLight();

      // Verify shadows are enabled
      expect(directionalLight.castShadow).toBe(true);

      // Verify shadow map size is correct
      expect(directionalLight.shadow.mapSize.width).toBe(shadowMapSize);
      expect(directionalLight.shadow.mapSize.height).toBe(shadowMapSize);
    }
  );

  /**
   * Property Test: Shadow Map Configuration with Shadows Disabled
   *
   * When shadows are disabled, the shadow map size should still be configurable
   * (for when shadows are re-enabled later).
   */
  test.prop([fc.constantFrom(512, 1024, 2048)])(
    'should configure shadow map size even when shadows are disabled',
    (shadowMapSize) => {
      // Create lighting system with shadows disabled but shadow map size specified
      const newLightingSystem = new LightingSystem({
        enableShadows: false,
        shadowMapSize,
      });

      // Get the directional light
      const directionalLight = newLightingSystem.getDirectionalLight();

      // Verify shadows are disabled
      expect(directionalLight.castShadow).toBe(false);

      // Verify shadow map size is still configured
      expect(directionalLight.shadow.mapSize.width).toBe(shadowMapSize);
      expect(directionalLight.shadow.mapSize.height).toBe(shadowMapSize);
    }
  );

  /**
   * Property Test: Idempotent Shadow Map Size Updates
   *
   * Updating the same shadow map size multiple times should result in
   * the same final configuration.
   */
  test.prop([
    fc.constantFrom(512, 1024, 2048),
    fc.integer({ min: 1, max: 5 }), // Number of times to update
  ])(
    'should produce consistent results when updating the same shadow map size multiple times',
    (shadowMapSize, updateCount) => {
      // Update the same shadow map size multiple times
      for (let i = 0; i < updateCount; i++) {
        lightingSystem.updateConfig({
          shadowMapSize,
        });
      }

      // Get the directional light
      const directionalLight = lightingSystem.getDirectionalLight();

      // Verify the shadow map size matches the input
      expect(directionalLight.shadow.mapSize.width).toBe(shadowMapSize);
      expect(directionalLight.shadow.mapSize.height).toBe(shadowMapSize);
    }
  );

  /**
   * Property Test: Shadow Map Size Independence from Other Parameters
   *
   * Updating shadow map size should not affect other lighting parameters
   * like light intensity, color, or position.
   */
  test.prop([
    fc.constantFrom(512, 1024, 2048),
    fc.float({ min: 0, max: 5, noNaN: true }), // intensity
    fc.record({
      r: fc.float({ min: 0, max: 1, noNaN: true }),
      g: fc.float({ min: 0, max: 1, noNaN: true }),
      b: fc.float({ min: 0, max: 1, noNaN: true }),
    }), // color
  ])(
    'should not affect other lighting parameters when updating shadow map size',
    (shadowMapSize, intensity, color) => {
      // Set initial lighting parameters
      const lightColor = new THREE.Color(color.r, color.g, color.b);
      lightingSystem.updateConfig({
        directionalLightIntensity: intensity,
        directionalLightColor: lightColor,
      });

      // Store initial values
      const directionalLight = lightingSystem.getDirectionalLight();
      const initialIntensity = directionalLight.intensity;
      const initialColor = directionalLight.color.clone();

      // Update shadow map size
      lightingSystem.updateConfig({
        shadowMapSize,
      });

      // Verify shadow map size was updated
      expect(directionalLight.shadow.mapSize.width).toBe(shadowMapSize);
      expect(directionalLight.shadow.mapSize.height).toBe(shadowMapSize);

      // Verify other parameters were not affected
      expect(directionalLight.intensity).toBeCloseTo(initialIntensity, 5);
      expect(directionalLight.color.r).toBeCloseTo(initialColor.r, 5);
      expect(directionalLight.color.g).toBeCloseTo(initialColor.g, 5);
      expect(directionalLight.color.b).toBeCloseTo(initialColor.b, 5);
    }
  );

  /**
   * Property Test: Shadow Camera Configuration Preserved
   *
   * When updating shadow map size, the shadow camera configuration
   * (near, far, frustum bounds) should remain consistent.
   */
  test.prop([fc.constantFrom(512, 1024, 2048)])(
    'should preserve shadow camera configuration when updating shadow map size',
    (shadowMapSize) => {
      // Update shadow map size
      lightingSystem.updateConfig({
        shadowMapSize,
      });

      // Get the directional light
      const directionalLight = lightingSystem.getDirectionalLight();

      // Verify shadow camera configuration is set correctly
      expect(directionalLight.shadow.camera.near).toBe(0.5);
      expect(directionalLight.shadow.camera.far).toBe(50);
      expect(directionalLight.shadow.camera.left).toBe(-10);
      expect(directionalLight.shadow.camera.right).toBe(10);
      expect(directionalLight.shadow.camera.top).toBe(10);
      expect(directionalLight.shadow.camera.bottom).toBe(-10);

      // Verify shadow map size
      expect(directionalLight.shadow.mapSize.width).toBe(shadowMapSize);
      expect(directionalLight.shadow.mapSize.height).toBe(shadowMapSize);
    }
  );
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
