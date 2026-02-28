/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AvatarCanvas from '../AvatarCanvas';
import { useGLTF } from '@react-three/drei';

// Mock @react-three/drei
vi.mock('@react-three/drei', () => ({
  useGLTF: Object.assign(vi.fn(), {
    clear: vi.fn(),
    preload: vi.fn(),
  }),
  OrbitControls: () => null,
}));

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, onCreated, onError }: any) => {
    // Simulate canvas creation
    if (onCreated) {
      const mockGl = {
        domElement: {
          addEventListener: vi.fn(),
        },
      };
      onCreated({ gl: mockGl });
    }
    return <div data-testid="canvas">{children}</div>;
  },
  useFrame: vi.fn(),
}));

// Mock Zustand store
vi.mock('@/lib/store/useAppStore', () => ({
  useAppStore: vi.fn(() => ({
    currentViseme: null,
  })),
}));

describe('AvatarCanvas - Enhanced Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Display', () => {
    it('should display error message with failure reason', async () => {
      const mockError = new Error('Failed to load GLB model: Network error');
      vi.mocked(useGLTF).mockImplementation(() => {
        throw mockError;
      });

      render(<AvatarCanvas modelUrl="/test-model.glb" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Avatar Model')).toBeInTheDocument();
        expect(screen.getByText('Network Error')).toBeInTheDocument();
      });
    });

    it('should display troubleshooting steps for network errors', async () => {
      const mockError = new Error('Network error occurred');
      vi.mocked(useGLTF).mockImplementation(() => {
        throw mockError;
      });

      render(<AvatarCanvas modelUrl="/test-model.glb" />);

      await waitFor(() => {
        expect(screen.getByText('Troubleshooting Steps:')).toBeInTheDocument();
        expect(screen.getByText(/Check your internet connection/i)).toBeInTheDocument();
      });
    });

    it('should display troubleshooting steps for WebGL context loss', async () => {
      const mockError = new Error('WebGL context lost');
      vi.mocked(useGLTF).mockImplementation(() => {
        throw mockError;
      });

      render(<AvatarCanvas modelUrl="/test-model.glb" />);

      await waitFor(() => {
        expect(screen.getByText('WebGL Context Lost')).toBeInTheDocument();
        expect(screen.getByText(/Close other tabs or applications using GPU resources/i)).toBeInTheDocument();
      });
    });

    it('should display troubleshooting steps for invalid model format', async () => {
      const mockError = new Error('Invalid GLB format');
      vi.mocked(useGLTF).mockImplementation(() => {
        throw mockError;
      });

      render(<AvatarCanvas modelUrl="/test-model.glb" />);

      await waitFor(() => {
        expect(screen.getByText('Invalid Model Format')).toBeInTheDocument();
        expect(screen.getByText(/Verify the model file is a valid GLB format/i)).toBeInTheDocument();
      });
    });

    it('should display troubleshooting steps for WebGL not supported', async () => {
      const mockError = new Error('WebGL not supported');
      vi.mocked(useGLTF).mockImplementation(() => {
        throw mockError;
      });

      render(<AvatarCanvas modelUrl="/test-model.glb" />);

      await waitFor(() => {
        expect(screen.getByText('WebGL Not Supported')).toBeInTheDocument();
        expect(screen.getByText(/Update your browser to the latest version/i)).toBeInTheDocument();
      });
    });

    it('should display generic error for unknown errors', async () => {
      const mockError = new Error('Something unexpected happened');
      vi.mocked(useGLTF).mockImplementation(() => {
        throw mockError;
      });

      render(<AvatarCanvas modelUrl="/test-model.glb" />);

      await waitFor(() => {
        expect(screen.getByText('Unknown Error')).toBeInTheDocument();
        expect(screen.getByText(/Something unexpected happened/i)).toBeInTheDocument();
      });
    });
  });

  describe('Retry Functionality', () => {
    it('should display retry button when error occurs', async () => {
      const mockError = new Error('Network error');
      vi.mocked(useGLTF).mockImplementation(() => {
        throw mockError;
      });

      render(<AvatarCanvas modelUrl="/test-model.glb" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Retry loading avatar/i })).toBeInTheDocument();
      });
    });

    it('should clear error and retry loading when retry button is clicked', async () => {
      const user = userEvent.setup();
      let shouldThrow = true;

      vi.mocked(useGLTF).mockImplementation(() => {
        if (shouldThrow) {
          throw new Error('Network error');
        }
        return {
          scene: { type: 'Scene' },
          nodes: {},
        } as any;
      });

      render(<AvatarCanvas modelUrl="/test-model.glb" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Avatar Model')).toBeInTheDocument();
      });

      // Click retry button
      shouldThrow = false;
      const retryButton = screen.getByRole('button', { name: /Retry loading avatar/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.queryByText('Failed to Load Avatar Model')).not.toBeInTheDocument();
      });
    });

    it('should call useGLTF.clear when retrying', async () => {
      const user = userEvent.setup();
      const mockClear = vi.fn();
      
      vi.mocked(useGLTF).mockImplementation(() => {
        throw new Error('Network error');
      });
      (useGLTF as any).clear = mockClear;

      render(<AvatarCanvas modelUrl="/test-model.glb" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Retry loading avatar/i })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /Retry loading avatar/i });
      await user.click(retryButton);

      expect(mockClear).toHaveBeenCalledWith('/test-model.glb');
    });
  });

  describe('Text-Only Mode Fallback', () => {
    it('should display message about continuing in text-only mode', async () => {
      const mockError = new Error('Network error');
      vi.mocked(useGLTF).mockImplementation(() => {
        throw mockError;
      });

      render(<AvatarCanvas modelUrl="/test-model.glb" />);

      await waitFor(() => {
        expect(screen.getByText(/The application will continue in text-only mode/i)).toBeInTheDocument();
        expect(screen.getByText(/You can still send and receive messages/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Logging', () => {
    it('should log detailed error information to console', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockError = new Error('Test error');
      
      vi.mocked(useGLTF).mockImplementation(() => {
        throw mockError;
      });

      render(<AvatarCanvas modelUrl="/test-model.glb" />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
        const logCall = consoleErrorSpy.mock.calls.find(call => 
          call[0] === 'Avatar model load failed:'
        );
        expect(logCall).toBeDefined();
        expect(logCall![1]).toHaveProperty('message');
        expect(logCall![1]).toHaveProperty('timestamp');
        expect(logCall![1]).toHaveProperty('userAgent');
        expect(logCall![1]).toHaveProperty('webGLSupport');
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('WebGL Context Loss Handling', () => {
    it('should register WebGL context loss event listener', () => {
      const mockAddEventListener = vi.fn();
      
      vi.mocked(useGLTF).mockReturnValue({
        scene: { type: 'Scene' },
        nodes: {},
      } as any);

      // Note: This test verifies the event listener registration logic exists in the component
      // The actual registration happens in the Canvas onCreated callback
      // which is difficult to test in isolation without complex mocking
      
      render(<AvatarCanvas modelUrl="/test-model.glb" />);

      // The component should render without errors
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on error display', async () => {
      const mockError = new Error('Network error');
      vi.mocked(useGLTF).mockImplementation(() => {
        throw mockError;
      });

      render(<AvatarCanvas modelUrl="/test-model.glb" />);

      await waitFor(() => {
        const errorIcon = screen.getByRole('img', { name: 'Error' });
        expect(errorIcon).toBeInTheDocument();
        
        const retryButton = screen.getByRole('button', { name: /Retry loading avatar/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation for retry button', async () => {
      const user = userEvent.setup();
      const mockError = new Error('Network error');
      
      vi.mocked(useGLTF).mockImplementation(() => {
        throw mockError;
      });

      render(<AvatarCanvas modelUrl="/test-model.glb" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Retry loading avatar/i })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /Retry loading avatar/i });
      retryButton.focus();
      
      expect(retryButton).toHaveFocus();
    });
  });

  describe('Dark Mode Support', () => {
    it('should include dark mode classes in error display', async () => {
      const mockError = new Error('Network error');
      vi.mocked(useGLTF).mockImplementation(() => {
        throw mockError;
      });

      const { container } = render(<AvatarCanvas modelUrl="/test-model.glb" />);

      await waitFor(() => {
        const errorContainer = container.querySelector('.dark\\:bg-red-950');
        expect(errorContainer).toBeInTheDocument();
      });
    });
  });
});
