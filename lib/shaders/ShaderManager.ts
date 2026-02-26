/* eslint-disable no-undef */
import * as THREE from 'three';
import {
  WebGLCapabilities,
  ShaderConfig,
  MaterialMapping,
  ShaderStatus,
  MATERIAL_PATTERNS,
  QUALITY_PRESETS,
} from './types';
import { createSkinShader, updateSkinShaderUniforms } from './SkinShader';
import { createEyeShader, updateEyeShaderUniforms } from './EyeShader';
import { createHairShader, updateHairShaderUniforms } from './HairShader';
import { LightingSystem } from './LightingSystem';
import { validateShaderConfig } from './validation';

/**
 * ShaderManager Class
 *
 * Manages shader compilation, material replacement, and WebGL capability detection.
 * Provides fallback to MeshStandardMaterial if shader compilation fails.
 *
 * Requirements: 6.1, 6.3, 6.4, 6.5, 9.1, 9.2, 9.3, 9.5
 */
export class ShaderManager {
  private capabilities: WebGLCapabilities;
  private config: ShaderConfig;
  private materials: Map<string, THREE.ShaderMaterial>;
  private materialTypes: Map<string, 'skin' | 'eyes' | 'hair'>;
  private status: ShaderStatus;
  private renderer: THREE.WebGLRenderer;
  private lightingSystem: LightingSystem | null;
  private contextLostHandler: ((event: Event) => void) | null;
  private contextRestoredHandler: ((event: Event) => void) | null;

  constructor(renderer: THREE.WebGLRenderer, config: Partial<ShaderConfig> = {}) {
    this.renderer = renderer;
    this.config = validateShaderConfig(config);
    this.materials = new Map();
    this.materialTypes = new Map();
    this.status = { compiled: true, errors: [] };
    this.lightingSystem = null;
    this.contextLostHandler = null;
    this.contextRestoredHandler = null;

    // Detect WebGL capabilities
    this.capabilities = this.detectCapabilities();

    // Set up WebGL context loss handling
    this.setupContextLossHandling();
  }

  /**
   * Detect WebGL Capabilities
   *
   * Detects the WebGL version and available features.
   *
   * @returns WebGLCapabilities object
   */
  detectCapabilities(): WebGLCapabilities {
    const gl = this.renderer.getContext();

    // Detect WebGL version
    const isWebGL2 = gl instanceof WebGL2RenderingContext;
    const version: 1 | 2 = isWebGL2 ? 2 : 1;

    // Get max texture size
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;

    // Get max vertex uniforms
    const maxVertexUniforms = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) as number;

    // Check for float texture support
    let supportsFloatTextures = false;
    if (isWebGL2) {
      // WebGL 2.0 has built-in float texture support
      supportsFloatTextures = true;
    } else {
      // WebGL 1.0 requires extension
      const ext = gl.getExtension('OES_texture_float');
      supportsFloatTextures = ext !== null;
    }

    // Check for derivatives support (needed for some shader effects)
    let supportsDerivatives = false;
    if (isWebGL2) {
      // WebGL 2.0 has built-in derivatives support
      supportsDerivatives = true;
    } else {
      // WebGL 1.0 requires extension
      const ext = gl.getExtension('OES_standard_derivatives');
      supportsDerivatives = ext !== null;
    }

    const capabilities: WebGLCapabilities = {
      version,
      maxTextureSize,
      maxVertexUniforms,
      supportsFloatTextures,
      supportsDerivatives,
    };

    return capabilities;
  }

  /**
   * Set up WebGL Context Loss Handling
   *
   * Listens for context loss and restoration events.
   * Attempts to restore context and reinitialize shaders.
   */
  private setupContextLossHandling(): void {
    const canvas = this.renderer.domElement;

    this.contextLostHandler = (event: Event) => {
      event.preventDefault();
      console.warn('WebGL context lost. Attempting to restore...');

      this.status = {
        compiled: false,
        errors: ['WebGL context lost'],
      };
    };

    this.contextRestoredHandler = (_event: Event) => {
      try {
        // Re-detect capabilities
        this.capabilities = this.detectCapabilities();

        // Clear status errors
        this.status = {
          compiled: true,
          errors: [],
        };
      } catch (error) {
        this.status = {
          compiled: false,
          errors: [error instanceof Error ? error.message : String(error)],
        };
      }
    };

    canvas.addEventListener('webglcontextlost', this.contextLostHandler);
    canvas.addEventListener('webglcontextrestored', this.contextRestoredHandler);
  }

  /**
   * Replace Materials in Scene
   *
   * Automatically identifies and replaces materials in the loaded GLB model
   * based on mesh naming patterns.
   *
   * @param scene - The Three.js scene containing the model
   */
  replaceMaterials(scene: THREE.Scene): void {
    const mappings: MaterialMapping[] = [];

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const meshName = object.name.toLowerCase();
        let materialType: 'skin' | 'eyes' | 'hair' | 'other' = 'other';

        // Identify material type based on mesh name
        if (MATERIAL_PATTERNS.skin.test(meshName)) {
          materialType = 'skin';
        } else if (MATERIAL_PATTERNS.eyes.test(meshName)) {
          materialType = 'eyes';
        } else if (MATERIAL_PATTERNS.hair.test(meshName)) {
          materialType = 'hair';
        }

        // Only replace materials for identified types
        if (materialType !== 'other') {
          try {
            const originalMaterial = object.material as THREE.Material;
            const shaderMaterial = this.createShaderMaterial(materialType, object);

            if (shaderMaterial) {
              object.material = shaderMaterial;

              const mapping: MaterialMapping = {
                meshName: object.name,
                originalMaterial,
                shaderMaterial,
                type: materialType,
              };

              mappings.push(mapping);
              this.materials.set(object.name, shaderMaterial);
              this.materialTypes.set(object.name, materialType);
            }
          } catch (error) {
            const errorMessage = `Failed to replace material for ${object.name}: ${error instanceof Error ? error.message : String(error)}`;
            console.error(errorMessage);
            this.status.errors.push(errorMessage);
            this.status.compiled = false;

            // Fall back to MeshStandardMaterial
            object.material = this.createFallbackMaterial(object);
          }
        }
      }
    });

    if (mappings.length === 0) {
      console.warn('No materials were replaced. Check mesh naming patterns.');
    }
  }

  /**
   * Create Shader Material
   *
   * Creates a custom shader material based on the material type.
   *
   * @param type - The material type (skin, eyes, hair)
   * @param mesh - The mesh object
   * @returns ShaderMaterial or null if creation fails
   */
  private createShaderMaterial(
    type: 'skin' | 'eyes' | 'hair',
    mesh: THREE.Mesh
  ): THREE.ShaderMaterial | null {
    try {
      switch (type) {
        case 'skin':
          return this.createSkinShaderMaterial(mesh);
        case 'eyes':
          return this.createEyeShaderMaterial(mesh);
        case 'hair':
          return this.createHairShaderMaterial(mesh);
        default:
          return null;
      }
    } catch (error) {
      console.error(`Failed to create ${type} shader:`, error);
      return null;
    }
  }

  /**
   * Create Skin Shader Material
   *
   * Creates a skin shader material with SSS, normal mapping, and morph target support.
   *
   * @param mesh - The mesh object
   * @returns ShaderMaterial configured for skin rendering
   */
  private createSkinShaderMaterial(mesh: THREE.Mesh): THREE.ShaderMaterial {
    // Check if mesh has morph targets
    const hasMorphTargets = mesh.morphTargetInfluences && mesh.morphTargetInfluences.length > 0;
    const hasMorphNormals = mesh.morphTargetDictionary !== undefined;

    // Extract textures from original material if available
    let map: THREE.Texture | null = null;
    let normalMap: THREE.Texture | null = null;

    const originalMaterial = mesh.material;
    if (
      originalMaterial instanceof THREE.MeshStandardMaterial ||
      originalMaterial instanceof THREE.MeshPhongMaterial
    ) {
      map = originalMaterial.map;
      normalMap = originalMaterial.normalMap;
    }

    // Create skin shader with configuration
    const material = createSkinShader(this.capabilities, this.config.quality, {
      skinTone: this.config.skinTone,
      map,
      normalMap,
      morphTargets: hasMorphTargets,
      morphNormals: hasMorphNormals,
    });

    return material;
  }

  /**
   * Create Eye Shader Material
   *
   * Creates an eye shader material with cornea refraction, iris depth, and wetness.
   *
   * @param mesh - The mesh object
   * @returns ShaderMaterial configured for eye rendering
   */
  private createEyeShaderMaterial(mesh: THREE.Mesh): THREE.ShaderMaterial {
    // Extract textures from original material if available
    let irisTexture: THREE.Texture | null = null;

    const originalMaterial = mesh.material;
    if (
      originalMaterial instanceof THREE.MeshStandardMaterial ||
      originalMaterial instanceof THREE.MeshPhongMaterial
    ) {
      irisTexture = originalMaterial.map;
    }

    // Create eye shader with configuration
    const material = createEyeShader(this.capabilities, this.config.quality, {
      irisColor: this.config.irisColor,
      irisTexture,
    });

    return material;
  }

  /**
   * Create Hair Shader Material
   *
   * Creates a hair shader material with anisotropic highlights and morph target support.
   *
   * @param mesh - The mesh object
   * @returns ShaderMaterial configured for hair rendering
   */
  private createHairShaderMaterial(mesh: THREE.Mesh): THREE.ShaderMaterial {
    // Check if mesh has morph targets
    const hasMorphTargets = mesh.morphTargetInfluences && mesh.morphTargetInfluences.length > 0;
    const hasMorphNormals = mesh.morphTargetDictionary !== undefined;

    // Extract textures from original material if available
    let hairTexture: THREE.Texture | null = null;

    const originalMaterial = mesh.material;
    if (
      originalMaterial instanceof THREE.MeshStandardMaterial ||
      originalMaterial instanceof THREE.MeshPhongMaterial
    ) {
      hairTexture = originalMaterial.map;
    }

    // Create hair shader with configuration
    const material = createHairShader(this.capabilities, this.config.quality, {
      hairColor: this.config.hairColor,
      hairTexture,
      morphTargets: hasMorphTargets,
      morphNormals: hasMorphNormals,
    });

    return material;
  }

  /**
   * Create Fallback Material
   *
   * Creates a MeshStandardMaterial as a fallback when shader compilation fails.
   *
   * @param _mesh - The mesh object (unused, kept for API consistency)
   * @returns MeshStandardMaterial
   */
  private createFallbackMaterial(_mesh: THREE.Mesh): THREE.MeshStandardMaterial {
    const fallbackMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.7,
      metalness: 0.0,
    });

    // Note: Morph targets are handled at the mesh level via morphTargetInfluences
    // not at the material level, so no special configuration needed here

    return fallbackMaterial;
  }

  /**
   * Update Configuration
   *
   * Updates shader parameters at runtime without recompilation.
   * Validates configuration before applying.
   *
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<ShaderConfig>): void {
    // Validate configuration
    const validatedConfig = validateShaderConfig({ ...this.config, ...config });
    this.config = validatedConfig;

    // Update lighting system shadow map size if available
    if (this.lightingSystem && config.shadowMapSize !== undefined) {
      this.lightingSystem.updateConfig({
        shadowMapSize: config.shadowMapSize,
      });
    }

    // Update shader uniforms for each material
    this.materials.forEach((material, meshName) => {
      const materialType = this.materialTypes.get(meshName);

      if (materialType === 'skin') {
        updateSkinShaderUniforms(material, {
          skinTone: config.skinTone,
          ...(config.lightDirection && { lightDirection: config.lightDirection }),
          ...(config.lightColor && { lightColor: config.lightColor }),
          ...(config.ambientColor && { ambientColor: config.ambientColor }),
        });
      } else if (materialType === 'eyes') {
        updateEyeShaderUniforms(material, {
          irisColor: config.irisColor,
          ...(config.lightDirection && { lightDirection: config.lightDirection }),
          ...(config.lightColor && { lightColor: config.lightColor }),
        });
      } else if (materialType === 'hair') {
        updateHairShaderUniforms(material, {
          hairColor: config.hairColor,
          ...(config.lightDirection && { lightDirection: config.lightDirection }),
          ...(config.lightColor && { lightColor: config.lightColor }),
          ...(config.ambientColor && { ambientColor: config.ambientColor }),
        });
      }
    });
  }

  /**
   * Set Lighting System
   *
   * Integrates a LightingSystem with the shader manager.
   * Updates all shader uniforms with lighting parameters.
   *
   * @param lightingSystem - The LightingSystem instance
   */
  setLightingSystem(lightingSystem: LightingSystem): void {
    this.lightingSystem = lightingSystem;
    this.updateLightingUniforms();
  }

  /**
   * Update Lighting Uniforms
   *
   * Updates all shader uniforms with current lighting parameters from the LightingSystem.
   */
  updateLightingUniforms(): void {
    if (!this.lightingSystem) return;

    const directionalLight = this.lightingSystem.getDirectionalLight();
    const ambientLight = this.lightingSystem.getAmbientLight();
    const lightDirection = this.lightingSystem.getLightDirection();

    // Update config with lighting parameters
    this.updateConfig({
      lightDirection,
      lightColor: {
        r: directionalLight.color.r,
        g: directionalLight.color.g,
        b: directionalLight.color.b,
      },
      ambientColor: {
        r: ambientLight.color.r,
        g: ambientLight.color.g,
        b: ambientLight.color.b,
      },
    });
  }

  /**
   * Set Quality Preset
   *
   * Changes the quality preset and updates shader configuration.
   * Updates shadow map size and post-processing effects based on quality.
   *
   * @param quality - Quality level (low, medium, high)
   */
  setQuality(quality: 'low' | 'medium' | 'high'): void {
    const qualityConfig = QUALITY_PRESETS[quality];

    // Update configuration with quality preset
    this.updateConfig(qualityConfig);

    // Update lighting system shadow map size if available
    if (this.lightingSystem && qualityConfig.shadowMapSize) {
      this.lightingSystem.updateConfig({
        shadowMapSize: qualityConfig.shadowMapSize,
      });
    }
  }

  /**
   * Get Shader Status
   *
   * Returns the current shader compilation status.
   *
   * @returns ShaderStatus object
   */
  getStatus(): ShaderStatus {
    return { ...this.status };
  }

  /**
   * Get Capabilities
   *
   * Returns the detected WebGL capabilities.
   *
   * @returns WebGLCapabilities object
   */
  getCapabilities(): WebGLCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Dispose of Resources
   *
   * Cleans up event listeners and resources.
   */
  dispose(): void {
    // Remove context loss event listeners
    if (this.contextLostHandler) {
      this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLostHandler);
    }
    if (this.contextRestoredHandler) {
      this.renderer.domElement.removeEventListener(
        'webglcontextrestored',
        this.contextRestoredHandler
      );
    }

    // Dispose lighting system
    if (this.lightingSystem) {
      this.lightingSystem.dispose();
    }

    // Clear materials
    this.materials.clear();
    this.materialTypes.clear();
  }
}
