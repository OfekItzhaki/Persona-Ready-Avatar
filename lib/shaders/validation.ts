/**
 * Shader Configuration Validation
 *
 * Validates shader configuration values and provides defaults for invalid inputs.
 *
 * Requirements: 8.3, 8.5
 */

import { ShaderConfig, DEFAULT_SHADER_CONFIG } from './types';

/**
 * Validate a color value (RGB in [0, 1])
 */
function isValidColor(color: { r: number; g: number; b: number }): boolean {
  return (
    typeof color.r === 'number' &&
    color.r >= 0 &&
    color.r <= 1 &&
    typeof color.g === 'number' &&
    color.g >= 0 &&
    color.g <= 1 &&
    typeof color.b === 'number' &&
    color.b >= 0 &&
    color.b <= 1
  );
}

/**
 * Validate shadow map size
 */
function isValidShadowMapSize(size: number): size is 512 | 1024 | 2048 {
  return size === 512 || size === 1024 || size === 2048;
}

/**
 * Validate quality level
 */
function isValidQuality(quality: string): quality is 'low' | 'medium' | 'high' {
  return quality === 'low' || quality === 'medium' || quality === 'high';
}

/**
 * Validate and sanitize shader configuration
 *
 * Validates all configuration values and replaces invalid values with defaults.
 * Logs warnings for invalid inputs.
 *
 * @param config - Partial configuration to validate
 * @returns Validated complete configuration
 */
export function validateShaderConfig(config: Partial<ShaderConfig>): ShaderConfig {
  const validated: ShaderConfig = { ...DEFAULT_SHADER_CONFIG };

  // Validate quality
  if (config.quality !== undefined) {
    if (isValidQuality(config.quality)) {
      validated.quality = config.quality;
    } else {
      console.warn(
        `Invalid quality value: ${config.quality}. Using default: ${DEFAULT_SHADER_CONFIG.quality}`
      );
    }
  }

  // Validate skin tone
  if (config.skinTone !== undefined) {
    if (isValidColor(config.skinTone)) {
      validated.skinTone = config.skinTone;
    } else {
      console.warn('Invalid skinTone value. Using default.');
    }
  }

  // Validate iris color
  if (config.irisColor !== undefined) {
    if (isValidColor(config.irisColor)) {
      validated.irisColor = config.irisColor;
    } else {
      console.warn('Invalid irisColor value. Using default.');
    }
  }

  // Validate hair color
  if (config.hairColor !== undefined) {
    if (isValidColor(config.hairColor)) {
      validated.hairColor = config.hairColor;
    } else {
      console.warn('Invalid hairColor value. Using default.');
    }
  }

  // Validate light color
  if (config.lightColor !== undefined) {
    if (isValidColor(config.lightColor)) {
      validated.lightColor = config.lightColor;
    } else {
      console.warn('Invalid lightColor value. Using default.');
    }
  }

  // Validate ambient color
  if (config.ambientColor !== undefined) {
    if (isValidColor(config.ambientColor)) {
      validated.ambientColor = config.ambientColor;
    } else {
      console.warn('Invalid ambientColor value. Using default.');
    }
  }

  // Validate shadow map size
  if (config.shadowMapSize !== undefined) {
    if (isValidShadowMapSize(config.shadowMapSize)) {
      validated.shadowMapSize = config.shadowMapSize;
    } else {
      console.warn(
        `Invalid shadowMapSize value: ${config.shadowMapSize}. Using default: ${DEFAULT_SHADER_CONFIG.shadowMapSize}`
      );
    }
  }

  // Validate boolean flags
  if (config.enableBloom !== undefined) {
    if (typeof config.enableBloom === 'boolean') {
      validated.enableBloom = config.enableBloom;
    } else {
      console.warn('Invalid enableBloom value. Using default.');
    }
  }

  if (config.enableColorGrading !== undefined) {
    if (typeof config.enableColorGrading === 'boolean') {
      validated.enableColorGrading = config.enableColorGrading;
    } else {
      console.warn('Invalid enableColorGrading value. Using default.');
    }
  }

  // Pass through light direction (validated by Three.js Vector3)
  if (config.lightDirection !== undefined) {
    validated.lightDirection = config.lightDirection;
  }

  return validated;
}
