/**
 * Property-Based Test: Shader Parameter Configuration (Hair Color)
 *
 * **Validates: Requirements 3.2, 8.2**
 *
 * Property 2: Shader Parameter Configuration
 * For any valid shader parameter (hair color), updating the configuration should
 * result in the corresponding shader uniform being updated to the specified value.
 */

import { describe, expect, beforeEach } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import * as THREE from 'three';
import { createHairShader, updateHairShaderUniforms } from '../HairShader';
import type { WebGLCapabilities } from '../types';

describe('Property 2: Shader Parameter Configuration (Hair Color)', () => {
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
   * Property Test: Hair Color Configuration at Creation
   *
   * For any valid RGB color values, creating a hair shader with a specific
   * hair color should result in the shader uniform containing that exact color.
   */
  test.prop([
    // Generate valid RGB color values in range [0, 1]
    fc.record({
      r: fc.float({ min: 0, max: 1, noNaN: true }),
      g: fc.float({ min: 0, max: 1, noNaN: true }),
      b: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
  ])('should set hair color uniform to specified value at creation', (hairColor) => {
    // Create hair shader with specified hair color
    const material = createHairShader(mockCapabilities, 'medium', {
      hairColor,
    });

    // Verify the uniform exists
    expect(material.uniforms.hairColor).toBeDefined();
    expect(material.uniforms.hairColor.value).toBeInstanceOf(THREE.Color);

    // Verify the color values match (with floating point tolerance)
    const uniformColor = material.uniforms.hairColor.value as THREE.Color;
    expect(uniformColor.r).toBeCloseTo(hairColor.r, 5);
    expect(uniformColor.g).toBeCloseTo(hairColor.g, 5);
    expect(uniformColor.b).toBeCloseTo(hairColor.b, 5);
  });

  /**
   * Property Test: Hair Color Runtime Update
   *
   * For any valid RGB color values, updating the hair color at runtime
   * should result in the shader uniform being updated to the new value.
   */
  test.prop([
    // Generate initial and updated hair color colors
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
    'should update hair color uniform when configuration is updated',
    (initialHairColor, updatedHairColor) => {
      // Create hair shader with initial hair color
      const material = createHairShader(mockCapabilities, 'medium', {
        hairColor: initialHairColor,
      });

      // Verify initial values
      let uniformColor = material.uniforms.hairColor.value as THREE.Color;
      expect(uniformColor.r).toBeCloseTo(initialHairColor.r, 5);
      expect(uniformColor.g).toBeCloseTo(initialHairColor.g, 5);
      expect(uniformColor.b).toBeCloseTo(initialHairColor.b, 5);

      // Update hair color
      updateHairShaderUniforms(material, {
        hairColor: updatedHairColor,
      });

      // Verify updated values
      uniformColor = material.uniforms.hairColor.value as THREE.Color;
      expect(uniformColor.r).toBeCloseTo(updatedHairColor.r, 5);
      expect(uniformColor.g).toBeCloseTo(updatedHairColor.g, 5);
      expect(uniformColor.b).toBeCloseTo(updatedHairColor.b, 5);
    }
  );

  /**
   * Property Test: Hair Color Across Quality Levels
   *
   * For any valid hair color and quality level, the hair color uniform
   * should be set correctly regardless of quality preset.
   */
  test.prop([
    fc.constantFrom('low', 'medium', 'high'),
    fc.record({
      r: fc.float({ min: 0, max: 1, noNaN: true }),
      g: fc.float({ min: 0, max: 1, noNaN: true }),
      b: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
  ])('should preserve hair color configuration across all quality levels', (quality, hairColor) => {
    // Create hair shader with specified quality and hair color
    const material = createHairShader(mockCapabilities, quality as 'low' | 'medium' | 'high', {
      hairColor,
    });

    // Verify the uniform is set correctly
    const uniformColor = material.uniforms.hairColor.value as THREE.Color;
    expect(uniformColor.r).toBeCloseTo(hairColor.r, 5);
    expect(uniformColor.g).toBeCloseTo(hairColor.g, 5);
    expect(uniformColor.b).toBeCloseTo(hairColor.b, 5);

    // Verify quality-specific define is present
    const qualityDefine = `QUALITY_${quality.toUpperCase()}`;
    expect(material.fragmentShader).toContain(qualityDefine);
  });

  /**
   * Property Test: Multiple Parameter Updates
   *
   * When updating multiple parameters including hair color, all parameters
   * should be updated correctly without interfering with each other.
   */
  test.prop([
    fc.record({
      r: fc.float({ min: 0, max: 1, noNaN: true }),
      g: fc.float({ min: 0, max: 1, noNaN: true }),
      b: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
    fc.float({ min: -1, max: 1, noNaN: true }), // shiftTangent
    fc.float({ min: 0, max: 1, noNaN: true }), // primarySpecular
  ])(
    'should update hair color along with other parameters correctly',
    (hairColor, shiftTangent, primarySpecular) => {
      // Create hair shader with default values
      const material = createHairShader(mockCapabilities, 'medium');

      // Update multiple parameters including hair color
      updateHairShaderUniforms(material, {
        hairColor,
        shiftTangent,
        primarySpecular,
      });

      // Verify hair color was updated
      const uniformColor = material.uniforms.hairColor.value as THREE.Color;
      expect(uniformColor.r).toBeCloseTo(hairColor.r, 5);
      expect(uniformColor.g).toBeCloseTo(hairColor.g, 5);
      expect(uniformColor.b).toBeCloseTo(hairColor.b, 5);

      // Verify other parameters were also updated
      expect(material.uniforms.shiftTangent.value).toBeCloseTo(shiftTangent, 5);
      expect(material.uniforms.primarySpecular.value).toBeCloseTo(primarySpecular, 5);
    }
  );

  /**
   * Property Test: Boundary Values
   *
   * Test that extreme but valid color values (0 and 1) are handled correctly.
   */
  test.prop([
    fc.constantFrom(
      { r: 0, g: 0, b: 0 }, // Black hair
      { r: 1, g: 1, b: 1 }, // White/platinum hair
      { r: 0.3, g: 0.2, b: 0.1 }, // Brown (default)
      { r: 0.9, g: 0.8, b: 0.3 }, // Blonde
      { r: 0.1, g: 0.05, b: 0.05 }, // Very dark brown/black
      { r: 0.6, g: 0.2, b: 0.1 } // Red/auburn
    ),
  ])('should handle boundary and common hair color values correctly', (hairColor) => {
    // Create hair shader with boundary value
    const material = createHairShader(mockCapabilities, 'medium', {
      hairColor,
    });

    // Verify the uniform is set correctly
    const uniformColor = material.uniforms.hairColor.value as THREE.Color;
    expect(uniformColor.r).toBeCloseTo(hairColor.r, 5);
    expect(uniformColor.g).toBeCloseTo(hairColor.g, 5);
    expect(uniformColor.b).toBeCloseTo(hairColor.b, 5);
  });

  /**
   * Property Test: Idempotent Updates
   *
   * Updating the same hair color value multiple times should result in
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
    (hairColor, updateCount) => {
      // Create hair shader
      const material = createHairShader(mockCapabilities, 'medium');

      // Update the same hair color multiple times
      for (let i = 0; i < updateCount; i++) {
        updateHairShaderUniforms(material, { hairColor });
      }

      // Verify the final value matches the input
      const uniformColor = material.uniforms.hairColor.value as THREE.Color;
      expect(uniformColor.r).toBeCloseTo(hairColor.r, 5);
      expect(uniformColor.g).toBeCloseTo(hairColor.g, 5);
      expect(uniformColor.b).toBeCloseTo(hairColor.b, 5);
    }
  );

  /**
   * Property Test: Default Hair Color
   *
   * When no hair color is specified, the shader should use the default
   * hair color value (brown hair: 0.3, 0.2, 0.1).
   */
  test.prop([fc.constantFrom('low', 'medium', 'high')])(
    'should use default hair color when none is specified',
    (quality) => {
      // Create hair shader without specifying hair color
      const material = createHairShader(mockCapabilities, quality as 'low' | 'medium' | 'high');

      // Verify default hair color is used (brown hair)
      const uniformColor = material.uniforms.hairColor.value as THREE.Color;
      expect(uniformColor.r).toBeCloseTo(0.3, 5);
      expect(uniformColor.g).toBeCloseTo(0.2, 5);
      expect(uniformColor.b).toBeCloseTo(0.1, 5);
    }
  );
});
