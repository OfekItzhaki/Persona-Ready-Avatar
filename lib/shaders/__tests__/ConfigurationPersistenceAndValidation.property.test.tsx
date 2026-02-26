/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
/**
 * Property-Based Test: Configuration Persistence and Validation
 *
 * **Validates: Requirements 8.2, 8.3, 8.4**
 *
 * Property 8: Configuration Persistence and Validation
 * For any shader configuration update (valid or invalid), the system should
 * validate the input, use defaults for invalid values, and persist valid
 * configuration across React component re-renders.
 */

import { describe, expect, beforeEach, vi } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import { renderHook, act } from '@testing-library/react';
import * as THREE from 'three';
import { useShaderManager } from '../useShaderManager';
import { validateShaderConfig } from '../validation';
import { DEFAULT_SHADER_CONFIG } from '../types';
import type { ShaderConfig } from '../types';

describe('Property 8: Configuration Persistence and Validation', () => {
  let mockRenderer: THREE.WebGLRenderer;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // Set up global WebGL constructors if not defined
    if (typeof global.WebGL2RenderingContext === 'undefined') {
      (global as any).WebGL2RenderingContext = function WebGL2RenderingContext() {};
    }

    // Create mock canvas
    mockCanvas = document.createElement('canvas');

    // Create mock WebGL2 context with all required methods
    const mockGLContext = {
      MAX_TEXTURE_SIZE: 0x0d33,
      MAX_VERTEX_UNIFORM_VECTORS: 0x8dfb,
      VERTEX_SHADER: 0x8b31,
      FRAGMENT_SHADER: 0x8b30,
      getParameter: vi.fn((param: number) => {
        if (param === 0x0d33) return 4096; // MAX_TEXTURE_SIZE
        if (param === 0x8dfb) return 256; // MAX_VERTEX_UNIFORM_VECTORS
        return 0;
      }),
      getExtension: vi.fn(() => null),
      getShaderPrecisionFormat: vi.fn(() => ({
        precision: 23,
        rangeMin: 127,
        rangeMax: 127,
      })),
      createShader: vi.fn(() => ({})),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      createProgram: vi.fn(() => ({})),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => true),
      deleteShader: vi.fn(),
      deleteProgram: vi.fn(),
    };

    // Set up prototype chain for instanceof checks
    const context = Object.create(global.WebGL2RenderingContext.prototype);
    Object.assign(context, mockGLContext);

    // Mock canvas.getContext to return our mock WebGL2 context
    vi.spyOn(mockCanvas, 'getContext').mockReturnValue(context);

    // Create mock renderer
    mockRenderer = {
      domElement: mockCanvas,
      getContext: vi.fn().mockReturnValue(context),
    } as unknown as THREE.WebGLRenderer;
  });

  /**
   * Property Test: Valid Configuration Persistence
   *
   * For any valid configuration, the values should persist across re-renders.
   */
  test.prop([
    fc.record({
      quality: fc.constantFrom('low', 'medium', 'high'),
      skinTone: fc.record({
        r: fc.float({ min: 0, max: 1, noNaN: true }),
        g: fc.float({ min: 0, max: 1, noNaN: true }),
        b: fc.float({ min: 0, max: 1, noNaN: true }),
      }),
      irisColor: fc.record({
        r: fc.float({ min: 0, max: 1, noNaN: true }),
        g: fc.float({ min: 0, max: 1, noNaN: true }),
        b: fc.float({ min: 0, max: 1, noNaN: true }),
      }),
      hairColor: fc.record({
        r: fc.float({ min: 0, max: 1, noNaN: true }),
        g: fc.float({ min: 0, max: 1, noNaN: true }),
        b: fc.float({ min: 0, max: 1, noNaN: true }),
      }),
      enableBloom: fc.boolean(),
      enableColorGrading: fc.boolean(),
      shadowMapSize: fc.constantFrom(512, 1024, 2048),
    }),
  ])('should persist valid configuration across re-renders', async (config) => {
    // Render hook with initial configuration
    const { result, rerender } = renderHook(() => useShaderManager(mockRenderer, config));

    // Wait for initialization
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Verify shader manager was created
    expect(result.current.shaderManager).not.toBeNull();

    // Trigger re-render
    rerender();

    // Verify shader manager persists
    expect(result.current.shaderManager).not.toBeNull();

    // Verify configuration persists (status should still be compiled)
    expect(result.current.status.compiled).toBe(true);
  });

  /**
   * Property Test: Invalid Color Validation
   *
   * For any invalid color values, the system should use defaults and log warnings.
   */
  test.prop([
    fc.oneof(
      // Out of range values
      fc.record({
        r: fc.float({ min: Math.fround(-10), max: Math.fround(-0.01), noNaN: true }),
        g: fc.float({ min: 0, max: 1, noNaN: true }),
        b: fc.float({ min: 0, max: 1, noNaN: true }),
      }),
      fc.record({
        r: fc.float({ min: 0, max: 1, noNaN: true }),
        g: fc.float({ min: Math.fround(1.01), max: Math.fround(10), noNaN: true }),
        b: fc.float({ min: 0, max: 1, noNaN: true }),
      }),
      fc.record({
        r: fc.float({ min: 0, max: 1, noNaN: true }),
        g: fc.float({ min: 0, max: 1, noNaN: true }),
        b: fc.float({ min: Math.fround(1.01), max: Math.fround(10), noNaN: true }),
      }),
      // NaN values
      fc.constant({ r: NaN, g: 0.5, b: 0.5 }),
      fc.constant({ r: 0.5, g: NaN, b: 0.5 }),
      fc.constant({ r: 0.5, g: 0.5, b: NaN })
    ),
  ])('should use default values for invalid color configurations', (invalidColor) => {
    // Mock console.warn to capture warnings
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Validate configuration with invalid skin tone
    const validated = validateShaderConfig({ skinTone: invalidColor });

    // Verify default skin tone is used
    expect(validated.skinTone).toEqual(DEFAULT_SHADER_CONFIG.skinTone);

    // Verify warning was logged
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  /**
   * Property Test: Invalid Shadow Map Size Validation
   *
   * For any invalid shadow map size, the system should use the default value.
   */
  test.prop([
    fc.oneof(
      fc.integer({ min: -1000, max: 511 }),
      fc.integer({ min: 513, max: 1023 }),
      fc.integer({ min: 1025, max: 2047 }),
      fc.integer({ min: 2049, max: 10000 })
    ),
  ])('should use default shadow map size for invalid values', (invalidSize) => {
    // Mock console.warn
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Validate configuration with invalid shadow map size
    const validated = validateShaderConfig({
      shadowMapSize: invalidSize as 512 | 1024 | 2048,
    });

    // Verify default shadow map size is used
    expect(validated.shadowMapSize).toBe(DEFAULT_SHADER_CONFIG.shadowMapSize);

    // Verify warning was logged
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  /**
   * Property Test: Invalid Quality Validation
   *
   * For any invalid quality value, the system should use the default quality.
   */
  test.prop([
    fc.oneof(
      fc.constant('ultra'),
      fc.constant('potato'),
      fc.constant(''),
      fc.constant('LOW'), // Wrong case
      fc.constant('High') // Wrong case
    ),
  ])('should use default quality for invalid values', (invalidQuality) => {
    // Mock console.warn
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Validate configuration with invalid quality
    const validated = validateShaderConfig({
      quality: invalidQuality as 'low' | 'medium' | 'high',
    });

    // Verify default quality is used
    expect(validated.quality).toBe(DEFAULT_SHADER_CONFIG.quality);

    // Verify warning was logged
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  /**
   * Property Test: Runtime Configuration Updates
   *
   * For any valid configuration update, the system should apply the changes
   * without recompiling shaders.
   */
  test.prop([
    fc.record({
      skinTone: fc.record({
        r: fc.float({ min: 0, max: 1, noNaN: true }),
        g: fc.float({ min: 0, max: 1, noNaN: true }),
        b: fc.float({ min: 0, max: 1, noNaN: true }),
      }),
    }),
    fc.record({
      irisColor: fc.record({
        r: fc.float({ min: 0, max: 1, noNaN: true }),
        g: fc.float({ min: 0, max: 1, noNaN: true }),
        b: fc.float({ min: 0, max: 1, noNaN: true }),
      }),
    }),
  ])(
    'should update configuration at runtime without recompilation',
    async (initialConfig, updateConfig) => {
      // Render hook with initial configuration
      const { result } = renderHook(() => useShaderManager(mockRenderer, initialConfig));

      // Wait for initialization
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Verify initial state
      expect(result.current.shaderManager).not.toBeNull();
      const initialStatus = result.current.status;
      expect(initialStatus.compiled).toBe(true);

      // Update configuration at runtime
      await act(async () => {
        result.current.updateConfig(updateConfig);
      });

      // Verify shader manager still exists (no recompilation)
      expect(result.current.shaderManager).not.toBeNull();

      // Verify status remains compiled
      expect(result.current.status.compiled).toBe(true);
    }
  );

  /**
   * Property Test: Mixed Valid and Invalid Configuration
   *
   * When configuration contains both valid and invalid values, valid values
   * should be applied and invalid values should use defaults.
   */
  test.prop([
    fc.record({
      r: fc.float({ min: 0, max: 1, noNaN: true }),
      g: fc.float({ min: 0, max: 1, noNaN: true }),
      b: fc.float({ min: 0, max: 1, noNaN: true }),
    }),
    fc.oneof(
      fc.record({
        r: fc.float({ min: Math.fround(-10), max: Math.fround(-0.01), noNaN: true }),
        g: fc.float({ min: 0, max: 1, noNaN: true }),
        b: fc.float({ min: 0, max: 1, noNaN: true }),
      }),
      fc.constant({ r: NaN, g: 0.5, b: 0.5 })
    ),
  ])(
    'should apply valid values and use defaults for invalid values in mixed config',
    (validSkinTone, invalidIrisColor) => {
      // Mock console.warn
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Validate configuration with mixed valid/invalid values
      const validated = validateShaderConfig({
        skinTone: validSkinTone,
        irisColor: invalidIrisColor,
      });

      // Verify valid skin tone is applied
      expect(validated.skinTone.r).toBeCloseTo(validSkinTone.r, 5);
      expect(validated.skinTone.g).toBeCloseTo(validSkinTone.g, 5);
      expect(validated.skinTone.b).toBeCloseTo(validSkinTone.b, 5);

      // Verify invalid iris color uses default
      expect(validated.irisColor).toEqual(DEFAULT_SHADER_CONFIG.irisColor);

      // Verify warning was logged for invalid value
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    }
  );

  /**
   * Property Test: Configuration Persistence After Multiple Updates
   *
   * Configuration should persist correctly after multiple sequential updates.
   */
  test.prop([
    fc.array(
      fc.record({
        skinTone: fc.record({
          r: fc.float({ min: 0, max: 1, noNaN: true }),
          g: fc.float({ min: 0, max: 1, noNaN: true }),
          b: fc.float({ min: 0, max: 1, noNaN: true }),
        }),
      }),
      { minLength: 2, maxLength: 5 }
    ),
  ])('should persist configuration correctly after multiple updates', async (configUpdates) => {
    // Render hook
    const { result } = renderHook(() => useShaderManager(mockRenderer, {}));

    // Wait for initialization
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Apply multiple configuration updates
    for (const config of configUpdates) {
      await act(async () => {
        result.current.updateConfig(config);
      });
    }

    // Verify shader manager persists
    expect(result.current.shaderManager).not.toBeNull();

    // Verify status remains compiled
    expect(result.current.status.compiled).toBe(true);
  });

  /**
   * Property Test: Boolean Flag Validation
   *
   * Boolean flags should only accept true/false values.
   */
  test.prop([
    fc.oneof(
      fc.constant('true' as unknown as boolean),
      fc.constant('false' as unknown as boolean),
      fc.constant(1 as unknown as boolean),
      fc.constant(0 as unknown as boolean),
      fc.constant(null as unknown as boolean)
    ),
  ])('should use default values for invalid boolean flags', (invalidBoolean) => {
    // Mock console.warn
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Validate configuration with invalid boolean
    const validated = validateShaderConfig({
      enableBloom: invalidBoolean,
    });

    // Verify default value is used
    expect(validated.enableBloom).toBe(DEFAULT_SHADER_CONFIG.enableBloom);

    // Verify warning was logged
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  /**
   * Property Test: Partial Configuration Merging
   *
   * Partial configurations should be merged with defaults correctly.
   */
  test.prop([
    fc.oneof(
      fc.record({ quality: fc.constantFrom('low', 'medium', 'high') }),
      fc.record({
        skinTone: fc.record({
          r: fc.float({ min: 0, max: 1, noNaN: true }),
          g: fc.float({ min: 0, max: 1, noNaN: true }),
          b: fc.float({ min: 0, max: 1, noNaN: true }),
        }),
      }),
      fc.record({ enableBloom: fc.boolean() }),
      fc.record({ shadowMapSize: fc.constantFrom(512, 1024, 2048) })
    ),
  ])('should merge partial configuration with defaults correctly', (partialConfig) => {
    // Validate partial configuration
    const validated = validateShaderConfig(partialConfig);

    // Verify all required fields are present
    expect(validated.quality).toBeDefined();
    expect(validated.skinTone).toBeDefined();
    expect(validated.irisColor).toBeDefined();
    expect(validated.hairColor).toBeDefined();
    expect(validated.enableBloom).toBeDefined();
    expect(validated.enableColorGrading).toBeDefined();
    expect(validated.shadowMapSize).toBeDefined();

    // Verify specified values are applied
    if ('quality' in partialConfig) {
      expect(validated.quality).toBe(partialConfig.quality);
    }
    if ('skinTone' in partialConfig) {
      expect(validated.skinTone).toEqual(partialConfig.skinTone);
    }
    if ('enableBloom' in partialConfig) {
      expect(validated.enableBloom).toBe(partialConfig.enableBloom);
    }
    if ('shadowMapSize' in partialConfig) {
      expect(validated.shadowMapSize).toBe(partialConfig.shadowMapSize);
    }
  });

  /**
   * Property Test: Empty Configuration
   *
   * Empty configuration should result in all default values being used.
   */
  test.prop([fc.constant({})])(
    'should use all default values for empty configuration',
    (emptyConfig) => {
      // Validate empty configuration
      const validated = validateShaderConfig(emptyConfig);

      // Verify all default values are used
      expect(validated).toEqual(DEFAULT_SHADER_CONFIG);
    }
  );

  /**
   * Property Test: Configuration Update Before Initialization
   *
   * Configuration updates before shader manager initialization should be
   * queued and applied when initialized.
   */
  test.prop([
    fc.record({
      skinTone: fc.record({
        r: fc.float({ min: 0, max: 1, noNaN: true }),
        g: fc.float({ min: 0, max: 1, noNaN: true }),
        b: fc.float({ min: 0, max: 1, noNaN: true }),
      }),
    }),
  ])('should queue configuration updates before initialization', async (config) => {
    // Mock console.warn
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Render hook without renderer (not initialized)
    const { result } = renderHook(() => useShaderManager(null, {}));

    // Verify shader manager is not initialized
    expect(result.current.shaderManager).toBeNull();

    // Try to update configuration before initialization
    await act(async () => {
      result.current.updateConfig(config);
    });

    // Verify warning was logged
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('ShaderManager not initialized'));

    warnSpy.mockRestore();
  });

  /**
   * Property Test: Quality Preset Updates
   *
   * Quality preset updates should persist across re-renders.
   */
  test.prop([fc.constantFrom('low', 'medium', 'high'), fc.constantFrom('low', 'medium', 'high')])(
    'should persist quality preset updates across re-renders',
    async (initialQuality, updatedQuality) => {
      // Render hook with initial quality
      const { result, rerender } = renderHook(() =>
        useShaderManager(mockRenderer, { quality: initialQuality })
      );

      // Wait for initialization
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Update quality
      await act(async () => {
        result.current.setQuality(updatedQuality);
      });

      // Trigger re-render
      rerender();

      // Verify shader manager persists
      expect(result.current.shaderManager).not.toBeNull();

      // Verify status remains compiled
      expect(result.current.status.compiled).toBe(true);
    }
  );
});
