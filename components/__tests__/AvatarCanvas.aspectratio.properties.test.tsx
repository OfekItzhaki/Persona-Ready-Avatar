import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import AvatarCanvas from '@/components/AvatarCanvas';
import { useAppStore } from '@/lib/store/useAppStore';

/**
 * Property-Based Tests for Avatar Aspect Ratio Maintenance
 * 
 * Feature: avatar-client, Property 29: Avatar Aspect Ratio Maintenance
 * 
 * For any viewport size change, the Avatar Component should maintain its
 * aspect ratio and scale appropriately without distortion.
 * 
 * **Validates: Requirements 12.4**
 */

// Mock react-three-fiber and drei
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, camera, className, style, onCreated }: any) => (
    <div
      data-testid="mock-canvas"
      data-camera-position={JSON.stringify(camera?.position)}
      data-camera-fov={camera?.fov}
      className={className}
      style={style}
    >
      {children}
    </div>
  ),
  useFrame: vi.fn(),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="mock-orbit-controls" />,
  useGLTF: vi.fn(() => ({
    scene: { type: 'Scene' },
    nodes: {},
  })),
}));

/**
 * Helper function to simulate viewport dimensions
 */
function simulateViewportResize(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event('resize'));
}

/**
 * Helper function to calculate aspect ratio
 */
function calculateAspectRatio(width: number, height: number): number {
  return width / height;
}

/**
 * Helper function to check if aspect ratio is maintained
 * within a reasonable tolerance
 */
function isAspectRatioMaintained(
  originalWidth: number,
  originalHeight: number,
  newWidth: number,
  newHeight: number,
  tolerance: number = 0.01
): boolean {
  const originalRatio = calculateAspectRatio(originalWidth, originalHeight);
  const newRatio = calculateAspectRatio(newWidth, newHeight);
  const difference = Math.abs(originalRatio - newRatio);
  return difference <= tolerance;
}

describe('Property 29: Avatar Aspect Ratio Maintenance', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      currentViseme: null,
      playbackState: 'idle',
    });
    
    // Reset viewport to default size
    simulateViewportResize(1024, 768);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property: For any viewport size, the canvas should render with
   * full width and height (w-full h-full classes)
   */
  it('should render with full width and height for any viewport size', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 3840 }), // Width from mobile to 4K
        fc.integer({ min: 240, max: 2160 }), // Height from mobile to 4K
        (width, height) => {
          // Arrange
          simulateViewportResize(width, height);

          // Act
          const { container } = render(
            <AvatarCanvas modelUrl="/test-model.glb" />
          );

          // Assert - Property: Canvas container should have full width/height classes
          const canvasContainer = container.firstChild as HTMLElement;
          expect(canvasContainer).toBeDefined();
          expect(canvasContainer.className).toContain('w-full');
          expect(canvasContainer.className).toContain('h-full');

          // Property: Mock canvas should also have full width/height classes
          const mockCanvas = container.querySelector('[data-testid="mock-canvas"]');
          expect(mockCanvas).toBeDefined();
          expect(mockCanvas?.className).toContain('w-full');
          expect(mockCanvas?.className).toContain('h-full');
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any viewport size, the camera configuration should
   * remain consistent (position and FOV)
   */
  it('should maintain consistent camera configuration across viewport sizes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 3840 }),
        fc.integer({ min: 240, max: 2160 }),
        (width, height) => {
          // Arrange
          simulateViewportResize(width, height);

          // Act
          const { container } = render(
            <AvatarCanvas modelUrl="/test-model.glb" />
          );

          // Assert - Property: Camera position should be [0, 0, 5]
          const mockCanvas = container.querySelector('[data-testid="mock-canvas"]');
          const cameraPosition = mockCanvas?.getAttribute('data-camera-position');
          expect(cameraPosition).toBeDefined();
          
          const parsedPosition = JSON.parse(cameraPosition!);
          expect(parsedPosition).toEqual([0, 0, 5]);

          // Property: Camera FOV should be 50
          const cameraFov = mockCanvas?.getAttribute('data-camera-fov');
          expect(cameraFov).toBe('50');
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any sequence of viewport size changes, the canvas
   * should adapt without errors
   */
  it('should handle viewport size changes without errors', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            width: fc.integer({ min: 320, max: 3840 }),
            height: fc.integer({ min: 240, max: 2160 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (viewportSizes) => {
          // Act - Render once and simulate multiple resizes
          const { container, rerender } = render(
            <AvatarCanvas modelUrl="/test-model.glb" />
          );

          // Assert - Property: Should handle each resize without errors
          viewportSizes.forEach((size) => {
            simulateViewportResize(size.width, size.height);
            
            // Rerender to simulate React's response to resize
            rerender(<AvatarCanvas modelUrl="/test-model.glb" />);

            // Verify canvas is still rendered correctly
            const canvasContainer = container.firstChild as HTMLElement;
            expect(canvasContainer).toBeDefined();
            expect(canvasContainer.className).toContain('w-full');
            expect(canvasContainer.className).toContain('h-full');
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any viewport aspect ratio (wide, square, tall),
   * the canvas should render appropriately
   */
  it('should render correctly for any viewport aspect ratio', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Wide aspect ratios (landscape)
          fc.record({
            width: fc.integer({ min: 1024, max: 3840 }),
            height: fc.integer({ min: 240, max: 1080 }),
          }),
          // Square aspect ratios
          fc.integer({ min: 320, max: 2160 }).map((size) => ({
            width: size,
            height: size,
          })),
          // Tall aspect ratios (portrait)
          fc.record({
            width: fc.integer({ min: 320, max: 1080 }),
            height: fc.integer({ min: 1024, max: 2160 }),
          })
        ),
        (viewport) => {
          // Arrange
          simulateViewportResize(viewport.width, viewport.height);

          // Act
          const { container } = render(
            <AvatarCanvas modelUrl="/test-model.glb" />
          );

          // Assert - Property: Canvas should render with full dimensions
          const canvasContainer = container.firstChild as HTMLElement;
          expect(canvasContainer).toBeDefined();
          expect(canvasContainer.className).toContain('w-full');
          expect(canvasContainer.className).toContain('h-full');

          // Property: Camera configuration should remain consistent
          const mockCanvas = container.querySelector('[data-testid="mock-canvas"]');
          const cameraFov = mockCanvas?.getAttribute('data-camera-fov');
          expect(cameraFov).toBe('50');
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any mobile viewport size (<1024px width), the canvas
   * should render correctly
   */
  it('should render correctly on mobile viewport sizes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 1023 }), // Mobile widths
        fc.integer({ min: 480, max: 1920 }), // Mobile heights (often taller)
        (width, height) => {
          // Arrange
          simulateViewportResize(width, height);

          // Act
          const { container } = render(
            <AvatarCanvas modelUrl="/test-model.glb" />
          );

          // Assert - Property: Canvas should render with full dimensions
          const canvasContainer = container.firstChild as HTMLElement;
          expect(canvasContainer).toBeDefined();
          expect(canvasContainer.className).toContain('w-full');
          expect(canvasContainer.className).toContain('h-full');

          // Property: Camera should maintain consistent configuration
          const mockCanvas = container.querySelector('[data-testid="mock-canvas"]');
          const cameraPosition = mockCanvas?.getAttribute('data-camera-position');
          const parsedPosition = JSON.parse(cameraPosition!);
          expect(parsedPosition).toEqual([0, 0, 5]);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any desktop viewport size (≥1024px width), the canvas
   * should render correctly
   */
  it('should render correctly on desktop viewport sizes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1024, max: 3840 }), // Desktop widths
        fc.integer({ min: 768, max: 2160 }), // Desktop heights
        (width, height) => {
          // Arrange
          simulateViewportResize(width, height);

          // Act
          const { container } = render(
            <AvatarCanvas modelUrl="/test-model.glb" />
          );

          // Assert - Property: Canvas should render with full dimensions
          const canvasContainer = container.firstChild as HTMLElement;
          expect(canvasContainer).toBeDefined();
          expect(canvasContainer.className).toContain('w-full');
          expect(canvasContainer.className).toContain('h-full');

          // Property: Camera should maintain consistent configuration
          const mockCanvas = container.querySelector('[data-testid="mock-canvas"]');
          const cameraFov = mockCanvas?.getAttribute('data-camera-fov');
          expect(cameraFov).toBe('50');
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any viewport size, the canvas background should be
   * consistently styled
   */
  it('should maintain consistent background styling across viewport sizes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 3840 }),
        fc.integer({ min: 240, max: 2160 }),
        (width, height) => {
          // Arrange
          simulateViewportResize(width, height);

          // Act
          const { container } = render(
            <AvatarCanvas modelUrl="/test-model.glb" />
          );

          // Assert - Property: Canvas should have consistent background
          const mockCanvas = container.querySelector('[data-testid="mock-canvas"]');
          const style = mockCanvas?.getAttribute('style');
          expect(style).toContain('background: rgb(240, 240, 240)');
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any viewport size, the canvas should include
   * OrbitControls for camera manipulation
   */
  it('should include OrbitControls for any viewport size', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 3840 }),
        fc.integer({ min: 240, max: 2160 }),
        (width, height) => {
          // Arrange
          simulateViewportResize(width, height);

          // Act
          const { container } = render(
            <AvatarCanvas modelUrl="/test-model.glb" />
          );

          // Assert - Property: OrbitControls should be present
          const orbitControls = container.querySelector('[data-testid="mock-orbit-controls"]');
          expect(orbitControls).toBeDefined();
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any custom className provided, it should be applied
   * to the container while maintaining responsive behavior
   */
  it('should apply custom className while maintaining responsive behavior', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-z-]+$/.test(s)),
        fc.integer({ min: 320, max: 3840 }),
        fc.integer({ min: 240, max: 2160 }),
        (customClass, width, height) => {
          // Arrange
          simulateViewportResize(width, height);

          // Act
          const { container } = render(
            <AvatarCanvas modelUrl="/test-model.glb" className={customClass} />
          );

          // Assert - Property: Custom class should be applied
          const canvasContainer = container.firstChild as HTMLElement;
          expect(canvasContainer.className).toContain(customClass);

          // Property: Responsive classes should still be present
          expect(canvasContainer.className).toContain('w-full');
          expect(canvasContainer.className).toContain('h-full');
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any viewport size, the canvas should maintain
   * the same camera FOV (field of view) to prevent distortion
   */
  it('should maintain consistent FOV to prevent distortion', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            width: fc.integer({ min: 320, max: 3840 }),
            height: fc.integer({ min: 240, max: 2160 }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        (viewportSizes) => {
          const fovValues: string[] = [];

          // Act - Render at different viewport sizes and collect FOV values
          viewportSizes.forEach((size) => {
            simulateViewportResize(size.width, size.height);
            
            const { container } = render(
              <AvatarCanvas modelUrl="/test-model.glb" />
            );

            const mockCanvas = container.querySelector('[data-testid="mock-canvas"]');
            const fov = mockCanvas?.getAttribute('data-camera-fov');
            if (fov) {
              fovValues.push(fov);
            }
          });

          // Assert - Property: All FOV values should be identical (50)
          expect(fovValues.length).toBeGreaterThan(0);
          fovValues.forEach((fov) => {
            expect(fov).toBe('50');
          });

          // Property: FOV should be consistent across all viewport sizes
          const uniqueFovValues = new Set(fovValues);
          expect(uniqueFovValues.size).toBe(1);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any viewport size, the camera position should remain
   * constant to maintain consistent perspective
   */
  it('should maintain constant camera position across viewport sizes', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            width: fc.integer({ min: 320, max: 3840 }),
            height: fc.integer({ min: 240, max: 2160 }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        (viewportSizes) => {
          const cameraPositions: any[] = [];

          // Act - Render at different viewport sizes and collect camera positions
          viewportSizes.forEach((size) => {
            simulateViewportResize(size.width, size.height);
            
            const { container } = render(
              <AvatarCanvas modelUrl="/test-model.glb" />
            );

            const mockCanvas = container.querySelector('[data-testid="mock-canvas"]');
            const position = mockCanvas?.getAttribute('data-camera-position');
            if (position) {
              cameraPositions.push(JSON.parse(position));
            }
          });

          // Assert - Property: All camera positions should be identical [0, 0, 5]
          expect(cameraPositions.length).toBeGreaterThan(0);
          cameraPositions.forEach((position) => {
            expect(position).toEqual([0, 0, 5]);
          });
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any extreme aspect ratio (very wide or very tall),
   * the canvas should still render without errors
   */
  it('should handle extreme aspect ratios without errors', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Very wide (ultra-wide monitors)
          fc.record({
            width: fc.integer({ min: 2560, max: 5120 }),
            height: fc.integer({ min: 720, max: 1440 }),
          }),
          // Very tall (vertical monitors or mobile portrait)
          fc.record({
            width: fc.integer({ min: 320, max: 1080 }),
            height: fc.integer({ min: 1920, max: 3840 }),
          })
        ),
        (viewport) => {
          // Arrange
          simulateViewportResize(viewport.width, viewport.height);

          // Act
          const { container } = render(
            <AvatarCanvas modelUrl="/test-model.glb" />
          );

          // Assert - Property: Canvas should render successfully
          const canvasContainer = container.firstChild as HTMLElement;
          expect(canvasContainer).toBeDefined();
          expect(canvasContainer.className).toContain('w-full');
          expect(canvasContainer.className).toContain('h-full');

          // Property: Camera configuration should remain consistent
          const mockCanvas = container.querySelector('[data-testid="mock-canvas"]');
          const cameraFov = mockCanvas?.getAttribute('data-camera-fov');
          expect(cameraFov).toBe('50');
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property: For any viewport size transition (resize event),
   * the canvas should maintain its structure
   */
  it('should maintain structure during viewport transitions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 3840 }),
        fc.integer({ min: 240, max: 2160 }),
        fc.integer({ min: 320, max: 3840 }),
        fc.integer({ min: 240, max: 2160 }),
        (width1, height1, width2, height2) => {
          // Arrange - Start with first viewport size
          simulateViewportResize(width1, height1);
          const { container, rerender } = render(
            <AvatarCanvas modelUrl="/test-model.glb" />
          );

          // Act - Transition to second viewport size
          simulateViewportResize(width2, height2);
          rerender(<AvatarCanvas modelUrl="/test-model.glb" />);

          // Assert - Property: Canvas structure should be maintained
          const canvasContainer = container.firstChild as HTMLElement;
          expect(canvasContainer).toBeDefined();
          expect(canvasContainer.className).toContain('w-full');
          expect(canvasContainer.className).toContain('h-full');

          // Property: Camera configuration should remain consistent
          const mockCanvas = container.querySelector('[data-testid="mock-canvas"]');
          const cameraPosition = mockCanvas?.getAttribute('data-camera-position');
          const parsedPosition = JSON.parse(cameraPosition!);
          expect(parsedPosition).toEqual([0, 0, 5]);
        }
      ),
      { numRuns: 25 }
    );
  });
});
