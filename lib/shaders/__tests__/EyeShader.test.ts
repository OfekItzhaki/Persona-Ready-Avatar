/**
 * EyeShader Unit Tests
 *
 * Tests for the EyeShader TypeScript wrapper functionality.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createEyeShader, updateEyeShaderUniforms } from '../EyeShader';
import type { WebGLCapabilities } from '../types';

describe('EyeShader', () => {
  // Mock WebGL capabilities
  const mockCapabilities: WebGLCapabilities = {
    version: 2,
    maxTextureSize: 4096,
    maxVertexUniforms: 256,
    supportsFloatTextures: true,
    supportsDerivatives: true,
  };

  describe('createEyeShader', () => {
    it('should create a ShaderMaterial with default configuration', () => {
      const material = createEyeShader(mockCapabilities, 'medium');

      expect(material).toBeInstanceOf(THREE.ShaderMaterial);
      expect(material.vertexShader).toBeTruthy();
      expect(material.fragmentShader).toBeTruthy();
      expect(material.uniforms).toBeDefined();
    });

    it('should set up uniforms with default values', () => {
      const material = createEyeShader(mockCapabilities, 'medium');
      const uniforms = material.uniforms;

      // Check that key uniforms exist
      expect(uniforms.irisColor).toBeDefined();
      expect(uniforms.pupilSize).toBeDefined();
      expect(uniforms.corneaIOR).toBeDefined();
      expect(uniforms.corneaThickness).toBeDefined();
      expect(uniforms.specularIntensity).toBeDefined();
      expect(uniforms.specularPower).toBeDefined();
      expect(uniforms.lightDirection).toBeDefined();
      expect(uniforms.lightColor).toBeDefined();
      expect(uniforms.scleraColor).toBeDefined();
      expect(uniforms.scleraVariation).toBeDefined();

      // Check default values
      expect(uniforms.irisColor.value).toBeInstanceOf(THREE.Color);
      expect(uniforms.pupilSize.value).toBe(0.5);
      expect(uniforms.corneaIOR.value).toBe(1.376);
      expect(uniforms.lightDirection.value).toBeInstanceOf(THREE.Vector3);
    });

    it('should apply custom iris color configuration', () => {
      const customIrisColor = { r: 0.2, g: 0.8, b: 0.3 };
      const material = createEyeShader(mockCapabilities, 'medium', {
        irisColor: customIrisColor,
      });

      const irisColor = material.uniforms.irisColor.value as THREE.Color;
      expect(irisColor.r).toBeCloseTo(0.2, 2);
      expect(irisColor.g).toBeCloseTo(0.8, 2);
      expect(irisColor.b).toBeCloseTo(0.3, 2);
    });

    it('should apply custom pupil size', () => {
      const material = createEyeShader(mockCapabilities, 'medium', {
        pupilSize: 0.8,
      });

      expect(material.uniforms.pupilSize.value).toBe(0.8);
    });

    it('should apply custom cornea parameters', () => {
      const material = createEyeShader(mockCapabilities, 'medium', {
        corneaIOR: 1.4,
        corneaThickness: 0.7,
      });

      expect(material.uniforms.corneaIOR.value).toBe(1.4);
      expect(material.uniforms.corneaThickness.value).toBe(0.7);
    });

    it('should apply custom specular parameters', () => {
      const material = createEyeShader(mockCapabilities, 'medium', {
        specularIntensity: 0.8,
        specularPower: 256.0,
      });

      expect(material.uniforms.specularIntensity.value).toBe(0.8);
      expect(material.uniforms.specularPower.value).toBe(256.0);
    });

    it('should apply custom sclera parameters', () => {
      const customScleraColor = { r: 0.9, g: 0.9, b: 0.85 };
      const material = createEyeShader(mockCapabilities, 'medium', {
        scleraColor: customScleraColor,
        scleraVariation: 0.5,
      });

      const scleraColor = material.uniforms.scleraColor.value as THREE.Color;
      expect(scleraColor.r).toBeCloseTo(0.9, 2);
      expect(scleraColor.g).toBeCloseTo(0.9, 2);
      expect(scleraColor.b).toBeCloseTo(0.85, 2);
      expect(material.uniforms.scleraVariation.value).toBe(0.5);
    });

    it('should set quality-specific defines for low quality', () => {
      const material = createEyeShader(mockCapabilities, 'low');

      expect(material.fragmentShader).toContain('QUALITY_LOW');
    });

    it('should set quality-specific defines for medium quality', () => {
      const material = createEyeShader(mockCapabilities, 'medium');

      expect(material.fragmentShader).toContain('QUALITY_MEDIUM');
    });

    it('should set quality-specific defines for high quality', () => {
      const material = createEyeShader(mockCapabilities, 'high');

      expect(material.fragmentShader).toContain('QUALITY_HIGH');
    });

    it('should enable USE_IRIS_TEXTURE define when texture is provided', () => {
      const texture = new THREE.Texture();
      const material = createEyeShader(mockCapabilities, 'medium', {
        irisTexture: texture,
      });

      expect(material.defines?.USE_IRIS_TEXTURE).toBe(true);
      expect(material.uniforms.irisTexture.value).toBe(texture);
    });

    it('should not enable USE_IRIS_TEXTURE define when no texture is provided', () => {
      const material = createEyeShader(mockCapabilities, 'medium');

      expect(material.defines?.USE_IRIS_TEXTURE).toBeUndefined();
      expect(material.uniforms.irisTexture.value).toBe(null);
    });
  });

  describe('updateEyeShaderUniforms', () => {
    it('should update iris color at runtime', () => {
      const material = createEyeShader(mockCapabilities, 'medium');
      const newIrisColor = { r: 0.6, g: 0.3, b: 0.1 };

      updateEyeShaderUniforms(material, { irisColor: newIrisColor });

      const irisColor = material.uniforms.irisColor.value as THREE.Color;
      expect(irisColor.r).toBeCloseTo(0.6, 2);
      expect(irisColor.g).toBeCloseTo(0.3, 2);
      expect(irisColor.b).toBeCloseTo(0.1, 2);
    });

    it('should update pupil size at runtime', () => {
      const material = createEyeShader(mockCapabilities, 'medium');

      updateEyeShaderUniforms(material, { pupilSize: 0.2 });

      expect(material.uniforms.pupilSize.value).toBe(0.2);
    });

    it('should update cornea parameters at runtime', () => {
      const material = createEyeShader(mockCapabilities, 'medium');

      updateEyeShaderUniforms(material, {
        corneaIOR: 1.5,
        corneaThickness: 0.9,
      });

      expect(material.uniforms.corneaIOR.value).toBe(1.5);
      expect(material.uniforms.corneaThickness.value).toBe(0.9);
    });

    it('should update specular parameters at runtime', () => {
      const material = createEyeShader(mockCapabilities, 'medium');

      updateEyeShaderUniforms(material, {
        specularIntensity: 1.5,
        specularPower: 512.0,
      });

      expect(material.uniforms.specularIntensity.value).toBe(1.5);
      expect(material.uniforms.specularPower.value).toBe(512.0);
    });

    it('should update light direction at runtime', () => {
      const material = createEyeShader(mockCapabilities, 'medium');
      const newLightDir = new THREE.Vector3(0, 1, 0);

      updateEyeShaderUniforms(material, { lightDirection: newLightDir });

      const lightDir = material.uniforms.lightDirection.value as THREE.Vector3;
      expect(lightDir.y).toBeCloseTo(1.0, 2);
      expect(lightDir.length()).toBeCloseTo(1.0, 2); // Should be normalized
    });

    it('should update light color at runtime', () => {
      const material = createEyeShader(mockCapabilities, 'medium');
      const newLightColor = { r: 1.0, g: 0.9, b: 0.7 };

      updateEyeShaderUniforms(material, { lightColor: newLightColor });

      const lightColor = material.uniforms.lightColor.value as THREE.Color;
      expect(lightColor.r).toBeCloseTo(1.0, 2);
      expect(lightColor.g).toBeCloseTo(0.9, 2);
      expect(lightColor.b).toBeCloseTo(0.7, 2);
    });

    it('should update sclera parameters at runtime', () => {
      const material = createEyeShader(mockCapabilities, 'medium');
      const newScleraColor = { r: 0.98, g: 0.97, b: 0.96 };

      updateEyeShaderUniforms(material, {
        scleraColor: newScleraColor,
        scleraVariation: 0.3,
      });

      const scleraColor = material.uniforms.scleraColor.value as THREE.Color;
      expect(scleraColor.r).toBeCloseTo(0.98, 2);
      expect(scleraColor.g).toBeCloseTo(0.97, 2);
      expect(scleraColor.b).toBeCloseTo(0.96, 2);
      expect(material.uniforms.scleraVariation.value).toBe(0.3);
    });

    it('should add texture and update defines when texture is added', () => {
      const material = createEyeShader(mockCapabilities, 'medium');
      const texture = new THREE.Texture();

      updateEyeShaderUniforms(material, { irisTexture: texture });

      expect(material.uniforms.irisTexture.value).toBe(texture);
      expect(material.defines?.USE_IRIS_TEXTURE).toBe(true);
    });

    it('should remove texture and update defines when texture is removed', () => {
      const texture = new THREE.Texture();
      const material = createEyeShader(mockCapabilities, 'medium', { irisTexture: texture });

      updateEyeShaderUniforms(material, { irisTexture: null });

      expect(material.uniforms.irisTexture.value).toBe(null);
      expect(material.defines?.USE_IRIS_TEXTURE).toBeUndefined();
    });
  });
});
