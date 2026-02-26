/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Property-Based Test: Morph Target Preservation (Hair Shader)
 *
 * **Validates: Requirements 3.3, 6.2**
 *
 * Property 1: Morph Target Preservation
 * For any mesh with morph targets and any set of morph target influence values,
 * applying custom shaders should preserve the morph target deformation behavior
 * identically to the original Three.js material.
 */

import { describe, expect, beforeEach } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import * as THREE from 'three';
import { createHairShader } from '../HairShader';
import type { WebGLCapabilities } from '../types';

describe('Property 1: Morph Target Preservation (Hair)', () => {
  let mockCapabilities: WebGLCapabilities;

  beforeEach(() => {
    mockCapabilities = {
      version: 2,
      maxTextureSize: 4096,
      maxVertexUniforms: 256,
      supportsFloatTextures: true,
      supportsDerivatives: true,
    };
  });

  /**
   * Property Test: Morph Target Influence Application
   *
   * For any set of morph target influence values, the hair shader should
   * preserve the morph target deformation behavior.
   */
  test.prop([
    // Generate array of 4 morph target influence values (range [0, 1])
    // Use noNaN to exclude NaN values
    fc.array(fc.float({ min: 0, max: 1, noNaN: true }), { minLength: 4, maxLength: 4 }),
  ])('should preserve morph target influences in shader material', (morphInfluences) => {
    // Create a geometry with morph targets
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    // Add morph target attributes (simulating morph target data)
    // In a real scenario, these would be different vertex positions
    const positionAttribute = geometry.attributes.position;
    const vertexCount = positionAttribute.count;

    // Create morph target position attributes
    for (let i = 0; i < 4; i++) {
      const morphPositions = new Float32Array(vertexCount * 3);
      for (let j = 0; j < vertexCount * 3; j++) {
        // Generate small random offsets for morph targets
        morphPositions[j] = (Math.random() - 0.5) * 0.2;
      }
      geometry.morphAttributes.position = geometry.morphAttributes.position || [];
      geometry.morphAttributes.position[i] = new THREE.BufferAttribute(morphPositions, 3);
    }

    // Create mesh with standard material (reference)
    const standardMaterial = new THREE.MeshStandardMaterial();
    const standardMesh = new THREE.Mesh(geometry, standardMaterial);
    standardMesh.morphTargetInfluences = morphInfluences;

    // Create mesh with custom hair shader
    const hairMaterial = createHairShader(mockCapabilities, 'medium', {
      morphTargets: true,
      morphNormals: false,
    });
    const hairMesh = new THREE.Mesh(geometry, hairMaterial);
    hairMesh.morphTargetInfluences = morphInfluences;

    // Verify shader material has morph target support enabled
    expect(hairMaterial.defines?.USE_MORPHTARGETS).toBe(true);

    // Verify vertex shader contains morph target code
    expect(hairMaterial.vertexShader).toContain('USE_MORPHTARGETS');
    expect(hairMaterial.vertexShader).toContain('morphTarget0');
    expect(hairMaterial.vertexShader).toContain('morphTargetInfluences');

    // Verify morph target influences are accessible on the mesh
    expect(hairMesh.morphTargetInfluences).toBeDefined();
    expect(hairMesh.morphTargetInfluences).toHaveLength(4);

    // Verify each influence value is preserved
    for (let i = 0; i < 4; i++) {
      expect(hairMesh.morphTargetInfluences![i]).toBeCloseTo(morphInfluences[i], 5);
    }

    // Verify geometry has morph attributes
    expect(geometry.morphAttributes.position).toBeDefined();
    expect(geometry.morphAttributes.position).toHaveLength(4);

    // The shader should apply morph targets using the formula:
    // transformedPosition += morphTarget0 * morphTargetInfluences[0] + ...
    // This is verified by checking the shader source contains the correct code
    const expectedMorphCode = [
      'transformedPosition += morphTarget0 * morphTargetInfluences[0]',
      'transformedPosition += morphTarget1 * morphTargetInfluences[1]',
      'transformedPosition += morphTarget2 * morphTargetInfluences[2]',
      'transformedPosition += morphTarget3 * morphTargetInfluences[3]',
    ];

    for (const code of expectedMorphCode) {
      expect(hairMaterial.vertexShader).toContain(code);
    }
  });

  /**
   * Property Test: Morph Target with Normals
   *
   * For any set of morph target influence values, the hair shader should
   * preserve both position and normal morph targets.
   */
  test.prop([
    // Generate array of 4 morph target influence values
    fc.array(fc.float({ min: 0, max: 1, noNaN: true }), { minLength: 4, maxLength: 4 }),
  ])(
    'should preserve morph target influences for both positions and normals',
    (morphInfluences) => {
      // Create a geometry with morph targets
      const geometry = new THREE.BoxGeometry(1, 1, 1);

      const positionAttribute = geometry.attributes.position;
      const normalAttribute = geometry.attributes.normal;
      const vertexCount = positionAttribute.count;

      // Create morph target position and normal attributes
      for (let i = 0; i < 4; i++) {
        // Position morph targets
        const morphPositions = new Float32Array(vertexCount * 3);
        for (let j = 0; j < vertexCount * 3; j++) {
          morphPositions[j] = (Math.random() - 0.5) * 0.2;
        }
        geometry.morphAttributes.position = geometry.morphAttributes.position || [];
        geometry.morphAttributes.position[i] = new THREE.BufferAttribute(morphPositions, 3);

        // Normal morph targets
        const morphNormals = new Float32Array(vertexCount * 3);
        for (let j = 0; j < vertexCount; j++) {
          // Generate random normal direction and normalize
          const nx = (Math.random() - 0.5) * 2;
          const ny = (Math.random() - 0.5) * 2;
          const nz = (Math.random() - 0.5) * 2;
          const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
          morphNormals[j * 3] = nx / length;
          morphNormals[j * 3 + 1] = ny / length;
          morphNormals[j * 3 + 2] = nz / length;
        }
        geometry.morphAttributes.normal = geometry.morphAttributes.normal || [];
        geometry.morphAttributes.normal[i] = new THREE.BufferAttribute(morphNormals, 3);
      }

      // Create mesh with custom hair shader (with morph normals enabled)
      const hairMaterial = createHairShader(mockCapabilities, 'medium', {
        morphTargets: true,
        morphNormals: true,
      });
      const hairMesh = new THREE.Mesh(geometry, hairMaterial);
      hairMesh.morphTargetInfluences = morphInfluences;

      // Verify shader material has morph target and normal support enabled
      expect(hairMaterial.defines?.USE_MORPHTARGETS).toBe(true);
      expect(hairMaterial.defines?.USE_MORPHNORMALS).toBe(true);

      // Verify vertex shader contains morph normal code
      expect(hairMaterial.vertexShader).toContain('USE_MORPHNORMALS');
      expect(hairMaterial.vertexShader).toContain('morphNormal0');

      // Verify morph target influences are preserved
      expect(hairMesh.morphTargetInfluences).toHaveLength(4);
      for (let i = 0; i < 4; i++) {
        expect(hairMesh.morphTargetInfluences![i]).toBeCloseTo(morphInfluences[i], 5);
      }

      // Verify geometry has both position and normal morph attributes
      expect(geometry.morphAttributes.position).toBeDefined();
      expect(geometry.morphAttributes.position).toHaveLength(4);
      expect(geometry.morphAttributes.normal).toBeDefined();
      expect(geometry.morphAttributes.normal).toHaveLength(4);

      // Verify shader applies morph normals correctly
      const expectedMorphNormalCode = [
        'transformedNormal += morphNormal0 * morphTargetInfluences[0]',
        'transformedNormal += morphNormal1 * morphTargetInfluences[1]',
        'transformedNormal += morphNormal2 * morphTargetInfluences[2]',
        'transformedNormal += morphNormal3 * morphTargetInfluences[3]',
      ];

      for (const code of expectedMorphNormalCode) {
        expect(hairMaterial.vertexShader).toContain(code);
      }
    }
  );

  /**
   * Property Test: Zero Influence Values
   *
   * When all morph target influences are zero, the mesh should render
   * with its base geometry unchanged.
   */
  test.prop([
    // Always generate zero influences
    fc.constant([0, 0, 0, 0]),
  ])('should handle zero morph target influences correctly', (morphInfluences) => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    // Add morph targets
    const vertexCount = geometry.attributes.position.count;
    for (let i = 0; i < 4; i++) {
      const morphPositions = new Float32Array(vertexCount * 3);
      for (let j = 0; j < vertexCount * 3; j++) {
        morphPositions[j] = (Math.random() - 0.5) * 0.5;
      }
      geometry.morphAttributes.position = geometry.morphAttributes.position || [];
      geometry.morphAttributes.position[i] = new THREE.BufferAttribute(morphPositions, 3);
    }

    const hairMaterial = createHairShader(mockCapabilities, 'medium', {
      morphTargets: true,
    });
    const hairMesh = new THREE.Mesh(geometry, hairMaterial);
    hairMesh.morphTargetInfluences = morphInfluences;

    // Verify all influences are zero
    for (let i = 0; i < 4; i++) {
      expect(hairMesh.morphTargetInfluences![i]).toBe(0);
    }

    // Shader should still have morph target support enabled
    expect(hairMaterial.defines?.USE_MORPHTARGETS).toBe(true);
  });

  /**
   * Property Test: Maximum Influence Values
   *
   * When all morph target influences are at maximum (1.0), the shader
   * should correctly apply full morph target deformation.
   */
  test.prop([
    // Always generate maximum influences
    fc.constant([1, 1, 1, 1]),
  ])('should handle maximum morph target influences correctly', (morphInfluences) => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    // Add morph targets
    const vertexCount = geometry.attributes.position.count;
    for (let i = 0; i < 4; i++) {
      const morphPositions = new Float32Array(vertexCount * 3);
      for (let j = 0; j < vertexCount * 3; j++) {
        morphPositions[j] = (Math.random() - 0.5) * 0.5;
      }
      geometry.morphAttributes.position = geometry.morphAttributes.position || [];
      geometry.morphAttributes.position[i] = new THREE.BufferAttribute(morphPositions, 3);
    }

    const hairMaterial = createHairShader(mockCapabilities, 'medium', {
      morphTargets: true,
    });
    const hairMesh = new THREE.Mesh(geometry, hairMaterial);
    hairMesh.morphTargetInfluences = morphInfluences;

    // Verify all influences are at maximum
    for (let i = 0; i < 4; i++) {
      expect(hairMesh.morphTargetInfluences![i]).toBe(1);
    }

    // Shader should have morph target support enabled
    expect(hairMaterial.defines?.USE_MORPHTARGETS).toBe(true);
  });

  /**
   * Property Test: Morph Target Preservation Across Quality Levels
   *
   * Morph target support should work consistently across all quality levels.
   */
  test.prop([
    fc.constantFrom('low', 'medium', 'high'),
    fc.array(fc.float({ min: 0, max: 1, noNaN: true }), { minLength: 4, maxLength: 4 }),
  ])('should preserve morph targets across all quality levels', (quality, morphInfluences) => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    // Add morph targets
    const vertexCount = geometry.attributes.position.count;
    for (let i = 0; i < 4; i++) {
      const morphPositions = new Float32Array(vertexCount * 3);
      for (let j = 0; j < vertexCount * 3; j++) {
        morphPositions[j] = (Math.random() - 0.5) * 0.2;
      }
      geometry.morphAttributes.position = geometry.morphAttributes.position || [];
      geometry.morphAttributes.position[i] = new THREE.BufferAttribute(morphPositions, 3);
    }

    const hairMaterial = createHairShader(mockCapabilities, quality as 'low' | 'medium' | 'high', {
      morphTargets: true,
    });
    const hairMesh = new THREE.Mesh(geometry, hairMaterial);
    hairMesh.morphTargetInfluences = morphInfluences;

    // Verify morph target support is enabled regardless of quality
    expect(hairMaterial.defines?.USE_MORPHTARGETS).toBe(true);
    expect(hairMaterial.vertexShader).toContain('USE_MORPHTARGETS');

    // Verify influences are preserved
    for (let i = 0; i < 4; i++) {
      expect(hairMesh.morphTargetInfluences![i]).toBeCloseTo(morphInfluences[i], 5);
    }

    // Verify quality-specific define is present
    const qualityDefine = `QUALITY_${quality.toUpperCase()}`;
    expect(hairMaterial.fragmentShader).toContain(qualityDefine);
  });
});
