/**
 * Property Test: Gradient Generation Validity
 * 
 * **Validates: Requirements 17.2, 17.4, 17.5**
 * 
 * Property: For any gradient configuration with at least 2 valid colors,
 * the gradient system must return a valid CSS gradient string.
 * 
 * This test verifies that:
 * 1. Gradient functions accept at least 2 valid color values
 * 2. Gradient functions validate all color values before creating gradients
 * 3. Gradient functions return valid CSS gradient strings
 * 4. Linear gradients apply the specified angle (0-360 degrees)
 * 5. All gradient types produce syntactically correct CSS
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  createGradientBackground,
  createLinearGradient,
  createRadialGradient,
  createMeshGradient,
} from '../gradients';

describe('Property 22: Gradient Generation Validity', () => {
  // Arbitrary for valid CSS colors
  const validHexColor = fc.tuple(
    fc.integer({ min: 0, max: 15 }),
    fc.integer({ min: 0, max: 15 }),
    fc.integer({ min: 0, max: 15 }),
    fc.integer({ min: 0, max: 15 }),
    fc.integer({ min: 0, max: 15 }),
    fc.integer({ min: 0, max: 15 })
  ).map(([d1, d2, d3, d4, d5, d6]) => 
    `#${d1.toString(16)}${d2.toString(16)}${d3.toString(16)}${d4.toString(16)}${d5.toString(16)}${d6.toString(16)}`
  );
  
  const validRgbColor = fc.tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  ).map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`);
  
  const validRgbaColor = fc.tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.double({ min: 0, max: 1, noNaN: true })
  ).map(([r, g, b, a]) => `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`);
  
  const validHslColor = fc.tuple(
    fc.integer({ min: 0, max: 360 }),
    fc.integer({ min: 0, max: 100 }),
    fc.integer({ min: 0, max: 100 })
  ).map(([h, s, l]) => `hsl(${h}, ${s}%, ${l}%)`);
  
  const validNamedColor = fc.constantFrom(
    'white', 'black', 'red', 'green', 'blue', 'yellow',
    'cyan', 'magenta', 'gray', 'orange', 'purple', 'pink'
  );
  
  const validColor = fc.oneof(
    validHexColor,
    validRgbColor,
    validRgbaColor,
    validHslColor,
    validNamedColor
  );
  
  const validAngle = fc.integer({ min: 0, max: 360 });
  
  const validColorArray = fc.array(validColor, { minLength: 2, maxLength: 10 });

  it('should return valid CSS linear-gradient string for any valid color array and angle', () => {
    fc.assert(
      fc.property(validColorArray, validAngle, (colors, angle) => {
        const result = createLinearGradient(colors, angle);
        
        // Should return a string
        expect(typeof result).toBe('string');
        
        // Should start with 'linear-gradient('
        expect(result).toMatch(/^linear-gradient\(/);
        
        // Should end with ')'
        expect(result).toMatch(/\)$/);
        
        // Should include the angle
        expect(result).toContain(`${angle}deg`);
        
        // Should include all colors
        for (const color of colors) {
          expect(result).toContain(color);
        }
        
        // Should be valid CSS (basic syntax check)
        expect(result).toMatch(/^linear-gradient\(\d+deg,\s*.+\)$/);
      })
    );
  });

  it('should return valid CSS radial-gradient string for any valid color array', () => {
    fc.assert(
      fc.property(validColorArray, (colors) => {
        const result = createRadialGradient(colors);
        
        // Should return a string
        expect(typeof result).toBe('string');
        
        // Should start with 'radial-gradient('
        expect(result).toMatch(/^radial-gradient\(/);
        
        // Should end with ')'
        expect(result).toMatch(/\)$/);
        
        // Should include shape and position
        expect(result).toMatch(/circle at center/);
        
        // Should include all colors
        for (const color of colors) {
          expect(result).toContain(color);
        }
      })
    );
  });

  it('should return valid CSS mesh gradient string for any valid color array', () => {
    fc.assert(
      fc.property(validColorArray, (colors) => {
        const result = createMeshGradient(colors);
        
        // Should return a string
        expect(typeof result).toBe('string');
        
        // Should contain 'radial-gradient(' (mesh is composed of multiple radial gradients)
        expect(result).toContain('radial-gradient(');
        
        // Should contain position keywords
        expect(result).toMatch(/top left|top right|bottom left|bottom right|center/);
        
        // Should be valid CSS (contains at least one complete gradient)
        expect(result).toMatch(/radial-gradient\(circle at .+?, .+?, transparent 50%\)/);
      })
    );
  });

  it('should return valid gradient for createGradientBackground with linear type', () => {
    fc.assert(
      fc.property(validColorArray, validAngle, (colors, angle) => {
        const result = createGradientBackground('linear', colors, angle);
        
        // Should match linear gradient format
        expect(result).toMatch(/^linear-gradient\(/);
        expect(result).toContain(`${angle}deg`);
        
        // Should include all colors
        for (const color of colors) {
          expect(result).toContain(color);
        }
      })
    );
  });

  it('should return valid gradient for createGradientBackground with radial type', () => {
    fc.assert(
      fc.property(validColorArray, (colors) => {
        const result = createGradientBackground('radial', colors);
        
        // Should match radial gradient format
        expect(result).toMatch(/^radial-gradient\(/);
        
        // Should include all colors
        for (const color of colors) {
          expect(result).toContain(color);
        }
      })
    );
  });

  it('should return valid gradient for createGradientBackground with mesh type', () => {
    fc.assert(
      fc.property(validColorArray, (colors) => {
        const result = createGradientBackground('mesh', colors);
        
        // Should contain radial gradients
        expect(result).toContain('radial-gradient(');
        
        // Should be a valid mesh gradient string
        expect(result).toMatch(/radial-gradient\(circle at .+?, .+?, transparent 50%\)/);
      })
    );
  });

  it('should throw error for color arrays with less than 2 colors', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant([]),
          fc.array(validColor, { minLength: 0, maxLength: 1 })
        ),
        (colors) => {
          expect(() => createLinearGradient(colors)).toThrow(/at least 2 colors/);
          expect(() => createRadialGradient(colors)).toThrow(/at least 2 colors/);
          expect(() => createMeshGradient(colors)).toThrow(/at least 2 colors/);
        }
      )
    );
  });

  it('should throw error for invalid color values', () => {
    const invalidColor = fc.oneof(
      fc.string().filter(s => 
        !s.startsWith('#') && 
        !s.startsWith('rgb') && 
        !s.startsWith('hsl') &&
        !['white', 'black', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta', 'gray', 'grey', 'orange', 'purple', 'pink', 'transparent'].includes(s.toLowerCase())
      ),
      fc.constant('not-a-color'),
      fc.constant('#GGGGGG'),
      fc.constant('rgb(300, 300, 300)'), // Out of range
      fc.constant('rgba(100, 100, 100, 2)'), // Alpha out of range
      fc.constant('rgba(100, 100, 100, NaN)'), // Invalid alpha
    );
    
    fc.assert(
      fc.property(
        fc.array(validColor, { minLength: 1, maxLength: 5 }),
        invalidColor,
        (validColors, badColor) => {
          const colorsWithInvalid = [...validColors, badColor];
          
          expect(() => createLinearGradient(colorsWithInvalid)).toThrow(/Invalid color value/);
          expect(() => createRadialGradient(colorsWithInvalid)).toThrow(/Invalid color value/);
          expect(() => createMeshGradient(colorsWithInvalid)).toThrow(/Invalid color value/);
        }
      )
    );
  });

  it('should throw error for angles outside 0-360 range', () => {
    fc.assert(
      fc.property(
        validColorArray,
        fc.oneof(
          fc.integer({ min: -1000, max: -1 }),
          fc.integer({ min: 361, max: 1000 })
        ),
        (colors, invalidAngle) => {
          expect(() => createLinearGradient(colors, invalidAngle)).toThrow(/Angle must be between 0 and 360/);
        }
      )
    );
  });

  it('should handle edge case angles (0, 360) correctly', () => {
    fc.assert(
      fc.property(validColorArray, (colors) => {
        const result0 = createLinearGradient(colors, 0);
        const result360 = createLinearGradient(colors, 360);
        
        expect(result0).toContain('0deg');
        expect(result360).toContain('360deg');
        
        // Both should be valid gradients
        expect(result0).toMatch(/^linear-gradient\(/);
        expect(result360).toMatch(/^linear-gradient\(/);
      })
    );
  });

  it('should produce consistent output for the same inputs', () => {
    fc.assert(
      fc.property(validColorArray, validAngle, (colors, angle) => {
        const result1 = createLinearGradient(colors, angle);
        const result2 = createLinearGradient(colors, angle);
        
        // Should be deterministic
        expect(result1).toBe(result2);
      })
    );
  });

  it('should handle maximum color array length gracefully', () => {
    fc.assert(
      fc.property(
        fc.array(validColor, { minLength: 2, maxLength: 20 }),
        (colors) => {
          const linearResult = createLinearGradient(colors);
          const radialResult = createRadialGradient(colors);
          const meshResult = createMeshGradient(colors);
          
          // All should succeed without errors
          expect(linearResult).toBeTruthy();
          expect(radialResult).toBeTruthy();
          expect(meshResult).toBeTruthy();
          
          // All should be valid CSS
          expect(linearResult).toMatch(/^linear-gradient\(/);
          expect(radialResult).toMatch(/^radial-gradient\(/);
          expect(meshResult).toContain('radial-gradient(');
        }
      )
    );
  });
});
