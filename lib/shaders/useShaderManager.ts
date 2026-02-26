/**
 * useShaderManager React Hook
 *
 * Provides shader management functionality with state management for React components.
 * Handles configuration persistence across re-renders.
 *
 * Requirements: 8.2, 8.4
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ShaderManager } from './ShaderManager';
import { ShaderConfig, ShaderStatus } from './types';

export interface UseShaderManagerResult {
  shaderManager: ShaderManager | null;
  status: ShaderStatus;
  updateConfig: (config: Partial<ShaderConfig>) => void;
  setQuality: (quality: 'low' | 'medium' | 'high') => void;
}

/**
 * useShaderManager Hook
 *
 * Creates and manages a ShaderManager instance with React state.
 * Configuration persists across re-renders.
 *
 * @param renderer - Three.js WebGLRenderer instance
 * @param initialConfig - Initial shader configuration
 * @returns ShaderManager instance, status, and update functions
 */
export function useShaderManager(
  renderer: THREE.WebGLRenderer | null,
  initialConfig: Partial<ShaderConfig> = {}
): UseShaderManagerResult {
  const [shaderManager, setShaderManager] = useState<ShaderManager | null>(null);
  const [status, setStatus] = useState<ShaderStatus>({ compiled: true, errors: [] });
  const configRef = useRef<Partial<ShaderConfig>>(initialConfig);

  // Initialize ShaderManager when renderer is available
  useEffect(() => {
    if (!renderer) {
      return;
    }

    try {
      const manager = new ShaderManager(renderer, configRef.current);
      setShaderManager(manager);
      setStatus(manager.getStatus());
    } catch (error) {
      console.error('Failed to initialize ShaderManager:', error);
      setStatus({
        compiled: false,
        errors: [error instanceof Error ? error.message : String(error)],
      });
    }
  }, [renderer]);

  /**
   * Update shader configuration at runtime
   */
  const updateConfig = useCallback(
    (config: Partial<ShaderConfig>) => {
      if (!shaderManager) {
        console.warn(
          'ShaderManager not initialized. Configuration will be applied when initialized.'
        );
        configRef.current = { ...configRef.current, ...config };
        return;
      }

      try {
        shaderManager.updateConfig(config);
        configRef.current = { ...configRef.current, ...config };
        setStatus(shaderManager.getStatus());
      } catch (error) {
        console.error('Failed to update shader configuration:', error);
        setStatus({
          compiled: false,
          errors: [error instanceof Error ? error.message : String(error)],
        });
      }
    },
    [shaderManager]
  );

  /**
   * Set quality preset
   */
  const setQuality = useCallback(
    (quality: 'low' | 'medium' | 'high') => {
      if (!shaderManager) {
        console.warn('ShaderManager not initialized. Quality will be set when initialized.');
        configRef.current = { ...configRef.current, quality };
        return;
      }

      try {
        shaderManager.setQuality(quality);
        configRef.current = { ...configRef.current, quality };
        setStatus(shaderManager.getStatus());
      } catch (error) {
        console.error('Failed to set quality:', error);
        setStatus({
          compiled: false,
          errors: [error instanceof Error ? error.message : String(error)],
        });
      }
    },
    [shaderManager]
  );

  return {
    shaderManager,
    status,
    updateConfig,
    setQuality,
  };
}
