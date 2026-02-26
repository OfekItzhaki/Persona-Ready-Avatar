/**
 * SkinShader Unit Tests
 *
 * Tests for the SkinShader TypeScript wrapper functionality.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createSkinShader, updateSkinShaderUniforms } from '../SkinShader';
import type { WebGLCapabilities } from '../types';

describe('SkinShader', () => {
  // Mock WebGL capabilities
  const mockCapabilities: WebGLCapabilities = {
    version: 2,
    maxTextureSize: 4096,
    maxVertexUniforms: 256,
    supportsFloatTextures: true,
    supportsDerivatives: true,
  };

  describe('createSkinShader', () => {
    it('should create a ShaderMaterial with default configuration', () => {
      const material = createSkinShader(mockCapabilities, 'medium');

      expect(material).toBeInstanceOf(THREE.ShaderMaterial);
      expect(material.vertexShader).toBeTruthy();
      expect(material.fragmentShader).toBeTruthy();
      expect(material.uniforms).toBeDefined();
    });

    it('should set up uniforms with default values', () => {
      const material = createSkinShader(mockCapabilities, 'medium');
      const uniforms = material.uniforms;

      // Check that key uniforms exist
      expect(uniforms.skinTone).toBeDefined();
      expect(uniforms.sssColor).toBeDefined();
      expect(uniforms.sssIntensity).toBeDefined();
      expect(uniforms.lightDirection).toBeDefined();
      expect(uniforms.lightColor).toBeDefined();
      expect(uniforms.ambientColor).toBeDefined();

      // Check default values
      expect(uniforms.skinTone.value).toBeInstanceOf(THREE.Color);
      expect(uniforms.sssIntensity.value).toBe(0.5);
      expect(uniforms.lightDirection.value).toBeInstanceOf(THREE.Vector3);
    });

    it('should apply custom skin tone configuration', () => {
      const customSkinTone = { r: 0.8, g: 0.6, b: 0.5 };
      const material = createSkinShader(mockCapabilities, 'medium', {
        skinTone: customSkinTone,
      });

      const skinToneColor = material.uniforms.skinTone.value as THREE.Color;
      expect(skinToneColor.r).toBeCloseTo(0.8, 2);
      expect(skinToneColor.g).toBeCloseTo(0.6, 2);
      expect(skinToneColor.b).toBeCloseTo(0.5, 2);
    });

    it('should apply custom SSS parameters', () => {
      const material = createSkinShader(mockCapabilities, 'medium', {
        sssIntensity: 0.8,
        sssScale: 1.5,
      });

      expect(material.uniforms.sssIntensity.value).toBe(0.8);
      expect(material.uniforms.sssScale.value).toBe(1.5);
    });

    it('should set quality-specific defines for low quality', () => {
      const material = createSkinShader(mockCapabilities, 'low');

      expect(material.fragmentShader).toContain('QUALITY_LOW');
    });

    it('should set quality-specific defines for medium quality', () => {
      const material = createSkinShader(mockCapabilities, 'medium');

      expect(material.fragmentShader).toContain('QUALITY_MEDIUM');
    });

    it('should set quality-specific defines for high quality', () => {
      const material = createSkinShader(mockCapabilities, 'high');

      expect(material.fragmentShader).toContain('QUALITY_HIGH');
    });

    it('should enable USE_MAP define when texture is provided', () => {
      const texture = new THREE.Texture();
      const material = createSkinShader(mockCapabilities, 'medium', {
        map: texture,
      });

      expect(material.defines?.USE_MAP).toBe(true);
      expect(material.uniforms.map.value).toBe(texture);
    });

    it('should enable USE_NORMALMAP define when normal map is provided', () => {
      const normalMap = new THREE.Texture();
      const material = createSkinShader(mockCapabilities, 'medium', {
        normalMap,
      });

      expect(material.defines?.USE_NORMALMAP).toBe(true);
      expect(material.uniforms.normalMap.value).toBe(normalMap);
    });

    it('should enable morph target defines when morphTargets is true', () => {
      const material = createSkinShader(mockCapabilities, 'medium', {
        morphTargets: true,
      });

      expect(material.defines?.USE_MORPHTARGETS).toBe(true);
    });

    it('should enable morph normal defines when morphNormals is true', () => {
      const material = createSkinShader(mockCapabilities, 'medium', {
        morphTargets: true,
        morphNormals: true,
      });

      expect(material.defines?.USE_MORPHTARGETS).toBe(true);
      expect(material.defines?.USE_MORPHNORMALS).toBe(true);
    });
  });

  describe('updateSkinShaderUniforms', () => {
    it('should update skin tone at runtime', () => {
      const material = createSkinShader(mockCapabilities, 'medium');
      const newSkinTone = { r: 0.7, g: 0.5, b: 0.4 };

      updateSkinShaderUniforms(material, { skinTone: newSkinTone });

      const skinToneColor = material.uniforms.skinTone.value as THREE.Color;
      expect(skinToneColor.r).toBeCloseTo(0.7, 2);
      expect(skinToneColor.g).toBeCloseTo(0.5, 2);
      expect(skinToneColor.b).toBeCloseTo(0.4, 2);
    });

    it('should update SSS parameters at runtime', () => {
      const material = createSkinShader(mockCapabilities, 'medium');

      updateSkinShaderUniforms(material, {
        sssIntensity: 0.9,
        sssScale: 2.0,
      });

      expect(material.uniforms.sssIntensity.value).toBe(0.9);
      expect(material.uniforms.sssScale.value).toBe(2.0);
    });

    it('should update light direction at runtime', () => {
      const material = createSkinShader(mockCapabilities, 'medium');
      const newLightDir = new THREE.Vector3(0, 1, 0);

      updateSkinShaderUniforms(material, { lightDirection: newLightDir });

      const lightDir = material.uniforms.lightDirection.value as THREE.Vector3;
      expect(lightDir.y).toBeCloseTo(1.0, 2);
      expect(lightDir.length()).toBeCloseTo(1.0, 2); // Should be normalized
    });

    it('should update light color at runtime', () => {
      const material = createSkinShader(mockCapabilities, 'medium');
      const newLightColor = { r: 1.0, g: 0.8, b: 0.6 };

      updateSkinShaderUniforms(material, { lightColor: newLightColor });

      const lightColor = material.uniforms.lightColor.value as THREE.Color;
      expect(lightColor.r).toBeCloseTo(1.0, 2);
      expect(lightColor.g).toBeCloseTo(0.8, 2);
      expect(lightColor.b).toBeCloseTo(0.6, 2);
    });

    it('should update specular parameters at runtime', () => {
      const material = createSkinShader(mockCapabilities, 'medium');

      updateSkinShaderUniforms(material, {
        specularIntensity: 0.7,
        specularPower: 64.0,
      });

      expect(material.uniforms.specularIntensity.value).toBe(0.7);
      expect(material.uniforms.specularPower.value).toBe(64.0);
    });

    it('should add texture and update defines when texture is added', () => {
      const material = createSkinShader(mockCapabilities, 'medium');
      const texture = new THREE.Texture();

      updateSkinShaderUniforms(material, { map: texture });

      expect(material.uniforms.map.value).toBe(texture);
      expect(material.defines?.USE_MAP).toBe(true);
    });

    it('should remove texture and update defines when texture is removed', () => {
      const texture = new THREE.Texture();
      const material = createSkinShader(mockCapabilities, 'medium', { map: texture });

      updateSkinShaderUniforms(material, { map: null });

      expect(material.uniforms.map.value).toBe(null);
      expect(material.defines?.USE_MAP).toBeUndefined();
    });
  });
});
