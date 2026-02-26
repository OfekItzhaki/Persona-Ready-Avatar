/**
 * HairShader Unit Tests
 *
 * Tests for the HairShader TypeScript wrapper functionality.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createHairShader, updateHairShaderUniforms } from '../HairShader';
import type { WebGLCapabilities } from '../types';

describe('HairShader', () => {
  // Mock WebGL capabilities
  const mockCapabilities: WebGLCapabilities = {
    version: 2,
    maxTextureSize: 4096,
    maxVertexUniforms: 256,
    supportsFloatTextures: true,
    supportsDerivatives: true,
  };

  describe('createHairShader', () => {
    it('should create a ShaderMaterial with default configuration', () => {
      const material = createHairShader(mockCapabilities, 'medium');

      expect(material).toBeInstanceOf(THREE.ShaderMaterial);
      expect(material.vertexShader).toBeTruthy();
      expect(material.fragmentShader).toBeTruthy();
      expect(material.uniforms).toBeDefined();
    });

    it('should set up uniforms with default values', () => {
      const material = createHairShader(mockCapabilities, 'medium');
      const uniforms = material.uniforms;

      // Check that key uniforms exist
      expect(uniforms.hairColor).toBeDefined();
      expect(uniforms.shiftTangent).toBeDefined();
      expect(uniforms.primarySpecular).toBeDefined();
      expect(uniforms.secondarySpecular).toBeDefined();
      expect(uniforms.specularPower).toBeDefined();
      expect(uniforms.lightDirection).toBeDefined();
      expect(uniforms.lightColor).toBeDefined();
      expect(uniforms.ambientColor).toBeDefined();

      // Check default values
      expect(uniforms.hairColor.value).toBeInstanceOf(THREE.Color);
      expect(uniforms.shiftTangent.value).toBe(0.05);
      expect(uniforms.primarySpecular.value).toBe(0.8);
      expect(uniforms.secondarySpecular.value).toBe(0.4);
      expect(uniforms.specularPower.value).toBe(64.0);
      expect(uniforms.lightDirection.value).toBeInstanceOf(THREE.Vector3);
    });

    it('should apply custom hair color configuration', () => {
      const customHairColor = { r: 0.8, g: 0.6, b: 0.2 };
      const material = createHairShader(mockCapabilities, 'medium', {
        hairColor: customHairColor,
      });

      const hairColor = material.uniforms.hairColor.value as THREE.Color;
      expect(hairColor.r).toBeCloseTo(0.8, 2);
      expect(hairColor.g).toBeCloseTo(0.6, 2);
      expect(hairColor.b).toBeCloseTo(0.2, 2);
    });

    it('should apply custom anisotropic highlight parameters', () => {
      const material = createHairShader(mockCapabilities, 'medium', {
        shiftTangent: 0.1,
        primarySpecular: 0.9,
        secondarySpecular: 0.5,
        specularPower: 128.0,
      });

      expect(material.uniforms.shiftTangent.value).toBe(0.1);
      expect(material.uniforms.primarySpecular.value).toBe(0.9);
      expect(material.uniforms.secondarySpecular.value).toBe(0.5);
      expect(material.uniforms.specularPower.value).toBe(128.0);
    });

    it('should set quality-specific defines for low quality', () => {
      const material = createHairShader(mockCapabilities, 'low');

      expect(material.fragmentShader).toContain('QUALITY_LOW');
    });

    it('should set quality-specific defines for medium quality', () => {
      const material = createHairShader(mockCapabilities, 'medium');

      expect(material.fragmentShader).toContain('QUALITY_MEDIUM');
    });

    it('should set quality-specific defines for high quality', () => {
      const material = createHairShader(mockCapabilities, 'high');

      expect(material.fragmentShader).toContain('QUALITY_HIGH');
    });

    it('should enable USE_HAIR_TEXTURE define when texture is provided', () => {
      const texture = new THREE.Texture();
      const material = createHairShader(mockCapabilities, 'medium', {
        hairTexture: texture,
      });

      expect(material.defines?.USE_HAIR_TEXTURE).toBe(true);
      expect(material.uniforms.hairTexture.value).toBe(texture);
    });

    it('should enable morph target defines when morphTargets is true', () => {
      const material = createHairShader(mockCapabilities, 'medium', {
        morphTargets: true,
      });

      expect(material.defines?.USE_MORPHTARGETS).toBe(true);
    });

    it('should enable morph normal defines when morphNormals is true', () => {
      const material = createHairShader(mockCapabilities, 'medium', {
        morphTargets: true,
        morphNormals: true,
      });

      expect(material.defines?.USE_MORPHTARGETS).toBe(true);
      expect(material.defines?.USE_MORPHNORMALS).toBe(true);
    });

    it('should set material to double-sided for hair rendering', () => {
      const material = createHairShader(mockCapabilities, 'medium');

      expect(material.side).toBe(THREE.DoubleSide);
    });

    it('should enable transparency when texture is provided', () => {
      const texture = new THREE.Texture();
      const material = createHairShader(mockCapabilities, 'medium', {
        hairTexture: texture,
      });

      expect(material.transparent).toBe(true);
    });
  });

  describe('updateHairShaderUniforms', () => {
    it('should update hair color at runtime', () => {
      const material = createHairShader(mockCapabilities, 'medium');
      const newHairColor = { r: 0.9, g: 0.7, b: 0.3 };

      updateHairShaderUniforms(material, { hairColor: newHairColor });

      const hairColor = material.uniforms.hairColor.value as THREE.Color;
      expect(hairColor.r).toBeCloseTo(0.9, 2);
      expect(hairColor.g).toBeCloseTo(0.7, 2);
      expect(hairColor.b).toBeCloseTo(0.3, 2);
    });

    it('should update anisotropic highlight parameters at runtime', () => {
      const material = createHairShader(mockCapabilities, 'medium');

      updateHairShaderUniforms(material, {
        shiftTangent: 0.15,
        primarySpecular: 0.95,
        secondarySpecular: 0.6,
        specularPower: 96.0,
      });

      expect(material.uniforms.shiftTangent.value).toBe(0.15);
      expect(material.uniforms.primarySpecular.value).toBe(0.95);
      expect(material.uniforms.secondarySpecular.value).toBe(0.6);
      expect(material.uniforms.specularPower.value).toBe(96.0);
    });

    it('should update light direction at runtime', () => {
      const material = createHairShader(mockCapabilities, 'medium');
      const newLightDir = new THREE.Vector3(0, 1, 0);

      updateHairShaderUniforms(material, { lightDirection: newLightDir });

      const lightDir = material.uniforms.lightDirection.value as THREE.Vector3;
      expect(lightDir.y).toBeCloseTo(1.0, 2);
      expect(lightDir.length()).toBeCloseTo(1.0, 2); // Should be normalized
    });

    it('should update light color at runtime', () => {
      const material = createHairShader(mockCapabilities, 'medium');
      const newLightColor = { r: 1.0, g: 0.9, b: 0.8 };

      updateHairShaderUniforms(material, { lightColor: newLightColor });

      const lightColor = material.uniforms.lightColor.value as THREE.Color;
      expect(lightColor.r).toBeCloseTo(1.0, 2);
      expect(lightColor.g).toBeCloseTo(0.9, 2);
      expect(lightColor.b).toBeCloseTo(0.8, 2);
    });

    it('should update material properties at runtime', () => {
      const material = createHairShader(mockCapabilities, 'medium');

      updateHairShaderUniforms(material, {
        roughness: 0.4,
        alphaTest: 0.6,
      });

      expect(material.uniforms.roughness.value).toBe(0.4);
      expect(material.uniforms.alphaTest.value).toBe(0.6);
      expect(material.alphaTest).toBe(0.6);
    });

    it('should add texture and update defines when texture is added', () => {
      const material = createHairShader(mockCapabilities, 'medium');
      const texture = new THREE.Texture();

      updateHairShaderUniforms(material, { hairTexture: texture });

      expect(material.uniforms.hairTexture.value).toBe(texture);
      expect(material.defines?.USE_HAIR_TEXTURE).toBe(true);
    });

    it('should remove texture and update defines when texture is removed', () => {
      const texture = new THREE.Texture();
      const material = createHairShader(mockCapabilities, 'medium', { hairTexture: texture });

      updateHairShaderUniforms(material, { hairTexture: null });

      expect(material.uniforms.hairTexture.value).toBe(null);
      expect(material.defines?.USE_HAIR_TEXTURE).toBeUndefined();
    });
  });
});
