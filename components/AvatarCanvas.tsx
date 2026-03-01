'use client';

import { Suspense, useEffect, useState, Component, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useAppStore } from '@/lib/store/useAppStore';
import { VISEME_BLENDSHAPE_MAP, WebGLContextState } from '@/types';
import * as THREE from 'three';
import FallbackAvatar from './FallbackAvatar';
import { avatarValidatorService } from '@/lib/services/AvatarValidatorService';
import { GlassCard } from './ui/GlassCard';
import { AvatarLoadingSkeleton } from './ui/LoadingSkeleton';

/**
 * Simple Error Boundary for catching errors in child components
 */
class ErrorBoundary extends Component<
  { children: ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

/**
 * AvatarCanvas Component Props
 */
interface AvatarCanvasProps {
  modelUrl: string;
  className?: string;
}

/**
 * AvatarModel Component
 * 
 * Handles the 3D model rendering and blendshape animations.
 * Subscribes to viseme data from Zustand store and animates
 * the avatar's mouth movements in sync with speech.
 * 
 * Memory Management (Requirement 42):
 * - Disposes Three.js resources on unmount
 * - Reuses shader programs and materials
 * 
 * Validation (Requirements 1.3, 8.1, 8.3):
 * - Validates model on load
 * - Checks for missing viseme blendshapes
 * - Logs warnings for incompatible models
 */
function AvatarModel({ modelUrl }: { modelUrl: string }) {
  const { scene, nodes } = useGLTF(modelUrl, undefined, undefined, (error) => {
    // This error handler catches loading errors from useGLTF
    console.error('useGLTF loading error:', error);
    throw new Error(`Failed to load GLB model: ${error instanceof Error ? error.message : String(error)}`);
  });
  
  const currentViseme = useAppStore((state) => state.currentViseme);
  const setAvatarLoadingState = useAppStore((state) => state.setAvatarLoadingState);
  const [targetBlendshapes, setTargetBlendshapes] = useState<Record<string, number>>({});
  const [currentBlendshapes, setCurrentBlendshapes] = useState<Record<string, number>>({});
  const [lipSyncDisabled, setLipSyncDisabled] = useState(false);

  // Validate model on load (Requirements 1.3, 8.1, 8.3)
  useEffect(() => {
    const gltf = { scene, nodes } as any;
    const validationResult = avatarValidatorService.validateModel(gltf);

    if (!validationResult.valid) {
      console.error('Avatar model validation failed:', validationResult.errors);
    }

    // Check for missing viseme blendshapes
    if (validationResult.metadata.missingVisemeBlendshapes.length > 0) {
      console.warn('Avatar model is missing viseme blendshapes:', validationResult.metadata.missingVisemeBlendshapes);
      console.warn('Lip synchronization will be disabled for this model');
      setLipSyncDisabled(true);
    }

    // Log validation warnings
    if (validationResult.warnings.length > 0) {
      console.warn('Avatar model validation warnings:', validationResult.warnings);
    }

    setAvatarLoadingState('loaded');
  }, [scene, nodes, setAvatarLoadingState]);

  // Cleanup Three.js resources on unmount (Requirement 42.1)
  useEffect(() => {
    return () => {
      // Dispose of geometries, materials, and textures
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          // Dispose geometry
          if (object.geometry) {
            object.geometry.dispose();
          }

          // Dispose materials
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => {
                disposeMaterial(material);
              });
            } else {
              disposeMaterial(object.material);
            }
          }
        }
      });

      console.log('Three.js resources disposed for avatar model');
    };
  }, [scene]);

  /**
   * Helper function to dispose material and its textures
   */
  const disposeMaterial = (material: THREE.Material) => {
    // Dispose textures
    Object.keys(material).forEach((key) => {
      const value = (material as any)[key];
      if (value && value instanceof THREE.Texture) {
        value.dispose();
      }
    });

    // Dispose material
    material.dispose();
  };

  // Extract mesh with morphTargetInfluences
  const avatarMesh = Object.values(nodes).find(
    (node): node is THREE.Mesh => 
      node instanceof THREE.Mesh && 
      node.morphTargetInfluences !== undefined
  );

  // Update target blendshapes when viseme changes (only if lip sync is enabled)
  useEffect(() => {
    if (lipSyncDisabled || !avatarMesh?.morphTargetDictionary) return;

    if (currentViseme) {
      // Map viseme ID to blendshape name
      const blendshapeName = VISEME_BLENDSHAPE_MAP[currentViseme.visemeId];
      
      if (blendshapeName && blendshapeName in avatarMesh.morphTargetDictionary) {
        // Set target blendshape to 1.0, others to 0
        const newTargets: Record<string, number> = {};
        Object.keys(avatarMesh.morphTargetDictionary).forEach((key) => {
          newTargets[key] = key === blendshapeName ? 1.0 : 0.0;
        });
        setTargetBlendshapes(newTargets);
      }
    } else {
      // Return to neutral position (viseme ID 0)
      const neutralBlendshape = VISEME_BLENDSHAPE_MAP[0];
      const newTargets: Record<string, number> = {};
      
      if (avatarMesh.morphTargetDictionary) {
        Object.keys(avatarMesh.morphTargetDictionary).forEach((key) => {
          newTargets[key] = key === neutralBlendshape ? 1.0 : 0.0;
        });
      }
      setTargetBlendshapes(newTargets);
    }
  }, [currentViseme, avatarMesh, lipSyncDisabled]);

  // Animate blendshapes using lerp interpolation at 60 FPS
  useFrame((_state, delta) => {
    if (!avatarMesh?.morphTargetInfluences || !avatarMesh.morphTargetDictionary) return;

    // Lerp factor for smooth transitions (adjust for desired smoothness)
    const lerpFactor = Math.min(delta * 10, 1);

    const newBlendshapes = { ...currentBlendshapes };
    let hasChanges = false;

    Object.keys(avatarMesh.morphTargetDictionary).forEach((blendshapeName) => {
      const index = avatarMesh.morphTargetDictionary![blendshapeName];
      const currentValue = currentBlendshapes[blendshapeName] || 0;
      const targetValue = targetBlendshapes[blendshapeName] || 0;

      // Lerp interpolation for smooth transitions
      const newValue = THREE.MathUtils.lerp(currentValue, targetValue, lerpFactor);
      
      if (Math.abs(newValue - currentValue) > 0.001 && avatarMesh.morphTargetInfluences) {
        newBlendshapes[blendshapeName] = newValue;
        avatarMesh.morphTargetInfluences[index] = newValue;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setCurrentBlendshapes(newBlendshapes);
    }
  });

  return <primitive object={scene} />;
}

/**
 * Error Boundary Component
 * 
 * Displays an error message when the model fails to load.
 * Includes failure reason, troubleshooting steps, retry button, and fallback option.
 */
function ErrorFallback({ error, onRetry, onUseFallback }: { error: Error; onRetry: () => void; onUseFallback?: () => void }) {
  useEffect(() => {
    // Log detailed error information for debugging
    console.error('Avatar model load failed:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      webGLSupport: (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
          return false;
        }
      })(),
    });
  }, [error]);

  // Determine error type and provide specific troubleshooting
  const getErrorDetails = () => {
    const message = error.message.toLowerCase();
    
    if (message.includes('webgl context lost')) {
      return {
        reason: 'WebGL Context Lost',
        description: 'The 3D rendering context was lost, possibly due to GPU issues or browser limitations.',
        troubleshooting: [
          'Close other tabs or applications using GPU resources',
          'Update your graphics drivers',
          'Try a different browser',
          'Restart your browser',
        ],
      };
    }
    
    if (message.includes('network') || message.includes('fetch') || message.includes('load')) {
      return {
        reason: 'Network Error',
        description: 'Failed to download the 3D model file.',
        troubleshooting: [
          'Check your internet connection',
          'Verify the model file URL is accessible',
          'Try refreshing the page',
          'Check if a firewall is blocking the request',
        ],
      };
    }
    
    if (message.includes('parse') || message.includes('invalid') || message.includes('format')) {
      return {
        reason: 'Invalid Model Format',
        description: 'The 3D model file is corrupted or in an unsupported format.',
        troubleshooting: [
          'Verify the model file is a valid GLB format',
          'Try re-exporting the model',
          'Check if the file was corrupted during upload',
          'Contact support if the issue persists',
        ],
      };
    }
    
    if (message.includes('webgl') || message.includes('gpu')) {
      return {
        reason: 'WebGL Not Supported',
        description: 'Your browser or device does not support WebGL, which is required for 3D rendering.',
        troubleshooting: [
          'Update your browser to the latest version',
          'Enable hardware acceleration in browser settings',
          'Try a different browser (Chrome, Firefox, Edge)',
          'Check if WebGL is disabled in your browser settings',
        ],
      };
    }
    
    return {
      reason: 'Unknown Error',
      description: error.message || 'An unexpected error occurred while loading the 3D model.',
      troubleshooting: [
        'Try reloading the avatar',
        'Refresh the page',
        'Clear your browser cache',
        'Try a different browser',
      ],
    };
  };

  const errorDetails = getErrorDetails();

  return (
    <div className="flex items-center justify-center h-full bg-red-50 dark:bg-red-950">
      <div className="text-center p-6 max-w-lg">
        <div className="text-red-600 dark:text-red-400 text-5xl mb-4" role="img" aria-label="Error">
          ⚠️
        </div>
        
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
          Failed to Load Avatar Model
        </h3>
        
        <div className="mb-4">
          <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
            {errorDetails.reason}
          </p>
          <p className="text-sm text-red-700 dark:text-red-300">
            {errorDetails.description}
          </p>
        </div>

        <div className="mb-4 text-left bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Troubleshooting Steps:
          </p>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            {errorDetails.troubleshooting.map((step, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            aria-label="Retry loading avatar model"
          >
            Retry Loading Avatar
          </button>
          
          {onUseFallback && (
            <button
              onClick={onUseFallback}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              aria-label="Use fallback avatar"
            >
              Use Fallback Avatar
            </button>
          )}
          
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            The application will continue in text-only mode. You can still send and receive messages.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * AvatarCanvas Component
 * 
 * Main component that renders the 3D avatar using react-three-fiber.
 * Provides a Canvas with camera controls, lighting, and the animated avatar model.
 * 
 * Features:
 * - GLB model loading with useGLTF hook
 * - Blendshape extraction and animation
 * - Viseme-driven lip synchronization
 * - Smooth lerp interpolation for transitions
 * - 60 FPS animation loop
 * - OrbitControls for camera manipulation
 * - Loading and error states with retry functionality
 * - WebGL context loss handling with automatic recovery
 * - Fallback avatar for error scenarios
 * - Responsive canvas sizing
 * - Graceful degradation
 * - Glassmorphism container with gradient border
 * - Elegant loading skeleton animation
 * 
 * Requirements: 1.1-1.5, 3.3, 3.4, 3.6, 3.7, 3.8, 9.1-9.5, 9.7, 12.4, 40
 */
export default function AvatarCanvas({ modelUrl, className = '' }: AvatarCanvasProps) {
  const [error, setError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  // Use fallback by default if no modelUrl is provided or if explicitly requested
  const [useFallback, setUseFallback] = useState(!modelUrl || modelUrl.trim() === '');
  const [webglContextState, setWebglContextState] = useState<WebGLContextState>({
    contextLost: false,
    restoreAttempts: 0,
    maxRestoreAttempts: 3,
    lastContextLossTime: null,
  });

  const avatarLoadingState = useAppStore((state) => state.avatarLoadingState);
  const setAvatarLoadingState = useAppStore((state) => state.setAvatarLoadingState);
  const setAvatarError = useAppStore((state) => state.setAvatarError);

  const handleRetry = () => {
    setError(null);
    setUseFallback(false);
    setRetryKey((prev) => prev + 1);
    setAvatarLoadingState('idle');
    setAvatarError(null);
    // Clear the GLTF cache to force reload
    useGLTF.clear(modelUrl);
  };

  const handleWebGLContextLost = (event: Event) => {
    event.preventDefault();
    
    const now = new Date();
    setWebglContextState((prev) => ({
      ...prev,
      contextLost: true,
      lastContextLossTime: now,
    }));

    console.error('WebGL context lost event:', {
      timestamp: now.toISOString(),
      modelUrl,
      restoreAttempts: webglContextState.restoreAttempts,
    });

    setError(new Error('WebGL context lost'));
    setAvatarError({
      type: 'WEBGL_ERROR',
      message: 'WebGL context lost',
      retryable: false,
    });
  };

  const handleWebGLContextRestored = () => {
    console.log('WebGL context restored, attempting to reload avatar');
    
    setWebglContextState((prev) => {
      const newAttempts = prev.restoreAttempts + 1;
      
      // Check if we've exceeded max restore attempts
      if (newAttempts >= prev.maxRestoreAttempts) {
        console.error('Max WebGL context restore attempts exceeded, using fallback');
        setUseFallback(true);
        setAvatarLoadingState('fallback');
        return {
          ...prev,
          contextLost: false,
          restoreAttempts: newAttempts,
        };
      }

      // Attempt to reload avatar
      handleRetry();
      
      return {
        ...prev,
        contextLost: false,
        restoreAttempts: newAttempts,
      };
    });
  };

  // Use fallback if error is set or if explicitly requested
  if (error && useFallback) {
    const fallbackType = (process.env.NEXT_PUBLIC_AVATAR_FALLBACK_TYPE as 'cube' | 'sphere') || 'cube';
    const fallbackColor = process.env.NEXT_PUBLIC_AVATAR_FALLBACK_COLOR || '#4A90E2';

    return (
      <GlassCard
        blur="lg"
        opacity={0.85}
        border={true}
        shadow="xl"
        padding="md"
        className={`relative overflow-hidden ${className}`}
      >
        {/* Gradient border effect for visual depth */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 -z-10 pointer-events-none" />
        
        <div className="w-full h-full">
          <Canvas
            camera={{ position: [0, 0, 5], fov: 50 }}
            className="w-full h-full"
            style={{ background: 'transparent' }}
          >
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
            <FallbackAvatar type={fallbackType} animated={true} color={fallbackColor} errorReason={error.message} />
          </Canvas>
          
          {/* Fallback explanation overlay */}
          <div className="absolute bottom-4 left-4 right-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Using fallback avatar:</strong> {error.message}
            </p>
            <button
              onClick={handleRetry}
              className="mt-2 text-xs px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard
        blur="lg"
        opacity={0.85}
        border={true}
        shadow="xl"
        padding="md"
        className={`relative overflow-hidden ${className}`}
      >
        {/* Gradient border effect */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 -z-10 pointer-events-none" />
        
        <div className="w-full h-full">
          <ErrorFallback 
            error={error} 
            onRetry={handleRetry}
            onUseFallback={() => setUseFallback(true)}
          />
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      blur="lg"
      opacity={0.85}
      border={true}
      shadow="xl"
      padding="md"
      className={`relative overflow-hidden ${className}`}
    >
      {/* Gradient border effect for visual depth */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 -z-10 pointer-events-none" />
      
      <div 
        className="w-full h-full relative transition-opacity duration-500 ease-in-out"
        style={{ opacity: avatarLoadingState === 'loaded' ? 1 : 0 }}
        key={retryKey}
        role="img"
        aria-label="3D avatar display showing animated character with lip synchronization"
      >
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          className="w-full h-full"
          onCreated={({ gl }) => {
            // Handle WebGL context loss and restoration (Requirements 9.1, 9.2, 9.3, 9.4)
            gl.domElement.addEventListener('webglcontextlost', handleWebGLContextLost);
            gl.domElement.addEventListener('webglcontextrestored', handleWebGLContextRestored);
          }}
          style={{ background: 'transparent' }}
          onError={(error) => {
            console.error('Canvas error:', error);
            setError(error instanceof Error ? error : new Error(String(error)));
            setAvatarError({
              type: 'WEBGL_ERROR',
              message: error instanceof Error ? error.message : String(error),
              retryable: false,
            });
          }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />

          {/* Camera Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={10}
          />

          {/* Avatar Model with Suspense for loading state */}
          <Suspense fallback={null}>
            <ErrorBoundary onError={(error) => {
              setError(error);
              setAvatarError({
                type: 'INVALID_FORMAT',
                details: error.message,
                retryable: false,
              });
            }}>
              <AvatarModel modelUrl={modelUrl} />
            </ErrorBoundary>
          </Suspense>
        </Canvas>
      </div>

      {/* Loading state with elegant skeleton animation */}
      {(avatarLoadingState === 'loading' || avatarLoadingState === 'idle') && (
        <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-500 ease-in-out">
          <AvatarLoadingSkeleton className="w-full h-full" />
        </div>
      )}
    </GlassCard>
  );
}

// Preload the model for better performance
export function preloadAvatarModel(modelUrl: string) {
  useGLTF.preload(modelUrl);
}
