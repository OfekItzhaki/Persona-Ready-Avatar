import { describe, it, expect } from 'vitest';
import { getSkinShaderSource, getEyeShaderSource, getHairShaderSource } from '../loaders';

describe('Shader Loaders', () => {
  describe('getSkinShaderSource', () => {
    it('should return vertex and fragment shader source for low quality', () => {
      const source = getSkinShaderSource('low');

      expect(source.vertexShader).toBeTruthy();
      expect(source.fragmentShader).toBeTruthy();
      expect(source.fragmentShader).toContain('#define QUALITY_LOW');
    });

    it('should return vertex and fragment shader source for medium quality', () => {
      const source = getSkinShaderSource('medium');

      expect(source.vertexShader).toBeTruthy();
      expect(source.fragmentShader).toBeTruthy();
      expect(source.fragmentShader).toContain('#define QUALITY_MEDIUM');
    });

    it('should return vertex and fragment shader source for high quality', () => {
      const source = getSkinShaderSource('high');

      expect(source.vertexShader).toBeTruthy();
      expect(source.fragmentShader).toBeTruthy();
      expect(source.fragmentShader).toContain('#define QUALITY_HIGH');
    });

    it('should include morph target support in vertex shader', () => {
      const source = getSkinShaderSource('medium');

      expect(source.vertexShader).toContain('USE_MORPHTARGETS');
      expect(source.vertexShader).toContain('morphTarget0');
      expect(source.vertexShader).toContain('morphTargetInfluences');
    });

    it('should include SSS parameters in fragment shader', () => {
      const source = getSkinShaderSource('medium');

      expect(source.fragmentShader).toContain('sssColor');
      expect(source.fragmentShader).toContain('sssIntensity');
      expect(source.fragmentShader).toContain('sssScale');
    });

    it('should include lighting uniforms in fragment shader', () => {
      const source = getSkinShaderSource('medium');

      expect(source.fragmentShader).toContain('lightDirection');
      expect(source.fragmentShader).toContain('lightColor');
      expect(source.fragmentShader).toContain('ambientColor');
    });

    it('should include wrap lighting function in fragment shader', () => {
      const source = getSkinShaderSource('medium');

      expect(source.fragmentShader).toContain('wrapLighting');
    });

    it('should include translucency function in fragment shader', () => {
      const source = getSkinShaderSource('medium');

      expect(source.fragmentShader).toContain('translucency');
    });

    it('should include fresnel function in fragment shader', () => {
      const source = getSkinShaderSource('medium');

      expect(source.fragmentShader).toContain('fresnel');
    });
  });

  describe('getEyeShaderSource', () => {
    it('should return vertex and fragment shader source for low quality', () => {
      const source = getEyeShaderSource('low');

      expect(source.vertexShader).toBeTruthy();
      expect(source.fragmentShader).toBeTruthy();
      expect(source.fragmentShader).toContain('#define QUALITY_LOW');
    });

    it('should return vertex and fragment shader source for medium quality', () => {
      const source = getEyeShaderSource('medium');

      expect(source.vertexShader).toBeTruthy();
      expect(source.fragmentShader).toBeTruthy();
      expect(source.fragmentShader).toContain('#define QUALITY_MEDIUM');
    });

    it('should return vertex and fragment shader source for high quality', () => {
      const source = getEyeShaderSource('high');

      expect(source.vertexShader).toBeTruthy();
      expect(source.fragmentShader).toBeTruthy();
      expect(source.fragmentShader).toContain('#define QUALITY_HIGH');
    });

    it('should include iris parameters in fragment shader', () => {
      const source = getEyeShaderSource('medium');

      expect(source.fragmentShader).toContain('irisColor');
      expect(source.fragmentShader).toContain('pupilSize');
      expect(source.fragmentShader).toContain('irisTexture');
    });

    it('should include cornea parameters in fragment shader', () => {
      const source = getEyeShaderSource('medium');

      expect(source.fragmentShader).toContain('corneaIOR');
      expect(source.fragmentShader).toContain('corneaThickness');
    });

    it('should include sclera parameters in fragment shader', () => {
      const source = getEyeShaderSource('medium');

      expect(source.fragmentShader).toContain('scleraColor');
      expect(source.fragmentShader).toContain('scleraVariation');
    });

    it('should include refraction function in fragment shader', () => {
      const source = getEyeShaderSource('medium');

      expect(source.fragmentShader).toContain('getRefractedIrisUV');
      expect(source.fragmentShader).toContain('refract');
    });

    it('should include masking functions in fragment shader', () => {
      const source = getEyeShaderSource('medium');

      expect(source.fragmentShader).toContain('getIrisMask');
      expect(source.fragmentShader).toContain('getPupilMask');
    });
  });

  describe('getHairShaderSource', () => {
    it('should return vertex and fragment shader source for low quality', () => {
      const source = getHairShaderSource('low');

      expect(source.vertexShader).toBeTruthy();
      expect(source.fragmentShader).toBeTruthy();
      expect(source.fragmentShader).toContain('#define QUALITY_LOW');
    });

    it('should return vertex and fragment shader source for medium quality', () => {
      const source = getHairShaderSource('medium');

      expect(source.vertexShader).toBeTruthy();
      expect(source.fragmentShader).toBeTruthy();
      expect(source.fragmentShader).toContain('#define QUALITY_MEDIUM');
    });

    it('should return vertex and fragment shader source for high quality', () => {
      const source = getHairShaderSource('high');

      expect(source.vertexShader).toBeTruthy();
      expect(source.fragmentShader).toBeTruthy();
      expect(source.fragmentShader).toContain('#define QUALITY_HIGH');
    });

    it('should include morph target support in vertex shader', () => {
      const source = getHairShaderSource('medium');

      expect(source.vertexShader).toContain('USE_MORPHTARGETS');
      expect(source.vertexShader).toContain('morphTarget0');
      expect(source.vertexShader).toContain('morphTargetInfluences');
    });

    it('should include anisotropic lighting parameters in fragment shader', () => {
      const source = getHairShaderSource('medium');

      expect(source.fragmentShader).toContain('shiftTangent');
      expect(source.fragmentShader).toContain('primarySpecular');
      expect(source.fragmentShader).toContain('secondarySpecular');
      expect(source.fragmentShader).toContain('specularPower');
    });

    it('should include Kajiya-Kay function in fragment shader', () => {
      const source = getHairShaderSource('medium');

      expect(source.fragmentShader).toContain('kajiyaKaySpecular');
      expect(source.fragmentShader).toContain('shiftTangentVector');
    });

    it('should include lighting uniforms in fragment shader', () => {
      const source = getHairShaderSource('medium');

      expect(source.fragmentShader).toContain('uniform vec3 lightDirection');
      expect(source.fragmentShader).toContain('uniform vec3 lightColor');
      expect(source.fragmentShader).toContain('uniform vec3 ambientColor');
    });

    it('should include tangent attribute in vertex shader', () => {
      const source = getHairShaderSource('medium');

      expect(source.vertexShader).toContain('attribute vec4 tangent');
      expect(source.vertexShader).toContain('vTangent');
    });
  });
});
