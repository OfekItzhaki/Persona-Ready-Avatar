/**
 * Shader Loaders
 *
 * Utilities for loading GLSL shader source code.
 * Shaders are embedded as template strings for compatibility with Next.js.
 */

export interface ShaderSource {
  vertexShader: string;
  fragmentShader: string;
}

// Skin Vertex Shader
const skinVertShader = `
// Skin Vertex Shader with Morph Target Support
// Implements subsurface scattering skin shader with morph target preservation

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldNormal;
varying vec2 vUv;

// Morph target attributes (Three.js provides these automatically)
#ifdef USE_MORPHTARGETS
  attribute vec3 morphTarget0;
  attribute vec3 morphTarget1;
  attribute vec3 morphTarget2;
  attribute vec3 morphTarget3;
  
  #ifdef USE_MORPHNORMALS
    attribute vec3 morphNormal0;
    attribute vec3 morphNormal1;
    attribute vec3 morphNormal2;
    attribute vec3 morphNormal3;
  #endif
  
  uniform float morphTargetInfluences[4];
#endif

// Normal map support
#ifdef USE_NORMALMAP
  varying vec3 vTangent;
  varying vec3 vBitangent;
  attribute vec4 tangent;
#endif

void main() {
  vec3 transformedPosition = position;
  vec3 transformedNormal = normal;
  
  // Apply morph targets to position and normal
  #ifdef USE_MORPHTARGETS
    transformedPosition += morphTarget0 * morphTargetInfluences[0];
    transformedPosition += morphTarget1 * morphTargetInfluences[1];
    transformedPosition += morphTarget2 * morphTargetInfluences[2];
    transformedPosition += morphTarget3 * morphTargetInfluences[3];
    
    #ifdef USE_MORPHNORMALS
      transformedNormal += morphNormal0 * morphTargetInfluences[0];
      transformedNormal += morphNormal1 * morphTargetInfluences[1];
      transformedNormal += morphNormal2 * morphTargetInfluences[2];
      transformedNormal += morphNormal3 * morphTargetInfluences[3];
    #endif
  #endif
  
  // Transform normal to view space
  vNormal = normalize(normalMatrix * transformedNormal);
  
  // Transform normal to world space for lighting calculations
  vWorldNormal = normalize(mat3(modelMatrix) * transformedNormal);
  
  // Calculate view space position
  vec4 mvPosition = modelViewMatrix * vec4(transformedPosition, 1.0);
  vViewPosition = mvPosition.xyz;
  
  // Pass UV coordinates
  vUv = uv;
  
  // Calculate tangent space for normal mapping
  #ifdef USE_NORMALMAP
    vec3 objectTangent = vec3(tangent.xyz);
    vTangent = normalize(normalMatrix * objectTangent);
    vBitangent = normalize(cross(vNormal, vTangent) * tangent.w);
  #endif
  
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Skin Fragment Shader
const skinFragShader = `
// Skin Fragment Shader with Subsurface Scattering Approximation
// Implements quality variants (low/medium/high) for SSS complexity

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldNormal;
varying vec2 vUv;

// Uniforms
uniform vec3 skinTone;
uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 ambientColor;

// SSS parameters
uniform vec3 sssColor;
uniform float sssIntensity;
uniform float sssScale;

// Textures
uniform sampler2D map;
uniform sampler2D normalMap;
uniform float normalScale;

// Material properties
uniform float specularIntensity;
uniform float specularPower;
uniform float roughness;

// Quality level (defined at compile time)
// LOW: Simple wrap lighting
// MEDIUM: Dual-pass SSS with wrap lighting and translucency
// HIGH: Multi-pass SSS with enhanced scattering

#ifdef USE_NORMALMAP
  varying vec3 vTangent;
  varying vec3 vBitangent;
#endif

// Wrap lighting for SSS approximation (used in all quality levels)
float wrapLighting(float NdotL, float wrap) {
  return max(0.0, (NdotL + wrap) / (1.0 + wrap));
}

// Fresnel approximation (Schlick's approximation)
float fresnel(vec3 viewDir, vec3 normal, float power) {
  float cosTheta = max(0.0, dot(viewDir, normal));
  return pow(1.0 - cosTheta, power);
}

// Translucency approximation for SSS
float translucency(vec3 normal, vec3 lightDir, vec3 viewDir, float scale) {
  vec3 H = normalize(lightDir + normal * scale);
  float VdotH = pow(clamp(dot(viewDir, -H), 0.0, 1.0), 3.0);
  return VdotH;
}

void main() {
  // Sample base color texture if available
  vec4 baseColor = vec4(skinTone, 1.0);
  #ifdef USE_MAP
    baseColor *= texture2D(map, vUv);
  #endif
  
  // Calculate normal (with normal map if available)
  vec3 normal = normalize(vNormal);
  
  #ifdef USE_NORMALMAP
    // Sample normal map
    vec3 normalMapSample = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
    normalMapSample.xy *= normalScale;
    
    // Transform to view space using TBN matrix
    mat3 TBN = mat3(normalize(vTangent), normalize(vBitangent), normal);
    normal = normalize(TBN * normalMapSample);
  #endif
  
  // Lighting calculations
  vec3 lightDir = normalize(lightDirection);
  vec3 viewDir = normalize(-vViewPosition);
  
  float NdotL = dot(normal, lightDir);
  
  // === QUALITY LEVEL: LOW ===
  // Simple wrap lighting for basic SSS approximation
  #ifdef QUALITY_LOW
    float wrap = 0.5;
    float diffuse = wrapLighting(NdotL, wrap);
    
    // Add subtle SSS tint
    vec3 sssContribution = sssColor * sssIntensity * 0.3;
    
    // Simple specular highlight
    vec3 halfVector = normalize(lightDir + viewDir);
    float specular = pow(max(0.0, dot(normal, halfVector)), specularPower) * specularIntensity;
    
    vec3 finalColor = baseColor.rgb * (ambientColor + lightColor * diffuse + sssContribution) + vec3(specular);
  #endif
  
  // === QUALITY LEVEL: MEDIUM ===
  // Dual-pass SSS with wrap lighting and translucency
  #ifdef QUALITY_MEDIUM
    float wrap = 0.6;
    float diffuse = wrapLighting(NdotL, wrap);
    
    // Translucency for light passing through skin
    float trans = translucency(normal, lightDir, viewDir, sssScale);
    vec3 sssContribution = sssColor * sssIntensity * (0.4 + trans * 0.6);
    
    // Enhanced specular with roughness
    vec3 halfVector = normalize(lightDir + viewDir);
    float specular = pow(max(0.0, dot(normal, halfVector)), specularPower / (roughness + 0.1)) * specularIntensity;
    
    // Fresnel rim lighting for edge glow
    float rim = fresnel(viewDir, normal, 3.0) * 0.3;
    
    vec3 diffuseColor = baseColor.rgb * lightColor * diffuse;
    vec3 finalColor = diffuseColor + sssContribution + vec3(specular) + baseColor.rgb * rim;
    finalColor += baseColor.rgb * ambientColor;
  #endif
  
  // === QUALITY LEVEL: HIGH ===
  // Multi-pass SSS with enhanced scattering and multiple wrap passes
  #ifdef QUALITY_HIGH
    // Multiple wrap passes for deeper scattering simulation
    float wrap1 = 0.5;
    float wrap2 = 0.8;
    float diffuse1 = wrapLighting(NdotL, wrap1);
    float diffuse2 = wrapLighting(NdotL, wrap2);
    
    // Combine wrap passes with different weights
    float diffuse = diffuse1 * 0.6 + diffuse2 * 0.4;
    
    // Enhanced translucency with depth-based scattering
    float trans = translucency(normal, lightDir, viewDir, sssScale);
    float backScatter = translucency(normal, lightDir, viewDir, sssScale * 2.0);
    
    vec3 sssContribution = sssColor * sssIntensity * (0.3 + trans * 0.5 + backScatter * 0.2);
    
    // Dual specular lobes (primary and secondary highlights)
    vec3 halfVector = normalize(lightDir + viewDir);
    float specular1 = pow(max(0.0, dot(normal, halfVector)), specularPower) * specularIntensity;
    float specular2 = pow(max(0.0, dot(normal, halfVector)), specularPower * 0.5) * specularIntensity * 0.3;
    float specular = specular1 + specular2;
    
    // Enhanced Fresnel rim lighting
    float rim = fresnel(viewDir, normal, 3.0) * 0.4;
    vec3 rimColor = sssColor * rim;
    
    // Combine all lighting components
    vec3 diffuseColor = baseColor.rgb * lightColor * diffuse;
    vec3 finalColor = diffuseColor + sssContribution + vec3(specular) + rimColor;
    finalColor += baseColor.rgb * ambientColor;
  #endif
  
  gl_FragColor = vec4(finalColor, baseColor.a);
}
`;

/**
 * Get skin shader source code
 * @param quality - Quality level (low, medium, high)
 * @returns Shader source with appropriate quality defines
 */
export function getSkinShaderSource(quality: 'low' | 'medium' | 'high'): ShaderSource {
  // Add quality-specific defines to the fragment shader
  const qualityDefine = `#define QUALITY_${quality.toUpperCase()}\n`;

  return {
    vertexShader: skinVertShader,
    fragmentShader: qualityDefine + skinFragShader,
  };
}

// Eye Vertex Shader
const eyeVertShader = `
// Eye Vertex Shader
// Implements realistic eye rendering with cornea refraction support

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec2 vUv;

void main() {
  vec3 transformedPosition = position;
  vec3 transformedNormal = normal;
  
  // Transform normal to view space
  vNormal = normalize(normalMatrix * transformedNormal);
  
  // Transform normal to world space for lighting calculations
  vWorldNormal = normalize(mat3(modelMatrix) * transformedNormal);
  
  // Calculate world position for refraction
  vec4 worldPosition = modelMatrix * vec4(transformedPosition, 1.0);
  vWorldPosition = worldPosition.xyz;
  
  // Calculate view space position
  vec4 mvPosition = modelViewMatrix * vec4(transformedPosition, 1.0);
  vViewPosition = mvPosition.xyz;
  
  // Pass UV coordinates
  vUv = uv;
  
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Eye Fragment Shader
const eyeFragShader = `
// Eye Fragment Shader with Cornea Refraction
// Implements cornea refraction, iris depth, wetness, and sclera rendering

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec2 vUv;

// Iris parameters
uniform vec3 irisColor;
uniform sampler2D irisTexture;
uniform float pupilSize;

// Cornea parameters
uniform float corneaIOR; // Index of refraction (typically 1.376)
uniform float corneaThickness;

// Wetness/specular
uniform float specularIntensity;
uniform float specularPower;

// Lighting
uniform vec3 lightDirection;
uniform vec3 lightColor;

// Sclera parameters
uniform vec3 scleraColor;
uniform float scleraVariation;

// Quality level (defined at compile time)
// LOW: Simple iris rendering without refraction
// MEDIUM: Basic cornea refraction with iris depth
// HIGH: Enhanced refraction with multiple layers and caustics

#ifdef USE_IRIS_TEXTURE
  // Texture support for iris patterns
#endif

// Calculate iris position with cornea refraction
vec2 getRefractedIrisUV(vec2 uv, vec3 viewDir, vec3 normal) {
  // Calculate refraction vector
  vec3 refracted = refract(viewDir, normal, 1.0 / corneaIOR);
  
  // Simulate iris depth by offsetting UV based on refraction
  float depthOffset = corneaThickness * 0.1;
  vec2 offset = refracted.xy * depthOffset;
  
  return uv + offset;
}

// Determine if we're rendering iris, pupil, or sclera
float getIrisMask(vec2 uv) {
  // Center of eye is at (0.5, 0.5)
  vec2 center = vec2(0.5, 0.5);
  float dist = distance(uv, center);
  
  // Iris radius (adjustable)
  float irisRadius = 0.35;
  
  // Smooth transition at iris edge
  return smoothstep(irisRadius + 0.02, irisRadius - 0.02, dist);
}

float getPupilMask(vec2 uv) {
  vec2 center = vec2(0.5, 0.5);
  float dist = distance(uv, center);
  
  // Pupil size is configurable
  float pupilRadius = pupilSize * 0.15;
  
  // Sharp transition for pupil
  return smoothstep(pupilRadius + 0.01, pupilRadius - 0.01, dist);
}

// Fresnel for wetness effect
float fresnel(vec3 viewDir, vec3 normal, float power) {
  float cosTheta = max(0.0, dot(viewDir, normal));
  return pow(1.0 - cosTheta, power);
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(-vViewPosition);
  vec3 lightDir = normalize(lightDirection);
  
  // Get masks for different eye regions
  float irisMask = getIrisMask(vUv);
  float pupilMask = getPupilMask(vUv);
  
  vec3 finalColor;
  
  // === QUALITY LEVEL: LOW ===
  // Simple iris rendering without refraction
  #ifdef QUALITY_LOW
    // Pupil (black)
    if (pupilMask > 0.5) {
      finalColor = vec3(0.0);
    }
    // Iris
    else if (irisMask > 0.5) {
      #ifdef USE_IRIS_TEXTURE
        vec3 irisTexColor = texture2D(irisTexture, vUv).rgb;
        finalColor = irisColor * irisTexColor;
      #else
        finalColor = irisColor;
      #endif
      
      // Simple shading
      float diffuse = max(0.0, dot(normal, lightDir)) * 0.5 + 0.5;
      finalColor *= diffuse;
    }
    // Sclera
    else {
      finalColor = scleraColor;
      
      // Simple diffuse lighting
      float diffuse = max(0.0, dot(normal, lightDir)) * 0.7 + 0.3;
      finalColor *= diffuse;
      
      // Subtle color variation
      float variation = sin(vUv.x * 20.0) * sin(vUv.y * 20.0) * scleraVariation;
      finalColor += vec3(variation * 0.02, 0.0, variation * 0.01);
    }
    
    // Simple specular highlight for wetness
    vec3 halfVector = normalize(lightDir + viewDir);
    float specular = pow(max(0.0, dot(normal, halfVector)), specularPower) * specularIntensity;
    finalColor += vec3(specular);
  #endif
  
  // === QUALITY LEVEL: MEDIUM ===
  // Basic cornea refraction with iris depth
  #ifdef QUALITY_MEDIUM
    // Calculate refracted UV for iris depth effect
    vec2 refractedUV = getRefractedIrisUV(vUv, viewDir, normal);
    
    // Recalculate masks with refracted UVs for iris
    float refractedIrisMask = getIrisMask(refractedUV);
    float refractedPupilMask = getPupilMask(refractedUV);
    
    // Pupil (black with slight depth)
    if (refractedPupilMask > 0.5) {
      finalColor = vec3(0.0, 0.0, 0.05); // Very dark with slight blue tint
    }
    // Iris with refraction
    else if (refractedIrisMask > 0.5) {
      #ifdef USE_IRIS_TEXTURE
        vec3 irisTexColor = texture2D(irisTexture, refractedUV).rgb;
        finalColor = irisColor * irisTexColor;
      #else
        finalColor = irisColor;
      #endif
      
      // Enhanced shading with depth
      float diffuse = max(0.0, dot(normal, lightDir)) * 0.6 + 0.4;
      finalColor *= diffuse;
      
      // Add depth darkening toward pupil
      vec2 center = vec2(0.5, 0.5);
      float distFromCenter = distance(refractedUV, center);
      float depthDarken = smoothstep(0.0, 0.3, distFromCenter);
      finalColor *= 0.7 + depthDarken * 0.3;
    }
    // Sclera
    else {
      finalColor = scleraColor;
      
      // Diffuse lighting with ambient occlusion
      float diffuse = max(0.0, dot(normal, lightDir)) * 0.7 + 0.3;
      
      // Subtle AO at edges
      float edgeAO = smoothstep(0.0, 0.2, irisMask);
      diffuse *= 0.8 + edgeAO * 0.2;
      
      finalColor *= diffuse;
      
      // Enhanced color variation (veins)
      float variation = sin(vUv.x * 30.0) * sin(vUv.y * 25.0) * scleraVariation;
      finalColor += vec3(variation * 0.03, 0.0, variation * 0.015);
    }
    
    // Enhanced specular with Fresnel for wetness
    vec3 halfVector = normalize(lightDir + viewDir);
    float specular = pow(max(0.0, dot(normal, halfVector)), specularPower) * specularIntensity;
    float fresnelFactor = fresnel(viewDir, normal, 5.0);
    specular *= (1.0 + fresnelFactor * 0.5);
    finalColor += vec3(specular);
  #endif
  
  // === QUALITY LEVEL: HIGH ===
  // Enhanced refraction with multiple layers
  #ifdef QUALITY_HIGH
    // Multi-layer refraction for more realistic depth
    vec2 refractedUV1 = getRefractedIrisUV(vUv, viewDir, normal);
    vec2 refractedUV2 = vUv + (refractedUV1 - vUv) * 1.2; // Deeper layer
    
    float refractedIrisMask = getIrisMask(refractedUV1);
    float refractedPupilMask = getPupilMask(refractedUV1);
    
    // Pupil with depth and slight reflection
    if (refractedPupilMask > 0.5) {
      finalColor = vec3(0.0, 0.0, 0.08);
      
      // Add subtle reflection in pupil
      float pupilReflection = fresnel(viewDir, normal, 8.0) * 0.1;
      finalColor += vec3(pupilReflection);
    }
    // Iris with enhanced refraction and detail
    else if (refractedIrisMask > 0.5) {
      #ifdef USE_IRIS_TEXTURE
        vec3 irisTexColor1 = texture2D(irisTexture, refractedUV1).rgb;
        vec3 irisTexColor2 = texture2D(irisTexture, refractedUV2).rgb;
        finalColor = irisColor * mix(irisTexColor1, irisTexColor2, 0.3);
      #else
        finalColor = irisColor;
      #endif
      
      // Enhanced shading with multiple light interactions
      float diffuse = max(0.0, dot(normal, lightDir)) * 0.6 + 0.4;
      finalColor *= diffuse;
      
      // Depth-based darkening and color shift
      vec2 center = vec2(0.5, 0.5);
      float distFromCenter = distance(refractedUV1, center);
      float depthDarken = smoothstep(0.0, 0.35, distFromCenter);
      finalColor *= 0.6 + depthDarken * 0.4;
      
      // Add radial pattern detail
      float angle = atan(refractedUV1.y - 0.5, refractedUV1.x - 0.5);
      float radialDetail = sin(angle * 20.0) * 0.05 + 1.0;
      finalColor *= radialDetail;
      
      // Subsurface scattering effect in iris
      float backLight = max(0.0, dot(normal, -lightDir)) * 0.3;
      finalColor += irisColor * backLight * 0.2;
    }
    // Sclera with enhanced detail
    else {
      finalColor = scleraColor;
      
      // Enhanced diffuse lighting
      float diffuse = max(0.0, dot(normal, lightDir)) * 0.7 + 0.3;
      
      // Enhanced AO at edges and corners
      float edgeAO = smoothstep(0.0, 0.25, irisMask);
      float cornerAO = smoothstep(0.9, 0.5, length(vUv - vec2(0.5)));
      diffuse *= 0.75 + edgeAO * 0.15 + cornerAO * 0.1;
      
      finalColor *= diffuse;
      
      // Enhanced vein patterns
      float veinPattern1 = sin(vUv.x * 35.0 + vUv.y * 15.0) * sin(vUv.y * 30.0);
      float veinPattern2 = sin(vUv.x * 25.0 - vUv.y * 20.0) * sin(vUv.y * 35.0);
      float veins = (veinPattern1 + veinPattern2) * scleraVariation * 0.02;
      finalColor += vec3(veins * 1.5, veins * 0.3, veins * 0.5);
      
      // Subtle subsurface scattering in sclera
      float sss = max(0.0, dot(normal, lightDir)) * 0.2;
      finalColor += vec3(sss * 0.1, sss * 0.05, sss * 0.05);
    }
    
    // Enhanced specular with dual lobes for wetness
    vec3 halfVector = normalize(lightDir + viewDir);
    float specular1 = pow(max(0.0, dot(normal, halfVector)), specularPower) * specularIntensity;
    float specular2 = pow(max(0.0, dot(normal, halfVector)), specularPower * 0.3) * specularIntensity * 0.4;
    
    // Strong Fresnel for wet appearance
    float fresnelFactor = fresnel(viewDir, normal, 5.0);
    float wetness = (specular1 + specular2) * (1.0 + fresnelFactor);
    finalColor += vec3(wetness);
    
    // Rim lighting for cornea edge
    float rim = fresnel(viewDir, normal, 3.0) * 0.2;
    finalColor += vec3(rim);
  #endif
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

/**
 * Get eye shader source code
 * @param quality - Quality level (low, medium, high)
 * @returns Shader source with appropriate quality defines
 */
export function getEyeShaderSource(quality: 'low' | 'medium' | 'high'): ShaderSource {
  // Add quality-specific defines to the fragment shader
  const qualityDefine = `#define QUALITY_${quality.toUpperCase()}\n`;

  return {
    vertexShader: eyeVertShader,
    fragmentShader: qualityDefine + eyeFragShader,
  };
}

// Hair Vertex Shader
const hairVertShader = `
// Hair Vertex Shader with Morph Target Support
// Implements anisotropic hair shader with Kajiya-Kay lighting model
// Supports morph target preservation for facial expressions

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldNormal;
varying vec3 vTangent;
varying vec2 vUv;

// Morph target attributes (Three.js provides these automatically)
#ifdef USE_MORPHTARGETS
  attribute vec3 morphTarget0;
  attribute vec3 morphTarget1;
  attribute vec3 morphTarget2;
  attribute vec3 morphTarget3;
  
  #ifdef USE_MORPHNORMALS
    attribute vec3 morphNormal0;
    attribute vec3 morphNormal1;
    attribute vec3 morphNormal2;
    attribute vec3 morphNormal3;
  #endif
  
  uniform float morphTargetInfluences[4];
#endif

// Tangent attribute for anisotropic lighting
attribute vec4 tangent;

void main() {
  vec3 transformedPosition = position;
  vec3 transformedNormal = normal;
  
  // Apply morph targets to position and normal
  #ifdef USE_MORPHTARGETS
    transformedPosition += morphTarget0 * morphTargetInfluences[0];
    transformedPosition += morphTarget1 * morphTargetInfluences[1];
    transformedPosition += morphTarget2 * morphTargetInfluences[2];
    transformedPosition += morphTarget3 * morphTargetInfluences[3];
    
    #ifdef USE_MORPHNORMALS
      transformedNormal += morphNormal0 * morphTargetInfluences[0];
      transformedNormal += morphNormal1 * morphTargetInfluences[1];
      transformedNormal += morphNormal2 * morphTargetInfluences[2];
      transformedNormal += morphNormal3 * morphTargetInfluences[3];
    #endif
  #endif
  
  // Transform normal to view space
  vNormal = normalize(normalMatrix * transformedNormal);
  
  // Transform normal to world space for lighting calculations
  vWorldNormal = normalize(mat3(modelMatrix) * transformedNormal);
  
  // Calculate tangent for anisotropic highlights
  // Tangent represents hair strand direction
  vec3 objectTangent = vec3(tangent.xyz);
  vTangent = normalize(normalMatrix * objectTangent);
  
  // Calculate view space position
  vec4 mvPosition = modelViewMatrix * vec4(transformedPosition, 1.0);
  vViewPosition = mvPosition.xyz;
  
  // Pass UV coordinates
  vUv = uv;
  
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Hair Fragment Shader
const hairFragShader = `
// Hair Fragment Shader with Kajiya-Kay Anisotropic Lighting
// Implements anisotropic highlights for realistic hair rendering
// Supports quality variants (low/medium/high) for performance tuning

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldNormal;
varying vec3 vTangent;
varying vec2 vUv;

// Uniforms
uniform vec3 hairColor;
uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 ambientColor;

// Anisotropic highlight parameters
uniform float shiftTangent;
uniform float primarySpecular;
uniform float secondarySpecular;
uniform float specularPower;

// Texture support
uniform sampler2D hairTexture;

// Material properties
uniform float roughness;
uniform float alphaTest;

// Quality level (defined at compile time)
// LOW: Simple diffuse with single anisotropic highlight
// MEDIUM: Dual anisotropic highlights (primary and secondary)
// HIGH: Enhanced dual highlights with color shift and depth

// Kajiya-Kay anisotropic specular calculation
// This creates the characteristic elongated highlights along hair strands
float kajiyaKaySpecular(vec3 tangent, vec3 lightDir, vec3 viewDir, float exponent) {
  // Calculate half vector
  vec3 halfVector = normalize(lightDir + viewDir);
  
  // Calculate tangent dot half vector
  float TdotH = dot(tangent, halfVector);
  
  // Kajiya-Kay formula: sqrt(1 - (T·H)²) raised to power
  float sinTH = sqrt(1.0 - TdotH * TdotH);
  float specular = pow(sinTH, exponent);
  
  return specular;
}

// Shift tangent along normal for multiple highlight layers
vec3 shiftTangentVector(vec3 tangent, vec3 normal, float shift) {
  vec3 shiftedTangent = tangent + normal * shift;
  return normalize(shiftedTangent);
}

// Fresnel approximation (Schlick's approximation)
float fresnel(vec3 viewDir, vec3 normal, float power) {
  float cosTheta = max(0.0, dot(viewDir, normal));
  return pow(1.0 - cosTheta, power);
}

void main() {
  // Sample base color texture if available
  vec4 baseColor = vec4(hairColor, 1.0);
  #ifdef USE_HAIR_TEXTURE
    vec4 texColor = texture2D(hairTexture, vUv);
    baseColor *= texColor;
    
    // Alpha test for hair transparency
    if (baseColor.a < alphaTest) {
      discard;
    }
  #endif
  
  // Normalize vectors
  vec3 normal = normalize(vNormal);
  vec3 tangent = normalize(vTangent);
  vec3 lightDir = normalize(lightDirection);
  vec3 viewDir = normalize(-vViewPosition);
  
  // Diffuse lighting (wrap lighting for softer appearance)
  float NdotL = dot(normal, lightDir);
  float wrap = 0.5;
  float diffuse = max(0.0, (NdotL + wrap) / (1.0 + wrap));
  
  // === QUALITY LEVEL: LOW ===
  // Simple diffuse with single anisotropic highlight
  #ifdef QUALITY_LOW
    // Primary anisotropic highlight
    vec3 shiftedTangent = shiftTangentVector(tangent, normal, shiftTangent);
    float specular = kajiyaKaySpecular(shiftedTangent, lightDir, viewDir, specularPower);
    specular *= primarySpecular;
    
    // Combine lighting
    vec3 diffuseColor = baseColor.rgb * lightColor * diffuse;
    vec3 specularColor = lightColor * specular;
    vec3 finalColor = diffuseColor + specularColor + baseColor.rgb * ambientColor;
  #endif
  
  // === QUALITY LEVEL: MEDIUM ===
  // Dual anisotropic highlights (primary and secondary)
  #ifdef QUALITY_MEDIUM
    // Primary highlight (main specular)
    vec3 primaryTangent = shiftTangentVector(tangent, normal, shiftTangent);
    float primarySpec = kajiyaKaySpecular(primaryTangent, lightDir, viewDir, specularPower);
    primarySpec *= primarySpecular;
    
    // Secondary highlight (shifted for more realism)
    vec3 secondaryTangent = shiftTangentVector(tangent, normal, shiftTangent + 0.1);
    float secondarySpec = kajiyaKaySpecular(secondaryTangent, lightDir, viewDir, specularPower * 0.5);
    secondarySpec *= secondarySpecular;
    
    // Combine specular highlights
    float totalSpecular = primarySpec + secondarySpec;
    
    // Enhanced diffuse with ambient occlusion approximation
    float ao = 1.0 - (1.0 - diffuse) * 0.3;
    vec3 diffuseColor = baseColor.rgb * lightColor * diffuse * ao;
    
    // Specular color
    vec3 specularColor = lightColor * totalSpecular;
    
    // Rim lighting for edge definition
    float rim = fresnel(viewDir, normal, 3.0) * 0.2;
    
    vec3 finalColor = diffuseColor + specularColor + baseColor.rgb * (ambientColor + rim);
  #endif
  
  // === QUALITY LEVEL: HIGH ===
  // Enhanced dual highlights with color shift and depth
  #ifdef QUALITY_HIGH
    // Primary highlight (main specular with slight color shift)
    vec3 primaryTangent = shiftTangentVector(tangent, normal, shiftTangent);
    float primarySpec = kajiyaKaySpecular(primaryTangent, lightDir, viewDir, specularPower);
    primarySpec *= primarySpecular;
    
    // Primary highlight has a slight warm tint
    vec3 primaryColor = lightColor * mix(vec3(1.0), vec3(1.1, 1.05, 1.0), 0.3);
    
    // Secondary highlight (shifted and colored differently)
    vec3 secondaryTangent = shiftTangentVector(tangent, normal, shiftTangent + 0.15);
    float secondarySpec = kajiyaKaySpecular(secondaryTangent, lightDir, viewDir, specularPower * 0.4);
    secondarySpec *= secondarySpecular;
    
    // Secondary highlight has a cooler tint
    vec3 secondaryColor = lightColor * mix(vec3(1.0), vec3(0.95, 0.98, 1.1), 0.3);
    
    // Tertiary highlight (very subtle, for extra depth)
    vec3 tertiaryTangent = shiftTangentVector(tangent, normal, shiftTangent - 0.1);
    float tertiarySpec = kajiyaKaySpecular(tertiaryTangent, lightDir, viewDir, specularPower * 1.5);
    tertiarySpec *= secondarySpecular * 0.3;
    
    // Enhanced diffuse with better ambient occlusion
    float ao = 1.0 - (1.0 - diffuse) * 0.4;
    
    // Add subtle subsurface scattering effect
    float backLight = max(0.0, dot(normal, -lightDir));
    float sss = backLight * 0.3;
    
    vec3 diffuseColor = baseColor.rgb * lightColor * (diffuse * ao + sss);
    
    // Combine all specular highlights with their colors
    vec3 specularColor = primaryColor * primarySpec + 
                         secondaryColor * secondarySpec + 
                         lightColor * tertiarySpec;
    
    // Enhanced rim lighting with color
    float rim = fresnel(viewDir, normal, 3.0) * 0.3;
    vec3 rimColor = mix(baseColor.rgb, lightColor, 0.5) * rim;
    
    // Depth-based color variation (darker at roots, lighter at tips)
    float depthVariation = vUv.y * 0.1;
    vec3 colorVariation = baseColor.rgb * (1.0 + depthVariation);
    
    vec3 finalColor = colorVariation * diffuse * ao + 
                      specularColor + 
                      baseColor.rgb * ambientColor + 
                      rimColor +
                      baseColor.rgb * sss;
  #endif
  
  gl_FragColor = vec4(finalColor, baseColor.a);
}
`;

/**
 * Get hair shader source code
 * @param quality - Quality level (low, medium, high)
 * @returns Shader source with appropriate quality defines
 */
export function getHairShaderSource(quality: 'low' | 'medium' | 'high'): ShaderSource {
  // Add quality-specific defines to the fragment shader
  const qualityDefine = `#define QUALITY_${quality.toUpperCase()}\n`;

  return {
    vertexShader: hairVertShader,
    fragmentShader: qualityDefine + hairFragShader,
  };
}
