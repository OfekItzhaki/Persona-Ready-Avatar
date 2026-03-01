/**
 * Security utilities for UI/UX enhancement features
 * Prevents CSS injection, XSS attacks, and validates user input
 */

/**
 * Dangerous CSS properties that should never be allowed in user input
 */
const DANGEROUS_CSS_PROPERTIES = [
  'behavior',
  'expression',
  '-moz-binding',
  'binding',
  'javascript:',
  'vbscript:',
  'data:text/html',
];

/**
 * Allowed CSS properties for theme configurations
 */
const ALLOWED_CSS_PROPERTIES = [
  'color',
  'background-color',
  'border-color',
  'box-shadow',
  'text-shadow',
  'opacity',
  'backdrop-filter',
  'background',
  'background-image',
  'background-gradient',
  'gradient',
];

/**
 * Validate a color value to ensure it's safe
 */
export function validateColorValue(color: string): boolean {
  if (typeof color !== 'string') return false;

  // Remove whitespace
  const trimmed = color.trim();

  // Check for dangerous patterns
  if (DANGEROUS_CSS_PROPERTIES.some(prop => trimmed.toLowerCase().includes(prop))) {
    return false;
  }

  // Valid color patterns
  const validPatterns = [
    /^#[0-9a-f]{3}$/i,                                    // #rgb
    /^#[0-9a-f]{6}$/i,                                    // #rrggbb
    /^#[0-9a-f]{8}$/i,                                    // #rrggbbaa
    /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i,           // rgb(r, g, b)
    /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/i, // rgba(r, g, b, a)
    /^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/i,         // hsl(h, s, l)
    /^hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)$/i, // hsla(h, s, l, a)
    /^transparent$/i,
    /^currentcolor$/i,
  ];

  // Check if color matches any valid pattern
  return validPatterns.some(pattern => pattern.test(trimmed));
}

/**
 * Sanitize a class name from user input
 */
export function sanitizeClassName(className: string): string {
  if (typeof className !== 'string') return '';

  // Remove any characters that aren't alphanumeric, dash, or underscore
  return className
    .trim()
    .replace(/[^a-zA-Z0-9\-_\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validate theme configuration structure
 */
export function validateThemeConfig(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;

  const themeConfig = config as Record<string, any>;

  // Check for required properties
  if (!themeConfig.colors || typeof themeConfig.colors !== 'object') {
    return false;
  }

  // Check for dangerous properties in the entire config
  const configString = JSON.stringify(config);
  if (DANGEROUS_CSS_PROPERTIES.some(prop => configString.toLowerCase().includes(prop))) {
    return false;
  }

  // Validate all color values
  const validateColors = (obj: any): boolean => {
    for (const key in obj) {
      const value = obj[key];
      if (typeof value === 'string') {
        // If it looks like a color value, validate it
        if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
          if (!validateColorValue(value)) {
            return false;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        if (!validateColors(value)) {
          return false;
        }
      }
    }
    return true;
  };

  return validateColors(themeConfig.colors);
}

/**
 * Sanitize style attribute value
 */
export function sanitizeStyleValue(property: string, value: string): string | null {
  if (typeof property !== 'string' || typeof value !== 'string') return null;

  // Check if property is allowed
  const normalizedProperty = property.toLowerCase().trim();
  if (!ALLOWED_CSS_PROPERTIES.includes(normalizedProperty)) {
    console.warn(`[Security] Blocked disallowed CSS property: ${property}`);
    return null;
  }

  // Check for dangerous patterns in value
  const normalizedValue = value.toLowerCase();
  if (DANGEROUS_CSS_PROPERTIES.some(prop => normalizedValue.includes(prop))) {
    console.warn(`[Security] Blocked dangerous CSS value: ${value}`);
    return null;
  }

  // For color properties, validate the color
  if (normalizedProperty.includes('color')) {
    if (!validateColorValue(value)) {
      console.warn(`[Security] Invalid color value: ${value}`);
      return null;
    }
  }

  return value.trim();
}

/**
 * Prevent arbitrary CSS injection through themes
 */
export function preventCSSInjection(cssString: string): boolean {
  if (typeof cssString !== 'string') return false;

  const normalized = cssString.toLowerCase();

  // Check for dangerous patterns
  const dangerousPatterns = [
    ...DANGEROUS_CSS_PROPERTIES,
    '<script',
    '</script>',
    'javascript:',
    'vbscript:',
    'data:text/html',
    'onerror=',
    'onload=',
    '@import',
    'url(',
  ];

  return !dangerousPatterns.some(pattern => normalized.includes(pattern));
}

/**
 * Whitelist CSS properties in theme configuration
 */
export function whitelistCSSProperties(config: Record<string, any>): Record<string, any> {
  const whitelisted: Record<string, any> = {};

  for (const key in config) {
    const value = config[key];
    const normalizedKey = key.toLowerCase();

    // Check if key itself is dangerous
    if (DANGEROUS_CSS_PROPERTIES.some(prop => normalizedKey.includes(prop.toLowerCase()))) {
      console.warn(`[Security] Blocked dangerous CSS property: ${key}`);
      continue;
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively whitelist nested objects
      whitelisted[key] = whitelistCSSProperties(value);
    } else if (typeof value === 'string') {
      // Check if this looks like a CSS property
      if (ALLOWED_CSS_PROPERTIES.some(prop => normalizedKey.includes(prop))) {
        // Validate the value
        if (preventCSSInjection(value)) {
          whitelisted[key] = value;
        } else {
          console.warn(`[Security] Blocked potentially dangerous CSS value for ${key}: ${value}`);
        }
      } else {
        // Non-CSS properties are allowed (like theme name, etc.)
        whitelisted[key] = value;
      }
    } else {
      // Other types (numbers, booleans) are safe
      whitelisted[key] = value;
    }
  }

  return whitelisted;
}

/**
 * Validate and sanitize inline style object
 */
export function sanitizeInlineStyles(styles: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const property in styles) {
    const value = styles[property];

    if (typeof value === 'string') {
      const sanitizedValue = sanitizeStyleValue(property, value);
      if (sanitizedValue !== null) {
        sanitized[property] = sanitizedValue;
      }
    } else if (typeof value === 'number') {
      // Numbers are safe
      sanitized[property] = value;
    }
  }

  return sanitized;
}

/**
 * Reject theme configurations with dangerous properties
 */
export function rejectDangerousTheme(config: unknown): { valid: boolean; reason?: string } {
  if (!config || typeof config !== 'object') {
    return { valid: false, reason: 'Invalid theme configuration structure' };
  }

  const configString = JSON.stringify(config);

  // Check for dangerous properties
  for (const prop of DANGEROUS_CSS_PROPERTIES) {
    if (configString.toLowerCase().includes(prop)) {
      return {
        valid: false,
        reason: `Theme configuration contains dangerous property: ${prop}`,
      };
    }
  }

  // Check for script injection attempts
  const scriptPatterns = ['<script', 'javascript:', 'onerror=', 'onload='];
  for (const pattern of scriptPatterns) {
    if (configString.toLowerCase().includes(pattern)) {
      return {
        valid: false,
        reason: `Theme configuration contains potential script injection: ${pattern}`,
      };
    }
  }

  // Validate structure
  if (!validateThemeConfig(config)) {
    return {
      valid: false,
      reason: 'Theme configuration failed validation',
    };
  }

  return { valid: true };
}

/**
 * Escape HTML to prevent XSS in dynamic content
 */
export function escapeHTML(str: string): string {
  if (typeof str !== 'string') return '';

  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return str.replace(/[&<>"'/]/g, char => htmlEscapes[char]);
}

/**
 * Validate gradient string for safety
 */
export function validateGradient(gradient: string): boolean {
  if (typeof gradient !== 'string') return false;

  // Check for dangerous patterns
  if (!preventCSSInjection(gradient)) {
    return false;
  }

  // Valid gradient patterns
  const validGradientPatterns = [
    /^linear-gradient\(/i,
    /^radial-gradient\(/i,
    /^conic-gradient\(/i,
    /^repeating-linear-gradient\(/i,
    /^repeating-radial-gradient\(/i,
  ];

  return validGradientPatterns.some(pattern => pattern.test(gradient.trim()));
}

/**
 * Create a Content Security Policy for inline styles
 */
export function createStyleCSP(): string {
  return "style-src 'self' 'unsafe-inline';";
}

/**
 * Validate that a style string doesn't contain dangerous content
 */
export function validateStyleString(styleString: string): boolean {
  if (typeof styleString !== 'string') return false;

  // Check length to prevent DoS
  if (styleString.length > 10000) {
    console.warn('[Security] Style string exceeds maximum length');
    return false;
  }

  // Check for dangerous patterns
  return preventCSSInjection(styleString);
}
