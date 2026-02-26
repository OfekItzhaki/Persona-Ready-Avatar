/**
 * Property-Based Test: Shader Parameter Configuration (Skin Tone)
 *
 * **Validates: Requirements 1.4, 8.2**
 *
 * Property 2: Shader Parameter Configuration
 * For any valid shader parameter (skin tone), updating the configuration should
 * result in the corresponding shader uniform being updated to the specified value.
 */

import { describe, expect, beforeEach } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import * as THREE from 'three';
import { createSkinShader, updateSkinShaderUniforms } from '../SkinShader';
import type { WebGLCapabilities } from '../types';

describe('Property 2: Shader Parameter Configuration (Skin Tone)', () => {
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
   * Property Test: Skin Tone Configuration at Creation
   *
   * For any valid RGB color values, creating a skin shader with a specific
   * skin tone should result in the shader uniform containing that exact color.
   */
  test.prop([
    // Generate valid RGB color values in range [0, 1]
    fc.record({
      r: fc.float({ min: 0, max: 1, noNaN: true }),
      g: fc.float({ min: 0, max: 1, noNaN: true }),
      b: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
  ])('should set skin tone uniform to specified value at creation', (skinTone) => {
    // Create skin shader with specified skin tone
    const material = createSkinShader(mockCapabilities, 'medium', {
      skinTone,
    });

    // Verify the uniform exists
    expect(material.uniforms.skinTone).toBeDefined();
    expect(material.uniforms.skinTone.value).toBeInstanceOf(THREE.Color);

    // Verify the color values match (with floating point tolerance)
    const uniformColor = material.uniforms.skinTone.value as THREE.Color;
    expect(uniformColor.r).toBeCloseTo(skinTone.r, 5);
    expect(uniformColor.g).toBeCloseTo(skinTone.g, 5);
    expect(uniformColor.b).toBeCloseTo(skinTone.b, 5);
  });

  /**
   * Property Test: Skin Tone Runtime Update
   *
   * For any valid RGB color values, updating the skin tone at runtime
   * should result in the shader uniform being updated to the new value.
   */
  test.prop([
    // Generate initial and updated skin tone colors
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
    'should update skin tone uniform when configuration is updated',
    (initialSkinTone, updatedSkinTone) => {
      // Create skin shader with initial skin tone
      const material = createSkinShader(mockCapabilities, 'medium', {
        skinTone: initialSkinTone,
      });

      // Verify initial values
      let uniformColor = material.uniforms.skinTone.value as THREE.Color;
      expect(uniformColor.r).toBeCloseTo(initialSkinTone.r, 5);
      expect(uniformColor.g).toBeCloseTo(initialSkinTone.g, 5);
      expect(uniformColor.b).toBeCloseTo(initialSkinTone.b, 5);

      // Update skin tone
      updateSkinShaderUniforms(material, {
        skinTone: updatedSkinTone,
      });

      // Verify updated values
      uniformColor = material.uniforms.skinTone.value as THREE.Color;
      expect(uniformColor.r).toBeCloseTo(updatedSkinTone.r, 5);
      expect(uniformColor.g).toBeCloseTo(updatedSkinTone.g, 5);
      expect(uniformColor.b).toBeCloseTo(updatedSkinTone.b, 5);
    }
  );

  /**
   * Property Test: Skin Tone Across Quality Levels
   *
   * For any valid skin tone and quality level, the skin tone uniform
   * should be set correctly regardless of quality preset.
   */
  test.prop([
    fc.constantFrom('low', 'medium', 'high'),
    fc.record({
      r: fc.float({ min: 0, max: 1, noNaN: true }),
      g: fc.float({ min: 0, max: 1, noNaN: true }),
      b: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
  ])('should preserve skin tone configuration across all quality levels', (quality, skinTone) => {
    // Create skin shader with specified quality and skin tone
    const material = createSkinShader(mockCapabilities, quality as 'low' | 'medium' | 'high', {
      skinTone,
    });

    // Verify the uniform is set correctly
    const uniformColor = material.uniforms.skinTone.value as THREE.Color;
    expect(uniformColor.r).toBeCloseTo(skinTone.r, 5);
    expect(uniformColor.g).toBeCloseTo(skinTone.g, 5);
    expect(uniformColor.b).toBeCloseTo(skinTone.b, 5);

    // Verify quality-specific define is present
    const qualityDefine = `QUALITY_${quality.toUpperCase()}`;
    expect(material.fragmentShader).toContain(qualityDefine);
  });

  /**
   * Property Test: Multiple Parameter Updates
   *
   * When updating multiple parameters including skin tone, all parameters
   * should be updated correctly without interfering with each other.
   */
  test.prop([
    fc.record({
      r: fc.float({ min: 0, max: 1, noNaN: true }),
      g: fc.float({ min: 0, max: 1, noNaN: true }),
      b: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
    fc.float({ min: 0, max: 1, noNaN: true }), // sssIntensity
    fc.float({ min: Math.fround(0.1), max: Math.fround(2), noNaN: true }), // sssScale
  ])(
    'should update skin tone along with other parameters correctly',
    (skinTone, sssIntensity, sssScale) => {
      // Create skin shader with default values
      const material = createSkinShader(mockCapabilities, 'medium');

      // Update multiple parameters including skin tone
      updateSkinShaderUniforms(material, {
        skinTone,
        sssIntensity,
        sssScale,
      });

      // Verify skin tone was updated
      const uniformColor = material.uniforms.skinTone.value as THREE.Color;
      expect(uniformColor.r).toBeCloseTo(skinTone.r, 5);
      expect(uniformColor.g).toBeCloseTo(skinTone.g, 5);
      expect(uniformColor.b).toBeCloseTo(skinTone.b, 5);

      // Verify other parameters were also updated
      expect(material.uniforms.sssIntensity.value).toBeCloseTo(sssIntensity, 5);
      expect(material.uniforms.sssScale.value).toBeCloseTo(sssScale, 5);
    }
  );

  /**
   * Property Test: Boundary Values
   *
   * Test that extreme but valid color values (0 and 1) are handled correctly.
   */
  test.prop([
    fc.constantFrom(
      { r: 0, g: 0, b: 0 }, // Black
      { r: 1, g: 1, b: 1 }, // White
      { r: 1, g: 0, b: 0 }, // Red
      { r: 0, g: 1, b: 0 }, // Green
      { r: 0, g: 0, b: 1 }, // Blue
      { r: 0.5, g: 0.5, b: 0.5 } // Gray
    ),
  ])('should handle boundary and common color values correctly', (skinTone) => {
    // Create skin shader with boundary value
    const material = createSkinShader(mockCapabilities, 'medium', {
      skinTone,
    });

    // Verify the uniform is set correctly
    const uniformColor = material.uniforms.skinTone.value as THREE.Color;
    expect(uniformColor.r).toBeCloseTo(skinTone.r, 5);
    expect(uniformColor.g).toBeCloseTo(skinTone.g, 5);
    expect(uniformColor.b).toBeCloseTo(skinTone.b, 5);
  });

  /**
   * Property Test: Idempotent Updates
   *
   * Updating the same skin tone value multiple times should result in
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
    (skinTone, updateCount) => {
      // Create skin shader
      const material = createSkinShader(mockCapabilities, 'medium');

      // Update the same skin tone multiple times
      for (let i = 0; i < updateCount; i++) {
        updateSkinShaderUniforms(material, { skinTone });
      }

      // Verify the final value matches the input
      const uniformColor = material.uniforms.skinTone.value as THREE.Color;
      expect(uniformColor.r).toBeCloseTo(skinTone.r, 5);
      expect(uniformColor.g).toBeCloseTo(skinTone.g, 5);
      expect(uniformColor.b).toBeCloseTo(skinTone.b, 5);
    }
  );

  /**
   * Property Test: Default Skin Tone
   *
   * When no skin tone is specified, the shader should use the default
   * skin tone value (fair skin tone: 0.92, 0.78, 0.71).
   */
  test.prop([fc.constantFrom('low', 'medium', 'high')])(
    'should use default skin tone when none is specified',
    (quality) => {
      // Create skin shader without specifying skin tone
      const material = createSkinShader(mockCapabilities, quality as 'low' | 'medium' | 'high');

      // Verify default skin tone is used (fair skin tone)
      const uniformColor = material.uniforms.skinTone.value as THREE.Color;
      expect(uniformColor.r).toBeCloseTo(0.92, 5);
      expect(uniformColor.g).toBeCloseTo(0.78, 5);
      expect(uniformColor.b).toBeCloseTo(0.71, 5);
    }
  );
});
