import * as THREE from 'three';

/**
 * WebGL Capabilities Interface
 *
 * Represents the detected WebGL capabilities of the current rendering context.
 */
export interface WebGLCapabilities {
  version: 1 | 2;
  maxTextureSize: number;
  maxVertexUniforms: number;
  supportsFloatTextures: boolean;
  supportsDerivatives: boolean;
}

/**
 * Shader Configuration Interface
 *
 * Configuration options for the shader system.
 */
export interface ShaderConfig {
  quality: 'low' | 'medium' | 'high';
  skinTone: { r: number; g: number; b: number };
  irisColor: { r: number; g: number; b: number };
  hairColor: { r: number; g: number; b: number };
  enableBloom: boolean;
  enableColorGrading: boolean;
  shadowMapSize: 512 | 1024 | 2048;

  // Lighting configuration (optional, for runtime updates)
  lightDirection?: THREE.Vector3;
  lightColor?: { r: number; g: number; b: number };
  ambientColor?: { r: number; g: number; b: number };
}

/**
 * Material Mapping Interface
 *
 * Tracks the mapping between original materials and shader materials.
 */
export interface MaterialMapping {
  meshName: string;
  originalMaterial: THREE.Material;
  shaderMaterial: THREE.ShaderMaterial;
  type: 'skin' | 'eyes' | 'hair' | 'other';
}

/**
 * Shader Compilation Status
 */
export interface ShaderStatus {
  compiled: boolean;
  errors: string[];
}

/**
 * Default Shader Configuration
 */
export const DEFAULT_SHADER_CONFIG: ShaderConfig = {
  quality: 'medium',
  skinTone: { r: 0.92, g: 0.78, b: 0.71 }, // Fair skin tone
  irisColor: { r: 0.4, g: 0.6, b: 0.8 }, // Blue eyes
  hairColor: { r: 0.3, g: 0.2, b: 0.1 }, // Brown hair
  enableBloom: true,
  enableColorGrading: true,
  shadowMapSize: 1024,
};

/**
 * Quality Preset Configurations
 *
 * Predefined quality settings for different performance levels.
 */
export const QUALITY_PRESETS: Record<'low' | 'medium' | 'high', Partial<ShaderConfig>> = {
  low: {
    quality: 'low',
    shadowMapSize: 512,
    enableBloom: false,
    enableColorGrading: false,
  },
  medium: {
    quality: 'medium',
    shadowMapSize: 1024,
    enableBloom: true,
    enableColorGrading: true,
  },
  high: {
    quality: 'high',
    shadowMapSize: 2048,
    enableBloom: true,
    enableColorGrading: true,
  },
};

/**
 * Material Naming Patterns
 *
 * Regular expressions to identify material types from mesh names.
 */
export const MATERIAL_PATTERNS = {
  skin: /skin|face|body/i,
  eyes: /eye|iris|cornea/i,
  hair: /hair|scalp/i,
};
