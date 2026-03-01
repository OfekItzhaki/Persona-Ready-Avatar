/**
 * Gradient Generation Utilities
 * 
 * Utilities for creating consistent and beautiful gradients throughout the application.
 * Supports linear, radial, and mesh gradient types with validation.
 * 
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */

/**
 * Validate if a string is a valid CSS color value
 */
function isValidCSSColor(color: string): boolean {
  // Check hex format (#RGB, #RRGGBB, #RRGGBBAA)
  if (/^#([0-9A-Fa-f]{3}){1,2}([0-9A-Fa-f]{2})?$/.test(color)) {
    return true;
  }
  
  // Check rgb/rgba format with proper value ranges
  const rgbMatch = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(color);
  if (rgbMatch) {
    const [, r, g, b, a] = rgbMatch;
    const rVal = parseInt(r, 10);
    const gVal = parseInt(g, 10);
    const bVal = parseInt(b, 10);
    
    // Check RGB values are in valid range (0-255)
    if (rVal < 0 || rVal > 255 || gVal < 0 || gVal > 255 || bVal < 0 || bVal > 255) {
      return false;
    }
    
    // Check alpha value if present (0-1)
    if (a !== undefined) {
      const aVal = parseFloat(a);
      if (isNaN(aVal) || aVal < 0 || aVal > 1) {
        return false;
      }
    }
    
    return true;
  }
  
  // Check hsl/hsla format
  if (/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+\s*)?\)$/.test(color)) {
    return true;
  }
  
  // Check named colors (basic set)
  const namedColors = [
    'transparent', 'white', 'black', 'red', 'green', 'blue', 'yellow',
    'cyan', 'magenta', 'gray', 'grey', 'orange', 'purple', 'pink'
  ];
  if (namedColors.includes(color.toLowerCase())) {
    return true;
  }
  
  return false;
}

/**
 * Validate angle parameter for linear gradients
 */
function isValidAngle(angle: number): boolean {
  return typeof angle === 'number' && angle >= 0 && angle <= 360;
}

/**
 * Create a linear gradient background
 * 
 * @param colors - Array of at least 2 valid CSS color values
 * @param angle - Gradient angle in degrees (0-360), defaults to 180 (top to bottom)
 * @returns Valid CSS linear-gradient string
 * @throws Error if colors array has less than 2 colors or contains invalid colors
 * @throws Error if angle is not between 0 and 360
 */
export function createLinearGradient(colors: string[], angle: number = 180): string {
  // Validate colors array
  if (!Array.isArray(colors) || colors.length < 2) {
    throw new Error('Linear gradient requires at least 2 colors');
  }
  
  // Validate each color
  for (const color of colors) {
    if (!isValidCSSColor(color)) {
      throw new Error(`Invalid color value: ${color}`);
    }
  }
  
  // Validate angle
  if (!isValidAngle(angle)) {
    throw new Error(`Angle must be between 0 and 360 degrees, got: ${angle}`);
  }
  
  // Create gradient string
  const colorStops = colors.join(', ');
  return `linear-gradient(${angle}deg, ${colorStops})`;
}

/**
 * Create a radial gradient background
 * 
 * @param colors - Array of at least 2 valid CSS color values
 * @param shape - Gradient shape ('circle' or 'ellipse'), defaults to 'circle'
 * @param position - Gradient position (e.g., 'center', 'top left'), defaults to 'center'
 * @returns Valid CSS radial-gradient string
 * @throws Error if colors array has less than 2 colors or contains invalid colors
 */
export function createRadialGradient(
  colors: string[],
  shape: 'circle' | 'ellipse' = 'circle',
  position: string = 'center'
): string {
  // Validate colors array
  if (!Array.isArray(colors) || colors.length < 2) {
    throw new Error('Radial gradient requires at least 2 colors');
  }
  
  // Validate each color
  for (const color of colors) {
    if (!isValidCSSColor(color)) {
      throw new Error(`Invalid color value: ${color}`);
    }
  }
  
  // Create gradient string
  const colorStops = colors.join(', ');
  return `radial-gradient(${shape} at ${position}, ${colorStops})`;
}

/**
 * Create a mesh gradient (complex multi-layer gradient)
 * 
 * Mesh gradients create a more organic, flowing appearance by layering
 * multiple radial gradients with different positions and opacities.
 * 
 * @param colors - Array of at least 2 valid CSS color values
 * @returns Valid CSS background string with multiple radial gradients
 * @throws Error if colors array has less than 2 colors or contains invalid colors
 */
export function createMeshGradient(colors: string[]): string {
  // Validate colors array
  if (!Array.isArray(colors) || colors.length < 2) {
    throw new Error('Mesh gradient requires at least 2 colors');
  }
  
  // Validate each color
  for (const color of colors) {
    if (!isValidCSSColor(color)) {
      throw new Error(`Invalid color value: ${color}`);
    }
  }
  
  // Create multiple radial gradients at different positions
  const gradients: string[] = [];
  const positions = [
    'top left',
    'top right',
    'bottom left',
    'bottom right',
    'center'
  ];
  
  // Use colors cyclically if we have fewer colors than positions
  for (let i = 0; i < Math.min(colors.length, positions.length); i++) {
    const color = colors[i];
    const position = positions[i];
    
    // Add transparency to create layering effect
    const transparentColor = color.startsWith('#')
      ? `${color}33` // Add 20% opacity for hex colors
      : color.replace(')', ', 0.2)').replace('rgb(', 'rgba(').replace('hsl(', 'hsla(');
    
    gradients.push(`radial-gradient(circle at ${position}, ${transparentColor}, transparent 50%)`);
  }
  
  return gradients.join(', ');
}

/**
 * Create a gradient background with automatic type detection
 * 
 * This is the main function that routes to the appropriate gradient type.
 * 
 * @param type - Gradient type ('linear', 'radial', or 'mesh')
 * @param colors - Array of at least 2 valid CSS color values
 * @param angle - Optional angle for linear gradients (0-360 degrees)
 * @returns Valid CSS gradient string
 * @throws Error if type is invalid or colors are invalid
 */
export function createGradientBackground(
  type: 'linear' | 'radial' | 'mesh',
  colors: string[],
  angle?: number
): string {
  switch (type) {
    case 'linear':
      return createLinearGradient(colors, angle);
    case 'radial':
      return createRadialGradient(colors);
    case 'mesh':
      return createMeshGradient(colors);
    default:
      throw new Error(`Invalid gradient type: ${type}. Must be 'linear', 'radial', or 'mesh'`);
  }
}
