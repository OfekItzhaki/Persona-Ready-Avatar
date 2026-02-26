/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SkinShader TypeScript Wrapper
 *
 * Creates a THREE.ShaderMaterial configured with skin shaders including:
 * - Subsurface scattering (SSS) approximation
 * - Skin tone configuration
 * - Normal mapping support
 * - Specular highlights
 * - Morph target preservation
 *
 * Requirements: 1.4, 8.1, 8.2
 */

import * as THREE from 'three';
import { WebGLCapabilities } from './types';
import { getSkinShaderSource } from './loaders';

/**
 * Skin Shader Uniforms Interface
 */
export interface SkinShaderUniforms {
  // Textures
  map: { value: THREE.Texture | null };
  normalMap: { value: THREE.Texture | null };
  normalScale: { value: number };

  // Skin tone
  skinTone: { value: THREE.Color };

  // Subsurface scattering
  sssColor: { value: THREE.Color };
  sssIntensity: { value: number };
  sssScale: { value: number };

  // Lighting
  lightDirection: { value: THREE.Vector3 };
  lightColor: { value: THREE.Color };
  ambientColor: { value: THREE.Color };

  // Material properties
  specularIntensity: { value: number };
  specularPower: { value: number };
  roughness: { value: number };

  // Index signature for Three.js compatibility
  [key: string]: THREE.IUniform<any>;
}

/**
 * Skin Shader Configuration Options
 */
export interface SkinShaderConfig {
  // Skin tone (RGB values in [0, 1])
  skinTone?: { r: number; g: number; b: number };

  // SSS parameters
  sssColor?: { r: number; g: number; b: number };
  sssIntensity?: number;
  sssScale?: number;

  // Lighting
  lightDirection?: THREE.Vector3;
  lightColor?: { r: number; g: number; b: number };
  ambientColor?: { r: number; g: number; b: number };

  // Material properties
  specularIntensity?: number;
  specularPower?: number;
  roughness?: number;
  normalScale?: number;

  // Textures
  map?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;

  // Morph targets
  morphTargets?: boolean;
  morphNormals?: boolean;
}

/**
 * Default Skin Shader Configuration
 */
const DEFAULT_SKIN_CONFIG: Required<Omit<SkinShaderConfig, 'map' | 'normalMap'>> = {
  skinTone: { r: 0.92, g: 0.78, b: 0.71 }, // Fair skin tone
  sssColor: { r: 1.0, g: 0.4, b: 0.3 }, // Reddish SSS tint
  sssIntensity: 0.5,
  sssScale: 1.0,
  lightDirection: new THREE.Vector3(1, 1, 1).normalize(),
  lightColor: { r: 1.0, g: 1.0, b: 1.0 },
  ambientColor: { r: 0.2, g: 0.2, b: 0.25 },
  specularIntensity: 0.3,
  specularPower: 32.0,
  roughness: 0.5,
  normalScale: 1.0,
  morphTargets: false,
  morphNormals: false,
};

/**
 * Create Skin Shader Material
 *
 * Creates a THREE.ShaderMaterial configured with skin shaders.
 * Supports quality-specific defines (QUALITY_LOW/MEDIUM/HIGH).
 *
 * @param _capabilities - WebGL capabilities detected from renderer (reserved for future use)
 * @param quality - Quality level (low, medium, high)
 * @param config - Optional configuration overrides
 * @returns Configured THREE.ShaderMaterial
 */
export function createSkinShader(
  _capabilities: WebGLCapabilities,
  quality: 'low' | 'medium' | 'high',
  config: SkinShaderConfig = {}
): THREE.ShaderMaterial {
  // Merge config with defaults
  const finalConfig = {
    ...DEFAULT_SKIN_CONFIG,
    ...config,
    map: config.map ?? null,
    normalMap: config.normalMap ?? null,
  };

  // Get shader source with quality-specific defines
  const shaderSource = getSkinShaderSource(quality);

  // Set up uniforms
  const uniforms: SkinShaderUniforms = {
    // Textures
    map: { value: finalConfig.map },
    normalMap: { value: finalConfig.normalMap },
    normalScale: { value: finalConfig.normalScale },

    // Skin tone
    skinTone: {
      value: new THREE.Color(
        finalConfig.skinTone.r,
        finalConfig.skinTone.g,
        finalConfig.skinTone.b
      ),
    },

    // Subsurface scattering
    sssColor: {
      value: new THREE.Color(
        finalConfig.sssColor.r,
        finalConfig.sssColor.g,
        finalConfig.sssColor.b
      ),
    },
    sssIntensity: { value: finalConfig.sssIntensity },
    sssScale: { value: finalConfig.sssScale },

    // Lighting
    lightDirection: { value: finalConfig.lightDirection.clone().normalize() },
    lightColor: {
      value: new THREE.Color(
        finalConfig.lightColor.r,
        finalConfig.lightColor.g,
        finalConfig.lightColor.b
      ),
    },
    ambientColor: {
      value: new THREE.Color(
        finalConfig.ambientColor.r,
        finalConfig.ambientColor.g,
        finalConfig.ambientColor.b
      ),
    },

    // Material properties
    specularIntensity: { value: finalConfig.specularIntensity },
    specularPower: { value: finalConfig.specularPower },
    roughness: { value: finalConfig.roughness },
  };

  // Set up defines based on configuration and capabilities
  const defines: { [key: string]: string | number | boolean } = {};

  // Enable texture sampling if textures are provided
  if (finalConfig.map) {
    defines.USE_MAP = true;
  }

  if (finalConfig.normalMap) {
    defines.USE_NORMALMAP = true;
  }

  // Enable morph target support
  if (finalConfig.morphTargets) {
    defines.USE_MORPHTARGETS = true;
  }

  if (finalConfig.morphNormals) {
    defines.USE_MORPHNORMALS = true;
  }

  // Create shader material
  const material = new THREE.ShaderMaterial({
    vertexShader: shaderSource.vertexShader,
    fragmentShader: shaderSource.fragmentShader,
    uniforms,
    defines,
    lights: false, // We handle lighting manually in the shader
    transparent: false,
    side: THREE.FrontSide,
  });

  return material;
}

/**
 * Update Skin Shader Uniforms
 *
 * Updates shader uniforms at runtime without recompilation.
 *
 * @param material - The ShaderMaterial to update
 * @param config - Configuration values to update
 */
export function updateSkinShaderUniforms(
  material: THREE.ShaderMaterial,
  config: Partial<SkinShaderConfig>
): void {
  const uniforms = material.uniforms;

  // Update skin tone
  if (config.skinTone && uniforms.skinTone) {
    (uniforms.skinTone.value as THREE.Color).setRGB(
      config.skinTone.r,
      config.skinTone.g,
      config.skinTone.b
    );
  }

  // Update SSS parameters
  if (config.sssColor && uniforms.sssColor) {
    (uniforms.sssColor.value as THREE.Color).setRGB(
      config.sssColor.r,
      config.sssColor.g,
      config.sssColor.b
    );
  }

  if (config.sssIntensity !== undefined && uniforms.sssIntensity) {
    uniforms.sssIntensity.value = config.sssIntensity;
  }

  if (config.sssScale !== undefined && uniforms.sssScale) {
    uniforms.sssScale.value = config.sssScale;
  }

  // Update lighting
  if (config.lightDirection && uniforms.lightDirection) {
    (uniforms.lightDirection.value as THREE.Vector3).copy(config.lightDirection).normalize();
  }

  if (config.lightColor && uniforms.lightColor) {
    (uniforms.lightColor.value as THREE.Color).setRGB(
      config.lightColor.r,
      config.lightColor.g,
      config.lightColor.b
    );
  }

  if (config.ambientColor && uniforms.ambientColor) {
    (uniforms.ambientColor.value as THREE.Color).setRGB(
      config.ambientColor.r,
      config.ambientColor.g,
      config.ambientColor.b
    );
  }

  // Update material properties
  if (config.specularIntensity !== undefined && uniforms.specularIntensity) {
    uniforms.specularIntensity.value = config.specularIntensity;
  }

  if (config.specularPower !== undefined && uniforms.specularPower) {
    uniforms.specularPower.value = config.specularPower;
  }

  if (config.roughness !== undefined && uniforms.roughness) {
    uniforms.roughness.value = config.roughness;
  }

  if (config.normalScale !== undefined && uniforms.normalScale) {
    uniforms.normalScale.value = config.normalScale;
  }

  // Update textures
  if (config.map !== undefined && uniforms.map) {
    uniforms.map.value = config.map;
    // Update defines if needed
    if (config.map && !material.defines?.USE_MAP) {
      material.defines = material.defines || {};
      material.defines.USE_MAP = true;
      material.needsUpdate = true;
    } else if (!config.map && material.defines?.USE_MAP) {
      delete material.defines.USE_MAP;
      material.needsUpdate = true;
    }
  }

  if (config.normalMap !== undefined && uniforms.normalMap) {
    uniforms.normalMap.value = config.normalMap;
    // Update defines if needed
    if (config.normalMap && !material.defines?.USE_NORMALMAP) {
      material.defines = material.defines || {};
      material.defines.USE_NORMALMAP = true;
      material.needsUpdate = true;
    } else if (!config.normalMap && material.defines?.USE_NORMALMAP) {
      delete material.defines.USE_NORMALMAP;
      material.needsUpdate = true;
    }
  }
}
