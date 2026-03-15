'use client';

import { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import AvatarCanvas from './AvatarCanvas';
import { useAppStore } from '@/lib/store/useAppStore';
import { logger } from '@/lib/logger';

interface GLBVRMRendererProps {
  modelPath: string;
  className?: string;
}

export default function GLBVRMRenderer({ modelPath, className }: GLBVRMRendererProps) {
  const avatarLoadingState = useAppStore((state) => state.avatarLoadingState);
  const avatarError = useAppStore((state) => state.avatarError);

  // Log model load failure (Requirement 9.4)
  useEffect(() => {
    if (avatarError) {
      logger.error('GLBVRMRenderer: model failed to load', {
        modelPath,
        errorType: avatarError.type,
      });
    }
  }, [avatarError, modelPath]);

  // Release WebGL resources on unmount (Requirement 9.6)
  useEffect(() => {
    return () => {
      useGLTF.clear(modelPath);
    };
  }, [modelPath]);

  if (avatarError) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: '#fef2f2',
          color: '#b91c1c',
          flexDirection: 'column',
          gap: '8px',
        }}
        role="alert"
      >
        <span style={{ fontSize: '2rem' }}>⚠️</span>
        <span>Failed to load avatar model</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <AvatarCanvas modelUrl={modelPath} className={className} />

      {/* Loading indicator (Requirement 9.3) */}
      {avatarLoadingState === 'loading' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)',
          }}
          aria-label="Loading avatar model"
          role="status"
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              animation: 'glbvrm-spin 0.8s linear infinite',
            }}
          />
          <style>{`@keyframes glbvrm-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
