import { GLTF } from 'three-stdlib';
import * as THREE from 'three';
import {
  AvatarValidationResult,
  AvatarMetadata,
  AvatarValidationError,
  AvatarValidationWarning,
  VISEME_BLENDSHAPE_MAP,
} from '@/types';
import { logger } from '@/lib/logger';

/**
 * AvatarValidatorService
 * 
 * Validates GLB avatar models for compatibility with the avatar system.
 * Checks for required meshes, blendshapes, and viseme compatibility.
 * 
 * Requirements: 1.3, 8.1, 8.3, 11.1, 11.2, 11.3, 11.4
 */
export class AvatarValidatorService {
  /**
   * Validates a loaded GLTF model for avatar compatibility
   * 
   * @param gltf - The loaded GLTF model
   * @returns Validation result with errors, warnings, and metadata
   */
  validateModel(gltf: GLTF): AvatarValidationResult {
    const errors: AvatarValidationError[] = [];
    const warnings: AvatarValidationWarning[] = [];

    // Extract metadata first
    const metadata = this.extractMetadata(gltf);

    // Validate GLB format (basic check - if we got here, it's likely valid)
    if (!gltf.scene) {
      errors.push({
        type: 'INVALID_GLB',
        message: 'Invalid GLB file: missing scene data',
      });
    }

    // Validate mesh presence (Requirement 11.3)
    if (metadata.meshCount === 0) {
      errors.push({
        type: 'NO_MESH',
        message: 'Avatar model contains no mesh nodes',
      });
    }

    // Check for missing viseme blendshapes (Requirement 1.3, 8.1)
    const missingBlendshapes = this.checkVisemeCompatibility(gltf);
    if (missingBlendshapes.length > 0) {
      warnings.push({
        type: 'MISSING_BLENDSHAPES',
        blendshapes: missingBlendshapes,
      });
    }

    // Check for high polygon count (performance warning)
    if (metadata.triangleCount > 100000) {
      warnings.push({
        type: 'HIGH_POLY_COUNT',
        triangles: metadata.triangleCount,
      });
    }

    // Check for large file size (performance warning)
    if (metadata.fileSize > 10 * 1024 * 1024) { // 10MB
      warnings.push({
        type: 'LARGE_FILE_SIZE',
        sizeBytes: metadata.fileSize,
      });
    }

    const valid = errors.length === 0;

    // Log validation results
    if (!valid) {
      logger.error('Avatar validation failed', {
        component: 'AvatarValidatorService',
        errors,
        warnings,
        metadata,
      });
    } else if (warnings.length > 0) {
      logger.warn('Avatar validation completed with warnings', {
        component: 'AvatarValidatorService',
        warnings,
        metadata,
      });
    } else {
      logger.info('Avatar validation successful', {
        component: 'AvatarValidatorService',
        metadata,
      });
    }

    return {
      valid,
      errors,
      warnings,
      metadata,
    };
  }

  /**
   * Checks if the avatar model contains all required viseme blendshapes
   * 
   * @param gltf - The loaded GLTF model
   * @returns Array of missing blendshape names
   */
  checkVisemeCompatibility(gltf: GLTF): string[] {
    const missingBlendshapes: string[] = [];

    // Find mesh with morph targets
    const meshWithMorphTargets = this.findMeshWithMorphTargets(gltf);

    if (!meshWithMorphTargets || !meshWithMorphTargets.morphTargetDictionary) {
      // No morph targets found - all viseme blendshapes are missing
      const allVisemeBlendshapes = Object.values(VISEME_BLENDSHAPE_MAP);
      const uniqueBlendshapes = Array.from(new Set(allVisemeBlendshapes));
      return uniqueBlendshapes;
    }

    // Check each viseme blendshape
    const requiredBlendshapes = Object.values(VISEME_BLENDSHAPE_MAP);
    const uniqueRequired = Array.from(new Set(requiredBlendshapes));

    for (const blendshapeName of uniqueRequired) {
      if (!(blendshapeName in meshWithMorphTargets.morphTargetDictionary)) {
        missingBlendshapes.push(blendshapeName);
      }
    }

    return missingBlendshapes;
  }

  /**
   * Extracts metadata from a GLTF model
   * 
   * @param gltf - The loaded GLTF model
   * @returns Avatar metadata including mesh count, triangle count, and blendshapes
   */
  extractMetadata(gltf: GLTF): AvatarMetadata {
    let meshCount = 0;
    let triangleCount = 0;
    let blendshapeCount = 0;
    const availableBlendshapes: string[] = [];

    // Traverse scene to count meshes and triangles
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        meshCount++;

        // Count triangles
        if (object.geometry) {
          const geometry = object.geometry;
          if (geometry.index) {
            triangleCount += geometry.index.count / 3;
          } else if (geometry.attributes.position) {
            triangleCount += geometry.attributes.position.count / 3;
          }
        }

        // Extract blendshape information
        if (object.morphTargetDictionary && object.morphTargetInfluences) {
          blendshapeCount = object.morphTargetInfluences.length;
          availableBlendshapes.push(...Object.keys(object.morphTargetDictionary));
        }
      }
    });

    // Check for missing viseme blendshapes
    const missingVisemeBlendshapes = this.checkVisemeCompatibility(gltf);

    // Estimate file size (approximate based on geometry data)
    let fileSize = 0;
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry) {
        const geometry = object.geometry;
        // Approximate size based on vertex count and attributes
        const vertexCount = geometry.attributes.position?.count || 0;
        const attributeSize = 12; // 3 floats (position) * 4 bytes
        fileSize += vertexCount * attributeSize;
      }
    });

    return {
      meshCount,
      triangleCount: Math.round(triangleCount),
      blendshapeCount,
      availableBlendshapes,
      missingVisemeBlendshapes,
      fileSize,
    };
  }

  /**
   * Finds the first mesh with morph targets in the GLTF scene
   * 
   * @param gltf - The loaded GLTF model
   * @returns Mesh with morph targets, or null if none found
   */
  private findMeshWithMorphTargets(gltf: GLTF): THREE.Mesh | null {
    let meshWithMorphTargets: THREE.Mesh | null = null;

    gltf.scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        object.morphTargetDictionary &&
        object.morphTargetInfluences &&
        object.morphTargetInfluences.length > 0
      ) {
        meshWithMorphTargets = object;
      }
    });

    return meshWithMorphTargets;
  }
}

// Export singleton instance
export const avatarValidatorService = new AvatarValidatorService();
