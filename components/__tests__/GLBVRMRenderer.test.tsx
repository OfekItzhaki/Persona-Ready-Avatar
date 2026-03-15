import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock three.js and react-three-fiber to avoid WebGL/ESM issues in jsdom
vi.mock('three', () => ({}));
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useFrame: vi.fn(),
}));

// Mock AvatarCanvas — it uses WebGL / Three.js which are unavailable in jsdom
vi.mock('../AvatarCanvas', () => ({
  default: ({ modelUrl }: { modelUrl: string }) => (
    <div data-testid="avatar-canvas" data-model-url={modelUrl} />
  ),
}));

// Mock useGLTF.clear so we can assert it is called on unmount
const { mockClear } = vi.hoisted(() => ({ mockClear: vi.fn() }));
vi.mock('@react-three/drei', () => ({
  useGLTF: Object.assign(vi.fn(), { clear: mockClear }),
}));

import GLBVRMRenderer from '../GLBVRMRenderer';
import { useAppStore } from '@/lib/store/useAppStore';
import { logger } from '@/lib/logger';

function resetStore(overrides: Partial<Parameters<typeof useAppStore.setState>[0]> = {}) {
  useAppStore.setState({
    avatarLoadingState: 'idle',
    avatarError: null,
    ...overrides,
  });
}

describe('GLBVRMRenderer', () => {
  beforeEach(() => {
    resetStore();
    mockClear.mockClear();
    vi.mocked(logger.error).mockClear();
  });

  // Requirement 9.1: passes modelPath as modelUrl to AvatarCanvas
  it('renders AvatarCanvas with the correct modelUrl', () => {
    render(<GLBVRMRenderer modelPath="/models/agent.glb" />);
    const canvas = screen.getByTestId('avatar-canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute('data-model-url', '/models/agent.glb');
  });

  // Requirement 9.3: shows loading indicator while model is loading
  it('displays a loading indicator when avatarLoadingState is loading', () => {
    resetStore({ avatarLoadingState: 'loading' });
    render(<GLBVRMRenderer modelPath="/models/agent.glb" />);

    const spinner = screen.getByRole('status', { name: /loading avatar model/i });
    expect(spinner).toBeInTheDocument();
  });

  // Requirement 9.3: no loading indicator when not loading
  it('does not show loading indicator when avatarLoadingState is idle', () => {
    resetStore({ avatarLoadingState: 'idle' });
    render(<GLBVRMRenderer modelPath="/models/agent.glb" />);

    expect(screen.queryByRole('status', { name: /loading avatar model/i })).not.toBeInTheDocument();
  });

  // Requirement 9.4: displays error state when model cannot be loaded
  it('displays error state when avatarError is set', () => {
    resetStore({
      avatarError: { type: 'INVALID_FORMAT', details: 'bad file', retryable: false },
    });
    render(<GLBVRMRenderer modelPath="/models/bad.glb" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/failed to load avatar model/i)).toBeInTheDocument();
    // AvatarCanvas should NOT be rendered in error state
    expect(screen.queryByTestId('avatar-canvas')).not.toBeInTheDocument();
  });

  // Requirement 9.4: logs failure when model cannot be loaded
  it('logs an error when avatarError is set', () => {
    resetStore({
      avatarError: { type: 'NETWORK_ERROR', message: 'timeout', retryable: true },
    });
    render(<GLBVRMRenderer modelPath="/models/agent.glb" />);

    expect(logger.error).toHaveBeenCalledWith(
      'GLBVRMRenderer: model failed to load',
      expect.objectContaining({ modelPath: '/models/agent.glb' })
    );
  });

  // Requirement 9.6: releases WebGL resources on unmount
  it('calls useGLTF.clear with modelPath on unmount', () => {
    const { unmount } = render(<GLBVRMRenderer modelPath="/models/agent.glb" />);
    expect(mockClear).not.toHaveBeenCalled();
    unmount();
    expect(mockClear).toHaveBeenCalledWith('/models/agent.glb');
  });
});
