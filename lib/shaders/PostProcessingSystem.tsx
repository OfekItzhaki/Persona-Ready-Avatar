/**
 * PostProcessingSystem Component
 *
 * Provides post-processing effects for the avatar rendering pipeline including:
 * - Anti-aliasing (FXAA or SMAA)
 * - Bloom effect for highlights
 * - Color grading for consistent visual tone
 * - SSAO (Screen Space Ambient Occlusion) for depth
 *
 * Requirements: 5.1, 5.2, 5.3, 5.5, 4.3
 */

import React from 'react';
import { EffectComposer, Bloom, SMAA, ToneMapping, SSAO } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';

export interface PostProcessingConfig {
  enableAntiAliasing: boolean;
  enableBloom: boolean;
  enableColorGrading: boolean;
  enableSSAO: boolean;
  bloomIntensity: number;
  bloomRadius: number;
  ssaoIntensity: number;
  ssaoRadius: number;
}

export const DEFAULT_POST_PROCESSING_CONFIG: PostProcessingConfig = {
  enableAntiAliasing: true,
  enableBloom: true,
  enableColorGrading: true,
  enableSSAO: true,
  bloomIntensity: 0.3,
  bloomRadius: 0.8,
  ssaoIntensity: 0.5,
  ssaoRadius: 0.5,
};

export interface PostProcessingSystemProps {
  config?: Partial<PostProcessingConfig>;
}

/**
 * PostProcessingSystem Component
 *
 * Wraps the EffectComposer with configurable post-processing effects.
 * Effects can be toggled independently at runtime.
 */
export const PostProcessingSystem: React.FC<PostProcessingSystemProps> = ({ config = {} }) => {
  const finalConfig = { ...DEFAULT_POST_PROCESSING_CONFIG, ...config };

  return (
    <EffectComposer>
      <>
        {finalConfig.enableAntiAliasing && <SMAA />}

        {finalConfig.enableBloom && (
          <Bloom
            intensity={finalConfig.bloomIntensity}
            luminanceThreshold={0.9}
            luminanceSmoothing={0.9}
            radius={finalConfig.bloomRadius}
            mipmapBlur
          />
        )}

        {finalConfig.enableSSAO && (
          <SSAO
            blendFunction={BlendFunction.MULTIPLY}
            samples={16}
            radius={finalConfig.ssaoRadius}
            intensity={finalConfig.ssaoIntensity}
            luminanceInfluence={0.5}
            color={new THREE.Color('black')}
          />
        )}

        {finalConfig.enableColorGrading && (
          <ToneMapping
            mode={ToneMappingMode.ACES_FILMIC}
            resolution={256}
            whitePoint={4.0}
            middleGrey={0.6}
            minLuminance={0.01}
            averageLuminance={1.0}
            adaptationRate={1.0}
          />
        )}
      </>
    </EffectComposer>
  );
};
