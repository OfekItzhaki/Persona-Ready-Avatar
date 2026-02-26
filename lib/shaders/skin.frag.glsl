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
