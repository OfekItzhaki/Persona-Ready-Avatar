/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * EyeShader TypeScript Wrapper
 *
 * Creates a THREE.ShaderMaterial configured with eye shaders including:
 * - Cornea refraction for depth illusion
 * - Iris depth and wetness rendering
 * - Configurable iris color and pupil size
 * - Sclera rendering with subtle color variation
 *
 * Requirements: 2.3, 8.1, 8.2
 */

import * as THREE from 'three';
import { WebGLCapabilities } from './types';
import { getEyeShaderSource } from './loaders';

/**
 * Eye Shader Uniforms Interface
 */
export interface EyeShaderUniforms {
  // Iris parameters
  irisColor: { value: THREE.Color };
  irisTexture: { value: THREE.Texture | null };
  pupilSize: { value: number };

  // Cornea parameters
  corneaIOR: { value: number };
  corneaThickness: { value: number };

  // Wetness/specular
  specularIntensity: { value: number };
  specularPower: { value: number };

  // Lighting
  lightDirection: { value: THREE.Vector3 };
  lightColor: { value: THREE.Color };

  // Sclera parameters
  scleraColor: { value: THREE.Color };
  scleraVariation: { value: number };

  // Index signature for Three.js compatibility
  [key: string]: THREE.IUniform<any>;
}

/**
 * Eye Shader Configuration Options
 */
export interface EyeShaderConfig {
  // Iris parameters (RGB values in [0, 1])
  irisColor?: { r: number; g: number; b: number };
  pupilSize?: number; // 0.0 to 1.0 (dilated to constricted)

  // Cornea parameters
  corneaIOR?: number; // Index of refraction (typically 1.376)
  corneaThickness?: number;

  // Wetness/specular
  specularIntensity?: number;
  specularPower?: number;

  // Lighting
  lightDirection?: THREE.Vector3;
  lightColor?: { r: number; g: number; b: number };

  // Sclera parameters
  scleraColor?: { r: number; g: number; b: number };
  scleraVariation?: number;

  // Textures
  irisTexture?: THREE.Texture | null;
}

/**
 * Default Eye Shader Configuration
 */
const DEFAULT_EYE_CONFIG: Required<Omit<EyeShaderConfig, 'irisTexture'>> = {
  irisColor: { r: 0.4, g: 0.6, b: 0.8 }, // Blue eyes
  pupilSize: 0.5, // Medium pupil size
  corneaIOR: 1.376, // Realistic cornea index of refraction
  corneaThickness: 0.5,
  specularIntensity: 1.0,
  specularPower: 128.0, // High specular for wet appearance
  lightDirection: new THREE.Vector3(1, 1, 1).normalize(),
  lightColor: { r: 1.0, g: 1.0, b: 1.0 },
  scleraColor: { r: 0.95, g: 0.94, b: 0.93 }, // Slightly off-white
  scleraVariation: 1.0,
};

/**
 * Create Eye Shader Material
 *
 * Creates a THREE.ShaderMaterial configured with eye shaders.
 * Supports quality-specific defines (QUALITY_LOW/MEDIUM/HIGH).
 *
 * @param _capabilities - WebGL capabilities detected from renderer (reserved for future use)
 * @param quality - Quality level (low, medium, high)
 * @param config - Optional configuration overrides
 * @returns Configured THREE.ShaderMaterial
 */
export function createEyeShader(
  _capabilities: WebGLCapabilities,
  quality: 'low' | 'medium' | 'high',
  config: EyeShaderConfig = {}
): THREE.ShaderMaterial {
  // Merge config with defaults
  const finalConfig = {
    ...DEFAULT_EYE_CONFIG,
    ...config,
    irisTexture: config.irisTexture ?? null,
  };

  // Get shader source with quality-specific defines
  const shaderSource = getEyeShaderSource(quality);

  // Set up uniforms
  const uniforms: EyeShaderUniforms = {
    // Iris parameters
    irisColor: {
      value: new THREE.Color(
        finalConfig.irisColor.r,
        finalConfig.irisColor.g,
        finalConfig.irisColor.b
      ),
    },
    irisTexture: { value: finalConfig.irisTexture },
    pupilSize: { value: finalConfig.pupilSize },

    // Cornea parameters
    corneaIOR: { value: finalConfig.corneaIOR },
    corneaThickness: { value: finalConfig.corneaThickness },

    // Wetness/specular
    specularIntensity: { value: finalConfig.specularIntensity },
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

    // Sclera parameters
    scleraColor: {
      value: new THREE.Color(
        finalConfig.scleraColor.r,
        finalConfig.scleraColor.g,
        finalConfig.scleraColor.b
      ),
    },
    scleraVariation: { value: finalConfig.scleraVariation },
  };

  // Set up defines based on configuration
  const defines: { [key: string]: string | number | boolean } = {};

  // Enable iris texture sampling if texture is provided
  if (finalConfig.irisTexture) {
    defines.USE_IRIS_TEXTURE = true;
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
 * Update Eye Shader Uniforms
 *
 * Updates shader uniforms at runtime without recompilation.
 *
 * @param material - The ShaderMaterial to update
 * @param config - Configuration values to update
 */
export function updateEyeShaderUniforms(
  material: THREE.ShaderMaterial,
  config: Partial<EyeShaderConfig>
): void {
  const uniforms = material.uniforms;

  // Update iris color
  if (config.irisColor && uniforms.irisColor) {
    (uniforms.irisColor.value as THREE.Color).setRGB(
      config.irisColor.r,
      config.irisColor.g,
      config.irisColor.b
    );
  }

  // Update pupil size
  if (config.pupilSize !== undefined && uniforms.pupilSize) {
    uniforms.pupilSize.value = config.pupilSize;
  }

  // Update cornea parameters
  if (config.corneaIOR !== undefined && uniforms.corneaIOR) {
    uniforms.corneaIOR.value = config.corneaIOR;
  }

  if (config.corneaThickness !== undefined && uniforms.corneaThickness) {
    uniforms.corneaThickness.value = config.corneaThickness;
  }

  // Update specular parameters
  if (config.specularIntensity !== undefined && uniforms.specularIntensity) {
    uniforms.specularIntensity.value = config.specularIntensity;
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

  // Update sclera parameters
  if (config.scleraColor && uniforms.scleraColor) {
    (uniforms.scleraColor.value as THREE.Color).setRGB(
      config.scleraColor.r,
      config.scleraColor.g,
      config.scleraColor.b
    );
  }

  if (config.scleraVariation !== undefined && uniforms.scleraVariation) {
    uniforms.scleraVariation.value = config.scleraVariation;
  }

  // Update iris texture
  if (config.irisTexture !== undefined && uniforms.irisTexture) {
    uniforms.irisTexture.value = config.irisTexture;
    // Update defines if needed
    if (config.irisTexture && !material.defines?.USE_IRIS_TEXTURE) {
      material.defines = material.defines || {};
      material.defines.USE_IRIS_TEXTURE = true;
      material.needsUpdate = true;
    } else if (!config.irisTexture && material.defines?.USE_IRIS_TEXTURE) {
      delete material.defines.USE_IRIS_TEXTURE;
      material.needsUpdate = true;
    }
  }
}
