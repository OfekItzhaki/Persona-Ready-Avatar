'use client';

import { Suspense, useEffect, useState, Component, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useAppStore } from '@/lib/store/useAppStore';
import { VISEME_BLENDSHAPE_MAP } from '@/types';
import * as THREE from 'three';

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
 */
function AvatarModel({ modelUrl }: { modelUrl: string }) {
  const { scene, nodes } = useGLTF(modelUrl, undefined, undefined, (error) => {
    // This error handler catches loading errors from useGLTF
    console.error('useGLTF loading error:', error);
    throw new Error(`Failed to load GLB model: ${error instanceof Error ? error.message : String(error)}`);
  });
  
  const currentViseme = useAppStore((state) => state.currentViseme);
  const [targetBlendshapes, setTargetBlendshapes] = useState<Record<string, number>>({});
  const [currentBlendshapes, setCurrentBlendshapes] = useState<Record<string, number>>({});

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

  // Update target blendshapes when viseme changes
  useEffect(() => {
    if (!avatarMesh?.morphTargetDictionary) return;

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
  }, [currentViseme, avatarMesh]);

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
 * Loading Component
 * 
 * Displays a loading indicator while the 3D model is being loaded.
 */
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading avatar model...</p>
      </div>
    </div>
  );
}

/**
 * Error Boundary Component
 * 
 * Displays an error message when the model fails to load.
 * Includes failure reason, troubleshooting steps, and reload button.
 */
function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
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
 * - WebGL context loss handling
 * - Responsive canvas sizing
 * - Graceful fallback to text-only mode
 * 
 * Requirements: 1.1-1.5, 3.3, 3.4, 3.6, 3.7, 12.4, 40
 */
export default function AvatarCanvas({ modelUrl, className = '' }: AvatarCanvasProps) {
  const [error, setError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const handleRetry = () => {
    setError(null);
    setRetryKey((prev) => prev + 1);
    // Clear the GLTF cache to force reload
    useGLTF.clear(modelUrl);
  };

  const handleWebGLContextLost = (event: Event) => {
    event.preventDefault();
    console.error('WebGL context lost event:', {
      timestamp: new Date().toISOString(),
      modelUrl,
    });
    setError(new Error('WebGL context lost'));
  };

  const handleWebGLContextRestored = () => {
    console.log('WebGL context restored, attempting to reload avatar');
    handleRetry();
  };

  if (error) {
    return (
      <div className={`w-full h-full ${className}`}>
        <ErrorFallback error={error} onRetry={handleRetry} />
      </div>
    );
  }

  return (
    <div 
      className={`w-full h-full ${className}`} 
      key={retryKey}
      role="img"
      aria-label="3D avatar display showing animated character with lip synchronization"
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        className="w-full h-full"
        onCreated={({ gl }) => {
          // Handle WebGL context loss and restoration
          gl.domElement.addEventListener('webglcontextlost', handleWebGLContextLost);
          gl.domElement.addEventListener('webglcontextrestored', handleWebGLContextRestored);
        }}
        style={{ background: '#f0f0f0' }}
        onError={(error) => {
          console.error('Canvas error:', error);
          setError(error instanceof Error ? error : new Error(String(error)));
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
          <ErrorBoundary onError={(error) => setError(error)}>
            <AvatarModel modelUrl={modelUrl} />
          </ErrorBoundary>
        </Suspense>
      </Canvas>

      {/* Loading overlay */}
      <Suspense fallback={<LoadingFallback />}>
        <div style={{ display: 'none' }} />
      </Suspense>
    </div>
  );
}

// Preload the model for better performance
export function preloadAvatarModel(modelUrl: string) {
  useGLTF.preload(modelUrl);
}
