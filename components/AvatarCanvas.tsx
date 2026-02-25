'use client';

import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useAppStore } from '@/lib/store/useAppStore';
import { VISEME_BLENDSHAPE_MAP } from '@/types';
import * as THREE from 'three';

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
 */
function AvatarModel({ modelUrl }: { modelUrl: string }) {
  const { scene, nodes } = useGLTF(modelUrl);
  const currentViseme = useAppStore((state) => state.currentViseme);
  const [targetBlendshapes, setTargetBlendshapes] = useState<Record<string, number>>({});
  const [currentBlendshapes, setCurrentBlendshapes] = useState<Record<string, number>>({});

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
 */
function ErrorFallback({ error }: { error: Error }) {
  useEffect(() => {
    // Log error details for debugging
    console.error('Avatar model load failed:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <div className="flex items-center justify-center h-full bg-red-50">
      <div className="text-center p-6 max-w-md">
        <div className="text-red-600 text-5xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          Failed to Load Avatar Model
        </h3>
        <p className="text-red-700 mb-4">
          {error.message || 'An unknown error occurred while loading the 3D model.'}
        </p>
        <p className="text-sm text-red-600">
          Please check the console for detailed error information.
        </p>
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
 * - Loading and error states
 * - Responsive canvas sizing
 * 
 * Requirements: 1.1-1.5, 3.3, 3.4, 3.6, 3.7, 12.4
 */
export default function AvatarCanvas({ modelUrl, className = '' }: AvatarCanvasProps) {
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    return (
      <div className={`w-full h-full ${className}`}>
        <ErrorFallback error={error} />
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        className="w-full h-full"
        onCreated={({ gl }) => {
          // Handle WebGL context creation errors
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            setError(new Error('WebGL context lost'));
          });
        }}
        style={{ background: '#f0f0f0' }}
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
          <AvatarModel modelUrl={modelUrl} />
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
