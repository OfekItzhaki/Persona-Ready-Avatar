import * as THREE from 'three';

export interface LightingConfig {
  directionalLightIntensity: number;
  directionalLightColor: THREE.Color;
  directionalLightPosition: THREE.Vector3;
  ambientLightIntensity: number;
  ambientLightColor: THREE.Color;
  shadowMapSize: 512 | 1024 | 2048;
  enableShadows: boolean;
}

export const DEFAULT_LIGHTING_CONFIG: LightingConfig = {
  directionalLightIntensity: 1.0,
  directionalLightColor: new THREE.Color(0xffffff),
  directionalLightPosition: new THREE.Vector3(5, 5, 5),
  ambientLightIntensity: 0.4,
  ambientLightColor: new THREE.Color(0xffffff),
  shadowMapSize: 1024,
  enableShadows: true,
};

export class LightingSystem {
  private directionalLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private config: LightingConfig;

  constructor(config: Partial<LightingConfig> = {}) {
    this.config = { ...DEFAULT_LIGHTING_CONFIG, ...config };

    // Create directional light with shadow casting
    this.directionalLight = new THREE.DirectionalLight(
      this.config.directionalLightColor,
      this.config.directionalLightIntensity
    );
    this.directionalLight.position.copy(this.config.directionalLightPosition);
    this.directionalLight.castShadow = this.config.enableShadows;

    // Configure shadow properties
    this.configureShadows();

    // Create ambient light
    this.ambientLight = new THREE.AmbientLight(
      this.config.ambientLightColor,
      this.config.ambientLightIntensity
    );
  }

  private configureShadows(): void {
    const shadowMapSize = this.config.shadowMapSize;
    this.directionalLight.shadow.mapSize.width = shadowMapSize;
    this.directionalLight.shadow.mapSize.height = shadowMapSize;

    if (!this.config.enableShadows) return;

    // Configure shadow camera for better quality
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -10;
    this.directionalLight.shadow.camera.right = 10;
    this.directionalLight.shadow.camera.top = 10;
    this.directionalLight.shadow.camera.bottom = -10;

    // Use PCF soft shadows
    this.directionalLight.shadow.radius = 2;
  }

  /**
   * Add lights to the scene
   */
  addToScene(scene: THREE.Scene): void {
    scene.add(this.directionalLight);
    scene.add(this.ambientLight);
  }

  /**
   * Remove lights from the scene
   */
  removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.directionalLight);
    scene.remove(this.ambientLight);
  }

  /**
   * Update lighting configuration at runtime
   */
  updateConfig(config: Partial<LightingConfig>): void {
    this.config = { ...this.config, ...config };

    // Update directional light
    if (config.directionalLightIntensity !== undefined) {
      this.directionalLight.intensity = config.directionalLightIntensity;
    }
    if (config.directionalLightColor !== undefined) {
      this.directionalLight.color = config.directionalLightColor;
    }
    if (config.directionalLightPosition !== undefined) {
      this.directionalLight.position.copy(config.directionalLightPosition);
    }

    // Update ambient light
    if (config.ambientLightIntensity !== undefined) {
      this.ambientLight.intensity = config.ambientLightIntensity;
    }
    if (config.ambientLightColor !== undefined) {
      this.ambientLight.color = config.ambientLightColor;
    }

    // Update shadows
    if (config.enableShadows !== undefined) {
      this.directionalLight.castShadow = config.enableShadows;
    }
    if (config.shadowMapSize !== undefined) {
      this.configureShadows();
    }
  }

  /**
   * Get the directional light for shader uniform updates
   */
  getDirectionalLight(): THREE.DirectionalLight {
    return this.directionalLight;
  }

  /**
   * Get the ambient light
   */
  getAmbientLight(): THREE.AmbientLight {
    return this.ambientLight;
  }

  /**
   * Get light direction vector (normalized)
   */
  getLightDirection(): THREE.Vector3 {
    return this.directionalLight.position.clone().normalize();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    if (this.directionalLight.shadow.map) {
      this.directionalLight.shadow.map.dispose();
    }
  }
}
