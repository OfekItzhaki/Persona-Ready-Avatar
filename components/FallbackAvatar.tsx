'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * FallbackAvatar Component Props
 */
interface FallbackAvatarProps {
  type?: 'cube' | 'sphere';
  animated?: boolean;
  color?: string;
  errorReason?: string;
}

/**
 * FallbackAvatar Component
 * 
 * Renders a simple geometric primitive (cube or sphere) as a fallback
 * when avatar models fail to load. This ensures the application remains
 * functional even when network, WebGL, or model loading issues occur.
 * 
 * Features:
 * - No external dependencies or network requests
 * - No blendshape support required
 * - Animated rotation (cube) or pulsing scale (sphere)
 * - Minimal GPU usage
 * 
 * Requirements: 3.1, 3.2, 3.4, 3.5, 8.4
 */
export default function FallbackAvatar({
  type = 'cube',
  animated = true,
  color = '#4A90E2',
  errorReason,
}: FallbackAvatarProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Animation loop (Requirement 3.4)
  useFrame((state) => {
    if (!meshRef.current || !animated) return;

    if (type === 'cube') {
      // Rotate cube on Y-axis
      meshRef.current.rotation.y += 0.01;
    } else if (type === 'sphere') {
      // Pulse sphere scale
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group>
      {/* Geometric primitive mesh */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        {type === 'cube' ? (
          <boxGeometry args={[2, 2, 2]} />
        ) : (
          <sphereGeometry args={[1, 32, 32]} />
        )}
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Error explanation overlay (if provided) */}
      {errorReason && (
        <group position={[0, -2, 0]}>
          {/* This would typically be rendered as HTML overlay in the parent component */}
        </group>
      )}
    </group>
  );
}
