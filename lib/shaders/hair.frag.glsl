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
