/**
 * Property-Based Test: Shader Parameter Configuration (Iris Color)
 *
 * **Validates: Requirements 2.3, 8.2**
 *
 * Property 2: Shader Parameter Configuration
 * For any valid shader parameter (iris color), updating the configuration should
 * result in the corresponding shader uniform being updated to the specified value.
 */

import { describe, expect, beforeEach } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import * as THREE from 'three';
import { createEyeShader, updateEyeShaderUniforms } from '../EyeShader';
import type { WebGLCapabilities } from '../types';

describe('Property 2: Shader Parameter Configuration (Iris Color)', () => {
  let mockCapabilities: WebGLCapabilities;

  beforeEach(() => {
    mockCapabilities = {
      version: 2,
      maxTextureSize: 4096,
      maxVertexUniforms: 256,
      supportsFloatTextures: true,
      supportsDerivatives: true,
    };
  });

  /**
   * Property Test: Iris Color Configuration at Creation
   *
   * For any valid RGB color values, creating an eye shader with a specific
   * iris color should result in the shader uniform containing that exact color.
   */
  test.prop([
    // Generate valid RGB color values in range [0, 1]
    fc.record({
      r: fc.float({ min: 0, max: 1, noNaN: true }),
      g: fc.float({ min: 0, max: 1, noNaN: true }),
      b: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
  ])('should set iris color uniform to specified value at creation', (irisColor) => {
    // Create eye shader with specified iris color
    const material = createEyeShader(mockCapabilities, 'medium', {
      irisColor,
    });

    // Verify the uniform exists
    expect(material.uniforms.irisColor).toBeDefined();
    expect(material.uniforms.irisColor.value).toBeInstanceOf(THREE.Color);

    // Verify the color values match (with floating point tolerance)
    const uniformColor = material.uniforms.irisColor.value as THREE.Color;
    expect(uniformColor.r).toBeCloseTo(irisColor.r, 5);
    expect(uniformColor.g).toBeCloseTo(irisColor.g, 5);
    expect(uniformColor.b).toBeCloseTo(irisColor.b, 5);
  });

  /**
   * Property Test: Iris Color Runtime Update
   *
   * For any valid RGB color values, updating the iris color at runtime
   * should result in the shader uniform being updated to the new value.
   */
  test.prop([
    // Generate initial and updated iris color colors
    fc.record({
      r: fc.float({ min: 0, max: 1, noNaN: true }),
      g: fc.float({ min: 0, max: 1, noNaN: true }),
      b: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
    fc.record({
      r: fc.float({ min: 0, max: 1, noNaN: true }),
      g: fc.float({ min: 0, max: 1, noNaN: true }),
      b: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
  ])(
    'should update iris color uniform when configuration is updated',
    (initialIrisColor, updatedIrisColor) => {
      // Create eye shader with initial iris color
      const material = createEyeShader(mockCapabilities, 'medium', {
        irisColor: initialIrisColor,
      });

      // Verify initial values
      let uniformColor = material.uniforms.irisColor.value as THREE.Color;
      expect(uniformColor.r).toBeCloseTo(initialIrisColor.r, 5);
      expect(uniformColor.g).toBeCloseTo(initialIrisColor.g, 5);
      expect(uniformColor.b).toBeCloseTo(initialIrisColor.b, 5);

      // Update iris color
      updateEyeShaderUniforms(material, {
        irisColor: updatedIrisColor,
      });

      // Verify updated values
      uniformColor = material.uniforms.irisColor.value as THREE.Color;
      expect(uniformColor.r).toBeCloseTo(updatedIrisColor.r, 5);
      expect(uniformColor.g).toBeCloseTo(updatedIrisColor.g, 5);
      expect(uniformColor.b).toBeCloseTo(updatedIrisColor.b, 5);
    }
  );

  /**
   * Property Test: Iris Color Across Quality Levels
   *
   * For any valid iris color and quality level, the iris color uniform
   * should be set correctly regardless of quality preset.
   */
  test.prop([
    fc.constantFrom('low', 'medium', 'high'),
    fc.record({
      r: fc.float({ min: 0, max: 1, noNaN: true }),
      g: fc.float({ min: 0, max: 1, noNaN: true }),
      b: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
  ])('should preserve iris color configuration across all quality levels', (quality, irisColor) => {
    // Create eye shader with specified quality and iris color
    const material = createEyeShader(mockCapabilities, quality as 'low' | 'medium' | 'high', {
      irisColor,
    });

    // Verify the uniform is set correctly
    const uniformColor = material.uniforms.irisColor.value as THREE.Color;
    expect(uniformColor.r).toBeCloseTo(irisColor.r, 5);
    expect(uniformColor.g).toBeCloseTo(irisColor.g, 5);
    expect(uniformColor.b).toBeCloseTo(irisColor.b, 5);

    // Verify quality-specific define is present
    const qualityDefine = `QUALITY_${quality.toUpperCase()}`;
    expect(material.fragmentShader).toContain(qualityDefine);
  });

  /**
   * Property Test: Multiple Parameter Updates
   *
   * When updating multiple parameters including iris color, all parameters
   * should be updated correctly without interfering with each other.
   */
  test.prop([
    fc.record({
      r: fc.float({ min: 0, max: 1, noNaN: true }),
      g: fc.float({ min: 0, max: 1, noNaN: true }),
      b: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
    fc.float({ min: 0, max: 1, noNaN: true }), // pupilSize
    fc.float({ min: 0, max: 2, noNaN: true }), // specularIntensity
  ])(
    'should update iris color along with other parameters correctly',
    (irisColor, pupilSize, specularIntensity) => {
      // Create eye shader with default values
      const material = createEyeShader(mockCapabilities, 'medium');

      // Update multiple parameters including iris color
      updateEyeShaderUniforms(material, {
        irisColor,
        pupilSize,
        specularIntensity,
      });

      // Verify iris color was updated
      const uniformColor = material.uniforms.irisColor.value as THREE.Color;
      expect(uniformColor.r).toBeCloseTo(irisColor.r, 5);
      expect(uniformColor.g).toBeCloseTo(irisColor.g, 5);
      expect(uniformColor.b).toBeCloseTo(irisColor.b, 5);

      // Verify other parameters were also updated
      expect(material.uniforms.pupilSize.value).toBeCloseTo(pupilSize, 5);
      expect(material.uniforms.specularIntensity.value).toBeCloseTo(specularIntensity, 5);
    }
  );

  /**
   * Property Test: Boundary Values
   *
   * Test that extreme but valid color values (0 and 1) are handled correctly.
   */
  test.prop([
    fc.constantFrom(
      { r: 0, g: 0, b: 0 }, // Black (very dark iris)
      { r: 1, g: 1, b: 1 }, // White (albino)
      { r: 0.4, g: 0.6, b: 0.8 }, // Blue (default)
      { r: 0.3, g: 0.5, b: 0.3 }, // Green
      { r: 0.5, g: 0.3, b: 0.2 }, // Brown
      { r: 0.2, g: 0.2, b: 0.2 } // Dark gray (very dark eyes)
    ),
  ])('should handle boundary and common iris color values correctly', (irisColor) => {
    // Create eye shader with boundary value
    const material = createEyeShader(mockCapabilities, 'medium', {
      irisColor,
    });

    // Verify the uniform is set correctly
    const uniformColor = material.uniforms.irisColor.value as THREE.Color;
    expect(uniformColor.r).toBeCloseTo(irisColor.r, 5);
    expect(uniformColor.g).toBeCloseTo(irisColor.g, 5);
    expect(uniformColor.b).toBeCloseTo(irisColor.b, 5);
  });

  /**
   * Property Test: Idempotent Updates
   *
   * Updating the same iris color value multiple times should result in
   * the same final uniform value.
   */
  test.prop([
    fc.record({
      r: fc.float({ min: 0, max: 1, noNaN: true }),
      g: fc.float({ min: 0, max: 1, noNaN: true }),
      b: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
    fc.integer({ min: 1, max: 5 }), // Number of times to update
  ])(
    'should produce consistent results when updating the same value multiple times',
    (irisColor, updateCount) => {
      // Create eye shader
      const material = createEyeShader(mockCapabilities, 'medium');

      // Update the same iris color multiple times
      for (let i = 0; i < updateCount; i++) {
        updateEyeShaderUniforms(material, { irisColor });
      }

      // Verify the final value matches the input
      const uniformColor = material.uniforms.irisColor.value as THREE.Color;
      expect(uniformColor.r).toBeCloseTo(irisColor.r, 5);
      expect(uniformColor.g).toBeCloseTo(irisColor.g, 5);
      expect(uniformColor.b).toBeCloseTo(irisColor.b, 5);
    }
  );

  /**
   * Property Test: Default Iris Color
   *
   * When no iris color is specified, the shader should use the default
   * iris color value (blue eyes: 0.4, 0.6, 0.8).
   */
  test.prop([fc.constantFrom('low', 'medium', 'high')])(
    'should use default iris color when none is specified',
    (quality) => {
      // Create eye shader without specifying iris color
      const material = createEyeShader(mockCapabilities, quality as 'low' | 'medium' | 'high');

      // Verify default iris color is used (blue eyes)
      const uniformColor = material.uniforms.irisColor.value as THREE.Color;
      expect(uniformColor.r).toBeCloseTo(0.4, 5);
      expect(uniformColor.g).toBeCloseTo(0.6, 5);
      expect(uniformColor.b).toBeCloseTo(0.8, 5);
    }
  );
});
