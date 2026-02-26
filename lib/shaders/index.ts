/**
 * Shader Module
 *
 * Exports shader management functionality for the avatar rendering system.
 */

export { ShaderManager } from './ShaderManager';
export { LightingSystem, DEFAULT_LIGHTING_CONFIG, type LightingConfig } from './LightingSystem';
export {
  PostProcessingSystem,
  DEFAULT_POST_PROCESSING_CONFIG,
  type PostProcessingConfig,
  type PostProcessingSystemProps,
} from './PostProcessingSystem';
export { PerformanceMonitor, type PerformanceMetrics } from './PerformanceMonitor';
export { validateShaderConfig } from './validation';
export { useShaderManager, type UseShaderManagerResult } from './useShaderManager';
export type { WebGLCapabilities, ShaderConfig, MaterialMapping, ShaderStatus } from './types';
export { DEFAULT_SHADER_CONFIG, MATERIAL_PATTERNS, QUALITY_PRESETS } from './types';
export { getSkinShaderSource, getEyeShaderSource, getHairShaderSource } from './loaders';
export type { ShaderSource } from './loaders';
export {
  createSkinShader,
  updateSkinShaderUniforms,
  type SkinShaderUniforms,
  type SkinShaderConfig,
} from './SkinShader';
export {
  createEyeShader,
  updateEyeShaderUniforms,
  type EyeShaderUniforms,
  type EyeShaderConfig,
} from './EyeShader';
export {
  createHairShader,
  updateHairShaderUniforms,
  type HairShaderUniforms,
  type HairShaderConfig,
} from './HairShader';
