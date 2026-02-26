/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * HairShader TypeScript Wrapper
 *
 * Creates a THREE.ShaderMaterial configured with hair shaders including:
 * - Kajiya-Kay anisotropic lighting model
 * - Hair color configuration
 * - Anisotropic highlight parameters
 * - Morph target preservation
 *
 * Requirements: 3.2, 8.1, 8.2
 */

import * as THREE from 'three';
import { WebGLCapabilities } from './types';
import { getHairShaderSource } from './loaders';

/**
 * Hair Shader Uniforms Interface
 */
export interface HairShaderUniforms {
  // Color
  hairColor: { value: THREE.Color };
  hairTexture: { value: THREE.Texture | null };

  // Anisotropic highlights
  shiftTangent: { value: number };
  primarySpecular: { value: number };
  secondarySpecular: { value: number };
  specularPower: { value: number };

  // Lighting
  lightDirection: { value: THREE.Vector3 };
  lightColor: { value: THREE.Color };
  ambientColor: { value: THREE.Color };

  // Material properties
  roughness: { value: number };
  alphaTest: { value: number };

  // Index signature for Three.js compatibility
  [key: string]: THREE.IUniform<any>;
}

/**
 * Hair Shader Configuration Options
 */
export interface HairShaderConfig {
  // Hair color (RGB values in [0, 1])
  hairColor?: { r: number; g: number; b: number };

  // Anisotropic highlight parameters
  shiftTangent?: number; // Tangent shift for highlights (-1 to 1)
  primarySpecular?: number; // Primary highlight intensity (0 to 1)
  secondarySpecular?: number; // Secondary highlight intensity (0 to 1)
  specularPower?: number; // Specular exponent (higher = sharper)

  // Lighting
  lightDirection?: THREE.Vector3;
  lightColor?: { r: number; g: number; b: number };
  ambientColor?: { r: number; g: number; b: number };

  // Material properties
  roughness?: number;
  alphaTest?: number; // Alpha threshold for transparency

  // Textures
  hairTexture?: THREE.Texture | null;

  // Morph targets
  morphTargets?: boolean;
  morphNormals?: boolean;
}

/**
 * Default Hair Shader Configuration
 */
const DEFAULT_HAIR_CONFIG: Required<Omit<HairShaderConfig, 'hairTexture'>> = {
  hairColor: { r: 0.3, g: 0.2, b: 0.1 }, // Brown hair
  shiftTangent: 0.05, // Slight tangent shift
  primarySpecular: 0.8, // Strong primary highlight
  secondarySpecular: 0.4, // Moderate secondary highlight
  specularPower: 64.0, // Sharp highlights
  lightDirection: new THREE.Vector3(1, 1, 1).normalize(),
  lightColor: { r: 1.0, g: 1.0, b: 1.0 },
  ambientColor: { r: 0.2, g: 0.2, b: 0.25 },
  roughness: 0.3,
  alphaTest: 0.5,
  morphTargets: false,
  morphNormals: false,
};

/**
 * Create Hair Shader Material
 *
 * Creates a THREE.ShaderMaterial configured with hair shaders.
 * Supports quality-specific defines (QUALITY_LOW/MEDIUM/HIGH).
 *
 * @param _capabilities - WebGL capabilities detected from renderer (reserved for future use)
 * @param quality - Quality level (low, medium, high)
 * @param config - Optional configuration overrides
 * @returns Configured THREE.ShaderMaterial
 */
export function createHairShader(
  _capabilities: WebGLCapabilities,
  quality: 'low' | 'medium' | 'high',
  config: HairShaderConfig = {}
): THREE.ShaderMaterial {
  // Merge config with defaults
  const finalConfig = {
    ...DEFAULT_HAIR_CONFIG,
    ...config,
    hairTexture: config.hairTexture ?? null,
  };

  // Get shader source with quality-specific defines
  const shaderSource = getHairShaderSource(quality);

  // Set up uniforms
  const uniforms: HairShaderUniforms = {
    // Color
    hairColor: {
      value: new THREE.Color(
        finalConfig.hairColor.r,
        finalConfig.hairColor.g,
        finalConfig.hairColor.b
      ),
    },
    hairTexture: { value: finalConfig.hairTexture },

    // Anisotropic highlights
    shiftTangent: { value: finalConfig.shiftTangent },
    primarySpecular: { value: finalConfig.primarySpecular },
    secondarySpecular: { value: finalConfig.secondarySpecular },
    specularPower: { value: finalConfig.specularPower },

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
    roughness: { value: finalConfig.roughness },
    alphaTest: { value: finalConfig.alphaTest },
  };

  // Set up defines based on configuration
  const defines: { [key: string]: string | number | boolean } = {};

  // Enable texture sampling if texture is provided
  if (finalConfig.hairTexture) {
    defines.USE_HAIR_TEXTURE = true;
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
    transparent: finalConfig.hairTexture !== null, // Enable transparency if using texture
    side: THREE.DoubleSide, // Hair often needs double-sided rendering
    alphaTest: finalConfig.alphaTest,
  });

  return material;
}

/**
 * Update Hair Shader Uniforms
 *
 * Updates shader uniforms at runtime without recompilation.
 *
 * @param material - The ShaderMaterial to update
 * @param config - Configuration values to update
 */
export function updateHairShaderUniforms(
  material: THREE.ShaderMaterial,
  config: Partial<HairShaderConfig>
): void {
  const uniforms = material.uniforms;

  // Update hair color
  if (config.hairColor && uniforms.hairColor) {
    (uniforms.hairColor.value as THREE.Color).setRGB(
      config.hairColor.r,
      config.hairColor.g,
      config.hairColor.b
    );
  }

  // Update anisotropic highlight parameters
  if (config.shiftTangent !== undefined && uniforms.shiftTangent) {
    uniforms.shiftTangent.value = config.shiftTangent;
  }

  if (config.primarySpecular !== undefined && uniforms.primarySpecular) {
    uniforms.primarySpecular.value = config.primarySpecular;
  }

  if (config.secondarySpecular !== undefined && uniforms.secondarySpecular) {
    uniforms.secondarySpecular.value = config.secondarySpecular;
  }

  if (config.specularPower !== undefined && uniforms.specularPower) {
    uniforms.specularPower.value = config.specularPower;
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
  if (config.roughness !== undefined && uniforms.roughness) {
    uniforms.roughness.value = config.roughness;
  }

  if (config.alphaTest !== undefined && uniforms.alphaTest) {
    uniforms.alphaTest.value = config.alphaTest;
    material.alphaTest = config.alphaTest;
  }

  // Update hair texture
  if (config.hairTexture !== undefined && uniforms.hairTexture) {
    uniforms.hairTexture.value = config.hairTexture;
    // Update defines if needed
    if (config.hairTexture && !material.defines?.USE_HAIR_TEXTURE) {
      material.defines = material.defines || {};
      material.defines.USE_HAIR_TEXTURE = true;
      material.needsUpdate = true;
    } else if (!config.hairTexture && material.defines?.USE_HAIR_TEXTURE) {
      delete material.defines.USE_HAIR_TEXTURE;
      material.needsUpdate = true;
    }
  }
}
